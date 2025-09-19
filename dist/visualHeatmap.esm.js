/*!
      * Heatmap
      * (c) 2025 Narayana Swamy (narayanaswamy14@gmail.com)
      * @license BSD-3-Clause
      */
/**
 * Shader Constants used across all shader programs
 */
const SHADER_CONSTANTS = {
    MAX_COLORS: 20,
    MIN_ZOOM: 0.1,
    DEFAULT_ALPHA: 0.0,
    PRECISION: 'highp'
};
/**
 * Common rotation function used in shaders
 */
const commonRotationFunction = `
vec2 rotation(vec2 v, float a, float aspect) {
    float s = sin(a);
    float c = cos(a);
    mat2 rotationMat = mat2(c, -s, s, c);
    mat2 scaleMat = mat2(aspect, 0.0, 0.0, 1.0);
    mat2 scaleMatInv = mat2(1.0/aspect, 0.0, 0.0, 1.0);
    return scaleMatInv * rotationMat * scaleMat * v;
}`;
/**
 * GradShader: Handles the gradient rendering for heatmap points
 * - vertex: Handles point positioning and size
 * - fragment: Calculates point color and intensity
 */
const GradShader = {
    vertex: `#version 300 es
        precision ${SHADER_CONSTANTS.PRECISION} float;
        in vec2 a_position;
        in float a_intensity;
        uniform float u_size;
        uniform vec2 u_resolution;
        uniform vec2 u_translate; 
        uniform float u_zoom; 
        uniform float u_angle; 
        uniform float u_density;
        out float v_i;

        ${commonRotationFunction}

        void main() {
            vec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);
            vec2 zeroToTwo = zeroToOne * 2.0 - 1.0;
            float zoomFactor = max(u_zoom, ${SHADER_CONSTANTS.MIN_ZOOM});
            zeroToTwo = zeroToTwo / zoomFactor;
            if (u_angle != 0.0) {
                zeroToTwo = rotation(zeroToTwo, u_angle, u_resolution.x / u_resolution.y);
            }
            gl_Position = vec4(zeroToTwo, 0, 1);
            gl_PointSize = u_size * u_density;
            v_i = a_intensity;
        }`,
    fragment: `#version 300 es
        precision ${SHADER_CONSTANTS.PRECISION} float;
        uniform float u_max;
        uniform float u_min;
        uniform float u_intensity;
        uniform bool u_disableCircularFalloff;
        in float v_i;
        out vec4 fragColor;
        
        void main() {
            float r = 0.0;
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            r = dot(cxy, cxy);
            float deno = max(u_max - u_min, 1e-6);  // Prevent division by zero
            
            if(r <= 1.0) {
                float alpha;
                if(u_disableCircularFalloff) {
                    // No circular falloff - uniform intensity within the point
                    alpha = ((v_i - u_min) / deno) * u_intensity;
                } else {
                    // Apply circular falloff for smoother gradients
                    alpha = ((v_i - u_min) / deno) * u_intensity * (1.0 - sqrt(r));
                }

                alpha = clamp(alpha, 0.0, 1.0);  // Clamp alpha to valid range
                fragColor = vec4(0, 0, 0, alpha);
            } else {
                discard;  // Don't process pixels outside the point
            }
        }`,
};
const ColorShader = {
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
        #define MAX_COLORS ${SHADER_CONSTANTS.MAX_COLORS}
        precision ${SHADER_CONSTANTS.PRECISION} float;
        
        in vec2 v_texCoord;
        out vec4 fragColor;
        uniform sampler2D u_framebuffer;
        uniform vec4 u_colorArr[MAX_COLORS];
        uniform float u_colorCount;
        uniform float u_opacity;
        uniform float u_offset[MAX_COLORS];

        void main() {
            float alpha = texture(u_framebuffer, v_texCoord.xy).a;
            
            if (alpha <= 0.0 || alpha > 1.0) {
                discard;
                return;
            }

            vec4 color_;
            if (alpha <= u_offset[0]) {
                color_ = u_colorArr[0];
            } else {
                for (int i = 1; i < MAX_COLORS && i < int(u_colorCount); ++i) {
                    if (alpha <= u_offset[i]) {
                        float t = (alpha - u_offset[i - 1]) / (u_offset[i] - u_offset[i - 1]);
                        color_ = mix(u_colorArr[i - 1], u_colorArr[i], t);
                        break;
                    }
                }
            }

            color_ *= u_opacity;
            color_.a = max(0.0, color_.a);
            fragColor = color_;
        }
    `,
};
const ImageShader = {
    vertex: `#version 300 es
        precision ${SHADER_CONSTANTS.PRECISION} float;
        in vec2 a_position;
        in vec2 a_texCoord;
        uniform vec2 u_resolution;
        uniform vec2 u_translate; 
        uniform float u_zoom; 
        uniform float u_angle; 
        uniform float u_density;
        out vec2 v_texCoord;

        ${commonRotationFunction}

        void main() {
            vec2 zeroToOne = (a_position * u_density + u_translate * u_density) / (u_resolution);
            zeroToOne.y = 1.0 - zeroToOne.y;
            vec2 zeroToTwo = zeroToOne * 2.0 - 1.0;
            float zoomFactor = max(u_zoom, ${SHADER_CONSTANTS.MIN_ZOOM});
            zeroToTwo = zeroToTwo / zoomFactor;
            
            if (u_angle != 0.0) {
                zeroToTwo = rotation(zeroToTwo, u_angle * -1.0, u_resolution.x / u_resolution.y);
            }

            gl_Position = vec4(zeroToTwo, 0, 1);
            v_texCoord = a_texCoord;
        }
    `,
    fragment: `#version 300 es
        precision ${SHADER_CONSTANTS.PRECISION} float;
        uniform sampler2D u_image;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        void main() {
            vec4 texColor = texture(u_image, v_texCoord);
            if (texColor.a < 0.01) {
                discard;  // Don't process nearly transparent pixels
            }
            fragColor = texColor;
        }
    `,
};

function createShader(ctx, type, src) {
    const shader = ctx.createShader(ctx[type]);
    if (!shader) {
        throw new Error("Failed to create shader.");
    }
    ctx.shaderSource(shader, src);
    ctx.compileShader(shader);
    const compiled = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
    if (!compiled) {
        const lastError = ctx.getShaderInfoLog(shader);
        ctx.deleteShader(shader);
        throw new Error("*** Error compiling shader '" + shader + "':" + lastError);
    }
    return shader;
}
function createProgram(ctx, shader) {
    const vshader = createShader(ctx, "VERTEX_SHADER", shader.vertex);
    const fshader = createShader(ctx, "FRAGMENT_SHADER", shader.fragment);
    const program = ctx.createProgram();
    if (!program) {
        throw new Error("Failed to create program.");
    }
    ctx.attachShader(program, vshader);
    ctx.attachShader(program, fshader);
    ctx.linkProgram(program);
    const linked = ctx.getProgramParameter(program, ctx.LINK_STATUS);
    if (!linked) {
        const lastError = ctx.getProgramInfoLog(program);
        ctx.deleteProgram(program);
        throw new Error("Error in program linking:" + lastError);
    }
    else {
        return program;
    }
}
const createImageShader = function (ctx, shader) {
    const program = createProgram(ctx, shader);
    const positionBuffer = ctx.createBuffer();
    if (!positionBuffer) {
        throw new Error("Failed to create position buffer.");
    }
    const texCoordBuffer = ctx.createBuffer();
    if (!texCoordBuffer) {
        throw new Error("Failed to create texture coordinate buffer.");
    }
    return {
        program: program,
        attr: [
            {
                bufferType: ctx.ARRAY_BUFFER,
                buffer: positionBuffer,
                drawType: ctx.STATIC_DRAW,
                valueType: ctx.FLOAT,
                size: 2,
                attribute: ctx.getAttribLocation(program, "a_position"),
                data: new Float32Array([]),
            },
            {
                bufferType: ctx.ARRAY_BUFFER,
                buffer: texCoordBuffer,
                drawType: ctx.STATIC_DRAW,
                valueType: ctx.FLOAT,
                size: 2,
                attribute: ctx.getAttribLocation(program, "a_texCoord"),
                data: new Float32Array([
                    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
                ]),
            },
        ],
        uniform: {
            u_resolution: ctx.getUniformLocation(program, "u_resolution"),
            u_image: ctx.getUniformLocation(program, "u_image"),
            u_translate: ctx.getUniformLocation(program, "u_translate"),
            u_zoom: ctx.getUniformLocation(program, "u_zoom"),
            u_angle: ctx.getUniformLocation(program, "u_angle"),
            u_density: ctx.getUniformLocation(program, "u_density"),
        },
    };
};
const createGradiantShader = function (ctx, shader) {
    const program = createProgram(ctx, shader);
    const positionBuffer = ctx.createBuffer();
    if (!positionBuffer) {
        throw new Error("Failed to create position buffer.");
    }
    const intensityBuffer = ctx.createBuffer();
    if (!intensityBuffer) {
        throw new Error("Failed to create intensity buffer.");
    }
    return {
        program: program,
        attr: [
            {
                bufferType: ctx.ARRAY_BUFFER,
                buffer: positionBuffer,
                drawType: ctx.STATIC_DRAW,
                valueType: ctx.FLOAT,
                size: 2,
                attribute: ctx.getAttribLocation(program, "a_position"),
                data: new Float32Array([]),
            },
            {
                bufferType: ctx.ARRAY_BUFFER,
                buffer: intensityBuffer,
                drawType: ctx.STATIC_DRAW,
                valueType: ctx.FLOAT,
                size: 1,
                attribute: ctx.getAttribLocation(program, "a_intensity"),
                data: new Float32Array([]),
            },
        ],
        uniform: {
            u_resolution: ctx.getUniformLocation(program, "u_resolution"),
            u_max: ctx.getUniformLocation(program, "u_max"),
            u_min: ctx.getUniformLocation(program, "u_min"),
            u_size: ctx.getUniformLocation(program, "u_size"),
            u_intensity: ctx.getUniformLocation(program, "u_intensity"),
            u_translate: ctx.getUniformLocation(program, "u_translate"),
            u_zoom: ctx.getUniformLocation(program, "u_zoom"),
            u_angle: ctx.getUniformLocation(program, "u_angle"),
            u_density: ctx.getUniformLocation(program, "u_density"),
            u_disableCircularFalloff: ctx.getUniformLocation(program, "u_disableCircularFalloff"),
        },
    };
};
const createColorShader = function (ctx, shader) {
    const program = createProgram(ctx, shader);
    const texCoordBuffer = ctx.createBuffer();
    if (!texCoordBuffer) {
        throw new Error("Failed to create texture coordinate buffer.");
    }
    return {
        program: program,
        attr: [
            {
                bufferType: ctx.ARRAY_BUFFER,
                buffer: texCoordBuffer,
                drawType: ctx.STATIC_DRAW,
                valueType: ctx.FLOAT,
                size: 2,
                attribute: ctx.getAttribLocation(program, "a_texCoord"),
                data: new Float32Array([
                    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
                ]),
            },
        ],
        uniform: {
            u_framebuffer: ctx.getUniformLocation(program, "u_framebuffer"),
            u_colorArr: ctx.getUniformLocation(program, "u_colorArr"),
            u_colorCount: ctx.getUniformLocation(program, "u_colorCount"),
            u_opacity: ctx.getUniformLocation(program, "u_opacity"),
            u_offset: ctx.getUniformLocation(program, "u_offset"),
        },
    };
};

function isNullUndefined(val) {
    return val === null || val === undefined;
}
function isNotNumber(val) {
    return typeof val !== "number";
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSortedAscending(arr) {
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i + 1].offset - arr[i].offset < 0) {
            return false;
        }
    }
    return true;
}
/** @see https://codereview.chromium.org/156833002/ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPixelRatio(ctx) {
    const dpr = window.devicePixelRatio || 1;
    const bsr = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1;
    return dpr / bsr;
}

function gradientMapper(grad) {
    if (!Array.isArray(grad) || grad.length < 2) {
        throw new Error("Invalid gradient: Expected an array with at least 2 elements.");
    }
    if (!isSortedAscending(grad)) {
        throw new Error("Invalid gradient: Gradient is not sorted");
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
        offset: offsets,
    };
}
function extractData(data) {
    const self = this;
    const len = data.length;
    let { posVec = new Float32Array(), rVec = new Float32Array() } = (self.hearmapExData || {});
    if (self._pDataLength !== len) {
        posVec = new Float32Array(new ArrayBuffer(len * 8));
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
        posVec: posVec,
        rVec: rVec,
        minMax: dataMinMaxValue,
    };
}
function transCoOr(data) {
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
function renderExec() {
    const ctx = this.ctx;
    if (!ctx) {
        return;
    }
    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
    ctx.bindTexture(ctx.TEXTURE_2D, this._fbTexObj);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, this.width * this.ratio, this.height * this.ratio, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, this._fbo);
    ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, this._fbTexObj, 0);
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
    var _a, _b, _c, _d;
    ctx.useProgram(this._gradShadOP.program);
    const { u_resolution, u_translate, u_zoom, u_angle, u_density, u_max, u_min, u_size, u_intensity, u_disableCircularFalloff } = this._gradShadOP.uniform;
    this.min =
        this.configMin !== null ? this.configMin : (_b = (_a = exData === null || exData === void 0 ? void 0 : exData.minMax) === null || _a === void 0 ? void 0 : _a.min) !== null && _b !== void 0 ? _b : 0;
    this.max =
        this.configMax !== null ? this.configMax : (_d = (_c = exData === null || exData === void 0 ? void 0 : exData.minMax) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : 0;
    this._gradShadOP.attr[0].data = exData.posVec || [];
    this._gradShadOP.attr[1].data = exData.rVec || [];
    ctx.uniform2fv(u_resolution, new Float32Array([this.width * this.ratio, this.height * this.ratio]));
    ctx.uniform2fv(u_translate, new Float32Array([this.translate[0], this.translate[1]]));
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
function renderImage(ctx, imageConfig) {
    const { x = 0, y = 0, width = 0, height = 0 } = imageConfig;
    const { u_resolution, u_translate, u_zoom, u_angle, u_density, u_image } = this._imageShaOP.uniform;
    ctx.useProgram(this._imageShaOP.program);
    ctx.uniform2fv(u_resolution, new Float32Array([this.width * this.ratio, this.height * this.ratio]));
    ctx.uniform2fv(u_translate, new Float32Array([this.translate[0], this.translate[1]]));
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
    ctx.activeTexture(this.ctx.TEXTURE0);
    ctx.bindTexture(this.ctx.TEXTURE_2D, this._imageTexture);
    ctx.drawArrays(ctx.TRIANGLES, 0, 6);
}
function renderColorGradiant(ctx) {
    const { u_colorArr, u_colorCount, u_offset, u_opacity, u_framebuffer } = this._colorShadOP.uniform;
    ctx.useProgram(this._colorShadOP.program);
    ctx.uniform4fv(u_colorArr, this.gradient.value);
    ctx.uniform1f(u_colorCount, this.gradient.length);
    ctx.uniform1fv(u_offset, new Float32Array(this.gradient.offset));
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
function imageInstance(url, onLoad, onError) {
    const imageIns = new Image();
    imageIns.crossOrigin = "anonymous";
    imageIns.onload = onLoad;
    imageIns.onerror = onError;
    imageIns.src = url;
    return imageIns;
}
class HeatmapRenderer {
    constructor(container, config) {
        this.ctx = null;
        this.ratio = 1;
        this.width = 0;
        this.height = 0;
        this.imageConfig = null;
        this.configMin = null;
        this.configMax = null;
        this.min = 0;
        this.max = 0;
        this.size = 0;
        this.zoom = 0;
        this.angle = 0;
        this.intensity = 0;
        this.translate = [0, 0];
        this.opacity = 0;
        this.disableCircularFalloff = false;
        this.hearmapExData = {};
        this.gradient = null;
        this._imageTexture = null;
        this._pDataLength = undefined;
        this.imgWidth = 0;
        this.imgHeight = 0;
        this.heatmapData = [];
        this.type = "";
        try {
            const res = typeof container === "string"
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
            });
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
            this._fbTexObj = ctx.createTexture();
            this._fbo = ctx.createFramebuffer();
            if (!isNullUndefined(config.size)) {
                this.setSize(config.size);
            }
            else {
                this.size = 20.0;
            }
            if (!isNullUndefined(config.max)) {
                this.setMax(config.max);
            }
            else {
                this.configMax = null;
            }
            if (!isNullUndefined(config.min)) {
                this.setMin(config.min);
            }
            else {
                this.configMin = null;
            }
            if (!isNullUndefined(config.intensity)) {
                this.setIntensity(config.intensity);
            }
            else {
                this.intensity = 1.0;
            }
            if (!isNullUndefined(config.translate)) {
                this.setTranslate(config.translate);
            }
            else {
                this.translate = [0, 0];
            }
            if (!isNullUndefined(config.zoom)) {
                this.setZoom(config.zoom);
            }
            else {
                this.zoom = 1.0;
            }
            if (!isNullUndefined(config.angle)) {
                this.setRotationAngle(config.angle);
            }
            else {
                this.angle = 0.0;
            }
            if (!isNullUndefined(config.opacity)) {
                this.setOpacity(config.opacity);
            }
            else {
                this.opacity = 1.0;
            }
            this.gradient = gradientMapper(config.gradient);
            if (config.backgroundImage && config.backgroundImage.url) {
                this.setBackgroundImage(config.backgroundImage);
            }
            this.heatmapData = [];
            this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        }
        catch (error) {
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
        this.ctx.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        /* Perform update */
        this.render();
    }
    clear() {
        this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
    }
    /**
    * Set the maximum data value for relative gradient calculations
    * @param max - number
    * @returns instance
    */
    setMax(max) {
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
    setMin(min) {
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
    setGradient(gradient) {
        this.gradient = gradientMapper(gradient);
        return this;
    }
    /**
   * Set the translate on the Heatmap
   * @param translate - Accepts array [x, y]
   * @returns instance
   */
    setTranslate(translate) {
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
    setZoom(zoom) {
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
    setRotationAngle(angle) {
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
    setSize(size) {
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
    setIntensity(intensity) {
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
    setOpacity(opacity) {
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
    setDisableCircularFalloff(disableCircularFalloff) {
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
    setBackgroundImage(config) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        if (!config.url) {
            return;
        }
        const maxTextureSize = this.ctx.getParameter(this.ctx.MAX_TEXTURE_SIZE);
        this._imageTexture = this.ctx.createTexture();
        this.type = "TEXTURE_2D";
        this.imageConfig = null;
        this.imgWidth = config.width || this.width;
        this.imgHeight = config.height || this.height;
        this.imgWidth =
            this.imgWidth > maxTextureSize ? maxTextureSize : this.imgWidth;
        this.imgHeight =
            this.imgHeight > maxTextureSize ? maxTextureSize : this.imgHeight;
        imageInstance(config.url, function onUpdateCallBack() {
            self.ctx.activeTexture(self.ctx.TEXTURE0);
            self.ctx.bindTexture(self.ctx.TEXTURE_2D, self._imageTexture);
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
                image: this,
            };
            self.render();
        }, function onErrorCallBack(error) {
            throw new Error(`Image Load Error, ${error}`);
        });
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
    addData(data, transIntactFlag) {
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
    renderData(data) {
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
        return { x: posX, y: posY };
    }
    /**
     * Extract the rendered canvas as an image blob
     * @param mimeType - The image format (e.g., 'image/png', 'image/jpeg'). Defaults to 'image/png'
     * @param quality - A number between 0 and 1 indicating image quality for lossy formats. Defaults to 0.92
     * @returns Promise that resolves with a Blob containing the image data
     */
    toBlob(mimeType = 'image/png', quality = 0.92) {
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
                });
                if (!newCtx) {
                    throw new Error('Failed to create WebGL2 context');
                }
                // Temporarily switch context and render
                this.ctx = newCtx;
                this.render();
                // Get the blob
                this.layer.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    }
                    else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                    // Restore original context
                    this.ctx = currentCtx;
                    this.render(); // Re-render with original context
                }, mimeType, quality);
            }
            catch (error) {
                reject(error);
            }
        });
    }
}

function main (context, config) {
    return new HeatmapRenderer(context, config);
}

export { main as default };
