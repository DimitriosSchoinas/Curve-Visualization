import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { vec2, vec4 } from "../../libs/MV.js";

var gl;
var canvas;
var control_points = [];// Array that saves all the control points of the curve being edited currently
var draw_program;
var collecting_points = true; // Variable set to true when we are currently editing a curve and set to false when no curve is being edited currently
var is_drawing = false;  // Variavel para indicar se o botao do mouse esta pressionado
var min_distance = 0.05;  // Distancia mi­nima entre pontos para evitar sobreposicao
var segments = 5;  // Numero de segmentos, pode ser alterado conforme necessidade
var vao;
var just_clicked = false; // Variable to check if after a mouse up we finished a mousemove type of curve (if true we are currently editing a curve with the clicks mode)
var saved_curves = []; // Array that saves all the finished curves
var is_drawn = true; // When set to true draw the curves and when set to false dont
var show_points = false; // When set to true draw the points and when set to false dont
var saved_speeds = [];  // Speeds for the control points of each saved curve
var is_animating = true;  // Toggle for animation
var control_point_speeds = [];// Speeds for the control points of the current curve
var point_size = (Math.random() * 10) + 3; // size of the points drawn when show_points is set to true
var speed_multiplier = 1.0; // base speed multiplier, can be increased or decreased
var curve_colours = []; // Array that saves the colours of the finished curves
var current_colour = vec4(0.0, 0.0, 0.0, 0.0);
var curve_type = 0; // 0 = B-Spline, 1 = Catmull-Rom, 2 = Bézier
/**
 * Resize event handler
 * 
 * @param {*} target - The window that has resized
 */
function resize(target) {
    // Aquire the new window dimensions
    const width = target.innerWidth;
    const height = target.innerHeight;

    // Set canvas size to occupy the entire window
    canvas.width = width;
    canvas.height = height;

    // Set the WebGL viewport to fill the canvas completely
    gl.viewport(0, 0, width, height);
}

function setup(shaders) {
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas, { alpha: true });

    // Create WebGL programs
    draw_program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    // Inicializar o array `xpto` com valores de 0 a 59999
    const xpto = Array.from({ length: 60000 }, (_, i) => i);

    // Criar um buffer para armazenar o array `xpto`
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);

    // Inicializar o buffer com os valores de `xpto`
    gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(xpto), gl.STATIC_DRAW);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const indexLocation = gl.getAttribLocation(draw_program, "index");
    gl.vertexAttribIPointer(indexLocation, 1, gl.UNSIGNED_INT, 0, 0);
    gl.enableVertexAttribArray(indexLocation);
    gl.bindVertexArray(null);





    // Handle resize events 
    window.addEventListener("resize", (event) => {
        resize(event.target);
    });




    function get_pos_from_mouse_event(canvas, event, isInInterface) {

        // Se o mouse estiver na área da interface, não coletar pontos
        if (isInInterface) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / canvas.width * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.height * 2 - 1);

        return vec2(x, y);
    }

    // função para verificar se o mouse está na área dos controles
    function isMouseInInterface(event) {
        const rect = document.querySelector('.interface').getBoundingClientRect();
        return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        );
    }

    // Handle mouse down events
    window.addEventListener("mousedown", (event) => {
        collecting_points = true;

        // Verifique se o mouse está na área da interface
        if (isMouseInInterface(event)) {
            return;
        }

        if (event.button === 0 && collecting_points) {  // Somente para o botao esquerdo
            const click = get_pos_from_mouse_event(canvas, event, false);
            if (control_points.length == 0) {
                is_drawing = true;
            }
            else {
                is_drawing = false;
            }
            control_points.push(click);

            // Generate random speeds for the control points
            control_point_speeds.push(vec2(
                Math.random() + (Math.random() - 0.5) * 0.02,
                Math.random() + (Math.random() - 0.5) * 0.02
            ));
            just_clicked = true;
            // Only push a random color for each curve once (a curve starts when there are 4 total control points)
            if (control_points.length == 4) {
                current_colour = vec4(Math.random(), Math.random(), Math.random(), Math.random());
            }
        }
    });

    // Handle mouse move events
    window.addEventListener("mousemove", (event) => {
        if (is_drawing && collecting_points) {  // Check if we're drawing

            // Verifique se o mouse está na área da interface
            if (isMouseInInterface(event)) {
                return;
            }

            const new_point = get_pos_from_mouse_event(canvas, event, false);
            // Adicionar ponto somente se a distancia ao ultimo ponto for maior que a distancia mi­nima
            const last_point = control_points[control_points.length - 1];
            if (distance(new_point, last_point) > min_distance) {
                control_points.push(new_point);
                just_clicked = false;
                //Generate random speeds for the control points
                control_point_speeds.push(vec2(
                    (Math.random() * 0.5) + (Math.random() - 0.5) * 0.02,
                    (Math.random() * 0.5) + (Math.random() - 0.5) * 0.02
                ));
            }
            // Only push a random color for each curve once (a curve starts when there are 4 total control points)
            if (control_points.length == 4) {
                current_colour = vec4(Math.random(), Math.random(), Math.random(), Math.random());
            }
        }
    });

    // Handle mouse up events
    window.addEventListener("mouseup", (event) => {

        if (isMouseInInterface(event)) {
            return;
        }

        is_drawing = false;
        if (event.button === 0 && collecting_points && !just_clicked) {  // Somente para o botao esquerdo
            saveCurve();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === 'z') {
            saveCurve();
            just_clicked = false;
        }
        if (event.key.toLowerCase() === 'l') {
            toggleDraw();
        }
        if (event.key.toLowerCase() === 'p') {
            togglePoints();
        }
        if (event.key === '+' && segments < 50) {
            addSegment();
            segmentSlider.value = segments;
            segmentValue.innerText = segments;
        }
        if (event.key === '-' && segments > 1) {
            removeSegment();
            segmentSlider.value = segments;
            segmentValue.innerText = segments;
        }
        if (event.key.toLowerCase() === 'c') {
            clearCurves();
        }

        if (event.key === '<' && speed_multiplier > 0.1) {
            decreaseSpeed();
            speedSlider.value = speed_multiplier.toFixed(1);
            speedValue.innerText = speed_multiplier.toFixed(1);
        }

        if (event.key === '>' && speed_multiplier < 100) {
            increaseSpeed();
            speedSlider.value = speed_multiplier.toFixed(1);
            speedValue.innerText = speed_multiplier.toFixed(1);
        }

        if (event.key === ' ') {
            toggleAnimation();
        }
        if (event.key === '1') {
            curveSelector.value = 0;
            setCurveType(0); // B-Spline
        } else if (event.key === '2') {
            curveSelector.value = 1;
            setCurveType(1); // Catmull-Rom
        } else if (event.key === '3') {
            curveSelector.value = 2;
            setCurveType(2); // Bézier
        }
        if (event.key === 'ArrowUp' && point_size < 100) {
            point_size += 0.1;
            pointSlider.value = point_size.toFixed(1);
            pointValue.innerText = point_size.toFixed(1);
        }
        if (event.key === 'ArrowDown' && point_size > 0.1) {
            point_size -= 0.1;
            pointSlider.value = point_size.toFixed(1);
            pointValue.innerText = point_size.toFixed(1);
        }
    });


    resize(window);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    window.requestAnimationFrame(animate);
}
// Atualiza o valor dos sliders ao mover
const segmentSlider = document.getElementById('segment-slider');
const speedSlider = document.getElementById('speed-slider');
const segmentValue = document.getElementById('segment-value');
const speedValue = document.getElementById('speed-value');
const pointSlider = document.getElementById('point-slider');
const pointValue = document.getElementById('point-value');

