// js/app.js

// Global Application State
const App = {
  state: {
    originalImage: null,
    width: 0,
    height: 0,
    activePreset: 'flat-pixel',
    poly: 12,       // Block Size (12px)
    light: 0,       // 3D Shadow bevel intensity (0%)
    noise: 50       // Gamma/Brightness level (50%)
  },

  // DOM Elements
  elements: {},

  init: function() {
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
    el.outputImage = document.getElementById('output-image');
    el.canvasWrapper = document.getElementById('canvas-wrapper');
    el.loadingOverlay = document.getElementById('loading-overlay');
    el.screenDisplay = document.getElementById('screen-display');

    // Style Selector HUD Elements
    el.styleSelector = document.getElementById('style-selector');
    el.styleBtns = document.querySelectorAll('.btn-style');

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

    // Shutter Trigger acts as a Page Refresh
    el.shutterTrigger.addEventListener('click', () => {
      location.reload();
    });

    el.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Save image render
    el.downloadPng.addEventListener('click', () => this.downloadPNG());

    // Style Selector Button handlers
    el.styleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.activePreset = btn.getAttribute('data-style');
        this.processImage();
      });
    });

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

    // Detect mobile vs desktop.
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

    const isStandalone = window.navigator.standalone || 
                         window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    if (localStorage.getItem('pwa-dismissed')) {
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      el.pwaPromptText.innerHTML = "To run this camera full-screen, tap the Share icon 📤 and select 'Add to Home Screen'!";
      el.pwaInstallBtn.style.display = 'none';
      el.pwaPrompt.style.display = 'flex';
    } else {
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
    this.state.width = 0;
    this.state.height = 0;
    
    this.elements.dropZone.style.display = 'flex';
    this.elements.canvasWrapper.classList.add('hidden');
    this.elements.downloadPng.setAttribute('disabled', 'true');
    this.elements.ledReady.classList.remove('glowing');
    this.elements.styleSelector.style.display = 'none';
    if (this.elements.screenDisplay) {
      this.elements.screenDisplay.classList.remove('camera-active');
    }
    
    // Clear canvas
    const canvas = this.elements.outputCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear output image
    if (this.elements.outputImage) {
      this.elements.outputImage.src = '';
      this.elements.outputImage.style.display = 'none';
    }
  },

  // Image File Handling
  handleFileSelect: function(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.loadImageFromFile(e.target.files[0]);
    }
  },

  loadImageFromFile: async function(file) {
    let isHEIC = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic' || file.type === 'image/heif';

    // Verify format using binary signatures if HeicTo is loaded
    if (typeof HeicTo !== 'undefined' && typeof HeicTo.isHeic === 'function') {
      try {
        const check = await HeicTo.isHeic(file);
        if (check) isHEIC = true;
      } catch (e) {
        console.warn("HeicTo.isHeic header check skipped:", e);
      }
    }

    if (isHEIC && typeof HeicTo !== 'undefined') {
      this.showLoading(true);
      const loadingTextEl = document.querySelector('.loading-text');
      const originalText = loadingTextEl ? loadingTextEl.textContent : 'BUILDING PIXEL WORLD...';
      if (loadingTextEl) {
        loadingTextEl.textContent = 'CONVERTING HEIC PHOTO...';
      }

      HeicTo({
        blob: file,
        type: 'image/jpeg',
        quality: 0.85
      })
      .then((convertedBlob) => {
        if (loadingTextEl) {
          loadingTextEl.textContent = originalText;
        }
        const blobToLoad = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        this.loadImageBlob(blobToLoad);
      })
      .catch((err) => {
        this.showLoading(false);
        if (loadingTextEl) {
          loadingTextEl.textContent = originalText;
        }
        console.error("HEIC conversion failed:", err);
        alert('Failed to process HEIC file. Please try uploading a standard JPEG or PNG photo.');
      });
    } else {
      if (!file.type.match('image.*')) {
        alert('Please upload an image file.');
        return;
      }
      this.loadImageBlob(file);
    }
  },

  loadImageBlob: function(blob) {
    this.showLoading(true);

    if (this.state.imageUrl) {
      URL.revokeObjectURL(this.state.imageUrl);
    }

    const objectUrl = URL.createObjectURL(blob);
    this.state.imageUrl = objectUrl;

    const img = new Image();
    img.onload = () => {
      this.state.originalImage = img;
      this.elements.dropZone.style.display = 'none';
      if (this.elements.canvasWrapper) {
        this.elements.canvasWrapper.classList.remove('hidden');
        this.elements.canvasWrapper.style.display = 'flex';
      }
      this.elements.downloadPng.removeAttribute('disabled');
      this.elements.styleSelector.style.display = 'flex';
      
      // Turn on green "READY" status light
      this.elements.ledReady.classList.add('glowing');
      if (this.elements.screenDisplay) {
        this.elements.screenDisplay.classList.add('camera-active');
      }
      
      this.processImage();
    };
    img.onerror = (err) => {
      this.showLoading(false);
      console.error("Image load failed:", err);
      alert('Error loading image file. Please verify it is a valid JPEG, PNG, or WebP image.');
    };
    img.src = objectUrl;
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

    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
    }

    this.processTimeout = setTimeout(() => {
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

      const canvas = this.elements.outputCanvas;
      canvas.width = w;
      canvas.height = h;

      // Run block-art mapping with default flat pixel configurations
      Filters.apply6thGenPipeline(
        img, 
        canvas, 
        this.state.activePreset, 
        this.state.poly, 
        this.state.light, 
        this.state.noise
      );

      if (this.elements.outputImage) {
        this.elements.outputImage.src = canvas.toDataURL('image/png');
        this.elements.outputImage.style.display = 'block';
        if (this.state.activePreset === 'survival') {
          this.elements.outputImage.style.filter = 'contrast(1.15) saturate(1.05)';
        } else {
          this.elements.outputImage.style.filter = 'contrast(1.1) saturate(0.95)';
        }
      }

      this.showLoading(false);
    }, 45);
  },

  // Export & Download Capabilities
  downloadPNG: function() {
    const img = this.elements.outputImage;
    if (!img || !img.src) return;

    const link = document.createElement('a');
    link.download = `pixelart_${this.state.activePreset}_${Date.now()}.png`;
    link.href = img.src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
