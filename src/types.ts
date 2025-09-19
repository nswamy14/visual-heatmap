export type JavaScriptDataType =
  | number
  | string
  | boolean
  | null
  | undefined
  | symbol
  | bigint
  | object;

export type ShaderTypes = "VERTEX_SHADER" | "FRAGMENT_SHADER";

export type Shader = { vertex: string; fragment: string };

export interface ShaderProgram {
  program: WebGLProgram;
  attr: {
    bufferType: GLenum;
    buffer: WebGLBuffer;
    drawType: GLenum;
    valueType: GLenum;
    size: GLint;
    attribute: number;
    data: Float32Array;
  }[];
  uniform: {
    [key: string]: WebGLUniformLocation | null;
  };
}

export type Color = [number, number, number, number?];

export interface GradientElement {
  color: Color;
  offset: number;
}

export interface MappedGradient {
  value: Float32Array;
  length: number;
  offset: number[];
}

export interface Point {
  x: number;
  y: number;
  value: number;
}

export type HeatmapConfig = {
  size?: number;
  max?: number;
  min?: number;
  intensity?: number;
  translate?: [number, number];
  zoom?: number;
  angle?: number;
  opacity?: number;
  gradient: GradientElement[];
  backgroundImage?: BackgroundImageConfig;
  disableCircularFalloff?: boolean;
};

export type HearmapExData = {
  posVec: Float32Array;
  rVec: Float32Array;
  minMax: {
    min: number;
    max: number;
  };
};

export interface BackgroundImageConfig {
  url?: string;
  width?: number;
  height?: number;
  x: number;
  y: number;
  image?: HTMLImageElement;
}

export type Translate = [number, number];