// Button event listeners
document.getElementById('save-curve').addEventListener('click', saveCurve);
document.getElementById('toggle-draw').addEventListener('click', toggleDraw);
document.getElementById('toggle-points').addEventListener('click', togglePoints);
document.getElementById('clear-curves').addEventListener('click', clearCurves);
document.getElementById('toggle-animation').addEventListener('click', toggleAnimation);

// Inicializa os valores
segmentSlider.value = segments;
segmentValue.innerText = segments;
speedSlider.value = speed_multiplier.toFixed(1);
speedValue.innerText = speed_multiplier.toFixed(1);
pointSlider.value = point_size.toFixed(1);
pointValue.innerText = point_size.toFixed(1);
segmentValue.innerText = segmentSlider.value;
speedValue.innerText = speedSlider.value;
pointValue.innerText = pointSlider.value;

segmentSlider.addEventListener('input', function () {
    segments = parseInt(segmentSlider.value);
    segmentValue.innerText = segmentSlider.value;
});

speedSlider.addEventListener('input', function () {
    speed_multiplier = parseFloat(speedSlider.value);
    speedValue.innerText = speedSlider.value;
});

pointSlider.addEventListener('input', function () {
    point_size = parseFloat(pointSlider.value);
    pointValue.innerText = pointSlider.value;
});

// Adicionar um evento para a mudança de tipo de curva a partir do seletor
const curveSelector = document.getElementById("curve-selector");
curveSelector.addEventListener('change', function () {
    const selectedValue = parseInt(curveSelector.value);
    setCurveType(selectedValue);
});

// Functions for each action
function saveCurve() {
    saved_curves.push([...control_points]);
    saved_speeds.push([...control_point_speeds]);
    const colour_to_save = vec4(current_colour[0], current_colour[1], current_colour[2], current_colour[3]);
    curve_colours.push(colour_to_save);
    collecting_points = false;
    control_points = [];
    control_point_speeds = [];
}

function toggleDraw() {
    is_drawn = !is_drawn;
}

function togglePoints() {
    show_points = !show_points;
}

function addSegment() {
    if (segments < 50) segments += 1;
}

function removeSegment() {
    if (segments > 1) segments -= 1;
}

function clearCurves() {
    saved_curves = [];
    control_points = [];
    saved_speeds = [];
}

