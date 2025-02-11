/**
 * torus.js
 * 
 */

export { init, draw };

import { vec3, normalize, flatten } from '../MV.js';

const points = [];
const normals = [];
const faces = [];
const edges = [];

let points_buffer;
let normals_buffer;
let faces_buffer;
let edges_buffer;

let vao;

const torus_PPD = 30;
const torus_DISKS = 30;
const torus_DISK_RADIUS = 0.2;
const torus_RADIUS = 0.5;

function init(gl, ppd = torus_PPD, nd = torus_DISKS, big_r = torus_RADIUS, small_r = torus_DISK_RADIUS) {
    _build(ppd, nd, big_r, small_r);
    _uploadData(gl);
}

function _getIndex(ppd, nd, d, p) {
    const diskOffset = d % nd * ppd;
    return diskOffset + (p % ppd);
}

// Generate points using polar coordinates
function _build(ppd, nd, big_r, small_r) {
    const diskStep = 2 * Math.PI / nd;
    const pointStep = 2 * Math.PI / ppd;

    // Generate points
    for (let phi = 0; phi < 2 * Math.PI; phi += diskStep) {
        for (let theta = 0; theta < 2 * Math.PI; theta += pointStep) {
            // "em pé"
            /*var pt = vec3(
                (big_r+small_r*Math.cos(theta))*Math.cos(phi),
                (big_r+small_r*Math.cos(theta))*Math.sin(phi),
                small_r*Math.sin(theta)
            );*/
            // "deitado"
            const pt = vec3(
                (big_r + small_r * Math.cos(theta)) * Math.cos(phi),
                small_r * Math.sin(theta),
                (big_r + small_r * Math.cos(theta)) * Math.sin(phi)
            );
            points.push(pt);
            // normal - "deitado"
            const normal = vec3(
                (small_r * Math.cos(theta)) * Math.cos(phi),
                small_r * Math.sin(theta),
                (small_r * Math.cos(theta)) * Math.sin(phi)
            );
            normals.push(normalize(normal));
        }
    }

    //Edges
    for (let d = 0; d < nd; d++) {
        for (let p = 0; p < ppd; p++) {
            //Edge from point to next point in disk
            edges.push(_getIndex(ppd, nd, d, p));
            edges.push(_getIndex(ppd, nd, d, p + 1));

            //Edge from point to same point in next disk
            edges.push(_getIndex(ppd, nd, d, p));
            edges.push(_getIndex(ppd, nd, d + 1, p));

        }
    }

    //Faces
    for (let d = 0; d < nd; d++) {
        const diskOffset = d * ppd;
        for (let p = 0; p < ppd; p++) {
            faces.push(_getIndex(ppd, nd, d, p));
            faces.push(_getIndex(ppd, nd, d, p + 1));
            faces.push(_getIndex(ppd, nd, d + 1, p));

            faces.push(_getIndex(ppd, nd, d + 1, p));
            faces.push(_getIndex(ppd, nd, d, p + 1));
            faces.push(_getIndex(ppd, nd, d + 1, p + 1));
        }
    }

}

function _uploadData(gl) {

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    points_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    const a_position = 0;
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_position);

    normals_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normals_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    const a_normal = 1;
    if (a_normal != -1) {
        gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_normal);
    }

    gl.bindVertexArray(null);

    faces_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faces_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);

    edges_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edges_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(edges), gl.STATIC_DRAW);
}

function draw(gl, program, primitive) {
    gl.useProgram(program);

    gl.bindAttribLocation(program, 0, "a_position");
    gl.bindAttribLocation(program, 1, "a_normal");

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive == gl.LINES ? edges_buffer : faces_buffer);
    gl.drawElements(primitive, primitive == gl.LINES ? edges.length : faces.length, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}