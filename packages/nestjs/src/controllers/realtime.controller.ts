import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import type { FilterQuery, Model, UpdateQuery } from 'mongoose';
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
import { IsArray, IsObject, IsString } from 'class-validator';
import { DeleteResult, UpdateResult } from 'mongodb';
import { PostMan } from '../decorators/postman.decorator';

class ObjectIdDto {
  @IsString()
  _id: string;
}

class FilterDto {
  @IsObject({ each: false })
  filter: FilterQuery<any>;
}

class DataSingleDto {
  @IsObject({ each: false })
  data: any;
}

class DataArrayDto {
  @IsArray()
  @IsObject({ each: true })
  data: any[];
}

class UpdateIdDto {
  @IsString()
  _id: string;

  @IsObject({ each: false })
  update: UpdateQuery<any>;
}

class UpdateDto {
  @IsObject({ each: false })
  filter: FilterQuery<any>;

  @IsObject({ each: false })
  update: UpdateQuery<any>;
}

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
  ) {
    const model = this.databaseService.getModelOrThrow(modelName);
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
  ) {
    const model = this.databaseService.getModelOrThrow(modelName);
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
  ) {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter },
      (model, filter) => model.find(filter, null).exec(),
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
  ) {
    return this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter },
      (model, filter) => model.find(filter, null).exec(),
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
  ) {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canRead', filter: { _id } },
      (model, filter) => model.findOne(filter).exec(),
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
      (model, filter) => model.updateOne(filter, update),
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
      (model, filter) => model.updateMany(filter, update),
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
  ) {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter },
      (model, filter) => model.findOneAndUpdate(filter, update, { new: true }),
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
  ) {
    const result = await this.handleDatabaseOperation(
      { req, modelName, operation: 'canUpdate', filter: { _id } },
      (model, filter) => model.findOneAndUpdate(filter, update, { new: true }),
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
  ) {
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
  ) {
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

  private getUser = (req: Request) => {
    return this.options.accessGuard?.extractUserRest?.(req) ?? null;
  };

  private verifyAccess = async (
    req: Request,
    model: Model<any>,
    operation: keyof RealtimeRuleGuard<any, any>,
  ) => {
    const user = this.getUser(req);
    const guard = await this.ruleService.invokeRules(
      model.modelName,
      user,
      operation,
    );

    if (typeof guard === 'boolean' && !guard) {
      throw new ForbiddenException();
    }

    if (typeof guard === 'object') {
      return new MongoQuery(guard);
    }
  };

  private executeOrThrow = async <F extends () => Promise<any>>(
    fn: F,
  ): Promise<Return<F>> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Error) {
        throw new BadRequestException(e.message);
      }
      throw new InternalServerErrorException();
    }
  };

  private mergeFilters = (first: FilterQuery<any>, second: MongoQuery) => {
    if (!first.$and) {
      first.$and = [];
    }

    first.$and.push((second as any).condition);

    return first;
  };
}
