const menu = document.getElementById("menu");
const board = document.getElementById("board");
const gallery = document.getElementById("gallery");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let tool = "pen";
let gallerySource = "menu";
let isImporting = false;
let importData = null;

const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");
const themeSelect = document.getElementById("themeSelect");

/* ===== CANVAS RESIZE ===== */
function resizeCanvas() {
  const toolbarHeight = document.getElementById("toolbar")?.offsetHeight || 0;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - toolbarHeight;
}
window.addEventListener("resize", resizeCanvas);

/* ===== BOARD ===== */
function startBoard() {
  menu.classList.add("hidden");
  board.classList.remove("hidden");
  resizeCanvas();
}

function exitToMenu() {
  board.classList.add("hidden");
  menu.classList.remove("hidden");
}

function setTool(t) { tool = t; }

canvas.addEventListener("pointerdown", e => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener("pointermove", e => {
  if(!drawing) return;
  ctx.lineWidth = sizePicker.value;
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = tool === "eraser" ? "#000" : colorPicker.value;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
});

canvas.addEventListener("pointerup", () => drawing = false);
canvas.addEventListener("pointerleave", () => drawing = false);

function clearBoard() {
  if(confirm("Are you sure you want to clear the board?")) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
}

/* ===== SAVE / GALLERY ===== */
function getGallery() { return JSON.parse(localStorage.getItem("gallery") || "[]"); }
function setGallery(data) { localStorage.setItem("gallery", JSON.stringify(data)); }

function saveBoard() {
  const data = canvas.toDataURL("image/png");
  const galleryData = getGallery();
  galleryData.push(data);
  setGallery(galleryData);
  alert("Saved to local gallery!");
}

/* ===== OPEN / EXIT GALLERY ===== */
function openGallery(fromBoard=false, importing=false) {
  menu.classList.add("hidden");
  board.classList.add("hidden");
  gallery.classList.remove("hidden");
  gallerySource = fromBoard ? "board" : "menu";
  isImporting = importing;
  const backBtn = document.getElementById("galleryBackBtn");
  backBtn.textContent = gallerySource==="board" ? "⬅ Back to Board" : "⬅ Back to Menu";
  loadGallery();
}

function exitGallery() {
  gallery.classList.add("hidden");
  isImporting = false;
  if(gallerySource==="board") board.classList.remove("hidden");
  else menu.classList.remove("hidden");
}

/* ===== LOAD GALLERY ITEMS ===== */
function loadGallery() {
  const container = document.getElementById("galleryItems");
  container.innerHTML = "";
  const items = getGallery();

  if(items.length === 0) {
    container.innerHTML = "<p>No saved whiteboards yet.</p>";
    return;
  }

  items.forEach((data, index) => {
    const div = document.createElement("div");

    const img = document.createElement("img");
    img.src = data;
    img.onclick = () => {
      importData = data;         // set the image to import
      showImportPreview(importData); // open the modal
    };
    div.appendChild(img);

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if(confirm("Delete this drawing?")) {
        items.splice(index,1);
        setGallery(items);
        loadGallery();
      }
    };
    div.appendChild(delBtn);

    container.appendChild(div);
  });
}

/* ===== IMPORT ===== */
function startImport(){
  isImporting = true;
  document.getElementById("importInput").value = "";
  document.getElementById("importInput").click();
}

document.getElementById("importInput").addEventListener("change", e=>{
  if(!isImporting) return;
  const file = e.target.files[0];
  if(!file) return;
  if(file.size>5_000_000){ alert("Image too big!"); return; }
  const reader = new FileReader();
  reader.onload=()=>{ importData=reader.result; showImportPreview(importData); };
  reader.readAsDataURL(file);
});

/* ===== IMPORT MODAL ===== */
function showImportPreview(src){
  const modal = document.getElementById("importPreview");
  document.getElementById("previewImg").src = src;
  modal.style.display="flex";
}

function cancelImport(){
  importData=null;
  isImporting=false;
  document.getElementById("importPreview").style.display="none";
}

function confirmImport(mode){
  if(!importData) return;
  const img = new Image();
  img.onload=()=>{
    if(mode==="replace") ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    cancelImport();
  };
  img.src=importData;
}

/* ===== EXPORT ===== */
function exportBoard(){
  const link=document.createElement("a");
  link.download="whiteboard.png";
  link.href=canvas.toDataURL("image/png");
  link.click();
}

/* ===== THEME ===== */
function changeTheme(){
  const val=themeSelect.value;
  document.body.classList.remove("dark");
  if(val==="dark") document.body.classList.add("dark");
  if(val==="system" && window.matchMedia("(prefers-color-scheme: dark)").matches) 
    document.body.classList.add("dark");
}

/* ===== ON LOAD ===== */
window.addEventListener("load", () => {
  const modal = document.getElementById("importPreview");
  if(modal) modal.classList.add("hidden");
  importData = null;
  isImporting = false;
  resizeCanvas(); // ensures canvas fills the screen immediately on load
});