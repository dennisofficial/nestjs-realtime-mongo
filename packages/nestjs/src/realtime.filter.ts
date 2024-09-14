import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import type { MongoServerError } from 'mongodb';

@Catch()
export class RealtimeFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception: any, host: ArgumentsHost) {
    if (isMongoServerError(exception)) {
      if (exception.code === 11000) {
        return this.replyError(
          new UnprocessableEntityException({
            ...exception.errorResponse,
            message: `Values already taken: ${JSON.stringify(Object.entries(exception.keyValue))}`,
          }),
          host,
        );
      }
    }

    return super.catch(exception, host);
  }

  replyError = (err: HttpException, host: ArgumentsHost) => {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const msg = err.getResponse();

    return response.status(err.getStatus()).json({
      ...(typeof msg === 'string' ? { message: msg } : msg),
      error: err.name,
      statusCode: err.getStatus(),
    });
  };
}

const isMongoServerError = (obj: any): obj is MongoServerError => {
  return obj.name === 'MongoServerError';
};
