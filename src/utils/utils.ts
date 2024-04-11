import { JavaScriptDataType } from "../types";

export function isNullUndefined(val: unknown): val is null | undefined {
  return val === null || val === undefined;
}

export function isNotNumber(
  val: unknown
): val is Exclude<JavaScriptDataType, number> {
  return typeof val !== "number";
}

const value: unknown = "123";

if (isNotNumber(value)) {
  console.log("The value is not a number. ", value);
} else {
  console.log("The value is a number.");
}

export function isSortedAscending(arr: any[]) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i + 1].offset - arr[i].offset < 0) {
      return false;
    }
  }
  return true;
}

/** @see https://codereview.chromium.org/156833002/ */
export function getPixelRatio(ctx: any) {
  const dpr = window.devicePixelRatio || 1;
  const bsr =
    ctx.webkitBackingStorePixelRatio ||
    ctx.mozBackingStorePixelRatio ||
    ctx.msBackingStorePixelRatio ||
    ctx.oBackingStorePixelRatio ||
    ctx.backingStorePixelRatio ||
    1;

  return dpr / bsr;
}
