const APP_VERSION = "Whiteboard 3.1";

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

const feedbackModal = document.getElementById("feedbackModal");
const feedbackText = document.getElementById("feedbackText");
const userNameInput = document.getElementById("whiteboardUserName");

// --- INIT ---
emailjs.init("20ufBwzovYTVYOlej"); // Replace with your EmailJS Public Key

// Load localStorage: name, theme, gallery, canvas
let undoStack = [];
let redoStack = [];
let tool = "pen";
let drawing = false;
let startX=0, startY=0;
let snapshot=null;

function loadSettings() {
  // Name
  const savedName = localStorage.getItem("whiteboardUserName") || "";
  userNameInput.value = savedName;
  feedbackText.placeholder = `Write your feedback here, ${savedName || 'Guest'}...`;

  // Theme
  const savedTheme = localStorage.getItem("whiteboardTheme") || "system";
  themeSelect.value = savedTheme;
  changeTheme();

  // Gallery already handled
  // Canvas current
  const savedCanvas = localStorage.getItem("whiteboardCurrentCanvas");
  if (savedCanvas) {
    const img = new Image();
    img.src = savedCanvas;
    img.onload = ()=> ctx.drawImage(img,0,0);
  }
}
loadSettings();

// --- NAME HANDLER ---
function saveUserName() {
  const name = userNameInput.value.trim();
  if(!name) return alert("Name cannot be empty!");
  localStorage.setItem("whiteboardUserName", name);
  feedbackText.placeholder = `Write your feedback here, ${name}...`;
  alert("Name saved!");
}
function resetUserName() {
  userNameInput.value = "";
  localStorage.removeItem("whiteboardUserName");
  feedbackText.placeholder = "Write your feedback here...";
}

// --- FEEDBACK ---
function showFeedbackModal() { feedbackModal.style.display="flex"; }
function closeFeedbackModal() { feedbackModal.style.display="none"; feedbackText.value=""; }
function submitFeedback() {
  const feedback = feedbackText.value.trim();
  if(!feedback) return alert("Please enter feedback!");
  const userName = localStorage.getItem("whiteboardUserName") || "Guest";

  const templateParams = {
    feedback_text: feedback,
    user_name: userName,
    app_version: APP_VERSION,
    time: new Date().toLocaleString()
  };

  emailjs.send("service_i5vs33a","template_nird7vj",templateParams)
    .then(()=>{
      alert(`A feedback by ${userName} has been sent!`);
      closeFeedbackModal();
    }).catch(err=>{
      console.error(err);
      alert("Error sending feedback.");
    });
}

// --- MENU / BOARD ---
function startBoard(){ menu.classList.add("hidden"); board.classList.remove("hidden"); resizeCanvas(); }
function exitToMenu(){ board.classList.add("hidden"); menu.classList.remove("hidden"); }

// --- THEME ---
function changeTheme(){
  document.body.classList.remove("dark");
  const val = themeSelect.value;
  localStorage.setItem("whiteboardTheme", val);
  if(val==="dark") document.body.classList.add("dark");
  if(val==="system" && window.matchMedia("(prefers-color-scheme: dark)").matches) document.body.classList.add("dark");
}

// --- TOOLS ---
function setTool(t){
  tool=t;
  document.querySelectorAll(".tool-btn").forEach(b=>b.classList.remove("selected"));
  const btn=document.getElementById(t+"Btn");
  if(btn) btn.classList.add("selected");
  currentToolLabel.textContent="Current Tool: "+t.toUpperCase();
}

// --- UNDO / REDO ---
function saveState(){ undoStack.push(canvas.toDataURL()); redoStack=[]; saveCurrentCanvas(); }
function undo(){ if(!undoStack.length) return; redoStack.push(canvas.toDataURL()); const img=new Image(); img.src=undoStack.pop(); img.onload=()=>ctx.drawImage(img,0,0);}
function redo(){ if(!redoStack.length) return; undoStack.push(canvas.toDataURL()); const img=new Image(); img.src=redoStack.pop(); img.onload=()=>ctx.drawImage(img,0,0);}

