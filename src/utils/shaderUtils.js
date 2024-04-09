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


export const createImageShader = function (ctx, shader) {
	var program = createProgram(ctx, shader);
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
};

export const createGradiantShader = function (ctx, shader) {
	var program = createProgram(ctx, shader);
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
};

export const createColorShader = function (ctx, shader) {
	var program = createProgram(ctx, shader);
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
};
