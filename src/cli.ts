#!/usr/bin/env node

import program from 'commander';
import { reporters } from './reporters';
import { benchmark, IBenchmarkOptions } from './runner';
import { resolve } from 'path';

type IArgs = { reporters?: boolean; reporter: string } & Omit<IBenchmarkOptions, 'reporter'>;

const { version } = require('../package.json');

const args = program
  .arguments('<file>')
  .name('matcha')
  .version(version)
  .option('-g, --grep <pattern>', 'run a subset of benchmarks', '')
  .option('-R, --reporter <reporter>', 'specify the reporter to use', 'pretty')
  .option('--reporters', 'display available reporters')
  .parse(process.argv)
  .opts() as IArgs;

if (args.reporters) {
  printReporters();
} else if (!program.args.length) {
  program.help();
} else {
  benchmarkFiles();
}

function benchmarkFiles() {
  const reporterFactory =
    typeof args.reporter === 'string' ? reporters[args.reporter] : args.reporter;

  if (!reporterFactory) {
    console.error(`Unknown reporter ${args.reporter}`);
    program.help();
  }

  benchmark({
    ...args,
    reporter: reporterFactory.start(),
    prepare: api => {
      Object.assign(global, api);
      for (const file of program.args) {
        require(resolve(process.cwd(), file));
      }
    },
  });
}

function printReporters() {
  Object.keys(reporters).map(key => {
    process.stdout.write(`${key.padStart(15)} - ${reporters[key].description}`);
  });
}
