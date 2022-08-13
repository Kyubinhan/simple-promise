// const SimplePromise = Promise;
const SimplePromise = require('./SimplePromise');

const mockAsync = (func) => {
  setTimeout(() => {
    func();
  }, 10);
};

describe('SimplePromise', () => {
  const value = 'Awesome value';
  const reason = 'Unlawful reason';

  describe('then() method', () => {
    it('run success handler when resolved', (done) => {
      SimplePromise.resolve(value).then((v) => {
        expect(v).toBe(value);
        done();
      });
    });

    it('run success handler asynchronously', (done) => {
      const result = [];

      SimplePromise.resolve(value).then(() => {
        result.push('first?');
        expect(result).toEqual(['second?', 'first?']);
        done();
      });

      result.push('second?');
    });

    it('run success handler when resolved asynchronously', (done) => {
      new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      }).then((v) => {
        expect(v).toBe(value);
        done();
      });
    });

    it('allows async/await to handle async task', async () => {
      const v = await new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      });

      expect(v).toBe(value);
    });

    it('run failure handler when rejected', (done) => {
      new SimplePromise((_, reject) => {
        reject(reason);
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
        done();
      });
    });

    it('run failure handler when rejected asynchronously', (done) => {
      new SimplePromise((_, reject) => {
        mockAsync(() => reject(reason));
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
        done();
      });
    });

    it('throw reason when rejected asynchronously with async & await', async () => {
      try {
        await new SimplePromise((_, reject) => {
          mockAsync(() => reject(reason));
        });
      } catch (r) {
        expect(r).toBe(reason);
      }
    });

    it.skip('demonstrates asynchronicity of the then method', (done) => {
      const p = SimplePromise.resolve().then(() => {
        throw reason;
      });

      expect(p._state).toBe('pending');

      p.then(null, (r) => {
        expect(r).toBe(reason);
      });

      setTimeout(() => {
        expect(p._state).toBe('rejected');
        done();
      }, 0);
    });

    it('allows chaining where onFulfilled handlers return pending promises', (done) => {
      new SimplePromise((resolve) => {
        mockAsync(() => resolve('first'));
      })
        .then((v) => {
          expect(v).toBe('first');
          return 'second';
        })
        .then((v) => {
          expect(v).toBe('second');
          return new SimplePromise((resolve) => {
            mockAsync(() => resolve('third'));
          });
        })
        .then((v) => {
          expect(v).toBe('third');
          done();
        });
    });

    it('allows chaining where onRejected handlers return pending promises', (done) => {
      new SimplePromise((_, reject) => {
        mockAsync(() => reject('first'));
      })
        .then(undefined, (r) => {
          expect(r).toBe('first');
          return SimplePromise.reject('second');
        })
        .then(undefined, (r) => {
          expect(r).toBe('second');
          return new SimplePromise((_, reject) => {
            mockAsync(() => reject('third'));
          });
        })
        .then(undefined, (r) => {
          expect(r).toBe('third');
          done();
        });
    });

    it('allows chaining with catch', (done) => {
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

      setTimeout(() => {
        // after a catch the chain should be restored
        expect(mockResolve).toHaveBeenCalledTimes(1);
        expect(mockReject).toHaveBeenCalledTimes(0);
        done();
      }, 0);
    });
  });

  describe('finally() method', () => {
    it('run handler without any given argument', (done) => {
      SimplePromise.resolve(3)
        .then(() => value)
        .finally((arg) => {
          expect(arg).toBe(undefined);
        })
        .then((v) => {
          expect(v).toBe(value);
          done();
        });
    });

    it('reject the new promise with the reason when error thrown in the handler', (done) => {
      SimplePromise.resolve(3)
        .then(() => value)
        .finally(() => {
          throw reason;
        })
        .then(undefined, (r) => {
          expect(r).toBe(reason);
          done();
        });
    });
  });

  describe('all() method', () => {
    it('throw error if given param is not iterable', () => {
      try {
        SimplePromise.all(undefined);
      } catch (err) {
        expect(err.message).toBe('Cannot convert undefined or null to object');
      }
    });

    it('resolve an array of results', (done) => {
      const p1 = SimplePromise.resolve(3);
      const p2 = new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      });
      const p3 = 42;

      SimplePromise.all([p1, p2, p3]).then((values) => {
        expect(values).toEqual([3, value, 42]);
        done();
      });
    });

    it('fail fast when any of elements are rejected', (done) => {
      const p1 = SimplePromise.resolve(3);
      const p2 = new SimplePromise((resolve) => {
        mockAsync(() => resolve(value));
      });
      const p3 = SimplePromise.reject(reason);

      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      SimplePromise.all([p1, p2, p3]).then(mockResolve).catch(mockReject);

      setTimeout(() => {
        expect(mockResolve).toHaveBeenCalledTimes(0);
        expect(mockReject).toHaveBeenCalledTimes(1);
        expect(mockReject).toHaveBeenCalledWith(reason);
        done();
      }, 0);
    });
  });
});
