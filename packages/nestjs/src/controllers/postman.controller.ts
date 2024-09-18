import { Controller, Get, Inject } from '@nestjs/common';
import { PostManOptions } from '../decorators/postman.decorator';
import {
  METADATA_POSTMAN_OPTIONS,
  REALTIME_CONNECTION,
} from '../realtime.constants';
import { RealtimeController } from './realtime.controller';
import { Reflector } from '@nestjs/core';
import { Connection } from 'mongoose';

@Controller('database')
export class PostmanController {
  constructor(
    @Inject(REALTIME_CONNECTION) private readonly connection: Connection,
    private readonly reflector: Reflector,
  ) {}

  @Get('postman')
  async getPostmanCollection() {
    const postmanMetadata: Record<string, PostManOptions> = this.reflector.get(
      METADATA_POSTMAN_OPTIONS,
      RealtimeController,
    );

    const postmanValues = Object.values(postmanMetadata);
    const modelNames = Object.keys(this.connection.models);

    const folders = postmanValues.reduce(
      (acc, options) => {
        if (!(options.folderName in acc)) {
          acc[options.folderName] = [];
        }
        acc[options.folderName].push(options);
        return acc;
      },
      {} as Record<string, PostManOptions[]>,
    );

    return {
      info: {
        name: 'Realtime Database',
        schema:
          'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      items: modelNames.map((modelName) => ({
        name: modelName,
        items: Object.entries(folders).map(([folderName, options]) => ({
          name: folderName,
          items: options.map((option) => ({
            name: option.name,
            request: {
              method: option.method,
              header: [],
              body: {
                mode: 'raw',
                raw: JSON.stringify(option.body, null, 2),
                options: {
                  raw: {
                    language: 'json',
                  },
                },
              },
              url: {
                raw: `{{realtime_base_url}}/database/${option.endpoint}?modelName=${modelName}`,
                host: ['{{realtime_base_url}}'],
                path: ['database', option.endpoint],
                query: [{ key: 'modelName', value: modelName }],
              },
            },
            response: [],
          })),
        })),
      })),
      event: [
        {
          listen: 'prerequest',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: [''],
          },
        },
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            packages: {},
            exec: [''],
          },
        },
      ],
      variable: [
        {
          key: 'realtime_base_url',
          value: 'http://localhost:4000/',
          type: 'string',
        },
      ],
    };
  }
}
