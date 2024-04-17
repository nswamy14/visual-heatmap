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

	if (self.pLen !== len) {
		self.buffer = new ArrayBuffer(len * 8);
		posVec = new Float32Array(self.buffer);
		self.buffer2 = new ArrayBuffer(len * 4);
		rVec = new Float32Array(self.buffer2);
		self.pLen = len;
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

function renderImage(
		this: HeatmapRenderer,
		ctx: WebGL2RenderingContext,
		imageConfig: BackgroundImageConfig
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

function renderColorGradiant(
		this: HeatmapRenderer,
		ctx: WebGL2RenderingContext
) {
	ctx.useProgram(this.colorShadOP.program);

	ctx.uniform4fv(this.colorShadOP.uniform.u_colorArr, this.gradient!.value);
	ctx.uniform1f(this.colorShadOP.uniform.u_colorCount, this.gradient!.length);
	ctx.uniform1fv(
		this.colorShadOP.uniform.u_offset,
		new Float32Array(this.gradient!.offset)
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
	hearmapExData: HearmapExData | object = {};

	gradShadOP!: ShaderProgram;
	colorShadOP!: ShaderProgram;
	imageShaOP!: ShaderProgram;
	fbTexObj!: WebGLTexture;
	fbo!: WebGLFramebuffer;
	size: number = 0;
	zoom: number = 0;
	angle: number = 0;
	intensity: number = 0;
	translate: [number, number] = [0, 0];
	opacity: number = 0;
	gradient: MappedGradient | null = null;
	imageTexture: WebGLTexture | null = null;
	pLen: number | undefined = undefined;
	buffer: ArrayBuffer | undefined = undefined;
	buffer2: ArrayBuffer | undefined = undefined;

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
				preserveDrawingBuffer: false,
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
			this.gradShadOP = createGradiantShader(this.ctx, GradShader);
			this.colorShadOP = createColorShader(this.ctx, ColorShader);
			this.imageShaOP = createImageShader(this.ctx, ImageShader);
			this.fbTexObj = ctx.createTexture()!;
			this.fbo = ctx.createFramebuffer()!;

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

	setMax(max: number): HeatmapRenderer {
		if (isNullUndefined(max) || isNotNumber(max)) {
			throw new Error("Invalid max: Expected Number");
		}

		this.configMax = max;
		return this;
	}

	setMin(min: number): HeatmapRenderer {
		if (isNullUndefined(min) || isNotNumber(min)) {
			throw new Error("Invalid min: Expected Number");
		}

		this.configMin = min;
		return this;
	}

	setGradient(gradient: GradientElement[]): HeatmapRenderer {
		this.gradient = gradientMapper(gradient);
		return this;
	}

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

	setZoom(zoom: number): HeatmapRenderer {
		if (isNullUndefined(zoom) || isNotNumber(zoom)) {
			throw new Error("Invalid zoom: Expected Number");
		}

		this.zoom = zoom;
		return this;
	}

	setRotationAngle(angle: number): HeatmapRenderer {
		if (isNullUndefined(angle) || isNotNumber(angle)) {
			throw new Error("Invalid Angle: Expected Number");
		}

		this.angle = angle;
		return this;
	}

	setSize(size: number): HeatmapRenderer {
		if (isNullUndefined(size) || isNotNumber(size)) {
			throw new Error("Invalid Size: Expected Number");
		}

		this.size = size;
		return this;
	}

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

	setBackgroundImage(config: BackgroundImageConfig) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		if (!config.url) {
			return;
		}

		const maxTextureSize = this.ctx!.getParameter(this.ctx!.MAX_TEXTURE_SIZE);
		this.imageTexture = this.ctx!.createTexture();
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
        self.ctx!.bindTexture(self.ctx!.TEXTURE_2D, self.imageTexture);
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

	clearData() {
		this.heatmapData = [];
		this.hearmapExData = {};
		this.render();
	}

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

	renderData(data: Point[]): HeatmapRenderer {
		if (data.constructor !== Array) {
			throw new Error("Expected Array type");
		}
		this.hearmapExData = extractData.call(this, data);
		this.heatmapData = data;
		this.render();
		return this;
	}

	render() {
		renderExec.call(this);
	}

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
}
