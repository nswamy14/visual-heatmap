export default function Heatmap (context, config = {}) {
	let ratio;
	let buffer;
	let posVec = [];
	let buffer2;
	let rVec = [];
	let pLen = 0;
	let dataMinValue = null;
	let dataMaxValue = null;
	let maxTextureSize = null;
	let imgWidth;
	let imgHeight;


	function gradientMapper (grad) {
		const arr = [];
		const gradLength = grad.length;
		const offSetsArray = [];

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
			console.error('Error in program linking:' + lastError);
			ctx.deleteProgram(program);
			return null;
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

		this.gradient = gradientMapper(config.gradient);
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

		this.size = config.size ? config.size : 20.0;
		dataMaxValue = config.max ? config.max : null;
		dataMinValue = config.min ? config.min : null;
		this.intensity = config.intensity ? config.intensity : 1.0;
		this.translate = (config.translate && config.translate.length === 2) ? config.translate : [0, 0];
		this.zoom = (config.zoom ? config.zoom : 1.0);
		this.angle = (config.rotationAngle ? config.rotationAngle : 0.0);
		this.opacity = config.opacity ? config.opacity : 1.0;
		this.ratio = ratio;

		if (config.backgroundImage && config.backgroundImage.url) {
			this.setBackgroundImage(config.backgroundImage);
		}

		this.rawData = [];

		ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);

		this.render(this.exData || {});
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
		this.render(this.exData);
	};

	Chart.prototype.clear = function () {
		this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
	};

	Chart.prototype.setMax = function (max) {
		dataMaxValue = max;
		this.render(this.exData);
	};

	Chart.prototype.setMin = function (min) {
		dataMinValue = min;
		this.render(this.exData);
	};

	Chart.prototype.setGradient = function (gradient) {
                this.gradient = gradientMapper(gradient);
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

	Chart.prototype.setIntensity = function (intensity) {
		this.intensity = intensity !== undefined ? intensity : 1.0;
		this.render(this.exData);
	};

	Chart.prototype.setOpacity = function (opacity) {
		this.opacity = opacity !== undefined ? opacity : 1.0;
		this.render(this.exData);
	};

	Chart.prototype.setBackgroundImage = function (config) {
		const self = this;
		if (!config.url) {
			return;
		}

		maxTextureSize = this.ctx.getParameter(this.ctx.MAX_TEXTURE_SIZE);
		this.imageTexture = this.ctx.createTexture();
	    this.type = 'TEXTURE_2D';
	    this.imageConfig = null;

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

			self.imageConfig = {
				x: config.x || 0,
				y: config.y || 0,
				height: imgHeight,
				width: imgWidth,
				image: this
			};

			self.render(self.exData || {});
	    }, function onErrorCallBack (error) {
			console.error('Image Load Error', error);
	    });
	};

	Chart.prototype.addData = function (data, transIntactFlag) {
		const self = this;
		for (let i = 0; i < data.length; i++) {
			if (transIntactFlag) {
				transCoOr.call(self, data[i]);
			}
			this.rawData.push(data[i]);
		}
		this.renderData(this.rawData);
	};

	Chart.prototype.renderData = function (data) {
		const exData = extractData(data);
		this.rawData = data;
		this.render(exData);
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

	Chart.prototype.render = function (exData) {
		const ctx = this.ctx;
		this.exData = exData;
		
		ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

		ctx.bindTexture(ctx.TEXTURE_2D, this.fbTexObj);
		ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, this.width * this.ratio, this.height * this.ratio, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);

		ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.fbo);
		ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, this.fbTexObj, 0);
		
		renderHeatGrad.call(this, ctx, exData);
		ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
		if (this.imageConfig) {
			renderImage.call(this, ctx);
		}
		renderColorGradiant.call(this, ctx);
	};

	function renderHeatGrad (ctx, exData) {
		ctx.useProgram(this.gradShadOP.program);

		this.min = dataMinValue !== null ? dataMinValue : exData?.minMax?.min ?? 0;
		this.max = dataMaxValue !== null ? dataMaxValue : exData?.minMax?.max ?? 0;
		this.gradShadOP.attr[0].data = exData.posVec || [];
		this.gradShadOP.attr[1].data = exData.rVec || [];
		console.log(this.width, this.height);
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

		ctx.drawArrays(ctx.POINTS, 0, (this.exData.posVec || []).length / 2);
	}

	function renderImage (ctx) {
		const { x = 0, y = 0, width = 0, height = 0 } = this.imageConfig;

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
		float s = sin(a); float c = cos(a); mat2 m = mat2(c, -s, s, c); 
		mat2 scaleMat    = mat2(aspect, 0.0, 0.0, 1.0);
		mat2 scaleMatInv = mat2(1.0/aspect, 0.0, 0.0, 1.0);
		return scaleMatInv * m * scaleMat * v;
	}

	void main() {
		vec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);
		vec2 zeroToTwo = zeroToOne * 2.0 - 1.0;
		float zoomFactor = u_zoom;
		if (zoomFactor == 0.0) {
			zoomFactor = 0.1;
		}
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
		float deno = u_max - u_min;
		if (deno <= 0.0) {
			deno = 1.0;
		}
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
