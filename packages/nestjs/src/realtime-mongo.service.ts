import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Connection, Model } from "mongoose";
import { REALTIME_MONGO_DB_CONNECTION } from "./realtime-mongo.constants";
import { RealtimeSessionService } from "./realtime-session.service";
import {
  DbSocket,
  DiscriminatorMapping,
  RealtimeMongoSession,
} from "./realtime-mongo.types";

@Injectable()
export class RealtimeMongoService {
  constructor(
    @Inject(REALTIME_MONGO_DB_CONNECTION) private readonly mongoCon: Connection,
    private readonly sessionService: RealtimeSessionService,
  ) {}

  getModelSession = (
    client: DbSocket,
  ): [RealtimeMongoSession, Model<any>] | undefined => {
    const session = this.sessionService.find(client);
    if (!session) {
      const exception = new BadRequestException(
        "Session not found. Please reconnect",
      );
      client.emit("exception", exception.getResponse());
      client.disconnect(true);
      return;
    }

    const model = this.getModel(client.data.query.collection);

    if (!model) {
      const exception = new BadRequestException(
        `Model was not found using collection: ${client.data.query.collection}`,
      );
      client.emit("exception", exception.getResponse());
      client.disconnect(true);
      return;
    }
    return [session, model];
  };

  getModel(collection: string): Model<any> | undefined {
    return Object.values(this.mongoCon.models).find(
      (model) => model.collection.name === collection,
    );
  }

  getModelOrThrow(collection: string): Model<any> {
    const model = this.getModel(collection);

    if (!model) {
      throw new NotFoundException(`Collection ${collection} does not exist`);
    }

    return model;
  }

  resolveModel(collection: string, discrimatorValue?: string): Model<any> {
    const model = this.getModelOrThrow(collection);

    let discriminatorModel: Model<any> | undefined;
    if (discrimatorValue) {
      const exception = new NotFoundException(
        `Discriminator model was not found using discriminator value: ${discrimatorValue}`,
      );

      const discriminatorMapping = this.getDiscriminatorMapping(
        model,
        discrimatorValue,
      );
      if (!discriminatorMapping) throw exception;

      discriminatorModel = this.getDiscriminatorModel(
        model,
        discriminatorMapping.value,
      );
      if (!discriminatorModel) throw exception;
    }

    return discriminatorModel ?? model;
  }

  getDiscriminatorMapping(
    model: Model<any>,
    discriminatorValue: string,
  ): DiscriminatorMapping | undefined {
    const discriminator = Object.values(model.discriminators ?? {}).find(
      (discriminator) =>
        (discriminator.schema as any).discriminatorMapping.value ===
        discriminatorValue,
    );
    return (discriminator?.schema as any)?.discriminatorMapping;
  }

  getDiscriminatorModel(
    model: Model<any>,
    discriminatorValue: string,
  ): Model<any> | undefined {
    return Object.values(model.discriminators ?? {}).find(
      (discriminator) =>
        (discriminator.schema as any).discriminatorMapping.value ===
        discriminatorValue,
    );
  }
}
