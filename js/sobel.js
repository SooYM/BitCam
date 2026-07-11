// js/sobel.js

/**
 * Silhouette-Aligned Edge Detection and Feature Point Extractor Module
 * Optimized for PS2 3D mesh aesthetics.
 */
const Sobel = {
  /**
   * Extract key feature points from an ImageData object, aligning them tightly to major object
   * contours to prevent triangles from webbing/bridging across foreground boundaries.
   * Uses an O(1) spatial hashing grid to ensure fast grid-based proximity.
   * @param {ImageData} imageData - The canvas image data.
   * @returns {Array<{x: number, y: number}>} Array of unique key points.
   */
  extractPoints: function(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // 1. Convert image to grayscale (Luminance formula)
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 2. Compute Sobel gradient magnitudes
    const magnitudes = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Horizontal gradient kernel
        const hVal = 
          -1 * gray[(y - 1) * width + (x - 1)] + 1 * gray[(y - 1) * width + (x + 1)] +
          -2 * gray[(y) * width + (x - 1)]     + 2 * gray[(y) * width + (x + 1)] +
          -1 * gray[(y + 1) * width + (x - 1)] + 1 * gray[(y + 1) * width + (x + 1)];

        // Vertical gradient kernel
        const vVal = 
          -1 * gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + (x)] - 1 * gray[(y - 1) * width + (x + 1)] +
           1 * gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + (x)] + 1 * gray[(y + 1) * width + (x + 1)];

        magnitudes[idx] = Math.sqrt(hVal * hVal + vVal * vVal);
      }
    }

    const points = [];

    // Spacing constraints:
    // - Along object contours, place vertices every 10 pixels for sharp low-poly 3D shapes.
    // - In flat regions (sky, uniform walls), place vertices sparsely (every 50 pixels) to save poly count.
    const edgeSpacing = 10;
    const flatGridSize = 50;
    const silhouetteThreshold = 38; // Detects strong silhouettes

    // Initialize spatial grid for O(1) distance lookups to prevent coordinates from clustering
    const gridW = Math.ceil(width / edgeSpacing);
    const gridH = Math.ceil(height / edgeSpacing);
    const edgeGrid = new Uint8Array(gridW * gridH); // 0 = empty, 1 = occupied

    // 3. Scan for contours and place points along outlines with 10px spacing
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = y * width + x;
        
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
            points.push({ x: x, y: y });
          }
        }
      }
    }

    // 4. Fill flat/unstructured regions with sparse vertices (45px spacing)
    // Avoids giant empty regions while keeping polygon count low
    for (let gy = 0; gy < height; gy += flatGridSize) {
      for (let gx = 0; gx < width; gx += flatGridSize) {
        // Verify if any contour points are already located in this cell
        let hasPoint = false;
        const endY = Math.min(gy + flatGridSize, height);
        const endX = Math.min(gx + flatGridSize, width);

        for (const p of points) {
          if (p.x >= gx && p.x < endX && p.y >= gy && p.y < endY) {
            hasPoint = true;
            break;
          }
        }

        if (!hasPoint) {
          // Add a jittered center point inside the cell
          const cx = gx + flatGridSize / 2 + (Math.random() - 0.5) * (flatGridSize * 0.25);
          const cy = gy + flatGridSize / 2 + (Math.random() - 0.5) * (flatGridSize * 0.25);
          
          points.push({
            x: Math.max(2, Math.min(width - 3, Math.round(cx))),
            y: Math.max(2, Math.min(height - 3, Math.round(cy)))
          });
        }
      }
    }

    // 5. Add canvas boundaries (corners and regularly spaced edge points)
    // This locks the outer boundary of the canvas to prevent clipping holes
    points.push({ x: 0, y: 0 });
    points.push({ x: width - 1, y: 0 });
    points.push({ x: 0, y: height - 1 });
    points.push({ x: width - 1, y: height - 1 });

    const borderSpacing = 20;
    for (let x = borderSpacing; x < width - 1; x += borderSpacing) {
      points.push({ x: x, y: 0 });
      points.push({ x: x, y: height - 1 });
    }
    for (let y = borderSpacing; y < height - 1; y += borderSpacing) {
      points.push({ x: 0, y: y });
      points.push({ x: width - 1, y: y });
    }

    // 6. De-duplicate coordinates and clamp boundaries
    const uniquePoints = [];
    const seen = new Set();
    for (const p of points) {
      const cx = Math.max(0, Math.min(width - 1, Math.round(p.x)));
      const cy = Math.max(0, Math.min(height - 1, Math.round(p.y)));
      const key = `${cx},${cy}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePoints.push({ x: cx, y: cy });
      }
    }

    return uniquePoints;
  }
};
