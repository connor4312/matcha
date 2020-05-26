import { Benchmark, IReporter, IReporterFactory } from '.';
import { EOL } from 'os';

export const jsonFactory: IReporterFactory = {
  description: 'Outputs stats as raw JSON',
  start: () => new JsonReporter(process.stdout),
};

export class JsonReporter implements IReporter {
  private printed = 0;

  constructor(private readonly out: NodeJS.WriteStream) {}

  onStartCycle() {
    // no-op
  }

  onFinishCycle(benchmark: Benchmark) {
    if (benchmark.error) {
      throw benchmark.error;
    }

    this.out.write(
      (this.printed++ > 0 ? ',' : '[') +
        EOL +
        '  ' +
        JSON.stringify({
          name: benchmark.name,
          hz: benchmark.hz,
          mean: benchmark.stats.mean,
          deviation: benchmark.stats.deviation,
          count: benchmark.count,
        }),
    );
  }

  onComplete() {
    this.out.write(`${EOL}]${EOL}`);
  }
}
