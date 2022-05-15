const noop = () => {};

const STATE = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
};

const isThenable = (arg) => arg && arg.then;

class NewPromise {
  constructor(executor) {
    if (!executor) {
      throw new TypeError('Please provide executor');
    }

    this._state = STATE.PENDING;

    const resolve = this._resolveToSettle.bind(this);
    const reject = this._rejectToSettle.bind(this);

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  _handleOnFulfilled(promise, onFulfilled, value) {
    try {
      const valueOrError = onFulfilled(value);
      if (isThenable(valueOrError)) {
        valueOrError.then(
          (v) => {
            promise._resolveToSettle(v);
          },
          (r) => {
            promise._rejectToSettle(r);
          }
        );
      } else {
        promise._resolveToSettle(valueOrError);
      }
    } catch (err) {
      promise._rejectToSettle(err);
    }
  }

  _handleOnRejected(promise, onRejected, reason) {
    try {
      const valueOrError = onRejected(reason);
      promise._resolveToSettle(valueOrError);
    } catch (err) {
      promise._rejectToSettle(err);
    }
  }

  _resolveToSettle(value) {
    if (this._state === STATE.PENDING) {
      this._state = STATE.FULFILLED;
      this._value = value;

      if (this._pending) {
        const [childPromise, onFulfilled] = this._pending;
        this._handleOnFulfilled(childPromise, onFulfilled, value);
      }
    }
  }

  _rejectToSettle(reason) {
    if (this._state === STATE.PENDING) {
      this._state = STATE.REJECTED;
      this._reason = reason;

      if (this._pending) {
        const [childPromise, _, onRejected] = this._pending;
        this._handleOnRejected(childPromise, onRejected, reason);
      }
    }
  }

  static resolve(value) {
    return new NewPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new NewPromise((_, reject) => reject(reason));
  }

  then(onFulfilled, onRejected) {
    onFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (e) => {
            throw e;
          };

    const promiseToReturn = new NewPromise(noop);

    if (this._state === STATE.FULFILLED) {
      setTimeout(() => {
        this._handleOnFulfilled(promiseToReturn, onFulfilled, this._value);
      }, 0);
    } else if (this._state === STATE.REJECTED) {
      setTimeout(() => {
        this._handleOnRejected(promiseToReturn, onRejected, this._reason);
      }, 0);
    } else {
      this._pending = [promiseToReturn, onFulfilled, onRejected];
    }

    return promiseToReturn;
  }
}

module.exports = NewPromise;

const foo = new NewPromise((resolve, reject) => {
  resolve(33);
}).then(() => {
  throw 'error!';
});

console.log(foo);
foo.then(null, console.log);
setTimeout(() => {
  console.log(foo);
}, 0);
