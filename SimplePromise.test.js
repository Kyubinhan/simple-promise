// const SimplePromise = Promise; // test with Real Promise class
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
      })
        .catch(mock)
        .finally(mock);

      expect(mock).toHaveBeenCalledTimes(2);
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
    it("allows for method chaining", (done) => {
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

    it("allows for method chaining for async tasks", (done) => {
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

    it("catch", (done) => {
      const p1 = new SimplePromise(function (resolve, reject) {
        resolve("Success");
      });

      // The following behaves the same as above
      p1.then(function (value) {
        console.log(value); // "Success!"
        return SimplePromise.reject("oh, no!");
      })
        .catch(function (e) {
          console.error(e); // "oh, no!"
          done();
        })
        .then(
          function () {
            console.log("after a catch the chain is restored");
            done();
          },
          function () {
            console.log("Not fired due to the catch");
          }
        );
    });

    it.skip("fun ordering test", (done) => {
      SimplePromise.resolve("foo")
        // 1. Receive "foo", concatenate "bar" to it, and resolve that to the next then
        .then(function (string) {
          return new SimplePromise(function (resolve, reject) {
            setTimeout(function () {
              string += "bar";
              resolve(string);
            }, 1);
          });
        })
        // 2. receive "foobar", register a callback function to work on that string
        // and print it to the console, but not before returning the unworked on
        // string to the next then
        .then(function (string) {
          setTimeout(function () {
            string += "baz";
            console.log(string); // foobarbaz

            done();
          }, 1);

          return string;
        })
        // 3. print helpful messages about how the code in this section will be run
        // before the string is actually processed by the mocked asynchronous code in the
        // previous then block.
        .then(function (string) {
          console.log(
            "Last Then:  oops... didn't bother to instantiate and return " +
              "a promise in the prior then so the sequence may be a bit " +
              "surprising"
          );

          // Note that `string` will not have the 'baz' bit of it at this point. This
          // is because we mocked that to happen asynchronously with a setTimeout function
          console.log(string); // foobar
        });

      // logs, in order:
      // Last Then: oops... didn't bother to instantiate and return a promise in the prior then so the sequence may be a bit surprising
      // foobar
      // foobarbaz
    });
  });
});
