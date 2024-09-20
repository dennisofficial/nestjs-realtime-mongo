import { io, Socket } from 'socket.io-client';
import { Filter } from 'mongodb';
import { RealtimeClientOptions } from './types';

interface EmitMap<R extends Record<string, any>> {
  query: (data: Filter<R>) => void;
  document: (data: { _id: string }) => void;
  auth: (auth: Record<string, any>) => void;
}

interface ListenMap<R extends Record<string, any>, D extends R | R[]> {
  data: (data: D) => void;
  update: (data: { _id: string; data: R }) => void;
  remove: (data: { _id: string }) => void;
  add: (data: { _id: string; data: R }) => void;
  exception: (err: any) => void;
}

interface RealtimeResult {
  unsubscribe: () => void;
  refresh: () => Promise<void>;
}

export class RealtimeSocketClient<
  ModelMap extends Record<string, any> = Record<string, any>,
> {
  constructor(private readonly options: RealtimeClientOptions) {}

  onQueryUpdate = <
    ModelName extends keyof ModelMap,
    R extends ModelMap[ModelName],
  >(
    modelName: ModelName,
    filter: Filter<R>,
    onChange: (data: R[]) => any,
    onError?: (err: any) => any,
  ) => {
    // Incase unsubscribe is called before a connection is made, this will
    // make the socket disconnect onConnection
    let shouldDisconnect = false;

    const cache = new Map<string, R>();

    const url = new URL('database', this.options.baseURL);

    const socket: Socket<ListenMap<R, R[]>, EmitMap<R>> = io(url.href, {
      transports: ['websocket'],
      extraHeaders: this.options.headers,
      reconnection: true,
      auth: async (cb) => {
        const baseObject = { modelName, filter };

        try {
          const payload = await this.options.wsAuth?.();
          cb({
            ...payload,
            _realtime: baseObject,
          });
        } catch (error) {
          console.error('[RealtimeSocketClient] wsAuth Failed:', error);
          cb(baseObject);
        }
      },
    });

    socket.on('connect', async () => {
      if (shouldDisconnect) {
        socket.disconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[RealtimeSocketClient] Connection Error:', error);
      onError?.(error);
    });

    socket.on('exception', (err) => {
      console.error('[RealtimeSocketClient] Server Exception:', err);
      onError?.(err);
    });

    socket.on('data', (data) => {
      cache.clear();
      data.forEach((item) => cache.set(item._id, item));
      onChange(Array.from(cache.values()));
    });

    socket.on('remove', (data) => {
      cache.delete(data._id);
      onChange(Array.from(cache.values()));
    });

    socket.on('update', (data) => {
      cache.set(data._id, data.data);
      onChange(Array.from(cache.values()));
    });

    socket.on('add', (data) => {
      cache.set(data._id, data.data);
      onChange(Array.from(cache.values()));
    });

    return {
      unsubscribe: () => {
        shouldDisconnect = true;
        if (socket.connected) {
          socket.disconnect();
        }
      },
    };
  };
}
