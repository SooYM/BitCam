// js/app.js

// Global Application State
const App = {
  state: {
    originalImage: null,
    width: 0,
    height: 0
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
      // Determine optimal display proportions matching the viewport constraints
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

      // Set display canvas size
      const canvas = this.elements.outputCanvas;
      canvas.width = w;
      canvas.height = h;

      // Run the 6th-Gen Console emulation pipeline
      Filters.apply6thGenPipeline(img, canvas);

      // Export canvas buffer as real image to allow native touch-and-hold saves
      if (this.elements.outputImage) {
        this.elements.outputImage.src = canvas.toDataURL('image/png');
        this.elements.outputImage.style.display = 'block';
      }

      this.showLoading(false);
    }, 25);
  },

  // Export & Download Capabilities
  downloadPNG: function() {
    const img = this.elements.outputImage;
    if (!img || !img.src) return;

    const link = document.createElement('a');
    link.download = `vicepoly_render_${Date.now()}.png`;
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
