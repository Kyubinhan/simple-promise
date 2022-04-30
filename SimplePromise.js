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
    if (
      value instanceof SimplePromise ||
      (value && value.then) //  handle thenable
    ) {
      return value;
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

    const handleFulFill = (resolve, value) => {
      const returned = onFulfilled ? onFulfilled(value) : value;

      // Relay the returned value based on its type
      if (returned instanceof SimplePromise) {
        returned.then((v) => resolve(v));
      } else {
        resolve(returned);
      }
    };
    const handleReject = (reject, reason) => {
      onRejected(reason);
      reject(reason);
    };

    return new SimplePromise((resolve, reject) => {
      if (isResolvedSynchronously) {
        handleFulFill(resolve, this.#value);
      } else if (isRejectedSynchronously) {
        handleReject(reject, this.#reason);
      } else {
        // Schedule to run them later when resolved or rejected at some point
        this.#onFulfilled = (value) => {
          handleFulFill(resolve, value);
        };

        this.#onRejected = (reason) => {
          handleReject(reject, reason);
        };
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

// SimplePromise.resolve("foo").catch((reason) => {
//   console.log(reason);
// });

// SimplePromise.resolve()
//   .then(() => {
//     // Makes .then() return a rejected promise
//     throw new Error("Oh no!");
//   })
//   .then(
//     () => {
//       console.log("Not called.");
//     },
//     (error) => {
//       console.error("onRejected function called: " + error.message);
//     }
//   );
// .catch(() => {
// 	console.log('catch?')
// });
