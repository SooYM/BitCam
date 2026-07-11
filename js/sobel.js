// js/sobel.js

/**
 * Connected Component Segmentation and Boundary Point Extractor Module
 * Maps out the exact contours of objects/regions for outline-aligned low-poly triangulation.
 */
const Sobel = {
  /**
   * Segments the image into solid color regions (representing objects),
   * extracts their simplified boundary outlines, and returns them.
   * @param {ImageData} imageData - The canvas image data.
   * @returns {Array<Object>} List of regions with vertices and color.
   */
  extractPoints: function(imageData, scaleWidth) {
    if (!scaleWidth) scaleWidth = 120;
    const originalWidth = imageData.width;
    const originalHeight = imageData.height;

    // 1. Create a downscaled temporary canvas to eliminate high-frequency details (textures, noise)
    const scaleHeight = Math.round((originalHeight * scaleWidth) / originalWidth);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = scaleWidth;
    tempCanvas.height = scaleHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw the image data to scale it down
    const offscreen = document.createElement('canvas');
    offscreen.width = originalWidth;
    offscreen.height = originalHeight;
    offscreen.getContext('2d').putImageData(imageData, 0, 0);
    tempCtx.drawImage(offscreen, 0, 0, scaleWidth, scaleHeight);

    const tempImgData = tempCtx.getImageData(0, 0, scaleWidth, scaleHeight);
    const tempData = tempImgData.data;

    // 2. Posterize the low-resolution image to group similar colors (step = 45 gives 6 bins per channel)
    const posterized = new Uint8Array(scaleWidth * scaleHeight * 4);
    for (let i = 0; i < tempData.length; i += 4) {
      posterized[i]     = Math.min(255, Math.max(0, Math.round(tempData[i] / 45) * 45));
      posterized[i + 1] = Math.min(255, Math.max(0, Math.round(tempData[i + 1] / 45) * 45));
      posterized[i + 2] = Math.min(255, Math.max(0, Math.round(tempData[i + 2] / 45) * 45));
      posterized[i + 3] = tempData[i + 3];
    }

    // Helper to get color from posterized buffer
    const getPosterizedColor = (x, y) => {
      const idx = (y * scaleWidth + x) * 4;
      return {
        r: posterized[idx],
        g: posterized[idx + 1],
        b: posterized[idx + 2]
      };
    };

    // 3. Connected Component Labeling (Flood Fill)
    const visited = new Uint8Array(scaleWidth * scaleHeight);
    const regions = [];
    const minRegionSize = 20; // Filter out tiny noise spots

    for (let y = 0; y < scaleHeight; y++) {
      for (let x = 0; x < scaleWidth; x++) {
        const idx = y * scaleWidth + x;
        if (visited[idx] === 1) continue;

        const regColor = getPosterizedColor(x, y);
        const regPixels = [];
        const queue = [{ x, y }];
        visited[idx] = 1;

        while (queue.length > 0) {
          const curr = queue.shift();
          regPixels.push(curr);

          // Check 4-connected neighbors
          const neighbors = [
            { x: curr.x + 1, y: curr.y },
            { x: curr.x - 1, y: curr.y },
            { x: curr.x, y: curr.y + 1 },
            { x: curr.x, y: curr.y - 1 }
          ];

          for (const n of neighbors) {
            if (n.x >= 0 && n.x < scaleWidth && n.y >= 0 && n.y < scaleHeight) {
              const nidx = n.y * scaleWidth + n.x;
              if (visited[nidx] === 0) {
                const c = getPosterizedColor(n.x, n.y);
                if (c.r === regColor.r && c.g === regColor.g && c.b === regColor.b) {
                  visited[nidx] = 1;
                  queue.push(n);
                }
              }
            }
          }
        }

        if (regPixels.length >= minRegionSize) {
          regions.push({
            color: regColor,
            pixels: regPixels
          });
        }
      }
    }

    // Scale factors to map coordinates back up to original display size
    const scaleX = originalWidth / scaleWidth;
    const scaleY = originalHeight / scaleHeight;

    const processedRegions = [];

    // 4. Boundary extraction and simplification for each region
    for (const reg of regions) {
      const regionSet = new Set();
      for (const p of reg.pixels) {
        regionSet.add(`${p.x},${p.y}`);
      }

      // Collect boundary pixels (pixels with at least one neighbor outside the region)
      const borderPoints = [];
      for (const p of reg.pixels) {
        const neighbors = [
          { x: p.x + 1, y: p.y },
          { x: p.x - 1, y: p.y },
          { x: p.x, y: p.y + 1 },
          { x: p.x, y: p.y - 1 }
        ];
        let isBorder = false;
        for (const n of neighbors) {
          if (n.x < 0 || n.x >= scaleWidth || n.y < 0 || n.y >= scaleHeight || !regionSet.has(`${n.x},${n.y}`)) {
            isBorder = true;
            break;
          }
        }
        if (isBorder) {
          borderPoints.push(p);
        }
      }

      // Subsample boundary points to enforce clean, sparse polygons
      const vertices = [];
      const step = Math.max(3, Math.floor(borderPoints.length / 9)); // Targets 8-10 points per region
      for (let k = 0; k < borderPoints.length; k += step) {
        vertices.push(borderPoints[k]);
      }
      
      // Upscale vertices to original size
      const scaledVertices = vertices.map(p => ({
        x: Math.round(p.x * scaleX),
        y: Math.round(p.y * scaleY)
      }));

      // Add a few interior points inside large regions to prevent massive triangulation holes
      if (reg.pixels.length > 150) {
        const sampleStep = Math.floor(reg.pixels.length / 4);
        for (let k = sampleStep; k < reg.pixels.length; k += sampleStep) {
          const ip = reg.pixels[k];
          scaledVertices.push({
            x: Math.round(ip.x * scaleX),
            y: Math.round(ip.y * scaleY)
          });
        }
      }

      // Always secure region bounding corners to lock adjacent region seams
      processedRegions.push({
        color: reg.color,
        vertices: scaledVertices,
        regionSet: regionSet,
        scaleX: scaleX,
        scaleY: scaleY
      });
    }

    return processedRegions;
  }
};
