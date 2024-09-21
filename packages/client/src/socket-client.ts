import { io, Socket } from 'socket.io-client';
import { Filter } from 'mongodb';
import { RealtimeClientOptions } from './types';

interface EmitMap<R extends Record<string, any>> {
  query: (data: Filter<R>) => void;
  document: (data: { _id: string }) => void;
  auth: (auth: Record<string, any>) => void;
}

interface ListenMap<R extends Record<string, any>, D> {
  data: (data: D) => void;
  update: (data: { _id: string; data: R }) => void;
  remove: (data: { _id: string }) => void;
  add: (data: { _id: string; data: R }) => void;
  exception: (err: any) => void;
}

interface RealtimeResult {
  unsubscribe: () => void;
}

export class RealtimeSocketClient<
  ModelMap extends Record<string, any> = Record<string, any>,
> {
  constructor(private readonly options: RealtimeClientOptions<ModelMap>) {}

  private deserialize = <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    data: ModelMap[ModelName],
  ): ModelMap[ModelName] => {
    const deserializer = this.options.deserializers?.[modelName];

    if (deserializer) {
      return deserializer(data);
    }

    return data;
  };

  private _subscribe = <
    ModelName extends keyof ModelMap,
    R extends ModelMap[ModelName],
    D extends R | R[] | null,
  >(
    modelName: ModelName,
    params: { filter?: Filter<R>; _id?: string },
    onChange: (data: D) => any,
    onError?: (err: any) => any,
    options?: { isDocument: boolean },
  ): RealtimeResult => {
    let shouldDisconnect = false;

    const url = new URL('database', this.options.baseURL);

    const socket: Socket<ListenMap<R, D>, EmitMap<R>> = io(url.href, {
      transports: ['websocket'],
      extraHeaders: this.options.headers,
      reconnection: true,
      auth: async (cb) => {
        const baseObject = { modelName, ...params };

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

    socket.on('connect', () => {
      if (shouldDisconnect) {
        socket.disconnect();
      }
    });

    socket.on('connect_error', (error) => {
      // This will supress reconnection errors
      if (socket.active) return;

      console.error('[RealtimeSocketClient] Connection Error:', error);
      onError?.(error);
    });

    socket.on('exception', (err) => {
      console.error('[RealtimeSocketClient] Server Exception:', err);
      onError?.(err);
    });

    if (options?.isDocument) {
      // Handle document subscription
      socket.on('data', (data) => {
        onChange(this.deserialize(modelName, data as R));
      });

      socket.on('remove', () => {
        onChange(null as D);
      });

      socket.on('update', (data) => {
        onChange(this.deserialize(modelName, data.data as R));
      });

      socket.on('add', (data) => {
        onChange(this.deserialize(modelName, data.data as R));
      });
    } else {
      // Handle query subscription
      const cache = new Map<string, R>();

      socket.on('data', (data) => {
        if (data && Array.isArray(data)) {
          cache.clear();
          data.forEach((item: R) =>
            cache.set(item._id, this.deserialize(modelName, item)),
          );
          onChange(Array.from(cache.values()) as D);
        }
      });

      socket.on('remove', (data) => {
        cache.delete(data._id);
        onChange(Array.from(cache.values()) as D);
      });

      socket.on('update', (data) => {
        cache.set(data._id, this.deserialize(modelName, data.data));
        onChange(Array.from(cache.values()) as D);
      });

      socket.on('add', (data) => {
        cache.set(data._id, this.deserialize(modelName, data.data));
        onChange(Array.from(cache.values()) as D);
      });
    }

    return {
      unsubscribe: () => {
        shouldDisconnect = true;
        if (socket.connected) {
          socket.disconnect();
        }
      },
    };
  };

  public onQuery = <
    ModelName extends keyof ModelMap,
    R extends ModelMap[ModelName],
  >(
    modelName: ModelName,
    filter: Filter<R>,
    onChange: (data: R[]) => any,
    onError?: (err: any) => any,
  ): RealtimeResult => {
    return this._subscribe<ModelName, R, R[]>(
      modelName,
      { filter },
      onChange,
      onError,
      { isDocument: false },
    );
  };

  public onDocument = <
    ModelName extends keyof ModelMap,
    R extends ModelMap[ModelName],
  >(
    modelName: ModelName,
    _id: string,
    onChange: (data: R | null) => any,
    onError?: (err: any) => any,
  ): RealtimeResult => {
    return this._subscribe<ModelName, R, R | null>(
      modelName,
      { _id },
      onChange,
      onError,
      { isDocument: true },
    );
  };
}
