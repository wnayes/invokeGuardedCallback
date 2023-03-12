/**
 * Invokes a callback in a way that captures errors, while still allowing the
 * debugger to pause directly on exceptions.
 * @param callback Callback to invoke.
 * @param onError Error handler callback invoked when `callback` throws.
 * @returns The return value of `callback` if there is no error, `undefined`
 * otherwise.
 */
export function invokeGuardedCallback<TRet>(
  callback: () => TRet,
  onError: (err: unknown) => void
): TRet | undefined;

/**
 * Returns true if the call stack is currently within some callback that is
 * being invoked from `invokeGuardedCallback`.
 *
 * You might consider using this from your own global error handlers to
 * distinguish between "real" errors and ones that are thrown as part of
 * the internal workings of `invokeGuardedCallback`.
 */
export function withinGuardedCallback(): boolean;

/**
 * Returns true if `invokeGuardedCallback` is supported by the runtime.
 *
 * Even when this is false, you can call it and expect to fallback to
 * `try`/`catch`.
 */
export function guardedCallbackSupported(): boolean;
