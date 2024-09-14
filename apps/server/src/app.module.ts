import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RealtimeModule } from "@dl-tech/realtime-mongo-nestjs";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseEventService } from "@/database-event.service";
import { UserModel, UserSchema } from "@/schemas/user.model";

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://localhost:27017", {
      replicaSet: "rs0",
      dbName: "testing",
    }),
    MongooseModule.forFeature([{ name: UserModel.name, schema: UserSchema }]),

    BullModule.forRoot({
      connection: {
        host: "localhost",
        port: 6379,
      },
    }),
    RealtimeModule.forRoot({
      enableRestApi: true,
      enableWebsocket: true,
      enableEventEmitter: true,
    }),
  ],
  providers: [DatabaseEventService],
})
export class AppModule {}
