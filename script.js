// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const galleryContainer = document.getElementById('galleryContainer');
const galleryGrid = document.getElementById('galleryGrid');
const fileCountBadge = document.getElementById('fileCountBadge');
const detectBtn = document.getElementById('detectBtn');
const btnLoader = document.getElementById('btnLoader');
const btnText = detectBtn.querySelector('span');

const visEmptyState = document.getElementById('visEmptyState');
const canvasWrapper = document.getElementById('canvasWrapper');
const previewImage = document.getElementById('previewImage');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx = overlayCanvas.getContext('2d');

const jsonOutput = document.getElementById('jsonOutput');
const ocrPanel = document.getElementById('ocrPanel');
const copyJsonBtn = document.getElementById('copyJsonBtn');

// Colors matching our CSS variables
const COLORS = {
    'PartDrawing': '#ff7b72', // --c-part
    'Table': '#79c0ff',       // --c-table
    'Note': '#d2a8ff'         // --c-note
};

// State
let filesData = []; // Array of { id, file, imageSrc, result, status: 'idle'|'processing'|'done', element }
let activeFileId = null;

// Config API - Thay đổi đường dẫn này thành URL thực tế của ứng dụng trên Hugging Face Spaces của bạn
const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:"
                        ? "http://127.0.0.1:7860" // Chạy qua uvicorn ở localhost (7860 tương đồng HF Spaces mặc định)
                        : "https://akumahebi-be-demo.hf.space";


// ==== Event Listeners ==== //

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files) handleFileSelect(e.target.files);
});

detectBtn.addEventListener('click', runBatchDetection);

copyJsonBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonOutput.innerText).then(() => {
        const originalIcon = copyJsonBtn.innerHTML;
        copyJsonBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ea043" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => { copyJsonBtn.innerHTML = originalIcon; }, 2000);
    });
});

// ==== Core Functions ==== //

async function handleFileSelect(files) {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    // Clear dữ liệu upload và UI hiển thị cũ 
    filesData = [];
    galleryGrid.innerHTML = '';
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    jsonOutput.textContent = '';
    ocrPanel.innerHTML = '';
    visEmptyState.classList.remove('hidden');
    canvasWrapper.classList.add('hidden');
    activeFileId = null;
    
    for (const file of newFiles) {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const imageSrc = await readFileAsDataURL(file);
        
        const fileObj = {
            id,
            file,
            imageSrc,
            result: null,
            status: 'idle',
            element: createThumbnailElement(id, imageSrc, file.name)
        };
        
        filesData.push(fileObj);
        galleryGrid.appendChild(fileObj.element);
    }
    
    updateGalleryUI();
    if (filesData.length > 0 && !activeFileId) {
        setActiveFile(filesData[0].id);
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function createThumbnailElement(id, src, name) {
    const div = document.createElement('div');
    div.className = 'thumbnail';
    div.dataset.id = id;
    div.innerHTML = `
        <img src="${src}" alt="${name}">
        <div class="thumbnail-status"></div>
    `;
    div.addEventListener('click', () => setActiveFile(id));
    return div;
}

function updateGalleryUI() {
    if (filesData.length > 0) {
        galleryContainer.classList.remove('hidden');
        fileCountBadge.textContent = filesData.length;
        detectBtn.disabled = false;
    }
}

function setActiveFile(id) {
    activeFileId = id;
    const fileObj = filesData.find(f => f.id === id);
    
    // UI Update
    filesData.forEach(f => f.element.classList.toggle('active', f.id === id));
    
    // Clear Canvas and Panels
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Load image for visualization
    const img = new Image();
    img.onload = () => {
        visEmptyState.classList.add('hidden');
        canvasWrapper.classList.remove('hidden');
        previewImage.src = img.src;
        overlayCanvas.width = img.naturalWidth;
        overlayCanvas.height = img.naturalHeight;
        
        // If results exist, render them
        if (fileObj.result) {
            renderResults(fileObj.result);
        } else {
            jsonOutput.textContent = JSON.stringify({ status: fileObj.status, image: fileObj.file.name }, null, 2);
            ocrPanel.innerHTML = '<div class="empty-state"><p>Analysis pending for this file.</p></div>';
        }
    };
    img.src = fileObj.imageSrc;
}

async function runBatchDetection() {
    setProcessingState(true);
    
    const pendingFiles = filesData.filter(f => f.status !== 'done');
    
    for (const fileObj of pendingFiles) {
        fileObj.status = 'processing';
        fileObj.element.classList.add('processing');
        
        // Thực hiện kết nối tới Backend FastAPI thông qua FormData
        try {
            const formData = new FormData();
            formData.append("file", fileObj.file);

            const response = await fetch(`${BACKEND_URL}/api/detect`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            fileObj.result = data;
            
        } catch (error) {
            console.error(`[Error] Khong the phan tich ${fileObj.file.name}:`, error);
            // Ghi nhận lỗi vào kết quả để UI hiển thị lỗi mà không crash
            fileObj.result = { 
                image: fileObj.file.name, 
                objects: [],
                error: error.message 
            };
        }
        
        fileObj.status = 'done';
        fileObj.element.classList.remove('processing');
        fileObj.element.classList.add('processed');
        
        // If this is the active file, update viewer immediately
        if (fileObj.id === activeFileId) {
            renderResults(fileObj.result);
        }
    }
    
    setProcessingState(false);
}

function renderResults(result) {
    // 1. JSON
    jsonOutput.textContent = JSON.stringify(result, null, 2);
    
    // 2. Canvas
    drawBoundingBoxes(result.objects);
    
    // 3. OCR
    renderOcrContent(result.objects);
}

function drawBoundingBoxes(objects) {
    const drawLineWidth = Math.max(2, overlayCanvas.width / 400);
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    objects.forEach(obj => {
        const color = COLORS[obj.class] || '#fff';
        ctx.beginPath();
        ctx.lineWidth = drawLineWidth;
        ctx.strokeStyle = color;
        ctx.rect(obj.bbox.x1, obj.bbox.y1, obj.bbox.x2 - obj.bbox.x1, obj.bbox.y2 - obj.bbox.y1);
        ctx.stroke();

        const fontSize = Math.max(14, overlayCanvas.width / 60);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const text = `${obj.class} ${(obj.confidence * 100).toFixed(0)}%`;
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = color;
        ctx.fillRect(obj.bbox.x1, obj.bbox.y1 - fontSize - 10, textWidth + 10, fontSize + 10);
        ctx.fillStyle = '#000';
        ctx.fillText(text, obj.bbox.x1 + 5, obj.bbox.y1 - 10);
    });
}

function renderOcrContent(objects) {
    const ocrObjects = objects.filter(obj => obj.ocr_content);
    if (ocrObjects.length === 0) {
        ocrPanel.innerHTML = '<div class="empty-state"><p>No text detected.</p></div>';
        return;
    }
    
    ocrPanel.innerHTML = ocrObjects.map(obj => `
        <div class="ocr-item ${obj.class.toLowerCase()}">
            <div class="ocr-meta">
                <span class="ocr-badge ${obj.class.toLowerCase()}">${obj.class}</span>
                <span>${(obj.confidence * 100).toFixed(1)}%</span>
            </div>
            <div class="ocr-text">${escapeHtml(obj.ocr_content)}</div>
        </div>
    `).join('');
}

function setProcessingState(isProcessing) {
    detectBtn.disabled = isProcessing;
    if (isProcessing) {
        btnLoader.classList.remove('hidden');
        btnText.textContent = "Analyzing All...";
    } else {
        btnLoader.classList.add('hidden');
        btnText.textContent = "Analyze All Files";
    }
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
