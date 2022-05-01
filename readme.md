### SimplePromise: Simplified version of Javascript's Promise class

this class implements the following methods:

- new Promise(executor)
- Promise.all(iterable)
- Promise.resolve(reason)
- Promise.reject(value)
- Promise.prototype.then(func)
- Promise.prototype.catch(func)
- Promise.prototype.finally(func)

all the specification of Promise can be found [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

Note: The code is not transpiled into ES5 so it may not run on outdated browsers.
