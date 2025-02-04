#version 300 es

precision mediump float;

in vec4 vColor;

out vec4 fragColor;

void main() {

 // Convert gl_PointCoord to range [-1, 1]
    vec2 coord = 2.0 * gl_PointCoord - 1.0;

    // Calculate the distance of the current fragment from the center of the point
    float dist = length(coord);

    // If the fragment is outside the circle (distance > 1), discard it
    if (dist > 1.0) {
        discard;
    }

    fragColor = vColor;
}
