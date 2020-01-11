import { IReporter } from './reporters';
import { MatchaSuite, RunFunction, IBenchmarkCase } from './suite';
import { MaybeAsync } from './async';
import { IOptions, Options } from './options';
import { reporterMiddleware } from './middleware/reporter';

/**
 * A middleware function for the benchmark. Invoked directly before the
 * benchmark starts running.
 */
export type Middleware = (
  benchmark: Readonly<IBenchmarkCase>,
  next: (options: Readonly<IBenchmarkCase>) => Promise<void>,
) => Promise<void>;

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
   * Optional profiler instance that can be used to run CPU profiles
   * on benchmarks.
   */
  middleware?: Middleware[];

  /**
   * Takes the benchmark API, and should register all benchmarks using
   * the `api.bench()` method before turning.
   */
  prepare: (setupFn: IBenchmarkApi) => Promise<void> | void;

  /**
   * Reporter to use for returning results.
   */
  reporter: IReporter;
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

export async function benchmark({
  runFunction,
  prepare,
  reporter,
  middleware,
}: IBenchmarkOptions): Promise<void> {
  const suite = new MatchaSuite(runFunction);
  const retainSymbol = Symbol();
  let scope = { prefix: '', middleware: middleware?.slice() ?? [], options: Options.empty };

  scope.middleware.push(reporterMiddleware(reporter));

  await prepare({
    bench(name, fn, options?) {
      suite.addCase({
        fn,
        name: scope.prefix + name,
        middleware: scope.middleware,
        options: scope.options.merge(options),
      });
    },

    suite(name, fn, options?) {
      const previous = scope;
      scope = {
        prefix: previous.prefix + name + '#',
        middleware: previous.middleware,
        options: previous.options.merge(options),
      };
      fn();
      scope = previous;
    },

    set<K extends keyof IOptions>(key: K, value: IOptions[K]) {
      scope.options = scope.options.merge({ [key]: value });
    },

    retain(value) {
      // Some expression that'll never evaluate to true, but ensure that V8
      // (probably) can't optimize the passed value away.
      if (retainSymbol === value) {
        throw new Error('unreachable');
      }
    },
  });

  await suite.run();
  reporter.onComplete();
}