// --- CANVAS DRAWING ---
canvas.addEventListener("pointerdown",e=>{
  saveState();
  drawing=true;
  startX=e.offsetX; startY=e.offsetY;
  snapshot=ctx.getImageData(0,0,canvas.width,canvas.height);
  if(tool==="pen"||tool==="eraser"){ ctx.beginPath(); ctx.moveTo(startX,startY);}
});
canvas.addEventListener("pointermove",e=>{
  if(!drawing) return;
  ctx.putImageData(snapshot,0,0);
  ctx.lineWidth=sizePicker.value;
  ctx.strokeStyle=colorPicker.value;
  ctx.fillStyle=colorPicker.value;
  const w=e.offsetX-startX, h=e.offsetY-startY;
  if(tool==="pen"){ ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); }
  else if(tool==="eraser"){ ctx.globalCompositeOperation="destination-out"; ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); ctx.globalCompositeOperation="source-over";}
  else if(tool==="rect"){ ctx.strokeRect(startX,startY,w,h);}
  else if(tool==="circle"){ const r=Math.hypot(w,h); ctx.beginPath(); ctx.arc(startX,startY,r,0,Math.PI*2); ctx.stroke();}
});
canvas.addEventListener("pointerup",()=>{ drawing=false; ctx.globalCompositeOperation="source-over"; });
canvas.addEventListener("click",e=>{
  if(tool!=="text") return;
  const text=prompt("Enter text:"); if(!text) return;
  saveState();
  ctx.fillStyle=colorPicker.value;
  ctx.font=`${sizePicker.value*4}px Arial`;
  ctx.fillText(text,e.offsetX,e.offsetY);
});

// --- SAVE / EXPORT ---
function clearBoard(){ if(confirm("Clear board?")){ saveState(); ctx.clearRect(0,0,canvas.width,canvas.height); saveCurrentCanvas(); } }
function saveBoard(){ const galleryData=getGallery(); galleryData.push({image:canvas.toDataURL(),time:Date.now()}); setGallery(galleryData); alert("Saved!"); saveCurrentCanvas();}
function exportBoard(){ const a=document.createElement("a"); a.download="whiteboard.png"; a.href=canvas.toDataURL(); a.click(); }

// --- GALLERY ---
function getGallery(){ return JSON.parse(localStorage.getItem("gallery")||"[]"); }
function setGallery(data){ localStorage.setItem("gallery",JSON.stringify(data)); }
function openGallery(){ menu.classList.add("hidden"); board.classList.add("hidden"); gallery.classList.remove("hidden"); loadGallery();}
function exitGallery(){ gallery.classList.add("hidden"); menu.classList.remove("hidden");}
function loadGallery(){
  const container=document.getElementById("galleryItems"); container.innerHTML="";
  const items=getGallery();
  if(!items.length){ container.innerHTML="<p>No saved whiteboards yet.</p>"; return; }
  items.forEach((item,index)=>{
    const wrapper=document.createElement("div"); wrapper.style.position="relative";
    const img=document.createElement("img"); img.src=item.image;
    img.onclick=()=>{ startBoard(); ctx.clearRect(0,0,canvas.width,canvas.height); const image=new Image(); image.src=item.image; image.onload=()=>ctx.drawImage(image,0,0);}
    const time=document.createElement("div"); time.style.fontSize="12px"; time.style.opacity="0.7"; time.textContent=new Date(item.time).toLocaleString();
    const del=document.createElement("button"); del.textContent="🗑️"; del.onclick=e=>{ e.stopPropagation(); if(!confirm("Delete this image?")) return; items.splice(index,1); setGallery(items); loadGallery();};
    wrapper.appendChild(img); wrapper.appendChild(time); wrapper.appendChild(del);
    container.appendChild(wrapper);
  });
}

// --- IMPORT ---
function startImport(){ const choice=prompt("1 = Gallery, 2 = Device"); if(choice==="1") openGallery(); if(choice==="2") importInput.click();}
importInput.addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file) return; saveState();
  const reader=new FileReader(); reader.onload=()=>{ const img=new Image(); img.src=reader.result; img.onload=()=>ctx.drawImage(img,0,0);}; reader.readAsDataURL(file);
});

// --- CANVAS RESIZE ---
function resizeCanvas(){
  const data=canvas.toDataURL();
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight-160;
  const img=new Image(); img.src=data; img.onload=()=>ctx.drawImage(img,0,0);
}
window.addEventListener("resize",resizeCanvas);
resizeCanvas();

// --- CURRENT CANVAS SAVE ---
function saveCurrentCanvas(){ localStorage.setItem("whiteboardCurrentCanvas", canvas.toDataURL()); }