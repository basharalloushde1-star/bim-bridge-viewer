import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

// Configuration constants
const FRAGMENTS_WORKER_URL = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const WEB_IFC_PATH = "https://unpkg.com/web-ifc@0.0.74/";
const DEFAULT_IFC_PATH = "/7936501_0.ifc";

export default function IFCViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<any>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const markers = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize Core Components
    const components = new OBC.Components();
    componentsRef.current = components;
    
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>();
    worldRef.current = world;

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    
    // Enable local clipping in the renderer for sectional views
    world.renderer.three.localClippingEnabled = true;

    const cameraEntity = new OBC.OrthoPerspectiveCamera(components);
    world.camera = cameraEntity;

    components.init();
    world.scene.setup();
    world.scene.three.background = new THREE.Color(0x202124);

    const fragments = components.get(OBC.FragmentsManager);
    const clipper = components.get(OBC.Clipper);
    clipper.enabled = true;

    // Initialize TransformControls for draggable marker functionality
    const transformControls = new TransformControls(cameraEntity.three, world.renderer.three.domElement);
    transformRef.current = transformControls;
    
    // Disable camera controls during marker transformation to prevent conflict
    transformControls.addEventListener("dragging-changed", (event) => {
      if (cameraEntity.controls) cameraEntity.controls.enabled = !event.value;
    });

    // Add TransformControls helper/root to the scene
    const controlsElement = (transformControls as any).getHelper ? (transformControls as any).getHelper() : transformControls;
    world.scene.three.add(controlsElement);

    const init = async () => {
      try {
        // Initialize Fragments Manager with worker
        const fetchedUrl = await fetch(FRAGMENTS_WORKER_URL);
        const workerBlob = await fetchedUrl.blob();
        const workerURL = URL.createObjectURL(workerBlob);
        fragments.init(workerURL);

        // Handle model loading and material synchronization with clipping planes
        fragments.list.onItemSet.add(({ value: model }) => {
          model.object.traverse((obj: any) => {
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              materials.forEach((m: any) => {
                m.clippingPlanes = (clipper as any).planes;
                m.clipShadows = true;
              });
            }
          });
          world.scene.three.add(model.object);
          fragments.core.update(true);
        });

        // Setup IFC Loader
        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: { path: WEB_IFC_PATH, absolute: true },
        });

        // Load IFC file
        const file = await fetch(DEFAULT_IFC_PATH);
        const data = await file.arrayBuffer();
        await ifcLoader.load(new Uint8Array(data), false, "BridgeModel");
        
        // Set initial camera view
        if (cameraEntity.controls) {
          cameraEntity.controls.setLookAt(78, 20, -2.2, 26, -4, 25);
        }
      } catch (err) { 
        console.error("BIM Viewer initialization failed:", err); 
      } finally { 
        setLoading(false); 
      }
    };

    init();

    // Event handler for marker creation (dblclick) and selection (mousedown)
    const handleEvents = async (event: MouseEvent) => {
      if (!world.renderer || !componentsRef.current) return;
      const raycasters = componentsRef.current.get(OBC.Raycasters);
      const raycaster = raycasters.get(world);
      const result = await raycaster.castRay();

      if (event.type === 'dblclick') {
        if (result && result.point) {
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.8),
            new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false })
          );
          sphere.position.copy(result.point);
          world.scene.three.add(sphere);
          markers.current.push(sphere);
          transformControls.attach(sphere);
        }
      } 
      else if (event.type === 'mousedown') {
        // Check if a marker was clicked to attach TransformControls
        if (result && result.object instanceof THREE.Mesh && markers.current.includes(result.object)) {
          transformControls.attach(result.object);
        }
      }
    };

    container.addEventListener("mousedown", handleEvents);
    container.addEventListener("dblclick", handleEvents);

    return () => {
      components.dispose();
      transformControls.dispose();
      container.removeEventListener("mousedown", handleEvents);
      container.removeEventListener("dblclick", handleEvents);
    };
  }, []);

  // Function to handle 2D Sectional views (Top/Bottom)
  const createSection = (type: 'top' | 'bottom') => {
    const world = worldRef.current;
    if (!world || !componentsRef.current) return;
    const clipper = componentsRef.current.get(OBC.Clipper);
    
    clipper.deleteAll();
    
    // Define clipping plane and coplanar point based on bridge elevation
    const normal = new THREE.Vector3(0, type === 'top' ? -1 : 1, 0);
    const point = new THREE.Vector3(0, type === 'top' ? 13 : 2, 0);
    
    clipper.createFromNormalAndCoplanarPoint(world, normal, point);

    // Update camera to orthographic-like perspective for 2D sync
    if (world.camera.controls) {
      if (type === 'top') {
        world.camera.controls.setLookAt(50, 80, 15, 50, 0, 15, true);
      } else {
        world.camera.controls.setLookAt(50, -80, 15, 50, 0, 15, true);
      }
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Toolbars & Controls */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => createSection('top')} style={btnStyle}>Draufsicht (Top View)</button>
        <button onClick={() => createSection('bottom')} style={btnStyle}>Untersicht (Bottom View)</button>
        <button onClick={() => {
          componentsRef.current?.get(OBC.Clipper).deleteAll();
          transformRef.current?.detach();
          worldRef.current?.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25, true);
        }} style={{...btnStyle, background: "#dc3545"}}>Reset View</button>
      </div>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      
      {loading && (
        <div style={loadingStyle}>
          Initializing BIM Model & Interactive Tools...
        </div>
      )}
    </div>
  );
}

// UI Styles
const btnStyle = { 
  padding: "10px 15px", 
  cursor: "pointer", 
  background: "#28a745", 
  color: "#fff", 
  border: "none", 
  borderRadius: "5px", 
  fontWeight: "bold" as "bold",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
};

const loadingStyle = { 
  position: "absolute" as "absolute", 
  top: "50%", 
  left: "50%", 
  transform: "translate(-50%, -50%)", 
  color: "white", 
  background: "rgba(0,0,0,0.8)", 
  padding: "20px", 
  borderRadius: "10px",
  fontFamily: "sans-serif"
};