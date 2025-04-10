import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  HttpException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Patch,
  Post,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
  SetMetadata,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { RealtimeService } from '../realtime.service';
import { RealtimeQuery } from '../dto/realtime.query';
import { RealtimeRuleGuard, Return } from '../realtime.types';
import {
  METADATA_REALTIME_CONTROLLER,
  REALTIME_OPTIONS,
} from '../realtime.constants';
import type { RealtimeMongoOptions } from '../realtime.options';
import { Request } from 'express';
import { validate } from 'class-validator';
import { DeleteResult, MongoError, UpdateResult } from 'mongodb';
import { PostMan } from '../decorators/postman.decorator';
import { plainToInstance } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  DataArrayDto,
  DataSingleDto,
  FilterDto,
  ObjectIdDto,
  ReplaceDto,
  UpdateDto,
  UpdateIdDto,
} from '../dto/controller.dto';
import { RealtimeEncoderInterceptor } from '../realtime-encoder.interceptor';
import { Query as MongoQuery } from 'mingo';

@Controller('database')
@SetMetadata(METADATA_REALTIME_CONTROLLER, true)
@UsePipes(ValidationPipe)
@UseInterceptors(RealtimeEncoderInterceptor)
export class RealtimeController {
  constructor(
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeMongoOptions,
    private readonly databaseService: RealtimeService,
    private readonly realtimeService: RealtimeService,
  ) {}

  //  ██████╗██████╗ ███████╗ █████╗ ████████╗███████╗
  // ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
  // ██║     ██████╔╝█████╗  ███████║   ██║   █████╗
  // ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
  // ╚██████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
  //  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝

  @Put('insertOne')
  @PostMan<DataSingleDto>({
    name: 'Insert One',
    method: 'PUT',
    folderName: 'Create',
    body: { data: {} },
  })
  async insertOne(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { data }: DataSingleDto,
  ): Promise<Record<string, any>> {
    const model = this.databaseService.getModelOrThrow(modelName);

    await this.validateOrThrow(model, 'full', data);

    const user = this.getUser(req);
    const guardFilter = await this.realtimeService.modifyUserFilter(
      {},
      user,
      model,
      'canCreate',
    );

    const mingoFilter = new MongoQuery(guardFilter);
    if (!mingoFilter.test(data)) {
      throw new ForbiddenException('Forbidden Document Values');
    }

    const result = await this.executeOrThrow(() => model.create(data));
    return result.toJSON();
  }

  @Put('insertMany')
  @PostMan<DataArrayDto>({
    name: 'Insert Many',
    method: 'PUT',
    folderName: 'Create',
    body: { data: [] },
  })
  async insertMany(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { data }: DataArrayDto,
  ): Promise<Record<string, any>[]> {
    const model = this.databaseService.getModelOrThrow(modelName);

    await this.validateOrThrow(model, 'full', data);

    const user = this.getUser(req);
    const guardFilter = await this.realtimeService.modifyUserFilter(
      {},
      user,
      model,
      'canCreate',
    );

    const mingoFilter = new MongoQuery(guardFilter);
    if (!data.every((item) => mingoFilter.test(item))) {
      throw new ForbiddenException('Forbidden Document Values');
    }

    const result = await this.executeOrThrow(() => model.insertMany(data));
    return result.map((item) => item.toJSON());
  }

  // ██████╗ ███████╗ █████╗ ██████╗
  // ██╔══██╗██╔════╝██╔══██╗██╔══██╗
  // ██████╔╝█████╗  ███████║██║  ██║
  // ██╔══██╗██╔══╝  ██╔══██║██║  ██║
  // ██║  ██║███████╗██║  ██║██████╔╝
  // ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝

