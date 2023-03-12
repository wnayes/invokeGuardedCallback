/**
 * Executes a few test cases for invokeGuardedCallback
 * @param {(testCase: VoidFunction) => boolean} runTest Test runner method
 * @param invokeGuardedCallbackModule Implementation of invokeGuardedCallback
 */
export function executeTests(runTest, invokeGuardedCallbackModule) {
  const invokeGuardedCallback =
    invokeGuardedCallbackModule.invokeGuardedCallback;
  const withinGuardedCallback =
    invokeGuardedCallbackModule.withinGuardedCallback;
  const guardedCallbackSupported =
    invokeGuardedCallbackModule.guardedCallbackSupported;

  console.log("guardedCallbackSupported() => ", guardedCallbackSupported());

  // Basic functionality.
  runTest(function () {
    let err1;
    invokeGuardedCallback(
      function () {
        throw new Error("Simulated error");
      },
      function (err) {
        err1 = err;
        console.log("onError received error", err);
      }
    );
    return !!err1;
  });

  // Inner guard runs, outer guard does not.
  runTest(function () {
    let errInner, errOuter;
    invokeGuardedCallback(
      function () {
        invokeGuardedCallback(
          function () {
            throw new Error("Simulated error nested");
          },
          function (err) {
            errInner = err;
            console.log("onError received error", err);
          }
        );
      },
      function (err) {
        errOuter = err;
        console.error("onError received error", err);
      }
    );
    return !!errInner && !errOuter;
  });

  // Rethrow
  runTest(function () {
    let errInner, errOuter;
    invokeGuardedCallback(
      function () {
        invokeGuardedCallback(
          function () {
            throw new Error("Simulated error nested + rethrown");
          },
          function (err) {
            errInner = err;
            console.log("onError received error", err);
            throw err;
          }
        );
      },
      function (err) {
        errOuter = err;
        console.log("onError received error", err);
      }
    );
    return !!errInner && !!errOuter;
  });

  // Basic behavior of withinGuardedCallback
  runTest(function () {
    let within1, within2, err1;

    within1 = withinGuardedCallback();
    invokeGuardedCallback(
      function () {
        within2 = withinGuardedCallback();
      },
      function (err) {
        err1 = err;
        console.error("onError received error", err);
      }
    );
    return !within1 && within2 && !err1;
  });

  // onError is not considered "within" guarded callback.
  runTest(function () {
    let within, err1;
    invokeGuardedCallback(
      function () {
        throw new Error("Simulated error");
      },
      function (err) {
        within = withinGuardedCallback();
        err1 = err;
        console.log("onError received error", err);
      }
    );
    return !within && !!err1;
  });
}
