const STICKERS = [
  { id: "quack", name: "QUACK", draw: drawQuack },
  { id: "hazard", name: "斜纹", draw: drawHazard },
  { id: "star", name: "星星", draw: drawStar },
  { id: "bolt", name: "闪电", draw: drawBolt },
  { id: "heart", name: "爱心", draw: drawHeart },
  { id: "waddle", name: "WADDLE", draw: drawWaddle },
  { id: "fifteen", name: "15", draw: drawFifteen },
  { id: "eye", name: "眼睛", draw: drawEye },
  { id: "burst", name: "砰", draw: drawBurst },
  { id: "arrow", name: "箭头", draw: drawArrow },
];

export function makeStickers() {
  return STICKERS.map((item) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    item.draw(canvas.getContext("2d"), 512);
    return { id: item.id, name: item.name, canvas };
  });
}

function ink(ctx, width) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#0d0e11";
  ctx.lineWidth = width;
}

function drawQuack(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.arc(256, 256, 214, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd22f";
  ctx.fill();
  ink(ctx, 28);
  ctx.stroke();
  ctx.fillStyle = "#ff4fa3";
  ctx.beginPath();
  ctx.arc(392, 132, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0d0e11";
  ctx.font = "900 118px Impact, 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("QUACK", 256, 268);
}

function drawHazard(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  roundRect(ctx, 36, 36, 440, 440, 36);
  ctx.save();
  ctx.clip();
  for (let x = -512; x < 768; x += 64) {
    ctx.fillStyle = ((x / 64) % 2 === 0) ? "#ffd22f" : "#0d0e11";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 220, 0);
    ctx.lineTo(x + 40, 512);
    ctx.lineTo(x - 180, 512);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  roundRect(ctx, 36, 36, 440, 440, 36);
  ink(ctx, 26);
  ctx.stroke();
}

function drawStar(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  starPath(ctx, 256, 256, 210, 86);
  ctx.fillStyle = "#ffd22f";
  ctx.fill();
  ink(ctx, 24);
  ctx.stroke();
}

function drawBolt(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(292, 28);
  ctx.lineTo(118, 286);
  ctx.lineTo(236, 286);
  ctx.lineTo(188, 484);
  ctx.lineTo(404, 206);
  ctx.lineTo(276, 206);
  ctx.closePath();
  ctx.fillStyle = "#2de1d1";
  ctx.fill();
  ink(ctx, 24);
  ctx.stroke();
}

function drawHeart(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 430);
  ctx.bezierCurveTo(40, 300, 48, 140, 150, 120);
  ctx.bezierCurveTo(210, 108, 244, 150, 256, 186);
  ctx.bezierCurveTo(268, 150, 302, 108, 362, 120);
  ctx.bezierCurveTo(464, 140, 472, 300, 256, 430);
  ctx.closePath();
  ctx.fillStyle = "#ff4fa3";
  ctx.fill();
  ink(ctx, 24);
  ctx.stroke();
}

function drawWaddle(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  ctx.rotate(-0.12);
  roundRect(ctx, -220, -78, 440, 156, 28);
  ctx.fillStyle = "#f3efe3";
  ctx.fill();
  ink(ctx, 22);
  ctx.stroke();
  ctx.fillStyle = "#0d0e11";
  ctx.font = "900 78px Impact, 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WADDLE", 0, 8);
}

function drawFifteen(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.arc(256, 256, 210, 0, Math.PI * 2);
  ctx.fillStyle = "#0d0e11";
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.strokeStyle = "#ffd22f";
  ctx.stroke();
  ctx.fillStyle = "#ffd22f";
  ctx.font = "900 230px Impact, 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("15", 256, 270);
}

function drawEye(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.arc(256, 256, 210, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f1e6";
  ctx.fill();
  ink(ctx, 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 256, 132, 0, Math.PI * 2);
  ctx.fillStyle = "#ff6b2b";
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 256, 72, 0, Math.PI * 2);
  ctx.fillStyle = "#14181c";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(228, 228, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function drawBurst(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  burstPath(ctx, 256, 256, 220, 150, 16);
  ctx.fillStyle = "#ff6b2b";
  ctx.fill();
  ink(ctx, 20);
  ctx.stroke();
  ctx.fillStyle = "#0d0e11";
  ctx.font = "900 150px 'Noto Sans SC', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("砰", 256, 270);
}

function drawArrow(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(70, 206);
  ctx.lineTo(290, 206);
  ctx.lineTo(290, 110);
  ctx.lineTo(452, 256);
  ctx.lineTo(290, 402);
  ctx.lineTo(290, 306);
  ctx.lineTo(70, 306);
  ctx.closePath();
  ctx.fillStyle = "#bba4dc";
  ctx.fill();
  ink(ctx, 24);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function burstPath(ctx, cx, cy, outer, inner, spikes) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / spikes;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
