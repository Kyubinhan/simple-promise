// const NewPromise = Promise;
const NewPromise = require('./NewPromise');

const mockAsync = (func) => {
  setTimeout(() => {
    func();
  }, 10);
};

describe('NewPromise', () => {
  const value = 'Awesome value';
  const reason = 'Unlawful reason';

  describe('then() method', () => {
    it('run success handler when resolved', (done) => {
      NewPromise.resolve(value).then((v) => {
        expect(v).toBe(value);
        done();
      });
    });

    it('run success handler asynchronously', (done) => {
      const result = [];

      NewPromise.resolve(value).then(() => {
        result.push('first?');
        expect(result).toEqual(['second?', 'first?']);
        done();
      });

      result.push('second?');
    });

    it('run success handler when resolved asynchronously', (done) => {
      new NewPromise((resolve) => {
        mockAsync(() => resolve(value));
      }).then((v) => {
        expect(v).toBe(value);
        done();
      });
    });

    it('allows async/await to handle async task', async () => {
      const v = await new NewPromise((resolve) => {
        mockAsync(() => resolve(value));
      });

      expect(v).toBe(value);
    });

    it('run failure handler when rejected', (done) => {
      new NewPromise((_, reject) => {
        reject(reason);
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
        done();
      });
    });

    it('run failure handler when rejected asynchronously', (done) => {
      new NewPromise((_, reject) => {
        mockAsync(() => reject(reason));
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
        done();
      });
    });

    it('throw reason when rejected asynchronously with async & await', async () => {
      try {
        await new NewPromise((_, reject) => {
          mockAsync(() => reject(reason));
        });
      } catch (r) {
        expect(r).toBe(reason);
      }
    });

    it.skip('demonstrates asynchronicity of the then method', (done) => {
      const p = NewPromise.resolve().then(() => {
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
      new NewPromise((resolve) => {
        mockAsync(() => resolve('first'));
      })
        .then((v) => {
          expect(v).toBe('first');
          return 'second';
        })
        .then((v) => {
          expect(v).toBe('second');
          return new NewPromise((resolve) => {
            mockAsync(() => resolve('third'));
          });
        })
        .then((v) => {
          expect(v).toBe('third');
          done();
        });
    });

    it('allows chaining where onRejected handlers return pending promises', (done) => {
      new NewPromise((_, reject) => {
        mockAsync(() => reject('first'));
      })
        .then(undefined, (r) => {
          expect(r).toBe('first');
          return NewPromise.reject('second');
        })
        .then(undefined, (r) => {
          expect(r).toBe('second');
          return new NewPromise((_, reject) => {
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

      NewPromise.resolve(value)
        .then((v) => {
          expect(v).toBe(value);
          return NewPromise.reject(reason);
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
      NewPromise.resolve(3)
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
      NewPromise.resolve(3)
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
        NewPromise.all(undefined);
      } catch (err) {
        expect(err.message).toBe('Cannot convert undefined or null to object');
      }
    });

    it('resolve an array of results', (done) => {
      const p1 = NewPromise.resolve(3);
      const p2 = new NewPromise((resolve) => {
        mockAsync(() => resolve(value));
      });
      const p3 = 42;

      NewPromise.all([p1, p2, p3]).then((values) => {
        expect(values).toEqual([3, value, 42]);
        done();
      });
    });

    it('fail fast when any of elements are rejected', (done) => {
      const p1 = NewPromise.resolve(3);
      const p2 = new NewPromise((resolve) => {
        mockAsync(() => resolve(value));
      });
      const p3 = NewPromise.reject(reason);

      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      NewPromise.all([p1, p2, p3]).then(mockResolve).catch(mockReject);

      setTimeout(() => {
        expect(mockResolve).toHaveBeenCalledTimes(0);
        expect(mockReject).toHaveBeenCalledTimes(1);
        expect(mockReject).toHaveBeenCalledWith(reason);
        done();
      }, 0);
    });
  });
});
