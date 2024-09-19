import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Connection, Model } from 'mongoose';
import { REALTIME_CONNECTION } from './realtime.constants';
import { SessionService } from './services/session.service';
import { DbSocket, RealtimeMongoSession } from './realtime.types';

@Injectable()
export class RealtimeService {
  constructor(
    @Inject(REALTIME_CONNECTION) private readonly mongoCon: Connection,
    private readonly sessionService: SessionService,
  ) {}

  getModelSession = (
    client: DbSocket,
  ): [RealtimeMongoSession, Model<any>] | undefined => {
    const session = this.sessionService.find(client);
    if (!session) {
      const exception = new BadRequestException(
        'Session not found. Please reconnect',
      );
      client.emit('exception', exception.getResponse());
      client.disconnect(true);
      return;
    }

    const model = this.getModel(client.data.query.modelName);

    if (!model) {
      const exception = new BadRequestException(
        `Model was not found using: ${client.data.query.modelName}`,
      );
      client.emit('exception', exception.getResponse());
      client.disconnect(true);
      return;
    }
    return [session, model];
  };

  getModel(modelName: string): Model<any> | undefined {
    return Object.values(this.mongoCon.models).find(
      (model) => model.modelName === modelName,
    );
  }

  getModelOrThrow(modelName: string): Model<any> {
    const model = this.getModel(modelName);

    if (!model) {
      throw new NotFoundException(`Model ${modelName} does not exist`);
    }

    return model;
  }
}
