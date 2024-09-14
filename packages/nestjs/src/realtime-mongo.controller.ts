import { IsString } from "class-validator";
import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { FilterQuery } from "mongoose";
import { Request } from "express";
import { RealtimeMongoService } from "./realtime-mongo.service";
import { RealtimeMongoQuery } from "./realtime-mongo.query";

type Return<F> = F extends () => Promise<infer R> ? R : never;

class ObjectIdDto {
  @IsString()
  _id: string;
}

@Controller("database")
export class RealtimeMongoController {
  constructor(private readonly databaseService: RealtimeMongoService) {}

  @Post("findOne")
  async findOne(
    @Req() req: Request,
    @Query() query: RealtimeMongoQuery,
    @Body() body: FilterQuery<any>,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );
    const result = await this.executeOrThrow(() => model.findOne(body).exec());
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post("find")
  async find(
    @Req() req: Request,
    @Query() query: RealtimeMongoQuery,
    @Body() body: FilterQuery<any>,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );
    return this.executeOrThrow(() => model.find(body).exec());
  }

  @Post("findById")
  async findById(
    @Req() req: Request,
    @Query() query: RealtimeMongoQuery,
    @Body() body: ObjectIdDto,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );
    const result = await this.executeOrThrow(() =>
      model.findById(body._id).exec(),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post("insert")
  async insert(
    @Req() req: Request,
    @Query() query: RealtimeMongoQuery,
    @Body() body: any,
  ) {
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );
    return this.executeOrThrow(() => model.create(body));
  }

  @Post("insertMany")
  async insertMany(
    @Req() req: Request,
    @Query() query: RealtimeMongoQuery,
    @Body() body: any,
  ) {
    if (!Array.isArray(body)) {
      throw new BadRequestException("Body must be of type 'array'");
    }
    const model = this.databaseService.resolveModel(
      query.collection,
      query.discriminator,
    );
    return this.executeOrThrow(() => model.insertMany(body));
  }

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
}
