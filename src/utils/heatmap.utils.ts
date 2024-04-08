import { Heatmap } from "../Heatmap";
import { Point } from "../types";

export function extractData(data: Point[], self: Heatmap) {
  const len = data.length;
  let { posVec = [], rVec = [] } = self.hearmapExData || {};
  //    TODO ISSUE ??
  //   if (self.pLen !== len) {
  //     self.buffer = new ArrayBuffer(len * 8);
  //     posVec = new Float32Array(self.buffer);
  //     self.buffer2 = new ArrayBuffer(len * 4);
  //     rVec = new Float32Array(self.buffer2);
  //     self.pLen = len;
  //   }
  const dataMinMaxValue = {
    min: Infinity,
    max: -Infinity,
  };
  for (let i = 0; i < len; i++) {
    posVec[i * 2] = data[i].x;
    posVec[i * 2 + 1] = data[i].y;
    rVec[i] = data[i].value;
    if (dataMinMaxValue.min > data[i].value) {
      dataMinMaxValue.min = data[i].value;
    }
    if (dataMinMaxValue.max < data[i].value) {
      dataMinMaxValue.max = data[i].value;
    }
  }

  return {
    posVec: posVec,
    rVec: rVec,
    minMax: dataMinMaxValue,
  };
}

export function getPixelRatio(ctx: WebGLRenderingContext) {
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

export function renderExec(this: Heatmap) {
  const ctx = this.ctx;

  if (!ctx) {
    return;
  }

  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

  ctx.bindTexture(ctx.TEXTURE_2D, this.fbTexObj);
  ctx.texImage2D(
    ctx.TEXTURE_2D,
    0,
    ctx.RGBA,
    this.width * this.ratio,
    this.height * this.ratio,
    0,
    ctx.RGBA,
    ctx.UNSIGNED_BYTE,
    null
  );
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);

  ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.fbo);
  ctx.framebufferTexture2D(
    ctx.FRAMEBUFFER,
    ctx.COLOR_ATTACHMENT0,
    ctx.TEXTURE_2D,
    this.fbTexObj,
    0
  );

  if (this.hearmapExData) {
    renderHeatGrad.call(this, ctx, this.hearmapExData);
  }
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  if (this.imageConfig) {
    renderImage.call(this, ctx, this.imageConfig);
  }
  renderColorGradiant.call(this, ctx);
}

export function renderHeatGrad(
  this: Heatmap,
  ctx: WebGLRenderingContext,
  exData: any
) {
  ctx.useProgram(this.gradShadOP.program);

  this.min =
    this.configMin !== null ? this.configMin : exData?.minMax?.min ?? 0;
  this.max =
    this.configMax !== null ? this.configMax : exData?.minMax?.max ?? 0;
  this.gradShadOP.attr[0].data = exData.posVec || [];
  this.gradShadOP.attr[1].data = exData.rVec || [];

  ctx.uniform2fv(
    this.gradShadOP.uniform.u_resolution,
    new Float32Array([this.width * this.ratio, this.height * this.ratio])
  );
  ctx.uniform2fv(
    this.gradShadOP.uniform.u_translate,
    new Float32Array([this.translate[0], this.translate[1]])
  );
  ctx.uniform1f(this.gradShadOP.uniform.u_zoom, this.zoom ? this.zoom : 0.01);
  ctx.uniform1f(this.gradShadOP.uniform.u_angle, this.angle);
  ctx.uniform1f(this.gradShadOP.uniform.u_density, this.ratio);
  ctx.uniform1f(this.gradShadOP.uniform.u_max, this.max);
  ctx.uniform1f(this.gradShadOP.uniform.u_min, this.min);
  ctx.uniform1f(this.gradShadOP.uniform.u_size, this.size);
  ctx.uniform1f(this.gradShadOP.uniform.u_intensity, this.intensity);

  this.gradShadOP.attr.forEach(function (d) {
    ctx.bindBuffer(d.bufferType, d.buffer);
    ctx.bufferData(d.bufferType, d.data, d.drawType);
    ctx.enableVertexAttribArray(d.attribute);
    ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
  });

  ctx.drawArrays(ctx.POINTS, 0, (exData.posVec || []).length / 2);
}

