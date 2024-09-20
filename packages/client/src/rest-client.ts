import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  DataArrayDto,
  DataSingleDto,
  FilterDto,
  ObjectIdDto,
  RealtimeClientOptions,
  UpdateDto,
  UpdateIdDto,
} from './types';
import { DeleteResult, UpdateResult } from 'mongodb';
import {
  ApiError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from './errors';

export class RealtimeRestClient<
  ModelMap extends Record<string, any> = Record<string, any>,
  CreateModelExclusion extends Record<string, any> = {
    _id: string;
    __v: string;
  },
> {
  private axiosInstance: AxiosInstance;

  constructor(private readonly options: RealtimeClientOptions<ModelMap>) {
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      withCredentials: options.withCredentials,
    });

    this.axiosInstance.interceptors.request.use(async (r) => {
      r.headers = r.headers.concat(options.headers);
      return r;
    });

    this.axiosInstance.interceptors.response.use(
      async (r) => r,
      (config) => {
        if (!isAxiosError(config) || !config.response) {
          return Promise.reject(config);
        }

        const { status, data } = config.response;

        if (!this.isException(data)) {
          return Promise.reject(config);
        }

        if (status === 404) {
          return Promise.resolve({
            ...config,
            response: {
              ...config.response,
              data: null,
            },
          });
        }

        switch (status) {
          case 400:
            return Promise.reject(
              new ValidationError('Validation Error', data.message),
            );
          case 401:
            return Promise.reject(
              new UnauthorizedError('Auth Failed', 401, data.message),
            );
          case 403:
            return Promise.reject(
              new UnauthorizedError('Forbidden', 403, data.message),
            );
          case 409:
            return Promise.reject(
              new ConflictError('Conflict Error', data.message),
            );
          case 503:
            return Promise.reject(
              new ServiceUnavailableError('Service Unavailable', data.message),
            );
          case 500:
            return Promise.reject(
              new InternalServerError('Internal Server Error', data.message),
            );
          default:
            return Promise.reject(
              new ApiError('An error occurred', status, data.message),
            );
        }
      },
    );
  }

  private isException = (
    data: any,
  ): data is { message: string; error: string; statusCode: number } => {
    if (typeof data !== 'object') return false;

    if (!('message' in data)) return false;
    if (!('error' in data)) return false;
    if (!('statusCode' in data)) return false;

    return true;
  };

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

  //  ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
  // ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
  // ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
  // ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
  // ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
  //  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝

  /**
   * Inserts a single document into the specified model in the database.
   *
   * @template ModelName - The name of the model into which the document will be inserted. It must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the data to be inserted.
   *   - `data`: The actual document to insert into the database.
   *
   * @returns A promise that resolves to the inserted document of type `ModelMap[ModelName]`.
   *
   * @example
   * ```typescript
   * // Assuming you have a 'User' model in your ModelMap
   * const newUser = await client.insertOne('User', {
   *   data: {
   *     username: 'john_doe',
   *     email: 'john@example.com',
   *     password: 'securePassword123',
   *   },
   * });
   * console.log('Inserted user:', newUser);
   * ```
   */
  insertOne = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: DataSingleDto<
      Omit<ModelMap[ModelName], keyof CreateModelExclusion>
    >,
  ): Promise<ModelMap[ModelName]> => {
    const response = await this.axiosInstance.put(
      'database/insertOne',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Inserts multiple documents into the specified model in the database.
   *
   * @template ModelName - The name of the model into which the documents will be inserted. It must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing an array of data to be inserted.
   *   - `data`: An array of documents to insert into the database.
   *
   * @returns A promise that resolves to an array of inserted documents of type `ModelMap[ModelName][]`.
   *
   * @example
   * ```typescript
   * // Inserting multiple users into the 'User' model
   * const newUsers = await client.insertMany('User', {
   *   data: [
   *     { username: 'john_doe', email: 'john@example.com' },
   *     { username: 'jane_doe', email: 'jane@example.com' },
   *   ],
   * });
   * console.log('Inserted users:', newUsers);
   * ```
   */
  insertMany = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: DataArrayDto<
      Omit<ModelMap[ModelName], keyof CreateModelExclusion>
    >,
  ): Promise<Array<ModelMap[ModelName]>> => {
    const response = await this.axiosInstance.put(
      'database/insertMany',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  // ██████╗ ███████╗ █████╗ ██████╗
  // ██╔══██╗██╔════╝██╔══██╗██╔══██╗
  // ██████╔╝█████╗  ███████║██║  ██║
  // ██╔══██╗██╔══╝  ██╔══██║██║  ██║
  // ██║  ██║███████╗██║  ██║██████╔╝
  // ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝

  /**
   * Finds a single document in the specified model that matches the given filter.
   *
   * @template ModelName - The name of the model to query; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria.
   *   - `filter`: A MongoDB query filter specifying the criteria to match.
   *
   * @returns A promise that resolves to the found document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Finding a user with a specific username
   * const user = await client.findOne('User', {
   *   filter: { username: 'john_doe' },
   * });
   * if (user) {
   *   console.log('Found user:', user);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  findOne = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: FilterDto<ModelMap[ModelName]>,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findOne',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data) ?? null;
  };

  /**
   * Finds multiple documents in the specified model that match the given filter.
   *
   * @template ModelName - The name of the model to query; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria.
   *   - `filter`: A MongoDB query filter specifying the criteria to match.
   *
   * @returns A promise that resolves to an array of documents of type `ModelMap[ModelName]` that match the filter.
   *
   * @example
   * ```typescript
   * // Finding all users with the role 'admin'
   * const admins = await client.findMany('User', {
   *   filter: { role: 'admin' },
   * });
   * console.log('Admin users:', admins);
   * ```
   */
  findMany = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: FilterDto<ModelMap[ModelName]>,
  ): Promise<Array<ModelMap[ModelName]>> => {
    const response = await this.axiosInstance.post(
      'database/findMany',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Finds a single document in the specified model by its unique identifier.
   *
   * @template ModelName - The name of the model to query; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the unique identifier of the document.
   *   - `_id`: The unique identifier (ObjectId) of the document to retrieve.
   *
   * @returns A promise that resolves to the found document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Finding a user by their ID
   * const user = await client.findById('User', {
   *   _id: '60d0fe4f5311236168a109ca',
   * });
   * if (user) {
   *   console.log('Found user:', user);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  findById = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: ObjectIdDto,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findById',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data) ?? null;
  };

  // ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
  // ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
  // ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗
  // ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝
  // ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
  //  ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

  /**
   * Updates a single document in the specified model that matches the given filter.
   *
   * @template ModelName - The name of the model to update; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria and the update operations.
   *   - `filter`: A MongoDB query filter specifying which document to update.
   *   - `update`: A MongoDB update object defining the updates to apply.
   *
   * @returns A promise that resolves to an `UpdateResult` object containing information about the operation.
   *
   * @example
   * ```typescript
   * // Updating a user's email address
   * const result = await client.updateOne('User', {
   *   filter: { username: 'john_doe' },
   *   update: { $set: { email: 'new_email@example.com' } },
   * });
   * console.log('Number of documents matched:', result.matchedCount);
   * console.log('Number of documents modified:', result.modifiedCount);
   * ```
   */
  updateOne = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: UpdateDto<ModelMap[ModelName]>,
  ): Promise<UpdateResult> => {
    const response = await this.axiosInstance.post(
      'database/updateOne',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Updates multiple documents in the specified model that match the given filter.
   *
   * @template ModelName - The name of the model to update; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria and the update operations.
   *   - `filter`: A MongoDB query filter specifying which documents to update.
   *   - `update`: A MongoDB update object defining the updates to apply.
   *
   * @returns A promise that resolves to an `UpdateResult` object containing information about the operation.
   *
   * @example
   * ```typescript
   * // Incrementing the login count for all active users
   * const result = await client.updateMany('User', {
   *   filter: { isActive: true },
   *   update: { $inc: { loginCount: 1 } },
   * });
   * console.log('Number of documents matched:', result.matchedCount);
   * console.log('Number of documents modified:', result.modifiedCount);
   * ```
   */
  updateMany = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: UpdateDto<ModelMap[ModelName]>,
  ): Promise<UpdateResult> => {
    const response = await this.axiosInstance.post(
      'database/updateMany',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Finds a single document matching the filter, updates it, and returns the updated document.
   *
   * @template ModelName - The name of the model to update; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria and the update operations.
   *   - `filter`: A MongoDB query filter specifying which document to find and update.
   *   - `update`: A MongoDB update object defining the updates to apply.
   *
   * @returns A promise that resolves to the updated document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Find a user by username and update their email, returning the updated document
   * const updatedUser = await client.findOneAndUpdate('User', {
   *   filter: { username: 'john_doe' },
   *   update: { $set: { email: 'new_email@example.com' } },
   * });
   * if (updatedUser) {
   *   console.log('Updated user:', updatedUser);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  findOneAndUpdate = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: UpdateDto<ModelMap[ModelName]>,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findOneAndUpdate',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data) ?? null;
  };

  /**
   * Finds a document by its unique identifier, updates it, and returns the updated document.
   *
   * @template ModelName - The name of the model to update; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the unique identifier and the update operations.
   *   - `_id`: The unique identifier (ObjectId) of the document to update.
   *   - `update`: A MongoDB update object defining the updates to apply.
   *
   * @returns A promise that resolves to the updated document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Find a user by ID and update their status, returning the updated document
   * const updatedUser = await client.findByIdAndUpdate('User', {
   *   _id: '60d0fe4f5311236168a109ca',
   *   update: { $set: { isActive: false } },
   * });
   * if (updatedUser) {
   *   console.log('Updated user:', updatedUser);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  findByIdAndUpdate = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: UpdateIdDto<ModelMap[ModelName]>,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findByIdAndUpdate',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data) ?? null;
  };

  /**
   * Replaces a single document in the specified model that matches the given filter.
   *
   * @template ModelName - The name of the model to replace; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria and the replacement document.
   *   - `filter`: A MongoDB query filter specifying which document to replace.
   *   - `replace`: The new document that will replace the existing one.
   *
   * @returns A promise that resolves to an `UpdateResult` object containing information about the operation.
   *
   * @example
   * ```typescript
   * // Replacing a product document with new data
   * const result = await client.replaceOne('Product', {
   *   filter: { sku: 'ABC123' },
   *   replace: {
   *     sku: 'ABC123',
   *     name: 'New Product Name',
   *     price: 29.99,
   *     inStock: true,
   *   },
   * });
   * console.log('Number of documents matched:', result.matchedCount);
   * console.log('Number of documents modified:', result.modifiedCount);
   * ```
   */
  replaceOne = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: UpdateDto<ModelMap[ModelName]>,
  ): Promise<UpdateResult> => {
    const response = await this.axiosInstance.post(
      'database/replaceOne',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Finds a single document matching the filter, replaces it with a new document, and returns the replaced document.
   *
   * @template ModelName - The name of the model to replace; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria and the replacement document.
   *   - `filter`: A MongoDB query filter specifying which document to find and replace.
   *   - `replace`: The new document that will replace the existing one.
   *
   * @returns A promise that resolves to the replaced document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Find a product by SKU and replace it, returning the old document
   * const oldProduct = await client.findOneAndReplace('Product', {
   *   filter: { sku: 'ABC123' },
   *   replace: {
   *     sku: 'ABC123',
   *     name: 'Updated Product Name',
   *     price: 39.99,
   *     inStock: false,
   *   },
   * });
   * if (oldProduct) {
   *   console.log('Replaced product:', oldProduct);
   * } else {
   *   console.log('Product not found');
   * }
   * ```
   */
  findOneAndReplace = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: UpdateDto<ModelMap[ModelName]>,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findOneAndReplace',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data) ?? null;
  };

  // ██████╗ ███████╗██╗     ███████╗████████╗███████╗
  // ██╔══██╗██╔════╝██║     ██╔════╝╚══██╔══╝██╔════╝
  // ██║  ██║█████╗  ██║     █████╗     ██║   █████╗
  // ██║  ██║██╔══╝  ██║     ██╔══╝     ██║   ██╔══╝
  // ██████╔╝███████╗███████╗███████╗   ██║   ███████╗
  // ╚═════╝ ╚══════╝╚══════╝╚══════╝   ╚═╝   ╚══════╝

  /**
   * Deletes a single document in the specified model that matches the given filter criteria.
   *
   * @template ModelName - The name of the model from which to delete the document; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria.
   *   - `filter`: A MongoDB query filter specifying which document to delete.
   *
   * @returns A promise that resolves to a `DeleteResult` object containing information about the operation.
   *
   * @example
   * ```typescript
   * // Deleting a user with a specific username
   * const result = await client.deleteOne('User', {
   *   filter: { username: 'john_doe' },
   * });
   * console.log('Number of documents deleted:', result.deletedCount);
   * ```
   */
  deleteOne = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: FilterDto<ModelMap[ModelName]>,
  ): Promise<DeleteResult> => {
    const response = await this.axiosInstance.post(
      'database/deleteOne',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Deletes multiple documents in the specified model that match the given filter criteria.
   *
   * @template ModelName - The name of the model from which to delete the documents; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria.
   *   - `filter`: A MongoDB query filter specifying which documents to delete.
   *
   * @returns A promise that resolves to a `DeleteResult` object containing information about the operation.
   *
   * @example
   * ```typescript
   * // Deleting all inactive users
   * const result = await client.deleteMany('User', {
   *   filter: { isActive: false },
   * });
   * console.log('Number of documents deleted:', result.deletedCount);
   * ```
   */
  deleteMany = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: FilterDto<ModelMap[ModelName]>,
  ): Promise<DeleteResult> => {
    const response = await this.axiosInstance.post(
      'database/deleteMany',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data);
  };

  /**
   * Finds a single document matching the filter, deletes it, and returns the deleted document.
   *
   * @template ModelName - The name of the model from which to delete the document; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the filter criteria.
   *   - `filter`: A MongoDB query filter specifying which document to find and delete.
   *
   * @returns A promise that resolves to the deleted document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Find and delete a user by username, returning the deleted document
   * const deletedUser = await client.findOneAndDelete('User', {
   *   filter: { username: 'john_doe' },
   * });
   * if (deletedUser) {
   *   console.log('Deleted user:', deletedUser);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  findOneAndDelete = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: FilterDto<ModelMap[ModelName]>,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findOneAndDelete',
      payload,
      { params: { modelName } },
    );
    return this.deserialize(modelName, response.data) ?? null;
  };

  /**
   * Finds a document by its unique identifier, deletes it, and returns the deleted document.
   *
   * @template ModelName - The name of the model from which to delete the document; must be a key of `ModelMap`.
   *
   * @param modelName - The name of the model as defined in your `ModelMap`.
   * @param payload - An object containing the unique identifier of the document.
   *   - `_id`: The unique identifier (ObjectId) of the document to delete.
   *
   * @returns A promise that resolves to the deleted document of type `ModelMap[ModelName]`, or `null` if no document matches.
   *
   * @example
   * ```typescript
   * // Find and delete a user by ID, returning the deleted document
   * const deletedUser = await client.findByIdAndDelete('User', {
   *   _id: '60d0fe4f5311236168a109ca',
   * });
   * if (deletedUser) {
   *   console.log('Deleted user:', deletedUser);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
  findByIdAndDelete = async <ModelName extends keyof ModelMap>(
    modelName: ModelName,
    payload: ObjectIdDto,
  ): Promise<ModelMap[ModelName] | null> => {
    const response = await this.axiosInstance.post(
      'database/findByIdAndDelete',
      payload,
      { params: { modelName } },
    );
    return response.data ?? null;
  };
}
