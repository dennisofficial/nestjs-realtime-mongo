import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
import type { Connection, FilterQuery, Model } from 'mongoose';
import type { Namespace } from 'socket.io';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RealtimeFilter } from './realtime.filter';
import { REALTIME_CONNECTION } from './realtime.constants';
import { SessionService } from './services/session.service';
import { RealtimeService } from './realtime.service';
import type { DbSocket, RealtimeMongoSession } from './realtime.types';
import { RealtimeAuthDto } from './dto/realtime.query';
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

      const authDto = plainToInstance(RealtimeAuthDto, client.handshake.auth);

      // Validate Query DTO
      const validationErrors = await validate(authDto, {
        whitelist: true,
      });
      if (validationErrors.length) {
        const validation = new ValidationPipe();
        const factory = validation.createExceptionFactory();
        const error: any = factory(validationErrors);
        return next(error);
      }

      const { modelName } = authDto._realtime;
      client.data.options = authDto._realtime;

      const model = this.databaseService.getModel(modelName);

      // Validate Collection Name
      if (!model) {
        const err = new BadRequestException(`Unknown collection: ${modelName}`);
        return next(err);
      }

      client.data.model = model;

      return next();
    });
  }

  async handleConnection(client: DbSocket): Promise<void> {
    const session = this.sessionService.create(client);

    if (client.data.options.filter) {
      await this.handleFilter(
        client,
        session,
        client.data.model,
        client.data.options.filter,
      );
    }
    if (client.data.options._id) {
      await this.handleDocument(
        client,
        client.data.model,
        client.data.options._id,
      );
    }
  }

  handleDisconnect(client: DbSocket): any {
    this.sessionService.remove(client);
  }

  private handleFilter = async (
    client: DbSocket,
    session: RealtimeMongoSession,
    model: Model<any>,
    filter: FilterQuery<any>,
  ) => {
    const result = await model.find(filter).exec();

    session.filter = filter;
    session.document_ids = new Set<string>(result.map(({ _id }) => `${_id}`));

    client.emit('data', result);
  };

  private handleDocument = async (
    client: DbSocket,
    model: Model<any>,
    _id: string,
  ) => {
    const result = await model.findById(_id).exec();
    client.emit('data', result);
  };
}
