export function arrayEq<T>(a: T[], b: T[], eq?: (x: T, y: T) => boolean): boolean {
  const eq_ = eq ?? ((x, y) => x === y);
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++)
    if (!eq_(a[i], b[i]))
      return false;
  return true;
}

export function toggleList<T>(a: T[], x: T): T[] {
  if (a.includes(x)) {
    return a.filter(y => y !== x);
  } else {
    return [...a, x];
  }
}

// A variant of splice that returns a new array rather than modifying its input.
export function splice<T>(a: T[], start: number, deleteCount?: number): T[];
export function splice<T>(a: T[], start: number, deleteCount: number, ...items: T[]): T[];
export function splice<T>(a, start, deleteCount?: number, ...items: T[]): T[] {
  const result = [...a];
  if (deleteCount !== undefined) {
    result.splice(start, deleteCount, ...items);
  } else {
    result.splice(start);
  }
  return result;
}

export function includesBy<T>(a: T[], x: T, eq?: (x: T, y: T) => boolean): boolean {
  const eq_ = eq ?? ((x, y) => x === y);
  for (const y of a)
    if (eq_(x, y))
      return true;
  return false;
}

export function indexOfBy<T>(a: T[], x: T, eq?: (x: T, y: T) => boolean): number | undefined {
  const eq_ = eq ?? ((x, y) => x === y);
  for (let i = 0; i < a.length; ++i)
    if (eq_(a[i], x))
      return i;
  return undefined;
}

export function removeKey<V>(o: {[x: string]: V}, k: string): {[x: string]: V} {
  const result = {...o};
  delete result[k];
  return result;
}
