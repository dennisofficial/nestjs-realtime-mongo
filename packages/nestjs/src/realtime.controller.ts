import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
  Req,
  SetMetadata,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { RealtimeService } from './realtime.service';
import { RealtimeQuery } from './dto/realtime.query';
import { RealtimeRuleGuard, Return } from './realtime.types';
import {
  ERealtimeError,
  METADATA_REALTIME_CONTROLLER,
  REALTIME_OPTIONS,
} from './realtime.constants';
import type { RealtimeMongoOptions } from './realtime.options';
import { RuleService } from './services/rule.service';
import { Request } from 'express';
import { Query as MongoQuery } from 'mingo';
import { IsArray, IsObject, IsString } from 'class-validator';

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

class UpdateSingleDto {
  @IsObject({ each: false })
  filter: FilterQuery<any>;

  @IsObject({ each: false })
  update: UpdateQuery<any>;
}

class UpdateMultipleDto {
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

  @Post('findOne')
  async findOne(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const guardFilter = await this.verifyAccess(req, model, 'canRead');

    const result = await this.executeOrThrow(() =>
      model.findOne(filter).exec(),
    );
    if (!result) throw new NotFoundException();

    if (guardFilter && !guardFilter.test(result)) {
      throw new ForbiddenException(ERealtimeError.RULE_FAILED);
    }

    return result;
  }

  @Post('find')
  async find(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { filter }: FilterDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const guardFilter = await this.verifyAccess(req, model, 'canRead');

    const results = await this.executeOrThrow(() => model.find(filter).exec());

    if (guardFilter) {
      return results.filter((r) => guardFilter.test(r));
    }

    return results;
  }

  @Post('findById')
  async findById(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { _id }: ObjectIdDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const guardFilter = await this.verifyAccess(req, model, 'canRead');

    const result = await this.executeOrThrow(() => model.findById(_id).exec());
    if (!result) throw new NotFoundException();

    if (guardFilter && !guardFilter.test(result)) {
      throw new ForbiddenException(ERealtimeError.RULE_FAILED);
    }

    return result;
  }

  @Post('insert')
  async insert(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { data }: DataSingleDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const guardFilter = await this.verifyAccess(req, model, 'canCreate');

    if (guardFilter && !guardFilter.test(data)) {
      throw new ForbiddenException(ERealtimeError.RULE_FAILED);
    }

    return this.executeOrThrow(() => model.create(data));
  }

  @Post('insertMany')
  async insertMany(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { data }: DataArrayDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const guardFilter = await this.verifyAccess(req, model, 'canCreate');

    if (guardFilter && !data.every((item) => guardFilter.test(item))) {
      throw new ForbiddenException(ERealtimeError.RULE_FAILED);
    }

    return this.executeOrThrow(() => model.insertMany(data));
  }

  @Post('findOneAndUpdate')
  async findOneAndUpdate(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { filter, update }: UpdateSingleDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const guardFilter = await this.verifyAccess(req, model, 'canUpdate');
    if (guardFilter) {
      this.mergeFilters(filter, guardFilter);
    }

    const result = await model.findOneAndUpdate(filter, update, { new: true });
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post('findByIdAndUpdate')
  async findByIdAndUpdate(
    @Req() req: Request,
    @Query() query: RealtimeQuery,
    @Body() { _id, update }: UpdateIdDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );

    const filter: FilterQuery<any> = { _id };
    const guardFilter = await this.verifyAccess(req, model, 'canUpdate');
    if (guardFilter) {
      this.mergeFilters(filter, guardFilter);
    }

    const result = await model.findOneAndUpdate(filter, update, { new: true });
    if (!result) throw new NotFoundException();
    return result;
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
      throw new ForbiddenException(ERealtimeError.RULE_FAILED);
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