export function renderImage(
  this: Heatmap,
  ctx: WebGLRenderingContext,
  imageConfig: any
) {
  const { x = 0, y = 0, width = 0, height = 0 } = imageConfig;

  ctx.useProgram(this.imageShaOP.program);

  ctx.uniform2fv(
    this.imageShaOP.uniform.u_resolution,
    new Float32Array([this.width * this.ratio, this.height * this.ratio])
  );
  ctx.uniform2fv(
    this.imageShaOP.uniform.u_translate,
    new Float32Array([this.translate[0], this.translate[1]])
  );
  ctx.uniform1f(this.imageShaOP.uniform.u_zoom, this.zoom ? this.zoom : 0.01);
  ctx.uniform1f(this.imageShaOP.uniform.u_angle, this.angle);
  ctx.uniform1f(this.imageShaOP.uniform.u_density, this.ratio);

  this.imageShaOP.attr[0].data = new Float32Array([
    x,
    y,
    x + width,
    y,
    x,
    y + height,
    x,
    y + height,
    x + width,
    y,
    x + width,
    y + height,
  ]);

  this.imageShaOP.attr.forEach(function (d) {
    ctx.bindBuffer(d.bufferType, d.buffer);
    ctx.bufferData(d.bufferType, d.data, d.drawType);
    ctx.enableVertexAttribArray(d.attribute);
    ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
  });

  ctx.uniform1i(this.imageShaOP.uniform.u_image, 0);
  ctx.activeTexture(this.ctx!.TEXTURE0);
  ctx.bindTexture(this.ctx!.TEXTURE_2D, this.imageTexture);
  ctx.drawArrays(ctx.TRIANGLES, 0, 6);
}

export function renderColorGradiant(this: Heatmap, ctx: WebGLRenderingContext) {
  ctx.useProgram(this.colorShadOP.program);

  ctx.uniform4fv(this.colorShadOP.uniform.u_colorArr, this.gradient.value);
  ctx.uniform1f(this.colorShadOP.uniform.u_colorCount, this.gradient.length);
  ctx.uniform1fv(
    this.colorShadOP.uniform.u_offset,
    new Float32Array(this.gradient.offset)
  );
  ctx.uniform1f(this.colorShadOP.uniform.u_opacity, this.opacity);

  this.colorShadOP.attr.forEach(function (d) {
    ctx.bindBuffer(d.bufferType, d.buffer);
    ctx.bufferData(d.bufferType, d.data, d.drawType);
    ctx.enableVertexAttribArray(d.attribute);
    ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
  });

  ctx.uniform1i(this.colorShadOP.uniform.u_framebuffer, 0);
  ctx.activeTexture(ctx.TEXTURE0);
  ctx.bindTexture(ctx.TEXTURE_2D, this.fbTexObj);

  ctx.drawArrays(ctx.TRIANGLES, 0, 6);
}

export function transCoOr(this: Heatmap, data: Point) {
  const zoomFactor = this.zoom || 0.1;
  const halfWidth = this.width / 2;
  const halfHeight = this.height / 2;
  const { angle, translate } = this;

  // Combine operations to reduce the number of arithmetic steps
  let posX = ((data.x - halfWidth) / halfWidth) * zoomFactor;
  let posY = ((data.y - halfHeight) / halfHeight) * zoomFactor;

  // Rotate the point if there's an angle
  if (angle !== 0.0) {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    posY = sinAngle * posX + cosAngle * posY;
    posX = cosAngle * posX - sinAngle * posY;
  }

  // Scale back and adjust the position
  posX = posX * halfWidth + halfWidth - translate[0];
  posY = posY * halfHeight + halfHeight - translate[1];

  data.x = posX;
  data.y = posY;

  return { x: posX, y: posY };
}

export function imageInstance(
  url: string,
  onLoad: () => void,
  onError: OnErrorEventHandler
): HTMLImageElement {
  const imageIns = new Image();
  imageIns.crossOrigin = "anonymous";
  imageIns.onload = onLoad;
  imageIns.onerror = onError;
  imageIns.src = url;

  return imageIns;
}
