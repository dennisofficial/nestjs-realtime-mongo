import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  BadRequestException,
  Inject,
  InternalServerErrorException,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { Connection, FilterQuery } from 'mongoose';
import { Namespace } from 'socket.io';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RealtimeFilter } from './realtime.filter';
import { REALTIME_MONGO_DB_CONNECTION } from './realtime.constants';
import { SessionService } from './services/session.service';
import { RealtimeService } from './services/realtime.service';
import type { DbSocket, ListenMap } from './realtime.types';
import { WebsocketQuery } from './dto/websocket.query';

@WebSocketGateway({ namespace: 'database' })
@UseFilters(RealtimeFilter)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    @Inject(REALTIME_MONGO_DB_CONNECTION) private readonly mongoCon: Connection,
    private readonly sessionService: SessionService,
    private readonly databaseService: RealtimeService,
  ) {}

  afterInit(server: Namespace): void {
    server.use(async (client: DbSocket, next) => {
      const query = plainToInstance(WebsocketQuery, client.handshake.query);

      // Validate Query DTO
      const validationErrors = await validate(query, {
        whitelist: true,
      });
      if (validationErrors.length) {
        const validation = new ValidationPipe({
          whitelist: true,
        });
        const factory = validation.createExceptionFactory();
        const error: any = factory(validationErrors);
        return next(error);
      }

      client.data.query = query;

      // Validate Collection Name
      const collections = Object.keys(this.mongoCon.collections);
      if (!collections.includes(query.collection)) {
        const err = new BadRequestException(
          `Unknown collection: ${query.collection}`,
        );
        return next(err);
      }

      // Validate Model Instance
      const model = this.databaseService.getModel(query.collection);
      if (!model) {
        const err = new InternalServerErrorException(
          `Collection found: ${query.collection}, Model undefined`,
        );
        return next(err);
      }

      // Validate Discriminator
      if (query.discriminator) {
        const discriminator = this.databaseService.getDiscriminatorMapping(
          model,
          query.discriminator,
        );
        if (!discriminator) {
          const err = new BadRequestException(
            `Unknown discriminator: ${query.discriminator}`,
          );
          return next(err);
        }
        client.data.discriminatorMapping = discriminator;
      }

      return next();
    });
  }

  handleConnection(client: DbSocket): any {
    this.sessionService.create(client);
  }

  handleDisconnect(client: DbSocket): any {
    this.sessionService.remove(client);
  }

  @SubscribeMessage<keyof ListenMap>('query')
  async onQuery(client: DbSocket, payload: FilterQuery<any>) {
    let session;
    let model;
    try {
      session = this.sessionService.findOrThrow(client);
      model = this.databaseService.resolveModel(
        client.data.query.collection,
        client.data.query.discriminator,
      );
    } catch (e) {
      client.disconnect(true);
      return;
    }

    const result = await model.find(payload).exec();

    session.query = payload;
    session.document_ids = new Set<string>(result.map(({ _id }) => `${_id}`));

    client.emit('data', result);
  }

  @SubscribeMessage<keyof ListenMap>('document')
  async onDocument(client: DbSocket, { _id }: { _id: string }) {
    const modelSession = this.databaseService.getModelSession(client);
    if (!modelSession) return;
    const [session, model] = modelSession;

    const result = await model.findById(_id).exec();

    session.document_id = _id;

    client.emit('data', result);
  }
}
