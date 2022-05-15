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

    const resolve = this._resolveToSettle;
    const reject = this._rejectToSettle;

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

  _resolveToSettle = (value) => {
    if (this._state === STATE.PENDING) {
      this._state = STATE.FULFILLED;
      this._value = value;

      if (this._thingsToHandleOnceSettled) {
        const [childPromise, onFulfilled] = this._thingsToHandleOnceSettled;
        this._handleOnFulfilled(childPromise, onFulfilled, value);
      }
    }
  };

  _rejectToSettle = (reason) => {
    if (this._state === STATE.PENDING) {
      this._state = STATE.REJECTED;
      this._reason = reason;

      if (this._thingsToHandleOnceSettled) {
        const [childPromise, _, onRejected] = this._thingsToHandleOnceSettled;
        this._handleOnRejected(childPromise, onRejected, reason);
      }
    }
  };

  static resolve(value) {
    return new NewPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new NewPromise((_, reject) => reject(reason));
  }

  then = (_onFulfilled, _onRejected) => {
    const onFulfilled =
      typeof _onFulfilled === 'function' ? _onFulfilled : (value) => value;
    const onRejected =
      typeof _onRejected === 'function'
        ? _onRejected
        : (e) => {
            throw e;
          };

    const promiseToReturn = new NewPromise(noop);

    const isResolvedSynchronously = this._state === STATE.FULFILLED;
    const isRejectedSynchronously = this._state === STATE.REJECTED;

    if (isResolvedSynchronously) {
      // Queue onFulfilled task in microtask queue
      queueMicrotask(() => {
        this._handleOnFulfilled(promiseToReturn, onFulfilled, this._value);
      });
    } else if (isRejectedSynchronously) {
      // Queue onRejected task in microtask queue
      queueMicrotask(() => {
        this._handleOnRejected(promiseToReturn, onRejected, this._reason);
      });
    } else {
      this._thingsToHandleOnceSettled = [
        promiseToReturn,
        onFulfilled,
        onRejected,
      ];
    }

    return promiseToReturn;
  };

  catch = (onRejected) => {
    return this.then(undefined, onRejected);
  };
}

module.exports = NewPromise;
