/**
 * Shader Constants used across all shader programs
 */
export const SHADER_CONSTANTS = {
	MAX_COLORS: 20,
	MIN_ZOOM: 0.1,
	DEFAULT_ALPHA: 0.0,
	PRECISION: 'highp'
} as const;

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
export const GradShader = {
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

export const ImageShader = {
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
