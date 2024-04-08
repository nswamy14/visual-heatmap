import { GradientStop } from "../types";

export function isNullUndefined(val: unknown): val is null | undefined {
  return val === null || val === undefined;
}

export function isNotNumber(
  val: unknown
): val is string | object | boolean | symbol {
  return typeof val !== "number";
}

export function isSortedAscending(arr: GradientStop[]): boolean {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i + 1].offset - arr[i].offset < 0) {
      return false;
    }
  }
  return true;
}

export function gradientMapper(grad: GradientStop[]): {
  value: Float32Array;
  length: number;
  offset: number[];
} {
  if (!Array.isArray(grad) || grad.length < 2) {
    throw new Error(
      "Invalid gradient: Expected an array with at least 2 elements."
    );
  }

  if (!isSortedAscending(grad)) {
    throw new Error("Invalid gradient: Gradient is not sorted");
  }

  const gradLength = grad.length;
  const values = new Float32Array(gradLength * 4);
  const offsets = new Array(gradLength);

  grad.forEach(function (d, i) {
    const baseIndex = i * 4;
    values[baseIndex] = d.color[0] / 255;
    values[baseIndex + 1] = d.color[1] / 255;
    values[baseIndex + 2] = d.color[2] / 255;
    values[baseIndex + 3] = d.color[3] !== undefined ? d.color[3] : 1.0;
    offsets[i] = d.offset;
  });

  return {
    value: values,
    length: gradLength,
    offset: offsets,
  };
}
