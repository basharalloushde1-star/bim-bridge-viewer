# BIM Bridge Viewer - Interactive 2D/3D Synchronization

## 📌 Project Overview
This project is a React-based **Minimum Viable Product (MVP)** developed for bridge inspection workflows. It bridges the gap between complex 3D BIM models (IFC) and traditional 2D damage sketches. The application allows inspectors to view a bridge model, perform sectional cuts, and document damages using an interactive 3D marker system.

Built using **That Open Engine** (formerly IFC.js), this tool focuses on spatial context and ease of documentation.

## 🛠️ Technical Stack
* **Framework:** React 18 (Vite)
* **Language:** TypeScript
* **BIM Engine:** `@thatopen/components`, `@thatopen/fragments`, `@thatopen/ui`
* **3D Library:** Three.js
* **Interactions:** `TransformControls` for object manipulation.
* **AI Tools:** Leveraged for optimizing boilerplate code and handling library-specific type mismatches.

## ✨ Key Features

### 1. 3D View & IFC Integration
* Full loading and rendering of IFC bridge models.
* **Interactive Marker System:** Users can place 3D spheres (representing damage) on the model surface via **Double-Click**.
* **Draggable Markers:** Integrated a 3D Gizmo (Translate) that allows users to move markers accurately in the 3D space after placement.

### 2. Synchronized 2D Sectional Views
* **Draufsicht (Top View):** Automated horizontal cut from the top, providing a plan view of the bridge deck.
* **Untersicht (Soffit/Bottom View):** Automated upward-looking horizontal cut to inspect the underside of the bridge.
* **Camera Sync:** The camera automatically adjusts to a top-down or bottom-up orthographic perspective when a section is created.
* **Reset Tool:** Clears all clipping planes and resets the camera to the original 3D perspective.

## 🧠 Technical Hurdles & Solutions

### 1. TransformControls & OBC Compatibility
**The Problem:** The `TransformControls` from Three.js does not natively inherit from `Object3D` in newer versions, causing "Type Mismatch" errors when adding them to the OBC-managed scene.
**The Solution:** I resolved this by accessing the internal `helper` (root) of the controls and using type-casting (`as any`) to bridge the gap between the `That Open Engine` world and standard Three.js helpers.

### 2. Synchronization Logic
**The Problem:** Aligning the 2D "cut" with the user's view while maintaining 3D coordinate integrity.
**The Solution:** I used the `OBC.Clipper` to handle the physical mesh cutting and synchronized the `camera.setLookAt` coordinates to match the elevation of the clipping plane, ensuring the 2D sketch perfectly represents the 3D location.

## 🗺️ Handling the "Folded" Side Views (Challenge)
For the **Developed/Folded Side Views** mentioned in the challenge:
* **My Approach:** I conceptualized a multi-planar clipping strategy. Since wing walls are often angled relative to the main abutment, a single cut is insufficient. 
* **Proposed Logic:** The solution would involve calculating the "Normal Vector" for each wall segment. We would then perform sub-renders for each plane and "flatten" or "stitch" these projections onto a single 2D global coordinate system.
* **Decision:** In this MVP, I prioritized a robust foundation for the Top/Bottom views and the interactive marker system, as they demonstrate the core 2D-3D synchronization logic required.

## 📦 Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Run Development Server:**
    ```bash
    npm run dev
    ```
3.  **Basic Controls:**
    * **Double-Click:** Add a new marker.
    * **Single-Click (on marker):** Enable the drag gizmo to move it.
    * **Top/Bottom View Buttons:** Toggle sectional cuts.
    * **Reset Button:** Clear all sections and markers' selection.

---
*Note: This project was developed as part of a technical assessment to demonstrate efficiency in leveraging modern BIM-JS libraries and AI-assisted development.*