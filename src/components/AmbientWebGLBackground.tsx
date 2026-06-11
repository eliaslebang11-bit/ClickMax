import React, { useEffect, useRef, useState } from "react";

export default function AmbientWebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeEngine, setActiveEngine] = useState<"webgl" | "canvas2d" | "css">("webgl");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Track mouse coordinates
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, isMoving: false, lastMove: Date.now() };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isMoving = true;
      mouse.lastMove = Date.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.isMoving = true;
        mouse.lastMove = Date.now();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    // Try setting up WebGL first
    let gl: WebGLRenderingContext | null = null;
    let animationFrameId = 0;

    try {
      gl = (canvas.getContext("webgl", { alpha: true, depth: false, antialias: true }) ||
            canvas.getContext("experimental-webgl", { alpha: true, depth: false, antialias: true })) as WebGLRenderingContext | null;
    } catch (e) {
      gl = null;
    }

    if (gl) {
      setActiveEngine("webgl");

      // Custom Vertex Shader
      const vsSource = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          vUv.y = 1.0 - vUv.y;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      // Custom Procedural Cosmic/Ocean Fluid Fragment Shader
      const fsSource = `
        precision mediump float;
        varying vec2 vUv;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uTime;

        // Custom simplex-like procedural noise grid
        float noise(in vec2 p) {
          return sin(p.x * 2.0) * cos(p.y * 2.0) + sin(p.y * 1.5 + uTime * 0.2) * cos(p.x * 1.2 - uTime * 0.1);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          
          // Ripple from cursor location
          vec2 normMouse = uMouse / uResolution;
          float distToMouse = distance(uv, vec2(normMouse.x, 1.0 - normMouse.y));
          float wave = sin(distToMouse * 15.0 - uTime * 1.5) * exp(-distToMouse * 3.5);
          
          // Fluid cosmic movement
          vec2 flowUv = uv + vec2(
            noise(uv * 3.5 + vec2(uTime * 0.06, uTime * 0.04)),
            noise(uv * 4.0 - vec2(uTime * 0.05, uTime * 0.07))
          ) * 0.15;
          
          // Calculate cosmic gradient with cinematic dark cyan, indigo, and deep magenta
          float n = noise(flowUv * 2.5);
          vec3 darkSpace = vec3(0.011, 0.011, 0.02); // Primary app background color match
          
          vec3 tealColor = vec3(0.04, 0.55, 0.65); // Cinematic ClickMax highlights (turquoise/teal)
          vec3 violetColor = vec3(0.48, 0.02, 0.38); // Secondary visual highlights (crimson/magenta)
          
          // Color mixing
          vec3 baseFluid = mix(darkSpace, tealColor * 0.09, clamp(n + 0.5, 0.0, 1.0));
          baseFluid = mix(baseFluid, violetColor * 0.07, clamp(noise(flowUv * 5.0 + 10.0), 0.0, 1.0));
          
          // Overlay dynamic reactive light ripple
          baseFluid += vec3(0.1, 0.45, 0.6) * wave * 0.15;
          
          // Vignette effect to keep layout text elements perfectly legible
          float vignette = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y);
          vignette = clamp(pow(16.0 * vignette, 0.6), 0.0, 1.0);
          
          gl_FragColor = vec4(baseFluid * vignette, 0.85);
        }
      `;

      // Compile and initialize shader program
      const createShader = (glContext: WebGLRenderingContext, source: string, type: number) => {
        const shader = glContext.createShader(type);
        if (!shader) return null;
        glContext.shaderSource(shader, source);
        glContext.compileShader(shader);
        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
          const info = glContext.getShaderInfoLog(shader);
          console.error("Shader compilation error:", info);
          glContext.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = createShader(gl, vsSource, gl.VERTEX_SHADER);
      const fs = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
      let program: WebGLProgram | null = null;

      if (vs && fs) {
        program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Link program failed:", gl.getProgramInfoLog(program));
            program = null;
          }
        }
      }

      if (program) {
        gl.useProgram(program);

        // Bind vertices
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const vertices = new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Get uniforms
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        const mouseUniform = gl.getUniformLocation(program, "uMouse");
        const timeUniform = gl.getUniformLocation(program, "uTime");

        let startTime = Date.now();

        const resizeWebGL = () => {
          if (!canvas) return;
          const width = window.innerWidth;
          const height = window.innerHeight;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl?.viewport(0, 0, width, height);
          }
        };

        const renderWebGL = () => {
          if (!gl || !program) return;
          resizeWebGL();

          // Smoothly interpolate mouse coordinates for organic inertia/lag
          mouse.x += (mouse.targetX - mouse.x) * 0.08;
          mouse.y += (mouse.targetY - mouse.y) * 0.08;

          // Decay cursor velocity if stationary
          if (Date.now() - mouse.lastMove > 2000) {
            mouse.targetX = window.innerWidth * 0.5 + Math.sin(Date.now() * 0.001) * 100;
            mouse.targetY = window.innerHeight * 0.5 + Math.cos(Date.now() * 0.0015) * 80;
          }

          const elapsedSeconds = (Date.now() - startTime) / 1000;

          gl.clearColor(0.011, 0.011, 0.02, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);

          gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
          gl.uniform2f(mouseUniform, mouse.x, mouse.y);
          gl.uniform1f(timeUniform, elapsedSeconds);

          gl.drawArrays(gl.TRIANGLES, 0, 6);
          animationFrameId = requestAnimationFrame(renderWebGL);
        };

        renderWebGL();
      } else {
        gl = null; // Forces fallback
      }
    }

    // Fallback: Custom High-Performance 2D Canvas Interactive Neural Grid / Connections Network
    if (!gl) {
      setActiveEngine("canvas2d");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        interface Particle {
          x: number;
          y: number;
          vx: number;
          vy: number;
          radius: number;
          color: string;
        }

        const particles: Particle[] = [];
        const particleCount = Math.min(100, Math.floor((window.innerWidth * window.innerHeight) / 15000));
        
        // Define color array matching ClickMax aesthetic
        const colors = [
          "rgba(10, 140, 166, 0.45)", // Teal / Turquoise
          "rgba(122, 5, 98, 0.45)",   // Magenta
          "rgba(47, 85, 212, 0.35)",   // Interactive Blue
        ];

        // Seed particles
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1.2,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }

        const resize2D = () => {
          if (!canvas) return;
          const width = window.innerWidth;
          const height = window.innerHeight;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
        };

        const render2D = () => {
          if (!ctx || !canvas) return;
          resize2D();

          ctx.fillStyle = "rgba(4, 4, 10, 0.12)"; // Fading trailing trail
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          mouse.x += (mouse.targetX - mouse.x) * 0.08;
          mouse.y += (mouse.targetY - mouse.y) * 0.08;

          // Default slow drift if mouse has been stale
          if (Date.now() - mouse.lastMove > 3000) {
            mouse.targetX = canvas.width * 0.5 + Math.sin(Date.now() * 0.0019) * 150;
            mouse.targetY = canvas.height * 0.5 + Math.cos(Date.now() * 0.0022) * 100;
          }

          // Draw connections first
          for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            
            // Connect to mouse gravity wells with color highlights
            const dxM = mouse.x - p1.x;
            const dyM = mouse.y - p1.y;
            const distM = Math.sqrt(dxM * dxM + dyM * dyM);
            if (distM < 160) {
              const alpha = (1 - distM / 160) * 0.4;
              ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.stroke();

              // Pull particle toward cursor organically
              p1.vx += (dxM / distM) * 0.015;
              p1.vy += (dyM / distM) * 0.015;
            }

            for (let j = i + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 100) {
                const alpha = (1 - dist / 100) * 0.25;
                ctx.strokeStyle = `rgba(180, 220, 255, ${alpha})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            }
          }

          // Render & update particles list dynamically
          for (const p of particles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Drag resistance limit
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Bounce on wall bounding boxes
            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }
          }

          animationFrameId = requestAnimationFrame(render2D);
        };

        render2D();
      } else {
        setActiveEngine("css");
      }
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-50 overflow-hidden select-none pointer-events-none bg-[#030307]">
      {activeEngine !== "css" ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block opacity-60"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[#020205] via-[#04101e] to-[#0d0112] animate-pulse duration-10000" />
      )}
      {/* Dynamic ambient overlays for premium depth contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030307]/40 to-[#030307]/90 pointer-events-none" />
    </div>
  );
}
