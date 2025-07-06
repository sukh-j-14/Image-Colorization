from fastapi import FastAPI, File, UploadFile, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from pymongo import MongoClient
from fastapi import HTTPException
import cv2
import numpy as np

app = FastAPI()

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
COLORIZED_DIR = "colorized"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(COLORIZED_DIR, exist_ok=True)

# MongoDB setup
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "colorization"
COLLECTION_NAME = "uploads"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
uploads_collection = db[COLLECTION_NAME]

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # Save uploaded file
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    # Colorization logic
    prototxt_path = '../colorization_deploy_v2.prototxt'
    model_path = '../colorization_release_v2.caffemodel'
    pts_in_hull_path = '../pts_in_hull.npy'
    net = cv2.dnn.readNetFromCaffe(prototxt_path, model_path)
    pts_in_hull = np.load(pts_in_hull_path)
    class8 = net.getLayerId("class8_ab")
    conv8 = net.getLayerId("conv8_313_rh")
    pts_in_hull = pts_in_hull.transpose().reshape(2, 313, 1, 1)
    net.getLayer(class8).blobs = [pts_in_hull.astype(np.float32)]
    net.getLayer(conv8).blobs = [np.full([1, 313], 2.606, dtype=np.float32)]
    image = cv2.imread(file_path)
    normalized = image.astype(np.float32) / 255.0
    lab = cv2.cvtColor(normalized, cv2.COLOR_BGR2LAB)
    resized = cv2.resize(lab, (224, 224))
    L = cv2.split(resized)[0]
    L -= 50
    net.setInput(cv2.dnn.blobFromImage(L))
    ab = net.forward()[0, :, :, :].transpose((1, 2, 0))
    ab = cv2.resize(ab, (image.shape[1], image.shape[0]))
    L_orig = cv2.split(lab)[0]
    colorized = np.concatenate((L_orig[:, :, np.newaxis], ab), axis=2)
    colorized = cv2.cvtColor(colorized, cv2.COLOR_LAB2BGR)
    colorized = (255.0 * colorized).astype(np.uint8)
    colorized_filename = f"{timestamp}_colorized_{file.filename}"
    colorized_path = os.path.join(COLORIZED_DIR, colorized_filename)
    cv2.imwrite(colorized_path, colorized)
    # Insert upload record into MongoDB
    record = {
        "original_filename": file.filename,
        "saved_filename": filename,
        "colorized_filename": colorized_filename,
        "upload_time": datetime.utcnow(),
    }
    uploads_collection.insert_one(record)
    return JSONResponse({"message": "File uploaded and colorized", "filename": filename, "colorized_filename": colorized_filename})

@app.get("/history")
def get_history():
    records = list(uploads_collection.find({}, {"_id": 0, "original_filename": 1, "saved_filename": 1, "upload_time": 1}).sort("upload_time", -1))
    # Convert upload_time to ISO string
    for r in records:
        if "upload_time" in r:
            r["upload_time"] = r["upload_time"].isoformat()
    return JSONResponse(records)

@app.get("/download/{filename}")
def download_image(filename: str, type: str = Query("colorized", enum=["colorized", "upload"])):
    if type == "colorized":
        file_path = os.path.join(COLORIZED_DIR, filename)
    else:
        file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="image/jpeg", filename=filename) 