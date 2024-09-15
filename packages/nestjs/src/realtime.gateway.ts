import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  InternalServerErrorException,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import type { Connection, FilterQuery } from 'mongoose';
import type { Namespace } from 'socket.io';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RealtimeFilter } from './realtime.filter';
import { REALTIME_CONNECTION } from './realtime.constants';
import { SessionService } from './services/session.service';
import { RealtimeService } from './realtime.service';
import type { DbSocket, ListenMap } from './realtime.types';
import { RealtimeQuery } from './dto/realtime.query';
import { GuardService } from './services/guard.service';

@WebSocketGateway({ namespace: 'database' })
@UseFilters(RealtimeFilter)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    @Inject(REALTIME_CONNECTION) private readonly mongoCon: Connection,
    private readonly sessionService: SessionService,
    private readonly databaseService: RealtimeService,
    private readonly guardService: GuardService,
  ) {}

  afterInit(server: Namespace): void {
    server.use(async (client: DbSocket, next) => {
      try {
        const canActivate = await this.guardService.invokeGuards(client);

        if (!canActivate) {
          next(new ForbiddenException());
          return;
        }
      } catch (e) {
        if (e instanceof HttpException) {
          next(e);
        } else {
          next(new InternalServerErrorException());
        }
        return;
      }

      const query = plainToInstance(RealtimeQuery, client.handshake.query);

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
      const modelNames = this.mongoCon.modelNames();
      if (!modelNames.includes(query.modelName)) {
        const err = new BadRequestException(
          `Unknown collection: ${query.modelName}`,
        );
        return next(err);
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
      model = this.databaseService.getModelOrThrow(client.data.query.modelName);
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
