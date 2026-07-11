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
    // Downscale to a higher VGA-equivalent resolution (640px max dimension)
    // to emulate a high-poly late-era console look while preserving aspect ratio.
    const targetMaxDim = 640; 
    let lowResW, lowResH;
    if (displayW > displayH) {
      lowResW = targetMaxDim;
      lowResH = Math.max(1, Math.round((displayH * targetMaxDim) / displayW));
    } else {
      lowResH = targetMaxDim;
      lowResW = Math.max(1, Math.round((displayW * targetMaxDim) / displayH));
    }

    console.log(`[VicePoly Engine] Downscale buffer resolution: ${lowResW}x${lowResH}`);

    const lowResCanvas = document.createElement('canvas');
    lowResCanvas.width = lowResW;
    lowResCanvas.height = lowResH;
    const lowResCtx = lowResCanvas.getContext('2d');

    // Force strict Nearest-Neighbor downscaling
    lowResCtx.imageSmoothingEnabled = false;
    lowResCtx.msImageSmoothingEnabled = false;
    lowResCtx.webkitImageSmoothingEnabled = false;

    // Draw source image scaled to low-res
    lowResCtx.drawImage(img, 0, 0, lowResW, lowResH);

    // Extract low-res pixel matrix
    const imgData = lowResCtx.getImageData(0, 0, lowResW, lowResH);
    const data = imgData.data;

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

    // Put image data back to the low-res canvas
    lowResCtx.putImageData(imgData, 0, 0);

    // --- STAGE 2.6: CRT Analog Output & Upscaling ---
    // (VHS scanlines, composite chroma bleeding, and film noise are removed as requested)
    destCtx.imageSmoothingEnabled = false;
    destCtx.msImageSmoothingEnabled = false;
    destCtx.webkitImageSmoothingEnabled = false;
    destCtx.drawImage(lowResCanvas, 0, 0, displayW, displayH);
    
    console.log("[VicePoly Engine] Graphics simulation complete.");
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
  }
};
