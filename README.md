# BitCam 📸
> **A Skeuomorphic Retro Camera & Voxel Art Generator**

BitCam is a zero-configuration, single-page progressive web application (PWA) that transforms your photos into textured voxel block mosaics and nostalgic pixel art.

*Inspired by the blocky, retro aesthetic of classic voxel sandboxes.*

### 🔒 100% Local & Private
**Your images never leave your device.** The entire pixelation, block mapping, and color quantization pipeline runs locally in your web browser (using client-side canvas pixels). There is no backend server, and no image data is ever uploaded, stored, or processed externally.

### 📱 Mobile Experience & Desktop Prompt
BitCam is styled to represent a physical handheld toy camera. If accessed via a desktop computer or laptop, the viewfinder screen will display a warning dialog containing a dynamic QR code. Scanning this code lets you instantly open the app on your mobile phone to experience the simulator correctly.

---

## 🎨 2000s Skeuomorphic UI Design
Rather than a modern flat interface, the app is styled as an interactive physical digital toy camera gadget:
- **Device Casing**: Styled with brushed-metal chassis gradients, inner beveled highlights, and a translucent atomic-cyan grip strip.
- **Physical Utility Keys**: 3D beveled metallic buttons for **LOAD**, **REFRESH**, and **SAVE** that displace vertically when clicked.
- **Glowing LED Indicators**: Tactile lights indicating device power and calculation state. The "READY" LED glows bright green when the pixel art has compiled.
- **Viewfinder HUD Overlays**: Monospaced green LCD indicators printing the battery capacity `[▰▰▰] 100%`, active camera mode `● ACTIVE`, a retro calendar timestamp, and photo quality (`HQ 16b`).
- **Style Selector HUD**: A clean, bottom-centered glassmorphism menu toggle that swaps rendering modes between **16 BIT** and **8 BIT**.

---

## ⚙️ How the Block Art Engine Works

BitCam processes the loaded image in real-time through a client-side voxelization pipeline:

### 1. Grid Partitioning & Color Averaging
*   The original image is downscaled to fit the camera viewfinder, then divided into discrete grid cell blocks of size `12px`.
*   The engine calculates the average RGB color of the pixels inside each cell bounds to determine the primary tone.

### 2. Dual Pixelation Styles

#### 👾 16 BIT Mode (Smooth Flat Pixel Art)
*   Standard color-pixelation block rendering.
*   Clamps the colors into a 5-6-5 bit (16-bit) High Color depth, yielding exactly 65,536 colors for a retro Windows 95/98 PC gaming look.

#### 🧱 8 BIT Mode (Procedural Voxel Block Art)
*   **Procedural Block Texture Compiler**: Generates authentic 16x16 pixel textures dynamically on startup with zero network dependencies (includes *Stone, Grass, Dirt, Leaves, Water, Sand, Wood, and Obsidian*).
*   **Euclidean Color-Proximity Check**: Compares the cell's average color to the target blocks' color profiles in 3D color space, mapping each cell to the closest matching voxel block texture sheet.
*   **8-Bit RGB Color Quantization**: Clamps the color of the rendered texture sub-pixels into a 3-3-2 bit (8-bit) color depth, yielding exactly 256 colors total for that iconic, crunchy retro MS-DOS / Sega console look.

---

## 🛠️ Code Structure

The project has zero build chains, package managers, or bundlers:
- `index.html` - The structural shell of the skeuomorphic camera body, LCD HUD, and shutter controls.
- `css/style.css` - Custom styling tokens for brushed metal gradients, HUD text, and mobile viewport layouts.
- `js/filters.js` - Procedurally compiles block textures, maps colors, and applies 8-bit quantization.
- `js/app.js` - Orchestrates file streams, camera inputs, drawing sequences, and PNG exports.

---

## 🚀 Getting Started

Use this GitHub Pages link: 👉 **[https://SooYM.github.io/VicePoly/](https://SooYM.github.io/VicePoly/)**

Once loaded on your mobile phone (iOS Safari or Android Chrome), tap **"Add to Home Screen"** to run it full-screen as a standalone Progressive Web App (PWA).

---

## 📜 License
MIT License. Open-source retro toys.
