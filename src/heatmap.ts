import { GradShader, ColorShader, ImageShader } from "./shaders";
import {
	BackgroundImageConfig,
	GradientElement,
	HearmapExData,
	HeatmapConfig,
	MappedGradient,
	Point,
	ShaderProgram,
	Translate,
} from "./types";
import {
	createImageShader,
	createGradiantShader,
	createColorShader,
} from "./utils/shaderUtils";
import {
	isNullUndefined,
	isNotNumber,
	isSortedAscending,
	getPixelRatio,
} from "./utils/utils";

function gradientMapper(grad: GradientElement[]): MappedGradient {
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

	grad.forEach(function (d: GradientElement, i: number) {
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

function extractData(this: HeatmapRenderer,data: Point[]): HearmapExData {
	const self = this as HeatmapRenderer;
	const len = data.length;
	let { posVec = new Float32Array(), rVec = new Float32Array() } =
    (self.hearmapExData || {}) as HearmapExData;

	if (self._pDataLength !== len) {
		posVec = new Float32Array( new ArrayBuffer(len * 8));
		rVec = new Float32Array(new ArrayBuffer(len * 4));
		self._pDataLength = len;
	}

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
		posVec: posVec as Float32Array,
		rVec: rVec as Float32Array,
		minMax: dataMinMaxValue,
	};
}

function transCoOr(this: HeatmapRenderer, data: Point) {
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

function renderExec(this: HeatmapRenderer) {
	const ctx = this.ctx;

	if (!ctx) {
		return;
	}

	ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);

	ctx.bindTexture(ctx.TEXTURE_2D, this._fbTexObj);
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

	ctx.bindFramebuffer(ctx.FRAMEBUFFER, this._fbo);
	ctx.framebufferTexture2D(
		ctx.FRAMEBUFFER,
		ctx.COLOR_ATTACHMENT0,
		ctx.TEXTURE_2D,
		this._fbTexObj,
		0
	);

	if (this.hearmapExData) {
		renderHeatGrad.call(this, ctx, this.hearmapExData as HearmapExData);
	}
	ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
	if (this.imageConfig) {
		renderImage.call(this, ctx, this.imageConfig);
	}
	renderColorGradiant.call(this, ctx);
}

function renderHeatGrad(
		this: HeatmapRenderer,
		ctx: WebGL2RenderingContext,
		exData: HearmapExData
) {
	ctx.useProgram(this._gradShadOP.program);

	const {u_resolution, u_translate, u_zoom, u_angle, u_density, u_max, u_min, u_size, u_intensity, u_disableCircularFalloff } = this._gradShadOP.uniform;
	this.min =
    this.configMin !== null ? this.configMin : exData?.minMax?.min ?? 0;
	this.max =
    this.configMax !== null ? this.configMax : exData?.minMax?.max ?? 0;
	this._gradShadOP.attr[0].data = exData.posVec || [];
	this._gradShadOP.attr[1].data = exData.rVec || [];

	ctx.uniform2fv(
		u_resolution,
		new Float32Array([this.width * this.ratio, this.height * this.ratio])
	);
	ctx.uniform2fv(
		u_translate,
		new Float32Array([this.translate[0], this.translate[1]])
	);
	ctx.uniform1f(u_zoom, this.zoom ? this.zoom : 0.01);
	ctx.uniform1f(u_angle, this.angle);
	ctx.uniform1f(u_density, this.ratio);
	ctx.uniform1f(u_max, this.max);
	ctx.uniform1f(u_min, this.min);
	ctx.uniform1f(u_size, this.size);
	ctx.uniform1f(u_intensity, this.intensity);
	ctx.uniform1i(u_disableCircularFalloff, this.disableCircularFalloff ? 1 : 0);

	this._gradShadOP.attr.forEach(function (d) {
		ctx.bindBuffer(d.bufferType, d.buffer);
		ctx.bufferData(d.bufferType, d.data, d.drawType);
		ctx.enableVertexAttribArray(d.attribute);
		ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
	});

	if (this.disableCircularFalloff) {
		ctx.blendEquation(ctx.MAX);
	}

	ctx.drawArrays(ctx.POINTS, 0, (exData.posVec || []).length / 2);
}

function renderImage(
		this: HeatmapRenderer,
		ctx: WebGL2RenderingContext,
		imageConfig: BackgroundImageConfig
) {
	const { x = 0, y = 0, width = 0, height = 0 } = imageConfig;
	const { u_resolution, u_translate, u_zoom, u_angle, u_density, u_image } = this._imageShaOP.uniform;
	ctx.useProgram(this._imageShaOP.program);

	ctx.uniform2fv(
		u_resolution,
		new Float32Array([this.width * this.ratio, this.height * this.ratio])
	);
	ctx.uniform2fv(
		u_translate,
		new Float32Array([this.translate[0], this.translate[1]])
	);
	ctx.uniform1f(u_zoom, this.zoom ? this.zoom : 0.01);
	ctx.uniform1f(u_angle, this.angle);
	ctx.uniform1f(u_density, this.ratio);

	this._imageShaOP.attr[0].data = new Float32Array([
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

	this._imageShaOP.attr.forEach(function (d) {
		ctx.bindBuffer(d.bufferType, d.buffer);
		ctx.bufferData(d.bufferType, d.data, d.drawType);
		ctx.enableVertexAttribArray(d.attribute);
		ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
	});

	ctx.uniform1i(u_image, 0);
	ctx.activeTexture(this.ctx!.TEXTURE0);
	ctx.bindTexture(this.ctx!.TEXTURE_2D, this._imageTexture);
	ctx.drawArrays(ctx.TRIANGLES, 0, 6);
}

function renderColorGradiant(
		this: HeatmapRenderer,
		ctx: WebGL2RenderingContext
) {
	const { u_colorArr, u_colorCount, u_offset, u_opacity, u_framebuffer } = this._colorShadOP.uniform;
	ctx.useProgram(this._colorShadOP.program);

	ctx.uniform4fv(u_colorArr, this.gradient!.value);
	ctx.uniform1f(u_colorCount, this.gradient!.length);
	ctx.uniform1fv(
		u_offset,
		new Float32Array(this.gradient!.offset)
	);
	ctx.uniform1f(u_opacity, this.opacity);

	this._colorShadOP.attr.forEach(function (d) {
		ctx.bindBuffer(d.bufferType, d.buffer);
		ctx.bufferData(d.bufferType, d.data, d.drawType);
		ctx.enableVertexAttribArray(d.attribute);
		ctx.vertexAttribPointer(d.attribute, d.size, d.valueType, true, 0, 0);
	});

	ctx.uniform1i(u_framebuffer, 0);
	ctx.activeTexture(ctx.TEXTURE0);
	ctx.bindTexture(ctx.TEXTURE_2D, this._fbTexObj);

	ctx.drawArrays(ctx.TRIANGLES, 0, 6);
}

function imageInstance(
		url: string,
		onLoad: () => void,
		onError: OnErrorEventHandler
) {
	const imageIns = new Image();
	imageIns.crossOrigin = "anonymous";
	imageIns.onload = onLoad;
	imageIns.onerror = onError;
	imageIns.src = url;
	return imageIns;
}

export class HeatmapRenderer {
	ctx: WebGL2RenderingContext | null = null;
	ratio: number = 1;
	width: number = 0;
	height: number = 0;
	imageConfig: BackgroundImageConfig | null = null;
	configMin: number | null = null;
	configMax: number | null = null;
	min: number = 0;
	max: number = 0;
	size: number = 0;
	zoom: number = 0;
	angle: number = 0;
	intensity: number = 0;
	translate: [number, number] = [0, 0];
	opacity: number = 0;
	disableCircularFalloff: boolean = false;
	hearmapExData: HearmapExData | object = {};

	gradient: MappedGradient | null = null;
	_imageTexture: WebGLTexture | null = null;
	_pDataLength: number | undefined = undefined;
	_gradShadOP!: ShaderProgram;
	_colorShadOP!: ShaderProgram;
	_imageShaOP!: ShaderProgram;
	_fbTexObj!: WebGLTexture;
	_fbo!: WebGLFramebuffer;

	private layer!: HTMLCanvasElement;
	private dom!: Element;
	private imgWidth: number = 0;
	private imgHeight: number = 0;
	private heatmapData: Point[] = [];
	private type: string = "";

	constructor(container: string | HTMLElement, config: HeatmapConfig) {
		try {
			const res =
        typeof container === "string"
        	? document.querySelector(container)
        	: container instanceof HTMLElement
        		? container
        		: null;
			if (!res) {
				throw new Error("Context must be either a string or an Element");
			}
			const { clientHeight: height, clientWidth: width } = res;
			const layer = document.createElement("canvas");
			const ctx = layer.getContext("webgl2", {
				premultipliedAlpha: false,
				depth: false,
				antialias: true,
				alpha: true,
				preserveDrawingBuffer: false, // Set to false for better performance
			}) as WebGL2RenderingContext;

			this.ratio = getPixelRatio(ctx);
			ctx.clearColor(0, 0, 0, 0);
			ctx.enable(ctx.BLEND);
			ctx.blendEquation(ctx.FUNC_ADD);
			ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
			ctx.depthMask(true);
			layer.setAttribute("height", (height * this.ratio).toString());
			layer.setAttribute("width", (width * this.ratio).toString());
			layer.style.height = `${height}px`;
			layer.style.width = `${width}px`;
			layer.style.position = "absolute";
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
			this._gradShadOP = createGradiantShader(this.ctx, GradShader);
			this._colorShadOP = createColorShader(this.ctx, ColorShader);
			this._imageShaOP = createImageShader(this.ctx, ImageShader);
			this._fbTexObj = ctx.createTexture()!;
			this._fbo = ctx.createFramebuffer()!;

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

	/**
    * Invoke resize method on container resize.
    */

	resize() {
		const height = this.dom.clientHeight;
		const width = this.dom.clientWidth;
		this.layer.setAttribute("height", (height * this.ratio).toString());
		this.layer.setAttribute("width", (width * this.ratio).toString());
		this.layer.style.height = `${height}px`;
		this.layer.style.width = `${width}px`;
		this.width = width;
		this.height = height;
    	this.ctx!.viewport(0, 0, this.ctx!.canvas.width, this.ctx!.canvas.height);
    	/* Perform update */
    	this.render();
	}

	clear() {
    	this.ctx!.clear(this.ctx!.COLOR_BUFFER_BIT | this.ctx!.DEPTH_BUFFER_BIT);
	}

	/**
    * Set the maximum data value for relative gradient calculations
    * @param max - number
    * @returns instance
    */
	setMax(max: number): HeatmapRenderer {
		if (isNullUndefined(max) || isNotNumber(max)) {
			throw new Error("Invalid max: Expected Number");
		}

		this.configMax = max;
		return this;
	}

	/**
   * Set the minimum data value for relative gradient calculations
   * @param min - number
   * @returns instance
   */
	setMin(min: number): HeatmapRenderer {
		if (isNullUndefined(min) || isNotNumber(min)) {
			throw new Error("Invalid min: Expected Number");
		}

		this.configMin = min;
		return this;
	}

	/**
   * Accepts array of objects with color value and offset
   * @param gradient - Color Gradient
   * @returns instance
   */
	setGradient(gradient: GradientElement[]): HeatmapRenderer {
		this.gradient = gradientMapper(gradient);
		return this;
	}

	/**
   * Set the translate on the Heatmap
   * @param translate - Accepts array [x, y]
   * @returns instance
   */
	setTranslate(translate: Translate) {
		if (translate.constructor !== Array) {
			throw new Error("Invalid Translate: Translate has to be of Array type");
		}
		if (translate.length !== 2) {
			throw new Error("Translate has to be of length 2");
		}
		this.translate = translate;
		return this;
	}

	/**
   * Set the zoom transformation on the Heatmap
   * @param zoom - Accepts float value
   * @returns instance
   */
	setZoom(zoom: number): HeatmapRenderer {
		if (isNullUndefined(zoom) || isNotNumber(zoom)) {
			throw new Error("Invalid zoom: Expected Number");
		}

		this.zoom = zoom;
		return this;
	}

	/**
   * Set the  rotation transformation on the Heatmap
   * @param angle - Accepts angle in radians
   * @returns instance
   */
	setRotationAngle(angle: number): HeatmapRenderer {
		if (isNullUndefined(angle) || isNotNumber(angle)) {
			throw new Error("Invalid Angle: Expected Number");
		}

		this.angle = angle;
		return this;
	}

	/**
   * Set the point radius
   * @param size - Accepts float value
   * @returns instance
   */
	setSize(size: number): HeatmapRenderer {
		if (isNullUndefined(size) || isNotNumber(size)) {
			throw new Error("Invalid Size: Expected Number");
		}

		this.size = size;
		return this;
	}

	/**
   * Set the intensity factor
   * @param intensity - Accepts float value
   * @returns instance
   */
	setIntensity(intensity: number): HeatmapRenderer {
		if (isNullUndefined(intensity) || isNotNumber(intensity)) {
			this.intensity = 1.0; // applying default intensity
			throw new Error("Invalid Intensity: Expected Number");
		}

		if (intensity > 1 || intensity < 0) {
			this.intensity = intensity > 1 ? 1 : 0; // Setting bound value
			throw new Error("Invalid Intensity value " + intensity);
		}
		this.intensity = intensity;
		return this;
	}

	/**
   * Set the opacity factor
   * @param opacity - The opacity factor.
   * @returns instance
   */
	setOpacity(opacity: number): HeatmapRenderer {
		if (isNullUndefined(opacity) || isNotNumber(opacity)) {
			throw new Error("Invalid Opacity: Expected Number");
		}

		if (opacity > 1 || opacity < 0) {
			throw new Error("Invalid Opacity value " + opacity);
		}
		this.opacity = opacity;
		return this;
	}

	/**
   * Set whether to disable circular falloff
   * @param disableCircularFalloff - Boolean to disable circular falloff effect.
   * @returns instance
   */
	setDisableCircularFalloff(disableCircularFalloff: boolean): HeatmapRenderer {
		if (typeof disableCircularFalloff !== 'boolean') {
			throw new Error('Invalid disableCircularFalloff: Expected Boolean');
		}
		this.disableCircularFalloff = disableCircularFalloff;
		return this;
	}

	/**
   * Set the background image
   * @param config - Accepts Object with { url, height, width, x, and y} properties
   * @returns instance
   */
	setBackgroundImage(config: BackgroundImageConfig) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		if (!config.url) {
			return;
		}

		const maxTextureSize = this.ctx!.getParameter(this.ctx!.MAX_TEXTURE_SIZE);
		this._imageTexture = this.ctx!.createTexture();
		this.type = "TEXTURE_2D";
		this.imageConfig = null;

		this.imgWidth = config.width || this.width;
		this.imgHeight = config.height || this.height;

		this.imgWidth =
      this.imgWidth > maxTextureSize ? maxTextureSize : this.imgWidth;
		this.imgHeight =
      this.imgHeight > maxTextureSize ? maxTextureSize : this.imgHeight;

		imageInstance(
			config.url,
			function onUpdateCallBack(this: HTMLImageElement) {
        self.ctx!.activeTexture(self.ctx!.TEXTURE0);
        self.ctx!.bindTexture(self.ctx!.TEXTURE_2D, self._imageTexture);
        self.ctx!.texParameteri(
          self.ctx!.TEXTURE_2D,
          self.ctx!.TEXTURE_WRAP_S,
          self.ctx!.CLAMP_TO_EDGE
        );
        self.ctx!.texParameteri(
          self.ctx!.TEXTURE_2D,
          self.ctx!.TEXTURE_WRAP_T,
          self.ctx!.CLAMP_TO_EDGE
        );
        self.ctx!.texParameteri(
          self.ctx!.TEXTURE_2D,
          self.ctx!.TEXTURE_MIN_FILTER,
          self.ctx!.LINEAR
        );
        self.ctx!.texParameteri(
          self.ctx!.TEXTURE_2D,
          self.ctx!.TEXTURE_MAG_FILTER,
          self.ctx!.LINEAR
        );

        self.ctx!.texImage2D(
          self.ctx!.TEXTURE_2D,
          0,
          self.ctx!.RGBA,
          this.naturalWidth,
          this.naturalHeight,
          0,
          self.ctx!.RGBA,
          self.ctx!.UNSIGNED_BYTE,
          this
        );

        self.imageConfig = {
        	x: config.x || 0,
        	y: config.y || 0,
        	height: self.imgHeight,
        	width: self.imgWidth,
        	image: this,
        };

        self.render();
			},
			function onErrorCallBack(error) {
				throw new Error(`Image Load Error, ${error}`);
			}
		);
		return this;
	}

	/**
   * Clear heatmap
   */
	clearData() {
		this.heatmapData = [];
		this.hearmapExData = {};
		this.render();
	}

	/**
   * Method to append data points. This method automatically adds new data points to the existing dataset and the heatmap updates in immediately. no need to call the ".render" method separately.
   * @param data - The data points with 'x', 'y' and 'value'
   * @param transIntactFlag - Flag indicating whether to apply existing heatmap transformations on the newly added data points
   * @returns instance
   */
	addData(data: Point[], transIntactFlag: boolean): HeatmapRenderer {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
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

	/**
   * Method to load data. This will override any existing data.
   * @param data - Accepts an array of data points with 'x', 'y' and 'value'
   * @returns instance
   */
	renderData(data: Point[]): HeatmapRenderer {
		if (data.constructor !== Array) {
			throw new Error("Expected Array type");
		}
		this.hearmapExData = extractData.call(this, data);
		this.heatmapData = data;
		this.render();
		return this;
	}

	/**
   * Method to update the heatmap. This method to be invoked on every change in configuration.
   */
	render() {
		renderExec.call(this);
	}

	/**
   * Get projected co-ordinates relative to the heatmap
   * @param data - The data point to project.
   * @returns projected data point.
   */
	projection(data: Point) {
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

		return { x: posX, y: posY };
	}

	/**
	 * Extract the rendered canvas as an image blob
	 * @param mimeType - The image format (e.g., 'image/png', 'image/jpeg'). Defaults to 'image/png'
	 * @param quality - A number between 0 and 1 indicating image quality for lossy formats. Defaults to 0.92
	 * @returns Promise that resolves with a Blob containing the image data
	 */
	toBlob(mimeType: string = 'image/png', quality: number = 0.92): Promise<Blob> {
		return new Promise((resolve, reject) => {
			try {
				 // Store current context
				const currentCtx = this.ctx;
				
				// Create new context with preserveDrawingBuffer enabled
				const newCtx = this.layer.getContext('webgl2', {
					premultipliedAlpha: false,
					depth: false,
					antialias: true,
					alpha: true,
					preserveDrawingBuffer: true
				}) as WebGL2RenderingContext;

				if (!newCtx) {
					throw new Error('Failed to create WebGL2 context');
				}

				// Temporarily switch context and render
				this.ctx = newCtx;
				this.render();

				// Get the blob
				this.layer.toBlob(
					(blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error('Failed to create blob from canvas'));
						}
						
						// Restore original context
						this.ctx = currentCtx;
						this.render(); // Re-render with original context
					},
					mimeType,
					quality
				);
			} catch (error) {
				reject(error);
			}
		});
	}
}
