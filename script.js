/* ===== DOM ===== */
const menu = document.getElementById("menu");
const board = document.getElementById("board");
const gallery = document.getElementById("gallery");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");
const currentToolLabel = document.getElementById("currentTool");
const themeSelect = document.getElementById("themeSelect");
const importInput = document.getElementById("importInput");

/* ===== STATE ===== */
let tool = "pen";
let drawing = false;
let startX = 0;
let startY = 0;
let snapshot = null;
let undoStack = [];
let redoStack = [];

/* ===== CANVAS ===== */
function resizeCanvas() {
  const img = canvas.toDataURL();
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 160;
  const restore = new Image();
  restore.src = img;
  restore.onload = () => ctx.drawImage(restore, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ===== MENU ===== */
function startBoard() {
  menu.classList.add("hidden");
  board.classList.remove("hidden");
}
function exitToMenu() {
  board.classList.add("hidden");
  menu.classList.remove("hidden");
}

/* ===== TOOLS ===== */
function setTool(t) {
  tool = t;
  document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("selected"));
  const btn = document.getElementById(t + "Btn");
  if (btn) btn.classList.add("selected");
  currentToolLabel.textContent = "Current Tool: " + t.toUpperCase();

  if (t === "text") addText();
}

/* ===== UNDO / REDO ===== */
function saveState() {
  undoStack.push(canvas.toDataURL());
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = undoStack.pop();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = redoStack.pop();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

/* ===== DRAWING ===== */
canvas.addEventListener("pointerdown", e => {
  saveState();
  drawing = true;
  startX = e.offsetX;
  startY = e.offsetY;
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (tool === "pen" || tool === "eraser") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  }
});

canvas.addEventListener("pointermove", e => {
  if (!drawing) return;

  ctx.putImageData(snapshot, 0, 0);
  ctx.lineWidth = sizePicker.value;
  ctx.strokeStyle = colorPicker.value;
  ctx.fillStyle = colorPicker.value;

  const w = e.offsetX - startX;
  const h = e.offsetY - startY;

  if (tool === "pen") {
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  }

  else if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  else if (tool === "rect") {
    ctx.strokeRect(startX, startY, w, h);
  }

  else if (tool === "circle") {
    const r = Math.sqrt(w * w + h * h);
    ctx.beginPath();
    ctx.arc(startX, startY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
});

canvas.addEventListener("pointerup", e => {
  if (!drawing) return;
  drawing = false;
  ctx.globalCompositeOperation = "source-over";

  const endX = e.offsetX;
  const endY = e.offsetY;

  if (tool === "rect") {
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = sizePicker.value;
    ctx.strokeRect(startX, startY, endX - startX, endY - startY);
  }

  if (tool === "circle") {
    const r = Math.hypot(endX - startX, endY - startY);
    ctx.beginPath();
    ctx.arc(startX, startY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
});

canvas.addEventListener("click", e => {
  if (tool !== "text") return;

  const text = prompt("Enter text:");
  if (!text) return;

  saveState();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = colorPicker.value;
  ctx.font = `${sizePicker.value * 4}px Arial`;
  ctx.fillText(text, e.offsetX, e.offsetY);
});

/* ===== TEXT ===== */
function addText() {
  const text = prompt("Enter text");
  if (!text) return;
  saveState();
  ctx.fillStyle = colorPicker.value;
  ctx.font = `${sizePicker.value * 5}px Arial`;
  ctx.fillText(text, 50, 100);
}

/* ===== CLEAR / SAVE / EXPORT ===== */
function clearBoard() {
  if (confirm("Clear board?")) {
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function saveBoard() {
  const data = canvas.toDataURL();
  const items = JSON.parse(localStorage.getItem("gallery") || "[]");
  items.push(data);
  localStorage.setItem("gallery", JSON.stringify(items));
  alert("Saved!");
}

function exportBoard() {
  const a = document.createElement("a");
  a.download = "whiteboard.png";
  a.href = canvas.toDataURL();
  a.click();
}

/* ===== GALLERY ===== */
function getGallery() {
  return JSON.parse(localStorage.getItem("gallery") || "[]");
}

function openGallery() {
  menu.classList.add("hidden");
  board.classList.add("hidden");
  gallery.classList.remove("hidden");
  loadGallery();
}

function exitGallery() {
  gallery.classList.add("hidden");
  menu.classList.remove("hidden");
}

function getGallery() {
  return JSON.parse(localStorage.getItem("gallery") || "[]");
}

function setGallery(data) {
  localStorage.setItem("gallery", JSON.stringify(data));
}

function loadGallery() {
  const container = document.getElementById("galleryItems");
  container.innerHTML = "";

  const items = getGallery();

  if (!items.length) {
    container.innerHTML = "<p>No saved whiteboards yet.</p>";
    return;
  }

  items.forEach((data, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const img = document.createElement("img");
    img.src = data;

    // Load image into canvas when tapped
    img.onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const image = new Image();
      image.src = data;
      image.onload = () => ctx.drawImage(image, 0, 0);
    };

    // DELETE BUTTON
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.style.position = "absolute";
    deleteBtn.style.top = "6px";
    deleteBtn.style.right = "6px";
    deleteBtn.style.background = "red";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "6px";
    deleteBtn.style.cursor = "pointer";

    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // IMPORTANT
      if (!confirm("Delete this image?")) return;
      items.splice(index, 1);
      setGallery(items);
      loadGallery();
    };

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    container.appendChild(wrapper);
  });


  items.forEach(data => {
    const img = document.createElement("img");
    img.src = data;
    img.onclick = () => {
      startBoard();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const i = new Image();
      i.src = data;
      i.onload = () => ctx.drawImage(i, 0, 0);
    };
    container.appendChild(img);
  });
}

/* ===== IMPORT ===== */
function startImport() {
  const choice = prompt("1 = Gallery, 2 = Device");
  if (choice === "1") openGallery();
  if (choice === "2") importInput.click();
}

importInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  saveState();
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.src = reader.result;
    img.onload = () => ctx.drawImage(img, 0, 0);
  };
  reader.readAsDataURL(file);
});

/* ===== THEME ===== */
function changeTheme() {
  document.body.classList.remove("dark");
  if (themeSelect.value === "dark") document.body.classList.add("dark");
  if (themeSelect.value === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
}