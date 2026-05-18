import base64
import os
import re
import sys
import zipfile
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from PIL import Image
from pydantic import BaseModel, Field


app = FastAPI(title="Samsam AI Inference API", version="0.2.0")

MODEL_ROOT = Path(os.getenv("SAMSAM_MODEL_ROOT", "/model"))
YOLOV5_ZIP = Path(os.getenv("SAMSAM_YOLOV5_ZIP", MODEL_ROOT / "04_ai_model_source" / "yolov5.zip"))
AGE_GRADE_WEIGHTS = Path(os.getenv("SAMSAM_AGE_GRADE_WEIGHTS", MODEL_ROOT / "05_trained_model_files" / "Age_Grade_best.pt"))
OBJECT_WEIGHTS = Path(os.getenv("SAMSAM_OBJECT_WEIGHTS", MODEL_ROOT / "05_trained_model_files" / "Object_best.pt"))
YOLOV5_EXTRACT_DIR = Path(os.getenv("SAMSAM_YOLOV5_DIR", "/tmp/samsam-yolov5"))


class PredictRequest(BaseModel):
    imageBase64: str = Field(min_length=32)
    source: str | None = None


class DetectionBox(BaseModel):
    label: str
    confidence: float
    x: float
    y: float
    width: float
    height: float


class PredictResponse(BaseModel):
    year: str
    grade: str
    confidence: float
    modelVersion: str
    boxes: list[DetectionBox]


def _decode_image(image_base64: str) -> Image.Image:
    if "," in image_base64 and image_base64.lstrip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64, validate=True)
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _ensure_yolov5_source() -> Path:
    source_dir = YOLOV5_EXTRACT_DIR / "yolov5"
    if source_dir.exists():
        return source_dir
    if not YOLOV5_ZIP.exists():
        raise FileNotFoundError(f"YOLOv5 source zip not found: {YOLOV5_ZIP}")
    YOLOV5_EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(YOLOV5_ZIP) as archive:
        archive.extractall(YOLOV5_EXTRACT_DIR)
    return source_dir


@lru_cache(maxsize=1)
def _load_age_grade_model() -> Any:
    if not AGE_GRADE_WEIGHTS.exists():
        raise FileNotFoundError(f"Age/grade model not found: {AGE_GRADE_WEIGHTS}")

    source_dir = _ensure_yolov5_source()
    source_text = str(source_dir)
    if source_text not in sys.path:
        sys.path.insert(0, source_text)

    import torch

    model = torch.hub.load(source_text, "custom", path=str(AGE_GRADE_WEIGHTS), source="local")
    model.conf = float(os.getenv("SAMSAM_YOLO_CONF", "0.25"))
    model.iou = float(os.getenv("SAMSAM_YOLO_IOU", "0.45"))
    model.eval()
    return model


def _class_name(model: Any, class_id: int) -> str:
    names = getattr(model, "names", {})
    if isinstance(names, dict):
        return str(names.get(class_id, class_id))
    if isinstance(names, list) and 0 <= class_id < len(names):
        return str(names[class_id])
    return str(class_id)


def _parse_year_grade(label: str) -> tuple[str, str]:
    normalized = label.replace("-", "_").replace(" ", "_")

    year_match = re.search(r"([456])\s*(?:년근|년|yr|year)", normalized, re.IGNORECASE)
    if year_match:
        year = f"{year_match.group(1)}년근"
    else:
        leading_number = re.match(r"([456])(?:_|$)", normalized)
        year = f"{leading_number.group(1)}년근" if leading_number else "판독 불가"

    if "특대" in normalized:
        grade = "대"
    elif "대" in normalized or re.search(r"(^|_)(large|big|l)(_|$)", normalized, re.IGNORECASE):
        grade = "대"
    elif "중" in normalized or re.search(r"(^|_)(medium|mid|m)(_|$)", normalized, re.IGNORECASE):
        grade = "중"
    elif "소" in normalized or re.search(r"(^|_)(small|s)(_|$)", normalized, re.IGNORECASE):
        grade = "소"
    else:
        grade = "판독 불가"

    return year, grade


def _to_detection(row: Any, image_width: int, image_height: int, model: Any) -> DetectionBox:
    x1, y1, x2, y2, confidence, class_id = row[:6].tolist()
    return DetectionBox(
        label=_class_name(model, int(class_id)),
        confidence=round(float(confidence), 4),
        x=round(max(float(x1), 0.0) / image_width, 4),
        y=round(max(float(y1), 0.0) / image_height, 4),
        width=round(max(float(x2 - x1), 0.0) / image_width, 4),
        height=round(max(float(y2 - y1), 0.0) / image_height, 4),
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "samsam-ai",
        "ageGradeModel": str(AGE_GRADE_WEIGHTS),
        "objectModel": str(OBJECT_WEIGHTS),
    }


@app.post("/v1/models/ginseng-age-grade:predict", response_model=PredictResponse)
def predict_ginseng_age_grade(request: PredictRequest):
    image = _decode_image(request.imageBase64)
    model = _load_age_grade_model()
    result = model(image, size=int(os.getenv("SAMSAM_YOLO_IMAGE_SIZE", "640")))
    predictions = result.xyxy[0]

    if len(predictions) == 0:
        return PredictResponse(
            year="판독 불가",
            grade="판독 불가",
            confidence=0.0,
            modelVersion="Age_Grade_best.pt",
            boxes=[],
        )

    detections = [_to_detection(row, image.width, image.height, model) for row in predictions]
    age_grade_detections = [
        detection
        for detection in detections
        if _parse_year_grade(detection.label) != ("판독 불가", "판독 불가")
    ]

    if not age_grade_detections:
        return PredictResponse(
            year="판독 불가",
            grade="판독 불가",
            confidence=0.0,
            modelVersion="Age_Grade_best.pt",
            boxes=detections,
        )

    best = max(age_grade_detections, key=lambda detection: detection.confidence)
    year, grade = _parse_year_grade(best.label)

    return PredictResponse(
        year=year,
        grade=grade,
        confidence=best.confidence,
        modelVersion="Age_Grade_best.pt",
        boxes=detections,
    )
