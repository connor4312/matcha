import { Benchmark, IReporter, IReporterFactory } from '.';
import chalk from 'chalk';
import { moveCursor, clearLine } from 'readline';

export const prettyFactory: IReporterFactory = {
  description: 'Pretty prints results to the console',
  start: () => new PrettyReporter(process.stdout),
};

const center = 30;

export class PrettyReporter implements IReporter {
  private readonly numberFormat = Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });
  private readonly results: Benchmark[] = [];

  constructor(private readonly out: NodeJS.WriteStream) {
    this.out.write('\r\n');
  }

  onStartCycle(benchmark: Benchmark) {
    this.out.write(chalk.yellow('running > '.padStart(center)) + chalk.gray(benchmark.name));
    this.out.write('\r\n');
  }

  onFinishCycle(newResult: Benchmark) {
    this.results.push(newResult);
    moveCursor(this.out, 0, -this.results.length);

    let minHz = Infinity;
    let maxHz = 0;
    for (const benchmark of this.results) {
      if (benchmark.hz) {
        minHz = Math.min(minHz, benchmark.hz);
        maxHz = Math.max(maxHz, benchmark.hz);
      }
    }

    for (const benchmark of this.results) {
      clearLine(this.out, 0);

      if (benchmark.error) {
        this.out.write(chalk.red('error > '.padStart(center)) + chalk.gray(benchmark.name));
      } else {
        const text = benchmark.name + ` (${this.numberFormat.format(benchmark.hz / minHz)}x)`;
        this.out.write(
          chalk.green(`${this.numberFormat.format(benchmark.hz)} ops/sec > `.padStart(center)) +
            (benchmark.hz === maxHz ? text : chalk.gray(text)),
        );
      }

      this.out.write('\r\n');
    }
  }

  onComplete() {
    const cases = this.results.slice();
    const error = cases.find(c => !!c.error);
    if (error) {
      this.out.write(chalk.red(error.error.stack));
      return;
    }

    cases.sort((a, b) => b.hz - a.hz);
    const elapsed = cases.reduce((n, c) => n + c.times.elapsed, 0);

    this.out.write('\r\n');
    this.out.write(`  ${chalk.grey('Benches')}: ${cases.length}\r\n`);
    this.out.write(`  ${chalk.grey('Fastest')}: ${(cases[0] as any)?.name}\r\n`);
    this.out.write(`  ${chalk.grey('Elapsed')}: ${this.numberFormat.format(elapsed)}s\r\n`);
    this.out.write('\r\n');
  }
}
