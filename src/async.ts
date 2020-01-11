/**
 * A possibly-async function that runs a callback or returns a promise.
 */
export type MaybeAsync =
  | ((callback: (err?: Error | null) => void) => void)
  | (() => Promise<void> | void);

export interface IDeferred<T = void> {
  resolve(value: T): void;
  reject(err: Error): void;
}

const noop = () => {};

export const returnsPromiseLike = (fn: MaybeAsync): fn is () => Promise<void> => {
  try {
    return typeof (fn(noop) as undefined | Promise<void>)?.then === 'function';
  } catch {
    return false;
  }
};

/**
 * Runs a possibly async function and returns a promise when it completes.
 */
export const runMaybeAsync = (fn: MaybeAsync) =>
  new Promise<void>((resolve, reject) => {
    if (fn.length === 0) {
      resolve(fn(noop));
    } else {
      fn(err => (err ? reject(err) : resolve()));
    }
  });
