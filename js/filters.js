// js/filters.js

/**
 * Region-Segmented 3D Flat-Shaded Vector Mesh Rendering Module
 * Maps out the outlines of individual objects and triangulates them independently
 * to enforce clean, hard outlines, flat diffuse textures, and zero boundary webbing.
 */
const Filters = {
  /**
   * Main Triangulation & Shading Pipeline
   * Converts a 2D photo into a flat-shaded 3D-mesh style vector art render.
   * @param {HTMLImageElement} img - The source image.
   * @param {HTMLCanvasElement} destCanvas - The display canvas to render onto.
   */
  apply6thGenPipeline: function(img, destCanvas) {
    console.log("[VicePoly Engine] Starting flat-shaded 3D mesh rendering...");
    
    const destCtx = destCanvas.getContext('2d');
    const displayW = destCanvas.width;
    const displayH = destCanvas.height;

    // 1. Draw original image onto offscreen canvas to extract colors and edge points
    const offscreen = document.createElement('canvas');
    offscreen.width = displayW;
    offscreen.height = displayH;
    const offscreenCtx = offscreen.getContext('2d');
    offscreenCtx.drawImage(img, 0, 0, displayW, displayH);

    const imgData = offscreenCtx.getImageData(0, 0, displayW, displayH);
    const pixels = imgData.data;

    // 2. Segment the image into connected-component color regions (objects)
    const regions = Sobel.extractPoints(imgData);
    console.log(`[VicePoly Engine] Segmented scene into ${regions.length} object shapes.`);

    // 3. Clear destination canvas and pre-fill with background color
    destCtx.fillStyle = '#1e1e24';
    destCtx.fillRect(0, 0, displayW, displayH);

    // Helper to get luminance (for pseudo-3D height map depth Z)
    const getLum = (p) => {
      const cx = Math.max(0, Math.min(displayW - 1, Math.round(p.x)));
      const cy = Math.max(0, Math.min(displayH - 1, Math.round(p.y)));
      const idx = (cy * displayW + cx) * 4;
      return 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    };

    /**
     * Applies Vice City / Y2K warm post-processing color grading:
     * - Contrast +10%
     * - Saturation -20%
     * - Warm highlights, Cool shadows
     */
    const applyY2KColorGrading = (r, g, b) => {
      // A. Contrast adjustment (+10%)
      let red = (r - 128) * 1.1 + 128;
      let green = (g - 128) * 1.1 + 128;
      let blue = (b - 128) * 1.1 + 128;

      // B. Saturation adjustment (-20%)
      const y = 0.299 * red + 0.587 * green + 0.114 * blue;
      let u = (-0.168736 * red - 0.331264 * green + 0.5 * blue) * 0.8;
      let v = (0.5 * red - 0.418688 * green - 0.081312 * blue) * 0.8;

      // C. Warm Highlights & Cool Shadows
      const highlightThresh = 175;
      const shadowThresh = 80;

      if (y > highlightThresh) {
        const intensity = ((y - highlightThresh) / (255 - highlightThresh)) * 14;
        red += intensity;
        green += intensity * 0.4;
        blue -= intensity * 0.3;
      } else if (y < shadowThresh) {
        const intensity = ((shadowThresh - y) / shadowThresh) * 10;
        blue += intensity;
        green += intensity * 0.2;
        red -= intensity * 0.4;
      }

      // Convert back to RGB
      red = y + 1.402 * v;
      green = y - 0.344136 * u - 0.714136 * v;
      blue = y + 1.772 * u;

      return {
        r: Math.min(255, Math.max(0, Math.round(red))),
        g: Math.min(255, Math.max(0, Math.round(green))),
        b: Math.min(255, Math.max(0, Math.round(blue)))
      };
    };

    // Directional light vector from top-left
    const lx = -0.485;
    const ly = -0.485;
    const lz = 0.728;
    const zScale = 0.52; // Height map scale

    // 4. Render each segmented object independently
    for (const reg of regions) {
      if (reg.vertices.length < 3) continue;

      // Triangulate boundary vertices of the region
      const triangles = Delaunay.triangulate(reg.vertices);
      const graded = applyY2KColorGrading(reg.color.r, reg.color.g, reg.color.b);

      for (const t of triangles) {
        // A. Calculate high-res centroid
        const cx1 = (t.p1.x + t.p2.x + t.p3.x) / 3;
        const cy1 = (t.p1.y + t.p2.y + t.p3.y) / 3;

        // B. Map centroid back to low-res coordinates to check region inclusion
        const lowResX = Math.round(cx1 / reg.scaleX);
        const lowResY = Math.round(cy1 / reg.scaleY);

        // BOUNDARY CLIP: Discard triangles whose centroid lies outside the region (handles concave shapes)
        if (!reg.regionSet.has(`${lowResX},${lowResY}`)) {
          continue;
        }

        // C. Calculate pseudo-3D normals and Lambertian shading
        const l1 = getLum(t.p1);
        const l2 = getLum(t.p2);
        const l3 = getLum(t.p3);

        const z1 = l1 * zScale;
        const z2 = l2 * zScale;
        const z3 = l3 * zScale;

        // Plane vectors
        const ux = t.p2.x - t.p1.x;
        const buy = t.p2.y - t.p1.y;
        const uz = z2 - z1;

        const vx = t.p3.x - t.p1.x;
        const vy = t.p3.y - t.p1.y;
        const vz = z3 - z1;

        // Plane normal cross product
        let nx = buy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - buy * vx;

        let factor = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0.0001) {
          nx /= len;
          ny /= len;
          nz /= len;

          const dot = nx * lx + ny * ly + nz * lz;
          factor = 1.0 + dot * 0.55;
          factor = Math.min(1.45, Math.max(0.55, factor));

          // Baked AO shadow under wheels, chassis, etc.
          if (ny < -0.22) {
            factor *= 0.72;
          }
        }

        const finalR = Math.min(255, Math.max(0, Math.round(graded.r * factor)));
        const finalG = Math.min(255, Math.max(0, Math.round(graded.g * factor)));
        const finalB = Math.min(255, Math.max(0, Math.round(graded.b * factor)));

        // D. Render solid filled polygon
        destCtx.beginPath();
        destCtx.moveTo(t.p1.x, t.p1.y);
        destCtx.lineTo(t.p2.x, t.p2.y);
        destCtx.lineTo(t.p3.x, t.p3.y);
        destCtx.closePath();

        destCtx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
        destCtx.fill();

        // Stroke boundaries with matching color to completely eliminate sub-pixel gaps (seams)
        destCtx.strokeStyle = destCtx.fillStyle;
        destCtx.lineWidth = 0.8;
        destCtx.stroke();
      }
    }
    
    console.log("[VicePoly Engine] Flat-shaded 3D mesh rendering complete.");
  }
};
