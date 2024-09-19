import {
  BadRequestException,
  Body,
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
  SetMetadata,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Document, FilterQuery, Model } from 'mongoose';
import { RealtimeService } from '../realtime.service';
import { RealtimeQuery } from '../dto/realtime.query';
import { RealtimeRuleGuard, Return } from '../realtime.types';
import {
  METADATA_REALTIME_CONTROLLER,
  REALTIME_OPTIONS,
} from '../realtime.constants';
import type { RealtimeMongoOptions } from '../realtime.options';
import { RuleService } from '../services/rule.service';
import { Request } from 'express';
import { Query as MongoQuery } from 'mingo';
import { validate } from 'class-validator';
import { DeleteResult, UpdateResult } from 'mongodb';
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

@Controller('database')
@SetMetadata(METADATA_REALTIME_CONTROLLER, true)
@UsePipes(ValidationPipe)
export class RealtimeController {
  constructor(
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeMongoOptions,
    private readonly databaseService: RealtimeService,
    private readonly ruleService: RuleService,
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

    const guardFilter = await this.verifyAccess(req, model, 'canCreate');

    if (guardFilter && !guardFilter.test(data)) {
      throw new ForbiddenException('Forbidden Document Values');
    }

    return this.executeOrThrow(() => model.create(data));
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

    const guardFilter = await this.verifyAccess(req, model, 'canCreate');

    if (guardFilter && !data.every((item) => guardFilter.test(item))) {
      throw new ForbiddenException('Forbidden Document Values');
    }

    return this.executeOrThrow(() => model.insertMany(data));
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
    body: { filter: {} },
  })
  async findOne(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter },
      (model, filter) => model.findOne(filter, null),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post('findMany')
  @PostMan<FilterDto>({
    name: 'Find Many',
    method: 'POST',
    folderName: 'Read',
    body: { filter: {} },
  })
  async findMany(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ): Promise<Record<string, any>[]> {
    return this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter },
      (model, filter) => model.find(filter, null),
    );
  }

  @Post('findById')
  @PostMan<ObjectIdDto>({
    name: 'Find By ID',
    method: 'POST',
    folderName: 'Read',
    body: { _id: '' },
  })
  async findById(
    @Req() req: Request,
    @Query() { modelName }: RealtimeQuery,
    @Body() { _id }: ObjectIdDto,
  ): Promise<Record<string, any>> {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter: { _id } },
      (model, filter) => model.findOne(filter),
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
        return model.findOneAndUpdate(filter, update, { new: true });
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
        return model.findOneAndUpdate(filter, update, { new: true });
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
        return model.replaceOne(filter, replace, { new: true });
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
        return model.findOneAndReplace(filter, replace, { new: true });
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
      (model, filter) => model.findOneAndDelete(filter),
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
      (model, filter) => model.findOneAndDelete(filter),
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
    const guardFilter = await this.verifyAccess(req, model, operation);

    if (guardFilter) {
      this.mergeFilters(filter, guardFilter);
    }

    return this.executeOrThrow(() => dbOperation(model, filter));
  }

  /**
   * Extracts the user from the HTTP request using the access guard's extraction method.
   *
   * @param req - The incoming HTTP request.
   *
   * @returns The user object extracted from the request or null if not available.
   */
  private getUser = (req: Request) => {
    return this.options.accessGuard?.extractUserRest?.(req) ?? null;
  };

  /**
   * Verifies access permissions for the given operation on the model.
   *
   * @param req - The incoming HTTP request.
   * @param model - The Mongoose model on which the operation is to be performed.
   * @param operation - The access control operation to verify (e.g., 'canRead', 'canCreate').
   *
   * @returns A MongoQuery representing the guard's filter conditions or null if access is fully granted.
   *
   * @throws {ForbiddenException} - Thrown if access is explicitly denied by the guard.
   */
  private verifyAccess = async (
    req: Request,
    model: Model<Record<string, any>>,
    operation: keyof RealtimeRuleGuard<Record<string, any>, Document>,
  ): Promise<MongoQuery | null> => {
    const user = this.getUser(req);
    const guard = await this.ruleService.invokeRules(
      model.modelName,
      user,
      operation,
    );

    if (typeof guard === 'boolean' && !guard) {
      throw new ForbiddenException('Access denied by guard.');
    }

    if (typeof guard === 'object') {
      return new MongoQuery(guard);
    }

    return null;
  };

  /**
   * Executes a function that returns a promise and handles any errors by throwing appropriate HTTP exceptions.
   *
   * @param fn - The asynchronous function to execute.
   *
   * @returns A promise that resolves with the result of the function.
   *
   * @throws {BadRequestException} - Thrown if the function throws an error with a message.
   * @throws {InternalServerErrorException} - Thrown for any unexpected errors without a message.
   */
  private executeOrThrow = async <F extends () => Promise<any>>(
    fn: F,
  ): Promise<Return<F>> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      if (e instanceof Error) {
        throw new BadRequestException(e.message);
      }
      throw new InternalServerErrorException('An unexpected error occurred.');
    }
  };

  /**
   * Merges the original filter query with the guard's filter conditions using a logical AND operation.
   *
   * @param originalFilter - The original MongoDB filter query.
   * @param guardFilter - The MongoQuery object representing the guard's filter conditions.
   *
   * @returns The combined filter query with both the original and guard conditions.
   */
  private mergeFilters = (
    originalFilter: FilterQuery<Record<string, any>>,
    guardFilter: MongoQuery,
  ): FilterQuery<Record<string, any>> => {
    if (!originalFilter.$and) {
      originalFilter.$and = [];
    }

    originalFilter.$and.push((guardFilter as any).condition);

    return originalFilter;
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
