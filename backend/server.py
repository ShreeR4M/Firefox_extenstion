from typing import Dict, List
import time
from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import io
import uvicorn
import base64
from contextlib import asynccontextmanager


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()


app = FastAPI(lifespan=lifespan)

api_router = APIRouter(prefix="/api")

TRACKING_PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)

class EmailTrack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email_subject: str
    recipient_email: str
    sender_email: str
    tracking_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    opened_at: Optional[datetime] = None
    last_opened_at: Optional[datetime] = None
    is_opened: bool = False
    open_count: int = 0
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

class EmailTrackCreate(BaseModel):
    email_subject: str
    recipient_email: str
    sender_email: str

class EmailOpen(BaseModel):
    tracking_id: str
    opened_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Firefox Email Tracker API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/track/email", response_model=EmailTrack)
async def create_email_track(email_data: EmailTrackCreate):
    email_track = EmailTrack(**email_data.dict())
    await db.email_tracks.insert_one(email_track.dict())
    return email_track

@api_router.get("/track/emails", response_model=List[EmailTrack])
async def get_tracked_emails(sender_email: Optional[str] = None):
    query = {}
    if sender_email:
        query["sender_email"] = sender_email
    
    emails = await db.email_tracks.find(query).sort("sent_at", -1).to_list(1000)
    return [EmailTrack(**email) for email in emails]

@api_router.get("/track/email/{tracking_id}", response_model=EmailTrack)
async def get_email_tracking_status(tracking_id: str):
    
    email = await db.email_tracks.find_one({"tracking_id": tracking_id})
    if not email:
        return {"error": "Tracking ID not found"}
    return EmailTrack(**email)

@api_router.get("/pixel/{tracking_id}")
async def serve_tracking_pixel(tracking_id: str, request: Request):
    
    user_agent = request.headers.get("user-agent", "Unknown")
    forwarded_for = request.headers.get("x-forwarded-for")
    ip_address = forwarded_for.split(",")[0] if forwarded_for else request.client.host
    
    email_track = await db.email_tracks.find_one({"tracking_id": tracking_id})
    if email_track:
        update_data = {
            "is_opened": True,
            "open_count": email_track.get("open_count", 0) + 1,
            "last_opened_at": datetime.utcnow(),
            "user_agent": user_agent,
            "ip_address": ip_address
        }
        
        if not email_track.get("opened_at"):
            update_data["opened_at"] = datetime.utcnow()
        
        await db.email_tracks.update_one(
            {"tracking_id": tracking_id},
            {"$set": update_data}
        )
    
    return StreamingResponse(
        io.BytesIO(TRACKING_PIXEL),
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@api_router.post("/track/open/{tracking_id}")

async def log_email_open(tracking_id: str, request: Request):
    user_agent = request.headers.get("user-agent", "Unknown")
    forwarded_for = request.headers.get("x-forwarded-for")
    ip_address = forwarded_for.split(",")[0] if forwarded_for else request.client.host
    
    email_track = await db.email_tracks.find_one({"tracking_id": tracking_id})
    if email_track:
        update_data = {
            "is_opened": True,
            "open_count": email_track.get("open_count", 0) + 1,
            "last_opened_at": datetime.utcnow(),
            "user_agent": user_agent,
            "ip_address": ip_address
        }
        
        if not email_track.get("opened_at"):
            update_data["opened_at"] = datetime.utcnow()
        
        await db.email_tracks.update_one(
            {"tracking_id": tracking_id},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "Email open logged"}
    
    return {"success": False, "message": "Tracking ID not found"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging    .getLogger(__name__)

# @app.on_event("shutdown")
# async def shutdown_db_client():
#     client.close()

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)