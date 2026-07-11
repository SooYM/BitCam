// js/app.js

// Global Application State
const App = {
  state: {
    originalImage: null,
    points: [],
    triangles: [],
    
    // Baked Retro 3D Camera specifications
    settings: {
      detailLevel: 35,
      edgeWeight: 65,
      randomness: 25,
      
      renderMode: 'textured-retro', 
      lightingIntensity: 75,        
      texturePixelation: 5,         
      colorDepth: 16,               
      textureJitter: 1.5,           
      lineWidth: 0.0,               
      lineColorType: 'none',
      
      uiMode: 'direct' // Single direct viewport mode (no split slider)
    },

    // Dimensions of the current working canvases
    width: 0,
    height: 0
  },

  // DOM Elements
  elements: {},

  // Canvases
  sourceCanvas: null,
  sourceCtx: null,
  textureCanvas: null, // Holds pixelated texture sheet

  init: function() {
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
    
    this.cacheElements();
    this.bindEvents();
    this.initHUD();
  },

  cacheElements: function() {
    const el = this.elements;
    el.dropZone = document.getElementById('drop-zone');
    el.fileInput = document.getElementById('file-input');
    el.cameraInput = document.getElementById('camera-input');
    
    // Physical Camera Buttons
    el.uploadBtn = document.getElementById('upload-btn');
    el.cameraBtn = document.getElementById('camera-btn');
    el.shutterTrigger = document.getElementById('shutter-trigger');
    el.downloadPng = document.getElementById('download-png');
    el.resetBtn = document.getElementById('reset-btn');
    
    // Indicators
    el.ledReady = document.getElementById('led-ready');
    el.lcdTimestamp = document.getElementById('lcd-timestamp');
    
    el.outputCanvas = document.getElementById('output-canvas');
    el.canvasWrapper = document.getElementById('canvas-wrapper');
    el.loadingOverlay = document.getElementById('loading-overlay');
    el.screenDisplay = document.getElementById('screen-display');
  },

  bindEvents: function() {
    const el = this.elements;

    // File loading triggers
    el.uploadBtn.addEventListener('click', () => el.fileInput.click());
    el.shutterTrigger.addEventListener('click', () => {
      // If no image is loaded, shutter clicks to open file selector
      if (!this.state.originalImage) {
        el.fileInput.click();
      } else {
        // If image is loaded, shutter clicks to trigger saving the render!
        this.downloadPNG();
      }
    });

    el.cameraBtn.addEventListener('click', () => el.cameraInput.click());

    el.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    el.cameraInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    el.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropZone.classList.add('dragover');
    });
    el.dropZone.addEventListener('dragleave', () => el.dropZone.classList.remove('dragover'));
    el.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.loadImageFromFile(e.dataTransfer.files[0]);
      }
    });

    // Reset button (clears current image and returns to start screen)
    el.resetBtn.addEventListener('click', () => this.resetCamera());

    // Export button
    el.downloadPng.addEventListener('click', () => this.downloadPNG());
  },

  initHUD: function() {
    if (this.elements.lcdTimestamp) {
      this.elements.lcdTimestamp.textContent = this.getRetroDateString();
    }
  },

  getRetroDateString: function() {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const monthName = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    // Early 2000s cyber-camera date format
    return `${monthName}.${day}.2001`;
  },

  resetCamera: function() {
    this.state.originalImage = null;
    this.state.points = [];
    this.state.triangles = [];
    this.state.width = 0;
    this.state.height = 0;
    
    this.elements.dropZone.style.display = 'flex';
    this.elements.canvasWrapper.classList.add('hidden');
    this.elements.downloadPng.setAttribute('disabled', 'true');
    this.elements.ledReady.classList.remove('glowing');
    if (this.elements.screenDisplay) {
      this.elements.screenDisplay.classList.remove('camera-active');
    }
    
    // Clear canvas
    const canvas = this.elements.outputCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },

  // Image File Handling
  handleFileSelect: function(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.loadImageFromFile(e.target.files[0]);
    }
  },

  loadImageFromFile: function(file) {
    if (!file.type.match('image.*')) {
      alert('Please upload an image file.');
      return;
    }

    this.showLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.state.originalImage = img;
        this.elements.dropZone.style.display = 'none';
        this.elements.canvasWrapper.classList.remove('hidden');
        this.elements.downloadPng.removeAttribute('disabled');
        
        // Turn on green "READY" status light
        this.elements.ledReady.classList.add('glowing');
        if (this.elements.screenDisplay) {
          this.elements.screenDisplay.classList.add('camera-active');
        }
        
        this.processImage();
      };
      img.onerror = () => {
        this.showLoading(false);
        alert('Error loading image file.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  loadDefaultImage: function() {
    this.resetCamera();
  },

  showLoading: function(show) {
    if (show) {
      this.elements.loadingOverlay.classList.remove('hidden');
    } else {
      this.elements.loadingOverlay.classList.add('hidden');
    }
  },

  // Processing Engine
  processImage: function() {
    const img = this.state.originalImage;
    if (!img) return;

    this.showLoading(true);

    setTimeout(() => {
      // Optimal texture processing resolution (emulates low console frame buffers)
      const maxDimension = 900;
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > maxDimension || h > maxDimension) {
        if (w > h) {
          h = Math.round((h * maxDimension) / w);
          w = maxDimension;
        } else {
          w = Math.round((w * maxDimension) / h);
          h = maxDimension;
        }
      }

      this.state.width = w;
      this.state.height = h;

      // 1. Prepare Offscreen Canvas
      this.sourceCanvas.width = w;
      this.sourceCanvas.height = h;
      this.sourceCtx.drawImage(img, 0, 0, w, h);

      // 2. Match display canvas dimensions
      const canvas = this.elements.outputCanvas;
      canvas.width = w;
      canvas.height = h;

      // 3. Extract silhouette edge-aligned points
      const imgData = this.sourceCtx.getImageData(0, 0, w, h);
      this.state.points = Sobel.extractPoints(imgData);

      // 4. Generate Triangles
      this.state.triangles = Delaunay.triangulate(this.state.points);

      // 5. Draw everything
      this.renderTrianglesOnly();
      this.showLoading(false);
    }, 25);
  },

  /**
   * Precompute a downscaled pixelated texture canvas to map onto the triangles.
   */
  prepareTextureCanvas: function() {
    if (!this.textureCanvas) {
      this.textureCanvas = document.createElement('canvas');
    }
    
    const w = this.state.width;
    const h = this.state.height;
    this.textureCanvas.width = w;
    this.textureCanvas.height = h;
    const texCtx = this.textureCanvas.getContext('2d');

    // Disable image smoothing for pixelation (classic retro low-resolution texture look)
    texCtx.imageSmoothingEnabled = false;
    texCtx.msImageSmoothingEnabled = false;
    texCtx.webkitImageSmoothingEnabled = false;

    const pixFactor = this.state.settings.texturePixelation;

    // Downscale texture
    const scale = 1 / pixFactor;
    const pw = Math.max(1, Math.round(w * scale));
    const ph = Math.max(1, Math.round(h * scale));

    const dCanvas = document.createElement('canvas');
    dCanvas.width = pw;
    dCanvas.height = ph;
    dCanvas.getContext('2d').drawImage(this.state.originalImage, 0, 0, pw, ph);

    // Stretch back up to scale, forcing hardware nearest-neighbor pixelation
    texCtx.drawImage(dCanvas, 0, 0, pw, ph, 0, 0, w, h);
  },

  /**
   * Calculates Lambertian diffuse shading multiplier for the triangle based on its normal.
   */
  getLightingFactor: function(p1, p2, p3, pixels, w, h, intensity) {
    const getLum = (p) => {
      const cx = Math.max(0, Math.min(w - 1, Math.round(p.x)));
      const cy = Math.max(0, Math.min(h - 1, Math.round(p.y)));
      const idx = (cy * w + cx) * 4;
      return 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    };

    const l1 = getLum(p1);
    const l2 = getLum(p2);
    const l3 = getLum(p3);

    // Height scale: map luminance (0-255) to Z coordinate depth
    const zScale = 0.35;
    const z1 = l1 * zScale;
    const z2 = l2 * zScale;
    const z3 = l3 * zScale;

    // Vectors in plane of triangle
    const ux = p2.x - p1.x;
    const buy = p2.y - p1.y;
    const uz = z2 - z1;

    const vx = p3.x - p1.x;
    const vy = p3.y - p1.y;
    const vz = z3 - z1;

    // Normal vector cross product
    let nx = buy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - buy * vx;

    // Normalize
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 0.0001) return 1.0;
    nx /= len;
    ny /= len;
    nz /= len;

    // Directional light source from top-left (e.g. source vector: -0.485, -0.485, 0.728)
    const lx = -0.485;
    const ly = -0.485;
    const lz = 0.728;

    const dot = nx * lx + ny * ly + nz * lz;

    const factor = 1.0 + dot * (intensity / 100) * 0.55;
    return Math.min(1.5, Math.max(0.45, factor));
  },

  // Draw current triangulation model to output canvas
  renderTrianglesOnly: function() {
    const canvas = this.elements.outputCanvas;
    const ctx = canvas.getContext('2d');
    const w = this.state.width;
    const h = this.state.height;
    
    if (this.state.triangles.length === 0) return;

    this.prepareTextureCanvas();

    // Clear Canvas
    ctx.clearRect(0, 0, w, h);

    // Read pixel data from source image
    const sourceImgData = this.sourceCtx.getImageData(0, 0, w, h);
    const pixels = sourceImgData.data;

    const lightingIntensity = this.state.settings.lightingIntensity;
    const jitter = this.state.settings.textureJitter;

    // Render triangles loop
    for (const t of this.state.triangles) {
      const p1 = t.p1;
      const p2 = t.p2;
      const p3 = t.p3;

      // 1. Calculate pseudo-3D lighting shading factor
      const lightingFactor = this.getLightingFactor(p1, p2, p3, pixels, w, h, lightingIntensity);

      // 2. Texture mapping: clip drawing region to triangle boundary
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.clip();

      // Jitter mapping coordinates to simulate classic wobbly affine texture warping
      let jx = 0, jy = 0;
      if (jitter > 0) {
        jx = (Math.random() - 0.5) * jitter;
        jy = (Math.random() - 0.5) * jitter;
      }

      ctx.drawImage(this.textureCanvas, jx, jy);
      ctx.restore();

      // 3. Apply pseudo-3D lighting shading overlay (highlights/shadows) over the texture
      if (lightingIntensity > 0 && lightingFactor !== 1.0) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        
        if (lightingFactor < 1) {
          // Shadow overlay (ambient occlusion)
          const opacity = Math.min(0.72, (1 - lightingFactor) * (lightingIntensity / 100) * 1.15);
          ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
          ctx.fill();
        } else {
          // Highlight overlay
          const opacity = Math.min(0.6, (lightingFactor - 1) * (lightingIntensity / 100) * 0.95);
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.fill();
        }
      }
    }

    // Apply post process PS2 TV filters (scanlines, grain, volumetric fog, color depth)
    Filters.applyPS2Pipeline(ctx, w, h);
  },

  // Export & Download Capabilities
  downloadPNG: function() {
    if (!this.state.originalImage) return;

    const link = document.createElement('a');
    link.download = `vicepoly_render_${Date.now()}.png`;
    link.href = this.elements.outputCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
