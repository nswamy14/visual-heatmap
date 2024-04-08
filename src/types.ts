export type Color = [number, number, number, number?];

export interface GradientStop {
  color: Color;
  offset: number;
}

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

export interface Point {
  x: number;
  y: number;
  value: number;
}

export interface ImageInstance {
  crossOrigin: string;
  onload: () => void;
  onerror: (error: ErrorEvent) => void;
  src: string;
}

// interface Point {
//   x: number;
//   y: number;
//   value: number;
// }

export interface BackgroundImageConfig {
  url: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

// interface GradientStop {
//   offset: number;
//   color: string;
// }

export interface HeatmapConfig {
  size?: number;
  max?: number;
  min?: number;
  intensity?: number;
  translate?: [number, number];
  zoom?: number;
  angle?: number;
  opacity?: number;
  gradient?: GradientStop[];
  backgroundImage?: BackgroundImageConfig;
}

export type Translate = [number, number];
