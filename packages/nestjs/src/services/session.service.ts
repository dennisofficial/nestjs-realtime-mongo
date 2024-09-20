import { BadRequestException, Injectable } from '@nestjs/common';
import { DbSocket, RealtimeMongoSession } from '../realtime.types';

@Injectable()
export class SessionService {
  private sessions = new Map<string, RealtimeMongoSession>();

  create = (socket: DbSocket) => {
    const session: RealtimeMongoSession = {
      client: socket,
      document_ids: new Set(),
    };
    this.sessions.set(socket.id, session);
    return session;
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
      throw new BadRequestException('Session not found. Please reconnect');
    }
    return session;
  };
}
