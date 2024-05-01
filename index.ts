import hash from "object-hash";
import { LRUCache } from "lru-cache";
import util from "util";

export type Opts = {
  ttl: number;
  max: number;
  logger?: {
    trace: (message: string) => void;
  };
};

export function stupidCache<T extends object>(
  target: T,
  { ttl, max, logger }: Opts,
) {
  return new Proxy(target, {
    cache: new LRUCache({ ttl, max }),
    get(target: T, p: keyof T) {
      const fv = target[p];
      if (typeof fv !== "function") return fv;

      return (...args: any[]) => {
        const key = hash([p, ...args]);
        logger?.trace(`method = ${String(p)}, args = ${args}, key = ${key}`);
        let v: any;
        if ((v = this.cache.get(key))) {
          logger?.trace(`Cache hit: key = ${key}, isPromise = ${v[0]}`);
          return v[0] ? Promise.resolve(v[1]) : v[1];
        }
        return ((v = fv.apply(this, args)), util.types.isPromise(v))
          ? v.then((v) => (this.cache.set(key, [true, v]), v))
          : (this.cache.set(key, [false, v]), v);
      };
    },
  } as ProxyHandler<T> & { cache: LRUCache<string, any, unknown> });
}
