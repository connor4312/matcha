#!/usr/bin/env node

import { Suite, Options } from 'benchmark';
import { resolve } from 'path';
import minimist from 'minimist';
import { reporters, Benchmark } from './reporters';

interface IArgs {
  _: ReadonlyArray<string>;
  help?: boolean;
  h?: boolean;
  reporter?: string;
  R?: string;
  g?: string;
  grep?: string;
  version?: boolean;
  v?: boolean;
  reporters?: boolean;
}

const version = require('../package.json').version;
const args: IArgs = minimist(process.argv.slice(1));

if (args.h || args.help) {
  printHelp();
} else if (args.reporters) {
  printReporters();
} else if (args.v || args.version) {
  printVersion();
} else if (args._.length === 2) {
  benchmark(args);
} else {
  printHelp();
}

function printHelp(message?: string): never {
  const help = [
    message || `@c4312/matcha ${version}`,
    '',
    'Usage: matcha <options> <files>',
    '',
    'Options:',
    '',
    '  -h, --help               view matcha usage information',
    '  -v, --version            view matcha version',
    '  -g, --grep [pattern]     run a subset of benchmarks',
    '  -R, --reporter [pretty]  specify the reporter to use',
    '  --reporters              display available reporters',
    '',
    'Run a suite of benchmarks.',
    '',
  ].join('\r\n');

  process.stdout.write(help);
  process.exit(1);
}

function printVersion() {
  process.stdout.write(`${version}\r\n`);
}

function printReporters() {
  Object.keys(reporters).map(key => {
    process.stdout.write(`${key.padStart(15)} - ${reporters[key].description}`);
  });
}

interface IDeferred<T = void> {
  resolve(value: T): void;
  reject(err: Error): void;
}

function returnsPromiseLike(fn: () => Promise<void> | undefined): fn is () => Promise<void> {
  try {
    return typeof fn()?.then === 'function';
  } catch {
    return false;
  }
}

function canRunBench(args: IArgs, name: string) {
  const pattern = args.g || args.grep || '';
  return new RegExp(pattern, 'i').test(name);
}

function benchmark(args: IArgs) {
  const reporterFactory = reporters[args.R || args.reporter || 'pretty'];
  if (!reporterFactory) {
    printHelp('Unknown reporter');
  }

  const suite = new Suite();
  const reporter = reporterFactory.start(suite);
  const retainSymbol = Symbol();

  let scope = { prefix: '', options: <Options>{} };

  Object.assign(global, {
    bench(
      name: string,
      fn: (callback?: (err: Error) => void) => Promise<void> | undefined,
      options?: Options,
    ) {
      if (!canRunBench(args, name)) {
        return;
      }

      // Wrap deferred/async benchmarks. Benchmark.js doesn't currently
      // support promises nicely, see https://github.com/bestiejs/benchmark.js/issues/176
      const userOptions = { ...scope.options, ...options };
      if (fn.length > 0) {
        userOptions.defer = true;
        userOptions.fn = (deferred: IDeferred) => {
          fn(err => (err ? deferred.reject(err) : deferred.resolve(undefined)));
        };
      } else if (returnsPromiseLike(fn)) {
        userOptions.defer = true;
        userOptions.fn = (deferred: IDeferred) => {
          fn()!
            .then(() => deferred.resolve(undefined))
            .catch(err => deferred.reject(err));
        };
      } else {
        userOptions.fn = fn;
      }

      suite.add(scope.prefix + name, {
        ...userOptions,
        onStart(event: { target: Benchmark }) {
          reporter.onStartCycle(event.target);
          userOptions.onStart?.(event);
        },
        onComplete(event: { target: Benchmark }) {
          reporter.onFinishCycle(event.target);
          userOptions.onComplete?.(event);
        },
      });
    },

    suite(name: string, fn: () => void, options?: Options) {
      const previous = scope;
      scope = { prefix: previous.prefix + name, options: { ...previous.options, ...options } };
      fn();
      scope = previous;
    },

    set<K extends keyof Options>(key: K, value: Options[K]) {
      scope.options[key] = value;
    },

    retain(value: Symbol) {
      // Some expression that'll never evaluate to true, but ensure that V8
      // (probably) can't optimize the passed value away.
      if (retainSymbol === value) {
        throw new Error('unreachable');
      }
    },
  });

  require(resolve(process.cwd(), args._[1]));

  suite
    .on('complete', () => {
      reporter.onComplete();
      process.exit(suite.filter('error') ? 0 : 1);
    })
    .run();
}
