import { Benchmark } from './reporters';
import { MaybeAsync, IDeferred, runMaybeAsync } from './async';

export interface IOptions {
  readonly defer?: boolean;
  readonly delay?: number;
  readonly initCount?: number;
  readonly maxTime?: number;
  readonly minSamples?: number;
  readonly minTime?: number;
  readonly name?: string;
  readonly onComplete?: (event: { target: Benchmark }) => void;
  readonly onCycle?: (event: { target: Benchmark }) => void;
  readonly onStart?: (event: { target: Benchmark }) => void;
  readonly onError?: (event: { target: Benchmark }) => void;
  readonly onReset?: (event: { target: Benchmark }) => void;
  readonly setup?: MaybeAsync;
  readonly teardown?: MaybeAsync;
  readonly fn?: (deferred: IDeferred) => void;
}

const keys = new Set<keyof IOptions>([
  'defer',
  'delay',
  'initCount',
  'maxTime',
  'minSamples',
  'minTime',
  'name',
  'onComplete',
  'onCycle',
  'onStart',
  'onError',
  'onReset',
  'setup',
  'teardown',
  'fn',
]);

/**
 * Benchmark options. A subset of those that Benchmark.js has, and better typed.
 */
export class Options implements IOptions {
  /**
   * Empty options.
   */
  public static readonly empty = new Options();

  readonly defer?: boolean;
  readonly delay?: number;
  readonly initCount?: number;
  readonly maxTime?: number;
  readonly minSamples?: number;
  readonly minTime?: number;
  readonly name?: string;
  readonly onComplete?: (event: { target: Benchmark }) => void;
  readonly onCycle?: (event: { target: Benchmark }) => void;
  readonly onStart?: (event: { target: Benchmark }) => void;
  readonly onError?: (event: { target: Benchmark }) => void;
  readonly onReset?: (event: { target: Benchmark }) => void;
  readonly setup?: MaybeAsync;
  readonly teardown?: MaybeAsync;
  readonly fn?: (deferred: IDeferred) => void;

  constructor(options: IOptions = {}) {
    for (const key of Object.keys(options) as (keyof IOptions)[]) {
      if (keys.has(key)) {
        (this as any)[key] = options[key];
      }
    }
  }

  /**
   * Creates a new set of options by simply overwriting these ones.
   */
  public assign(options: IOptions) {
    const next: any = new Options();
    for (const key of keys) {
      if (options.hasOwnProperty(key) && options[key] !== undefined) {
        next[key] = options[key];
      } else if (this.hasOwnProperty(key)) {
        next[key] = this[key];
      }
    }

    return next;
  }

  /**
   * Creates a new set of options by merging the `other` onto these ones.
   */
  public merge(other?: IOptions): Options {
    if (!other) {
      return this;
    }

    const next: any = new Options();
    for (const key of keys) {
      if (this.hasOwnProperty(key)) {
        next[key] = this[key];
      }

      if (!other.hasOwnProperty(key)) {
        continue;
      }

      switch (key) {
        case 'setup':
          {
            const outerFn = this[key];
            const innerFn = other[key];
            next[key] = async () => {
              outerFn && (await runMaybeAsync(outerFn));
              innerFn && (await runMaybeAsync(innerFn));
            };
          }
          break;

        case 'teardown':
          {
            const outerFn = this[key];
            const innerFn = other[key];
            next[key] = async () => {
              innerFn && (await runMaybeAsync(innerFn));
              outerFn && (await runMaybeAsync(outerFn));
            };
          }
          break;

        case 'onComplete':
        case 'onCycle':
        case 'onStart':
        case 'onError':
        case 'onReset': {
          const outerFn = this[key];
          const innerFn = other[key];
          next[key] = (arg: any) => {
            innerFn?.(arg);
            outerFn?.(arg);
          };
          break;
        }

        default:
          next[key] = other[key];
      }
    }

    return next;
  }
}
