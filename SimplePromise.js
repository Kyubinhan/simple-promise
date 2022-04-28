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
    } else if (value && value.then) {
      return new SimplePromise(value.then);
    }

    return new SimplePromise((resolve) => {
      resolve(value);
    });
  }

  then(onFulfilled, onRejected) {
    if (this.#state === "fulfilled" /* synchronously resolved */) {
      const returned = onFulfilled(this.#value);

      return SimplePromise.resolve(returned);
    } else if (this.#state === "rejected" /* synchronously rejected */) {
      onRejected(this.#reason);
    } else {
      // hasn't been resolved or rejected yet so save them to invoke later
      this.#onFulfilled = onFulfilled;
      this.#onRejected = onRejected;

      console.log(this);
    }
  }

  catch(onRejected) {
    this.then(undefined, onRejected);
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
