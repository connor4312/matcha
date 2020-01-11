# @c4312/matcha

A modernization of [`matcha`](https://github.com/logicalparadox/matcha), powered by Benchmark.js. I found Matcha super useful over the years, but it has [issues with accuracy](https://github.com/logicalparadox/matcha/issues/22), doesn't support promises or work with Node 12, and is apparently abandoned. We fix those here!

![Demonstration video of the matcha command line](./demo.gif)

## Usage

```
npm install --global @c4312/matcha
```

Then you can create a file and `bench` functions, for instance if you have a **my-bench.js**:

```js
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

bench('forEach', () => arr.forEach(v => (sum += v)));

bench('for-of loop', () => {
  for (const v of arr) {
    sum += v;
  }
});
```

Then, simply run:

```
matcha my-bench.js
```

### Command-Line Options

```
Usage: matcha [options] <file>

Options:
  -V, --version              output the version number
  -g, --grep <pattern>       Run a subset of benchmarks (default: "")
  -R, --reporter <reporter>  Specify the reporter to use (default: "pretty")
  --cpu-profile [pattern]    Run on all tests, or those matching the regex.
                             Saves a .cpuprofile file that can be opened in the Chrome devtools.
  --reporters                Display available reporters
  -h, --help                 output usage information
```

## Async Benchmarks

You can return promises from your benchmarks and take callbacks:

```js
bench('plain fs', callback => readFile(__filename, callback));
bench('promisifed fs', async () => await readFileAsync(__filename));
```

## Settings

You can set any [benchmark.js option](https://benchmarkjs.com/docs#options) via the `set()` helper. You can also have async setup and teardown methods.

```js
// in a promise:
set('setup', async () => {
  await waitUntilPageIsLoaded();
});

// or a callback:
set('teardown', callback => closePage(callback));

// as well as base options:
set('maxTime', 1);
set('minSamples', 2000);
```

## Nested Suites

Multiple benchmark suites can be nested. Options, including setup and teardown, are inherited, chained, and overridden.

```js
set('setup', globalPrepare);

// globalPrepare() run before:
bench('a', runA);

// globalPrepare() and nestedPrepare() run before
// these, and they run for 1 second at most:
suite('nested', () => {
  set('setup', nestedPrepare);
  set('maxTime', 1);
  bench('b', runB);
});
```

## API

You can use the Matcha API programmatically:

```js
const { GatherReporter, benchmark } = require('@c4312/benchmark');

// A reporter that just stores results in an array:
const reporter = new GatherReporter();

await benchmark({
  reporter,
  prepare(api) {
    // The standard API as described above!
    api.bench('myFunction', fn);

    // This function may be async and return a promise,
    // which we'll wait for before we start benchmarking.
  },
});

for (const result of reporter.results) {
  console.log('Benchmark', result.name, 'runs at', result.hz, 'ops/sec');
}
```
