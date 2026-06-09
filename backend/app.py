import sys
import os
from pathlib import Path


# Add root folder to sys.path so we can import utils and models successfully
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, UploadFile, File, Query, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import uuid
import shutil
import base64
import cv2
import numpy as np
import pandas as pd
import json
from io import BytesIO
from typing import Dict, List

from utils.video_processor import VideoProcessor
from utils.model_handler import ModelHandler
from utils.helper import BASE_DIR, metrics_collection, metrics_page



app = FastAPI(title="F1 Steering Angle Telemetry API")


@app.get("/api/debug")
def debug():
    return {
        "cwd": str(Path.cwd()),
        "models_exist": {
            "best-224.onnx": Path("models/best-224.onnx").exists(),
            "f1-steering-angle-model.onnx": Path("models/f1-steering-angle-model.onnx").exists(),
            "f1-steering-angle-model_100.onnx": Path("models/f1-steering-angle-model_100.onnx").exists(),
        }
    }
    
    
# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to the Next.js host
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active video analysis sessions
active_sessions: Dict[str, VideoProcessor] = {}
# Keep track of original filenames and video paths for metadata
session_metadata: Dict[str, dict] = {}

def ndarray_to_base64(img_np: np.ndarray, quality: int = 80) -> str:
    """Helper to convert OpenCV NumPy images (RGB/Grayscale) to base64 JPEGs for web rendering."""
    if img_np is None:
        return ""
    try:
        # OpenCV imencode expects BGR for 3-channel images or single-channel for grayscale.
        # Check if color image (3 channels)
        if len(img_np.shape) == 3 and img_np.shape[2] == 3:
            # Convert RGB to BGR
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_np
        
        _, buffer = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
        b64_str = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{b64_str}"
    except Exception as e:
        print(f"Error encoding image to base64: {e}")
        return ""

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/upload")
async def upload_video(
    file: UploadFile = File(None),
    demo: bool = Query(False)
):
    """
    Uploads a video or triggers Demo Mode using the local assets/demo_video.mp4.
    Initializes a VideoProcessor, extracts start/end thumbnails, and returns metadata.
    """
    # Track page visit metrics optionally
    try:
        if metrics_page is not None:
            metrics_page.update_one({"page": "inicio"}, {"$inc": {"visits": 1}}, upsert=True)
    except Exception as e:
        print("Optional MongoDB visit tracking skipped:", e)

    session_id = str(uuid.uuid4())
    vp = VideoProcessor()

    # Create temporary directory inside workspace for uploads if needed
    temp_dir = Path(BASE_DIR) / "scratch" / "uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)

    if demo:
        # Load local demo video
        demo_path = Path(BASE_DIR) / "assets" / "demo_video.mp4"
        if not demo_path.exists():
            raise HTTPException(status_code=404, detail="Demo video asset not found on server")
        
        filename = "demo_video.mp4"
        # Since vp.load_video expects a file-like object supporting .read()
        with open(demo_path, "rb") as f:
            vp.load_video(f)
    else:
        if not file:
            raise HTTPException(status_code=400, detail="No video file uploaded")
        
        filename = file.filename
        # Pass the uploaded file's binary stream
        vp.load_video(file.file)

    # Cache the session
    active_sessions[session_id] = vp
    
    # Extract metadata
    total_frames = vp.total_frames
    fps = vp.fps
    duration = round(total_frames / fps, 2) if fps > 0 else 0.0

    # Save session metadata
    session_metadata[session_id] = {
        "filename": filename,
        "total_frames": total_frames,
        "fps": fps,
        "duration": duration,
        "width": int(vp.cap.get(cv2.CAP_PROP_FRAME_WIDTH)) if vp.cap else 1920,
        "height": int(vp.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) if vp.cap else 1080,
    }

    # Convert start and end thumbnails to base64 dictionary lists
    start_thumbs = {}
    for frame_idx, img in vp.frames_list_start.items():
        start_thumbs[frame_idx] = ndarray_to_base64(img, quality=70)

    end_thumbs = {}
    for frame_idx, img in vp.frames_list_end.items():
        end_thumbs[frame_idx] = ndarray_to_base64(img, quality=70)

    return {
        "session_id": session_id,
        "filename": filename,
        "total_frames": total_frames,
        "fps": fps,
        "duration": duration,
        "start_frame_min": vp.start_frame_min,
        "start_frame_max": vp.start_frame_max,
        "end_frame_min": vp.end_frame_min,
        "end_frame_max": vp.end_frame_max,
        "start_thumbnails": start_thumbs,
        "end_thumbnails": end_thumbs,
        "width": session_metadata[session_id]["width"],
        "height": session_metadata[session_id]["height"],
    }

