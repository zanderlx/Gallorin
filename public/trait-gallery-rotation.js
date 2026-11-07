// Temporary, self-contained SVG relief experiment. No source artwork is changed.
// The unseen side is mirrored; this is an inferred volume, not an anatomical model.
export function createRotationPreview(stage, controls) {
  const canvas = document.createElement('canvas');
  canvas.className = 'trait-gallery-rotation-canvas';
  canvas.setAttribute('aria-label', 'Experimental rotatable horse relief');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) throw new Error('3D preview requires WebGL.');
  // Render above display resolution, then let the browser downsample the canvas.
  // This also smooths silhouettes on systems with limited WebGL MSAA support.
  const maxRenderSize = Math.min(4096, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  const shader = (type, source) => {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  };
  const program = gl.createProgram();
  const shaders = [
    shader(
      gl.VERTEX_SHADER,
      `attribute vec3 position; attribute vec2 uv;
      uniform vec2 angle; uniform vec2 viewport; uniform vec2 pan; uniform float scale;
      varying vec2 texcoord; varying float lighting;
      void main() {
        float cy=cos(angle.x),sy=sin(angle.x),cx=cos(angle.y),sx=sin(angle.y);
        vec3 p=vec3(position.x*cy+position.z*sy,position.y,-position.x*sy+position.z*cy);
        p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
        float perspective=1800.0/(1800.0-p.z);
        gl_Position=vec4((p.xy*scale*perspective+pan)/viewport*2.0,-p.z/2000.0,1.0);
        texcoord=uv; lighting=0.88+0.12*cos(angle.x)*cos(angle.y);
      }`
    ),
    shader(
      gl.FRAGMENT_SHADER,
      `precision mediump float; uniform sampler2D artwork;
      varying vec2 texcoord; varying float lighting;
      void main(){ vec4 c=texture2D(artwork,texcoord);
        gl_FragColor=vec4(c.rgb*lighting,1.0); }`
    )
  ];
  shaders.forEach(s => gl.attachShader(program, s));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const locations = Object.fromEntries(
    ['angle', 'viewport', 'scale', 'pan'].map(n => [n, gl.getUniformLocation(program, n)])
  );
  let meshes = [],
    revision = 0,
    active = false,
    yaw = 0,
    pitch = 0,
    zoom = 1;
  let panX = 0,
    panY = 0;
  let frame = [0, 0, 1453, 605];
  const releaseMeshes = () => {
    meshes.forEach(m => {
      gl.deleteBuffer(m.buffer);
      gl.deleteTexture(m.texture);
    });
    meshes = [];
  };
  const draw = () => {
    if (!active) return;
    const box = stage.getBoundingClientRect();
    const density = Math.min(Math.max(2, devicePixelRatio), maxRenderSize / Math.max(1, box.width, box.height));
    const renderWidth = Math.max(1, Math.round(box.width * density));
    const renderHeight = Math.max(1, Math.round(box.height * density));
    if (canvas.width !== renderWidth) canvas.width = renderWidth;
    if (canvas.height !== renderHeight) canvas.height = renderHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform2f(locations.angle, (yaw * Math.PI) / 180, (pitch * Math.PI) / 180);
    gl.uniform2f(locations.viewport, canvas.width, canvas.height);
    gl.uniform2f(locations.pan, panX * density, -panY * density);
    gl.uniform1f(locations.scale, Math.min(canvas.width / frame[2], canvas.height / frame[3]) * zoom);
    for (const mesh of meshes) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      for (const [name, size, offset] of [
        ['position', 3, 0],
        ['uv', 2, 12]
      ]) {
        const location = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 20, offset);
      }
      gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
  };
  const rebuild = async (svg, textureOnly = false) => {
    const ticket = ++revision;
    const source = svg.cloneNode(true);
    frame = source.getAttribute('viewBox').split(/\s+/).map(Number);
    // Include artwork beyond the normal frame (future wings), keeping its origin.
    const bounds = svg.getBBox();
    const x = Math.min(frame[0], bounds.x) - 4,
      y = Math.min(frame[1], bounds.y) - 4;
    const w = Math.max(frame[0] + frame[2], bounds.x + bounds.width) - x + 4;
    const h = Math.max(frame[1] + frame[3], bounds.y + bounds.height) - y + 4;
    // Finer source sampling keeps the traced silhouette from retaining coarse
    // geometry steps that multisample antialiasing alone cannot remove.
    const width = 2000,
      height = Math.ceil((width * h) / w);
    source.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    source.setAttribute('width', String(width));
    source.setAttribute('height', String(height));
    source.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(source));
    await image.decode();
    if (ticket !== revision || !active) return;
    const raster = document.createElement('canvas');
    raster.width = width;
    raster.height = height;
    const ctx = raster.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    if (textureOnly && meshes.length) {
      gl.bindTexture(gl.TEXTURE_2D, meshes[0].texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, raster);
      draw();
      return;
    }
    const pixels = ctx.getImageData(0, 0, width, height).data;
    // Close only hairline gaps in the raster mask. Larger openings (ribs,
    // spaces between legs and hair strands) retain their original silhouette.
    const alpha = new Float32Array(width * height);
    const expanded = new Float32Array(alpha.length);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3] / 255;
    for (let yy = 1; yy < height - 1; yy++)
      for (let xx = 1; xx < width - 1; xx++) {
        let value = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) value = Math.max(value, alpha[(yy + dy) * width + xx + dx]);
        expanded[yy * width + xx] = value;
      }
    for (let yy = 1; yy < height - 1; yy++)
      for (let xx = 1; xx < width - 1; xx++) {
        let value = 1;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) value = Math.min(value, expanded[(yy + dy) * width + xx + dx]);
        alpha[yy * width + xx] = value;
      }
    const distance = new Float32Array(width * height);
    for (let i = 0; i < distance.length; i++) distance[i] = alpha[i] >= 0.35 ? 1000 : 0;
    // Distance from the silhouette gives a rounded cross section rather than a flat card.
    for (let yy = 1; yy < height; yy++)
      for (let xx = 1; xx < width; xx++) {
        const i = yy * width + xx;
        distance[i] = Math.min(
          distance[i],
          distance[i - 1] + 1,
          distance[i - width] + 1,
          distance[i - width - 1] + Math.SQRT2
        );
      }
    for (let yy = height - 2; yy >= 0; yy--)
      for (let xx = width - 2; xx >= 0; xx--) {
        const i = yy * width + xx;
        distance[i] = Math.min(
          distance[i],
          distance[i + 1] + 1,
          distance[i + width] + 1,
          distance[i + width + 1] + Math.SQRT2
        );
      }
    // Smooth the distance field, then explicitly trace the alpha contour.
    // Both shells share a traced boundary joined with a continuous edge strip.
    // Texture alpha never cuts holes in that closed geometry.
    const smoothDistance = new Float32Array(distance.length);
    for (let yy = 1; yy < height - 1; yy++)
      for (let xx = 1; xx < width - 1; xx++) {
        const i = yy * width + xx;
        smoothDistance[i] =
          (distance[i] * 4 +
            distance[i - 1] * 2 +
            distance[i + 1] * 2 +
            distance[i - width] * 2 +
            distance[i + width] * 2 +
            distance[i - width - 1] +
            distance[i - width + 1] +
            distance[i + width - 1] +
            distance[i + width + 1]) /
          16;
      }
    const sample = (field, xx, yy) => {
      const ix = Math.floor(xx),
        iy = Math.floor(yy),
        fx = xx - ix,
        fy = yy - iy;
      const i = iy * width + ix;
      return (
        field[i] * (1 - fx) * (1 - fy) +
        field[i + 1] * fx * (1 - fy) +
        field[i + width] * (1 - fx) * fy +
        field[i + width + 1] * fx * fy
      );
    };
    const smoothstep = t => {
      t = Math.max(0, Math.min(1, t));
      return t * t * (3 - 2 * t);
    };
    const vertices = [];
    const point = (xx, yy) => ({ xx, yy, alpha: alpha[yy * width + xx], edge: false });
    const shape = p => {
      const px = x + (p.xx / width) * w,
        py = y + (p.yy / height) * h;
      const spread =
        smoothstep((py - frame[1] - frame[3] * 0.5) / (frame[3] * 0.18)) *
        (1 - smoothstep((px - frame[0] - frame[2] * 0.5) / (frame[2] * 0.05)));
      const d = p.edge ? 0 : (Math.max(0, sample(smoothDistance, p.xx, p.yy) - 0.5) * w) / width;
      const limit = 52 - 40 * spread;
      // A rounded profile without the old flat cap or abrupt leg offset.
      const radius = Math.sqrt(1.2 ** 2 + limit ** 2 * (1 - Math.exp((-d * (7 - 4 * spread) ** 2) / limit ** 2)));
      return { px, py, spread, radius };
    };
    const vertex = (p, side, farLeg) => {
      const { px, py, spread, radius } = shape(p);
      vertices.push(
        px - frame[0] - frame[2] / 2,
        frame[1] + frame[3] / 2 - py,
        (farLeg ? -40 : 40) * spread + side * radius,
        p.xx / width,
        p.yy / height
      );
    };
    const emit = triangle => {
      // Clip triangles against interpolated alpha. Adjacent triangles share
      // exact intersections instead of dropping whole cells at the silhouette.
      const polygon = [];
      for (let i = 0; i < triangle.length; i++) {
        const a = triangle[i],
          b = triangle[(i + 1) % triangle.length];
        const insideA = a.alpha >= 0.35,
          insideB = b.alpha >= 0.35;
        if (insideA) polygon.push(a);
        if (insideA !== insideB) {
          const [first, second] = a.yy * width + a.xx < b.yy * width + b.xx ? [a, b] : [b, a];
          const t = (0.35 - first.alpha) / (second.alpha - first.alpha);
          polygon.push({
            xx: first.xx + t * (second.xx - first.xx),
            yy: first.yy + t * (second.yy - first.yy),
            alpha: 0.35,
            edge: true
          });
        }
      }
      // Give the silhouette a narrow, explicit side wall. A zero-width
      // join can lose coverage at grazing angles, even with matching vertices.
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i],
          b = polygon[(i + 1) % polygon.length];
        if (!a.edge || !b.edge) continue;
        const hasFarLeg = shape(a).spread > 0 || shape(b).spread > 0;
        for (const farLeg of hasFarLeg ? [false, true] : [false]) {
          for (const [p, side] of [
            [a, -1],
            [b, -1],
            [a, 1],
            [a, 1],
            [b, -1],
            [b, 1]
          ])
            vertex(p, side, farLeg);
        }
      }
      for (let i = 1; i < polygon.length - 1; i++) {
        const points = [polygon[0], polygon[i], polygon[i + 1]];
        const hasFarLeg = points.some(p => shape(p).spread > 0);
        for (const farLeg of hasFarLeg ? [false, true] : [false])
          for (const side of [-1, 1]) {
            for (const p of points) vertex(p, side, farLeg);
          }
      }
    };
    for (let yy = 0; yy < height - 3; yy += 2)
      for (let xx = 0; xx < width - 3; xx += 2) {
        const a = point(xx, yy),
          b = point(xx + 2, yy),
          c = point(xx, yy + 2),
          d = point(xx + 2, yy + 2);
        emit([a, b, c]);
        emit([b, d, c]);
      }
    // Extend edge RGB into transparent texels so texture interpolation cannot
    // introduce dark borders. The traced geometry, not texture alpha, clips it.
    const filled = ctx.getImageData(0, 0, width, height);
    // Propagate opaque colors several texels beyond the contour, including
    // narrow gaps closed above. This removes dark transparent texel speckles.
    let colors = new Uint8ClampedArray(pixels);
    for (let pass = 0; pass < 4; pass++) {
      const next = new Uint8ClampedArray(colors);
      for (let yy = 1; yy < height - 1; yy++)
        for (let xx = 1; xx < width - 1; xx++) {
          const i = yy * width + xx;
          if (colors[i * 4 + 3] >= 240) continue;
          let count = 0;
          const rgb = [0, 0, 0];
          for (const offset of [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1]) {
            const n = (i + offset) * 4;
            if (colors[n + 3] < 240) continue;
            count++;
            for (let channel = 0; channel < 3; channel++) rgb[channel] += colors[n + channel];
          }
          if (!count) continue;
          for (let channel = 0; channel < 3; channel++) next[i * 4 + channel] = rgb[channel] / count;
          next[i * 4 + 3] = 255;
        }
      colors = next;
    }
    filled.data.set(colors);
    ctx.putImageData(filled, 0, 0);
    releaseMeshes();
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    meshes.push({ buffer, texture, count: vertices.length / 5 });
    draw();
  };
  const observer = new ResizeObserver(draw);
  observer.observe(stage);
  const autoButton = controls.querySelector('[data-rotation-auto]');
  let rotating = false,
    animation = 0,
    lastTime = 0;
  const tick = time => {
    if (!rotating || !active) return;
    // One revolution in 30 seconds; clamp long gaps after backgrounding.
    if (lastTime) yaw = (yaw + Math.min(100, time - lastTime) * 0.012) % 360;
    lastTime = time;
    draw();
    animation = requestAnimationFrame(tick);
  };
  const setRotating = value => {
    rotating = value;
    cancelAnimationFrame(animation);
    lastTime = 0;
    autoButton.textContent = rotating ? 'Pause' : 'Rotate';
    autoButton.setAttribute('aria-pressed', String(rotating));
    if (rotating && active) animation = requestAnimationFrame(tick);
  };
  autoButton.onclick = () => setRotating(!rotating);
  controls.querySelector('[data-rotation-reset]').onclick = () => {
    setRotating(false);
    yaw = pitch = panX = panY = 0;
    draw();
  };
  let drag;
  canvas.oncontextmenu = event => event.preventDefault();
  canvas.title = 'Left-drag to rotate. Right-drag to move.';
  canvas.onpointerdown = event => {
    if (event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    setRotating(false);
    drag = { x: event.clientX, y: event.clientY, yaw, pitch, panX, panY, button: event.button };
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => {
    if (!drag) return;
    if (drag.button === 2) {
      panX = drag.panX + event.clientX - drag.x;
      panY = drag.panY + event.clientY - drag.y;
      draw();
      return;
    }
    yaw = drag.yaw + (event.clientX - drag.x) * 0.4;
    pitch = drag.pitch + (event.clientY - drag.y) * 0.4;
    draw();
  };
  canvas.onpointerup =
    canvas.onpointercancel =
    canvas.onlostpointercapture =
      () => {
        yaw %= 360;
        pitch %= 360;
        drag = null;
      };
  return {
    async update(svg, enabled, textureOnly = false) {
      active = enabled;
      stage.classList.toggle('is-rotation-preview', active);
      controls.querySelector('[data-rotation-options]').hidden = !active;
      if (!active) {
        setRotating(false);
        ++revision;
        canvas.remove();
        releaseMeshes();
        return;
      }
      stage.append(canvas);
      await rebuild(svg, textureOnly);
    },
    zoom(value) {
      zoom = value / 100;
      draw();
    },
    dispose() {
      setRotating(false);
      active = false;
      ++revision;
      observer.disconnect();
      releaseMeshes();
      shaders.forEach(s => gl.deleteShader(s));
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}
