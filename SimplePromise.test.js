const SimplePromise = require("./SimplePromise");

const mockAsync = (func) => {
  setTimeout(() => {
    func();
  }, 10);
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
      const p1 = SimplePromise.resolve({
        then: (onFulfilled) => {
          onFulfilled(value);
        },
      });

      expect(p1 instanceof SimplePromise).toBe(true);

      p1.then((v) => {
        expect(v).toBe(value);
      });
    });
  });

  describe("reject() method", () => {
    it("expect reason", () => {
      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      SimplePromise.reject(new Error(reason)).then(mockResolve, (err) => {
        expect(err.message).toBe(reason);
        mockReject();
      });

      expect(mockResolve).toHaveBeenCalledTimes(0);
      expect(mockReject).toHaveBeenCalledTimes(1);
    });
  });

  describe("finally() method", () => {
    it("execute given function", () => {
      const mock = jest.fn();
      SimplePromise.resolve(value)
        .then(mock)
        .finally(() => {
          expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    it("execute given function asynchronously", (done) => {
      const mock = jest.fn();

      new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      })
        .then(mock)
        .then(() => {
          return new SimplePromise((resolve) => {
            mockAsync(() => resolve(value));
          });
        })
        .then(mock)
        .finally(() => {
          expect(mock).toHaveBeenCalledTimes(2);
          done();
        });
    });
  });

  describe("chaining", () => {
    it("allows for then method chaining", (done) => {
      new SimplePromise((resolve) => {
        resolve("foo");
      })
        .then((v) => {
          expect(v).toBe("foo");
          return `${v}bar`;
        })
        .then((v2) => {
          expect(v2).toBe("foobar");
          return `${v2}baz`;
        })
        .then((v3) => {
          expect(v3).toBe(`foobarbaz`);
          done();
        });
    });

    it("allows for then method chaining with async tasks", (done) => {
      new SimplePromise((resolve) => {
        mockAsync(() => resolve("first"));
      })
        .then((v) => {
          expect(v).toBe("first");
          return "second";
        })
        .then((v) => {
          expect(v).toBe("second");
          return new SimplePromise((resolve) => {
            mockAsync(() => resolve("third"));
          });
        })
        .then((v) => {
          expect(v).toBe("third");
          done();
        });
    });

    it("allows for then and catch chaining", () => {
      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      SimplePromise.resolve(value)
        .then((v) => {
          expect(v).toBe(value);
          return SimplePromise.reject(reason);
        })
        .catch((r) => {
          expect(r).toBe(reason);
        })
        .then(mockResolve, mockReject);

      // after a catch the chain should be restored
      expect(mockResolve).toHaveBeenCalledTimes(1);
      expect(mockReject).toHaveBeenCalledTimes(0);
    });

    it("handles ordering properly", (done) => {
      const expected = ["last then is called!", "foobar", "foobarbaz"];
      const strings = [];

      SimplePromise.resolve("foo")
        // 1. Receive "foo", concatenate "bar" to it, and resolve that to the next then
        .then((string) => {
          return new SimplePromise((resolve) => {
            setTimeout(() => {
              string += "bar";
              resolve(string);
            }, 1);
          });
        })
        // 2. receive "foobar", register a callback function to work on that string
        // and print it to the console, but not before returning the unworked on
        // string to the next then
        .then((string) => {
          setTimeout(() => {
            string += "baz";
            strings.push(string);

            expect(expected).toEqual(strings);
            done();
          }, 1);

          return string;
        })
        // 3. add helpful messages about how the code in this section will be run
        // before the string is actually processed by the mocked asynchronous code in the
        // previous then block.
        .then((string) => {
          strings.push("last then is called!");

          // Note that `string` will not have the 'baz' bit of it at this point. This
          // is because we mocked that to happen asynchronously with a setTimeout function
          strings.push(string);
        });
    });
  });
});
