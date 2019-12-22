import { Benchmark, IReporter, IReporterFactory } from '.';

export const csvFactory: IReporterFactory = {
  description: 'Outputs stats as CSV',
  start: () => new CsvReporter(process.stdout),
};

class CsvReporter implements IReporter {
  constructor(private readonly out: NodeJS.WriteStream) {
    out.write(['name', 'hz', 'mean', 'deviation', 'iterations'].join(',') + '\r\n');
  }

  onStartCycle() {
    // no-op
  }

  onFinishCycle(benchmark: Benchmark) {
    if (benchmark.error) {
      throw benchmark.error;
    }

    this.out.write(
      [
        benchmark.name.replace(/,/g, ' '),
        benchmark.hz.toFixed(8),
        benchmark.stats.mean.toFixed(8),
        benchmark.stats.deviation.toFixed(8),
        benchmark.count,
      ].join(',') + '\r\n',
    );
  }

  onComplete() {
    // no-op
  }
}
