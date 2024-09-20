import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { REALTIME_CONNECTION, REALTIME_OPTIONS } from '../realtime.constants';
import type { Connection, FilterQuery } from 'mongoose';
import type { RealtimeMongoOptions } from '../realtime.options';
import { SessionService } from './session.service';
import type {
  DbSocket,
  DiscriminatorMapping,
  RealtimeMongoEvent,
} from '../realtime.types';
import type { ChangeStreamDocument, ChangeStreamOptions } from 'mongodb';
import { Query } from 'mingo';
import { EventService } from './event.service';

@Injectable()
export class StreamService implements OnApplicationShutdown {
  private logger = new Logger(this.constructor.name);

  private changeStream;

  constructor(
    @Inject(REALTIME_CONNECTION) private readonly mongoCon: Connection,
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeMongoOptions,
    private readonly sessionService: SessionService,
    private readonly eventService: EventService,
  ) {
    this.changeStream = this.connectChangeStream();
  }

  async onApplicationShutdown() {
    this.logger.log('Closing change stream on application shutdown...');
    if (this.changeStream) {
      await this.changeStream.close();
      this.logger.log('Change stream closed successfully.');
    }
  }

  private connectChangeStream = () => {
    const changeStream = this.mongoCon.watch(
      [
        {
          $match: {
            operationType: { $in: ['insert', 'update', 'replace', 'delete'] },
          },
        },
      ],
      { fullDocument: 'updateLookup' } satisfies ChangeStreamOptions,
    );
    if (changeStream.closed) {
      throw new Error("Couldn't connect");
    }

    changeStream.on('change', async (data) => {
      // This is done for typescript to stop complaining. data is a union type that depends on `operationType`
      if (!this.isNeededChangeDocument(data)) {
        // During the `invalidate` event, the change stream is automatically closed by Mongo.
        if (data.operationType === 'invalidate') {
          this.logger.warn('Change stream invalidated');
          this.changeStream = this.connectChangeStream();
        }
        return;
      }

      if (this.options.enableWebsocket) {
        this.handleWebsocketEmitter(data);
      }

      this.eventService.invokeHandlers(data);
    });
    changeStream.on('error', async (err) => {
      this.logger.error(err);
      await this.changeStream.close();
      this.changeStream = this.connectChangeStream();
    });
    changeStream.on('close', () => this.logger.log('Closed Connnection'));

    return changeStream;
  };

  private handleWebsocketEmitter = (data: RealtimeMongoEvent) => {
    const sessions = this.sessionService.listAll();

    sessions.forEach(({ client, document_ids, filter, document_id }) => {
      const collectionName = client.data.model.collection.collectionName;

      if (data.ns.coll !== collectionName) return;

      if (filter) {
        this.handleQueryUpdate(client, filter, document_ids, data);
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
    data: RealtimeMongoEvent,
  ) => {
    // Check if discriminator was provided
    const model = client.data.model;

    // If discriminator is provided, modify the query to use it
    if (model.baseModelName) {
      const discriminatorMapping: DiscriminatorMapping = (model.schema as any)
        .discriminatorMapping;

      // Check if user is already filtering by `discriminator key`
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
      client.emit('remove', { _id });
    };
    if (data.operationType === 'delete') {
      if (document_ids.has(_id)) removeDocument();
      return;
    }

    // Helper functions for common actions
    const addDocument = () => {
      document_ids.add(_id);
      client.emit('add', { _id, data: data.fullDocument });
    };
    const updateDocument = () => {
      client.emit('update', { _id, data: data.fullDocument });
    };

    const didTestPass = q.test(data.fullDocument);

    // Handle update and replace operations
    if (data.operationType === 'update' || data.operationType === 'replace') {
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
    if (data.operationType === 'insert' && didTestPass) {
      addDocument();
      return;
    }
  };

  private handleSingleUpdate(
    client: DbSocket,
    document_id: string,
    data: RealtimeMongoEvent,
  ) {
    const _id = data.documentKey._id.toString();
    if (document_id !== _id) return;

    if (data.operationType === 'delete') {
      return client.emit('remove', { _id });
    }

    // Handle update and replace operations
    if (data.operationType === 'update' || data.operationType === 'replace') {
      return client.emit('update', { _id, data: data.fullDocument });
    }

    // Handle insert operation
    if (data.operationType === 'insert') {
      return client.emit('add', { _id, data: data.fullDocument });
    }
  }

  private isNeededChangeDocument = (
    data: ChangeStreamDocument,
  ): data is RealtimeMongoEvent => {
    const excludedOps: ChangeStreamDocument['operationType'][] = [
      'rename',
      'drop',
      'dropDatabase',
      'dropIndexes',
      'invalidate',
      'modify',
      'createIndexes',
      'shardCollection',
      'reshardCollection',
      'refineCollectionShardKey',
      'create',
    ];
    return !excludedOps.includes(data.operationType);
  };
}
