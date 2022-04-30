class SimplePromise {
  #state = "pending";
  #value;
  #reason;
  #onFulfilled;
  #onRejected;
  #onFinally;

  constructor(executor) {
    const resolve = (value) => {
      this.#state = "fulfilled";

      this.#value = value;

      if (this.#onFulfilled) {
        this.#onFulfilled(value);
      }

      if (this.#onFinally) {
        this.#onFinally();
      }
    };
    const reject = (reason) => {
      this.#state = "rejected";

      this.#reason = reason;

      if (this.#onRejected) {
        this.#onRejected(reason);
      }

      if (this.#onFinally) {
        this.#onFinally();
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  static resolve(value) {
    if (value instanceof SimplePromise) {
      return value;
    } else if (value && value.then /* handle thenable */) {
      return new SimplePromise(value.then);
    }

    // Turn non-promise value into a promise
    return new SimplePromise((resolve) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new SimplePromise((_, reject) => {
      reject(reason);
    });
  }

  then(onFulfilled, onRejected) {
    const isResolvedSynchronously = this.#state === "fulfilled";
    const isRejectedSynchronously = this.#state === "rejected";
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
      onRejected && onRejected(reason);

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
        // Schedule to run them later when resolved or rejected at some point
        this.#onFulfilled = (value) => handleFulFill(resolve, reject, value);
        this.#onRejected = (reason) => handleReject(resolve, reject, reason);
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    if (this.#state === "pending") {
      this.#onFinally = onFinally;
    } else {
      onFinally();
    }
  }
}

module.exports = SimplePromise;
