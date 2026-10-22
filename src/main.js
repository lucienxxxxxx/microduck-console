import * as THREE from "three";
import { createViewer } from "./viewer.js";
import { makeStickers } from "./stickers.js";

const QUICK = ["#ffd22f", "#ff6b2b", "#ff4fa3", "#2de1d1", "#bba4dc", "#f4f1e6", "#ffffff", "#0d0e11", "#3a3a3a", "#e10600"];

const NIGHT = {
  shell: "#1a1c22", cheek: "#ffd22f", beak: "#ffd22f", soft: "#ff4fa3", eye: "#2de1d1",
  face: "#2a2a2a", feet: "#ff6b2b", sole: "#111111", frame: "#0d0e11", structure: "#2c3038",
  neck: "#111111", servo: "#3a3a3a", bearing: "#c0c6cc", lens: "#2de1d1", electronics: "#1a1a1a",
};
const CANDY = {
  shell: "#ff8ad8", cheek: "#ffd22f", beak: "#fffdf8", soft: "#bba4dc", eye: "#0d0e11",
  face: "#ffb6e0", feet: "#ffd22f", sole: "#ff4fa3", frame: "#2a1a28", structure: "#f3efe3",
  neck: "#ff6b2b", servo: "#3a3a3a", bearing: "#eeeeee", lens: "#111111", electronics: "#2de1d1",
};
const HAZARD = {
  shell: "#ffd22f", cheek: "#0d0e11", beak: "#0d0e11", soft: "#ff6b2b", eye: "#0d0e11",
  face: "#ffd22f", feet: "#0d0e11", sole: "#ffd22f", frame: "#111111", structure: "#f3efe3",
  neck: "#ff6b2b", servo: "#222222", bearing: "#dddddd", lens: "#111111", electronics: "#ff6b2b",
};
const MINT = {
  shell: "#f7fffb", cheek: "#2de1d1", beak: "#f3efe3", soft: "#bba4dc", eye: "#ff4fa3",
  face: "#e7fff8", feet: "#2de1d1", sole: "#0d0e11", frame: "#20302c", structure: "#f3efe3",
  neck: "#6f8f88", servo: "#333333", bearing: "#e8eef2", lens: "#111111", electronics: "#2de1d1",
};

const assembly = await fetch("/assembly.json").then((response) => response.json());
const colors = Object.fromEntries(assembly.zones.map((zone) => [zone.id, zone.color]));
const presets = [
  { id: "showroom", name: "官网实机", colors: { ...colors } },
  { id: "cad", name: "CAD 原色", colors: Object.fromEntries(assembly.zones.map((zone) => [zone.id, zone.cad])) },
  { id: "night", name: "夜行", colors: NIGHT },
  { id: "candy", name: "糖果", colors: CANDY },
  { id: "hazard", name: "警示", colors: HAZARD },
  { id: "mint", name: "薄荷", colors: MINT },
];

const presetRow = document.querySelector("#presets");
const zoneList = document.querySelector("#zones");
const swatches = document.querySelector("#swatches");
const load = document.querySelector("#load");
const loadBar = document.querySelector("#load-bar");
const loadText = document.querySelector("#load-text");
const status = document.querySelector("#status");
let activeZone = assembly.zones[0].id;
let activePreset = "showroom";

const viewer = createViewer(document.querySelector("#view"), assembly, {
  onProgress(done, total) {
    const ratio = done / total;
    loadBar.style.boxShadow = `inset ${Math.round(ratio * 280)}px 0 0 var(--yellow)`;
    loadText.textContent = `网格 ${done} / ${total}`;
  },
  onPick(zoneId) {
    activeZone = zoneId;
    paintZoneList();
    const zone = assembly.zones.find((item) => item.id === zoneId);
    status.textContent = zone ? `选中 ${zone.label}` : "点零件选色区";
  },
  onStickers(items) {
    renderPlaced(items);
    if (!stickerOn) status.textContent = items.length ? `已贴 ${items.length} 张` : "点零件选色区";
  },
});

viewer.ready.then(() => {
  load.classList.add("is-done");
  applyColors();
}).catch((error) => {
  loadText.textContent = "模型没载入";
  console.error(error);
});

function applyColors() {
  for (const [zoneId, hex] of Object.entries(colors)) viewer.setColor(zoneId, hex);
  paintZoneList();
  paintPresets();
}

function paintPresets() {
  presetRow.replaceChildren(...presets.map((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = preset.name;
    button.classList.toggle("is-on", preset.id === activePreset);
    button.addEventListener("click", () => {
      activePreset = preset.id;
      Object.assign(colors, preset.colors);
      applyColors();
    });
    return button;
  }));
}

