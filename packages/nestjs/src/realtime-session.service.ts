import { BadRequestException, Injectable } from "@nestjs/common";
import { DbSocket, RealtimeMongoSession } from "./realtime-mongo.types";

@Injectable()
export class RealtimeSessionService {
  private sessions = new Map<string, RealtimeMongoSession>();

  create = (socket: DbSocket) => {
    this.sessions.set(socket.id, {
      client: socket,
      document_ids: new Set(),
    });
  };

  remove = (socket: DbSocket) => {
    this.sessions.delete(socket.id);
  };

  listAll = () => {
    return Array.from(this.sessions.values());
  };

  find = (socket: DbSocket) => {
    return this.sessions.get(socket.id);
  };

  findOrThrow = (socket: DbSocket) => {
    const session = this.find(socket);
    if (!session) {
      throw new BadRequestException("Session not found. Please reconnect");
    }
    return session;
  };
}
