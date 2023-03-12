import * as mod from "../index.mjs";
import { executeTests } from "./tests.mjs";

let count = 0;
function addTestResult(passed) {
  count++;
  console.log("Test " + count + (passed ? " Passed" : " Failed!"));
}

function runTest(fn) {
  addTestResult(fn());
}

setTimeout(() => {
  executeTests(runTest, mod);
}, 0);
