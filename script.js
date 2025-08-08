const imageBtn = document.getElementById("imageBtn");
const videoBtn = document.getElementById("videoBtn");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileSelectBtn = document.getElementById("fileSelectBtn");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileIcon = document.getElementById("fileIcon");
const removeFileBtn = document.getElementById("removeFileBtn");
const videoOptions = document.getElementById("videoOptions");
const processBtn = document.getElementById("processBtn");

const previewContainer = document.getElementById("previewContainer");
const emptyPreview = document.getElementById("emptyPreview");
const mediaPreview = document.getElementById("mediaPreview");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");

const processStepper = document.getElementById("processStepper");
const progressBar = document.getElementById("progressBar");
const loadingAnimation = document.getElementById("loadingAnimation");
const loadingStatus = document.getElementById("loadingStatus");

const resultsSection = document.getElementById("resultsSection");
const detectionCanvas = document.getElementById("detectionCanvas");
const vehicleCount = document.getElementById("vehicleCount");
const confidenceScore = document.getElementById("confidenceScore");
const confidenceBar = document.getElementById("confidenceBar");
const processingTime = document.getElementById("processingTime");
const detectionDetails = document.getElementById("detectionDetails");
const downloadBtn = document.getElementById("downloadBtn");
const newFileBtn = document.getElementById("newFileBtn");

// State variables
let selectedFile = null;
let isImage = true;
let processingInterval;
let processingStartTime;

// Event Listeners
imageBtn.addEventListener("click", () => {
  isImage = true;
  imageBtn.classList.remove("bg-gray-200", "text-gray-700");
  imageBtn.classList.add("bg-blue-600", "text-white");
  videoBtn.classList.remove("bg-blue-600", "text-white");
  videoBtn.classList.add("bg-gray-200", "text-gray-700");
  videoOptions.classList.add("hidden");
  clearFileSelection();
});

videoBtn.addEventListener("click", () => {
  isImage = false;
  videoBtn.classList.remove("bg-gray-200", "text-gray-700");
  videoBtn.classList.add("bg-blue-600", "text-white");
  imageBtn.classList.remove("bg-blue-600", "text-white");
  imageBtn.classList.add("bg-gray-200", "text-gray-700");
  videoOptions.classList.remove("hidden");
  clearFileSelection();
});

fileSelectBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", handleFileSelect);

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("active");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("active");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("active");

  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelect();
  }
});

removeFileBtn.addEventListener("click", clearFileSelection);

processBtn.addEventListener("click", startProcessing);

downloadBtn.addEventListener("click", downloadResults);

newFileBtn.addEventListener("click", resetApp);

// Functions
function handleFileSelect() {
  if (fileInput.files.length) {
    selectedFile = fileInput.files[0];

    // Update file info display
    fileName.textContent = selectedFile.name;
    fileSize.textContent = formatFileSize(selectedFile.size);

    if (isImage) {
      fileIcon.className = "fas fa-image text-xl mr-3 text-blue-500";
    } else {
      fileIcon.className = "fas fa-video text-xl mr-3 text-blue-500";
    }

    fileInfo.classList.remove("hidden");
    emptyPreview.classList.add("hidden");
    mediaPreview.classList.remove("hidden");
    processBtn.disabled = false;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isImage) {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove("hidden");
        videoPreview.classList.add("hidden");
      } else {
        videoPreview.src = URL.createObjectURL(selectedFile);
        videoPreview.classList.remove("hidden");
        imagePreview.classList.add("hidden");
      }
    };
    reader.readAsDataURL(selectedFile);
  }
}

