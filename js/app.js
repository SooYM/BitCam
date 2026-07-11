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
    this.initPwaPrompt();
  },

  cacheElements: function() {
    const el = this.elements;
    el.dropZone = document.getElementById('drop-zone');
    el.fileInput = document.getElementById('file-input');
    
    // 3-button physical controls
    el.uploadBtn = document.getElementById('upload-btn');
    el.shutterTrigger = document.getElementById('shutter-trigger');
    el.downloadPng = document.getElementById('download-png');
    
    // Indicators
    el.ledReady = document.getElementById('led-ready');
    
    el.outputCanvas = document.getElementById('output-canvas');
    el.canvasWrapper = document.getElementById('canvas-wrapper');
    el.loadingOverlay = document.getElementById('loading-overlay');
    el.screenDisplay = document.getElementById('screen-display');

    // PWA elements
    el.pwaPrompt = document.getElementById('pwa-prompt');
    el.pwaPromptText = document.getElementById('pwa-prompt-text');
    el.pwaInstallBtn = document.getElementById('pwa-install-btn');
    el.pwaCloseBtn = document.getElementById('pwa-close-btn');
    el.desktopPrompt = document.getElementById('desktop-prompt');
    el.desktopCloseBtn = document.getElementById('desktop-close-btn');
  },

  bindEvents: function() {
    const el = this.elements;

    // Load file stream
    el.uploadBtn.addEventListener('click', () => el.fileInput.click());

    // Shutter Trigger acts as a Page Refresh (as requested)
    el.shutterTrigger.addEventListener('click', () => {
      location.reload();
    });

    el.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Save image render
    el.downloadPng.addEventListener('click', () => this.downloadPNG());

    // PWA close handler
    if (el.pwaCloseBtn) {
      el.pwaCloseBtn.addEventListener('click', () => {
        el.pwaPrompt.style.display = 'none';
        localStorage.setItem('pwa-dismissed', 'true');
      });
    }

    // Desktop close handler
    if (el.desktopCloseBtn) {
      el.desktopCloseBtn.addEventListener('click', () => {
        el.desktopPrompt.style.display = 'none';
      });
    }
  },

  initHUD: function() {
    const casingDate = document.getElementById('casing-date');
    if (casingDate) {
      casingDate.textContent = this.getRetroDateString();
    }
  },

  /**
   * Initializes the PWA Install Prompt Banner overlay inside the LCD screen.
   * Auto-detects standalone mode, checks browser type (iOS Safari vs. Android Chrome),
   * and handles local storage dismissal to avoid intrusive popups.
   */
  initPwaPrompt: function() {
    const el = this.elements;
    if (!el.pwaPrompt) return;

    // 0. Detect mobile vs desktop. Touch support check makes sure mobile devices are never false-negatived.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);

    if (!isMobile) {
      if (el.desktopPrompt) {
        el.desktopPrompt.style.display = 'flex';
      }
      return;
    }

    // 1. Verify display mode: if running full-screen, do not show PWA installation warnings
    const isStandalone = window.navigator.standalone || 
                         window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // 2. Check if user already dismissed this alert previously
    if (localStorage.getItem('pwa-dismissed')) {
      return;
    }

    // 3. Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // iOS cannot trigger installation programmatically. Show Safari Share instructions
      el.pwaPromptText.innerHTML = "To run this camera full-screen, tap the Share icon 📤 and select 'Add to Home Screen'!";
      el.pwaInstallBtn.style.display = 'none';
      el.pwaPrompt.style.display = 'flex';
    } else {
      // Android / Desktop Chrome - capture beforeinstallprompt
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!localStorage.getItem('pwa-dismissed')) {
          el.pwaPromptText.textContent = "Install VicePoly on your home screen for full-screen camera mode!";
          el.pwaInstallBtn.style.display = 'block';
          el.pwaPrompt.style.display = 'flex';
        }
      });

      el.pwaInstallBtn.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('PWA installation accepted by user.');
            }
            deferredPrompt = null;
            el.pwaPrompt.style.display = 'none';
          });
        }
      });
    }
  },

  getRetroDateString: function() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2); // Last 2 digits of current year
    return `${day}.${month}.${year}`;
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
