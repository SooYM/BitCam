// js/sobel.js

/**
 * Silhouette-Aligned Edge Detection and Feature Point Extractor Module
 * Optimized to produce clean, large geometric shapes and minimal polygons.
 */
const Sobel = {
  /**
   * Extract key feature points from an ImageData object.
   * To prevent noisy/webbed meshes, we first downsample the image to a low-resolution buffer.
   * This downscaling acts as a powerful low-pass filter, erasing reflections, text, pipes,
   * and high-frequency textures, leaving only major structural outlines (like the car body shape).
   * We then run edge detection on this simplified buffer and scale the coordinates back up.
   * @param {ImageData} imageData - The canvas image data.
   * @returns {Array<{x: number, y: number}>} Array of unique key points.
   */
  extractPoints: function(imageData) {
    const originalWidth = imageData.width;
    const originalHeight = imageData.height;

    // 1. Create a downscaled temporary canvas to eliminate high-frequency details (noise, textures, pipes)
    const scaleWidth = 140; // Super low resolution for point extraction
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
    
    // Allow default bilinear scaling to blur details naturally
    tempCtx.drawImage(offscreen, 0, 0, scaleWidth, scaleHeight);

    const tempImgData = tempCtx.getImageData(0, 0, scaleWidth, scaleHeight);
    const tempData = tempImgData.data;

    // 2. Convert downscaled image to grayscale (Luminance formula)
    const gray = new Uint8Array(scaleWidth * scaleHeight);
    for (let i = 0; i < tempData.length; i += 4) {
      gray[i / 4] = 0.299 * tempData[i] + 0.587 * tempData[i + 1] + 0.114 * tempData[i + 2];
    }

    // 3. Compute Sobel gradient magnitudes on low-res buffer
    const magnitudes = new Float32Array(scaleWidth * scaleHeight);
    for (let y = 1; y < scaleHeight - 1; y++) {
      for (let x = 1; x < scaleWidth - 1; x++) {
        const idx = y * scaleWidth + x;

        // Horizontal gradient kernel
        const hVal = 
          -1 * gray[(y - 1) * scaleWidth + (x - 1)] + 1 * gray[(y - 1) * scaleWidth + (x + 1)] +
          -2 * gray[(y) * scaleWidth + (x - 1)]     + 2 * gray[(y) * scaleWidth + (x + 1)] +
          -1 * gray[(y + 1) * scaleWidth + (x - 1)] + 1 * gray[(y + 1) * scaleWidth + (x + 1)];

        // Vertical gradient kernel
        const vVal = 
          -1 * gray[(y - 1) * scaleWidth + (x - 1)] - 2 * gray[(y - 1) * scaleWidth + (x)] - 1 * gray[(y - 1) * scaleWidth + (x + 1)] +
           1 * gray[(y + 1) * scaleWidth + (x - 1)] + 2 * gray[(y + 1) * scaleWidth + (x)] + 1 * gray[(y + 1) * scaleWidth + (x + 1)];

        magnitudes[idx] = Math.sqrt(hVal * hVal + vVal * vVal);
      }
    }

    const scalePoints = [];

    // Spacing constraints for the low-res image:
    // - Along outlines: place vertices every 12 pixels.
    // - In flat regions: place vertices sparsely every 32 pixels.
    const edgeSpacing = 12;
    const flatGridSize = 32;
    const silhouetteThreshold = 35; // Capture dominant outlines

    // Initialize spatial grid for O(1) distance lookups to prevent coordinates from clustering
    const gridW = Math.ceil(scaleWidth / edgeSpacing);
    const gridH = Math.ceil(scaleHeight / edgeSpacing);
    const edgeGrid = new Uint8Array(gridW * gridH); // 0 = empty, 1 = occupied

    // 4. Scan for contours and place points along outlines
    for (let y = 2; y < scaleHeight - 2; y++) {
      for (let x = 2; x < scaleWidth - 2; x++) {
        const idx = y * scaleWidth + x;
        
        if (magnitudes[idx] > silhouetteThreshold) {
          const gx = Math.floor(x / edgeSpacing);
          const gy = Math.floor(y / edgeSpacing);

          // Check if any neighboring cell in a 3x3 grid is occupied
          let tooClose = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = gx + dx;
              const ny = gy + dy;
              if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
                if (edgeGrid[ny * gridW + nx] === 1) {
                  tooClose = true;
                  break;
                }
              }
            }
            if (tooClose) break;
          }

          if (!tooClose) {
            edgeGrid[gy * gridW + gx] = 1;
            scalePoints.push({ x: x, y: y });
          }
        }
      }
    }

    // 5. Fill flat/unstructured regions with sparse vertices
    for (let gy = 0; gy < scaleHeight; gy += flatGridSize) {
      for (let gx = 0; gx < scaleWidth; gx += flatGridSize) {
        // Verify if any contour points are already located in this cell
        let hasPoint = false;
        const endY = Math.min(gy + flatGridSize, scaleHeight);
        const endX = Math.min(gx + flatGridSize, scaleWidth);

        for (const p of scalePoints) {
          if (p.x >= gx && p.x < endX && p.y >= gy && p.y < endY) {
            hasPoint = true;
            break;
          }
        }

        if (!hasPoint) {
          // Add a slightly jittered center point inside the cell
          const cx = gx + flatGridSize / 2 + (Math.random() - 0.5) * (flatGridSize * 0.2);
          const cy = gy + flatGridSize / 2 + (Math.random() - 0.5) * (flatGridSize * 0.2);
          
          scalePoints.push({
            x: Math.max(2, Math.min(scaleWidth - 3, Math.round(cx))),
            y: Math.max(2, Math.min(scaleHeight - 3, Math.round(cy)))
          });
        }
      }
    }

    // 6. Scale points back up to the original size
    const points = [];
    const scaleX = originalWidth / scaleWidth;
    const scaleY = originalHeight / scaleHeight;

    for (const p of scalePoints) {
      points.push({
        x: Math.round(p.x * scaleX),
        y: Math.round(p.y * scaleY)
      });
    }

    // 7. Add canvas boundaries (corners and regularly spaced edge points)
    // Using a large boundary spacing to keep border polygons massive and clean
    points.push({ x: 0, y: 0 });
    points.push({ x: originalWidth - 1, y: 0 });
    points.push({ x: 0, y: originalHeight - 1 });
    points.push({ x: originalWidth - 1, y: originalHeight - 1 });

    const borderSpacing = 120; // High spacing for large border shapes
    for (let x = borderSpacing; x < originalWidth - 1; x += borderSpacing) {
      points.push({ x: x, y: 0 });
      points.push({ x: x, y: originalHeight - 1 });
    }
    for (let y = borderSpacing; y < originalHeight - 1; y += borderSpacing) {
      points.push({ x: 0, y: y });
      points.push({ x: originalWidth - 1, y: y });
    }

    // 8. De-duplicate coordinates and clamp boundaries
    const uniquePoints = [];
    const seen = new Set();
    for (const p of points) {
      const cx = Math.max(0, Math.min(originalWidth - 1, Math.round(p.x)));
      const cy = Math.max(0, Math.min(originalHeight - 1, Math.round(p.y)));
      const key = `${cx},${cy}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePoints.push({ x: cx, y: cy });
      }
    }

    return uniquePoints;
  }
};
