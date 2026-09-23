// Adapted from Abstract Lights by Kavyant Kumar:
// https://codepen.io/Kavyant-Kumar/pen/NPREJdE
export function startAbstractLights(scope) {
  const requestAnimationFrame = (callback) => scope.request(callback),
    cancelAnimationFrame = (id) => scope.cancel(id);
  const canvas = document.querySelector("#abstract-lights");

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return;
  const vertex = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const fragment = `precision mediump float;
 uniform vec2 resolution;uniform float time;
 void main(){
 vec2 uv=(2.*gl_FragCoord.xy-resolution)/resolution.y;
 float t=time*.10;uv+=vec2(cos(t*2.)*.15,cos(t)*.13);
 vec3 ray=normalize(vec3(uv,.7));float dist=0.;vec3 sum=vec3(0.);
 for(int i=0;i<24;i++){
 vec3 p=ray*dist;p.z=cos(p.z*(sin(p.x+t*.7)+1.5));
 for(int j=3;j<10;j++){float s=float(j);p=p*1.05+sin(2.6*t+p.yzx*s)*.114;}
 float stepSize=.01+.1*abs(length(p)-.8);dist+=stepSize;
 sum+=sin(p*vec3(1.35,.688,1.72)-vec3(5.28,7.49,3.56))/stepSize;
 }
 vec3 energy=min(sum*sum/1000000.,vec3(5.));vec3 e=exp(2.*energy);vec3 mapped=(e-1.)/(e+1.);
 float light=dot(mapped,vec3(.3,.45,.25));
 vec3 color=mix(vec3(.48,.32,.70),vec3(.94,.89,1.),smoothstep(.12,.65,light));
 // A localized red shimmer passes through the folds, with a quiet interval.
 float cycle=mod(time,26.);
 float pulse=smoothstep(5.,9.,cycle)*(1.-smoothstep(13.,17.,cycle));
 float sweep=mix(-.65,.65,smoothstep(5.,17.,cycle));
 float ribbon=uv.x*.82+uv.y*.38+.12*sin(uv.y*3.+t)-sweep;
 float patch=exp(-ribbon*ribbon*18.)*(1.-smoothstep(.45,1.2,abs(uv.y)));
 vec3 red=mix(vec3(.72,.025,.10),vec3(1.,.24,.31),smoothstep(.12,.75,light));
 color=mix(color,red,pulse*patch*.78);
 float edge=1.-smoothstep(.35,1.45,length(uv));
 float centreFade=1.-.58*exp(-dot(uv,uv)*2.7);
 gl_FragColor=vec4(color*light*.85*centreFade,edge*centreFade);
 }`;
  const shaders = [];
  function compile(type, source) {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn("Abstract Lights unavailable", error);
    return;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const a = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const dataCanvas = document.querySelector("#abstract-data");
  const dataCtx = dataCanvas.getContext("2d");
  const dataTokens = ["0", "1", "·", "+", "▯"];
  const dataPoints = Array.from({ length: 120 }, (_, i) => ({
    phase: ((i * 29) % 157) / 156,
    lane: ((i * 37) % 101) / 100,
    side: i % 2 ? -1 : 1,
    edge: i >= 72,
    speed: 0.008 + (i % 4) * 0.002,
    size: 10 + (i % 5) * 2,
    token: dataTokens[i % dataTokens.length],
  }));
  let dataWidth = 0,
    dataHeight = 0,
    dataRatio = 1;
  function drawData(time) {
    const width = dataWidth,
      height = dataHeight,
      ratio = dataRatio;
    dataCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dataCtx.clearRect(0, 0, width, height);
    dataCtx.textAlign = "center";
    dataCtx.textBaseline = "middle";
    for (const point of dataPoints) {
      const t = (point.phase + time * point.speed) % 1;
      const x = width * (point.edge
        ? point.side < 0
          ? -0.3 + 0.36 * t
          : 1.3 - 0.36 * t
        : point.side < 0
          ? -0.16 + 0.42 * t
          : 1.16 - 0.42 * t);
      const curve = 0.5 + 0.36 * Math.sin(t * 4.1 + point.lane * 7) + (point.lane - 0.5) * 0.3;
      const y = height * curve;
      const fade = Math.pow(Math.sin(t * Math.PI), 2);
      const accent = point.token === "+" || point.token === "▯";
      dataCtx.globalAlpha = fade * (accent ? 0.86 : 0.46 + 0.32 * point.lane);
      dataCtx.fillStyle = point.token === "+" ? "#f0b7cf" : point.token === "▯" ? "#dbc5ff" : "#f1e9ff";
      dataCtx.font = `${point.size}px monospace`;
      dataCtx.fillText(point.token, x, y);
      if (point.lane > 0.65) {
        dataCtx.globalAlpha *= 0.24;
        dataCtx.strokeStyle = "#ccb5eb";
        dataCtx.lineWidth = 0.65;
        dataCtx.beginPath();
        dataCtx.moveTo(x - 18, y + 3);
        dataCtx.lineTo(x - 5, y);
        dataCtx.stroke();
      }
    }
    dataCtx.globalAlpha = 1;
  }
  const res = gl.getUniformLocation(program, "resolution"),
    clock = gl.getUniformLocation(program, "time");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let lastOpacity = -1,
    visible = false,
    inView = true,
    raf = 0,
    last = 0,
    elapsed = 0,
    lost = false,
    suspended = false;
  function resizeEffect() {
    dataWidth = canvas.clientWidth;
    dataHeight = canvas.clientHeight;
    dataRatio = Math.min(devicePixelRatio || 1, 1.5);
    dataCanvas.width = Math.round(dataWidth * dataRatio);
    dataCanvas.height = Math.round(dataHeight * dataRatio);
    const width = Math.max(
        1,
        Math.round(Math.min(480, canvas.clientWidth * 0.65)),
      ),
      height = Math.max(
        1,
        Math.round(
          (width * canvas.clientHeight) / Math.max(1, canvas.clientWidth),
        ),
      );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(res, width, height);
    }
  }
  scope.observe(
    new ResizeObserver(() => {
      resizeEffect();
      wake();
    }),
    canvas,
  );
  resizeEffect();
  function draw(now) {
    raf = 0;
    if (!visible || !inView || document.hidden || lost || suspended) return;
    if (now - last >= 1000 / 24 || !last) {
      elapsed += last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      gl.uniform1f(clock, reduced.matches ? 0 : elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      drawData(reduced.matches ? 0 : elapsed);
    }
    if (!reduced.matches) raf = requestAnimationFrame(draw);
  }
  function wake() {
    if (!raf && visible && inView && !document.hidden && !lost && !suspended)
      raf = requestAnimationFrame(draw);
  }
  const controller = {
    setSuspended(value) {
      if (value === suspended) return;
      suspended = value;
      last = 0;
      if (value) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else wake();
    },
    show(value) {
      if (value === lastOpacity) return;
      lastOpacity = value;
      canvas.style.opacity = String(value * 0.55);
      dataCanvas.style.opacity = String(value * 0.48);
      visible = value > 0.001;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else wake();
    },
  };
  scope.listen(document, "visibilitychange", () => {
    last = 0;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else wake();
  });
  scope.listen(reduced, "change", () => {
    last = 0;
    wake();
  });
  scope.observe(
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      last = 0;
      wake();
    }),
    canvas,
  );
  scope.listen(canvas, "webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
  });

  scope.listen(window, "pagehide", () => controller.setSuspended(true));
  scope.listen(window, "pageshow", () => controller.setSuspended(false));
  scope.defer(() => {
    cancelAnimationFrame(raf);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
    canvas.width = canvas.height = 1;
    dataCanvas.width = dataCanvas.height = 1;
  });
  return controller;
}
