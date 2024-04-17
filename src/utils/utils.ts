import { JavaScriptDataType } from "../types";

export function isNullUndefined(val: unknown): val is null | undefined {
	return val === null || val === undefined;
}

export function isNotNumber(
		val: unknown
): val is Exclude<JavaScriptDataType, number> {
	return typeof val !== "number";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSortedAscending(arr: any[]) {
	for (let i = 0; i < arr.length - 1; i++) {
		if (arr[i + 1].offset - arr[i].offset < 0) {
			return false;
		}
	}
	return true;
}

/** @see https://codereview.chromium.org/156833002/ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
