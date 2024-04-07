export const GradShader = {
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

export const ColorShader = {
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

export const ImageShader = {
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
