const noop = () => {};

const STATE = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
};

const isThenable = (arg) => arg && typeof arg.then === 'function';

class SimplePromise {
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

  _resolveToSettle = (value) => {
    if (this._state === STATE.PENDING) {
      this._state = STATE.FULFILLED;
      this._value = value;

      if (this._thingsToHandleOnceSettled) {
        const [childPromise, onFulfilled] = this._thingsToHandleOnceSettled;
        this._executeHandler(childPromise, onFulfilled, value);
      }
    }
  };

  _rejectToSettle = (reason) => {
    if (this._state === STATE.PENDING) {
      this._state = STATE.REJECTED;
      this._reason = reason;

      if (this._thingsToHandleOnceSettled) {
        const [childPromise, _, onRejected] = this._thingsToHandleOnceSettled;
        this._executeHandler(childPromise, onRejected, reason);
      }
    }
  };

  _executeHandler(promise, handler, valueOrReason) {
    // Queue handler task in microtask queue
    queueMicrotask(() => {
      try {
        const valueOrError = handler(valueOrReason);
        if (isThenable(valueOrError)) {
          valueOrError.then(
            (v) => promise._resolveToSettle(v),
            (r) => promise._rejectToSettle(r)
          );
        } else {
          promise._resolveToSettle(valueOrError);
        }
      } catch (err) {
        promise._rejectToSettle(err);
      }
    });
  }

  static resolve(value) {
    return new SimplePromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new SimplePromise((_, reject) => reject(reason));
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

    const promiseToReturn = new SimplePromise(noop);

    const isResolvedRightAway = this._state === STATE.FULFILLED;
    const isRejectedRightAway = this._state === STATE.REJECTED;

    if (isResolvedRightAway) {
      this._executeHandler(promiseToReturn, onFulfilled, this._value);
    } else if (isRejectedRightAway) {
      this._executeHandler(promiseToReturn, onRejected, this._reason);
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

  finally = (onFinally) => {
    const handler = (valueOrReason) => {
      onFinally?.();
      return valueOrReason;
    };

    return this.then(handler, handler);
  };

  static all(iterable) {
    const values = Object.values(iterable);

    let numOfResolved = 0;
    const resolvedMap = {};
    const handleResolve = (resolve, value, idx) => {
      resolvedMap[idx] = value;
      numOfResolved++;
      if (numOfResolved === values.length) {
        // Order is kept thx to indexed properties
        resolve(Object.values(resolvedMap));
      }
    };

    return new SimplePromise((resolve, reject) => {
      values.forEach((value, idx) => {
        if (isThenable(value)) {
          value.then(
            (v) => {
              handleResolve(resolve, v, idx);
            },
            (r) => {
              reject(r);
            }
          );
        } else {
          handleResolve(resolve, value, idx);
        }
      });
    });
  }
}

module.exports = SimplePromise;
