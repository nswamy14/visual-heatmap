import { JavaScriptDataType } from "../types";
export declare function isNullUndefined(val: unknown): val is null | undefined;
export declare function isNotNumber(val: unknown): val is Exclude<JavaScriptDataType, number>;
export declare function isSortedAscending(arr: any[]): boolean;
/** @see https://codereview.chromium.org/156833002/ */
export declare function getPixelRatio(ctx: any): number;
