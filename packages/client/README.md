# NestJS MongoDB Realtime Database (Client)
Inspired by FireStore, this connects to the server instance of the [Realtime MongoDB](https://www.npmjs.com/package/@dl-tech/realtime-mongo-nestjs) Package.

Utilizing WebSockets from `socket.io` for client connections, and for regular REST Crud Operations, to connect to the server instance.

## Installation
```shell
npm i @dl-tech/realtime-mongo-client
```

## Usage
```typescript
// realtime.ts

export const { databaseSocket, databaseRest } = initializeRealtimeMongo<
  ModelMap,
  BaseMongo
>({
  baseURL: 'http://localhost:4000',
  wsAuth: async () => {
    // This function is for the Auth Object in socket.io. Use this to authenticate your users.
    return {
      id_token: 'eyzasdfasf...',
    };
    
    // Usage with third part auth library
    return {
      id_token: await auth.getIdToken()
    }
  },
  restAuth: async () => {
    // This function is for the Auth Object in socket.io. Use this to authenticate your users.
    return {
      Authorization: 'Bearer eyzasdfasf...',
    };

    // Usage with third part auth library
    const token = await auth.getIdToken();
    return {
      Authorization: `Bearer ${token}`
    }
  }
});
```