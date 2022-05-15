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
  });
});
