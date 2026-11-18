(function idleFigures() {
  'use strict';
  // A small deformation field separates breathing, hanging fabric and the lantern chain.
  // Feet stay pinned. Combat poses replace this surface during each authored action.
  const vertex = `
    attribute vec2 point;
    varying vec2 uv;
    void main(){uv=(point+1.)*.5;gl_Position=vec4(point,0.,1.);}
  `;
  const fragment = `
    precision mediump float;
    uniform sampler2D source;
    uniform float clock;
    uniform float direction;
    uniform float lantern;
    varying vec2 uv;
    void main(){
      float side=direction>0.?uv.x:1.-uv.x;
      float breath=sin(clock*2.05+direction)*.5+.5;
      float pinned=smoothstep(.025,.28,uv.y);
      float cloth=(1.-smoothstep(.12,.67,side))*smoothstep(.04,.20,uv.y)*(1.-smoothstep(.72,.91,uv.y));
      float draft=sin(clock*2.5+uv.y*9.)+.42*sin(clock*3.9+uv.y*13.+uv.x*3.);
      vec2 p=uv;
      p.x-=direction*pinned*(.0048*sin(clock*1.7)*uv.y+.015*cloth*draft);
      p.y-=pinned*(.0062*breath+.008*cloth*sin(clock*2.2+uv.x*7.+uv.y*6.));
      if(min(p.x,p.y)<0.||max(p.x,p.y)>1.){gl_FragColor=vec4(0.);return;}
      vec4 color=texture2D(source,p);
      float glow=exp(-distance(p,vec2(.67,.32))*19.)*lantern;
      color.rgb+=vec3(.12,.048,.009)*glow*(.67+.32*sin(clock*7.1))*color.a;
      gl_FragColor=color;
    }
  `;
  function surface() {
    const canvas = document.createElement('canvas');
    canvas.className = 'idle-plane';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    });
    if (!gl) return null;
    const program = gl.createProgram();
    for (const [type, code] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program, 'point');
    gl.enableVertexAttribArray(point);
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const prop of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, prop, gl.CLAMP_TO_EDGE);
    for (const prop of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, prop, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const time = gl.getUniformLocation(program, 'clock'),
      dir = gl.getUniformLocation(program, 'direction'),
      lamp = gl.getUniformLocation(program, 'lantern');
    let owner = null,
      ready = false;
    canvas.addEventListener('webglcontextlost', () => {
      ready = false;
      owner?.classList.remove('rigged');
    });
    return {
      async bind(el, isHero) {
        owner?.classList.remove('rigged');
        owner = el;
        ready = false;
        el.append(canvas);
        const img = el.querySelector('.idle-art');
        try {
          await img.decode();
          if (owner !== el || gl.isContextLost()) return;
          const scale = Math.min(1, 820 / img.naturalHeight);
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.uniform1f(dir, isHero ? 1 : -1);
          gl.uniform1f(lamp, isHero ? 1 : 0);
          gl.uniform1f(time, performance.now() / 1000);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          ready = true;
          el.classList.add('rigged');
        } catch {
          el.classList.remove('rigged');
        }
      },
      draw(t) {
        if (ready && owner.isConnected && !owner.classList.contains('posed')) {
          gl.uniform1f(time, (t % 3600000) / 1000);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      },
    };
  }
  let pair,
    frame = 0,
    last = 0,
    stage = null;
  function update(t) {
    frame = 0;
    if (!stage?.isConnected || document.hidden || document.documentElement.classList.contains('quiet'))
      return;
    if (t - last >= 1000 / 24) {
      pair.forEach((s) => s?.draw(t));
      last = t;
    }
    frame = requestAnimationFrame(update);
  }
  function resume() {
    if (stage?.isConnected && !frame) frame = requestAnimationFrame(update);
  }
  function attach(arena) {
    stage = arena;
    if (!pair) pair = [surface(), surface()];
    pair[0]?.bind(arena.querySelector('.hero-model'), true);
    pair[1]?.bind(arena.querySelector('.foe-model'), false);
    resume();
  }
  document.addEventListener('visibilitychange', resume);
  window.AshFigures = { attach, resume };
})();
