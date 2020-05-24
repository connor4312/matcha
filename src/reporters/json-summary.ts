import { Benchmark, IReporter, IReporterFactory } from '.';
import { EOL } from 'os';

type JsonResult = {
  name: string;
  factor: number;
  ops: number;
  fastest: boolean;
};

type JsonError = {
  name: string;
  error: Error['stack'];
};

export const jsonSummaryFactory: IReporterFactory = {
  description: 'Outputs summarized stats as raw JSON',
  start: () => new JsonSummaryReporter(process.stdout),
};

export class JsonSummaryReporter implements IReporter {
  private readonly results: Benchmark[] = [];

  constructor(private readonly out: NodeJS.WriteStream) {}

  onStartCycle() {
    // no-op
  }

  onFinishCycle(newResult: Benchmark) {
    this.results.push(newResult);
  }

  onComplete() {
    const benchmarks: Benchmark[] = [];
    const results: JsonResult[] = [];
    const errors: JsonError[] = [];

    let minHz = Infinity;
    let maxHz = 0;
    let elapsed = 0;

    for (const benchmark of this.results) {
      elapsed += benchmark.times.elapsed;

      if (benchmark.error) {
        errors.push({ name: benchmark.name, error: benchmark.error.stack });
      } else {
        minHz = Math.min(minHz, benchmark.hz);
        maxHz = Math.max(maxHz, benchmark.hz);
        benchmarks.push(benchmark);
      }
    }

    let fastest: Benchmark | undefined;

    for (const benchmark of benchmarks) {
      const factor = benchmark.hz / minHz;

      if (!fastest && benchmark.hz === maxHz) {
        fastest = benchmark;
      }

      results.push({
        name: benchmark.name,
        factor: Number(factor.toFixed(2)),
        ops: Math.trunc(benchmark.hz),
        fastest: benchmark === fastest,
      });
    }

    const result = {
      benches: this.results.length,
      errors,
      fastest: fastest?.name,
      elapsed: Number(elapsed.toFixed(2)),
      results,
    };

    this.out.write(JSON.stringify(result));
    this.out.write(EOL);
  }
}
