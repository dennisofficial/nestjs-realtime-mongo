import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import * as devalue from 'devalue';
import { devalueReducers } from './encoder';
import { Request } from 'express';

@Injectable()
export class RealtimeEncoderInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.headers['x-realtime-sdk'] !== 'true') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        return devalue.stringify(data, devalueReducers);
      }),
    );
  }
}
