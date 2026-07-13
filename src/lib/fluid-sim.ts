/**
 * Navier-Stokes fluid simulation, ported from Pavel Dobryakov's
 * WebGL-Fluid-Simulation (MIT). Bloom and sunrays are stripped — we run the sim
 * transparent and tasteful, not neon — and splat colour/force are driven by the
 * caller so the palette can stay on-brand.
 *
 * Source: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
 */

export type RGB = { r: number; g: number; b: number };

export type FluidConfig = {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
};

type GLCtx = WebGL2RenderingContext | WebGLRenderingContext;

type Ext = {
  formatRGBA: { internalFormat: number; format: number } | null;
  formatRG: { internalFormat: number; format: number } | null;
  formatR: { internalFormat: number; format: number } | null;
  halfFloatTexType: number;
  supportLinearFiltering: unknown;
};

type FBO = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
};

type DoubleFBO = {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
};

export type FluidHandle = {
  splat: (x: number, y: number, dx: number, dy: number, color: RGB) => void;
  /** Normalised [0..1] coords, origin bottom-left (WebGL convention). */
  splatNorm: (u: number, v: number, dx: number, dy: number, color: RGB) => void;
  resize: () => void;
  pause: (p: boolean) => void;
  destroy: () => void;
};

/* ─────────────────────────── shaders ─────────────────────────── */

const baseVertex = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv, vL, vR, vT, vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const copyShader = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; uniform sampler2D uTexture;
void main () { gl_FragColor = texture2D(uTexture, vUv); }`;

const clearShader = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`;

const displayShader = `
precision highp float; precision highp sampler2D;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uTexture;
uniform vec2 texelSize;
void main () {
  vec3 c = texture2D(uTexture, vUv).rgb;
#ifdef SHADING
  vec3 lc = texture2D(uTexture, vL).rgb;
  vec3 rc = texture2D(uTexture, vR).rgb;
  vec3 tc = texture2D(uTexture, vT).rgb;
  vec3 bc = texture2D(uTexture, vB).rgb;
  float dx = length(rc) - length(lc);
  float dy = length(tc) - length(bc);
  vec3 n = normalize(vec3(dx, dy, length(texelSize)));
  vec3 l = vec3(0.0, 0.0, 1.0);
  float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
  c *= diffuse;
#endif
  float a = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c, a);
}`;

const splatShader = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

const advectionShader = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;

vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main () {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
#endif
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}`;

const divergenceShader = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const curlShader = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

const vorticityShader = `
precision highp float; precision highp sampler2D;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const pressureShader = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const gradientSubtractShader = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

/* ─────────────────────────── engine ─────────────────────────── */

