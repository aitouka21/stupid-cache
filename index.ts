import hash from "object-hash";
import { LRUCache } from "lru-cache";

export type Opts<T> = {
  ttl: number;
  max: number;
  /**
   * Cache all method if this field is not provided
   */
  cacheOn?: [keyof T];
  logger?: {
    trace: (message: string) => void;
  };
};

function isPromise(p: unknown) {
  return p && Object.prototype.toString.call(p) === "[object Promise]";
}

export function stupidCache<T extends object>(
  target: T,
  { ttl, max, logger, cacheOn }: Opts<T>,
) {
  const cache = new LRUCache<string, [boolean, any]>({ ttl, max });

  return new Proxy(target, {
    get(target, p) {
      const fv = target[<keyof T>p];
      if (typeof fv !== "function") return fv;

      if (cacheOn && !(<(typeof p)[]>cacheOn).includes(p)) {
        return fv;
      }

      return (...args: any[]) => {
        const key = hash([p, ...args]);
        logger?.trace(`method = ${String(p)}, args = ${args}, key = ${key}`);

        const fromCache = cache.get(key);
        if (fromCache) {
          logger?.trace(`Cache hit: key = ${key}, isPromise = ${fromCache[0]}`);
          return fromCache[0] ? Promise.resolve(fromCache[1]) : fromCache[1];
        }

        const fromTarget = fv.apply(this, args);

        return isPromise(fromTarget)
          ? fromTarget.then((v: any) => (cache.set(key, [true, v]), v))
          : (cache.set(key, [false, fromTarget]), fromTarget);
      };
    },
  });
}
