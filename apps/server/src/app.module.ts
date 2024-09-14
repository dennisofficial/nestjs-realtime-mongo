import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { REALTIME_GUARD, RealtimeModule } from "@dl-tech/realtime-mongo-nestjs";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseEventService } from "@/database-event.service";
import { APP_GUARD } from "@nestjs/core";
import { AppGuard } from "@/app.guard";
import { UserModule } from "@/user/user.module";

const mockUser = {
  _id: "66e5036b6426de44d501d00d",
  first_name: "Dennis",
  last_name: "Lysenko",
  age: 6,
};

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://localhost:27017", {
      replicaSet: "rs0",
      dbName: "testing",
    }),

    BullModule.forRoot({
      connection: {
        host: "localhost",
        port: 6379,
      },
    }),
    RealtimeModule.forRoot({
      enableRestApi: true,
      enableWebsocket: true,
      accessGuard: {
        extractUserRest: () => mockUser,
        extractUserWS: () => mockUser,
      },
    }),

    UserModule,
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
