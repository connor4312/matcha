import { Suite } from 'benchmark';
import { Benchmark, IReporter } from './reporters';
import { MaybeAsync, IDeferred, returnsPromiseLike, runMaybeAsync } from './async';

/**
 * Method used for running benchmarks. Can be stubbed in tests.
 */
export type RunFunction = (name: string, options: IOptions) => Promise<void>;

const defaultRunFn: RunFunction = (name, options) => {
  const suite = new Suite();
  suite.add(name, options);
  const prom = new Promise<void>(resolve => suite.on('complete', resolve));
  suite.run();
  return prom;
};

/**
 * Benchmark options. A subset of those that Benchmark.js has, and better typed.
 */
export interface IOptions {
  defer?: boolean;
  delay?: number;
  initCount?: number;
  maxTime?: number;
  minSamples?: number;
  minTime?: number;
  name?: string;
  onComplete?: (event: { target: Benchmark }) => void;
  onCycle?: (event: { target: Benchmark }) => void;
  onStart?: (event: { target: Benchmark }) => void;
  onError?: (event: { target: Benchmark }) => void;
  onReset?: (event: { target: Benchmark }) => void;
  setup?: MaybeAsync;
  teardown?: MaybeAsync;
  fn?: (deferred: IDeferred) => void;
}

export interface IBenchmarkCase {
  name: string;
  fn: MaybeAsync;
  options?: IOptions;
}

/**
 * Installs a callback or promise-returning benchmark in the bench
 * options. This is awkward with their API, but it is what it is.
 */
const installBenchFn = (fn: MaybeAsync, options: IOptions) => {
  if (fn.length > 0) {
    options.defer = true;
    options.fn = (deferred: IDeferred) => {
      fn(err => (err ? deferred.reject(err) : deferred.resolve(undefined)));
    };
  } else if (returnsPromiseLike(fn)) {
    options.defer = true;
    options.fn = (deferred: IDeferred) => {
      fn()!
        .then(() => deferred.resolve(undefined))
        .catch(err => deferred.reject(err));
    };
  } else {
    options.fn = fn as () => void;
  }
};

/**
 * Composes a function that adds a call to the `additional` function after
 * the original one, if it exists.
 */
export const compose = <Args extends unknown[]>(
  original: ((...fn: Args) => void) | undefined,
  additional: (...fn: Args) => void,
) =>
  original
    ? (...args: Args) => {
        original(...args);
        additional(...args);
      }
    : additional;

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
  public async run(reporter: IReporter): Promise<void> {
    for (const bench of this.benches) {
      const { setup, teardown, ...options } = bench.options ?? {};
      if (setup) {
        await runMaybeAsync(setup as MaybeAsync);
      }

      installBenchFn(bench.fn, options);

      options.onStart = compose(options.onStart, event => reporter.onStartCycle(event.target));
      options.onComplete = compose(options.onComplete, event =>
        reporter.onFinishCycle(event.target),
      );
      await this.runFn(bench.name, options);

      if (teardown) {
        await runMaybeAsync(teardown as MaybeAsync);
      }
    }

    reporter.onComplete();
  }
}
