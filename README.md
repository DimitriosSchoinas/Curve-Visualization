# Curve-Visualization

In this work we intend to develop a WebGL application that allows the creation and
visualization of cubic B-Spline curves. The visualization of each curve will be done with
using a GLSL program capable of producing the intermediate points of a given curve
receiving as a (mandatory) attribute an integer index (starting at 0) that indicates the position
of the vertex in said complex curve.
While editing a curve, which will remain stationary until completed, the remaining
curves must be moving (unless the user has chosen to stop the animation).
Each of the control points on a curve has its own speed, determined as
being a small perturbation in relation to an equal base velocity for all points
the same curve. This specific speed for each control point will be calculated when
of its creation and must be used, at each frame, to update the position of the respective point of reference.
control.
The control points will be animated by Javascript code (CPU side) and must confine the
points to the visible area. It is suggested that when exceeding the limits in a certain direction, if
invert the sign of the respective velocity component of that point.
The display may occupy the entire browser window and, consequently, the canvas
also. However, the possibility of showing an interface in the window that allows
adjust the program parameters, and if it exists, it must be placed against one side


Project PDF:

[Projecto-1-2024-2025.pdf](https://github.com/user-attachments/files/18660221/Projecto-1-2024-2025.pdf)
