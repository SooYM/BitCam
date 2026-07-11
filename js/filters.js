// js/filters.js

/**
 * 6th-Gen Console (PlayStation 2) Graphics Synthesizer Simulation Module
 */
const Filters = {
  /**
   * Main 6th-Gen Console (PS2) Graphics Simulation Pipeline
   * @param {HTMLImageElement} img - The source image.
   * @param {HTMLCanvasElement} destCanvas - The display canvas to render onto.
   */
  apply6thGenPipeline: function(img, destCanvas) {
    console.log("[VicePoly Engine] Starting graphics simulation pipeline...");
    
    const destCtx = destCanvas.getContext('2d');
    const displayW = destCanvas.width;
    const displayH = destCanvas.height;

    console.log(`[VicePoly Engine] Target display dimensions: ${displayW}x${displayH}`);

    // --- STAGE 2.1: Spatial Quantization (Nearest Downscaling) ---
    // Downscale to NTSC standard resolution (320x240)
    const lowResW = 320;
    const lowResH = 240;

    const lowResCanvas = document.createElement('canvas');
    lowResCanvas.width = lowResW;
    lowResCanvas.height = lowResH;
    const lowResCtx = lowResCanvas.getContext('2d');

    // Force strict Nearest-Neighbor downscaling
    lowResCtx.imageSmoothingEnabled = false;
    lowResCtx.msImageSmoothingEnabled = false;
    lowResCtx.webkitImageSmoothingEnabled = false;

    // Draw source image scaled to 320x240
    lowResCtx.drawImage(img, 0, 0, lowResW, lowResH);

    // Extract low-res pixel matrix
    const imgData = lowResCtx.getImageData(0, 0, lowResW, lowResH);
    const data = imgData.data;

    // Sanity check low-res pixels
    let lowResSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      lowResSum += data[i] + data[i+1] + data[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.1 Downscale - Pixel color sum: ${lowResSum}`);

    // --- STAGE 2.2: Structural Edge Hardening (Unsharp Mask) ---
    const originalPixels = new Uint8ClampedArray(data);
    const blurredPixels = this.boxBlur3x3(originalPixels, lowResW, lowResH);
    const sharpenAmount = 1.8; 

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) { // R, G, B
        const origVal = originalPixels[i + c];
        const blurVal = blurredPixels[i + c];
        const diff = origVal - blurVal;
        const sharpVal = origVal + sharpenAmount * diff;
        data[i + c] = Math.min(255, Math.max(0, Math.round(sharpVal)));
      }
    }

    let sharpenSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sharpenSum += data[i] + data[i+1] + data[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.2 Sharpen - Pixel color sum: ${sharpenSum}`);

    // --- STAGE 2.3: Textural Mipmap Simulation (Selective Blurring) ---
    const originalPixels2 = new Uint8ClampedArray(data);
    const blurredPixels2 = this.boxBlur3x3(originalPixels2, lowResW, lowResH);
    const cx = lowResW / 2;
    const cy = lowResH / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy) * 0.75; 

    for (let y = 0; y < lowResH; y++) {
      for (let x = 0; x < lowResW; x++) {
        const i = (y * lowResW + x) * 4;
        
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const blurFactor = Math.min(1.0, dist / maxDist); 

        for (let c = 0; c < 3; c++) {
          const orig = originalPixels2[i + c];
          const blur = blurredPixels2[i + c];
          data[i + c] = Math.round(orig * (1 - blurFactor) + blur * blurFactor);
        }
      }
    }

    let mipmapSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      mipmapSum += data[i] + data[i+1] + data[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.3 Mipmap - Pixel color sum: ${mipmapSum}`);

    // --- STAGE 2.4 & 2.5: 16-Bit Color Space (RGB5A1) & Bayer 4x4 Dithering ---
    const bayerMatrix = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    const stepSize = 255 / 31; // ~8.226

    for (let y = 0; y < lowResH; y++) {
      for (let x = 0; x < lowResW; x++) {
        const i = (y * lowResW + x) * 4;
        const matrixVal = bayerMatrix[y % 4][x % 4] / 16 - 0.5;
        const ditherOffset = matrixVal * stepSize * 1.15;

        for (let c = 0; c < 3; c++) {
          const rawVal = data[i + c] + ditherOffset;
          const clampedVal = Math.min(255, Math.max(0, rawVal));
          data[i + c] = Math.round(Math.round(clampedVal / stepSize) * stepSize);
        }
      }
    }

    let ditherSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      ditherSum += data[i] + data[i+1] + data[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.4/2.5 Dither - Pixel color sum: ${ditherSum}`);

    // Put image data back to the low-res canvas
    lowResCtx.putImageData(imgData, 0, 0);

    // --- STAGE 2.6: CRT Analog Output & Scanline Emulation ---
    destCtx.imageSmoothingEnabled = false;
    destCtx.msImageSmoothingEnabled = false;
    destCtx.webkitImageSmoothingEnabled = false;
    destCtx.drawImage(lowResCanvas, 0, 0, displayW, displayH);

    const finalImgData = destCtx.getImageData(0, 0, displayW, displayH);
    const finalData = finalImgData.data;

    let upscaleSum = 0;
    for (let i = 0; i < finalData.length; i += 4) {
      upscaleSum += finalData[i] + finalData[i+1] + finalData[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.6 Upscale - Pixel color sum: ${upscaleSum}`);

    // Apply chroma blur (analog composite cable YUV low-pass filter)
    this.applyChromaBleed(finalData, displayW, displayH);

    let chromaSum = 0;
    for (let i = 0; i < finalData.length; i += 4) {
      chromaSum += finalData[i] + finalData[i+1] + finalData[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.6 Chroma Bleed - Pixel color sum: ${chromaSum}`);

    // Apply scanlines: odd rows (y = 2n + 1) attenuated by 38%
    const attenuation = 0.62; 
    for (let y = 0; y < displayH; y++) {
      if (y % 2 === 1) {
        for (let x = 0; x < displayW; x++) {
          const i = (y * displayW + x) * 4;
          finalData[i] = Math.round(finalData[i] * attenuation);
          finalData[i + 1] = Math.round(finalData[i + 1] * attenuation);
          finalData[i + 2] = Math.round(finalData[i + 2] * attenuation);
        }
      }
    }

    // Apply a light analog CRT film grain noise overlay
    this.injectAnalogNoise(finalData, 0.05);

    let finalSum = 0;
    for (let i = 0; i < finalData.length; i += 4) {
      finalSum += finalData[i] + finalData[i+1] + finalData[i+2];
    }
    console.log(`[VicePoly Engine] Stage 2.6 Final - Pixel color sum: ${finalSum}`);

    // Put final composite buffer to display canvas
    destCtx.putImageData(finalImgData, 0, 0);
  },

  /**
   * Helper to perform a 3x3 box blur (1 pixel radius)
   */
  boxBlur3x3: function(srcData, w, h) {
    const dest = new Uint8ClampedArray(srcData.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          const ny = y + ky;
          if (ny < 0 || ny >= h) continue;
          
          for (let kx = -1; kx <= 1; kx++) {
            const nx = x + kx;
            if (nx < 0 || nx >= w) continue;
            
            const ni = (ny * w + nx) * 4;
            rSum += srcData[ni];
            gSum += srcData[ni + 1];
            bSum += srcData[ni + 2];
            count++;
          }
        }
        
        dest[i] = Math.round(rSum / count);
        dest[i + 1] = Math.round(gSum / count);
        dest[i + 2] = Math.round(bSum / count);
        dest[i + 3] = srcData[i + 3]; 
      }
    }
    return dest;
  },

  /**
   * Emulates analog video chroma bleeding (YUV color space low-pass blur on U/V)
   */
  applyChromaBleed: function(pixels, w, h) {
    const uChan = new Float32Array(w * h);
    const vChan = new Float32Array(w * h);
    const yChan = new Float32Array(w * h);

    // Convert RGB to YUV
    for (let i = 0; i < pixels.length; i += 4) {
      const idx = i / 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      yChan[idx] = 0.299 * r + 0.587 * g + 0.114 * b;
      uChan[idx] = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
      vChan[idx] = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
    }

    // 2. Perform 1D horizontal blur on U and V (kernel size 5: offset -2 to 2)
    const uBlurred = new Float32Array(uChan.length);
    const vBlurred = new Float32Array(vChan.length);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        let uSum = 0, vSum = 0, count = 0;
        
        for (let k = -2; k <= 2; k++) {
          const nx = x + k;
          if (nx >= 0 && nx < w) {
            const nidx = y * w + nx;
            uSum += uChan[nidx];
            vSum += vChan[nidx];
            count++;
          }
        }
        uBlurred[idx] = uSum / count;
        vBlurred[idx] = vSum / count;
      }
    }

    // 3. Convert YUV back to RGB (Luminance Y remains sharp!)
    for (let i = 0; i < pixels.length; i += 4) {
      const idx = i / 4;
      const Y = yChan[idx];
      const U = uBlurred[idx] - 128;
      const V = vBlurred[idx] - 128;

      const r = Y + 1.402 * V;
      const g = Y - 0.344136 * U - 0.714136 * V;
      const b = Y + 1.772 * U;

      pixels[i] = Math.min(255, Math.max(0, Math.round(r)));
      pixels[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
      pixels[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }
  },

  /**
   * Inject high-frequency gritty noise to simulate analog TV output grain.
   */
  injectAnalogNoise: function(pixels, amount) {
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      const noise = (Math.random() - 0.5) * amount * 255;
      pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise));
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise));
    }
  }
};
