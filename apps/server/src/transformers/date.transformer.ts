import { Transform } from "class-transformer";

export const TransformDate = () => Transform(({ value }) => new Date(value));
