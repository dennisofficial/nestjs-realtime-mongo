import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import {
  CanRealtimeActivate,
  isRealtimeDatabase,
} from "@dl-tech/realtime-mongo-nestjs";
import { Socket } from "socket.io";

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
