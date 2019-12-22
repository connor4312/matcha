# @c4312/matcha

A modernization of [`matcha`](https://github.com/logicalparadox/matcha), powered by Benchmark.js.

![Demonstration video of the matcha command line](./demo.svg)

## Usage

```
npm install --global matcha
```

Then you can create a file and `bench` functions, for instance:

```js
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

bench('forEach', () => arr.forEach(v => (sum += v)));

bench('for-of loop', () => {
  for (const v of arr) {
    sum += v;
  }
});
```

### Command-Line Options

```
@c4312/matcha 1.0.0

Usage: matcha <options> <files>

Options:

  -h, --help               view matcha usage information
  -v, --version            view matcha version
  -g, --grep [pattern]     run a subset of benchmarks
  -R, --reporter [pretty]  specify the reporter to use
  --reporters              display available reporters

Run a suite of benchmarks.
```

## Async Benchmarks

You can return promises from your benchmarks and take callbacks:

```js
bench('plain fs', callback => readFile(__filename, callback));
bench('promisifed fs', async () => await readFileAsync(__filename));
```

## Settings

You can set any [benchmark.js option](https://benchmarkjs.com/docs#options) via the `set()` helper.

```js
set('maxTime', 1);
set('minSamples', 2000);
```
