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
import type { Namespace } from 'socket.io';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RealtimeFilter } from './realtime.filter';
import { SessionService } from './services/session.service';
import { RealtimeService } from './realtime.service';
import type { DbSocket } from './realtime.types';
import { RealtimeAuthDto } from './dto/realtime.query';
import { GuardService } from './services/guard.service';
import { REALTIME_OPTIONS } from './realtime.constants';
import type { RealtimeMongoOptions } from './realtime.options';
import * as parser from '@socket.io/devalue-parser';
import { devalueReducers, devalueRevivers } from './encoder';
import { ObjectId } from 'mongodb';

@WebSocketGateway({
  namespace: 'database',
  parser: {
    Encoder: parser.Encoder.bind(null, devalueReducers),
    Decoder: parser.Decoder.bind(null, devalueRevivers),
  },
})
@UseFilters(RealtimeFilter)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeMongoOptions,
    private readonly realtimeService: RealtimeService,
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
      let filter = authDto._realtime.filter ?? {};
      if (authDto._realtime._id) {
        filter._id = new ObjectId(authDto._realtime._id);
      }

      const model = this.databaseService.getModel(modelName);

      // Validate Collection Name
      if (!model) {
        const err = new BadRequestException(`Unknown collection: ${modelName}`);
        return next(err);
      }

      // Validate rule guards
      try {
        const user = this.getUser(client);
        const guardFilter = await this.realtimeService.verifyAccess(
          user,
          model,
          'canRead',
        );

        if (guardFilter) {
          filter = this.realtimeService.mergeFilters(filter, guardFilter);
        }
      } catch (e) {
        return next(e);
      }

      client.data = { isDocument: !!authDto._realtime._id, model, filter };

      return next();
    });
  }

  async handleConnection(client: DbSocket): Promise<void> {
    const session = this.sessionService.create(client);
    const model = client.data.model;
    const filter = client.data.filter;

    const result = await model.find(filter).exec();

    session.document_ids = new Set<string>(result.map(({ _id }) => `${_id}`));

    if (client.data.isDocument) {
      client.emit('data', result[0]?.toJSON() ?? null);
    } else {
      client.emit(
        'data',
        result.map((item) => item.toJSON()),
      );
    }
  }

  handleDisconnect(client: DbSocket): any {
    this.sessionService.remove(client);
  }

  /**
   * Extracts the user from the Socket using the access guard's extraction method.
   *
   * @param socket - The incoming client Socket.
   *
   * @returns The user object extracted from the socket or null if not available.
   */
  private getUser = (socket: DbSocket): Record<string, any> | null => {
    return this.options.accessGuard?.extractUserWS?.(socket) ?? null;
  };
}