export function createFluid(
  canvas: HTMLCanvasElement,
  config: FluidConfig,
): FluidHandle | null {
  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };

  let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
  const isWebGL2 = !!gl;
  if (!gl) {
    gl = (canvas.getContext("webgl", params) ||
      canvas.getContext(
        "experimental-webgl",
        params,
      )) as unknown as WebGL2RenderingContext | null;
  }
  if (!gl) return null;

  const g = gl as unknown as GLCtx;
  const ext: Ext = (() => {
    let halfFloat: OES_texture_half_float | null = null;
    let supportLinearFiltering: unknown = null;

    if (isWebGL2) {
      (g as WebGL2RenderingContext).getExtension("EXT_color_buffer_float");
      supportLinearFiltering = g.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = g.getExtension("OES_texture_half_float");
      supportLinearFiltering = g.getExtension(
        "OES_texture_half_float_linear",
      );
    }

    const halfFloatTexType = isWebGL2
      ? (g as WebGL2RenderingContext).HALF_FLOAT
      : (halfFloat?.HALF_FLOAT_OES ?? 0);

    const G2 = g as WebGL2RenderingContext;
    const formatRGBA = isWebGL2
      ? getSupportedFormat(g, G2.RGBA16F, g.RGBA, halfFloatTexType)
      : getSupportedFormat(g, g.RGBA, g.RGBA, halfFloatTexType);
    const formatRG = isWebGL2
      ? getSupportedFormat(g, G2.RG16F, G2.RG, halfFloatTexType)
      : getSupportedFormat(g, g.RGBA, g.RGBA, halfFloatTexType);
    const formatR = isWebGL2
      ? getSupportedFormat(g, G2.R16F, G2.RED, halfFloatTexType)
      : getSupportedFormat(g, g.RGBA, g.RGBA, halfFloatTexType);

    return { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering };
  })();

  if (!ext.formatRGBA) return null;

  function getSupportedFormat(
    gl: GLCtx,
    internalFormat: number,
    format: number,
    type: number,
  ): { internalFormat: number; format: number } | null {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      const G2 = gl as WebGL2RenderingContext;
      switch (internalFormat) {
        case G2.R16F:
          return getSupportedFormat(gl, G2.RG16F, G2.RG, type);
        case G2.RG16F:
          return getSupportedFormat(gl, G2.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(
    gl: GLCtx,
    internalFormat: number,
    format: number,
    type: number,
  ) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  function compile(type: number, source: string, keywords?: string[]) {
    let src = source;
    if (keywords?.length) {
      src = keywords.map((k) => `#define ${k}\n`).join("") + source;
    }
    const shader = g.createShader(type)!;
    g.shaderSource(shader, src);
    g.compileShader(shader);
    if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) {
      console.error("[fluid] shader compile:", g.getShaderInfoLog(shader));
    }
    return shader;
  }

  function program(vs: WebGLShader, fs: WebGLShader) {
    const p = g.createProgram()!;
    g.attachShader(p, vs);
    g.attachShader(p, fs);
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) {
      console.error("[fluid] link:", g.getProgramInfoLog(p));
    }
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = g.getProgramParameter(p, g.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const name = g.getActiveUniform(p, i)!.name;
      uniforms[name] = g.getUniformLocation(p, name)!;
    }
    return { program: p, uniforms, bind: () => g.useProgram(p) };
  }

  const vs = compile(g.VERTEX_SHADER, baseVertex);
  const copyProg = program(vs, compile(g.FRAGMENT_SHADER, copyShader));
  const clearProg = program(vs, compile(g.FRAGMENT_SHADER, clearShader));
  const splatProg = program(vs, compile(g.FRAGMENT_SHADER, splatShader));
  const advectionProg = program(
    vs,
    compile(
      g.FRAGMENT_SHADER,
      advectionShader,
      ext.supportLinearFiltering ? undefined : ["MANUAL_FILTERING"],
    ),
  );
  const divergenceProg = program(vs, compile(g.FRAGMENT_SHADER, divergenceShader));
  const curlProg = program(vs, compile(g.FRAGMENT_SHADER, curlShader));
  const vorticityProg = program(vs, compile(g.FRAGMENT_SHADER, vorticityShader));
  const pressureProg = program(vs, compile(g.FRAGMENT_SHADER, pressureShader));
  const gradientProg = program(
    vs,
    compile(g.FRAGMENT_SHADER, gradientSubtractShader),
  );
  const displayProg = program(
    vs,
    compile(
      g.FRAGMENT_SHADER,
      displayShader,
      config.SHADING ? ["SHADING"] : undefined,
    ),
  );

  /* fullscreen triangle-pair blit */
  const quad = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, quad);
  g.bufferData(
    g.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
    g.STATIC_DRAW,
  );
  const elems = g.createBuffer();
  g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, elems);
  g.bufferData(
    g.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2, 0, 2, 3]),
    g.STATIC_DRAW,
  );
  g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
  g.enableVertexAttribArray(0);

  const blit = (target: FBO | null) => {
    if (target == null) {
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
      g.bindFramebuffer(g.FRAMEBUFFER, null);
    } else {
      g.viewport(0, 0, target.width, target.height);
      g.bindFramebuffer(g.FRAMEBUFFER, target.fbo);
    }
    g.drawElements(g.TRIANGLES, 6, g.UNSIGNED_SHORT, 0);
  };

  function createFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number,
  ): FBO {
    g.activeTexture(g.TEXTURE0);
    const texture = g.createTexture()!;
    g.bindTexture(g.TEXTURE_2D, texture);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, filter);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, filter);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texImage2D(g.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = g.createFramebuffer()!;
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.framebufferTexture2D(
      g.FRAMEBUFFER,
      g.COLOR_ATTACHMENT0,
      g.TEXTURE_2D,
      texture,
      0,
    );
    g.viewport(0, 0, w, h);
    g.clear(g.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number) {
        g.activeTexture(g.TEXTURE0 + id);
        g.bindTexture(g.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number,
  ): DoubleFBO {
    let fbo1 = createFBO(w, h, internalFormat, format, type, filter);
    let fbo2 = createFBO(w, h, internalFormat, format, type, filter);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(v: FBO) {
        fbo1 = v;
      },
      get write() {
        return fbo2;
      },
      set write(v: FBO) {
        fbo2 = v;
      },
      swap() {
        const t = fbo1;
        fbo1 = fbo2;
        fbo2 = t;
      },
    };
  }

  function resizeFBO(
    target: FBO,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number,
  ) {
    const next = createFBO(w, h, internalFormat, format, type, filter);
    copyProg.bind();
    g.uniform1i(copyProg.uniforms.uTexture, target.attach(0));
    blit(next);
    return next;
  }

  function resizeDoubleFBO(
    target: DoubleFBO,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number,
  ) {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, filter);
    target.write = createFBO(w, h, internalFormat, format, type, filter);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1 / w;
    target.texelSizeY = 1 / h;
    return target;
  }

  const getResolution = (resolution: number) => {
    let aspect = g.drawingBufferWidth / g.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspect);
    return g.drawingBufferWidth > g.drawingBufferHeight
      ? { width: max, height: min }
      : { width: min, height: max };
  };

  let dye: DoubleFBO;
  let velocity: DoubleFBO;
  let divergence: FBO;
  let curl: FBO;
  let pressure: DoubleFBO;

  function initFramebuffers() {
    const simRes = getResolution(config.SIM_RESOLUTION);
    const dyeRes = getResolution(config.DYE_RESOLUTION);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA!;
    const rg = ext.formatRG!;
    const r = ext.formatR!;
    const filtering = ext.supportLinearFiltering ? g.LINEAR : g.NEAREST;

    g.disable(g.BLEND);

    dye = dye
      ? resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
      : createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    velocity = velocity
      ? resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
      : createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, g.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, g.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, g.NEAREST);
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }

  resizeCanvas();
  initFramebuffers();

  const correctRadius = (radius: number) => {
    const aspect = canvas.width / canvas.height;
    return aspect > 1 ? radius * aspect : radius;
  };

  function splatNorm(u: number, v: number, dx: number, dy: number, color: RGB) {
    splatProg.bind();
    g.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
    g.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / canvas.height);
    g.uniform2f(splatProg.uniforms.point, u, v);
    g.uniform3f(splatProg.uniforms.color, dx, dy, 0);
    g.uniform1f(
      splatProg.uniforms.radius,
      correctRadius(config.SPLAT_RADIUS / 100),
    );
    blit(velocity.write);
    velocity.swap();

    g.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
    g.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  /** Screen-space (CSS px, origin top-left) → sim space. */
  function splat(x: number, y: number, dx: number, dy: number, color: RGB) {
    splatNorm(
      x / canvas.clientWidth,
      1 - y / canvas.clientHeight,
      dx,
      dy,
      color,
    );
  }

  function step(dt: number) {
    g.disable(g.BLEND);

    curlProg.bind();
    g.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    g.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProg.bind();
    g.uniform2f(vorticityProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    g.uniform1i(vorticityProg.uniforms.uVelocity, velocity.read.attach(0));
    g.uniform1i(vorticityProg.uniforms.uCurl, curl.attach(1));
    g.uniform1f(vorticityProg.uniforms.curl, config.CURL);
    g.uniform1f(vorticityProg.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProg.bind();
    g.uniform2f(divergenceProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    g.uniform1i(divergenceProg.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProg.bind();
    g.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
    g.uniform1f(clearProg.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProg.bind();
    g.uniform2f(pressureProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    g.uniform1i(pressureProg.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      g.uniform1i(pressureProg.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradientProg.bind();
    g.uniform2f(gradientProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    g.uniform1i(gradientProg.uniforms.uPressure, pressure.read.attach(0));
    g.uniform1i(gradientProg.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProg.bind();
    g.uniform2f(advectionProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering) {
      g.uniform2f(advectionProg.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    }
    let velocityId = velocity.read.attach(0);
    g.uniform1i(advectionProg.uniforms.uVelocity, velocityId);
    g.uniform1i(advectionProg.uniforms.uSource, velocityId);
    g.uniform1f(advectionProg.uniforms.dt, dt);
    g.uniform1f(advectionProg.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering) {
      g.uniform2f(advectionProg.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    }
    velocityId = velocity.read.attach(0);
    g.uniform1i(advectionProg.uniforms.uVelocity, velocityId);
    g.uniform1i(advectionProg.uniforms.uSource, dye.read.attach(1));
    g.uniform1f(advectionProg.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  function render() {
    // Transparent: the cream page shows through wherever there's no dye.
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);

    displayProg.bind();
    g.uniform2f(displayProg.uniforms.texelSize, 1 / g.drawingBufferWidth, 1 / g.drawingBufferHeight);
    g.uniform1i(displayProg.uniforms.uTexture, dye.read.attach(0));
    blit(null);
  }

  let paused = false;
  let raf = 0;
  let lastTime = performance.now();

  function frame() {
    const now = performance.now();
    let dt = (now - lastTime) / 1000;
    dt = Math.min(dt, 0.016666); // cap at 60fps
    lastTime = now;

    if (resizeCanvas()) initFramebuffers();

    if (!paused) {
      step(dt);
      render();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    splat,
    splatNorm,
    resize: () => {
      if (resizeCanvas()) initFramebuffers();
    },
    pause: (p: boolean) => {
      paused = p;
      if (!p) lastTime = performance.now();
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      const lose = g.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    },
  };
}
