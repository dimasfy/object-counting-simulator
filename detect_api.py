import subprocess
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from typing import Dict
from glob import glob
from PIL import Image
import cv2
from fastapi import Form
import base64
import time
import datetime
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS untuk frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Konfigurasi path
MODEL_PATH = "runs/train/exp12/weights/best.pt"
IMAGE_DIR = "inference/images"
OUTPUT_DIR = "runs/detect"

os.makedirs(IMAGE_DIR, exist_ok=True)

def is_video(filename):
    return filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv'))

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.post("/detect")
async def detect_vehicle(
    file: UploadFile = File(...), 
    frame_number: int = Form(0)
) -> Dict:
    input_path = Path(IMAGE_DIR) / file.filename
    with open(input_path, "wb") as f:
        f.write(await file.read())

    # --- Start timing ---
    start_time = time.time()

    # --- Cek dan ambil frame kalau video ---
    if is_video(file.filename):
        cap = cv2.VideoCapture(str(input_path))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        target_frame = min(frame_number, total_frames - 1)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()
        cap.release()
        if not ret:
            raise RuntimeError("Cannot read video file or extract frame.")

        now = datetime.datetime.now()
        time_str = now.strftime("%Y%m%d-%H%M%S")
        frame_filename = f"{input_path.stem}_frame{target_frame}_{time_str}.jpg"
        img_path = input_path.parent / frame_filename
        cv2.imwrite(str(img_path), frame)
        yolo_source = img_path
    else:
        yolo_source = input_path

    # Jalankan YOLOv5
    cmd = [
        "python", "detect.py",
        "--weights", MODEL_PATH,
        "--source", str(yolo_source),
        "--conf-thres", "0.25",
        "--save-txt",
        "--save-conf"
    ]
    subprocess.run(cmd, capture_output=True)

    img = Image.open(yolo_source)
    img_w, img_h = img.size

    exp_dirs = sorted(Path(OUTPUT_DIR).glob("exp*"), key=os.path.getmtime, reverse=True)
    latest_exp = exp_dirs[0] if exp_dirs else None
    # Gunakan nama label file yang sesuai frame unik
    label_file = latest_exp / "labels" / (yolo_source.stem + ".txt") if latest_exp else None

    counts = {}
    detections = []
    confidence_list = []

    if label_file and label_file.exists():
        print("DEBUG - Baca label file:", label_file)
        with open(label_file) as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) < 6:
                    continue
                try:
                    cls_id = int(float(parts[0]))
                    print("DEBUG - Detected class id:", cls_id)   # Tambah print ini
                except Exception as e:
                    print("Invalid class id:", parts[0], e)
                    continue
                cls_id = int(parts[0])
                x_c, y_c, w, h = map(float, parts[1:5])
                conf = float(parts[5])
                confidence_list.append(conf)
                x1 = int((x_c - w / 2) * img_w)
                y1 = int((y_c - h / 2) * img_h)
                x2 = int((x_c + w / 2) * img_w)
                y2 = int((y_c + h / 2) * img_h)
                class_name = get_class_name(cls_id)
                counts[class_name] = counts.get(class_name, 0) + 1
                detections.append({
                    "class": class_name,
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2]
                })

    # Rata-rata confidence (kalau tidak ada deteksi, kasih 0)
    avg_confidence = sum(confidence_list) / len(confidence_list) if confidence_list else 0

    # Hasil deteksi gambar (base64)
    result_img_path = latest_exp / yolo_source.name
    img_base64 = ""
    if result_img_path.exists():
        with open(result_img_path, "rb") as fimg:
            img_base64 = base64.b64encode(fimg.read()).decode("utf-8")

    processing_time = int((time.time() - start_time) * 1000)  # ms

    return {
        "filename": yolo_source.name,   # nama unik frame yang dideteksi
        "counts": counts,
        "detections": detections,
        "result_image": img_base64,
        "confidence": avg_confidence,        # <-- dikirim ke frontend
        "processing_time": processing_time   # <-- dikirim ke frontend
    }

def get_class_name(cls_id: int) -> str:
    label_map = {
        0: "car",
        1: "motorcycle",
        2: "bus",
        3: "truck",
        4: "bicycle"
    }
    return label_map.get(cls_id, f"class_{cls_id}")
