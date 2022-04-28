// const SimplePromise = Promise; // test with Real Promise class
const SimplePromise = require("./SimplePromise");

const mockAsync = (func) => {
  setTimeout(() => {
    func();
  }, 100);
};

describe("SimplePromise", () => {
  const value = "Awesome value";
  const reason = "Unlawful reason";

  describe("then() method", () => {
    it("expect value when resolved", () => {
      new SimplePromise((resolve) => {
        resolve(value);
      }).then((v) => {
        expect(v).toBe(value);
      });
    });

    it("expect value when resolved asynchronously", (done) => {
      new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      }).then((v) => {
        expect(v).toBe(value);
        done();
      });
    });

    it("return value when resolved asynchronously with async & await", async () => {
      const v = await new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      });

      expect(v).toBe(value);
    });

    it("expect reason when rejected", () => {
      new SimplePromise((_, reject) => {
        reject(reason);
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
      });
    });

    it("expect reason when rejected asynchronously", (done) => {
      new SimplePromise((_, reject) => {
        mockAsync(() => reject(reason));
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
        done();
      });
    });

    it("catch reason when rejected asynchronously with async & await", async () => {
      try {
        await new SimplePromise((_, reject) => {
          mockAsync(() => reject(reason));
        });
      } catch (r) {
        expect(r).toBe(reason);
      }
    });
  });

  describe("catch() method", () => {
    it("expect reason when rejected", () => {
      new SimplePromise((_, reject) => {
        reject(reason);
      }).catch((r) => {
        expect(r).toBe(reason);
      });
    });

    it("expect reason when rejected asynchronously", (done) => {
      new SimplePromise((_, reject) => {
        mockAsync(() => reject(reason));
      }).catch((r) => {
        expect(r).toBe(reason);
        done();
      });
    });

    it("catch error when error thrown", () => {
      new SimplePromise((_, reject) => {
        throw reason;
      }).catch((e) => {
        expect(e).toBe(reason);
      });
    });
  });

  describe("resolve() method", () => {
    it("expect value", () => {
      SimplePromise.resolve(value).then((v) => {
        expect(v).toBe(value);
      });
    });

    it("expect value with nested resolves", () => {
      const a = SimplePromise.resolve(value);
      const b = SimplePromise.resolve(a);
      const c = SimplePromise.resolve(b);

      expect(c).toBe(b);
      expect(b).toBe(a);

      c.then((v) => {
        expect(v).toBe(value);
      });
    });

    it("expect value with thenable", () => {
      const p1 = Promise.resolve({
        then: (onFulfilled) => {
          onFulfilled(value);
        },
      });

      expect(p1 instanceof Promise).toBe(true);

      p1.then((v) => {
        expect(v).toBe(value);
      });
    });
  });

  describe("finally() method", () => {
    it("execute given function", () => {
      const mock = jest.fn();

      new SimplePromise((_, reject) => {
        throw reason;
      }).finally(mock);

      expect(mock).toHaveBeenCalledTimes(1);
    });

    it("execute given function async", (done) => {
      const mock = jest.fn();

      new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      }).then(mock);
      // .finally(() => {
      //   expect(mock).toHaveBeenCalledTimes(1);
      //   done();
      // });
    });
  });

  describe("chaining", () => {
    it("can chain multiple thens", () => {
      new SimplePromise((resolve) => {
        resolve(value);
      })
        .then((v) => {
          expect(v).toBe(value);
          return `${v} 2`;
        })
        .then((v2) => {
          expect(v2).toBe(`${value} 2`);
        });
    });
  });
});
