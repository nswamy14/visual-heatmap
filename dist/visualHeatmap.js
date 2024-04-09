/*!
      * Heatmap
      * (c) 2024 Narayana Swamy (narayanaswamy14@gmail.com)
      * @license BSD-3-Clause
      */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.visualHeatmap = factory());
})(this, (function () { 'use strict';

	const GradShader = {
	  vertex: "#version 300 es\n\t\t\t\tin vec2 a_position;\n\t\t\t\tin float a_intensity;\n\t\t\t\tuniform float u_size;\n\t\t\t\tuniform vec2 u_resolution;\n\t\t\t\tuniform vec2 u_translate; \n\t\t\t\tuniform float u_zoom; \n\t\t\t\tuniform float u_angle; \n\t\t\t\tuniform float u_density;\n\t\t\t\tout float v_i;\n\n\t\t\t\tvec2 rotation(vec2 v, float a, float aspect) {\n\t\t\t\t\tfloat s = sin(a); float c = cos(a); mat2 rotationMat = mat2(c, -s, s, c); \n\t\t\t\t\tmat2 scaleMat    = mat2(aspect, 0.0, 0.0, 1.0);\n\t\t\t\t\tmat2 scaleMatInv = mat2(1.0/aspect, 0.0, 0.0, 1.0);\n\t\t\t\t\treturn scaleMatInv * rotationMat * scaleMat * v;\n\t\t\t\t}\n\n\t\t\t\tvoid main() {\n\t\t\t\t\tvec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);\n\t\t\t\t\tvec2 zeroToTwo = zeroToOne * 2.0 - 1.0;\n\t\t\t\t\tfloat zoomFactor = max(u_zoom, 0.1);\n\t\t\t\t\tzeroToTwo = zeroToTwo / zoomFactor;\n\t\t\t\t\tif (u_angle != 0.0) {\n\t\t\t\t\t\tzeroToTwo = rotation(zeroToTwo, u_angle, u_resolution.x / u_resolution.y);\n\t\t\t\t\t}\n\t\t\t\t\tgl_Position = vec4(zeroToTwo , 0, 1);\n\t\t\t\t\tgl_PointSize = u_size * u_density;\n\t\t\t\t\tv_i = a_intensity;\n\t\t\t\t}",
	  fragment: "#version 300 es\n\t\t\t\tprecision mediump float;\n\t\t\t\tuniform float u_max;\n\t\t\t\tuniform float u_min;\n\t\t\t\tuniform float u_intensity;\n\t\t\t\tin float v_i;\n\t\t\t\tout vec4 fragColor;\n\t\t\t\tvoid main() {\n\t\t\t\t\tfloat r = 0.0; \n\t\t\t\t\tvec2 cxy = 2.0 * gl_PointCoord - 1.0;\n\t\t\t\t\tr = dot(cxy, cxy);\n\t\t\t\t\tfloat deno = max(u_max - u_min, 1.0);\n\t\t\t\t\tif(r <= 1.0) {\n\t\t\t\t\t\tfragColor = vec4(0, 0, 0, ((v_i - u_min) / (deno)) * u_intensity * (1.0 - sqrt(r)));\n\t\t\t\t\t}\n\t\t\t\t}"
	};
	const ColorShader = {
	  vertex: "#version 300 es\n\t\t\t\tprecision highp float;\n\t\t\t\tin vec2 a_texCoord;\n\t\t\t\tout vec2 v_texCoord;\n\t\t\t\tvoid main() {\n\t\t\t\t\tvec2 clipSpace = a_texCoord * 2.0 - 1.0;\n\t\t\t\t\tgl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n\t\t\t\t\tv_texCoord = a_texCoord;\n\t\t\t\t}\n\t",
	  fragment: "#version 300 es\n\t\t\t\t\tprecision mediump float;\n\t\t\t\t\tin vec2 v_texCoord;\n\t\t\t\t\tout vec4 fragColor;\n\t\t\t\t\tuniform sampler2D u_framebuffer;\n\t\t\t\t\tuniform vec4 u_colorArr[20];\n\t\t\t\t\tuniform float u_colorCount;\n\t\t\t\t\tuniform float u_opacity;\n\t\t\t\t\tuniform float u_offset[20];\n\n\t\t\t\t\tfloat remap ( float minval, float maxval, float curval ) {\n\t\t\t\t\t\treturn ( curval - minval ) / ( maxval - minval );\n\t\t\t\t\t}\n\n\t\t\t\t\tvoid main() {\n\t\t\t\t\t\tfloat alpha = texture(u_framebuffer, v_texCoord.xy).a;\n\t\t\t\t\t\tif (alpha > 0.0 && alpha <= 1.0) {\n\t\t\t\t\t\t\tvec4 color_;\n\n\t\t\t\t\t\t\tif (alpha <= u_offset[0]) {\n\t\t\t\t\t\t\t\tcolor_ = u_colorArr[0];\n\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\tfor (int i = 1; i <= 20; ++i) {\n\t\t\t\t\t\t\t\t\tif (alpha <= u_offset[i]) {\n\t\t\t\t\t\t\t\t\t\tcolor_ = mix( u_colorArr[i - 1], u_colorArr[i], remap( u_offset[i - 1], u_offset[i], alpha ) );\n\t\t\t\t\t\t\t\t\t\tcolor_ = color_ * mix( u_colorArr[i - 1][3], u_colorArr[i][3], remap( u_offset[i - 1], u_offset[i], alpha ));\n\n\t\t\t\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\n\t\t\t\t\t\t\tcolor_ =  color_ * u_opacity;\n\t\t\t\t\t\t\tif (color_.a < 0.0) {\n\t\t\t\t\t\t\t\tcolor_.a = 0.0;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\tfragColor = color_;\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\tfragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t"
	};
	const ImageShader = {
	  vertex: "#version 300 es\n                    precision highp float;\n                    in vec2 a_position;\n                    in vec2 a_texCoord;\n                    uniform vec2 u_resolution;\n\t\t\t\t\tuniform vec2 u_translate; \n\t\t\t\t\tuniform float u_zoom; \n\t\t\t\t\tuniform float u_angle; \n\t\t\t\t\tuniform float u_density;\n                    out vec2 v_texCoord;\n\n                    vec2 rotation(vec2 v, float a, float aspect) {\n\t\t\t\t\t\tfloat s = sin(a); float c = cos(a); mat2 m = mat2(c, -s, s, c);\n\t\t\t\t\t\tmat2 scaleMat    = mat2(aspect, 0.0, 0.0, 1.0);\n\t\t\t\t\t\tmat2 scaleMatInv = mat2(1.0/aspect, 0.0, 0.0, 1.0);\n\t\t\t\t\t\treturn scaleMatInv * m * scaleMat * v;\n\t\t\t\t\t}\n\n                    void main() {\n                      \tvec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);\n                      \tzeroToOne.y = 1.0 - zeroToOne.y;\n\t\t\t\t\t\tvec2 zeroToTwo = zeroToOne * 2.0 - 1.0;\n\t\t\t\t\t\tfloat zoomFactor = u_zoom;\n\t\t\t\t\t\tif (zoomFactor == 0.0) {\n\t\t\t\t\t\t\tzoomFactor = 0.1;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tzeroToTwo = zeroToTwo / zoomFactor;\n\t\t\t\t\t\tif (u_angle != 0.0) {\n\t\t\t\t\t\t\tzeroToTwo = rotation(zeroToTwo, u_angle * -1.0, u_resolution.x / u_resolution.y);\n\t\t\t\t\t\t}\n\n\t\t\t\t\t\tgl_Position = vec4(zeroToTwo , 0, 1);\n\t\t\t\t\t\tv_texCoord = a_texCoord;\n                    }\n          \t\t",
	  fragment: "#version 300 es\n                    precision mediump float;\n                    uniform sampler2D u_image;\n                    in vec2 v_texCoord;\n                    out vec4 fragColor;\n                    void main() {\n                      fragColor = texture(u_image, v_texCoord);\n                    }\n                    "
	};

	function isNullUndefined(val) {
	  return val === null || val === undefined;
	}
	function isNotNumber(val) {
	  return typeof val !== 'number';
	}
	function isSortedAscending(arr) {
	  for (let i = 0; i < arr.length - 1; i++) {
	    if (arr[i + 1].offset - arr[i].offset < 0) {
	      return false;
	    }
	  }
	  return true;
	}
	function gradientMapper(grad) {
	  if (!Array.isArray(grad) || grad.length < 2) {
	    throw new Error('Invalid gradient: Expected an array with at least 2 elements.');
	  }
	  if (!isSortedAscending(grad)) {
	    throw new Error('Invalid gradient: Gradient is not sorted');
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
	    offset: offsets
	  };
	}
	function createShader(ctx, type, src) {
	  var shader = ctx.createShader(ctx[type]);
	  ctx.shaderSource(shader, src);
	  ctx.compileShader(shader);
	  var compiled = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
	  if (!compiled) {
	    var lastError = ctx.getShaderInfoLog(shader);
	    ctx.deleteShader(shader);
	    throw new Error("*** Error compiling shader '" + shader + "':" + lastError);
	  }
	  return shader;
	}
	function createProgram(ctx, shader) {
	  var vshader = createShader(ctx, 'VERTEX_SHADER', shader.vertex);
	  var fshader = createShader(ctx, 'FRAGMENT_SHADER', shader.fragment);
	  var program = ctx.createProgram();
	  ctx.attachShader(program, vshader);
	  ctx.attachShader(program, fshader);
	  ctx.linkProgram(program);
	  var linked = ctx.getProgramParameter(program, ctx.LINK_STATUS);
	  if (!linked) {
	    var lastError = ctx.getProgramInfoLog(program);
	    ctx.deleteProgram(program);
	    throw new Error('Error in program linking:' + lastError);
	  } else {
	    return program;
	  }
	}
	function createImageShader(ctx) {
	  var program = createProgram(ctx, ImageShader);
	  return {
	    program: program,
	    attr: [{
	      bufferType: ctx.ARRAY_BUFFER,
	      buffer: ctx.createBuffer(),
	      drawType: ctx.STATIC_DRAW,
	      valueType: ctx.FLOAT,
	      size: 2,
	      attribute: ctx.getAttribLocation(program, 'a_position'),
	      data: new Float32Array([])
	    }, {
	      bufferType: ctx.ARRAY_BUFFER,
	      buffer: ctx.createBuffer(),
	      drawType: ctx.STATIC_DRAW,
	      valueType: ctx.FLOAT,
	      size: 2,
	      attribute: ctx.getAttribLocation(program, 'a_texCoord'),
	      data: new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0])
	    }],
	    uniform: {
	      u_resolution: ctx.getUniformLocation(program, 'u_resolution'),
	      u_image: ctx.getUniformLocation(program, 'u_image'),
	      u_translate: ctx.getUniformLocation(program, 'u_translate'),
	      u_zoom: ctx.getUniformLocation(program, 'u_zoom'),
	      u_angle: ctx.getUniformLocation(program, 'u_angle'),
	      u_density: ctx.getUniformLocation(program, 'u_density')
	    }
	  };
	}
	function createGradiantShader(ctx) {
	  var program = createProgram(ctx, GradShader);
	  return {
	    program: program,
	    attr: [{
	      bufferType: ctx.ARRAY_BUFFER,
	      buffer: ctx.createBuffer(),
	      drawType: ctx.STATIC_DRAW,
	      valueType: ctx.FLOAT,
	      size: 2,
	      attribute: ctx.getAttribLocation(program, 'a_position'),
	      data: new Float32Array([])
	    }, {
	      bufferType: ctx.ARRAY_BUFFER,
	      buffer: ctx.createBuffer(),
	      drawType: ctx.STATIC_DRAW,
	      valueType: ctx.FLOAT,
	      size: 1,
	      attribute: ctx.getAttribLocation(program, 'a_intensity'),
	      data: new Float32Array([])
	    }],
	    uniform: {
	      u_resolution: ctx.getUniformLocation(program, 'u_resolution'),
	      u_max: ctx.getUniformLocation(program, 'u_max'),
	      u_min: ctx.getUniformLocation(program, 'u_min'),
	      u_size: ctx.getUniformLocation(program, 'u_size'),
	      u_intensity: ctx.getUniformLocation(program, 'u_intensity'),
	      u_translate: ctx.getUniformLocation(program, 'u_translate'),
	      u_zoom: ctx.getUniformLocation(program, 'u_zoom'),
	      u_angle: ctx.getUniformLocation(program, 'u_angle'),
	      u_density: ctx.getUniformLocation(program, 'u_density')
	    }
	  };
	}
	function createColorShader(ctx) {
	  var program = createProgram(ctx, ColorShader);
	  return {
	    program: program,
	    attr: [{
	      bufferType: ctx.ARRAY_BUFFER,
	      buffer: ctx.createBuffer(),
	      drawType: ctx.STATIC_DRAW,
	      valueType: ctx.FLOAT,
	      size: 2,
	      attribute: ctx.getAttribLocation(program, 'a_texCoord'),
	      data: new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0])
	    }],
	    uniform: {
	      u_framebuffer: ctx.getUniformLocation(program, 'u_framebuffer'),
	      u_colorArr: ctx.getUniformLocation(program, 'u_colorArr'),
	      u_colorCount: ctx.getUniformLocation(program, 'u_colorCount'),
	      u_opacity: ctx.getUniformLocation(program, 'u_opacity'),
	      u_offset: ctx.getUniformLocation(program, 'u_offset')
	    }
	  };
	}
	function extractData(data, self) {
	  const len = data.length;
	  let {
	    posVec = [],
	    rVec = []
	  } = self.hearmapExData || {};
	  if (self.pLen !== len) {
	    self.buffer = new ArrayBuffer(len * 8);
	    posVec = new Float32Array(self.buffer);
	    self.buffer2 = new ArrayBuffer(len * 4);
	    rVec = new Float32Array(self.buffer2);
	    self.pLen = len;
	  }
	  const dataMinMaxValue = {
	    min: Infinity,
	    max: -Infinity
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
	    minMax: dataMinMaxValue
	  };
	}
	function getPixlRatio(ctx) {
	  const dpr = window.devicePixelRatio || 1;
	  const bsr = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
	  return dpr / bsr;
	}
	function transCoOr(data) {
	  const zoomFactor = this.zoom || 0.1;
	  const halfWidth = this.width / 2;
	  const halfHeight = this.height / 2;
	  const {
	    angle,
	    translate
	  } = this;

	  // Combine operations to reduce the number of arithmetic steps
	  let posX = (data.x - halfWidth) / halfWidth * zoomFactor;
	  let posY = (data.y - halfHeight) / halfHeight * zoomFactor;

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
	  return {
	    x: posX,
	    y: posY
	  };
	}
	function renderExec() {
	  const ctx = this.ctx;
	  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
	  ctx.bindTexture(ctx.TEXTURE_2D, this.fbTexObj);
	  ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, this.width * this.ratio, this.height * this.ratio, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
	  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
	  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
	  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
	  ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.fbo);
	  ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, this.fbTexObj, 0);
	  if (this.hearmapExData) {
	    renderHeatGrad.call(this, ctx, this.hearmapExData);
	  }
	  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
	  if (this.imageConfig) {
	    renderImage.call(this, ctx, this.imageConfig);
	  }
	  renderColorGradiant.call(this, ctx);
	}
	function renderHeatGrad(ctx, exData) {
	  var _exData$minMax$min, _exData$minMax, _exData$minMax$max, _exData$minMax2;
	  ctx.useProgram(this.gradShadOP.program);
	  this.min = this.configMin !== null ? this.configMin : (_exData$minMax$min = exData === null || exData === void 0 || (_exData$minMax = exData.minMax) === null || _exData$minMax === void 0 ? void 0 : _exData$minMax.min) !== null && _exData$minMax$min !== void 0 ? _exData$minMax$min : 0;
	  this.max = this.configMax !== null ? this.configMax : (_exData$minMax$max = exData === null || exData === void 0 || (_exData$minMax2 = exData.minMax) === null || _exData$minMax2 === void 0 ? void 0 : _exData$minMax2.max) !== null && _exData$minMax$max !== void 0 ? _exData$minMax$max : 0;
	  this.gradShadOP.attr[0].data = exData.posVec || [];
	  this.gradShadOP.attr[1].data = exData.rVec || [];
	  ctx.uniform2fv(this.gradShadOP.uniform.u_resolution, new Float32Array([this.width * this.ratio, this.height * this.ratio]));
	  ctx.uniform2fv(this.gradShadOP.uniform.u_translate, new Float32Array([this.translate[0], this.translate[1]]));
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
	function renderImage(ctx, imageConfig) {
	  const {
	    x = 0,
	    y = 0,
	    width = 0,
	    height = 0
	  } = imageConfig;
	  ctx.useProgram(this.imageShaOP.program);
	  ctx.uniform2fv(this.imageShaOP.uniform.u_resolution, new Float32Array([this.width * this.ratio, this.height * this.ratio]));
	  ctx.uniform2fv(this.imageShaOP.uniform.u_translate, new Float32Array([this.translate[0], this.translate[1]]));
	  ctx.uniform1f(this.imageShaOP.uniform.u_zoom, this.zoom ? this.zoom : 0.01);
	  ctx.uniform1f(this.imageShaOP.uniform.u_angle, this.angle);
	  ctx.uniform1f(this.imageShaOP.uniform.u_density, this.ratio);
	  this.imageShaOP.attr[0].data = new Float32Array([x, y, x + width, y, x, y + height, x, y + height, x + width, y, x + width, y + height]);
	  this.imageShaOP.attr.forEach(function (d) {
	    ctx.bindBuffer(d.bufferType, d.buffer);
	    ctx.bufferData(d.bufferType, d.data, d.drawType);
	    ctx.enableVertexAttribArray(d.attribute);
	    ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
	  });
	  ctx.uniform1i(this.imageShaOP.uniform.u_image, 0);
	  ctx.activeTexture(this.ctx.TEXTURE0);
	  ctx.bindTexture(this.ctx.TEXTURE_2D, this.imageTexture);
	  ctx.drawArrays(ctx.TRIANGLES, 0, 6);
	}
	function renderColorGradiant(ctx) {
	  ctx.useProgram(this.colorShadOP.program);
	  ctx.uniform4fv(this.colorShadOP.uniform.u_colorArr, this.gradient.value);
	  ctx.uniform1f(this.colorShadOP.uniform.u_colorCount, this.gradient.length);
	  ctx.uniform1fv(this.colorShadOP.uniform.u_offset, new Float32Array(this.gradient.offset));
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
	function imageInstance(url, onLoad, onError) {
	  const imageIns = new Image();
	  imageIns.crossOrigin = 'anonymous';
	  imageIns.onload = onLoad;
	  imageIns.onerror = onError;
	  imageIns.src = url;
	  return imageIns;
	}
	class Chart {
	  constructor(container, config) {
	    try {
	      const res = typeof container === 'string' ? document.querySelector(container) : container instanceof HTMLElement ? container : null;
	      if (!res) {
	        throw new Error('Context must be either a string or an Element');
	      }
	      const {
	        clientHeight: height,
	        clientWidth: width
	      } = res;
	      const layer = document.createElement('canvas');
	      const ctx = layer.getContext('webgl2', {
	        premultipliedAlpha: false,
	        depth: false,
	        antialias: true,
	        alpha: true,
	        preserveDrawingBuffer: false
	      });
	      this.ratio = getPixlRatio(ctx);
	      ctx.clearColor(0, 0, 0, 0);
	      ctx.enable(ctx.BLEND);
	      ctx.blendEquation(ctx.FUNC_ADD);
	      ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
	      ctx.depthMask(true);
	      layer.setAttribute('height', height * this.ratio);
	      layer.setAttribute('width', width * this.ratio);
	      layer.style.height = "".concat(height, "px");
	      layer.style.width = "".concat(width, "px");
	      layer.style.position = 'absolute';
	      res.appendChild(layer);
	      this.ctx = ctx;
	      this.width = width;
	      this.height = height;
	      this.imageConfig = null;
	      this.configMin = null;
	      this.configMax = null;
	      this.hearmapExData = {};
	      this.layer = layer;
	      this.dom = res;
	      this.gradShadOP = createGradiantShader(this.ctx);
	      this.colorShadOP = createColorShader(this.ctx);
	      this.imageShaOP = createImageShader(this.ctx);
	      this.fbTexObj = ctx.createTexture();
	      this.fbo = ctx.createFramebuffer();
	      if (!isNullUndefined(config.size)) {
	        this.setSize(config.size);
	      } else {
	        this.size = 20.0;
	      }
	      if (!isNullUndefined(config.max)) {
	        this.setMax(config.max);
	      } else {
	        this.configMax = null;
	      }
	      if (!isNullUndefined(config.min)) {
	        this.setMin(config.min);
	      } else {
	        this.configMin = null;
	      }
	      if (!isNullUndefined(config.intensity)) {
	        this.setIntensity(config.intensity);
	      } else {
	        this.intensity = 1.0;
	      }
	      if (!isNullUndefined(config.translate)) {
	        this.setTranslate(config.translate);
	      } else {
	        this.translate = [0, 0];
	      }
	      if (!isNullUndefined(config.zoom)) {
	        this.setZoom(config.zoom);
	      } else {
	        this.zoom = 1.0;
	      }
	      if (!isNullUndefined(config.angle)) {
	        this.setRotationAngle(config.angle);
	      } else {
	        this.angle = 0.0;
	      }
	      if (!isNullUndefined(config.opacity)) {
	        this.setOpacity(config.opacity);
	      } else {
	        this.opacity = 1.0;
	      }
	      this.gradient = gradientMapper(config.gradient);
	      if (config.backgroundImage && config.backgroundImage.url) {
	        this.setBackgroundImage(config.backgroundImage);
	      }
	      this.heatmapData = [];
	      this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	    } catch (error) {
	      console.error(error);
	    }
	  }
	  resize() {
	    const height = this.dom.clientHeight;
	    const width = this.dom.clientWidth;
	    this.layer.setAttribute('height', height * this.ratio);
	    this.layer.setAttribute('width', width * this.ratio);
	    this.layer.style.height = "".concat(height, "px");
	    this.layer.style.width = "".concat(width, "px");
	    this.width = width;
	    this.height = height;
	    this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	    /* Perform update */
	    this.render(this.hearmapExData);
	  }
	  clear() {
	    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
	  }
	  setMax(max) {
	    if (isNullUndefined(max) || isNotNumber(max)) {
	      throw new Error('Invalid max: Expected Number');
	    }
	    this.configMax = max;
	    return this;
	  }
	  setMin(min) {
	    if (isNullUndefined(min) || isNotNumber(min)) {
	      throw new Error('Invalid min: Expected Number');
	    }
	    this.configMin = min;
	    return this;
	  }
	  setGradient(gradient) {
	    this.gradient = gradientMapper(gradient);
	    return this;
	  }
	  setTranslate(translate) {
	    if (translate.constructor !== Array) {
	      throw new Error('Invalid Translate: Translate has to be of Array type');
	    }
	    if (translate.length !== 2) {
	      throw new Error('Translate has to be of length 2');
	    }
	    this.translate = translate;
	    return this;
	  }
	  setZoom(zoom) {
	    if (isNullUndefined(zoom) || isNotNumber(zoom)) {
	      throw new Error('Invalid zoom: Expected Number');
	    }
	    this.zoom = zoom;
	    return this;
	  }
	  setRotationAngle(angle) {
	    if (isNullUndefined(angle) || isNotNumber(angle)) {
	      throw new Error('Invalid Angle: Expected Number');
	    }
	    this.angle = angle;
	    return this;
	  }
	  setSize(size) {
	    if (isNullUndefined(size) || isNotNumber(size)) {
	      throw new Error('Invalid Size: Expected Number');
	    }
	    this.size = size;
	    return this;
	  }
	  setIntensity(intensity) {
	    if (isNullUndefined(intensity) || isNotNumber(intensity)) {
	      this.intensity = 1.0; // applying default intensity
	      throw new Error('Invalid Intensity: Expected Number');
	    }
	    if (intensity > 1 || intensity < 0) {
	      this.intensity = intensity > 1 ? 1 : 0; // Setting bound value
	      throw new Error('Invalid Intensity value ' + intensity);
	    }
	    this.intensity = intensity;
	    return this;
	  }
	  setOpacity(opacity) {
	    if (isNullUndefined(opacity) || isNotNumber(opacity)) {
	      throw new Error('Invalid Opacity: Expected Number');
	    }
	    if (opacity > 1 || opacity < 0) {
	      throw new Error('Invalid Opacity value ' + opacity);
	    }
	    this.opacity = opacity;
	    return this;
	  }
	  setBackgroundImage(config) {
	    const self = this;
	    if (!config.url) {
	      return;
	    }
	    const maxTextureSize = this.ctx.getParameter(this.ctx.MAX_TEXTURE_SIZE);
	    this.imageTexture = this.ctx.createTexture();
	    this.type = 'TEXTURE_2D';
	    this.imageConfig = null;
	    this.imgWidth = config.width || this.width;
	    this.imgHeight = config.height || this.height;
	    this.imgWidth = this.imgWidth > maxTextureSize ? maxTextureSize : this.imgWidth;
	    this.imgHeight = this.imgHeight > maxTextureSize ? maxTextureSize : this.imgHeight;
	    imageInstance(config.url, function onUpdateCallBack() {
	      self.ctx.activeTexture(self.ctx.TEXTURE0);
	      self.ctx.bindTexture(self.ctx.TEXTURE_2D, self.imageTexture);
	      self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_WRAP_S, self.ctx.CLAMP_TO_EDGE);
	      self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_WRAP_T, self.ctx.CLAMP_TO_EDGE);
	      self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_MIN_FILTER, self.ctx.LINEAR);
	      self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_MAG_FILTER, self.ctx.LINEAR);
	      self.ctx.texImage2D(self.ctx.TEXTURE_2D, 0, self.ctx.RGBA, this.naturalWidth, this.naturalHeight, 0, self.ctx.RGBA, self.ctx.UNSIGNED_BYTE, this);
	      self.imageConfig = {
	        x: config.x || 0,
	        y: config.y || 0,
	        height: self.imgHeight,
	        width: self.imgWidth,
	        image: this
	      };
	      self.render();
	    }, function onErrorCallBack(error) {
	      throw new Error('Image Load Error', error);
	    });
	    return this;
	  }
	  clearData() {
	    this.heatmapData = [];
	    this.hearmapExData = {};
	    this.render();
	  }
	  addData(data, transIntactFlag) {
	    const self = this;
	    for (let i = 0; i < data.length; i++) {
	      if (transIntactFlag) {
	        transCoOr.call(self, data[i]);
	      }
	      this.heatmapData.push(data[i]);
	    }
	    this.renderData(this.heatmapData);
	    return this;
	  }
	  renderData(data) {
	    if (data.constructor !== Array) {
	      throw new Error('Expected Array type');
	    }
	    this.hearmapExData = extractData(data, this);
	    this.heatmapData = data;
	    this.render();
	    return this;
	  }
	  render() {
	    renderExec.call(this);
	  }
	  projection(data) {
	    // Pre-compute constants and repetitive calculations
	    const zoomFactor = this.zoom || 0.1;
	    const halfWidth = this.width / 2;
	    const halfHeight = this.height / 2;
	    const translateX = this.translate[0];
	    const translateY = this.translate[1];
	    const angle = this.angle;
	    const aspect = this.width / this.height;

	    // Calculate the adjusted positions
	    let posX = (data.x + translateX - halfWidth) / (halfWidth * zoomFactor);
	    let posY = (data.y + translateY - halfHeight) / (halfHeight * zoomFactor);
	    posX *= aspect;

	    // Rotate the point if there's an angle
	    if (angle !== 0.0) {
	      const cosAngle = Math.cos(-angle);
	      const sinAngle = Math.sin(-angle);
	      const xNew = cosAngle * posX - sinAngle * posY;
	      posY = sinAngle * posX + cosAngle * posY;
	      posX = xNew;
	    }
	    posX *= 1.0 / aspect;

	    // Scale back and adjust the position
	    posX = posX * halfWidth + halfWidth;
	    posY = posY * halfHeight + halfHeight;
	    return {
	      x: posX,
	      y: posY
	    };
	  }
	}
	function Heatmap(context) {
	  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  return new Chart(context, config);
	}

	return Heatmap;

}));
