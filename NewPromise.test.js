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
    it('run success handler when resolved', () => {
      return NewPromise.resolve(value).then((v) => {
        expect(v).toBe(value);
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

    it('run success handler when resolved asynchronously', () => {
      return new NewPromise((resolve) => {
        mockAsync(() => resolve(value));
      }).then((v) => {
        expect(v).toBe(value);
      });
    });

    it('allows async/await to handle async task', async () => {
      const v = await new NewPromise((resolve) => {
        mockAsync(() => resolve(value));
      });

      expect(v).toBe(value);
    });

    it('run failure handler when rejected', () => {
      return new NewPromise((_, reject) => {
        reject(reason);
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
      });
    });

    it('run failure handler when rejected asynchronously', () => {
      return new NewPromise((_, reject) => {
        mockAsync(() => reject(reason));
      }).then(undefined, (r) => {
        expect(r).toBe(reason);
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

    it.skip('demonstrating asynchronicity of the then method', (done) => {
      const p = new NewPromise((resolve, reject) => {
        resolve(33);
      }).then(() => {
        throw 'error!';
      });

      console.log(p); // p is pending
      p.then(null, console.log); // log 'error!'
      setTimeout(() => {
        console.log(p); // p is now rejected
        done();
      }, 0);
    });

    it('allows chaining where handlers return pending promises', () => {
      return new NewPromise((resolve) => {
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
