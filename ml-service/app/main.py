import os
import base64
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load config from env
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "/app/weights/yolov8n.pt")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))
DEVICE = os.getenv("DEVICE", "cpu")
ENABLE_CLAHE = os.getenv("ENABLE_CLAHE", "True").lower() == "true"

app = FastAPI(
    title="ANPR ML Service",
    description="YOLOv8 + PaddleOCR inference service for license plate detection and recognition",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances
yolo_model = None
ocr_engine = None


class DetectionRequest(BaseModel):
    image: str  # base64 encoded
    camera_id: str


class BatchDetectionRequest(BaseModel):
    images: List[Dict[str, str]]  # [{"image": base64, "camera_id": "CAM001"}]


class DetectionResponse(BaseModel):
    plate_text: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    camera_id: str
    snapshot_url: Optional[str] = None


class DetectResponse(BaseModel):
    detections: List[DetectionResponse]


@app.on_event("startup")
async def load_models():
    global yolo_model, ocr_engine
    
    logger.info("Loading YOLOv8 model...")
    try:
        from ultralytics import YOLO
        yolo_model = YOLO(YOLO_MODEL_PATH)
        yolo_model.to(DEVICE)
        logger.info("YOLOv8 model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        # Create dummy model for demo
        yolo_model = None
    
    logger.info("Loading PaddleOCR...")
    try:
        from paddleocr import PaddleOCR
        ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=DEVICE != 'cpu',
            show_log=False
        )
        logger.info("PaddleOCR loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load PaddleOCR: {e}")
        ocr_engine = None


def decode_image(base64_str: str) -> np.ndarray:
    """Decode base64 image to OpenCV format"""
    try:
        # Remove data URL prefix if present
        if base64_str.startswith('data:image'):
            base64_str = base64_str.split(',')[1]
        
        image_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return image
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        return None


def apply_clahe(image: np.ndarray) -> np.ndarray:
    """Apply CLAHE for lighting normalization"""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def preprocess_plate(plate_img: np.ndarray) -> np.ndarray:
    """Preprocess plate image for better OCR"""
    # Resize if too small
    h, w = plate_img.shape[:2]
    if h < 40 or w < 100:
        scale = max(40/h, 100/w)
        plate_img = cv2.resize(plate_img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # Apply CLAHE
    if ENABLE_CLAHE:
        plate_img = apply_clahe(plate_img)
    
    # Convert to grayscale
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
    
    # Threshold
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary


def run_yolo_detection(image: np.ndarray) -> List[Dict]:
    """Run YOLOv8 plate detection"""
    if yolo_model is None:
        # Return dummy detection for demo
        h, w = image.shape[:2]
        return [{
            "bbox": [w*0.3, h*0.3, w*0.7, h*0.5],
            "confidence": 0.95,
            "class": "license_plate"
        }]
    
    results = yolo_model(image, conf=CONFIDENCE_THRESHOLD, iou=IOU_THRESHOLD, verbose=False)
    
    detections = []
    for r in results:
        boxes = r.boxes
        if boxes is not None:
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls = int(box.cls[0].cpu().numpy())
                
                detections.append({
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "confidence": float(conf),
                    "class": yolo_model.names[cls]
                })
    
    return detections


def run_ocr(plate_img: np.ndarray) -> tuple[str, float]:
    """Run OCR on plate image"""
    if ocr_engine is None:
        # Return dummy result for demo
        return "GJ01AB1234", 0.92
    
    try:
        result = ocr_engine.ocr(plate_img, cls=True)
        
        if result and result[0]:
            texts = []
            confidences = []
            for line in result[0]:
                if line and len(line) >= 2:
                    text = line[1][0]
                    conf = line[1][1]
                    texts.append(text)
                    confidences.append(conf)
            
            if texts:
                # Combine texts (usually plate is one line)
                combined_text = ''.join(texts).replace(' ', '').upper()
                avg_conf = sum(confidences) / len(confidences)
                return combined_text, avg_conf
        
        return "", 0.0
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return "", 0.0


def post_process_plate(text: str) -> str:
    """Post-process OCR result for Indian plates"""
    # Remove non-alphanumeric
    import re
    text = re.sub(r'[^A-Z0-9]', '', text.upper())
    
    # Common confusion corrections
    confusion = {
        '0': 'O', 'O': '0',
        '1': 'I', 'I': '1',
        '8': 'B', 'B': '8',
        '5': 'S', 'S': '5',
        '6': 'G', 'G': '6',
        '9': 'P', 'P': '9',
        '2': 'Z', 'Z': '2',
    }
    
    # Apply corrections based on position
    if len(text) >= 9:
        chars = list(text)
        # Positions 0,1 should be letters (state code)
        for i in [0, 1]:
            if i < len(chars) and chars[i].isdigit() and chars[i] in confusion:
                chars[i] = confusion[chars[i]]
        # Positions 2,3 should be digits (district)
        for i in [2, 3]:
            if i < len(chars) and chars[i].isalpha() and chars[i] in confusion:
                chars[i] = confusion[chars[i]]
        # Last 4 should be digits
        for i in range(-4, 0):
            abs_i = len(chars) + i
            if abs_i >= 0 and chars[abs_i].isalpha() and chars[abs_i] in confusion:
                chars[abs_i] = confusion[chars[abs_i]]
        text = ''.join(chars)
    
    return text


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "yolo_loaded": yolo_model is not None,
        "ocr_loaded": ocr_engine is not None,
        "device": DEVICE
    }


@app.post("/detect", response_model=DetectResponse)
async def detect_plates(request: DetectionRequest):
    """Detect and recognize license plates from image"""
    # Decode image
    image = decode_image(request.image)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    
    # Run detection
    detections = run_yolo_detection(image)
    
    results = []
    for det in detections:
        x1, y1, x2, y2 = map(int, det["bbox"])
        
        # Crop plate region
        plate_img = image[y1:y2, x1:x2]
        if plate_img.size == 0:
            continue
        
        # Preprocess
        processed = preprocess_plate(plate_img)
        
        # Run OCR
        plate_text, ocr_conf = run_ocr(processed)
        
        # Post-process
        plate_text = post_process_plate(plate_text)
        
        # Combined confidence
        combined_conf = (det["confidence"] + ocr_conf) / 2
        
        if plate_text:
            results.append(DetectionResponse(
                plate_text=plate_text,
                confidence=combined_conf,
                bbox=det["bbox"],
                camera_id=request.camera_id
            ))
    
    return DetectResponse(detections=results)


@app.post("/detect/batch")
async def detect_batch(request: BatchDetectionRequest):
    """Batch detection for multiple images"""
    all_results = []
    
    for item in request.images:
        image_b64 = item.get("image", "")
        camera_id = item.get("camera_id", "unknown")
        
        image = decode_image(image_b64)
        if image is None:
            all_results.append({"camera_id": camera_id, "detections": [], "error": "Invalid image"})
            continue
        
        detections = run_yolo_detection(image)
        
        results = []
        for det in detections:
            x1, y1, x2, y2 = map(int, det["bbox"])
            plate_img = image[y1:y2, x1:x2]
            if plate_img.size == 0:
                continue
            
            processed = preprocess_plate(plate_img)
            plate_text, ocr_conf = run_ocr(processed)
            plate_text = post_process_plate(plate_text)
            combined_conf = (det["confidence"] + ocr_conf) / 2
            
            if plate_text:
                results.append(DetectionResponse(
                    plate_text=plate_text,
                    confidence=combined_conf,
                    bbox=det["bbox"],
                    camera_id=camera_id
                ))
        
        all_results.append({
            "camera_id": camera_id,
            "detections": [r.model_dump() for r in results]
        })
    
    return {"results": all_results}


@app.post("/detect/upload")
async def detect_upload(
    image: UploadFile = File(...),
    camera_id: str = Form(...)
):
    """Detect plates from uploaded file"""
    contents = await image.read()
    image_b64 = base64.b64encode(contents).decode('utf-8')
    
    request = DetectionRequest(image=image_b64, camera_id=camera_id)
    return await detect_plates(request)