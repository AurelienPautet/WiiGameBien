//CURRENTLY NOT WORKING (piece of crap)
//But i would like to add shaders to the game and making it pretier
//using webgl

canvasGL = document.getElementById("webgl_canvas");
const gl = canvasGL.getContext("webgl");

function createTextureFromCanvas(gl, canvas) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_blurAmount;

    void main() {
        vec4 sum = vec4(0.0);
        float offsets[5];
        float weights[5];
        
        offsets[0] = -2.0;
        offsets[1] = -1.0;
        offsets[2] = 0.0;
        offsets[3] = 1.0;
        offsets[4] = 2.0;

        weights[0] = 0.1;
        weights[1] = 0.2;
        weights[2] = 0.4;
        weights[3] = 0.2;
        weights[4] = 0.1;
        
        for (int i = 0; i < 5; i++) {
            sum += texture2D(u_texture, v_texCoord + vec2(offsets[i] * u_blurAmount, 0.0)) * weights[i];
        }
        for (int i = 0; i < 5; i++) {
            sum += texture2D(u_texture, v_texCoord + vec2(0.0, offsets[i] * u_blurAmount)) * weights[i];
        }
        
        gl_FragColor = sum;
    }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(
  gl,
  gl.FRAGMENT_SHADER,
  fragmentShaderSource
);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error(
    "Unable to initialize the shader program: " + gl.getProgramInfoLog(program)
  );
}
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
const texCoords = [0, 0, 1, 0, 0, 1, 1, 1];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

const textureLocation = gl.getUniformLocation(program, "u_texture");
const blurAmountLocation = gl.getUniformLocation(program, "u_blurAmount");

gl.uniform1i(textureLocation, 0);
gl.uniform1f(blurAmountLocation, 0.0);

function render() {
  gl.useProgram(program);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.enableVertexAttribArray(positionLocation);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error("WebGL Error:", error);
  }
  requestAnimationFrame(render);
}

render();