function paintZoneList() {
  zoneList.replaceChildren(...assembly.zones.map((zone) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "zone";
    row.classList.toggle("is-on", zone.id === activeZone);
    const input = document.createElement("input");
    input.type = "color";
    input.value = toHex(colors[zone.id]);
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("input", () => {
      colors[zone.id] = input.value;
      activeZone = zone.id;
      activePreset = "";
      viewer.setColor(zone.id, input.value);
      paintPresets();
      row.classList.add("is-on");
      status.textContent = `${zone.label} ${input.value.toUpperCase()}`;
    });
    const copy = document.createElement("span");
    const title = document.createElement("b");
    title.textContent = zone.label;
    const hint = document.createElement("small");
    hint.textContent = `${zone.hint} · ${zone.count} 件`;
    copy.append(title, hint);
    const hex = document.createElement("small");
    hex.textContent = toHex(colors[zone.id]).toUpperCase();
    row.append(input, copy, hex);
    row.addEventListener("click", () => {
      activeZone = zone.id;
      paintZoneList();
      status.textContent = `选中 ${zone.label}`;
    });
    return row;
  }));
}

swatches.replaceChildren(...QUICK.map((hex) => {
  const button = document.createElement("button");
  button.type = "button";
  button.style.background = hex;
  button.title = hex;
  button.addEventListener("click", () => {
    colors[activeZone] = hex;
    activePreset = "";
    viewer.setColor(activeZone, hex);
    applyColors();
    const zone = assembly.zones.find((item) => item.id === activeZone);
    status.textContent = `${zone?.label || "色区"} ${hex.toUpperCase()}`;
  });
  return button;
}));

document.querySelector("#finish").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  for (const item of document.querySelectorAll("#finish button")) item.classList.toggle("is-on", item === button);
  viewer.setFinish(button.dataset.finish);
});

document.querySelector("#export-colors").addEventListener("click", () => {
  const payload = {
    name: "microduck-paint",
    preset: activePreset || "custom",
    finish: document.querySelector("#finish .is-on")?.dataset.finish || "matte",
    colors,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "microduck-colors.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#shot").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = viewer.snapshot();
  link.download = "microduck-paint.png";
  link.click();
});

const stickers = makeStickers().map((item) => {
  const texture = new THREE.CanvasTexture(item.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { ...item, texture };
});

const stickerState = { id: null, name: "", texture: null, size: 0.036, rotation: -8 * Math.PI / 180 };
let stickerOn = false;
const grid = document.querySelector("#sticker-grid");
grid.replaceChildren(...stickers.map((item) => {
  const button = document.createElement("button");
  button.type = "button";
  button.title = item.name;
  button.append(item.canvas);
  button.addEventListener("click", () => {
    stickerState.id = item.id;
    stickerState.name = item.name;
    stickerState.texture = item.texture;
    stickerOn = true;
    syncSticker();
    for (const node of grid.children) node.classList.toggle("is-on", node === button);
  });
  return button;
}));

document.querySelector("#sticker-size").addEventListener("input", (event) => {
  stickerState.size = Number(event.target.value) / 1000;
  syncSticker();
});
document.querySelector("#sticker-rot").addEventListener("input", (event) => {
  stickerState.rotation = Number(event.target.value) * Math.PI / 180;
  syncSticker();
});
document.querySelector("#sticker-arm").addEventListener("click", () => {
  stickerOn = !stickerOn;
  if (stickerOn && !stickerState.texture) {
    stickerState.id = stickers[0].id;
    stickerState.name = stickers[0].name;
    stickerState.texture = stickers[0].texture;
    grid.children[0].classList.add("is-on");
  }
  syncSticker();
});
document.querySelector("#clear-stickers").addEventListener("click", () => viewer.clearStickers());

function syncSticker() {
  const button = document.querySelector("#sticker-arm");
  button.classList.toggle("is-on", stickerOn);
  button.textContent = stickerOn ? `贴纸模式：${stickerState.name}` : "贴纸模式：关";
  viewer.armSticker(stickerOn ? stickerState : null);
  status.textContent = stickerOn ? "点在鸭子身上" : "点零件选色区";
}

function renderPlaced(items) {
  const list = document.querySelector("#placed");
  list.replaceChildren(...items.map((item) => {
    const row = document.createElement("li");
    row.textContent = item.name;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "撕掉";
    button.addEventListener("click", () => viewer.removeSticker(item.index));
    row.append(button);
    return row;
  }));
}

function toHex(value) {
  if (!value) return "#000000";
  if (value.length === 7) return value;
  return value;
}

paintPresets();
paintZoneList();
