"use client";

import { useEffect, useRef } from "react";

export function ParticleCanvas({
  maxParticles = 1800,
  particleSizeMin = 6,
  particleSizeMax = 12,
  speedScale = 2,
  className = "",
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const frameRef = useRef(null);

  const Helper = {
    createShader: (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    },

    createProgram: (gl, vertexShader, fragmentShader) => {
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      return program;
    },

    vertexShader: `
      attribute vec2 a_position;
      uniform vec2 u_resolution;
      attribute vec2 a_color;
      varying vec2 v_color;

      void main() {
        gl_Position = vec4(
          vec2(1.0, -1.0) * ((a_position / u_resolution) * 2.0 - 1.0),
          0.0,
          1.0
        );
        v_color = a_color;
      }
    `,

    fragmentShader: `
      precision mediump float;
      varying vec2 v_color;
      uniform float u_tick;

      float frac = 1.0 / 6.0;

      void main() {
        float hue = v_color.x + u_tick;
        hue = abs(hue - floor(hue));

        vec4 color = vec4(0.0);

        if (hue < frac) {
          color.r = 1.0;
          color.g = hue / frac;
        } else if (hue < frac * 2.0) {
          color.r = 1.0 - (hue - frac) / frac;
          color.g = 1.0;
        } else if (hue < frac * 3.0) {
          color.g = 1.0;
          color.b = (hue - frac * 2.0) / frac;
        } else if (hue < frac * 4.0) {
          color.g = 1.0 - (hue - frac * 3.0) / frac;
          color.b = 1.0;
        } else if (hue < frac * 5.0) {
          color.r = (hue - frac * 4.0) / frac;
          color.b = 1.0;
        } else {
          color.r = 1.0;
          color.b = 1.0 - (hue - frac * 5.0) / frac;
        }

        vec3 startColor = vec3(0.18, 0.42, 1.0);   // deep blue
vec3 midColor   = vec3(0.45, 0.18, 1.0);   // violet
vec3 endColor   = vec3(0.95, 0.22, 0.75);  // magenta pink

vec3 finalColor;

if (hue < 0.45) {
  finalColor = mix(startColor, midColor, hue / 0.45);
} else {
  finalColor = mix(midColor, endColor, (hue - 0.45) / 0.55);
}

color = vec4(finalColor * (0.85 + v_color.y * 0.35), v_color.y);
gl_FragColor = color;
      }
    `,
  };

  useEffect(() => {

    let isInside = false;
    let burstTimer = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true });
    if (!gl) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();

    const vertexShader = Helper.createShader(
      gl,
      gl.VERTEX_SHADER,
      Helper.vertexShader
    );

    const fragmentShader = Helper.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      Helper.fragmentShader
    );

    const program = Helper.createProgram(gl, vertexShader, fragmentShader);

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();

    const aPosition = gl.getAttribLocation(program, "a_position");
    const aColor = gl.getAttribLocation(program, "a_color");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTick = gl.getUniformLocation(program, "u_tick");

    gl.useProgram(program);
    gl.enableVertexAttribArray(aPosition);
    gl.enableVertexAttribArray(aColor);
    gl.clearColor(0, 0, 0, 0);

    const mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    function createCircle(x, y, r) {
      const points = [];
      const step = (Math.PI * 2) / 6;

      let px = x + r;
      let py = y;

      for (let i = 0; i <= Math.PI * 2 + step; i += step) {
        const nx = x + r * Math.cos(i);
        const ny = y + r * Math.sin(i);

        points.push(x, y, px, py, nx, ny);

        px = nx;
        py = ny;
      }

      return points;
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.size =
            particleSizeMin +
            Math.random() * (particleSizeMax - particleSizeMin);

        // exact cursor position spawn
        this.x = mouse.x;
        this.y = mouse.y;

        // centered flower-pot burst from cursor point
        const angle =
        -Math.PI / 2 + (Math.random() - 0.5) * 1.45;

        // stronger and wider spread like reference video
        const velocity = (4.5 + Math.random() * 4) * speedScale;

        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;

        // stronger downfall so particles visibly fall back down
        this.gravity = 0.22 + Math.random() * 0.08;

        // slightly slower fade so downfall remains visible
        this.life = 1;
        this.decay = 0.988;
    }

      step(triangles, colors) {
        // first render at exact cursor position
        const currentX = this.x;
        const currentY = this.y;

        // then move after drawing
        this.vx *= 0.985;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        this.life *= this.decay;

        const shape = createCircle(
            currentX,
            currentY,
            this.size * this.life
        );

        const hue = 0.76 + Math.random() * 0.03;

        for (let i = 0; i < shape.length; i += 2) {
          triangles.push(shape[i], shape[i + 1]);
          colors.push(hue, this.life);
        }

        return this.life > 0.03;
      }
    }

    const handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();

        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    };

    const handleMouseEnter = (e) => {
    isInside = true;

    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    burstTimer = setInterval(() => {
    if (!isInside) return;

    // smaller bursts but much more frequent = smooth continuous stream
    for (let i = 0; i < 10; i++) {
        if (particlesRef.current.length < maxParticles) {
        particlesRef.current.push(new Particle());
        }
    }
    }, 12);
    };

    const handleMouseLeave = () => {
    isInside = false;

    if (burstTimer) {
        clearInterval(burstTimer);
        burstTimer = null;
    }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    window.addEventListener("resize", resize);

    const animate = (tick) => {
      const triangles = [];
      const colors = [];

      gl.clear(gl.COLOR_BUFFER_BIT);

      particlesRef.current = particlesRef.current.filter((particle) =>
        particle.step(triangles, colors)
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(triangles),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(colors),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(aColor, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTick, tick * 0.0004);


      gl.drawArrays(gl.TRIANGLES, 0, triangles.length / 2);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);

      if (burstTimer) clearInterval(burstTimer);

      window.removeEventListener("resize", resize);
     };
  }, [maxParticles, particleSizeMin, particleSizeMax, speedScale]);

  return (
    <canvas
  ref={canvasRef}
  className={`absolute inset-0 z-[2] h-full w-full ${className}`}
/>
  );
}