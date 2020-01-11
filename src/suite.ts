import { MaybeAsync, IDeferred, returnsPromiseLike, runMaybeAsync } from './async';
import { Options } from './options';
import { Middleware } from './runner';
import Benchmark from 'benchmark';

/**
 * Method used for running benchmarks. Can be stubbed in tests.
 */
export type RunFunction = (name: string, options: Options) => Promise<void>;

const defaultRunFn: RunFunction = (name, options) => {
  const bench = new Benchmark(name, options.fn!, options);
  const prom = new Promise<void>(resolve => bench.on('complete', resolve));
  bench.run();
  return prom;
};

export interface IBenchmarkCase {
  name: string;
  fn: MaybeAsync;
  middleware: ReadonlyArray<Middleware>;
  options?: Options;
}

/**
 * Installs a callback or promise-returning benchmark in the bench
 * options. This is awkward with their API, but it is what it is.
 */
const installBenchFn = (fn: MaybeAsync, options: Options) => {
  if (fn.length > 0) {
    return options.merge({
      defer: true,
      fn: (deferred: IDeferred) => {
        fn(err => (err ? deferred.reject(err) : deferred.resolve(undefined)));
      },
    });
  }

  if (returnsPromiseLike(fn)) {
    return options.merge({
      defer: true,
      fn: (deferred: IDeferred) => {
        fn()!
          .then(() => deferred.resolve(undefined))
          .catch(err => deferred.reject(err));
      },
    });
  }

  return options.merge({ fn: fn as () => void });
};

const runMiddleware = (
  bench: Readonly<IBenchmarkCase>,
  stack: ReadonlyArray<Middleware>,
  offset = 0,
): Promise<void> => {
  if (stack.length === offset) {
    return Promise.resolve();
  }

  return stack[offset](bench, b => runMiddleware(b, stack, offset + 1));
};

/**
 * A benchmark suite. Wraps around the basic Benchmark.js suites, since they
 * don't support asynchronous setup and teardown.
 * @see https://github.com/bestiejs/benchmark.js/pull/174
 */
export class MatchaSuite {
  private readonly benches: IBenchmarkCase[] = [];

  constructor(private readonly runFn: RunFunction = defaultRunFn) {}

  /**
   * Adds a new benchmark case.
   */
  public addCase(bench: IBenchmarkCase) {
    this.benches.push(bench);
  }

  /**
   * Runs all benchmarks.
   */
  public async run(): Promise<void> {
    for (const bench of this.benches) {
      await runMiddleware(bench, [
        ...bench.middleware,
        async bench => {
          const options = bench.options ?? Options.empty;
          if (options.setup) {
            await runMaybeAsync(options.setup);
          }

          const benchOptions = options.assign({
            setup: undefined,
            teardown: undefined,
          });

          await this.runFn(bench.name, installBenchFn(bench.fn, benchOptions));

          if (options.teardown) {
            await runMaybeAsync(options.teardown);
          }
        },
      ]);
    }
  }
}