  @Post('findOne')
  @PostMan<FilterDto>({
    name: 'Find One',
    method: 'POST',
    folderName: 'Read',
    body: { filter: {}, projection: {} },
  })
  async findOne(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, projection }: FilterDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter },
      (model, filter) => model.findOne(filter, projection, { lean: true }),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post('findMany')
  @PostMan<FilterDto>({
    name: 'Find Many',
    method: 'POST',
    folderName: 'Read',
    body: { filter: {}, projection: {} },
  })
  async findMany(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, projection }: FilterDto,
  ): Promise<Record<string, any>[]> {
    return this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter },
      (model, filter) => model.find(filter, projection, { lean: true }),
    );
  }

  @Post('findById')
  @PostMan<ObjectIdDto>({
    name: 'Find By ID',
    method: 'POST',
    folderName: 'Read',
    body: { _id: '', projection: {} },
  })
  async findById(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { _id, projection }: ObjectIdDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter: { _id } },
      (model, filter) => model.findOne(filter, projection, { lean: true }),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  // ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
  // ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
  // ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗
  // ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝
  // ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
  //  ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

  @Patch('updateOne')
  @PostMan<UpdateDto>({
    name: 'Update One',
    method: 'PATCH',
    folderName: 'Update',
    body: { filter: {}, update: {} },
  })
  async updateOne(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, update }: UpdateDto,
  ): Promise<UpdateResult> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter },
      async (model, filter) => {
        await this.validateOrThrow(model, 'partial', update);
        return model.updateOne(filter, update);
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Patch('updateMany')
  @PostMan<UpdateDto>({
    name: 'Update Many',
    method: 'PATCH',
    folderName: 'Update',
    body: { filter: {}, update: {} },
  })
  async updateMany(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, update }: UpdateDto,
  ): Promise<UpdateResult> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter },
      async (model, filter) => {
        await this.validateOrThrow(model, 'partial', update);
        return model.updateMany(filter, update);
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Patch('findOneAndUpdate')
  @PostMan<UpdateDto>({
    name: 'Find One and Update',
    method: 'PATCH',
    folderName: 'Update',
    body: { filter: {}, update: {} },
  })
  async findOneAndUpdate(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, update }: UpdateDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter },
      async (model, filter) => {
        await this.validateOrThrow(model, 'partial', update);
        return model.findOneAndUpdate(filter, update, {
          new: true,
          lean: true,
        });
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Patch('findByIdAndUpdate')
  @PostMan<UpdateIdDto>({
    name: 'Find By ID and Update',
    method: 'PATCH',
    folderName: 'Update',
    body: { _id: '', update: {} },
  })
  async findByIdAndUpdate(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { _id, update }: UpdateIdDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter: { _id } },
      async (model, filter) => {
        await this.validateOrThrow(model, 'partial', update);
        return model.findOneAndUpdate(filter, update, {
          new: true,
          lean: true,
        });
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Patch('replaceOne')
  @PostMan<ReplaceDto>({
    name: 'Replace One',
    method: 'PATCH',
    folderName: 'Replace',
    body: { filter: {}, replace: {} },
  })
  async replaceOne(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, replace }: ReplaceDto,
  ): Promise<UpdateResult> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter },
      async (model, filter) => {
        await this.validateOrThrow(model, 'partial', replace);
        return model.replaceOne(filter, replace, { new: true, lean: true });
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Patch('findOneAndReplace')
  @PostMan<ReplaceDto>({
    name: 'Find One and Replace',
    method: 'PATCH',
    folderName: 'Replace',
    body: { filter: {}, replace: {} },
  })
  async findOneAndReplace(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter, replace }: ReplaceDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter },
      async (model, filter) => {
        await this.validateOrThrow(model, 'partial', replace);
        return model.findOneAndReplace(filter, replace, {
          new: true,
          lean: true,
        });
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  // ██████╗ ███████╗██╗     ███████╗████████╗███████╗
  // ██╔══██╗██╔════╝██║     ██╔════╝╚══██╔══╝██╔════╝
  // ██║  ██║█████╗  ██║     █████╗     ██║   █████╗
  // ██║  ██║██╔══╝  ██║     ██╔══╝     ██║   ██╔══╝
  // ██████╔╝███████╗███████╗███████╗   ██║   ███████╗
  // ╚═════╝ ╚══════╝╚══════╝╚══════╝   ╚═╝   ╚══════╝

  @Delete('deleteOne')
  @PostMan<FilterDto>({
    name: 'Delete One',
    method: 'DELETE',
    folderName: 'Delete',
    body: { filter: {} },
  })
  async deleteOne(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ): Promise<DeleteResult> {
    return this.handleDatabaseOperation(
      { req, modelName, operation: 'canDelete', filter },
      (model, filter) => model.deleteOne(filter),
    );
  }

  @Delete('deleteMany')
  @PostMan<FilterDto>({
    name: 'Delete Many',
    method: 'DELETE',
    folderName: 'Delete',
    body: { filter: {} },
  })
  async deleteMany(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ): Promise<DeleteResult> {
    return this.handleDatabaseOperation(
      { req, modelName, operation: 'canDelete', filter },
      (model, filter) => model.deleteMany(filter),
    );
  }

  @Delete('findOneAndDelete')
  @PostMan<FilterDto>({
    name: 'Find One and Delete',
    method: 'DELETE',
    folderName: 'Delete',
    body: { filter: {} },
  })
  async findOneAndDelete(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canDelete', filter },
      (model, filter) => model.findOneAndDelete(filter, { lean: true }),
    );

    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete('findByIdAndDelete')
  @PostMan<ObjectIdDto>({
    name: 'Find By ID and Delete',
    method: 'DELETE',
    folderName: 'Delete',
    body: { _id: '' },
  })
  async findByIdAndDelete(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { _id }: ObjectIdDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canDelete', filter: { _id } },
      (model, filter) => model.findOneAndDelete(filter, { lean: true }),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  // ██╗   ██╗████████╗██╗██╗     ███████╗
  // ██║   ██║╚══██╔══╝██║██║     ██╔════╝
  // ██║   ██║   ██║   ██║██║     ███████╗
  // ██║   ██║   ██║   ██║██║     ╚════██║
  // ╚██████╔╝   ██║   ██║███████╗███████║
  //  ╚═════╝    ╚═╝   ╚═╝╚══════╝╚══════╝

  /**
   * Handles common database operations with access control and error handling.
   *
   * @template T - The type of the result returned by the database operation.
   *
   * @param params - The parameters required for the database operation.
   * @param params.req - The incoming HTTP request.
   * @param params.modelName - The name of the Mongoose model to operate on.
   * @param params.operation - The access control operation to verify (e.g., 'canRead', 'canUpdate').
   * @param params.filter - The MongoDB filter query for the operation.
   * @param dbOperation - The database operation function to execute.
   *
   * @returns A promise that resolves with the result of the database operation.
   *
   * @throws {ForbiddenException} - Thrown if access is denied by the guard.
   * @throws {BadRequestException} - Thrown if the database operation encounters an error.
   * @throws {InternalServerErrorException} - Thrown for any unexpected errors.
   */
  private async handleDatabaseOperation<T>(
    {
      req,
      modelName,
      operation,
      filter,
    }: {
      req: Request;
      modelName: string;
      operation: keyof RealtimeRuleGuard<any, any>;
      filter: FilterQuery<any>;
    },
    dbOperation: (model: Model<any>, filter: FilterQuery<any>) => Promise<T>,
  ): Promise<T> {
    const model = this.databaseService.getModelOrThrow(modelName);
    const user = this.getUser(req);
    const guardFilter = await this.realtimeService.modifyUserFilter(
      filter,
      user,
      model,
      operation,
    );

    return this.executeOrThrow(() => dbOperation(model, guardFilter));
  }

  /**
   * Extracts the user from the HTTP request using the access guard's extraction method.
   *
   * @param req - The incoming HTTP request.
   *
   * @returns The user object extracted from the request or null if not available.
   */
  private getUser = (req: Request): Record<string, any> | null => {
    return this.options.accessGuard?.extractUserRest?.(req) ?? null;
  };

  /**
   * Executes a function that returns a promise and handles any errors by throwing appropriate HTTP exceptions.
   *
   * @param fn - The asynchronous function to execute.
   *
   * @returns A promise that resolves with the result of the function.
   *
   * @throws {BadRequestException} - Thrown if a validation or cast error occurs.
   * @throws {ConflictException} - Thrown if a duplicate key error occurs (e.g., unique constraint violation).
   * @throws {NotFoundException} - Thrown if a document is not found when it should exist.
   * @throws {ServiceUnavailableException} - Thrown if there is a database connection error.
   * @throws {InternalServerErrorException} - Thrown for any unexpected server errors.
   */
  private executeOrThrow = async <F extends () => Promise<any>>(
    fn: F,
  ): Promise<Return<F>> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof HttpException) {
        throw e; // Re-throw existing HTTP exceptions
      }

      // Handle Mongoose validation errors
      if (e instanceof mongoose.Error.ValidationError) {
        throw new BadRequestException(e.message);
      }

      // Handle duplicate key errors (e.g., unique constraint violations)
      if (e instanceof MongoError && e.code === 11000) {
        // Duplicate key error code is 11000
        throw new ConflictException(
          'Duplicate key error: A record with this value already exists.',
        );
      }

      // Handle Mongoose cast errors (e.g., invalid ObjectId)
      if (e instanceof mongoose.Error.CastError) {
        throw new BadRequestException(
          `Invalid value for ${e.path}: ${e.value}`,
        );
      }

      // Handle Mongoose document not found errors
      if (e instanceof mongoose.Error.DocumentNotFoundError) {
        throw new NotFoundException(e.message);
      }

      // Handle MongoDB connection errors
      if (
        e instanceof MongoError &&
        e.message.match(/failed to connect to server .* on first connect/)
      ) {
        throw new ServiceUnavailableException('Database connection error.');
      }

      // For other types of errors, throw Internal Server Error
      if (e instanceof Error) {
        throw new InternalServerErrorException(e.message);
      }

      // If the error is not recognized, throw a generic Internal Server Error
      throw new InternalServerErrorException('An unexpected error occurred.');
    }
  };

  private validateOrThrow = async (
    model: Model<Record<string, any>>,
    validateType: 'full' | 'partial',
    data: Record<string, any>,
  ): Promise<void> => {
    const clazz = this.options.validation?.classValidators[model.modelName];
    if (!clazz) return;

    const instanceClass =
      validateType === 'full' ? clazz : class extends PartialType(clazz) {};

    const validateOptions = this.options.validation?.validationOptions;

    const validator = new ValidationPipe(validateOptions);

    const errors = await validate(
      plainToInstance(instanceClass, data),
      validateOptions,
    );

    if (errors.length) {
      throw validator.createExceptionFactory()(errors);
    }
  };
}
