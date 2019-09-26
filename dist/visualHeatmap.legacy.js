/*!
      * Heatmap v1.0.0
      * (c) 2019 Narayana Swamy (narayanaswamy14@gmail.com)
      * @license BSD-3-Clause
      */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.visualHeatmap = factory());
}(this, function () { 'use strict';

	function getPixlRatio (ctx) {
		var dpr = window.devicePixelRatio || 1;
		var bsr = ctx.webkitBackingStorePixelRatio ||
	        ctx.mozBackingStorePixelRatio ||
	        ctx.msBackingStorePixelRatio ||
	        ctx.oBackingStorePixelRatio ||
	        ctx.backingStorePixelRatio || 1;

		return dpr / bsr;
	}

	var GradfragmentShader = "\n\tprecision mediump float;\n\tuniform float u_max;\n\tuniform float u_blurr;\n\tvarying float v_i;\n\tvoid main() {\n\t\tfloat r = 0.0; vec2 cxy = 2.0 * gl_PointCoord - 1.0; r = dot(cxy, cxy);\n\t\tif(r > 1.0) { discard; } else { gl_FragColor = vec4(0, 0, 0, (v_i/u_max) * (u_blurr) * (1.0 - sqrt(r))); }\n\t}";
	var GradvertexShader = "\n\tattribute vec2 a_position; attribute float a_intensity; uniform float u_size; uniform vec2 u_resolution; uniform vec2 u_translate; uniform float u_zoom; uniform float u_angle; uniform float u_density;\n\tvarying float v_i;\n\n\tvec2 rotation(vec2 v, float a) {\n\t\tfloat s = sin(a); float c = cos(a); mat2 m = mat2(c, -s, s, c); \n\t\treturn m * v;\n\t}\n\n\tvoid main() {\n\t\tvec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);\n\t\tvec2 zeroToTwo = zeroToOne * 2.0 - 1.0;\n\t\tzeroToTwo = zeroToTwo * u_zoom;\n\t\tzeroToTwo = rotation(zeroToTwo, u_angle);\n\t\tgl_Position = vec4(zeroToTwo , 0, 1);\n\t\tgl_PointSize = u_size * u_density;\n\t\tv_i = a_intensity;\n\t}";

	var ColorfragmentShader = "\n\tprecision mediump float;\n\tvarying vec2 v_texCoord;\n\tuniform sampler2D u_framebuffer; uniform vec4 u_colorArr[100]; uniform float u_colorCount; uniform float u_opacity; uniform float u_offset[100];\n\n\tfloat remap ( float minval, float maxval, float curval ) {\n\t\treturn ( curval - minval ) / ( maxval - minval );\n\t}\n\n\tvoid main() {\n\t\tvec4 color = vec4(texture2D(u_framebuffer, v_texCoord.xy));\n\t\tif (color.a == 0.0) {\n\t\t\tdiscard;\n\t\t} else {\n\t\t\tvec4 color_;\n\t\t\tfloat fract = 1.0 / (u_colorCount - 1.0);\n\t\t\tif (color.a <= u_offset[1]) {\n\t\t\t\tcolor_ = mix( u_colorArr[0], u_colorArr[1], remap( u_offset[0], u_offset[1], color.a ) );\n\t\t\t} else if (color.a <= u_offset[2]) {\n\t\t\t\tcolor_ = mix( u_colorArr[1], u_colorArr[2], remap( u_offset[1], u_offset[2], color.a ) );\n\t\t\t} else if (color.a <= u_offset[3]) {\n\t\t\t\tcolor_ = mix( u_colorArr[2], u_colorArr[3], remap( u_offset[2], u_offset[3], color.a ) );\n\t\t\t} else if (color.a <= u_offset[4]) {\n\t\t\t\tcolor_ = mix( u_colorArr[3], u_colorArr[4], remap( u_offset[3], u_offset[4], color.a ) );\n\t\t\t} else if (color.a <= u_offset[5]) {\n\t\t\t\tcolor_ = mix( u_colorArr[4], u_colorArr[5], remap( u_offset[4], u_offset[5], color.a ) );\n\t\t\t} else if (color.a <= u_offset[6]) {\n\t\t\t\tcolor_ = mix( u_colorArr[5], u_colorArr[6], remap( u_offset[5], u_offset[6], color.a ) );\n\t\t\t} else if (color.a <= u_offset[7]) {\n\t\t\t\tcolor_ = mix( u_colorArr[6], u_colorArr[7], remap( u_offset[6], u_offset[7], color.a ) );\n\t\t\t} else if (color.a <= u_offset[8]) {\n\t\t\t\tcolor_ = mix( u_colorArr[7], u_colorArr[8], remap( u_offset[7], u_offset[8], color.a ) );\n\t\t\t} else if (color.a <= u_offset[9]) {\n\t\t\t\tcolor_ = mix( u_colorArr[8], u_colorArr[9], remap( u_offset[8], u_offset[9], color.a ) );\n\t\t\t} else if (color.a <= u_offset[10]) {\n\t\t\t\tcolor_ = mix( u_colorArr[9], u_colorArr[10], remap( u_offset[9], u_offset[10], color.a ) );\n\t\t\t}\n\t\t\tcolor_.a = color.a - (1.0 - u_opacity);\n\t\t\tif (color_.a < 0.0) {\n\t\t\t\tcolor_.a = 0.0;\n\t\t\t}\n\t\t\tgl_FragColor = color_;\n\t\t}\n\t}";
	var ColorvertexShader = "\n\tattribute vec2 a_texCoord;\n\tvarying vec2 v_texCoord;\n\tvoid main() {\n\t\tvec2 clipSpace = a_texCoord * 2.0 - 1.0;\n\t\tgl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n\t\tv_texCoord = a_texCoord;\n\t}";

	function Heatmap (context, config) {
		if ( config === void 0 ) config = {};

		function gradientMapper (grad) {
			var arr = [];
			var gradLength = grad.length;
			var offSetsArray = [];

			grad.forEach(function (d) {
				arr.push(d.color[0] / 255);
				arr.push(d.color[1] / 255);
				arr.push(d.color[2] / 255);
				arr.push(d.color[3] === undefined ? 1.0 : d.color[3]);
				offSetsArray.push(d.offset);
			});
			return {
				value: new Float32Array(arr),
				length: gradLength,
				offset: offSetsArray
			};
		}

		function createShader (ctx, type, src) {
			var shader = ctx.createShader(ctx[type]);
			ctx.shaderSource(shader, src);
			ctx.compileShader(shader);
			var compiled = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
			if (!compiled) {
				var lastError = ctx.getShaderInfoLog(shader);
				console.error("*** Error compiling shader '" + shader + "':" + lastError);
				ctx.deleteShader(shader);
			}
			return shader;
		}

		function createGradiantShader (ctx) {
			var vshader = createShader(ctx, 'VERTEX_SHADER', GradvertexShader);
			var fshader = createShader(ctx, 'FRAGMENT_SHADER', GradfragmentShader);
			var program = ctx.createProgram();

			ctx.attachShader(program, vshader);
			ctx.attachShader(program, fshader);
			ctx.linkProgram(program);

			var linked = ctx.getProgramParameter(program, ctx.LINK_STATUS);
			if (!linked) {
				var lastError = ctx.getProgramInfoLog(program);
				console.error('Error in program linking:' + lastError);
				ctx.deleteProgram(program);
			}

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
					u_size: ctx.getUniformLocation(program, 'u_size'),
					u_blurr: ctx.getUniformLocation(program, 'u_blurr'),
					u_translate: ctx.getUniformLocation(program, 'u_translate'),
					u_zoom: ctx.getUniformLocation(program, 'u_zoom'),
					u_angle: ctx.getUniformLocation(program, 'u_angle'),
					u_density: ctx.getUniformLocation(program, 'u_density')
				}
			};
		}

		function createColorShader (ctx) {
			var vshader = createShader(ctx, 'VERTEX_SHADER', ColorvertexShader);
			var fshader = createShader(ctx, 'FRAGMENT_SHADER', ColorfragmentShader);
			var program = ctx.createProgram();
			ctx.attachShader(program, vshader);
			ctx.attachShader(program, fshader);
			ctx.linkProgram(program);

			var linked = ctx.getProgramParameter(program, ctx.LINK_STATUS);
			if (!linked) {
				var lastError = ctx.getProgramInfoLog(program);
				console.error('Error in program linking:' + lastError);
				ctx.deleteProgram(program);
			}

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

		var buffer;
		var posVec = [];
		var buffer2;
		var rVec = [];
		var pLen = 0;
		function extractData (data) {
			var len = data.length;
			if (pLen !== len) {
				buffer = new ArrayBuffer(len * 8);
				posVec = new Float32Array(buffer);
				buffer2 = new ArrayBuffer(len * 4);
				rVec = new Float32Array(buffer2);
				pLen = len;
			}
			for (var i = 0; i < len; i++) {
				posVec[i * 2] = data[i].x;
				posVec[(i * 2) + 1] = data[i].y;
				rVec[i] = data[i].value;
			}
			return {
				posVec: posVec,
				rVec: rVec
			};
		}

		function Chart (context, config) {
			var res = document.querySelector(context);
			var height = res.clientHeight;
			var width = res.clientWidth;
			var layer = document.createElement('canvas');
			var ctx = layer.getContext('webgl', {
				premultipliedAlpha: false,
				depth: false,
				antialias: true,
				alpha: true
			});
			var ratio = getPixlRatio(ctx);
			ctx.clearColor(0, 0, 0, 0);
			ctx.enable(ctx.BLEND);
			ctx.blendEquation(ctx.FUNC_ADD);
			ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
			ctx.depthMask(true);
			layer.setAttribute('height', height * ratio);
			layer.setAttribute('width', width * ratio);
			layer.style.height = height + "px";
			layer.style.width = width + "px";
			layer.style.position = 'absolute';
			res.appendChild(layer);

			this.gradient = gradientMapper(config.gradient);
			this.ctx = ctx;
			this.width = width * ratio;
			this.height = height * ratio;
			this.layer = layer;
			this.dom = res;
			this.gradShadOP = createGradiantShader(this.ctx);
			this.colorShadOP = createColorShader(this.ctx);
			this.fbTexObj = ctx.createTexture();
			this.fbo = ctx.createFramebuffer();

			this.size = config.size ? config.size : 20.0;
			this.max = config.max;
			this.blurr = config.blurr ? config.blurr : 1.0;
			this.translate = (config.translate && config.translate.length === 2) ? config.translate : [0, 0];
			this.zoom = (config.zoom ? config.zoom : 1.0);
			this.angle = (config.rotationAngle ? config.rotationAngle : 0.0);
			this.opacity = config.opacity ? config.opacity : 1.0;
			this.ratio = ratio;

			ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
		}

		Chart.prototype.resize = function () {

		};

		Chart.prototype.clear = function () {
			this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
		};

		Chart.prototype.setMax = function (max) {
			this.max = max;
			this.render(this.exData);
		};

		Chart.prototype.setTranslate = function (translate) {
			this.translate = (translate.length === 2) ? translate : [0, 0];
			this.render(this.exData);
		};

		Chart.prototype.setZoom = function (zoom) {
			this.zoom = zoom !== undefined ? zoom : 1.0;
			this.render(this.exData);
		};

		Chart.prototype.setRotationAngle = function (angle) {
			this.angle = angle !== undefined ? angle : 0.0;
			this.render(this.exData);
		};

		Chart.prototype.setSize = function (size) {
			this.size = size !== undefined ? size : 20.0;
			this.render(this.exData);
		};

		Chart.prototype.setBlurr = function (blurr) {
			this.blurr = blurr !== undefined ? blurr : 1.0;
			this.render(this.exData);
		};

		Chart.prototype.setOpacity = function (opacity) {
			this.opacity = opacity !== undefined ? opacity : 1.0;
			this.render(this.exData);
		};

		Chart.prototype.renderData = function (data) {
			var exData = extractData(data);
			this.render(exData);
		};

		Chart.prototype.render = function (exData) {
			var ctx = this.ctx;
			this.exData = exData;
			this.gradShadOP.attr[0].data = exData.posVec;
			this.gradShadOP.attr[1].data = exData.rVec;
			
			ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
			
			ctx.useProgram(this.gradShadOP.program);

			ctx.uniform2fv(this.gradShadOP.uniform.u_resolution, new Float32Array([this.width, this.height]));
			ctx.uniform2fv(this.gradShadOP.uniform.u_translate, new Float32Array([this.translate[0], this.translate[1]]));
			ctx.uniform1f(this.gradShadOP.uniform.u_zoom, this.zoom);
			ctx.uniform1f(this.gradShadOP.uniform.u_angle, this.angle);
			ctx.uniform1f(this.gradShadOP.uniform.u_density, this.ratio);
			
			ctx.uniform1f(this.gradShadOP.uniform.u_max, this.max);
			ctx.uniform1f(this.gradShadOP.uniform.u_size, this.size);
			ctx.uniform1f(this.gradShadOP.uniform.u_blurr, this.blurr);
			this.gradShadOP.attr.forEach(function (d) {
				ctx.bindBuffer(d.bufferType, d.buffer);
				ctx.bufferData(d.bufferType, d.data, d.drawType);
				ctx.enableVertexAttribArray(d.attribute);
				ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
			});

			ctx.bindTexture(ctx.TEXTURE_2D, this.fbTexObj);
			ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, this.width, this.height, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
			ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
			ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
			ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);

			ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.fbo);
			ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, this.fbTexObj, 0);

			ctx.drawArrays(ctx.POINTS, 0, exData.posVec.length / 2);
			ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
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
		};
		return new Chart(context, config);
	}

	return Heatmap;

}));