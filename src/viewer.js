import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";

const FINISH = {
  matte: { roughness: 0.78, metalness: 0.02, clearcoat: 0 },
  silk: { roughness: 0.28, metalness: 0.06, clearcoat: 0.45 },
  metal: { roughness: 0.2, metalness: 0.92, clearcoat: 0.15 },
};

export function createViewer(canvas, assembly, hooks) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x0d0e11, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0e11);
  scene.fog = new THREE.Fog(0x0d0e11, 1.4, 3.2);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
  camera.up.set(0, 0, 1);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 1.6;
  controls.minDistance = 0.18;
  controls.maxPolarAngle = Math.PI * 0.92;

  const duck = new THREE.Group();
  scene.add(duck);
  const decals = new THREE.Group();
  scene.add(decals);

  scene.add(new THREE.HemisphereLight(0xfff6d8, 0x2a241c, 1.35));
  const key = new THREE.DirectionalLight(0xfff4dd, 2.4);
  key.position.set(0.8, -1.1, 1.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x2de1d1, 0.85);
  rim.position.set(-1.2, 0.8, 0.7);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xff6b2b, 0.35);
  fill.position.set(0.2, 1.4, 0.4);
  scene.add(fill);

  addStage(scene);

  const bounds = assembly.bounds;
  const center = new THREE.Vector3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  );
  controls.target.copy(center);
  camera.position.set(center.x + 0.34, center.y - 0.4, center.z + 0.1);
  controls.update();

  const materials = new Map();
  for (const zone of assembly.zones) {
    materials.set(zone.id, new THREE.MeshPhysicalMaterial({
      color: zone.color,
      roughness: FINISH.matte.roughness,
      metalness: FINISH.matte.metalness,
      clearcoat: FINISH.matte.clearcoat,
      clearcoatRoughness: 0.4,
    }));
  }
  materials.set("misc", new THREE.MeshPhysicalMaterial({ color: "#888888", roughness: 0.6 }));

  const parts = [];
  const loader = new STLLoader();
  const geometryCache = new Map();
  let disposed = false;

  const unique = [...new Set(assembly.instances.map((item) => item.file))];
  let loaded = 0;
  const ready = Promise.all(unique.map((file) => new Promise((resolve, reject) => {
    loader.load(`/models/${file}`, (geometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      geometryCache.set(file, geometry);
      loaded += 1;
      hooks.onProgress?.(loaded, unique.length);
      resolve();
    }, undefined, reject);
  }))).then(() => {
    if (disposed) return;
    for (const instance of assembly.instances) {
      const geometry = geometryCache.get(instance.file);
      const material = materials.get(instance.zone) || materials.get("misc");
      const mesh = new THREE.Mesh(geometry, material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.fromArray(instance.matrix);
      mesh.userData.zone = instance.zone;
      duck.add(mesh);
      parts.push(mesh);
    }
    duck.updateMatrixWorld(true);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const helper = new THREE.Object3D();
  let preview = null;
  let sticker = null;
  let pointerDown = null;
  const placed = [];

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function hitTest() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(parts, false);
    return hits[0] || null;
  }

  function clearPreview() {
    if (!preview) return;
    decals.remove(preview);
    preview.geometry.dispose();
    preview.material.dispose();
    preview = null;
  }

  function projector(hit) {
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const point = hit.point.clone().add(normal.clone().multiplyScalar(0.0008));
    helper.position.copy(point);
    helper.up.set(0, 0, 1);
    helper.lookAt(point.clone().add(normal));
    helper.rotateZ(sticker?.rotation || 0);
    return { point, normal, orientation: helper.rotation.clone() };
  }

  function showPreview(hit) {
    clearPreview();
    if (!sticker) return;
    const { point, normal } = projector(hit);
    const material = new THREE.MeshBasicMaterial({
      map: sticker.texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide,
      opacity: 0.92,
    });
    preview = new THREE.Mesh(new THREE.PlaneGeometry(sticker.size, sticker.size), material);
    preview.position.copy(point);
    preview.lookAt(point.clone().add(normal));
    preview.rotateZ(sticker.rotation);
    decals.add(preview);
  }

  function placeSticker(hit) {
    if (!sticker) return;
    const { point, orientation } = projector(hit);
    const size = new THREE.Vector3(sticker.size, sticker.size, Math.max(0.03, sticker.size * 0.55));
    let geometry;
    try {
      geometry = new DecalGeometry(hit.object, point, orientation, size);
    } catch {
      return;
    }
    if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
      geometry.dispose();
      return;
    }
    const material = new THREE.MeshStandardMaterial({
      map: sticker.texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -10,
      roughness: 0.4,
      metalness: 0,
      side: THREE.FrontSide,
    });
    const decal = new THREE.Mesh(geometry, material);
    decals.add(decal);
    placed.push({ id: sticker.id, name: sticker.name, chunks: [decal] });
    hooks.onStickers?.(placed.map((item, index) => ({ index, name: item.name })));
  }

  canvas.addEventListener("pointerdown", (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointerDown) return;
    const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (moved > 6) return;
    setPointer(event);
    const hit = hitTest();
    if (!hit) return;
    if (sticker) placeSticker(hit);
    else hooks.onPick?.(hit.object.userData.zone);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!sticker) {
      clearPreview();
      canvas.style.cursor = "grab";
      return;
    }
    canvas.style.cursor = "crosshair";
    setPointer(event);
    const hit = hitTest();
    if (hit) showPreview(hit);
    else clearPreview();
  });
  canvas.addEventListener("pointerleave", clearPreview);

  function frame() {
    if (disposed) return;
    resize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return {
    ready,
    setColor(zoneId, hex) {
      const material = materials.get(zoneId);
      if (material) material.color.set(hex);
    },
    setFinish(name) {
      const preset = FINISH[name] || FINISH.matte;
      for (const material of materials.values()) {
        material.roughness = preset.roughness;
        material.metalness = preset.metalness;
        material.clearcoat = preset.clearcoat;
      }
    },
    armSticker(next) {
      sticker = next;
      if (!next) clearPreview();
      canvas.style.cursor = next ? "crosshair" : "grab";
    },
    removeSticker(index) {
      const [item] = placed.splice(index, 1);
      if (!item) return;
      for (const mesh of item.chunks) {
        decals.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      hooks.onStickers?.(placed.map((entry, entryIndex) => ({ index: entryIndex, name: entry.name })));
    },
    clearStickers() {
      while (placed.length) this.removeSticker(0);
    },
    snapshot() {
      renderer.render(scene, camera);
      return canvas.toDataURL("image/png");
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}

function addStage(scene) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 64),
    new THREE.MeshStandardMaterial({ color: 0xf3efe3, roughness: 0.9 }),
  );
  disc.position.z = -0.004;
  scene.add(disc);
  const edge = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.228, 64),
    new THREE.MeshBasicMaterial({ color: 0x0d0e11, side: THREE.DoubleSide }),
  );
  edge.position.z = -0.003;
  scene.add(edge);
  const dots = makeDotTexture();
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(0.19, 64),
    new THREE.MeshBasicMaterial({ map: dots, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  rug.position.z = -0.002;
  scene.add(rug);
}

function makeDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "#0d0e11";
  for (let y = 12; y < 256; y += 24) {
    for (let x = 12; x < 256; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}
