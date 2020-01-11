import { benchmark } from './runner';
import { IOptions } from './suite';
import { NoopReporter } from './reporters/noop';
import { expect } from 'chai';
import { promisify } from 'util';

const timeout = promisify(setTimeout);

// There's really no other test setup I could use for a project
// called matcha but mocha and chai

describe('runner', () => {
  it('sets options correctly', async () => {
    let results: [string, IOptions][] = [];
    await benchmark({
      reporter: new NoopReporter(),
      runFunction(name, options) {
        const { fn, onComplete, onStart, ...rest } = options;
        results.push([name, rest]);
        return Promise.resolve();
      },
      prepare(api) {
        api.set('maxTime', 1);
        api.bench('a', () => {});
        api.bench('aaa', () => {});
        api.suite('aSuite', () => {
          api.set('initCount', 100);
          api.bench('c', () => {});
        });
      },
    });

    expect(results).to.deep.equal([
      ['a', { maxTime: 1 }],
      ['aaa', { maxTime: 1 }],
      ['aSuite#c', { maxTime: 1, initCount: 100 }],
    ]);
  });

  it('greps for tests', async () => {
    let results: string[] = [];
    await benchmark({
      grep: '^a',
      reporter: new NoopReporter(),
      runFunction(name) {
        results.push(name);
        return Promise.resolve();
      },
      prepare(api) {
        api.bench('a', () => {});
        api.bench('b', () => {});
        api.bench('aaa', () => {});
        api.bench('ba', () => {});
      },
    });

    expect(results).to.deep.equal(['a', 'aaa']);
  });

  it('handles lifecycle correctly', async () => {
    let results: string[] = [];
    await benchmark({
      reporter: new NoopReporter(),
      runFunction() {
        results.push('bench');
        return Promise.resolve();
      },
      prepare(api) {
        api.set('setup', () => {
          results.push('in a');
          return timeout(1);
        });

        api.set('teardown', () => {
          results.push('out a');
          return timeout(1);
        });

        api.suite('b', () => {
          api.set('setup', () => {
            results.push('in b');
          });

          api.set('teardown', () => {
            results.push('out b');
          });

          api.suite('c', () => {
            api.set('setup', callback => {
              results.push('in c');
              setTimeout(() => callback(null), 1);
            });

            api.set('teardown', callback => {
              results.push('out c');
              setTimeout(() => callback(null), 1);
            });

            api.bench('', () => {});
          });
        });
      },
    });

    expect(results).to.deep.equal(['in a', 'in b', 'in c', 'bench', 'out c', 'out b', 'out a']);
  });

  it('runs e2e', async function() {
    this.timeout(10000);

    const reporter = new NoopReporter();
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { ...obj1 };
    await benchmark({
      reporter,
      prepare(api) {
        api.set('maxTime', 0.5);
        api.bench('deepEqual', () => expect(obj1).to.deep.equal(obj2));
        api.bench('strictEqual', () => expect(obj1).to.equal(obj1));
      },
    });

    expect(reporter.results).to.have.lengthOf(2);
    for (const result of reporter.results) {
      expect(result.hz).to.be.greaterThan(1);
    }
  });
});
