import { Middleware } from '../runner';
import { grepMatches } from './grep';
import { Session } from 'inspector';
import { IBenchmarkCase } from '../suite';

let session: Session | undefined;
let enabledProfiler = false;

const getSession = () => {
  if (!session) {
    session = new Session();
    session.connect();
  }

  return session;
};

const postAsync = <R = unknown>(method: string, params?: {}) =>
  new Promise<R>((resolve, reject) =>
    getSession().post(method, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result as R);
      }
    }),
  );

/**
 * A middleware that runs a CPU profile benchmarks.
 */
export const cpuProfiler = (
  onResult: (bench: Readonly<IBenchmarkCase>, profile: object) => Promise<void> | void,
  include?: string | RegExp,
): Middleware => async (bench, next) => {
  if (include && !grepMatches(include, bench.name)) {
    return next(bench);
  }

  if (!enabledProfiler) {
    enabledProfiler = true;
    await postAsync('Profiler.enable');
  }

  await postAsync('Profiler.start');
  await next(bench);

  const { profile } = await postAsync<{ profile: object }>('Profiler.stop');
  await onResult(bench, profile);
};
