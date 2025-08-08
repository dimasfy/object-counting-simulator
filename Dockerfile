# 1. Gunakan base image Python (gunakan slim/buster agar kompatibel OpenCV)
FROM python:3.10-slim

# 2. Install OS dependencies (opencv, pillow butuh libgl, ffmpeg, dsb)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsm6 libxext6 libgl1-mesa-glx git \
    && rm -rf /var/lib/apt/lists/*

# 3. Buat folder kerja
WORKDIR /app

# 4. Copy requirements dulu agar caching efisien
COPY requirements.txt .

# 5. Install python dependencies
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 6. Copy seluruh source code ke container
COPY . .
COPY runs/ runs/

# 7. Expose port FastAPI (default 8000)
EXPOSE 8000

# Backend
CMD ["uvicorn", "detect_api:app", "--host", "0.0.0.0", "--port", "8000"]
