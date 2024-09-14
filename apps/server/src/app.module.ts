import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { REALTIME_GUARD, RealtimeModule } from "@dl-tech/realtime-mongo-nestjs";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseEventService } from "@/database-event.service";
import { UserModel, UserSchema } from "@/schemas/user.model";
import { APP_GUARD } from "@nestjs/core";
import { AppGuard } from "@/app.guard";

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
      websocketGuard: AppGuard,
    }),
  ],
  providers: [
    DatabaseEventService,
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
