# NestJS MongoDB Realtime Database
Inspired by FireStore, this package utilizes [`@nestjs/mongoose`](https://docs.nestjs.com/techniques/mongodb) and
[Change Streams](https://www.mongodb.com/docs/manual/changeStreams/) to create a similar experience to how FireBase Realtime
database functions.

Utilizing WebSockets from `socket.io` for client connections, and for regular REST Crud Operations, exposes the REST API,
for the client SDK to use.

## Installation
`@dl-tech/realtime-mongo-nestjs` depends on several NestJS dependencies that should already be installed, as well as some
additional NestJS packages.

#### Ensure NestJS is installed
See [official docs](https://docs.nestjs.com/)
```shell
npm i @nestjs/core @nestjs/common rxjs reflect-metadata
yarn i @nestjs/core @nestjs/common rxjs reflect-metadata
pnpm i @nestjs/core @nestjs/common rxjs reflect-metadata
```

#### Install NestJS Mongoose
See [official docs](https://docs.nestjs.com/techniques/mongodb)
```shell
npm i @nestjs/mongoose mongoose
yarn i @nestjs/mongoose mongoose
pnpm i @nestjs/mongoose mongoose
```

#### Install NestJS WebSockets (socket.io)
This is needed for clients to connect with WebSockets using NestJS.

See [official docs](https://docs.nestjs.com/websockets/gateways)
```shell
npm i @nestjs/websockets @nestjs/platform-socket.io
yarn i @nestjs/websockets @nestjs/platform-socket.io
pnpm i @nestjs/websockets @nestjs/platform-socket.io
```

#### Install RealtimeMongoDB
```shell
npm i @dl-tech/realtime-mongo-nestjs
yarn i @dl-tech/realtime-mongo-nestjs
pnpm i @dl-tech/realtime-mongo-nestjs
```

Ensure `enableShutdownHooks()` is enabled in `main.ts`. This ensures that the `Change Stream` connection can be gracefully closed.

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { useContainer } from "class-validator";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  await app.listen(4000);
}
void bootstrap();
```
app.enableShutdownHooks();

## Usage

```typescript
import { RealtimeMongoModule } from '@dl-tech/realtime-mongo-nestjs';

@Module({
  imports: [
    RealtimeMongoModule.forRoot({
      enableRestApi: true,
      enableWebsocket: true,
    }),
  ],
})
export class AppModule {}
```

### Listen to Change Events (Server-Side)

Using the `@ChangeStreamListener()` decorator will register this class to be called whenever a Change Stream is received.

This package does not listen to every event in MongoDB, the events that will be caught are
[Insert](https://www.mongodb.com/docs/manual/reference/change-events/insert/),
[Update](https://www.mongodb.com/docs/manual/reference/change-events/update/),
[Replace](https://www.mongodb.com/docs/manual/reference/change-events/replace/),
[Delete](https://www.mongodb.com/docs/manual/reference/change-events/delete/).

```typescript
import {
  ChangeStreamListener,
  RealtimeEventHandler,
  RealtimeMongoEvent,
} from "@dl-tech/realtime-mongo-nestjs";

@ChangeStreamListener()
export class DatabaseEventService extends RealtimeEventHandler {
  async onChangeEvent(data: RealtimeMongoEvent) {
    // Do something with data
  };
}

```

### Authentication
Rest API endpoints resolved by the package can be protected using NestJS's `APP_GUARD`, see docs [here](https://docs.nestjs.com/guards).
However, global guards are not applied to WebSockets in NestJS, and `@UseGuards()` in WebSockets only guard message channels, and not
the socket.io handshake.

There are two methods to secure socket.io during the handshake. First is either extending `@nestjs/websockets` adapter, 
this will secure your websockets globally, and not only for the package. Second, you can provide `REALTIME_GUARD` anywhere in the app,
and the module will use that to guard your socket handshake.

#### Method One
```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { 
  REALTIME_GUARD,
  RealtimeModule,
} from "@dl-tech/realtime-mongo-nestjs";
import { APP_GUARD } from "@nestjs/core";
import { AppGuard } from "./app.guard";

@Module({
  imports: [
    RealtimeModule.forRoot({
      enableRestApi: true,
      enableWebsocket: true,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppGuard,
    },
    {
      provide: REALTIME_GUARD,
      useClass: AppGuard,
    },
  ],
})
export class AppModule {}
```
```typescript
// app.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import {
  CanRealtimeActivate,
  isRealtimeDatabase,
} from "@dl-tech/realtime-mongo-nestjs";

@Injectable()
export class AppGuard implements CanActivate, CanRealtimeActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (isRealtimeDatabase(context)) {
      // Do some Logic
    }
    return true;
  }

  canRealtimeActivate(socket: Socket): boolean | Promise<boolean> {
    // Do some Logic
    return true;
  }
}
```

#### Method Two
```typescript
// websocket.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Injectable()
export class WebSocketAdapter extends IoAdapter {
  constructor(private readonly httpInstance: HttpAdapterHost) {
    super(httpInstance.httpAdapter.getHttpServer());
  }

  create(port: number, options?: ServerOptions & { namespace?: string; server?: any }): Server {
    const server = super.create(port, options);

    server.use(async (socket: Socket, next) => {
      // Do Logic here
      const isAllowed = true;
      if (!isAllowed) {
        next(new Error('Unauthorized'));
        return;
      }

      next();
    });

    return server;
  }

  createIOServer(port: number, options?: any): any {
    return new Server(this.httpInstance.httpAdapter.getHttpServer(), options);
  }
}
```
```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WebSocketAdapter } from './websocket.adapter.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.useWebSocketAdapter(new WebSocketAdapter());

  await app.listen(4000);
}

void bootstrap();
```

#### isRealtimeDatabase
This function will let you know whether the `ExecutionContext` is for the `Realtime Database Controller`. If needed you
can preform additional logic depending on that.
```typescript
// app.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import { isRealtimeDatabase } from "@dl-tech/realtime-mongo-nestjs";

@Injectable()
export class AppGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (isRealtimeDatabase(context)) {
      // Do some Logic
    }
    return true;
  }
}
```

### Authorization