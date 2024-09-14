import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from "@nestjs/common";
import {
  REALTIME_MONGO_DB_CONNECTION,
  REALTIME_MONGO_EVENT_HANDLER,
  REALTIME_MONGO_OPTIONS,
} from "./realtime-mongo.constants";
import type { Connection, FilterQuery } from "mongoose";
import type { RealtimeMongoOptions } from "./realtime-mongo.module";
import { RealtimeSessionService } from "./realtime-session.service";
import type {
  DataChange,
  DbSocket,
  IRealtimeMongoEventHandler,
} from "./realtime-mongo.types";
import type { ChangeStreamDocument, ChangeStreamOptions } from "mongodb";
import { Query } from "mingo";
import { ModuleRef } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class RealtimeStreamService implements OnApplicationShutdown {
  private logger = new Logger(this.constructor.name);

  private changeStream;
  private eventEmitter?: EventEmitter2;

  constructor(
    private readonly moduleRef: ModuleRef,

    @Inject(REALTIME_MONGO_DB_CONNECTION) private readonly mongoCon: Connection,
    @Inject(REALTIME_MONGO_OPTIONS)
    private readonly options: RealtimeMongoOptions,

    private readonly sessionService: RealtimeSessionService,

    @Inject(REALTIME_MONGO_EVENT_HANDLER)
    private readonly eventHandler?: IRealtimeMongoEventHandler,
  ) {
    this.changeStream = this.connectChangeStream();

    if (options.enableEventEmitter) {
      this.moduleRef
        .resolve(EventEmitter2)
        .then((result) => (this.eventEmitter = result));
    }
  }

  async onApplicationShutdown() {
    this.logger.log("Closing change stream on application shutdown...");
    if (this.changeStream) {
      await this.changeStream.close();
      this.logger.log("Change stream closed successfully.");
    }
  }

  private connectChangeStream = () => {
    const changeStream = this.mongoCon.watch(
      [
        {
          $match: {
            operationType: { $in: ["insert", "update", "replace", "delete"] },
          },
        },
      ],
      { fullDocument: "updateLookup" } satisfies ChangeStreamOptions,
    );
    changeStream.on("change", async (data) => {
      // This is done for typescript to stop complaining. data is a union type that depends on `operationType`
      if (!this.isNeededChangeDocument(data)) {
        // During the `invalidate` event, the change stream is automatically closed by Mongo.
        if (data.operationType === "invalidate") {
          this.logger.warn("Change stream invalidated");
          this.reconnectChangeStream();
        }
        return;
      }

      if (this.options.enableEventEmitter) {
        this.handleAppEmitter(data);
      }

      if (this.options.enableWebsocket) {
        this.handleWebsocketEmitter(data);
      }

      if (this.eventHandler) {
        this.eventHandler.onChangeEvent(data);
      }
    });
    changeStream.on("error", async (err) => {
      this.logger.error(err);
      await this.changeStream.close();
      this.reconnectChangeStream();
    });
    changeStream.on("close", () => this.logger.log("Closed Connnection"));

    return changeStream;
  };

  reconnectChangeStream = (attempt: number = 1) => {
    const retryDelay = Math.min(1000 * 2 ** attempt, 30000); // Exponential backoff, max 30 seconds

    setTimeout(() => {
      try {
        this.changeStream = this.connectChangeStream();
        this.logger.log(
          `Reconnected to change stream after ${attempt} attempt(s).`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to reconnect change stream: ${error.message}`,
        );
        this.reconnectChangeStream(attempt + 1);
      }
    }, retryDelay);
  };

  private handleWebsocketEmitter = (data: DataChange) => {
    const sessions = this.sessionService.listAll();

    sessions.forEach(({ client, document_ids, query, document_id }) => {
      const collection = client.data.query.collection;
      if (data.ns.coll !== collection) return;

      if (query) {
        this.handleQueryUpdate(client, query, document_ids, data);
      }

      if (document_id) {
        this.handleSingleUpdate(client, document_id, data);
      }
    });
  };

  handleQueryUpdate = (
    client: DbSocket,
    query: FilterQuery<any>,
    document_ids: Set<string>,
    data: DataChange,
  ) => {
    // Check if discriminator was provided
    const discriminatorMapping = client.data.discriminatorMapping;

    // If discriminator is provided, modify the query to use it
    if (discriminatorMapping) {
      if (discriminatorMapping.key in query) {
        if (query.$and && Array.isArray(query.$and)) {
          query.$and.push({
            [discriminatorMapping.key]: discriminatorMapping.value,
          });
        } else {
          query.$and = [
            { [discriminatorMapping.key]: discriminatorMapping.value },
          ];
        }
      } else {
        query[discriminatorMapping.key] = discriminatorMapping.value;
      }
    }

    const q = new Query(query);
    const _id = data.documentKey._id.toString();

    // Handle delete operation first since it doesn't have the `fullDocument`. This is for type-safety
    const removeDocument = () => {
      document_ids.delete(_id);
      client.emit("remove", { _id });
    };
    if (data.operationType === "delete") {
      if (document_ids.has(_id)) removeDocument();
      return;
    }

    // Helper functions for common actions
    const addDocument = () => {
      document_ids.add(_id);
      client.emit("add", { _id, data: data.fullDocument });
    };
    const updateDocument = () => {
      client.emit("update", { _id, data: data.fullDocument });
    };

    const didTestPass = q.test(data.fullDocument);

    // Handle update and replace operations
    if (data.operationType === "update" || data.operationType === "replace") {
      if (document_ids.has(_id)) {
        if (didTestPass) {
          updateDocument();
        } else {
          removeDocument();
        }
      } else if (didTestPass) {
        addDocument();
      }
      return;
    }

    // Handle insert operation
    if (data.operationType === "insert" && didTestPass) {
      addDocument();
      return;
    }
  };

  private handleSingleUpdate(
    client: DbSocket,
    document_id: string,
    data: DataChange,
  ) {
    const _id = data.documentKey._id.toString();
    if (document_id !== _id) return;

    if (data.operationType === "delete") {
      return client.emit("remove", { _id });
    }

    // Handle update and replace operations
    if (data.operationType === "update" || data.operationType === "replace") {
      return client.emit("update", { _id, data: data.fullDocument });
    }

    // Handle insert operation
    if (data.operationType === "insert") {
      return client.emit("add", { _id, data: data.fullDocument });
    }
  }

  private isNeededChangeDocument = (
    data: ChangeStreamDocument,
  ): data is DataChange => {
    const excludedOps: ChangeStreamDocument["operationType"][] = [
      "rename",
      "drop",
      "dropDatabase",
      "dropIndexes",
      "invalidate",
      "modify",
      "createIndexes",
      "shardCollection",
      "reshardCollection",
      "refineCollectionShardKey",
      "create",
    ];
    return !excludedOps.includes(data.operationType);
  };

  private handleAppEmitter(data: ChangeStreamDocument) {
    if (!this.isNeededChangeDocument(data)) return;

    if (data.operationType === "delete") {
      void this.eventEmitter?.emit(`database.${data.ns.coll}.deleted`, {
        _id: data.documentKey._id.toString(),
      });
    }

    // Handle update and replace operations
    if (data.operationType === "update" || data.operationType === "replace") {
      void this.eventEmitter?.emit(
        `database.${data.ns.coll}.updated`,
        data.fullDocument,
      );
    }

    // Handle insert operation
    if (data.operationType === "insert") {
      void this.eventEmitter?.emit(
        `database.${data.ns.coll}.created`,
        data.fullDocument,
      );
    }
  }
}
