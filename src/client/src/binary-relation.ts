import * as Immutable from "immutable";

export interface BinaryRelation<T, U> {
  areRelated(x: T, y: U): boolean;
  relate(x: T, y: U): BinaryRelation<T, U>;
  unrelate(x: T, y: U): BinaryRelation<T, U>;
  image(x: T): Immutable.Set<U>;
  preimage(y: U): Immutable.Set<T>;
}

export function empty<T, U>(): BinaryRelation<T, U> {
  function of(
    left: Immutable.Map<T, Immutable.Set<U>>,
    right: Immutable.Map<U, Immutable.Set<T>>,
  ): BinaryRelation<T, U> {
    function areRelated(x: T, y: U): boolean {
      return left.get(x)?.has(y) || false;
    }

    function relate(x: T, y: U): BinaryRelation<T, U> {
      return of(
        left.has(x) ? left.update(x, (ys) => ys.add(y)) : left.set(x, Immutable.Set([y])),
        right.has(y) ? right.update(y, (xs) => xs.add(x)) : right.set(y, Immutable.Set([x])),
      );
    }

    function unrelate(x: T, y: U): BinaryRelation<T, U> {
      return of(
        left.has(x) ? left.update(x, (ys) => ys.remove(y)) : left,
        right.has(y) ? right.update(y, (xs) => xs.remove(x)) : right,
      );
    }

    function image(x: T): Immutable.Set<U> {
      return left.get(x, Immutable.Set());
    }

    function preimage(y: U): Immutable.Set<T> {
      return right.get(y, Immutable.Set());
    }

    return {areRelated, relate, unrelate, image, preimage};
  }

  return of(Immutable.Map(), Immutable.Map());
}
