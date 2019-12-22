import OriginalBenchmark, { Suite } from 'benchmark';
import { csvFactory } from './csv';
import { jsonFactory } from './json';
import { prettyFactory } from './pretty';

export interface Benchmark extends OriginalBenchmark {
  name: string;
}

/**
 * Output formatter interface
 */
export interface IReporter {
  onStartCycle(benchmark: Benchmark): void;
  onFinishCycle(benchmark: Benchmark): void;
  onComplete(): void;
}

export interface IReporterFactory {
  readonly description: string;
  start(suite: Suite): IReporter;
}

export const reporters: { [key: string]: IReporterFactory } = {
  csv: csvFactory,
  json: jsonFactory,
  pretty: prettyFactory,
};
