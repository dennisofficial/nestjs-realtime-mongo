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
Limit the resources the authenticated user has access to.

#### User Context
First we need to give the `RealtimeModule` as way to extract the user from the request. This is so it can extract the user
information for you, and provide it ready when the rule is being invoked.

In an express server, or NestJS, it is popular to attach the user object to the request object. In your Auth Guard, or
whatever implementation you are using to attach the user object to the request object, give that context to the realtime
database.
```typescript
import { Module } from "@nestjs/common";
import { RealtimeModule } from "@dl-tech/realtime-mongo-nestjs";
import { Request } from 'express';
import { Socket } from 'socket.io';
import { User } from './user.types';

const mockUser = {
  _id: "66e5036b6426de44d501d00d",
  first_name: "Dennis",
  last_name: "Lysenko",
  age: 6,
};

@Module({
  imports: [
    RealtimeModule.forRoot({
      // ...
      accessGuard: {
        extractUserRest: (req: Request) => req._user as User,
        extractUserWS: (socket: Socket) => socket.data._user as User,
      },
      // ...
    }),
  ],
})
export class AppModule {}
```

#### Defining Rules
To limit what resources users has access to, create a new provider, and apply the `@RealtimeRule(modelType)` decorator.
Pass in the class used to create the `@nestjs/mongoose` `Schema`, and the Module will use this class as the access guard.


```typescript
// user.rule.ts
import {
  RealtimeRule,
  RealtimeRuleGuard,
} from "@dl-tech/realtime-mongo-nestjs";
import { UserDocument, UserModel } from "./user/user.model";
import { User } from "./user/user.types";
import { FilterQuery } from "mongoose";
import { ObjectId } from "mongodb";

@RealtimeRule(UserModel)
export class UserRule extends RealtimeRuleGuard<User, UserDocument> {
  // No authenticated users can create a user
  canCreate(user: User | null): FilterQuery<UserDocument> | boolean {
    if (!user) return false;

    return false;
  }

  // Only authenticated user can read itself
  canRead(user: User | null): FilterQuery<UserDocument> | boolean {
    if (!user) return false;

    return {
      _id: new ObjectId(user._id),
    };
  }

  // Only authenticated user can update itself
  canUpdate(user: User | null): FilterQuery<UserDocument> | boolean {
    if (!user) return false;

    return {
      _id: new ObjectId(user._id),
    };
  }

  // No authenicated user can delete
  canDelete(user: User | null): boolean {
    return true;
  }
}

```

Ensure the class extends `RealtimeRuleGuard`. The first `generic type` will be the authenticated user type that you use
around your app. The second `generic type` will be the MongoDB `Document` type. This is just to help with `FilterQuery`
auto completion.

In the `RealtimeRuleGuard` class, there are four methods, `canCreate`, `canRead`, `canUpdate`, and `canDelete`. These
methods will run right before a query is sent to mongodb, and validate the users authorization to the resource. Each
function expects either a `boolean` or a `FilterQuery` type. If a boolean is returned, the Rest API or the WebSocket
service, will throw `Forbidden Exception` immediately, however, if a filter query is provided this will be appended to
the query the client provided. This in turn will force them to query only the documents you specify, and their additional
filters, will be appended with the filter provided from the `rule`.

##### For example:
If your rule states that only authenticated users can update their own `posts`, it would look like this. Assuming that
in the `Posts` model, there is an `owner_id` field.
```typescript
@RealtimeRule(UserModel)
export class UserRule extends RealtimeRuleGuard<User, UserDocument> {
  // ...
  canUpdate(user: User | null): FilterQuery<PostDocument> | boolean {
    if (!user) return false;

    return {
      owner_id: new ObjectId(user._id)
    };
  }
  // ...
}
```
The client will make a request like so:
```js
// The user making the request is user A
fetch({
  method: "POST",
  url: "database/findOneAndUpdate?modelName=Posts",
  headers: {
    // Your NestJS Authentication method, you handle this.
    Authorization: "Bearer ... user_id: A"
  },
  // Lets pretend someone makes a fraudulent request to steal a post.
  data: JSON.stringify({
    filter: {
      // Client is trying to update post from user B
      owner_id: "B",
      // ...
    },
    update: {
      owner_id: "A"
    }
  })
})
```
Once the request is made, and your server authenticates the user, and attaches the user to the request object, the rule
is then invoked, and the final query to MonogDB will look like so:
```
db.posts.findOneAndUpdate(
   {
      owner_id: "B",
      $and: [
         { owner_id: "A" }
      ]
   },
   {
      owner_id: "A"
   }
)
```
The above query to the database, will result in nothing, since the server injected the filter from the rule. This is great,
when you dont want the client to worry about what they are allowed to access. 