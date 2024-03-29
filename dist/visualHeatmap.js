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

	function Heatmap (context, config = {}) {
		let ratio;
		let buffer;
		let posVec = [];
		let buffer2;
		let rVec = [];
		let pLen = 0;
		let maxTextureSize = null;
		let imgWidth;
		let imgHeight;
		let hearmapExData;
		let imageConfig;
		let configMin = 0;
		let configMax = 0;


		function isNullUndefined (val) {
			return val === null || val === undefined;
		}

		function isNotNumber (val) {
			return typeof val !== 'number';
		}

		function isSortedAscending (arr) {
			for (let i = 0; i < arr.length - 1; i++) {
				if (arr[i + 1].offset - arr[i].offset < 0) {
					return false;
				}
			}
			return true;
		}


		function gradientMapper (grad) {
			if (grad.constructor !== Array) {
				throw new Error('Invalid gradient: Wrong Gradient type, expected Array');
			}

			if (grad.length < 2) {
				throw new Error('Invalid gradient: 2 or more values expected');
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

		function createShader (ctx, type, src) {
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

		function createProgram (ctx, shader) {
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

		function createImageShader (ctx) {
			var program = createProgram(ctx, imageShaders);
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

		function createGradiantShader (ctx) {
			var program = createProgram(ctx, GradShaders);
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

		function createColorShader (ctx) {
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

		function extractData (data) {
			const len = data.length;
			if (pLen !== len) {
				buffer = new ArrayBuffer(len * 8);
				posVec = new Float32Array(buffer);
				buffer2 = new ArrayBuffer(len * 4);
				rVec = new Float32Array(buffer2);
				pLen = len;
			}
			const dataMinMaxValue = {
				min: Infinity,
				max: -Infinity
			};
			for (let i = 0; i < len; i++) {
				posVec[i * 2] = data[i].x;
				posVec[(i * 2) + 1] = data[i].y;
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

		function Chart (context, config) {
			try {
				let res;
				if (typeof context === 'string') {
					res = document.querySelector(context);
				} else if (context instanceof Element) {
					res = context;
				} else {
					throw new Error('Context must be either a string or an Element');
				}
				const height = res.clientHeight;
				const width = res.clientWidth;
				const layer = document.createElement('canvas');
				const ctx = layer.getContext('webgl2', {
					premultipliedAlpha: false,
					depth: false,
					antialias: true,
					alpha: true,
					preserveDrawingBuffer: false
				});
				ratio = getPixlRatio(ctx);
				ctx.clearColor(0, 0, 0, 0);
				ctx.enable(ctx.BLEND);
				ctx.blendEquation(ctx.FUNC_ADD);
				ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
				ctx.depthMask(true);
				layer.setAttribute('height', height * ratio);
				layer.setAttribute('width', width * ratio);
				layer.style.height = `${height}px`;
				layer.style.width = `${width}px`;
				layer.style.position = 'absolute';
				res.appendChild(layer);

				this.ctx = ctx;
				this.width = width;
				this.height = height;
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
					configMax = null;
				}

				if (!isNullUndefined(config.min)) {
					this.setMin(config.min);
				} else {
					configMin = null;
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

				this.ratio = ratio;

				if (config.backgroundImage && config.backgroundImage.url) {
					this.setBackgroundImage(config.backgroundImage);
				}

				this.heatmapData = [];

				this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
			} catch (error) {
				console.error(error);
			}
		}

		Chart.prototype.resize = function () {
			const height = this.dom.clientHeight;
			const width = this.dom.clientWidth;
			this.layer.setAttribute('height', height * ratio);
			this.layer.setAttribute('width', width * ratio);
			this.layer.style.height = `${height}px`;
			this.layer.style.width = `${width}px`;
			this.width = width;
			this.height = height;
			this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
			/* Perform update */
			this.render(hearmapExData);
		};

		Chart.prototype.clear = function () {
			this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
		};

		Chart.prototype.setMax = function (max) {
			if (isNullUndefined(max) || isNotNumber(max)) {
				throw new Error('Invalid max: Expected Number');
			}

			configMax = max;
			return this;
		};

		Chart.prototype.setMin = function (min) {
			if (isNullUndefined(min) || isNotNumber(min)) {
				throw new Error('Invalid min: Expected Number');
			}

			configMin = min;
			return this;
		};

		Chart.prototype.setGradient = function (gradient) {
			this.gradient = gradientMapper(gradient);
			return this;
		};

		Chart.prototype.setTranslate = function (translate) {
			if (translate.constructor !== Array) {
				throw new Error('Invalid Translate: Translate has to be of Array type');
			}
			if (translate.length !== 2) {
				throw new Error('Translate has to be of length 2');
			}
			this.translate = translate;
			return this;
		};

		Chart.prototype.setZoom = function (zoom) {
			if (isNullUndefined(zoom) || isNotNumber(zoom)) {
				throw new Error('Invalid zoom: Expected Number');
			}

			this.zoom = zoom;
			return this;
		};

		Chart.prototype.setRotationAngle = function (angle) {
			if (isNullUndefined(angle) || isNotNumber(angle)) {
				throw new Error('Invalid Angle: Expected Number');
			}

			this.angle = angle;
			return this;
		};

		Chart.prototype.setSize = function (size) {
			if (isNullUndefined(size) || isNotNumber(size)) {
				throw new Error('Invalid Size: Expected Number');
			}

			this.size = size;
			return this;
		};

		Chart.prototype.setIntensity = function (intensity) {
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
		};

		Chart.prototype.setOpacity = function (opacity) {
			if (isNullUndefined(opacity) || isNotNumber(opacity)) {
				throw new Error('Invalid Opacity: Expected Number');
			}

			if (opacity > 1 || opacity < 0) {
				throw new Error('Invalid Opacity value ' + opacity);
			}
			this.opacity = opacity;
			return this;
		};

		Chart.prototype.setBackgroundImage = function (config) {
			const self = this;
			if (!config.url) {
				return;
			}

			maxTextureSize = this.ctx.getParameter(this.ctx.MAX_TEXTURE_SIZE);
			this.imageTexture = this.ctx.createTexture();
		    this.type = 'TEXTURE_2D';
		    imageConfig = null;

		    imgWidth = config.width || this.width;
		    imgHeight = config.height || this.height;

		    imgWidth = imgWidth > maxTextureSize ? maxTextureSize : imgWidth;
		    imgHeight = imgHeight > maxTextureSize ? maxTextureSize : imgHeight;

		    imageInstance(config.url, function onUpdateCallBack () {
				self.ctx.activeTexture(self.ctx.TEXTURE0);
				self.ctx.bindTexture(self.ctx.TEXTURE_2D, self.imageTexture);
				self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_WRAP_S, self.ctx.CLAMP_TO_EDGE);
				self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_WRAP_T, self.ctx.CLAMP_TO_EDGE);
				self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_MIN_FILTER, self.ctx.LINEAR);
				self.ctx.texParameteri(self.ctx.TEXTURE_2D, self.ctx.TEXTURE_MAG_FILTER, self.ctx.LINEAR);

				self.ctx.texImage2D(
			            self.ctx.TEXTURE_2D,
			            0,
			            self.ctx.RGBA,
			            this.naturalWidth,
			            this.naturalHeight,
			            0,
			            self.ctx.RGBA,
			            self.ctx.UNSIGNED_BYTE,
			            this
			        );

				imageConfig = {
					x: config.x || 0,
					y: config.y || 0,
					height: imgHeight,
					width: imgWidth,
					image: this
				};

				self.render();
		    }, function onErrorCallBack (error) {
				throw new Error('Image Load Error', error);
		    });
		    return this;
		};

		Chart.prototype.clearData = function () {
			this.heatmapData = [];
			hearmapExData = {};
			this.render();
		};

		Chart.prototype.addData = function (data, transIntactFlag) {
			const self = this;
			for (let i = 0; i < data.length; i++) {
				if (transIntactFlag) {
					transCoOr.call(self, data[i]);
				}
				this.heatmapData.push(data[i]);
			}
			this.renderData(this.heatmapData);
			return this;
		};

		Chart.prototype.renderData = function (data) {
			if (data.constructor !== Array) {
				throw new Error('Expected Array type');
			}
			hearmapExData = extractData(data);
			this.heatmapData = data;
			this.render();
			return this;
		};

		Chart.prototype.render = function () {
			renderExec.call(this);
		};

		Chart.prototype.projection = function (data) {
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
			        const xNew = (cosAngle * posX) - (sinAngle * posY);
			        posY = (sinAngle * posX) + (cosAngle * posY);
			        posX = xNew;
			    }

			    posX *= 1.0 / aspect;

			    // Scale back and adjust the position
			    posX = (posX * halfWidth) + halfWidth;
			    posY = (posY * halfHeight) + halfHeight;

			    return { x: posX, y: posY };
		};

		function renderExec () {
			const ctx = this.ctx;
			
			ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

			ctx.bindTexture(ctx.TEXTURE_2D, this.fbTexObj);
			ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, this.width * this.ratio, this.height * this.ratio, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
			ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
			ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
			ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);

			ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.fbo);
			ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, this.fbTexObj, 0);
			
			if (hearmapExData) {
				renderHeatGrad.call(this, ctx, hearmapExData);
			}
			ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
			if (imageConfig) {
				renderImage.call(this, ctx, imageConfig);
			}
			renderColorGradiant.call(this, ctx);
		}
		function renderHeatGrad (ctx, exData) {
			ctx.useProgram(this.gradShadOP.program);

			this.min = configMin !== null ? configMin : exData?.minMax?.min ?? 0;
			this.max = configMax !== null ? configMax : exData?.minMax?.max ?? 0;
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

		function renderImage (ctx, imageConfig) {
			const { x = 0, y = 0, width = 0, height = 0 } = imageConfig;

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

		function renderColorGradiant (ctx) {
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

		function transCoOr (data) {
			const zoomFactor = this.zoom || 0.1;
			const halfWidth = this.width / 2;
			const halfHeight = this.height / 2;
			const angle = this.angle;

			// Combine operations to reduce the number of arithmetic steps
			let posX = (data.x - halfWidth) / halfWidth * zoomFactor;
			let posY = (data.y - halfHeight) / halfHeight * zoomFactor;

			// Rotate the point if there's an angle
			if (angle !== 0.0) {
				const cosAngle = Math.cos(angle);
				const sinAngle = Math.sin(angle);
				const xNew = (cosAngle * posX) - (sinAngle * posY);
				posY = (sinAngle * posX) + (cosAngle * posY);
				posX = xNew;
			}

			// Scale back and adjust the position
			posX = (posX * halfWidth) + halfWidth - this.translate[0];
			posY = (posY * halfHeight) + halfHeight - this.translate[1];

			data.x = posX;
			data.y = posY;

			    return { x: posX, y: posY };
		}

		function imageInstance (url, onLoad, onError) {
		    const imageIns = new Image();
		    imageIns.crossOrigin = 'anonymous';
		    imageIns.onload = onLoad;
		    imageIns.onerror = onError;
		    imageIns.src = url;

		    return imageIns;
		}

		return new Chart(context, config);
	}

	function getPixlRatio (ctx) {
		const dpr = window.devicePixelRatio || 1;
		const bsr = ctx.webkitBackingStorePixelRatio ||
	        ctx.mozBackingStorePixelRatio ||
	        ctx.msBackingStorePixelRatio ||
	        ctx.oBackingStorePixelRatio ||
	        ctx.backingStorePixelRatio || 1;

		return dpr / bsr;
	}

	var GradShaders = {
		vertex: `#version 300 es
				in vec2 a_position;
				in float a_intensity;
				uniform float u_size;
				uniform vec2 u_resolution;
				uniform vec2 u_translate; 
				uniform float u_zoom; 
				uniform float u_angle; 
				uniform float u_density;
				out float v_i;

				vec2 rotation(vec2 v, float a, float aspect) {
					float s = sin(a); float c = cos(a); mat2 rotationMat = mat2(c, -s, s, c); 
					mat2 scaleMat    = mat2(aspect, 0.0, 0.0, 1.0);
					mat2 scaleMatInv = mat2(1.0/aspect, 0.0, 0.0, 1.0);
					return scaleMatInv * rotationMat * scaleMat * v;
				}

				void main() {
					vec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);
					vec2 zeroToTwo = zeroToOne * 2.0 - 1.0;
					float zoomFactor = max(u_zoom, 0.1);
					zeroToTwo = zeroToTwo / zoomFactor;
					if (u_angle != 0.0) {
						zeroToTwo = rotation(zeroToTwo, u_angle, u_resolution.x / u_resolution.y);
					}
					gl_Position = vec4(zeroToTwo , 0, 1);
					gl_PointSize = u_size * u_density;
					v_i = a_intensity;
				}`,
		fragment: `#version 300 es
				precision mediump float;
				uniform float u_max;
				uniform float u_min;
				uniform float u_intensity;
				in float v_i;
				out vec4 fragColor;
				void main() {
					float r = 0.0; 
					vec2 cxy = 2.0 * gl_PointCoord - 1.0;
					r = dot(cxy, cxy);
					float deno = max(u_max - u_min, 1.0);
					if(r <= 1.0) {
						fragColor = vec4(0, 0, 0, ((v_i - u_min) / (deno)) * u_intensity * (1.0 - sqrt(r)));
					}
				}`
	};

	var ColorShader = {
		vertex: `#version 300 es
				precision highp float;
				in vec2 a_texCoord;
				out vec2 v_texCoord;
				void main() {
					vec2 clipSpace = a_texCoord * 2.0 - 1.0;
					gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
					v_texCoord = a_texCoord;
				}
	`,
		fragment: `#version 300 es
					precision mediump float;
					in vec2 v_texCoord;
					out vec4 fragColor;
					uniform sampler2D u_framebuffer;
					uniform vec4 u_colorArr[20];
					uniform float u_colorCount;
					uniform float u_opacity;
					uniform float u_offset[20];

					float remap ( float minval, float maxval, float curval ) {
						return ( curval - minval ) / ( maxval - minval );
					}

					void main() {
						float alpha = texture(u_framebuffer, v_texCoord.xy).a;
						if (alpha > 0.0 && alpha <= 1.0) {
							vec4 color_;

							if (alpha <= u_offset[0]) {
								color_ = u_colorArr[0];
							} else {
								for (int i = 1; i <= 20; ++i) {
									if (alpha <= u_offset[i]) {
										color_ = mix( u_colorArr[i - 1], u_colorArr[i], remap( u_offset[i - 1], u_offset[i], alpha ) );
										color_ = color_ * mix( u_colorArr[i - 1][3], u_colorArr[i][3], remap( u_offset[i - 1], u_offset[i], alpha ));

										break;
									}
								}
							}

							color_ =  color_ * u_opacity;
							if (color_.a < 0.0) {
								color_.a = 0.0;
							}
							fragColor = color_;
						} else {
							fragColor = vec4(0.0, 0.0, 0.0, 0.0);
						}
					}
		`
	};

	var imageShaders = {
		vertex: `#version 300 es
                    precision highp float;
                    in vec2 a_position;
                    in vec2 a_texCoord;
                    uniform vec2 u_resolution;
					uniform vec2 u_translate; 
					uniform float u_zoom; 
					uniform float u_angle; 
					uniform float u_density;
                    out vec2 v_texCoord;

                    vec2 rotation(vec2 v, float a, float aspect) {
						float s = sin(a); float c = cos(a); mat2 m = mat2(c, -s, s, c);
						mat2 scaleMat    = mat2(aspect, 0.0, 0.0, 1.0);
						mat2 scaleMatInv = mat2(1.0/aspect, 0.0, 0.0, 1.0);
						return scaleMatInv * m * scaleMat * v;
					}

                    void main() {
                      	vec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);
                      	zeroToOne.y = 1.0 - zeroToOne.y;
						vec2 zeroToTwo = zeroToOne * 2.0 - 1.0;
						float zoomFactor = u_zoom;
						if (zoomFactor == 0.0) {
							zoomFactor = 0.1;
						}
						zeroToTwo = zeroToTwo / zoomFactor;
						if (u_angle != 0.0) {
							zeroToTwo = rotation(zeroToTwo, u_angle * -1.0, u_resolution.x / u_resolution.y);
						}

						gl_Position = vec4(zeroToTwo , 0, 1);
						v_texCoord = a_texCoord;
                    }
          		`,
		fragment: `#version 300 es
                    precision mediump float;
                    uniform sampler2D u_image;
                    in vec2 v_texCoord;
                    out vec4 fragColor;
                    void main() {
                      fragColor = texture(u_image, v_texCoord);
                    }
                    `
	};

	return Heatmap;

}));
