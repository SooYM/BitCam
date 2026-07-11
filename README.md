# VicePoly 📸
> **A Skeuomorphic 2000s Cyber-Camera & Retro 3D Graphics Generator**

VicePoly is a zero-configuration, single-page web application that converts photos into the classic 3D graphics style of early 2000s consoles (reminiscent of low-poly rendering from the PlayStation 1 and PlayStation 2 era).

*Inspired by the iconic, low-poly, warm-sunset 3D graphics style of GTA Vice City.*

The entire application runs **100% in the frontend** using HTML5 Canvas, Vanilla CSS, and JavaScript. It is heavily optimized for mobile devices and ready to deploy directly to GitHub Pages.

---

## 🎨 2000s Skeuomorphic UI Design
Rather than a modern flat interface, the app is styled as an interactive physical cyber-camera gadget:
- **Device Casing**: Styled with brushed-metal chassis gradients, inner beveled highlights, and a translucent atomic-cyan grip strip.
- **Glossy Shutter Button**: A large red gel shutter trigger (reminiscent of the Aqua interface of early Mac OS X or Winamp player skins). Clicking the shutter takes a photo or loads an image, and saves the final render once loaded.
- **Physical Utility Keys**: 3D beveled metallic buttons for **LOAD**, **CAM**, **SAVE**, and **RESET** that displace vertically when clicked.
- **Glowing LED Indicators**: Tactile lights indicating device power and calculation state. The "READY" LED glows bright green when the mesh has compiled.
- **Viewfinder HUD Overlays**: Monospaced green LCD indicators printing the battery capacity `[▰▰▰] 100%`, active camera mode `● 3D-CAM`, a retro calendar timestamp (`JUL.11.2001`), and photo quality (`HQ 24b`).

---

## ⚙️ How the 3D Rendering Engine Works

VicePoly departs from generic 2D Delaunay filters by replicating the early 3D rendering pipeline constraints:

### 1. Silhouette Contour Alignment (Anti-Webbing)
Standard low-poly filters tile the entire image space, stretching triangles across object silhouettes (creating ugly webbing between a subject's head and the sky). VicePoly solves this by:
- Tracing major object boundaries (highest 5% gradients using Sobel operators).
- Placing coordinates at a high density (every 10px) strictly along these outlines.
- Placing points in uniform/flat regions (sky, roads) very sparsely (every 50px).
- **Result**: The low-poly mesh contours snap tightly to the subject, creating clean silhouettes that look like actual 3D models standing in front of backgrounds.

### 2. Retro Texture Mapping
- **VRAM Size Textures**: The original photo is downscaled and scaled back up using nearest-neighbor stretching (`imageSmoothingEnabled = false`) to simulate the memory limits of early consoles ($256 \times 256$ texture maps).
- **PS1 Coordinate Jitter**: Emulates the signature coordinate drift/vibration of early hardware by adding a random pixel offset (wobble) to the mapping texture coordinate per triangle.
- **Pseudo-3D Shading (Lambertian Model)**: Vertex heights are calculated from image luminance gradients ($Z = \text{Luminance} \times 0.35$). The engine computes surface normals ($\vec{n}$) and checks them against a directional light source ($\vec{L}$) pointing from the top-left-front. Polygons facing the sun get highlights (white overlays) while facing away get shadows (ambient occlusion black overlays).

### 3. Atmospheric Post-Processing
- **Volumetric Fog**: A hazy linear overlay blends the bottom half of the mesh, simulating console draw-distance masking.
- **TV CRT Scanlines**: Alternating horizontal scanline beams run across the viewfinder screen.
- **Analog Film Grain**: High-frequency grit is added directly to the final pixels to prevent modern anti-aliasing smoothness and give a retro, cinematic TV glow.
- **16-bit Color Quantization**: Clamps colors to a 4096-color space to match early console lookup tables.

---

## 🛠️ Code Structure

The project has zero build chains, package managers, or bundlers:
- `index.html` - The structural shell of the skeuomorphic camera body, LCD HUD, and shutter controls.
- `css/style.css` - Custom styling tokens for brushed metal gradients, gel buttons, HUD text, and mobile scaling.
- `js/sobel.js` - Computes Sobel gradients and handles edge-locked grid coordinate sampling.
- `js/delaunay.js` - Triangulates coordinate arrays using the Bowyer-Watson Delaunay algorithm.
- `js/filters.js` - Applies post-effects: scanlines, film grain, volumetric fog, and 16-bit quantization.
- `js/app.js` - Orchestrates file streams, camera inputs, drawing sequences, and PNG exports.

---

## 🚀 Getting Started

### Deploy to GitHub Pages
1. Initialize git and commit the files:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of Retro 3D Camera"
   ```
2. Link your GitHub repository:
   ```bash
   git remote add origin https://github.com/SooYM/VicePoly.git
   ```
3. Push to GitHub:
   ```bash
   git branch -M main
   ```
   ```bash
   git push -u origin main
   ```
4. On GitHub, go to your repository **Settings** -> **Pages**.
5. Set the Source to **Deploy from a branch**, select `main` (root folder), and click **Save**.
6. Within a minute, your retro camera will be live at your GitHub Pages link:
   👉 **[https://SooYM.github.io/VicePoly/](https://SooYM.github.io/VicePoly/)**
   
   Once loaded on your mobile phone (iOS Safari or Android Chrome), tap **"Add to Home Screen"** to run it full-screen as a standalone Progressive Web App (PWA).

---

## 📜 License
MIT License. Open-source retro toys.
