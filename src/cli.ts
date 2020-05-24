#!/usr/bin/env node

import program from 'commander';
import { reporters } from './reporters';
import { benchmark, Middleware } from './runner';
import { resolve } from 'path';
import { grepMiddleware } from './middleware/grep';
import { cpuProfiler } from './middleware/cpu-profiler';
import { IBenchmarkCase } from './suite';
import { promisify } from 'util';
import { writeFile } from 'fs';

interface IArgs {
  reporters?: boolean;
  reporter: string;
  grep: string;
  cpuProfile?: string | true;
}

const { version } = require('../package.json');

const args = program
  .arguments('<file>')
  .name('matcha')
  .version(version)
  .option('-g, --grep <pattern>', 'Run a subset of benchmarks', '')
  .option('-R, --reporter <reporter>', 'Specify the reporter to use', 'pretty')
  .option(
    '--cpu-profile [pattern]',
    'Run on all tests, or those matching the regex. Saves a .cpuprofile file that can be opened in the Chrome devtools.',
  )
  .option('--reporters', 'Display available reporters')
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

  const middleware: Middleware[] = [];
  if (args.grep) {
    middleware.push(grepMiddleware(new RegExp(args.grep, 'i')));
  }

  if (args.cpuProfile === true) {
    middleware.push(cpuProfiler(writeProfile));
  } else if (args.cpuProfile) {
    middleware.push(cpuProfiler(writeProfile, new RegExp(args.cpuProfile, 'i')));
  }

  benchmark({
    middleware,
    reporter: reporterFactory.start(),
    prepare: api => {
      Object.assign(global, api);
      for (const file of program.args) {
        require(resolve(process.cwd(), file));
      }
    },
  });
}

function writeProfile(bench: Readonly<IBenchmarkCase>, profile: object) {
  const safeName = bench.name.replace(/[^a-z0-9]/gi, '-');
  promisify(writeFile)(`${safeName}.cpuprofile`, JSON.stringify(profile));
}

function printReporters() {
  for (const [name, reporter] of Object.entries(reporters)) {
    process.stdout.write(`${name.padStart(15)} - ${reporter.description}\r\n`);
  }
}
