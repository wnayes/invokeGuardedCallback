# invokeGuardedCallback

## Description

`invokeGuardedCallback` is a helper function that invokes a given callback,
capturing an error if it occurs:

```js
invokeGuardedCallback(
  () => {
    doWork();
  },
  (error) => {
    // Called if there is an error thrown during `doWork`
  }
);
```

This is similar to a `try`/`catch`:

```js
try {
  doWork();
} catch (error) {
  // Executes if there is an error thrown during `doWork`
}
```

The purpose of `invokeGuardedCallback` is to improve developer experience when debugging in DevTools.

When debugging JavaScript code, you typically want the debugger to be configured to "pause on exceptions." This ensures that, when there is an uncaught error, the debugger stops right when the error occurs. When a `try`/`catch` is used, it prevents pausing on any exceptions that occur within the `try` block. This behavior intends to be helpful; the debugger assumes that you aren't interested in pausing, since the `catch` block was set up to handle errors.

The debugger's heuristic is not always desirable. Imagine you are writing a JavaScript library that invokes code provided by developers. You might want to use a `try`/`catch` to handle any errors coming from that untrusted code. But the developers who provided the code may be frustrated with their own debugging experience. The library's `try`/`catch` would prevent "pause on exceptions" from working well for developers using the library.

`invokeGuardedCallback` invokes a callback in a way that captures errors while still allowing the debugger to pause directly on exceptions.

## Inspiration

This API is heavily inspired from React. React [has its own internal `invokeGuardedCallback` API](https://github.com/facebook/react/blob/main/packages/shared/invokeGuardedCallbackImpl.js) that is used to wrap calls into component code written by developers. It allows React to handle errors without adversely affecting debugging behavior for developers.

This package implements a similar API without any tie to React, generalizing the idea for reuse.

## Compatibility

The intent is to work in "most" browsers (anything reasonably modern) and fallback to `try`/`catch` for any unsupported browser. Internet Explorer 11 should work.

Node and Deno do _not_ work currently. They should fallback to `try`/`catch`.

## Installation

Install `invoke-guarded-callback` from npm.

    npm i invoke-guarded-callback

## Usage

### Basics

The most basic usage is shown below.

```js
const value = invokeGuardedCallback(
  () => computeValue(),
  (error) => {
    /* Do something with `error` */
  }
);
```

You might pass the `error` into some sort of logging/tracing infrastructure...

```js
const value = invokeGuardedCallback(
  () => computeValue(),
  (error) => Logger.log(error)
);
```

Or save and handle the error locally in the calling code...

```js
let invokeError;
const value = invokeGuardedCallback(
  () => computeValue(),
  (error) => {
    invokeError = error;
  }
);
if (invokeError) {
  // Recover/log the error.
  // Note that the return `value` will be undefined if there was an error.
}
```

### Tips

**Use `invokeGuardedCallback` for development only.** It is not recommended in production due to potential performance impact.

Consider some sort of check to see whether you are in production.

```js
if (process.env.NODE_ENV === "production") {
  // try/catch
} else {
  // invokeGuardedCallback
}
```

**Create your own wrapper API around `invokeGuardedCallback`.** Your wrapper can incorporate the production check mentioned above, for example. It could also help standardize how you log errors from untrusted callbacks across a codebase.

## How does it work?

The implementation is based around [EventTarget.dispatchEvent](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent). This API is traditionally used to dispatch events to DOM elements, and one of its characteristics is that errors won't propagate out of the `dispatchEvent` call. When errors do occur, they end up going to a global error handler (`window.onerror` or similar).

With this behavior, the clever trick (again, courtesy of React) is that we can:

1. Attach a global error handler.
2. Dispatch an event against an event target, where the event triggers an event handler that runs the callback.
3. If an error occurs in the callback, we can "catch" it in the global error handler.

## License

MIT License
