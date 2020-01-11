import { IReporter, Benchmark } from '.';

/**
 * A reporter that writes nothing but simply
 * collects benchmarks that can be read later.
 */
export class GatherReporter implements IReporter {
  public readonly results: Benchmark[] = [];

  onStartCycle() {
    // no-op
  }

  onFinishCycle(benchmark: Benchmark) {
    this.results.push(benchmark);
  }

  onComplete() {
    // no-op
  }
}
