// js/filters.js

/**
 * Voxel Block Art Voxelizer Module
 * Transforms any standard 2D photograph into a mosaic of textured voxel blocks.
 */
const Filters = {
  blockTextures: {},
  initialized: false,

  // Reference average colors for closest-match Euclidean distance checks
  blockColors: {
    'grass':     { r: 74,  g: 143, b: 40  },
    'leaves':    { r: 46,  g: 91,  b: 30  },
    'water':     { r: 63,  g: 118, b: 228 },
    'stone':     { r: 115, g: 115, b: 115 },
    'sand':      { r: 219, g: 207, b: 156 },
    'dirt':      { r: 134, g: 96,  b: 67  },
    'wood':      { r: 171, g: 125, b: 73  },
    'obsidian':  { r: 35,  g: 25,  b: 50  },
    'gold':      { r: 253, g: 240, b: 102 },
    'redstone':  { r: 194, g: 26,  b: 26  },
    'iron':      { r: 213, g: 213, b: 213 },
    'brick':     { r: 171, g: 93,  b: 73  }
  },

  /**
   * Quantizes RGB values to 3-3-2 bit (8-bit) color depth (256 colors total).
   */
  apply8BitQuantization: function(r, g, b) {
    const red = Math.round(((r >> 5) * 255) / 7);
    const green = Math.round(((g >> 5) * 255) / 7);
    const blue = Math.round(((b >> 6) * 255) / 3);
    return { r: red, g: green, b: blue };
  },

  /**
   * Quantizes RGB values to 5-6-5 bit (16-bit) High Color depth (65536 colors total).
   */
  apply16BitQuantization: function(r, g, b) {
    const red = Math.round(((r >> 3) * 255) / 31);
    const green = Math.round(((g >> 2) * 255) / 63);
    const blue = Math.round(((b >> 3) * 255) / 31);
    return { r: red, g: green, b: blue };
  },

  /**
   * Procedurally generates authentic 16x16 pixel texture sheets for voxel blocks.
   * This runs once on load to populate the texture dictionary with zero network overhead.
   */
  initTextures: function() {
    if (this.initialized) return;

    // Helper to generate a noisy variation of a hex base color
    const randJitter = (hex, jitter) => {
      const r = parseInt(hex.slice(1, 3), 16) + (Math.random() - 0.5) * jitter;
      const g = parseInt(hex.slice(3, 5), 16) + (Math.random() - 0.5) * jitter;
      const b = parseInt(hex.slice(5, 7), 16) + (Math.random() - 0.5) * jitter;
      const finalR = Math.min(255, Math.max(0, Math.round(r)));
      const finalG = Math.min(255, Math.max(0, Math.round(g)));
      const finalB = Math.min(255, Math.max(0, Math.round(b)));
      return `rgb(${finalR}, ${finalG}, ${finalB})`;
    };

    const makeNoiseTexture = (baseHex, jitter) => {
      const tex = [];
      for (let i = 0; i < 256; i++) {
        tex.push(randJitter(baseHex, jitter));
      }
      return tex;
    };

    // Stone: gray with noise
    this.blockTextures['stone'] = makeNoiseTexture('#737373', 25);

    // Dirt: brown with noise
    this.blockTextures['dirt'] = makeNoiseTexture('#866043', 20);

    // Grass: green top, dirt bottom
    const grass = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (y < 4 || (y === 4 && Math.random() > 0.4) || (y === 5 && Math.random() > 0.85)) {
          grass.push(randJitter('#4a8f28', 20)); // Grass green
        } else {
          grass.push(randJitter('#866043', 15)); // Dirt brown
        }
      }
    }
    this.blockTextures['grass'] = grass;

    // Leaves: dark green leaf gaps
    const leaves = [];
    for (let i = 0; i < 256; i++) {
      leaves.push(Math.random() > 0.25 ? randJitter('#2e5b1e', 15) : randJitter('#1c3b12', 10));
    }
    this.blockTextures['leaves'] = leaves;

    // Water: blue waves
    const water = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const wave = (x + y) % 6 < 2;
        water.push(wave ? randJitter('#5c84ff', 15) : randJitter('#3f76e4', 15));
      }
    }
    this.blockTextures['water'] = water;

    // Sand: beige sand granules
    this.blockTextures['sand'] = makeNoiseTexture('#dbcf9c', 16);

    // Wood: horizontal rings
    const wood = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const ring = y === 2 || y === 6 || y === 10 || y === 14;
        wood.push(ring ? randJitter('#775128', 10) : randJitter('#ab7d49', 15));
      }
    }
    this.blockTextures['wood'] = wood;

    // Obsidian: black/purple volcanic
    const obsidian = [];
    for (let i = 0; i < 256; i++) {
      obsidian.push(Math.random() > 0.15 ? randJitter('#161122', 12) : randJitter('#3d1e5c', 20));
    }
    this.blockTextures['obsidian'] = obsidian;

    // Gold Block: shiny gold tiles
    const gold = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const border = x === 0 || y === 0 || x === 15 || y === 15;
        gold.push(border ? randJitter('#c69b2b', 10) : randJitter('#fdf066', 15));
      }
    }
    this.blockTextures['gold'] = gold;

    // Redstone Block: red glow dust
    const redstone = [];
    for (let i = 0; i < 256; i++) {
      redstone.push(Math.random() > 0.2 ? randJitter('#a21616', 20) : randJitter('#f74646', 30));
    }
    this.blockTextures['redstone'] = redstone;

    // Iron Block: industrial plate
    const iron = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const border = x === 0 || y === 0 || x === 15 || y === 15 || x === y || x === (15 - y);
        iron.push(border ? randJitter('#b0b0b0', 10) : randJitter('#e1e1e1', 12));
      }
    }
    this.blockTextures['iron'] = iron;

    // Brick: red terracotta tiles
    const brick = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const mortar = y === 0 || y === 5 || y === 10 || y === 15 || 
                      ((y > 0 && y < 5) && x === 7) ||
                      ((y > 5 && y < 10) && x === 15) ||
                      ((y > 10 && y < 15) && x === 7);
        brick.push(mortar ? randJitter('#d6c5bc', 10) : randJitter('#ab5d49', 15));
      }
    }
    this.blockTextures['brick'] = brick;

    this.initialized = true;
  },

  /**
   * Main Block Art Voxelization Pipeline
   * Converts a 2D photo into a grid of 3D-bevelled voxel textured blocks.
   * @param {HTMLImageElement} img - The source image.
   * @param {HTMLCanvasElement} destCanvas - The display canvas to render onto.
   * @param {string} preset - Selected biome ('survival', 'nether', 'creative', 'flat-pixel').
   * @param {number} blockSize - The size of each block cell on canvas (8px to 36px).
   * @param {number} shadowIntensity - Bevel 3D shading intensity (0 to 100).
   * @param {number} gamma - Gamma/brightness multiplier (10 to 100).
   */
  apply6thGenPipeline: function(img, destCanvas, preset, blockSize, shadowIntensity, gamma) {
    // 1. Ensure procedural texture data is compiled
    this.initTextures();
    
    const destCtx = destCanvas.getContext('2d');
    const displayW = destCanvas.width;
    const displayH = destCanvas.height;

    // 2. Draw original image onto offscreen canvas to sample average cell colors
    const offscreen = document.createElement('canvas');
    offscreen.width = displayW;
    offscreen.height = displayH;
    const offscreenCtx = offscreen.getContext('2d');
    offscreenCtx.drawImage(img, 0, 0, displayW, displayH);

    const imgData = offscreenCtx.getImageData(0, 0, displayW, displayH);
    const pixels = imgData.data;

    // Clear destination canvas
    destCtx.fillStyle = '#0f0f12';
    destCtx.fillRect(0, 0, displayW, displayH);

    // 3. Set allowed block palette based on Biome Preset
    let activePalette = Object.keys(this.blockColors);
    if (preset === 'survival') {
      activePalette = ['grass', 'leaves', 'water', 'stone', 'sand', 'dirt', 'wood', 'obsidian'];
    } else if (preset === 'nether') {
      activePalette = ['obsidian', 'redstone', 'brick', 'dirt', 'stone'];
    } else if (preset === 'creative') {
      activePalette = ['iron', 'gold', 'water', 'obsidian', 'stone', 'brick'];
    }

    const gammaFactor = gamma / 50; // 50% is neutral 1.0

    // 4. Voxel Grid rendering loop
    for (let y = 0; y < displayH; y += blockSize) {
      for (let x = 0; x < displayW; x += blockSize) {
        const cellW = Math.min(blockSize, displayW - x);
        const cellH = Math.min(blockSize, displayH - y);

        // A. Extract average color of image pixels inside this cell bounds
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let py = 0; py < cellH; py++) {
          for (let px = 0; px < cellW; px++) {
            const idx = ((y + py) * displayW + (x + px)) * 4;
            sumR += pixels[idx];
            sumG += pixels[idx + 1];
            sumB += pixels[idx + 2];
            count++;
          }
        }
        
        let avgR = Math.round(sumR / count);
        let avgG = Math.round(sumG / count);
        let avgB = Math.round(sumB / count);

        // Apply gamma lighting adjustment
        avgR = Math.min(255, Math.max(0, Math.round(avgR * gammaFactor)));
        avgG = Math.min(255, Math.max(0, Math.round(avgG * gammaFactor)));
        avgB = Math.min(255, Math.max(0, Math.round(avgB * gammaFactor)));

        if (preset === 'flat-pixel') {
          // FLAT PIXEL: 16-bit High Color quantized pixel block
          const qColor = this.apply16BitQuantization(avgR, avgG, avgB);
          destCtx.fillStyle = `rgb(${qColor.r}, ${qColor.g}, ${qColor.b})`;
          destCtx.fillRect(x, y, cellW, cellH);
        } else {
          // VOXEL BLOCKS: Find closest block by Euclidean distance in color space
          let closestType = activePalette[0];
          let minDist = Infinity;
          
          for (const type of activePalette) {
            const bc = this.blockColors[type];
            const dist = 
              (avgR - bc.r) * (avgR - bc.r) +
              (avgG - bc.g) * (avgG - bc.g) +
              (avgB - bc.b) * (avgB - bc.b);
              
            if (dist < minDist) {
              minDist = dist;
              closestType = type;
            }
          }

          // B. Draw procedural 16x16 block texture scaled into the cell
          const tex = this.blockTextures[closestType];
          const subSize = cellW / 16;
          
          for (let py = 0; py < 16; py++) {
            for (let px = 0; px < 16; px++) {
              const texColorStr = tex[py * 16 + px];
              
              // Extract sub-pixel RGB, apply brightness/gamma adjustment
              const rgbVals = texColorStr.match(/\d+/g).map(Number);
              let subR = Math.min(255, Math.max(0, Math.round(rgbVals[0] * gammaFactor)));
              let subG = Math.min(255, Math.max(0, Math.round(rgbVals[1] * gammaFactor)));
              let subB = Math.min(255, Math.max(0, Math.round(rgbVals[2] * gammaFactor)));
              
              // Apply 8-bit RGB color quantization for Survival Mode
              if (preset === 'survival') {
                const qColor = this.apply8BitQuantization(subR, subG, subB);
                subR = qColor.r;
                subG = qColor.g;
                subB = qColor.b;
              }
              
              destCtx.fillStyle = `rgb(${subR}, ${subG}, ${subB})`;
              destCtx.fillRect(
                x + px * subSize, 
                y + py * subSize, 
                Math.ceil(subSize), 
                Math.ceil(subSize)
              );
            }
          }
        }

        // C. Draw 3D Voxel block bevel borders
        if (shadowIntensity > 0) {
          const borderThickness = Math.max(1, cellW / 16);
          const shadowAlpha = shadowIntensity / 100;
          
          // Top & Left raised light bevel
          destCtx.fillStyle = `rgba(255, 255, 255, ${shadowAlpha * 0.18})`;
          destCtx.fillRect(x, y, cellW, borderThickness);
          destCtx.fillRect(x, y, borderThickness, cellH);

          // Bottom & Right drop shadow bevel
          destCtx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha * 0.32})`;
          destCtx.fillRect(x, y + cellH - borderThickness, cellW, borderThickness);
          destCtx.fillRect(x + cellW - borderThickness, y, borderThickness, cellH);
        }
      }
    }
    
    console.log("[CraftCam Engine] Voxel pixel blocks rendering complete.");
  }
};
