from fastapi import FastAPI, HTTPException, WebSocket, BackgroundTasks, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import re
import os
import sys
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from handleYDL import get_infos
import engine

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.error(f"Validation error: {exc.errors()}\nBody: {body.decode()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body.decode()},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active websocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

class VideoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    quality: Optional[str] = "bestvideo[height<=1080]+bestaudio/best[height<=1080]"
    split: Optional[bool] = False
    selected_chapters: Optional[List[int]] = None
    outdir: Optional[str] = ""

@app.post("/api/info")
async def get_video_info(request: VideoRequest):
    try:
        # Get basic info using ydl
        options = {'quiet': True}
        # Note: get_infos is imported from handleYDL
        infos = get_infos(request.url, options)
        
        # Extract chapters using engine's logic
        chapters = engine.get_chapters(infos['description'])
        
        thumbnail = infos.get('thumbnail') or (infos.get('thumbnails', [{}])[-1].get('url') if infos.get('thumbnails') else None)
        
        return {
            "title": infos['title'],
            "description": infos['description'],
            "duration": infos['duration'],
            "thumbnail": thumbnail,
            "chapters": [{"index": c[0], "time": c[1], "name": c[2]} for c in chapters]
        }
    except Exception as e:
        print(f"Error fetching info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Store active download states
# url -> {"status": "downloading"|"paused", "stop_requested": bool}
active_downloads = {}

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)

@app.post("/api/pause")
async def pause_download(request: VideoRequest):
    if request.url in active_downloads:
        active_downloads[request.url]["stop_requested"] = True
        return {"status": "pausing"}
    raise HTTPException(status_code=404, detail="No active download found for this URL")

@app.post("/api/download")
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    main_loop = asyncio.get_running_loop()
    
    # Reset or initialize state
    active_downloads[request.url] = {"status": "downloading", "stop_requested": False}

    def run_download():
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

        def sync_progress_hook(d):
            # Check for pause/stop request
            if active_downloads.get(request.url, {}).get("stop_requested"):
                raise Exception("DOWNLOAD_STOPPED_BY_USER")

            if d['status'] == 'downloading':
                p = ansi_escape.sub('', d.get('_percent_str', '0%')).strip()
                speed = ansi_escape.sub('', d.get('_speed_str', 'N/A')).strip().replace('iB/s', 'B/s')
                eta = ansi_escape.sub('', d.get('_eta_str', 'N/A')).strip()
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({
                        "type": "progress",
                        "percent": p,
                        "speed": speed,
                        "eta": eta,
                        "message": "Downloading..."
                    }),
                    main_loop
                )
            elif d['status'] == 'finished':
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({
                        "type": "progress",
                        "percent": "100%",
                        "message": "Processing chapters..."
                    }),
                    main_loop
                )

        try:
            results = engine.run_engine(
                links=[request.url],
                quality=request.quality,
                split=request.split,
                selected_chapters=request.selected_chapters,
                outdir=request.outdir,
                progress_callback=sync_progress_hook
            )
            
            # Clean up active download on finish
            active_downloads.pop(request.url, None)
            
            asyncio.run_coroutine_threadsafe(
                manager.broadcast({
                    "type": "done",
                    "results": results
                }),
                main_loop
            )
        except Exception as e:
            if str(e) == "DOWNLOAD_STOPPED_BY_USER":
                active_downloads[request.url]["status"] = "paused"
                active_downloads[request.url]["stop_requested"] = False
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({
                        "type": "paused",
                        "url": request.url
                    }),
                    main_loop
                )
            else:
                active_downloads.pop(request.url, None)
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({
                        "type": "error",
                        "message": str(e)
                    }),
                    main_loop
                )

    background_tasks.add_task(run_download)
    return {"status": "started", "message": "Download initiated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
