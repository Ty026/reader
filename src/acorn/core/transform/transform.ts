import type { MaybeFuture, NodeLike } from "../../schema/schema";
import { uuid } from "./uuid";

export interface TransformSignature<R extends MaybeFuture<NodeLike[]>> {
  <U extends Record<string, unknown>>(nodes: NodeLike[], options?: U): R;
}

export interface Transform<
  T extends MaybeFuture<NodeLike[]> = MaybeFuture<NodeLike[]>,
> extends TransformSignature<T> {
  id: string;
}

export class Transform<T extends MaybeFuture<NodeLike[]>> {
  constructor(transformFn: TransformSignature<T>) {
    Object.defineProperties(
      transformFn,
      Object.getOwnPropertyDescriptors(this.constructor.prototype),
    );
    const transform = function transform(
      ...args: Parameters<TransformSignature<T>>
    ) {
      return transformFn(...args);
    };
    Reflect.setPrototypeOf(transform, new.target.prototype);
    transform.id = uuid();
    return transform;
  }
}