function clearFileSelection() {
  selectedFile = null;
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  mediaPreview.classList.add("hidden");
  emptyPreview.classList.remove("hidden");
  processBtn.disabled = true;
  imagePreview.src = "";
  videoPreview.src = "";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function startProcessing() {
  if (!selectedFile) return;

  processStepper.classList.remove("hidden");
  loadingAnimation.classList.remove("hidden");
  processStepper.scrollIntoView({ behavior: "smooth", block: "start" });
  processBtn.disabled = true;
  fileInput.disabled = true;

  updateProgress(10, "Uploading file...");

  const formData = new FormData();
  formData.append("file", selectedFile);

  // --- Tambahkan ini ---
  if (!isImage) {
    // Pastikan id inputnya sama seperti di html (id="frameNumber")
    const frameNumberInput = document.getElementById("frameNumber");
    // Default 0 kalau belum diisi
    const frameNumber = frameNumberInput ? frameNumberInput.value : 0;
    formData.append("frame_number", frameNumber);
  }
  // --- Akhir tambahan ---

  processingStartTime = Date.now();

  fetch("http://localhost:8000/detect", {
    method: "POST",
    body: formData,
  })
    .then((res) => {
      updateProgress(25, "Analyzing content...");
      return res.json();
    })
    .then((data) => {
      updateProgress(50, "Detecting objects...");

      setTimeout(() => {
        updateProgress(75, "Counting results...");

        setTimeout(() => {
          updateProgress(100, "Processing complete!");
          showResults(data);
        }, 800);
      }, 800);
    })
    .catch((err) => {
      alert("Gagal memproses file.");
      console.error(err);
    });
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

function updateProgress(percent, status) {
  progressBar.style.width = `${percent}%`;
  loadingStatus.textContent = status;

  // Update step indicators
  const steps = document.querySelectorAll(".step");
  steps.forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    const stepCircle = step.querySelector("div");
    const stepText = step.querySelector("span:last-child");

    if (percent >= (stepNum - 1) * 25) {
      stepCircle.classList.remove("bg-gray-200", "text-gray-600");
      stepCircle.classList.add("bg-blue-600", "text-white");
      stepText.classList.remove("text-gray-500");
      stepText.classList.add("text-gray-700");
    } else {
      stepCircle.classList.remove("bg-blue-600", "text-white");
      stepCircle.classList.add("bg-gray-200", "text-gray-600");
      stepText.classList.remove("text-gray-700");
      stepText.classList.add("text-gray-500");
    }
  });
}

function showResults(data) {
  loadingAnimation.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  // Total kendaraan: jumlah semua class!
  const totalVehicles = Object.values(data.counts).reduce(
    (sum, val) => sum + val,
    0
  );
  vehicleCount.textContent = totalVehicles;

  // Render bounding box seperti sebelumnya
  const ctx = detectionCanvas.getContext("2d");
  const img = new Image();
  img.onload = function () {
    detectionCanvas.width = img.width;
    detectionCanvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    data.detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      ctx.strokeStyle =
        det.class === "car"
          ? "#3B82F6"
          : det.class === "motorcycle"
          ? "#10B981"
          : det.class === "bus"
          ? "#F59E42"
          : det.class === "truck"
          ? "#6366F1"
          : "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      ctx.fillStyle = "#000000aa";
      ctx.fillRect(x1, y1 - 20, 100, 20);

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px sans-serif";
      ctx.fillText(
        `${det.class} (${Math.round(det.confidence * 100)}%)`,
        x1 + 5,
        y1 - 5
      );
    });
  };
  img.src = "data:image/jpeg;base64," + data.result_image;

  // Pakai hasil dari backend!
  const confidence = data.confidence ? Math.round(data.confidence * 100) : 0;
  confidenceScore.textContent = `${confidence}%`;
  confidenceBar.style.width = `${confidence}%`;

  processingTime.textContent = data.processing_time + " ms";

  // Generate detail semua class yg terdeteksi
  let detailsHTML = "";
  for (const [cls, count] of Object.entries(data.counts)) {
    let iconPath = "";
    if (cls === "car") iconPath = "/images/car.png";
    else if (cls === "motorcycle") iconPath = "/images/motorcycle.png";
    else if (cls === "bus") iconPath = "/images/bus.png";
    else if (cls === "truck") iconPath = "/images/truck.png";
    else if (cls === "bicycle") iconPath = "/images/bicycle.png";
    else iconPath = "/images/steering-wheel.png"; // default icon

    detailsHTML += `
    <div class="flex items-center mb-2">
      <img src="${iconPath}" class="w-6 h-6 mr-2 inline" alt="${cls} icon" />
      <span class="text-sm font-medium text-gray-700">${capitalize(
        cls
      )}: ${count}</span>
    </div>
  `;
  }
  detailsHTML += `<p class="text-xs text-gray-500">File: ${data.filename}</p>`;

  detectionDetails.innerHTML = detailsHTML;

  function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

function downloadResults() {
  const link = document.createElement("a");
  link.download = `vehicle-detection-${Date.now()}.png`;
  link.href = detectionCanvas.toDataURL("image/png");
  link.click();
}

function resetApp() {
  // Reset all UI elements
  clearFileSelection();
  processStepper.classList.add("hidden");
  resultsSection.classList.add("hidden");
  processBtn.disabled = true;
  fileInput.disabled = false;
  progressBar.style.width = "0%";
}
