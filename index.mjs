/** Name of the fake event raised to invoke the callback. */
const EventType = "invokeguardedcallback-event";

let globalRef;
if (typeof globalThis !== "undefined") {
  globalRef = globalThis;
} else if (typeof window !== "undefined") {
  globalRef = window;
}

function globalErrorHandler(event) {
  const lastCallData = peekCallDataStack();
  lastCallData.error = event.error;
  lastCallData.errorSet = true;
  event.preventDefault();
}

function updateErrorHandler(attach) {
  if (attach) {
    globalRef.addEventListener("error", globalErrorHandler);
  } else {
    globalRef.removeEventListener("error", globalErrorHandler);
  }
}

function createEventFromCtor(eventType) {
  return new Event(eventType);
}

function createEventFromDocument(eventType) {
  const event = document.createEvent("Event");
  event.initEvent(eventType, false, false);
  return event;
}

function supportsDocumentCreateEvent() {
  if (
    typeof document !== "object" ||
    typeof document.createEvent !== "function"
  ) {
    return false;
  }
  try {
    createEventFromDocument("t");
    return true;
  } catch (_) {
    return false;
  }
}

function supportsEventConstructor() {
  try {
    new Event(EventType);
    return true;
  } catch (_) {
    return false;
  }
}

/** @returns {EventTarget | null} */
function createEventTarget() {
  if (typeof EventTarget !== "undefined") {
    try {
      const target = new EventTarget();
      let dispatchWorks = false;
      function cb() {
        dispatchWorks = true;
      }
      target.addEventListener(EventType, cb);
      target.dispatchEvent(new Event(EventType));
      target.removeEventListener(EventType, cb);
      if (dispatchWorks) {
        return target;
      }
    } catch (_) {}
  }
  return null;
}

/** @type {EventTarget} */
let eventTarget;
let createEvent;
if (supportsEventConstructor()) {
  createEvent = createEventFromCtor;
  eventTarget = createEventTarget();
} else if (supportsDocumentCreateEvent()) {
  createEvent = createEventFromDocument;
}

if (!eventTarget && typeof document === "object") {
  eventTarget = document.createElement("invoke");
}

const hasGlobalErrorHandling = !!globalRef && "onerror" in globalRef;

const supported =
  hasGlobalErrorHandling &&
  !!createEvent &&
  !!eventTarget &&
  !("Deno" in globalRef);

/**
 * @typedef InvokeState
 * @type {object}
 * @property {unknown} error - Error (or really any value) thrown from the callback.
 * @property {boolean} errorSet - True if a thrown value was successfully captured.
 * @property {boolean} calledCallback - True if we did invoke the callback.
 * @property {boolean} encounteredError - True if something went wrong during callback invocation.
 */

/** @type {InvokeState[]} Call data objects for the currently active invokeGuardedCallback calls. */
const stack = [];

/** Tracks whether we are inside a invokeGuardedCallbackFallback call. */
let fallbackCounter = 0;

export function guardedCallbackSupported() {
  return supported;
}

export function withinGuardedCallback() {
  return stack.length > 0 || fallbackCounter > 0;
}

export function invokeGuardedCallback(callback, onError) {
  if (!supported) {
    return invokeGuardedCallbackFallback(callback, onError);
  }

  let result;

  /** @type {InvokeState} */
  const callData = {
    error: null,
    errorSet: false,
    calledCallback: false,
    encounteredError: true,
  };
  stack.push(callData);

  function detachTargetHandler() {
    eventTarget.removeEventListener(EventType, invoke);
  }

  function invoke() {
    callData.calledCallback = true;
    detachTargetHandler();
    result = callback();
    callData.encounteredError = false;
  }

  try {
    updateErrorHandler(false);
    updateErrorHandler(true);

    eventTarget.addEventListener(EventType, invoke);
    eventTarget.dispatchEvent(createEvent(EventType));
  } finally {
    stack.pop();

    // Detach the global error handler as soon as we're done, since we want
    // to let `onError` be able to rethrow.
    if (stack.length === 0) {
      updateErrorHandler(false);
    }
  }

  if (!callData.calledCallback) {
    detachTargetHandler();
    return invokeGuardedCallbackFallback(callback, onError);
  } else if (callData.calledCallback && callData.encounteredError) {
    let error = callData.error;
    if (!callData.errorSet) {
      // The callback errored, but the error event never fired.
      error = new Error(
        "An error was thrown, but it was not able to be captured."
      );
    }

    // Invoke the given onError handler with the error.
    // The handler may choose to rethrow the error.
    onError(error);
  }

  return result;
}

function peekCallDataStack() {
  return stack[stack.length - 1] || null;
}

function invokeGuardedCallbackFallback(callback, onError) {
  try {
    try {
      fallbackCounter++;
      return callback();
    } finally {
      fallbackCounter--;
    }
  } catch (e) {
    onError(e);
  }
}
