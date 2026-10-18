// Dithered sphere backdrop. Loaded by banner.html, draws into <canvas id="art">.
// Configure through window.BANNER_ART before this script runs:
//   palette: color stops from shadow to highlight, e.g. ["#1a0500", "#8a1c00", "#ff6a00", "#ffd199"]
//   cx, cy, radius: sphere center and size in banner pixels
//   cell: dither cell size in px (2-4 looks right)
//   light: [x, y] light direction, pointing from the sphere toward the light
//   seed: any number, changes the noise
//   style: "sphere" (default), "vinyl" (record with grooves, for music/audio products) or "none"
//          (skip the art and keep only the .glow gradients). Pick what fits the product; not every banner needs a planet.
(() => {
  const config = {
    palette: ["#1a0500", "#8a1c00", "#ff6a00", "#ffd199"],
    cx: 1040,
    cy: 360,
    radius: 250,
    cell: 3,
    light: [-0.55, -0.45],
    seed: 7,
    style: "sphere",
    ...window.BANNER_ART,
  };

  if (config.style === "none") {
    return;
  }

  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  const BAYER_SIZE = 4;
  const BAYER_LEVELS = 16;

  const hexToRgb = (hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const stops = config.palette.map(hexToRgb);

  const seeded = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + config.seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };

  const colorAt = (t) => {
    const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    const index = Math.min(Math.floor(scaled), stops.length - 2);
    const mix = scaled - index;
    return stops[index].map((channel, i) => channel + (stops[index + 1][i] - channel) * mix);
  };

  const lightLength = Math.hypot(config.light[0], config.light[1], 0.7);
  const lx = config.light[0] / lightLength;
  const ly = config.light[1] / lightLength;
  const lz = 0.7 / lightLength;

  const { cell, cx, cy, radius } = config;
  for (let py = 0; py < height; py += cell) {
    for (let px = 0; px < width; px += cell) {
      const dx = (px + cell / 2 - cx) / radius;
      const dy = (py + cell / 2 - cy) / radius;
      const distance = Math.hypot(dx, dy);

      // Light falloff: sphere shading inside, a sparse dusty halo outside.
      let intensity;
      if (distance <= 1 && config.style === "vinyl") {
        // Record: fine grooves, two opposite light streaks, a bright label and a spindle hole.
        const angle = Math.atan2(dy, dx);
        const lightAngle = Math.atan2(ly, lx);
        const streak = Math.max(0, Math.cos(2 * (angle - lightAngle))) ** 3;
        const grooves = 0.5 + 0.5 * Math.sin(distance * radius * 1.1);
        if (distance < 0.05) {
          intensity = 0;
        } else if (distance < 0.33) {
          intensity = 0.85 + 0.15 * streak;
        } else if (distance < 0.36) {
          intensity = 0.05;
        } else {
          intensity = (0.3 + 0.6 * streak) * (0.65 + 0.35 * grooves);
        }
      } else if (distance <= 1) {
        const dz = Math.sqrt(1 - distance * distance);
        intensity = Math.max(0, dx * lx + dy * ly + dz * lz);
        intensity = intensity ** 1.4;
      } else {
        intensity = Math.max(0, 0.22 - (distance - 1) * 0.5) * (0.4 + seeded(px, py));
      }

      const cellX = Math.floor(px / cell);
      const cellY = Math.floor(py / cell);
      const threshold = (BAYER[cellY % BAYER_SIZE][cellX % BAYER_SIZE] + 0.5) / BAYER_LEVELS;
      const noisy = intensity + (seeded(cellX, cellY) - 0.5) * 0.18;
      if (noisy <= threshold * 0.9) {
        continue;
      }

      const [r, g, b] = colorAt(intensity);
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(px, py, cell - 1, cell - 1);
    }
  }
})();
