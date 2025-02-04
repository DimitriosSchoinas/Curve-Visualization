#version 300 es

const int MAX_CONTROL_POINTS = 256;

in uint index;
uniform uint segments;
uniform vec2 control_points[MAX_CONTROL_POINTS];
uniform float point_size;
vec2 position;
uniform vec4 color;

out vec4 vColor;

uniform int curve_type; // 0 for B-Spline, 1 for Catmull-Rom, 2 for Bézier

void main() {

// Calcular o valor de t com base no índice e no número de segmentos
    float t = mod(float(index), float(segments)) / float(segments);

    int segmentIndex = int(index / segments);

    if(segmentIndex + 3 >= control_points.length()) {

        segmentIndex = control_points.length() - 4;
    }
    if(curve_type == 0) {
        vec2 P0 = control_points[segmentIndex];
        vec2 P1 = control_points[segmentIndex + 1];
        vec2 P2 = control_points[segmentIndex + 2];
        vec2 P3 = control_points[segmentIndex + 3];
         // Blending functions (funções cúbicas) B-spline
        float B0 = ((-t * t * t) + (3.0f * t * t) - (3.0f * t) + (1.0f)) / 6.0f;
        float B1 = ((3.0f * t * t * t) - (6.0f * t * t) + (4.0f)) / 6.0f;
        float B2 = ((-3.0f * t * t * t) + (3.0f * t * t) + (3.0f * t) + (1.0f)) / 6.0f;
        float B3 = (t * t * t) / 6.0f;

    // Calcular a posição da curva como a combinação linear dos pontos de controle
        position = (B0 * P0) + (B1 * P1) + (B2 * P2) + (B3 * P3);

    } else if(curve_type == 1) {
        vec2 P0 = control_points[segmentIndex];
        vec2 P1 = control_points[segmentIndex + 1];
        vec2 P2 = control_points[segmentIndex + 2];
        vec2 P3 = control_points[segmentIndex + 3];
        // Catmull-Rom blending functions
        float B0 = -0.5f * t * t * t + t * t - 0.5f * t;
        float B1 = 1.5f * t * t * t - 2.5f * t * t + 1.0f;
        float B2 = -1.5f * t * t * t + 2.0f * t * t + 0.5f * t;
        float B3 = 0.5f * t * t * t - 0.5f * t * t;

        position = B0 * P0 + B1 * P1 + B2 * P2 + B3 * P3;
    } else if(curve_type == 2) {
        int bezierSegmentIndex = (int(segmentIndex) * 3);

        vec2 P0 = control_points[bezierSegmentIndex];
        vec2 P1 = control_points[bezierSegmentIndex + 1];
        vec2 P2 = control_points[bezierSegmentIndex + 2];
        vec2 P3 = control_points[bezierSegmentIndex + 3];

        // Bézier blending functions
        float B0 = (1.0f - t) * (1.0f - t) * (1.0f - t);
        float B1 = 3.0f * t * (1.0f - t) * (1.0f - t);
        float B2 = 3.0f * t * t * (1.0f - t);
        float B3 = t * t * t;

        position = B0 * P0 + B1 * P1 + B2 * P2 + B3 * P3;
    }

    // Definir a posição do vértice
    gl_Position = vec4(position, 0.0f, 1.0f);

    vColor = color;

    gl_PointSize = point_size;
}