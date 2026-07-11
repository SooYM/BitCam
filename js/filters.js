// js/filters.js

/**
 * PS2 Hardware Emulation Filter Module
 */
const Filters = {
  /**
   * Applies the unified PS2 console post-processing rendering pipeline.
   * Includes volumetric draw-distance fog, CRT scanlines, 16-bit color quantization, 
   * and grit analog film grain noise.
   * @param {CanvasRenderingContext2D} ctx - Target canvas context.
   * @param {number} width - Canvas width.
   * @param {number} height - Canvas height.
   */
  applyPS2Pipeline: function(ctx, width, height) {
    ctx.save();
    
    // 1. Contrast and saturation boost (emulates early TV display calibrations)
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'contrast(1.22) saturate(1.4) brightness(1.02)';
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';

    // 2. Draw Volumetric Fog (Hazy depth gradient)
    // Runs from horizon (fading to transparent) down to the bottom (thick haze)
    const fogGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    fogGrad.addColorStop(0, 'rgba(165, 175, 195, 0.0)');   // Transparent at sky
    fogGrad.addColorStop(0.65, 'rgba(165, 175, 195, 0.38)'); // Muted haze
    fogGrad.addColorStop(1, 'rgba(165, 175, 195, 0.68)');   // Thick ground fog
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Draw TV Scanlines (Horizontal beam lines)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < height; y += 2.5) {
      ctx.fillRect(0, y, width, 1);
    }

    // 4. Subtle Vignette framing
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.4,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();

    // 5. 16-bit Color Palette Quantization (4096-color lookup lookup table simulation)
    // Compresses the output range to replicate early graphics hardware VRAM limits
    this.applyPosterization(ctx, width, height, 16);

    // 6. Inject Grit Analog Noise / Film Grain (avoids modern anti-aliasing smoothness)
    this.applyFilmGrain(ctx, width, height, 0.08);
  },

  /**
   * Reduces color depth of the canvas to simulate early 3D console color limitations.
   */
  applyPosterization: function(ctx, width, height, steps) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const stepSize = 255 / (steps - 1);
      
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        data[i] = Math.round(data[i] / stepSize) * stepSize;
        data[i + 1] = Math.round(data[i + 1] / stepSize) * stepSize;
        data[i + 2] = Math.round(data[i + 2] / stepSize) * stepSize;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn("Could not apply color depth posterization:", e);
    }
  },

  /**
   * Helper to quantize a single RGB color.
   */
  quantizeColor: function(r, g, b, steps) {
    const stepSize = 255 / (steps - 1);
    const qr = Math.round(r / stepSize) * stepSize;
    const qg = Math.round(g / stepSize) * stepSize;
    const qb = Math.round(b / stepSize) * stepSize;
    return {
      r: Math.min(255, Math.max(0, qr)),
      g: Math.min(255, Math.max(0, qg)),
      b: Math.min(255, Math.max(0, qb))
    };
  },

  /**
   * Inject high-frequency gritty noise to simulate analog TV output grain.
   */
  applyFilmGrain: function(ctx, width, height, amount) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const noise = (Math.random() - 0.5) * amount * 255;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn("Could not apply film grain:", e);
    }
  }
};