function decreaseSpeed() {
    if (speed_multiplier > 0.1) speed_multiplier -= 0.1;
}

function increaseSpeed() {
    speed_multiplier += 0.1;
}

function toggleAnimation() {
    is_animating = !is_animating;
}

// Função que calcula a distancia entre dois pontos 2D
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}


function setCurveType(type) {

    const curveTypeLocation = gl.getUniformLocation(draw_program, "curve_type");
    curve_type = type;
    gl.uniform1i(curveTypeLocation, type);
}

let last_time;

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    if (last_time === undefined) {
        last_time = timestamp;
    }
    // Elapsed time (in miliseconds) since last time here
    const elapsed = timestamp - last_time;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(draw_program);

    const s_l = gl.getUniformLocation(draw_program, "segments");
    gl.uniform1ui(s_l, segments);


    if (is_animating) {
        saved_curves.forEach((curve, index) => {
            const speeds = saved_speeds[index];
            for (let i = 0; i < curve.length; i++) {
                curve[i][0] += speeds[i][0] * elapsed * speed_multiplier * 0.0001;
                curve[i][1] += speeds[i][1] * elapsed * speed_multiplier * 0.0001;

                // Check for boundary collisions
                if (curve[i][0] > 1 || curve[i][0] < -1) speeds[i][0] *= -1;
                if (curve[i][1] > 1 || curve[i][1] < -1) speeds[i][1] *= -1;
            }
        });

    }



    saved_curves.forEach((c, index) => {
        let sliced_c_p_for_type_2;
        if (curve_type == 2) {
            const sliceAt = (c.length - 4) % 3;
            sliced_c_p_for_type_2 = c.slice(0, c.length - sliceAt);
            const flat_control_points = sliced_c_p_for_type_2.flat();
            if (flat_control_points.length > 0) {
                const c_p = gl.getUniformLocation(draw_program, "control_points");
                gl.uniform2fv(c_p, flat_control_points);
            }
        } else {
            const flat_control_points = c.flat();
            if (flat_control_points.length > 0) {
                const c_p = gl.getUniformLocation(draw_program, "control_points");
                gl.uniform2fv(c_p, flat_control_points);
            }
        }
        const colorLocation = gl.getUniformLocation(draw_program, "color");
        gl.uniform4f(colorLocation, curve_colours[index][0], curve_colours[index][1], curve_colours[index][2], curve_colours[index][3]);
        let numberOFPointsToDraw;
        if (curve_type == 2) {  // Bézier curve type
            numberOFPointsToDraw = segments * ((sliced_c_p_for_type_2.length - 1) / 3);
        } else {  // B-Spline or Catmull-Rom
            numberOFPointsToDraw = segments * (c.length - 3) + 1;
        }
        gl.bindVertexArray(vao);
        if (c.length >= 4 && is_drawn) {
            gl.drawArrays(gl.LINE_STRIP, 0, numberOFPointsToDraw);
        }
        if (show_points) {
            const p_s = gl.getUniformLocation(draw_program, "point_size");
            gl.uniform1f(p_s, point_size);
            gl.drawArrays(gl.POINTS, 0, numberOFPointsToDraw);
        }

        gl.bindVertexArray(null);
    });
    let sliced_c_p_for_type_2;
    if (curve_type == 2) {
        const sliceAt = (control_points.length - 4) % 3;
        sliced_c_p_for_type_2 = control_points.slice(0, control_points.length - sliceAt);
        const flat_control_points = sliced_c_p_for_type_2.flat();
        if (flat_control_points.length > 0) {
            const c_p = gl.getUniformLocation(draw_program, "control_points");
            gl.uniform2fv(c_p, flat_control_points);
        }
    } else {
        const flat_control_points = control_points.flat();
        if (flat_control_points.length > 0) {
            const c_p = gl.getUniformLocation(draw_program, "control_points");
            gl.uniform2fv(c_p, flat_control_points);
        }
    }

    const colorLocation = gl.getUniformLocation(draw_program, "color");
    gl.uniform4f(colorLocation, current_colour[0], current_colour[1], current_colour[2], current_colour[3]);

    let numberOFPointsToDraw;
    if (control_points.length >= 4) {
        if (curve_type == 2) {
            numberOFPointsToDraw = segments * ((sliced_c_p_for_type_2.length - 1) / 3);
        } else {
            numberOFPointsToDraw = segments * (control_points.length - 3) + 1;
        }
    }
    gl.bindVertexArray(vao);
    // Se houver pelo menos 4 pontos de controle, desenhar a curva
    if (control_points.length >= 4) {

        gl.drawArrays(gl.LINE_STRIP, 0, numberOFPointsToDraw);
    }
    if (show_points) {
        const p_s = gl.getUniformLocation(draw_program, "point_size");
        gl.uniform1f(p_s, point_size);
        gl.drawArrays(gl.POINTS, 0, numberOFPointsToDraw);
    }
    gl.bindVertexArray(null);
    last_time = timestamp;

}

loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))