import { Type } from '@nestjs/common';
import type { Request } from 'express';
import type { Socket } from 'socket.io';
import { ValidationPipeOptions } from '@nestjs/common/pipes/validation.pipe';

export interface RealtimeMongoOptions<
  User extends Record<string, any> | undefined = any,
> {
  /**
   * The connection token used by `@nestjs/mongoose` to identify the database connection.
   *
   * **Purpose**:
   * Specifies the connection token that the module should use to access the Mongoose database connection.
   * This is necessary when you have multiple database connections or have customized the connection token
   * in your NestJS application.
   *
   * **Default**:
   * If not provided, the module uses the default connection token from `@nestjs/mongoose`:
   * ```typescript
   * require('@nestjs/mongoose').getConnectionToken()
   * ```
   *
   * **Usage**:
   * - Provide this option if you have a custom connection token or are using multiple connections.
   * - Ensures that the module interacts with the correct Mongoose connection instance.
   *
   * **Example**:
   * ```typescript
   * connectionToken: 'CustomConnectionToken',
   * ```
   *
   * **Notes**:
   * - The connection token should match the one used in your application's Mongoose module configuration.
   * - Incorrect configuration may lead to issues with database connectivity within the module.
   */
  connectionToken?: string;
  /**
   * Enables the WebSocket Gateway for real-time data communication with client devices.
   *
   * **Purpose**:
   * When set to `true`, the module initializes a WebSocket Gateway using `@nestjs/websockets`.
   * This allows client devices to receive real-time updates and data pushed from the server.
   *
   * **Default**: `false`
   *
   * **Usage**:
   * - Set this option to `true` if you want to enable real-time communication with clients via WebSockets.
   * - Useful for applications that require live data updates, notifications, or collaborative features.
   *
   * **Example**:
   * ```typescript
   * enableWebsocket: true,
   * ```
   *
   * **Notes**:
   * - Ensure that your application has the necessary setup for WebSocket communication.
   * - You may need to configure WebSocket adapters or handle authentication for WebSocket connections separately.
   * - If not enabled, clients will not be able to connect via WebSockets for real-time data.
   */
  enableWebsocket?: boolean;
  /**
   * Enables the REST API Controller for client devices to access the database via HTTP endpoints.
   *
   * **Purpose**:
   * When set to `true`, the module registers a `@Controller` that exposes RESTful API endpoints.
   * This allows client devices to interact with the database using standard HTTP methods (GET, POST, PUT, DELETE).
   *
   * **Default**: `false`
   *
   * **Usage**:
   * - Set this option to `true` to make the database accessible through REST API endpoints.
   * - Ideal for applications that require CRUD operations over HTTP.
   *
   * **Example**:
   * ```typescript
   * enableRestApi: true,
   * ```
   *
   * **Notes**:
   * - Ensure that appropriate authentication and authorization mechanisms are in place to secure the REST API.
   * - If not enabled, clients will not be able to interact with the database via REST API endpoints.
   * - Combining this option with the `postman` configuration can help generate API documentation and testing collections.
   */
  enableRestApi?: boolean;
  /**
   * Configuration for generating a Postman collection of the database REST API endpoints.
   *
   * **Purpose**:
   * The `postman` option allows developers to generate a Postman collection that can be imported into Postman
   * for testing and interacting with the REST API endpoints provided by the module. This is particularly useful
   * during development for testing and debugging purposes.
   *
   * **Properties**:
   * - `enabled` (boolean): Determines whether the Postman collection generation endpoint is enabled.
   * - `collectionName` (string, optional): Specifies the name of the Postman collection. If not provided, a default name will be used.
   *
   * **Endpoint**:
   * When enabled, the module exposes an endpoint to download the Postman collection:
   * ```
   * http://localhost:4000/database/postman
   * ```
   * Replace `localhost:4000` with your application's host and port if different.
   *
   * **Usage**:
   * Configure the `postman` option in the `RealtimeModule.forRoot` method. Typically, you might enable this feature
   * only in development environments.
   *
   * **Example**:
   * ```typescript
   * RealtimeModule.forRoot({
   *   enableRestApi: true,
   *   postman: {
   *     enabled: process.env.NODE_ENV === 'development', // Enable in development environment
   *     collectionName: 'Testing Database', // Optional custom collection name
   *   },
   * }),
   * ```
   *
   * **Notes**:
   * - **Rest API Dependency**: While it is not required to set `enableRestApi` to `true` for the Postman collection generation to work, the generated collection will only be useful if the REST API endpoints are available. If `enableRestApi` is `false`, the endpoints in the collection will not be accessible.
   * - **Development Use**: This feature is intended primarily for development and testing purposes. It is recommended to disable it in production environments to prevent unnecessary exposure of API details.
   * - **Security Considerations**: Ensure that enabling this feature does not expose sensitive information. The generated collection includes the endpoints and may include example payloads or parameters.
   *
   * **Importing into Postman**:
   * - Access the Postman collection endpoint provided by the module.
   * - Download the JSON file.
   * - In Postman, use the "Import" feature to import the collection.
   * - You can now use the imported collection to test the REST API endpoints.
   *
   * **Customizing the Collection**:
   * - The `collectionName` property allows you to specify a custom name for the collection, making it easier to identify in Postman.
   * - If you need further customization, consider extending the module or generating your own collection manually.
   */
  postman?: {
    /**
     * Determines whether the Postman collection generation endpoint is enabled.
     *
     * - **true**: The module will expose an endpoint to generate and download a Postman collection of the REST API endpoints.
     * - **false**: The endpoint will not be available.
     *
     * **Usage**:
     * Set this to `true` during development to facilitate testing and interaction with the API via Postman.
     * It is recommended to set this to `false` in production environments.
     */
    enabled: boolean;
    /**
     * Specifies the name of the Postman collection to be generated.
     *
     * - If provided, this name will be used as the collection name when importing into Postman.
     * - If not specified, a default name (e.g., "Realtime API Collection") will be used.
     *
     * **Usage**:
     * Customize this to make the collection easily identifiable in Postman, especially if you are working with multiple collections.
     *
     * **Example**:
     * ```typescript
     * collectionName: 'My App API',
     * ```
     */
    collectionName?: string;
  };
  /**
   * Configuration for extracting user context from REST requests and WebSocket connections.
   *
   * **Purpose**:
   * The `accessGuard` provides functions that the module uses to extract the user context from incoming REST requests and WebSocket handshakes. This user context is then utilized internally by the module for access control and authorization purposes.
   *
   * **Properties**:
   * - `extractUserRest`: Function to extract the user from an HTTP REST request.
   * - `extractUserWS`: Function to extract the user from a WebSocket handshake.
   *
   * **Usage**:
   * Implement these functions to return the user object associated with the request or socket connection. The module relies on this user object to enforce access control rules defined elsewhere in your application.
   *
   * **Notes**:
   * - The actual authentication and authorization logic (e.g., verifying tokens, applying guards) should be implemented separately using NestJS guards or middleware.
   * - These functions should simply retrieve the user information that has been attached to the request or socket by your authentication mechanisms.
   * - If these functions are not provided, the module may not have access to user information, which could affect access control decisions.
   *
   * **Example**:
   * ```typescript
   * accessGuard: {
   *   // Extracts the user from a REST request, assuming authentication middleware has attached it
   *   extractUserRest: (req: Request) => {
   *     return req.user as User;
   *   },
   *   // Extracts the user from a WebSocket handshake, assuming the user has been attached during the handshake
   *   extractUserWS: (socket: Readonly<Socket>) => {
   *     return socket.data.user as User;
   *   },
   * },
   * ```
   *
   * **Integration with NestJS Guards**:
   * - For REST API endpoints, use NestJS's `APP_GUARD` to apply global guards that authenticate and authorize requests before they reach the module's controllers.
   * - For WebSocket connections, provide `REALTIME_GUARD` in your application to guard the socket handshake.
   * - These guards should authenticate the user and attach the user object to the request (`req.user`) or socket (`socket.data.user`), which can then be accessed by `extractUserRest` and `extractUserWS`.
   *
   * **Security Considerations**:
   * - Ensure that your authentication mechanisms securely authenticate users and correctly attach the user object.
   * - The module itself does not perform authentication; it relies on the user context provided by these functions.
   *
   * **Reference**:
   * For more information on securing your application using NestJS guards and custom adapters, refer to the NestJS documentation and the examples provided in the README.
   */
  accessGuard?: {
    /**
     * Function to extract the user context from an HTTP REST request.
     *
     * @param req - The incoming HTTP request.
     * @returns The user object or a promise that resolves to the user object; `null` or `undefined` if unauthenticated.
     */
    extractUserRest?: (req: Request) => User | Promise<User>;
    /**
     * Function to extract the user context from a WebSocket handshake.
     *
     * @param socket - The WebSocket connection socket.
     * @returns The user object or a promise that resolves to the user object; `null` or `undefined` if unauthenticated.
     */
    extractUserWS?: (socket: Readonly<Socket>) => User | Promise<User>;
  };
  /**
   * Configuration for validating incoming data during Create and Update operations.
   *
   * **Purpose**:
   * The `validation` object allows you to enable and configure data validation within the module.
   * It leverages `class-validator` and NestJS's `ValidationPipe` to ensure that incoming data
   * adheres to defined rules and structures before being processed or saved to the database.
   *
   * **Components**:
   * - `classValidators`: A mapping between model names and their corresponding DTO classes used for validation.
   * - `validationOptions`: Options to customize the behavior of the `ValidationPipe` during validation.
   *
   * **Usage**:
   * By providing DTO classes in `classValidators`, you enable validation for specific models.
   * The `validationOptions` allow you to fine-tune how validation is performed, such as enabling transformation,
   * whitelisting properties, and configuring error handling.
   *
   * **Example Configuration**:
   * ```typescript
   * validation: {
   *   classValidators: {
   *     [UserModel.name]: UserDto,
   *     [ProductModel.name]: ProductDto,
   *   },
   *   validationOptions: {
   *     transform: true,
   *     whitelist: true,
   *     forbidNonWhitelisted: true,
   *   },
   * },
   * ```
   *
   * **Notes**:
   * - **Optional Configuration**: The `validation` object is optional. If not provided, validation will not be applied to incoming data.
   * - **Security Enhancement**: Enabling validation helps prevent invalid or malicious data from entering your system, enhancing security and data integrity.
   * - **Model Alignment**: Ensure that your DTO classes accurately reflect the structure and constraints of your Mongoose models.
   * - **Partial Validation on Updates**: During Update operations, the module uses a partial version of the DTO class to validate only the provided fields.
   * - **Disabling Validation for Specific Models**: Assign `null` to a model in `classValidators` to disable validation for that model.
   *
   * **References**:
   * - **Class Validator Documentation**: [class-validator](https://github.com/typestack/class-validator)
   * - **NestJS ValidationPipe Options**: [ValidationPipe](https://docs.nestjs.com/techniques/validation#using-the-built-in-validationpipe)
   *
   * **Tips**:
   * - **Transform Payloads**: Enabling `transform` in `validationOptions` converts plain objects into instances of the DTO classes.
   * - **Whitelist Properties**: Setting `whitelist: true` strips properties that do not have any decorators in the DTO, preventing unexpected data.
   * - **Strict Validation**: Using `forbidNonWhitelisted: true` throws an error if non-whitelisted properties are present, enforcing strict data contracts.
   */
  validation?: {
    /**
     * A mapping between model names and their corresponding `class-validator` DTO classes for input validation.
     * This map supports discriminators as well.
     *
     * The `classValidators` map is utilized during Create and Update operations in the REST API to validate the incoming data.
     *
     * - **Create Operations**: Uses the full DTO class to validate all required fields of the data.
     * - **Update Operations**: Uses a `PartialType` of the DTO class, making all fields optional to validate only the provided data.
     *
     * **Keys**:
     * The keys in this map should be the names of the model schemas, typically accessed via the `name` property of your Mongoose models.
     *
     * **Example of Model Registration**:
     * ```typescript
     * MongooseModule.forFeature([
     *   {
     *     name: UserModel.name,
     *     schema: UserSchema,
     *     discriminators: [
     *       { value: 'Admin', name: AdminUserModel.name, schema: AdminUserSchema },
     *     ],
     *   },
     * ]);
     * ```
     *
     * **Example of `classValidators` Map**:
     * ```typescript
     * {
     *   [UserModel.name]: UserDto,
     *   [AdminUserModel.name]: AdminUserDto,
     * }
     * ```
     *
     * **Disabling Validation for Specific Models**:
     * If a particular model does not require validation, assign `null` to its key to disable validation and suppress warnings.
     *
     * **Example**:
     * ```typescript
     * {
     *   [UserModel.name]: UserDto,
     *   [ProductModel.name]: null, // Validation is disabled for ProductModel
     * }
     * ```
     *
     * **Notes**:
     * - Ensure that each DTO class accurately reflects the structure of its corresponding model to maintain data integrity.
     * - The validation process enhances security by ensuring that only properly formatted data is processed.
     */
    classValidators: Record<string, Type | null>;
    /**
     * Configuration options for the `ValidationPipe` used during data validation with `class-validator`.
     *
     * The `validationOptions` property allows you to customize the behavior of the `ValidationPipe` when validating
     * incoming data in Create and Update operations via the REST API. These options are directly passed to the
     * `ValidationPipe` constructor and influence how validation is performed.
     *
     * **Purpose**:
     * - To modify default validation settings according to your application's requirements.
     * - To control aspects such as transformation, whitelisting, error messaging, and more.
     *
     * **Common Options**:
     * - `transform` (boolean): Automatically transform payloads to be objects typed according to their DTO classes.
     * - `whitelist` (boolean): Strip properties that do not have any decorators in the DTO classes.
     * - `forbidNonWhitelisted` (boolean): Raise an error if non-whitelisted properties are present in the payload.
     * - `validationError` (object): Customize the shape of the validation errors.
     *
     * **Example Usage**:
     * ```typescript
     * validationOptions: {
     *   // Automatically transform payloads to DTO instances
     *   transform: true,
     *   // Strip properties that are not defined in the DTO classes
     *   whitelist: true,
     *   // Throw an error if non-whitelisted properties are present
     *   forbidNonWhitelisted: true,
     *   // Customize error messages
     *   validationError: {
     *     target: false,
     *     value: false,
     *   },
     * },
     * ```
     *
     * **Usage in Library Configuration**:
     * When configuring your library, you can provide `validationOptions` to tailor the validation behavior:
     * ```typescript
     * RealtimeModule.forRoot({
     *   validation: {
     *     classValidators: {
     *       [UserModel.name]: UserDto,
     *       [ProductModel.name]: ProductDto,
     *     },
     *     validationOptions: {
     *       transform: true,
     *       whitelist: true,
     *       forbidNonWhitelisted: true,
     *     },
     *   },
     * });
     * ```
     *
     * **Reference**:
     * For a full list of available options and their descriptions, refer to the NestJS documentation on `ValidationPipeOptions`:
     * https://docs.nestjs.com/techniques/validation#using-the-built-in-validationpipe
     *
     * **Notes**:
     * - Providing `validationOptions` is optional. If not specified, the `ValidationPipe` will use its default settings.
     * - Adjusting `validationOptions` can enhance security by ensuring strict validation rules are enforced.
     * - Be cautious with settings like `transform` as they can impact how incoming data is handled.
     */
    validationOptions?: ValidationPipeOptions;
  };
}
