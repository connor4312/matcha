import OriginalBenchmark from 'benchmark';
import { csvFactory } from './csv';
import { jsonFactory } from './json';
import { jsonSummaryFactory } from './json-summary';
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
  start(): IReporter;
}

export const reporters: { [key: string]: IReporterFactory } = {
  csv: csvFactory,
  json: jsonFactory,
  pretty: prettyFactory,
  'json-summary': jsonSummaryFactory,
};
