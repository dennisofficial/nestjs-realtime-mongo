import { METADATA_POSTMAN_OPTIONS } from '../realtime.constants';

export interface PostManOptions<
  DTO extends Record<string, any> = Record<string, any>,
> {
  name: string;
  method: 'POST' | 'GET' | 'DELETE' | 'PATCH' | 'PUT';
  folderName: 'Create' | 'Read' | 'Update' | 'Delete' | 'Replace';
  body: DTO;
  endpoint: string;
}

export const PostMan = <DTO extends Record<string, any>>(
  routeOptions: Omit<PostManOptions<DTO>, 'endpoint'>,
): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    if (typeof target?.constructor === 'function') {
      const options =
        Reflect.getMetadata(METADATA_POSTMAN_OPTIONS, target.constructor) ?? {};

      options[propertyKey] = {
        ...routeOptions,
        endpoint: String(propertyKey),
      } satisfies PostManOptions;

      Reflect.defineMetadata(
        METADATA_POSTMAN_OPTIONS,
        options,
        target.constructor,
      );
    }
  };
};
