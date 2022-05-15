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
});
