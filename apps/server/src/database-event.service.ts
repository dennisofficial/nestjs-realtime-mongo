import {
  ChangeStreamListener,
  RealtimeEventHandler,
  RealtimeMongoEvent,
} from "@dl-tech/realtime-mongo-nestjs";

@ChangeStreamListener()
export class DatabaseEventService extends RealtimeEventHandler {
  onChangeEvent = async (data: RealtimeMongoEvent) => {
    console.log("REALTIME EVENT", data);
  };
}
