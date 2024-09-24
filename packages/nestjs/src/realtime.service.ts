import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Connection, Document, FilterQuery, Model } from 'mongoose';
import { REALTIME_CONNECTION } from './realtime.constants';
import { Query as MongoQuery } from 'mingo';
import { RealtimeRuleGuard } from './realtime.types';
import { RuleService } from './services/rule.service';

@Injectable()
export class RealtimeService {
  constructor(
    @Inject(REALTIME_CONNECTION) private readonly mongoCon: Connection,
    private readonly ruleService: RuleService,
  ) {}

  getModel(modelName: string): Model<Record<string, any>> | undefined {
    return Object.values(this.mongoCon.models).find(
      (model) => model.modelName === modelName,
    );
  }

  getModelOrThrow(modelName: string): Model<Record<string, any>> {
    const model = this.getModel(modelName);

    if (!model) {
      throw new NotFoundException(`Model ${modelName} does not exist`);
    }

    return model;
  }

  /**
   * Merges the original filter query with the guard's filter conditions using a logical AND operation.
   *
   * @param originalFilter - The original MongoDB filter query.
   * @param guardFilter - The MongoQuery object representing the guard's filter conditions.
   *
   * @returns The combined filter query with both the original and guard conditions.
   */
  mergeFilters = (
    originalFilter: FilterQuery<Record<string, any>>,
    guardFilter: MongoQuery,
  ): FilterQuery<Record<string, any>> => {
    if (!originalFilter.$and) {
      originalFilter.$and = [];
    }

    originalFilter.$and.push((guardFilter as any).condition);

    return originalFilter;
  };

  /**
   * Verifies access permissions for the given operation on the model.
   *
   * @param user - The Provided user.
   * @param model - The Mongoose model on which the operation is to be performed.
   * @param operation - The access control operation to verify (e.g., 'canRead', 'canCreate').
   *
   * @returns A MongoQuery representing the guard's filter conditions or null if access is fully granted.
   *
   * @throws {ForbiddenException} - Thrown if access is explicitly denied by the guard.
   */
  verifyAccess = async (
    user: Record<string, any> | null,
    model: Model<Record<string, any>>,
    operation: keyof RealtimeRuleGuard<Record<string, any>, Document>,
  ): Promise<MongoQuery | null> => {
    let baseFilter: FilterQuery<Record<string, any>> | undefined;
    if (model.baseModelName) {
      const baseGuard = await this.ruleService.invokeRules(
        model.baseModelName,
        user,
        operation,
      );

      if (typeof baseGuard === 'boolean' && !baseGuard) {
        throw new ForbiddenException('Access denied by guard.');
      }

      if (typeof baseGuard === 'object') {
        baseFilter = baseGuard;
      }
    }

    const guard = await this.ruleService.invokeRules(
      model.modelName,
      user,
      operation,
    );

    if (typeof guard === 'boolean' && !guard) {
      throw new ForbiddenException('Access denied by guard.');
    }

    if (typeof guard === 'object') {
      if (baseFilter) {
        const mergedFilters = this.mergeFilters(
          baseFilter,
          new MongoQuery(guard),
        );
        return new MongoQuery(mergedFilters);
      }
      return new MongoQuery(guard);
    }

    if (baseFilter) {
      return new MongoQuery(baseFilter);
    }

    return null;
  };
}