@app.get("/api/frame/{frame_number}")
def get_frame(session_id: str, frame_number: int):
    """Returns a base64 string of a specific video frame for timeline scrubbing."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    vp = active_sessions[session_id]
    frame = vp.get_frame_example(frame_number)
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not read frame")
    
    return {"frame": ndarray_to_base64(frame, quality=80)}

@app.get("/api/crop-preview")
def get_crop_preview(session_id: str, frame_number: int, driver_crop_type: str):
    """Returns a cropped steering wheel preview given a driver config and frame number."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    vp = active_sessions[session_id]
    
    # Load crop configuration for the selected driver
    try:
        vp.load_crop_variables(driver_crop_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid driver crop configuration: {str(e)}")
    
    frame = vp.get_frame_example(frame_number)
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not read frame")
    
    cropped = vp.crop_frame_example(frame)
    if cropped is None:
        raise HTTPException(status_code=400, detail="Could not crop frame")
    
    return {"crop_image": ndarray_to_base64(cropped, quality=85)}

@app.get("/api/video")
def get_video_stream(session_id: str):
    """Streams the raw MP4 video file of the session directly to the HTML video player."""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    vp = active_sessions[session_id]
    if not hasattr(vp, "video_path") or not vp.video_path or not os.path.exists(vp.video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(vp.video_path, media_type="video/mp4")

@app.websocket("/api/ws/analyze")
async def websocket_analyze(websocket: WebSocket):

    await websocket.accept()
    print("STEP 1 - websocket accepted")

    try:
        # 1. Receive analysis parameters
        data = await websocket.receive_text()
        print("STEP 2 - received websocket payload")

        config = json.loads(data)
        print("STEP 3 - parsed config")

        session_id = config.get("session_id")
        start_frame = int(config.get("start_frame", 0))
        end_frame = int(config.get("end_frame", -1))
        driver_crop_type = config.get("driver_crop_type")
        postprocessing_mode = config.get("postprocessing_mode", "Default")
        
        session_id = config.get("session_id")
        start_frame = int(config.get("start_frame", 0))
        end_frame = int(config.get("end_frame", -1))
        driver_crop_type = config.get("driver_crop_type")
        postprocessing_mode = config.get("postprocessing_mode", "Default")
        
        if not session_id or session_id not in active_sessions:
            await websocket.send_json({"stage": "Error", "progress": 0, "message": "Invalid session ID"})
            await websocket.close()
            return

        vp = active_sessions[session_id]
        print("STEP 4 - loaded session")

        mh = ModelHandler()
        print("STEP 5 - ModelHandler created")
        
        # Load configs
        vp.mode = postprocessing_mode

        vp.load_crop_variables(driver_crop_type)
        print("STEP 6 - crop variables loaded")

        mh.fps = vp.fps

        total_frames_range = end_frame - start_frame + 1
        
        # Step 1: Loading Session
        await websocket.send_json({
            "stage": "Loading Session",
            "progress": 5,
            "message": "Initializing model architecture and session configurations..."
        })
        
        print("STEP 7 - first websocket message sent")

        # Generate target frame indices matching the original video processor logic
        # Downsample target to original FPS (which is the default behavior in streamlit_app.py)
        fps_target = vp.fps
        selection_duration = total_frames_range / vp.fps
        frames_to_extract = max(1, int(selection_duration * fps_target))
        
        if frames_to_extract < total_frames_range:
            frame_indices = np.linspace(start_frame, end_frame, frames_to_extract, dtype=int)
        else:
            frame_indices = np.arange(start_frame, end_frame + 1)
        
        total_extract_count = len(frame_indices)
        preprocessed_frames = []
        
        # We process in batches of 16 to report incremental progress
        BATCH_SIZE = 16
        
        # Step 2-5: Frame Extraction and Preprocessing Loop
        for i in range(0, total_extract_count, BATCH_SIZE):
            batch_indices = frame_indices[i : i + BATCH_SIZE]
            
            for frame_idx in batch_indices:
                # Stage 2: Extracting Frames
                frame = vp.get_frame(frame_idx)
                if frame is None:
                    continue
                
                # Stage 3: Crop Steering Wheel
                cropped = vp.crop_frame(frame)
                
                # Stage 4: Helmet Segmentation (runs YOLO ONNX under the hood)
                masked = vp.mask_helmet(cropped)
                
                # Stage 5: CLAHE Contrast Adjustment
                clahe_img = vp.apply_clahe(masked)
                
                # Stage 5.5: Generate Edge Maps (Canny edge detection)
                thresh_img = vp.apply_treshold(clahe_img)
                
                preprocessed_frames.append(thresh_img)
            
            # Send progress updates
            current_progress = 10 + int((len(preprocessed_frames) / total_extract_count) * 60) # Scaled from 10% to 70%
            await websocket.send_json({
                "stage": "Frame Preprocessing",
                "progress": current_progress,
                "message": f"Preprocessed {len(preprocessed_frames)}/{total_extract_count} frames (Helmet Masking + Edge Maps)"
            })

        if not preprocessed_frames:
            await websocket.send_json({"stage": "Error", "progress": 0, "message": "Failed to extract frames"})
            await websocket.close()
            return

        # Stage 6: Running Steering Inference (runs EfficientNet-B0 ONNX)
        await websocket.send_json({
            "stage": "Running Steering Inference",
            "progress": 75,
            "message": "Executing steering angle prediction models via ONNX Runtime..."
        })
        
        # Process frames through model_handler
        raw_results = mh.process_frames(preprocessed_frames, "F1 Steering Angle Detection")
        
        # Stage 7: Correcting Outliers & Telemetry Calculations
        await websocket.send_json({
            "stage": "Correcting Outliers",
            "progress": 90,
            "message": "Applying cyclical outlier correction algorithms (trend-based)..."
        })
        
        # Export and run outlier correction
        df_results = mh.export_results(raw_results)
        
        # Clear processor memory cache
        vp.clear_cache()
        
        # Compute telemetry statistics
        mean_angle = float(df_results['steering_angle'].mean())
        max_right = float(df_results['steering_angle'].max())
        max_left = float(df_results['steering_angle'].min())
        
        angle_changes = abs(df_results['steering_angle'].diff().dropna())
        avg_change_rate = float(angle_changes.mean()) if not angle_changes.empty else 0.0

        # Optional MongoDB metrics log
        try:
            if metrics_collection is not None:
                metrics_collection.update_one(
                    {"action": "descargar_app"},
                    {"$inc": {"count": 1}},
                    upsert=True
                )
        except Exception as e:
            print("Optional MongoDB metrics logging skipped:", e)

        # Convert results to JSON records list
        results_records = df_results.to_dict(orient="records")

        # Stage 8: Completed
        await websocket.send_json({
            "stage": "Completed",
            "progress": 100,
            "message": "Analysis telemetry generated successfully!",
            "results": results_records,
            "statistics": {
                "mean_angle": round(mean_angle, 2),
                "max_right": round(max_right, 2),
                "max_left": round(max_left, 2),
                "avg_change_rate": round(avg_change_rate, 2)
            }
        })
        
    except WebSocketDisconnect:
        print("WebSocket disconnected client-side.")
    except Exception as e:
        print("Error during WebSocket analysis:", e)
        try:
            await websocket.send_json({
                "stage": "Error",
                "progress": 0,
                "message": f"Server processing error: {str(e)}"
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
