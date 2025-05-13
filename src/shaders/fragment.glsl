precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;

// Balatro parameters (made into uniforms for easy tweaking)
uniform float spin_rotation_speed;
uniform float move_speed;
uniform float contrast;
uniform float lighting;
uniform float spin_amount;
uniform float pixel_filter;
uniform bool is_rotating;

// Constants
const float SPIN_EASE = 1.0;
const vec3 colour_1 = vec3(0.871, 0.267, 0.231); // Red
const vec3 colour_2 = vec3(0.0, 0.42, 0.706);    // Blue
const vec3 colour_3 = vec3(0.086, 0.137, 0.145);  // Dark

void main() {
    // Pixel size calculation (exactly like Balatro)
    vec2 screenSize = vec2(1920.0, 1080.0);
    float pixel_size = length(screenSize.xy) / pixel_filter;
    vec2 uv = (floor(vUv.xy * screenSize.xy * (1.0/pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy);
    float uv_len = length(uv);

    // Rotation calculation (matching Balatro)
    float speed = (spin_rotation_speed * SPIN_EASE * 0.2);
    if(is_rotating) {
        speed = uTime * speed;
    }
    speed += 302.2;

    // Pixel angle calculation (exact Balatro formula)
    float new_pixel_angle = atan(uv.y, uv.x) + speed - SPIN_EASE * 20.0 * (1.0 * spin_amount * uv_len + (1.0 - 1.0 * spin_amount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);

    // Scale and create paint effect (matching Balatro)
    uv *= 30.0;
    speed = uTime * move_speed;
    vec2 uv2 = vec2(uv.x + uv.y);

    // Paint effect iterations (exact Balatro loop)
    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
    }

    // Color calculations (exact Balatro formulas)
    float contrast_mod = (0.25 * contrast + 0.5 * spin_amount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);

    // Lighting (exact Balatro calculation)
    float light = (lighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + 
                  lighting * max(c2p * 5.0 - 4.0, 0.0);

    // Final color mixing (exact Balatro formula)
    vec3 finalColor = (0.3/contrast) * colour_1 + 
                     (1.0 - 0.3/contrast) * (
                         colour_1 * c1p + 
                         colour_2 * c2p + 
                         colour_3 * c3p
                     ) + light;

    gl_FragColor = vec4(finalColor, 1.0);
} 