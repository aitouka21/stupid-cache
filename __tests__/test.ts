import { stupidCache } from "../index";

describe("stupidCache", () => {
  class FooService {
    async getFoo1(id: string) {
      return { id };
    }

    getFoo2(id: string) {
      return { id };
    }

    getFoo3(id: string) {
      return Promise.resolve({ id });
    }
  }

  let logger: Parameters<typeof stupidCache>[1]["logger"];

  beforeEach(() => {
    logger = { trace: jest.fn() };
  });

  test("no cache hit", async () => {
    const service = stupidCache(new FooService(), {
      ttl: 10000,
      max: 500,
      logger,
    });

    await service.getFoo1("1");
    await service.getFoo1("2");
    await service.getFoo1("3");

    expect(logger.trace).toHaveBeenCalledTimes(3);
  });

  test("with cache hit 1", async () => {
    const service = stupidCache(new FooService(), {
      ttl: 10000,
      max: 500,
      logger,
    });

    service.getFoo2("1");
    service.getFoo2("1");
    service.getFoo2("1");

    expect(logger.trace).toHaveBeenCalledTimes(5);
  });

  test("with cache hit 2", async () => {
    const service = stupidCache(new FooService(), {
      ttl: 10000,
      max: 500,
      logger,
    });

    await service.getFoo3("1");
    await service.getFoo3("1");
    await service.getFoo3("1");
    await service.getFoo3("1");
    await service.getFoo1("1");

    expect(logger.trace).toHaveBeenCalledTimes(8);
  });

  test("with cacheOn", async () => {
    const service = stupidCache(new FooService(), {
      ttl: 10000,
      max: 500,
      logger,
      cacheOn: ["getFoo1"],
    });

    await service.getFoo1("1");
    await service.getFoo1("1");
    await service.getFoo1("1");
    service.getFoo2("1");
    service.getFoo2("1");
    await service.getFoo3("1");
    await service.getFoo3("1");

    expect(logger.trace).toHaveBeenCalledTimes(5);
  });
});
