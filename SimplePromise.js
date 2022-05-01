/**
 * Represents the completion of an asynchronous operation
 */
class SimplePromise {
  #state = 'pending';
  #value;
  #reason;
  #onFulfilled;
  #onRejected;
  #onFinally;

  /**
   * @param {Function} executor A callback used to initialize the promise.
   */
  constructor(executor) {
    const resolve = (value) => {
      this.#state = 'fulfilled';

      this.#value = value;

      if (this.#onFulfilled) {
        this.#onFulfilled(value);
      }

      if (this.#onFinally) {
        this.#onFinally(value, null);
      }
    };
    const reject = (reason) => {
      this.#state = 'rejected';

      this.#reason = reason;

      if (this.#onRejected) {
        this.#onRejected(reason);
      }

      if (this.#onFinally) {
        this.#onFinally(null, reason);
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  /**
   * Creates a Promise that is resolved with an array of results when all of the
   * provided Promises resolve, or rejected when any Promise is rejected.
   *
   * @param {Array} iterable An iterable of Promises.
   *
   * @returns A new Promise.
   */
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
        if (value instanceof SimplePromise) {
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

  /**
   * Creates a new resolved promise for the provided value.
   * @param value A promise.
   *
   * @returns A promise whose internal state matches the provided promise..
   */
  static resolve(value) {
    if (value instanceof SimplePromise) {
      return value;
    } else if (value?.then /* handle thenable */) {
      return new SimplePromise(value.then);
    }

    // Turn non-promise value into a promise
    return new SimplePromise((resolve) => {
      resolve(value);
    });
  }

  /**
   * Creates a new rejected promise for the provided reason.
   *
   * @param reason The reason the promise was rejected.
   *
   * @returns A new rejected Promise.
   */
  static reject(reason) {
    return new SimplePromise((_, reject) => {
      reject(reason);
    });
  }

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   *
   * @param onFulfilled The callback to execute when the Promise is resolved.
   * @param onRejected The callback to execute when the Promise is rejected.
   *
   * @returns A Promise for the completion of which ever callback is executed.
   */
  then(onFulfilled, onRejected) {
    const isResolvedSynchronously = this.#state === 'fulfilled';
    const isRejectedSynchronously = this.#state === 'rejected';
    const isCatchChained = !onFulfilled && onRejected;

    const handleFulFill = (resolve, reject, value) => {
      const returned = onFulfilled ? onFulfilled(value) : value;

      // Relay the returned value based on its type
      if (returned instanceof SimplePromise) {
        returned.then(resolve, reject);
      } else {
        resolve(returned);
      }
    };
    const handleReject = (resolve, reject, reason) => {
      onRejected?.(reason);

      if (isCatchChained) {
        // After a catch the chain is restored hence resolve it
        resolve();
      } else {
        reject(reason);
      }
    };

    return new SimplePromise((resolve, reject) => {
      if (isResolvedSynchronously) {
        handleFulFill(resolve, reject, this.#value);
      } else if (isRejectedSynchronously) {
        handleReject(resolve, reject, this.#reason);
      } else {
        // Schedule to run later when resolved or rejected at some point
        this.#onFulfilled = (value) => handleFulFill(resolve, reject, value);
        this.#onRejected = (reason) => handleReject(resolve, reject, reason);
      }
    });
  }

  /**
   * Attaches a callback for only the rejection of the Promise.
   *
   * @param onRejected The callback to execute when the Promise is rejected.
   *
   * @returns A Promise for the completion of the callback.
   */
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  /**
   * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
   * The resolved value cannot be modified from the callback.
   *
   * @param onFinally The callback to execute when the Promise is settled (fulfilled or rejected).
   *
   * @returns A Promise for the completion of the callback.
   */
  finally(onFinally) {
    const isPending = this.#state === 'pending';

    const handleFinally = (resolve, reject, value, reason) => {
      onFinally?.();

      if (value) {
        resolve(value);
      } else if (reason) {
        reject(reason);
      }
    };

    return new SimplePromise((resolve, reject) => {
      if (isPending) {
        this.#onFinally = (value, reason) =>
          handleFinally(resolve, reject, value, reason);
      } else {
        handleFinally(resolve, reject, this.#value, this.#reason);
      }
    });
  }
}

module.exports = SimplePromise;
