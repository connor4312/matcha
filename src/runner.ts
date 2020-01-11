import { IReporter } from './reporters';
import { MatchaSuite, IOptions, RunFunction } from './suite';
import { MaybeAsync, runMaybeAsync } from './async';

/**
 * Options passed to the `benchmark` function.
 */
export interface IBenchmarkOptions {
  /**
   * Optional funciton to override how benchmarks are run. Useful mostly
   * for testing purposes.
   */
  runFunction?: RunFunction;

  /**
   * Takes the benchmark API, and should register all benchmarks using
   * the `api.bench()` method before turning.
   */
  prepare: (setupFn: IBenchmarkApi) => Promise<void> | void;

  /**
   * Reporter to use for returning results.
   */
  reporter: IReporter;

  /**
   * Optionally, only run benchmarks that match the given pattern.
   */
  grep?: string;
}

/**
 * API passed to the prepare step of the benchmarking.
 */
export interface IBenchmarkApi {
  /**
   * Adds the given function to the benchmark.
   * @param name Benchmark name
   * @param fn Function to run, can return a promise or call a callback
   * @param options Benchmark options for benchmark.js. Note that setup and
   * teardown are allowed to be async, however!
   */
  bench(name: string, fn: MaybeAsync, options?: IOptions): void;

  /**
   * Creates a nested 'scope' of benchmarks. Options are inherited and
   * names are prefixed with the suite name.
   */
  suite(name: string, fn: () => void, options?: IOptions): void;

  /**
   * Sets an option for all benchmarks in the current suite and nested suites.
   */
  set<K extends keyof IOptions>(key: K, value: IOptions[K]): void;

  /**
   * A stub function that 'uses' the value, preventing it from being optimized
   * away.
   */
  retain(value: unknown): void;
}

/**
 * Managed merge of two sets of options, making sure to chain
 * lifecycle events as needed.
 */
const assignOptions = (left: IOptions, right?: IOptions): IOptions => {
  if (!right) {
    return left;
  }

  for (const key of Object.keys(right) as (keyof IOptions)[]) {
    switch (key) {
      case 'setup':
        {
          const outerFn = left[key];
          const innerFn = right[key];
          left[key] = async () => {
            outerFn && (await runMaybeAsync(outerFn));
            innerFn && (await runMaybeAsync(innerFn));
          };
        }
        break;
      case 'teardown':
        {
          const outerFn = left[key];
          const innerFn = right[key];
          left[key] = async () => {
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
        const outerFn = left[key];
        const innerFn = right[key];
        left[key] = async (arg: any) => {
          innerFn?.(arg);
          outerFn?.(arg);
        };
      }
      default:
        (left as any)[key] = right[key];
    }
  }

  return left;
};

export async function benchmark({
  runFunction,
  prepare,
  reporter,
  grep,
}: IBenchmarkOptions): Promise<void> {
  const suite = new MatchaSuite(runFunction);
  const retainSymbol = Symbol();
  const grepRe = new RegExp(grep || '', 'i');

  let scope = { prefix: '', options: <IOptions>{} };

  await prepare({
    bench(name, fn, options?) {
      name = scope.prefix + name;
      if (!grepRe.test(name)) {
        return;
      }

      suite.addCase({
        name,
        fn,
        options: assignOptions({ ...scope.options }, options),
      });
    },

    suite(name, fn, options?) {
      const previous = scope;
      scope = {
        prefix: previous.prefix + name + '#',
        options: assignOptions({ ...previous.options }, options),
      };
      fn();
      scope = previous;
    },

    set<K extends keyof IOptions>(key: K, value: IOptions[K]) {
      assignOptions(scope.options, { [key]: value });
    },

    retain(value) {
      // Some expression that'll never evaluate to true, but ensure that V8
      // (probably) can't optimize the passed value away.
      if (retainSymbol === value) {
        throw new Error('unreachable');
      }
    },
  });

  await suite.run(reporter);
}
