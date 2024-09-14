import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RealtimeMongoModule } from "@dl-tech/realtime-mongo-nestjs";

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://localhost:27017"),
    RealtimeMongoModule.register({
      enableRestApi: true,
      enableWebsocket: true,
      enableEventEmitter: true,
    }),
  ],
})
export class AppModule {}
