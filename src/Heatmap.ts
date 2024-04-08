import {
  BackgroundImageConfig,
  GradientStop,
  HeatmapConfig,
  Point,
  ShaderProgram,
  Translate,
} from "./types";
import { gradientMapper, isNotNumber, isNullUndefined } from "./utils";
import {
  extractData,
  getPixelRatio,
  imageInstance,
  renderExec,
  transCoOr,
} from "./utils/heatmap.utils";
import {
  createColorShader,
  createGradiantShader,
  createImageShader,
} from "./utils/shader.utils";

export class Heatmap {
  public ctx: WebGL2RenderingContext | null = null;
  public ratio: number = 0;
  public width: number = 0;
  public height: number = 0;
  public imageConfig: BackgroundImageConfig | null = null;
  public configMin: number | null = null;
  public configMax: number | null = null;
  min: number = 0;
  max: number = 0;
  public hearmapExData: any = null;
  private layer!: HTMLCanvasElement;
  private dom!: HTMLElement;
  public gradShadOP!: ShaderProgram;
  public colorShadOP!: ShaderProgram;
  public imageShaOP!: ShaderProgram;
  public fbTexObj!: WebGLTexture;
  public fbo!: WebGLFramebuffer;
  public size: number = 0;
  public zoom: number = 0;
  public angle: number = 0;
  public intensity: number = 0;
  public translate: [number, number] = [0, 0];
  public opacity: number = 0;
  public gradient: GradientStop[] = [];
  public imageTexture: WebGLTexture | null = null;
  private imgWidth: number = 0;
  private imgHeight: number = 0;
  private heatmapData: Point[] = [];
  private type: string = "";

  constructor(context: string | HTMLElement, config: HeatmapConfig = {}) {
    try {
      const res =
        typeof context === "string"
          ? document.querySelector(context)
          : context instanceof HTMLElement
          ? context
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
      this.dom = res as HTMLElement;
      this.gradShadOP = createGradiantShader(this.ctx);
      this.colorShadOP = createColorShader(this.ctx);
      this.imageShaOP = createImageShader(this.ctx);
      const texture = ctx.createTexture();
      if (texture !== null) {
        this.fbTexObj = texture;
      }
      const frameBuffer = ctx.createFramebuffer();
      if (frameBuffer !== null) {
        this.fbo = frameBuffer;
      }

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

      this.gradient = gradientMapper(
        config.gradient || []
      ) as unknown as GradientStop[];

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
    if (this.ctx) {
      this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    } else {
      console.error("WebGL context is null.");
    }
    /* Perform update */
    // TODO ISSUE???
    this.render(this.hearmapExData);
  }

  clear() {
    if (this.ctx) {
      this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
    } else {
      console.error("WebGL context is null.");
    }
  }

  setMax(max: number): Heatmap {
    if (isNullUndefined(max) || isNotNumber(max)) {
      throw new Error("Invalid max: Expected Number");
    }

    this.configMax = max;
    return this;
  }

  // TODO NEED TO CHECK THESE PARAMS TYPES
  setMin(min: number): Heatmap {
    if (isNullUndefined(min) || isNotNumber(min)) {
      throw new Error("Invalid min: Expected Number");
    }

    this.configMin = min;
    return this;
  }

  setGradient(gradient: GradientStop[]): Heatmap {
    this.gradient = Array.from(gradientMapper(gradient));
    return this;
  }

  setTranslate(translate: Translate): Heatmap {
    if (translate.constructor !== Array) {
      throw new Error("Invalid Translate: Translate has to be of Array type");
    }
    if (translate.length !== 2) {
      throw new Error("Translate has to be of length 2");
    }
    this.translate = translate;
    return this;
  }

  setZoom(zoom: number): Heatmap {
    if (isNullUndefined(zoom) || isNotNumber(zoom)) {
      throw new Error("Invalid zoom: Expected Number");
    }

    this.zoom = zoom;
    return this;
  }

  setRotationAngle(angle: number): Heatmap {
    if (isNullUndefined(angle) || isNotNumber(angle)) {
      throw new Error("Invalid Angle: Expected Number");
    }

    this.angle = angle;
    return this;
  }

  setSize(size: number): Heatmap {
    if (isNullUndefined(size) || isNotNumber(size)) {
      throw new Error("Invalid Size: Expected Number");
    }

    this.size = size;
    return this;
  }

  setIntensity(intensity: number): Heatmap {
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

  setOpacity(opacity: number): Heatmap {
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
    const self = this;
    if (!config.url) {
      return;
    }

    if (!this.ctx) {
      return;
    }

    const maxTextureSize = this.ctx.getParameter(this.ctx.MAX_TEXTURE_SIZE);
    this.imageTexture = this.ctx.createTexture();
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
      function onUpdateCallBack() {
        if (!self.ctx) {
          throw new Error("WebGL context is not initialized.");
        }

        self.ctx.activeTexture(self.ctx.TEXTURE0);
        self.ctx.bindTexture(self.ctx.TEXTURE_2D, self.imageTexture);
        self.ctx.texParameteri(
          self.ctx.TEXTURE_2D,
          self.ctx.TEXTURE_WRAP_S,
          self.ctx.CLAMP_TO_EDGE
        );
        self.ctx.texParameteri(
          self.ctx.TEXTURE_2D,
          self.ctx.TEXTURE_WRAP_T,
          self.ctx.CLAMP_TO_EDGE
        );
        self.ctx.texParameteri(
          self.ctx.TEXTURE_2D,
          self.ctx.TEXTURE_MIN_FILTER,
          self.ctx.LINEAR
        );
        self.ctx.texParameteri(
          self.ctx.TEXTURE_2D,
          self.ctx.TEXTURE_MAG_FILTER,
          self.ctx.LINEAR
        );

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
          height: self.imgHeight,
          width: self.imgWidth,
          image: this,
        };

        self.render();
      },
      function onErrorCallBack(error) {
        throw new Error("Image Load Error", error);
      }
    );
    return this;
  }

  clearData() {
    this.heatmapData = [];
    this.hearmapExData = {};
    this.render();
  }

  addData(data: Point[], transIntactFlag: boolean): this {
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

  renderData(data: Point[]): this {
    if (data.constructor !== Array) {
      throw new Error("Expected Array type");
    }
    this.hearmapExData = extractData(data, this);
    this.heatmapData = data;
    this.render();
    return this;
  }

  render() {
    renderExec.call(this);
  }

  projection(data: { x: number; y: number }): { x: number; y: number } {
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
