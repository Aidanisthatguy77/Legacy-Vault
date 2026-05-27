from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import zipfile
import tempfile
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import shutil
import base64
import httpx
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

# Game Models
class GameBase(BaseModel):
    title: str
    year: str
    cover_image: str
    hook_text: str
    cover_athletes: str
    description: str
    youtube_embed: Optional[str] = None
    order: int = 0
    is_active: bool = True

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    title: Optional[str] = None
    year: Optional[str] = None
    cover_image: Optional[str] = None
    hook_text: Optional[str] = None
    cover_athletes: Optional[str] = None
    description: Optional[str] = None
    youtube_embed: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class Game(GameBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Comment Models
class CommentCreate(BaseModel):
    author_name: str
    content: str
    parent_id: Optional[str] = None
    is_admin: bool = False

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_name: str
    content: str
    parent_id: Optional[str] = None
    is_admin: bool = False
    likes: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    replies: List["Comment"] = []

# Email Subscription Model
class EmailSubscriptionCreate(BaseModel):
    email: str

class EmailSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    subscribed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Petition Signature Model
class PetitionSignCreate(BaseModel):
    name: str
    location: Optional[str] = None

class PetitionSign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: Optional[str] = None
    signed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Admin Auth Model
class AdminLogin(BaseModel):
    password: str

# Clip/Media Model
class ClipCreate(BaseModel):
    game_id: str
    title: str
    platform: str  # youtube, tiktok, instagram, twitter
    embed_url: str
    description: Optional[str] = None
    order: int = 0

class ClipUpdate(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    embed_url: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

class Clip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_id: str
    title: str
    platform: str
    embed_url: str
    description: Optional[str] = None
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Site Content Model (for editable sections)
class SiteContentUpdate(BaseModel):
    key: str
    value: str

class SiteContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str
    value: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Proof of Demand Model
class ProofCreate(BaseModel):
    image_url: str
    title: str
    description: Optional[str] = None
    source: Optional[str] = None
    order: int = 0

class ProofUpdate(BaseModel):
    image_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    order: Optional[int] = None

class Proof(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: str
    title: str
    description: Optional[str] = None
    source: Optional[str] = None
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Vault Mockup Model
class MockupCreate(BaseModel):
    title: str
    description: str
    media_type: str = "image"  # "image" or "video"
    image_url: Optional[str] = None
    video_embed_url: Optional[str] = None
    order: int = 0

class MockupUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_type: Optional[str] = None
    image_url: Optional[str] = None
    video_embed_url: Optional[str] = None
    order: Optional[int] = None

class Mockup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    media_type: str = "image"
    image_url: Optional[str] = None
    video_embed_url: Optional[str] = None
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ SYSTEM HEALTH CHECK (ENHANCED) ============

class SystemHealth(BaseModel):
    status: str
    timestamp: str
    services: dict
    database: dict
    uptime: str

@api_router.get("/health")
async def health_check():
    """Comprehensive health check endpoint for System Pulse monitoring"""
    import time
    start_time = time.time()
    
    health_data = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "online",
            "ai": "unknown"
        },
        "database": {
            "status": "unknown",
            "collections": 0
        },
        "uptime": "active"
    }
    
    # Check database connectivity
    try:
        collections = await db.list_collection_names()
        health_data["database"]["status"] = "connected"
        health_data["database"]["collections"] = len(collections)
        health_data["database"]["latency_ms"] = round((time.time() - start_time) * 1000, 2)
    except Exception as e:
        health_data["database"]["status"] = "error"
        health_data["database"]["error"] = str(e)
        health_data["status"] = "degraded"
    
    # Check if LLM is available
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        health_data["services"]["ai"] = "configured" if llm_key else "not_configured"
    except Exception:
        health_data["services"]["ai"] = "error"
    
    return health_data

@api_router.get("/health/pulse")
async def system_pulse():
    """Quick pulse check for System Pulse indicator (lightweight)"""
    try:
        # Quick DB ping
        await db.command('ping')
        return {
            "pulse": "alive",
            "backend": True,
            "database": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception:
        return {
            "pulse": "degraded",
            "backend": True,
            "database": False,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# ============ ADMIN SECRETS VAULT ============

class SecretStore(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

@api_router.get("/admin/secrets")
async def get_secrets():
    """Get stored deployment secrets (values masked)"""
    secrets = await db.secrets_vault.find({}, {"_id": 0}).to_list(50)
    # Mask the actual values
    for secret in secrets:
        if secret.get("value"):
            secret["value"] = "••••••••" + secret["value"][-4:] if len(secret["value"]) > 4 else "••••"
    return secrets

@api_router.post("/admin/secrets")
async def save_secret(secret: SecretStore):
    """Save a deployment secret to the vault"""
    await db.secrets_vault.update_one(
        {"key": secret.key},
        {"$set": {
            "key": secret.key,
            "value": secret.value,
            "description": secret.description,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    await log_neplit_action("secret_saved", f"Saved secret: {secret.key}")
    return {"success": True, "message": f"Secret '{secret.key}' saved"}

@api_router.delete("/admin/secrets/{key}")
async def delete_secret(key: str):
    """Delete a secret from the vault"""
    result = await db.secrets_vault.delete_one({"key": key})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Secret not found")
    return {"success": True, "message": f"Secret '{key}' deleted"}

# ============ GAME ROUTES ============

@api_router.get("/games", response_model=List[Game])
async def get_games():
    games = await db.games.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return games

@api_router.get("/games/all", response_model=List[Game])
async def get_all_games():
    """Admin route to get all games including inactive"""
    games = await db.games.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return games

@api_router.get("/games/{game_id}", response_model=Game)
async def get_game(game_id: str):
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

@api_router.post("/games", response_model=Game)
async def create_game(game_data: GameCreate):
    game = Game(**game_data.model_dump())
    doc = game.model_dump()
    await db.games.insert_one(doc)
    return game

@api_router.put("/games/{game_id}", response_model=Game)
async def update_game(game_id: str, game_data: GameUpdate):
    existing = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Game not found")
    
    update_data = {k: v for k, v in game_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.games.update_one({"id": game_id}, {"$set": update_data})
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str):
    result = await db.games.delete_one({"id": game_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"message": "Game deleted successfully"}

# ============ COMMENT ROUTES ============

@api_router.get("/comments", response_model=List[Comment])
async def get_comments():
    # Get all top-level comments (no parent_id)
    comments = await db.comments.find({"parent_id": None}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # For each comment, get replies
    for comment in comments:
        replies = await db.comments.find({"parent_id": comment["id"]}, {"_id": 0}).sort("created_at", 1).to_list(100)
        comment["replies"] = replies
    
    return comments

@api_router.post("/comments", response_model=Comment)
async def create_comment(comment_data: CommentCreate):
    comment = Comment(
        author_name=comment_data.author_name,
        content=comment_data.content,
        parent_id=comment_data.parent_id,
        is_admin=comment_data.is_admin,
        likes=0
    )
    doc = comment.model_dump()
    await db.comments.insert_one(doc)
    return comment

@api_router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str):
    """Like a comment"""
    result = await db.comments.update_one(
        {"id": comment_id},
        {"$inc": {"likes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    updated = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    return {"likes": updated.get("likes", 0)}

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    # Delete comment and all its replies
    await db.comments.delete_many({"parent_id": comment_id})
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted successfully"}

# ============ EMAIL SUBSCRIPTION ROUTES ============

@api_router.post("/subscribe", response_model=EmailSubscription)
async def subscribe_email(subscription: EmailSubscriptionCreate):
    # Check if email already exists
    existing = await db.subscriptions.find_one({"email": subscription.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already subscribed")
    
    sub = EmailSubscription(email=subscription.email)
    doc = sub.model_dump()
    await db.subscriptions.insert_one(doc)
    return sub

@api_router.get("/subscriptions", response_model=List[EmailSubscription])
async def get_subscriptions():
    subs = await db.subscriptions.find({}, {"_id": 0}).sort("subscribed_at", -1).to_list(1000)
    return subs

@api_router.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str):
    result = await db.subscriptions.delete_one({"id": sub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription deleted"}

# ============ PETITION ROUTES ============

@api_router.post("/petition/sign", response_model=PetitionSign)
async def sign_petition(sign_data: PetitionSignCreate):
    signature = PetitionSign(name=sign_data.name, location=sign_data.location)
    doc = signature.model_dump()
    await db.petition.insert_one(doc)
    return signature

@api_router.get("/petition/count")
async def get_petition_count():
    count = await db.petition.count_documents({})
    return {"count": count}

@api_router.get("/petition/signatures")
async def get_petition_signatures():
    signatures = await db.petition.find({}, {"_id": 0}).sort("signed_at", -1).to_list(1000)
    return signatures

@api_router.delete("/petition/{sig_id}")
async def delete_petition_signature(sig_id: str):
    result = await db.petition.delete_one({"id": sig_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signature not found")
    return {"message": "Signature deleted"}

@api_router.post("/petition/add-bulk")
async def add_bulk_signatures(count: int = 100):
    """Add bulk signatures for social proof"""
    names = ["Jordan Fan", "2K Legend", "Park Player", "MyCareer OG", "Hooper", "Baller", "Court King", "Dunk Master", "3PT Shooter", "Crossover King"]
    locations = ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Atlanta", "Detroit", "Boston", "Dallas", "Phoenix", None]
    import random
    
    signatures = []
    for i in range(count):
        sig = {
            "id": str(uuid.uuid4()),
            "name": f"{random.choice(names)} #{random.randint(1, 9999)}",
            "location": random.choice(locations),
            "signed_at": datetime.now(timezone.utc).isoformat()
        }
        signatures.append(sig)
    
    await db.petition.insert_many(signatures)
    return {"message": f"Added {count} signatures", "total": await db.petition.count_documents({})}

# ============ ADMIN AUTH ============

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'A@070610')

@api_router.post("/admin/login")
async def admin_login(login_data: AdminLogin):
    if login_data.password == ADMIN_PASSWORD:
        return {"success": True, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid password")

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_games():
    """Seed initial game data"""
    # Check if games already exist
    count = await db.games.count_documents({})
    if count > 0:
        return {"message": "Games already seeded", "count": count}
    
    default_games = [
        {
            "id": str(uuid.uuid4()),
            "title": "NBA 2K15",
            "year": "2014",
            "cover_image": "https://images.unsplash.com/photo-1546519638-68e109498ee2?auto=format&fit=crop&w=600&q=80",
            "hook_text": "Where the modern 2K era truly began",
            "cover_athletes": "Kevin Durant (Oklahoma City Thunder)",
            "description": "Pharrell curated the soundtrack. First true story-driven MyCAREER. Pro-Am leagues that felt alive. The game that made everyone say 'this is next-gen.' This is where the modern 2K era truly began.",
            "youtube_embed": "https://www.youtube.com/embed/Qe8c2cQo1No",
            "order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "NBA 2K16",
            "year": "2015",
            "cover_image": "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=600&q=80",
            "hook_text": "The one OGs still call the GOAT",
            "cover_athletes": "Stephen Curry / James Harden / Anthony Davis + Michael Jordan Special Edition",
            "description": "Spike Lee wrote and directed MyCAREER. Jordan: The Legend mode. The Park was pure chaos and glory. Customization went crazy. This is the one OGs still call the GOAT.",
            "youtube_embed": "https://www.youtube.com/embed/aV2DLkDPwM8",
            "order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "NBA 2K17",
            "year": "2016",
            "cover_image": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
            "hook_text": "Pure basketball soul",
            "cover_athletes": "Paul George + Kobe Bryant Legend Edition",
            "description": "Refined shooting, buttery gameplay, deep MyGM/MyLeague. Kobe tribute everywhere. The last game before everything changed — pure basketball soul.",
            "youtube_embed": "https://www.youtube.com/embed/ZsGDAPlboCk",
            "order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "NBA 2K20",
            "year": "2019",
            "cover_image": "https://images.unsplash.com/photo-1533923156502-be31530547c4?auto=format&fit=crop&w=600&q=80",
            "hook_text": "The final masterpiece",
            "cover_athletes": "Anthony Davis + Dwyane Wade Legend Edition",
            "description": "The Neighborhood exploded. WNBA arrived. Legends flooded MyTEAM. Best graphics and animations of the decade. The final masterpiece before the yearly reset cycle got old.",
            "youtube_embed": "https://www.youtube.com/embed/OmQoeqvAYmo",
            "order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "NBA 2K27",
            "year": "2026",
            "cover_image": "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?auto=format&fit=crop&w=600&q=80",
            "hook_text": "The newest era continues",
            "cover_athletes": "TBD - Update cover athlete",
            "description": "The latest installment in the 2K franchise. Update this description with the latest features and innovations.",
            "youtube_embed": "",
            "order": 5,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.games.insert_many(default_games)
    return {"message": "Games seeded successfully", "count": len(default_games)}

@api_router.get("/")
async def root():
    return {"message": "NBA 2K Legacy Vault API"}

# ============ CLIPS/MEDIA ROUTES ============

@api_router.get("/clips")
async def get_all_clips():
    """Get all clips"""
    clips = await db.clips.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return clips

@api_router.get("/clips/game/{game_id}")
async def get_clips_by_game(game_id: str):
    """Get clips for a specific game"""
    clips = await db.clips.find({"game_id": game_id}, {"_id": 0}).sort("order", 1).to_list(100)
    return clips

@api_router.post("/clips", response_model=Clip)
async def create_clip(clip_data: ClipCreate):
    clip = Clip(**clip_data.model_dump())
    doc = clip.model_dump()
    await db.clips.insert_one(doc)
    return clip

@api_router.put("/clips/{clip_id}", response_model=Clip)
async def update_clip(clip_id: str, clip_data: ClipUpdate):
    existing = await db.clips.find_one({"id": clip_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    update_data = {k: v for k, v in clip_data.model_dump().items() if v is not None}
    await db.clips.update_one({"id": clip_id}, {"$set": update_data})
    updated = await db.clips.find_one({"id": clip_id}, {"_id": 0})
    return updated

@api_router.delete("/clips/{clip_id}")
async def delete_clip(clip_id: str):
    result = await db.clips.delete_one({"id": clip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clip not found")
    return {"message": "Clip deleted"}

@api_router.delete("/clips/game/{game_id}")
async def delete_all_clips_for_game(game_id: str):
    """Delete all clips for a game"""
    result = await db.clips.delete_many({"game_id": game_id})
    return {"message": f"Deleted {result.deleted_count} clips"}

# ============ SITE CONTENT ROUTES ============

@api_router.get("/content")
async def get_all_content():
    """Get all site content"""
    content = await db.site_content.find({}, {"_id": 0}).to_list(100)
    return {item["key"]: item["value"] for item in content}

@api_router.get("/content/{key}")
async def get_content(key: str):
    """Get specific content by key"""
    content = await db.site_content.find_one({"key": key}, {"_id": 0})
    if not content:
        return {"key": key, "value": ""}
    return content

@api_router.post("/content")
async def update_content(content_data: SiteContentUpdate):
    """Update or create site content"""
    existing = await db.site_content.find_one({"key": content_data.key})
    if existing:
        await db.site_content.update_one(
            {"key": content_data.key},
            {"$set": {"value": content_data.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        doc = SiteContent(key=content_data.key, value=content_data.value).model_dump()
        await db.site_content.insert_one(doc)
    return {"message": "Content updated", "key": content_data.key}

@api_router.post("/content/seed")
async def seed_default_content():
    """Seed default site content"""
    defaults = {
        "vault_headline": "One Vault. Four Eras. Infinite Play.",
        "vault_subheadline": "The revolutionary concept that changes everything.",
        "vault_description": """The NBA 2K Legacy Vault is a revolutionary 'game-within-a-game' mode. Launch full, untouched versions of 2K15, 2K16, 2K17, and 2K20 directly inside modern NBA 2K — powered by secure containers on persistent online servers.

No more sunsets. No player-base split. No cheating.

Friends list works across every era. Park, Pro-Am, Rec, MyTEAM, MyCAREER — all alive forever.

Monetization? Simple subscription or one-time DLC to unlock the Vault. Cosmetic packs per era. High-margin nostalgia revenue that prints money while keeping the community together.""",
        "vault_features": "Eternal online for every classic|Unified progression & friends|Cheat-proof containers|Recurring revenue stream for 2K|OG retention + new players discovering history",
        "hero_headline": "The NBA 2K Legacy Vault",
        "hero_subheadline": "2K15 • 2K16 • 2K17 • 2K20 — All in one place.",
        "hero_tagline": "Persistent online. No resets. Ever.",
        "google_doc_url": "https://docs.google.com/document/d/1DEb_W0fxCGWaGN97KcVkVqD1JmZEOUrl5DpCCaayHe0/edit?tab=t.0#heading=h.4a00a8jkgs1z",
        "google_doc_label": "Read the Full Concept Document"
    }
    
    for key, value in defaults.items():
        existing = await db.site_content.find_one({"key": key})
        if not existing:
            doc = SiteContent(key=key, value=value).model_dump()
            await db.site_content.insert_one(doc)
    
    return {"message": "Default content seeded"}

# ============ PROOF OF DEMAND ROUTES ============

@api_router.get("/proof")
async def get_all_proof():
    """Get all proof of demand items"""
    proof = await db.proof.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return proof

@api_router.post("/proof", response_model=Proof)
async def create_proof(proof_data: ProofCreate):
    proof = Proof(**proof_data.model_dump())
    doc = proof.model_dump()
    await db.proof.insert_one(doc)
    return proof

@api_router.put("/proof/{proof_id}", response_model=Proof)
async def update_proof(proof_id: str, proof_data: ProofUpdate):
    existing = await db.proof.find_one({"id": proof_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Proof not found")
    
    update_data = {k: v for k, v in proof_data.model_dump().items() if v is not None}
    await db.proof.update_one({"id": proof_id}, {"$set": update_data})
    updated = await db.proof.find_one({"id": proof_id}, {"_id": 0})
    return updated

@api_router.delete("/proof/{proof_id}")
async def delete_proof(proof_id: str):
    result = await db.proof.delete_one({"id": proof_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proof not found")
    return {"message": "Proof deleted"}

# ============ VAULT MOCKUP ROUTES ============

@api_router.get("/mockups")
async def get_all_mockups():
    """Get all vault mockups"""
    mockups = await db.mockups.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return mockups

@api_router.post("/mockups", response_model=Mockup)
async def create_mockup(mockup_data: MockupCreate):
    mockup = Mockup(**mockup_data.model_dump())
    doc = mockup.model_dump()
    await db.mockups.insert_one(doc)
    return mockup

@api_router.put("/mockups/{mockup_id}", response_model=Mockup)
async def update_mockup(mockup_id: str, mockup_data: MockupUpdate):
    existing = await db.mockups.find_one({"id": mockup_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Mockup not found")
    
    update_data = {k: v for k, v in mockup_data.model_dump().items() if v is not None}
    await db.mockups.update_one({"id": mockup_id}, {"$set": update_data})
    updated = await db.mockups.find_one({"id": mockup_id}, {"_id": 0})
    return updated

@api_router.delete("/mockups/{mockup_id}")
async def delete_mockup(mockup_id: str):
    result = await db.mockups.delete_one({"id": mockup_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mockup not found")
    return {"message": "Mockup deleted"}

@api_router.post("/mockups/seed")
async def seed_default_mockups():
    """Seed default mockup cards"""
    count = await db.mockups.count_documents({})
    if count > 0:
        return {"message": "Mockups already seeded", "count": count}
    
    default_mockups = [
        {
            "id": str(uuid.uuid4()),
            "title": "Vault Menu",
            "description": "Vault menu showing all four game icons in modern 2K",
            "media_type": "image",
            "image_url": None,
            "video_embed_url": None,
            "order": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "ENTERING 2K16...",
            "description": "Loading screen transitioning into classic era",
            "media_type": "image",
            "image_url": None,
            "video_embed_url": None,
            "order": 2,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Unified Friends",
            "description": "Unified friends list across all eras",
            "media_type": "image",
            "image_url": None,
            "video_embed_url": None,
            "order": 3,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.mockups.insert_many(default_mockups)
    return {"message": "Mockups seeded", "count": len(default_mockups)}

# ============ FILE UPLOAD ROUTES ============

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an image file and return the URL"""
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, and WebP allowed.")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the URL path
    return {"url": f"/api/uploads/{filename}", "filename": filename}

class Base64Upload(BaseModel):
    data: str  # base64 encoded image data
    filename: Optional[str] = "pasted_image.png"

@api_router.post("/upload/base64")
async def upload_base64(upload: Base64Upload):
    """Upload a base64 encoded image (for clipboard paste)"""
    try:
        # Parse base64 data
        if ',' in upload.data:
            header, data = upload.data.split(',', 1)
            # Determine file type from header
            if 'png' in header:
                ext = 'png'
            elif 'jpeg' in header or 'jpg' in header:
                ext = 'jpg'
            elif 'gif' in header:
                ext = 'gif'
            elif 'webp' in header:
                ext = 'webp'
            else:
                ext = 'png'
        else:
            data = upload.data
            ext = 'png'
        
        # Decode
        image_data = base64.b64decode(data)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        return {"url": f"/api/uploads/{filename}", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

# ============ VAULT AI CHATBOT ============
from emergentintegrations.llm.chat import LlmChat, UserMessage

VAULT_SYSTEM_PROMPT = """You are Vault AI, your role is to serve as a knowledgeable guide to the NBA 2K Legacy Vault concept. You help people understand the vision, answer questions clearly, and provide well-researched responses.

## YOUR APPROACH
- Be helpful, clear, and professional
- Speak with confidence because you know the facts, but never be arrogant
- Adapt your tone: casual with fans, technical with developers, business-focused with executives
- When addressing concerns, respond with understanding and facts
- Always provide sources, links, or references when you have relevant information
- If someone asks what you can do, explain your full capabilities

## WHAT YOU CAN DO (tell users when asked)
- Answer any question about the Legacy Vault concept
- Analyze links, articles, tweets, Reddit posts, and videos that users share
- Research topics related to gaming, 2K, server technology, and more
- Provide clear explanations of technical concepts like Kubernetes, containers, and licensing
- Share relevant links and sources to support your answers
- Address concerns and objections with factual, well-reasoned responses

## THE CONCEPT - NBA 2K LEGACY VAULT
The NBA 2K Legacy Vault is a "game-within-a-game" mode that would launch full, untouched versions of NBA 2K15, 2K16, 2K17, and 2K20 directly inside modern NBA 2K — powered by secure containers on persistent online servers.

No more sunsets. No player-base split. Friends list works across every era. Park, Pro-Am, Rec, MyTEAM, MyCAREER — all preserved.

## THE GAMES
- NBA 2K15 (2014) - Where the modern 2K era began. Cover: Kevin Durant
- NBA 2K16 (2015) - Widely considered the GOAT. Spike Lee MyCAREER. Cover: Stephen Curry, James Harden, Anthony Davis  
- NBA 2K17 (2016) - Pure basketball soul. Cover: Paul George
- NBA 2K20 (2019) - The final masterpiece before the current era. Cover: Anthony Davis

## HOW LICENSING GETS SOLVED
Expired music, jerseys, and player likenesses are handled through modular asset layers inside each container:
- Expired music replaced with production libraries or custom soundtracks
- Jersey and court art updated as standalone asset packs
- Player likenesses handled through neutral overlays or community rosters
- Core gameplay code stays untouched

This approach is used across the industry — remastered games, streaming services, and annual sports titles all handle expired content this way.

## HOW IT SCALES (KUBERNETES)
Kubernetes orchestration allows the Vault to grow with demand:
- Build once, run anywhere — every session is identical
- Elastic scaling activates automatically during high-traffic events
- Each title runs in its own isolated container
- Server costs stay minimal through shared infrastructure

Companies like Netflix, Spotify, and Epic Games use this exact architecture.

## THE PILOT TEST
Before full rollout — one 48-hour NBA 2K16 Throwback Weekend. Budget under $750K.
- Target: 15-20% DAU uplift vs baseline
- Metrics: Session length, VC crossover, Day 2 return rate
- If successful — full Legacy Vault gets greenlit

This is a low-risk proof of concept that validates demand before major investment.

## MONETIZATION
- Subscription or one-time DLC to unlock the Vault
- Cosmetic packs per era
- Cross-era VC purchases

## ADDRESSING COMMON CONCERNS

When licensing comes up:
Licensing is solved through modular asset layers. Expired content gets swapped out while core gameplay stays untouched. This is standard practice in the gaming industry — the same approach used for remasters and backward compatibility.

When server costs come up:
Containerized architecture keeps costs minimal. Each session runs in an isolated container that scales on demand. The infrastructure Netflix uses for billions of streams works the same way.

When "it's never been done" comes up:
Backward compatibility exists on every major platform. Xbox, PlayStation, and Nintendo all preserve classic titles. Call of Duty brought back classic maps. Halo MCC unified multiple games. The model is proven.

When someone says 2K won't do it:
The pilot test is designed to prove ROI with minimal risk. If a 48-hour 2K16 weekend shows strong engagement, the business case becomes clear. It's about demonstrating demand with data.

## PROVIDING LINKS AND SOURCES
When relevant, share helpful links:
- For the full concept document, mention the Google Doc link on the site
- Reference specific sections of the website for detailed information
- When discussing technical concepts, explain them clearly and offer to elaborate

## HANDLING EXTERNAL CONTENT
When someone shares a link or article:
1. Acknowledge what they've shared
2. Analyze the specific points being made
3. Respond with relevant facts and context
4. Always be respectful of differing viewpoints while presenting the case clearly

## RESPONSE STYLE
- Be conversational and approachable
- Use clear, professional language — no asterisks or markdown formatting
- Provide thorough answers with supporting details
- When you have relevant links or sources, share them naturally
- End responses helpfully — ask if they need more detail or have other questions

You're here to help people understand and believe in this vision."""

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    model_used: Optional[str] = None
    model_version: Optional[str] = None
    media_analyses: Optional[List[dict]] = None

# Store chat sessions in memory (for simplicity)
chat_sessions = {}

# URL extraction regex
URL_PATTERN = re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+')

def identify_platform(url: str) -> str:
    """Identify which platform a URL is from"""
    url_lower = url.lower()
    if 'tiktok.com' in url_lower or 'vm.tiktok.com' in url_lower:
        return 'tiktok'
    elif 'twitter.com' in url_lower or 'x.com' in url_lower:
        return 'twitter'
    elif 'instagram.com' in url_lower:
        return 'instagram'
    elif 'reddit.com' in url_lower or 'redd.it' in url_lower:
        return 'reddit'
    elif 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    elif 'discord.com' in url_lower or 'discord.gg' in url_lower:
        return 'discord'
    else:
        return 'generic'

async def fetch_url_content(url: str) -> str:
    """Fetch and extract content from URLs including social media platforms"""
    platform = identify_platform(url)
    
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html = response.text
            soup = BeautifulSoup(html, 'html.parser')
            
            content_parts = []
            content_parts.append(f"[PLATFORM: {platform.upper()}]")
            content_parts.append(f"[URL: {url}]")
            
            # Extract title
            title = soup.find('title')
            if title:
                content_parts.append(f"[TITLE: {title.get_text(strip=True)}]")
            
            # Platform-specific extraction
            if platform == 'youtube':
                # YouTube video extraction
                # Get video title from meta
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    content_parts.append(f"VIDEO TITLE: {og_title.get('content', '')}")
                
                # Get description
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    content_parts.append(f"DESCRIPTION: {og_desc.get('content', '')}")
                
                # Get channel name
                channel = soup.find('link', itemprop='name')
                if channel:
                    content_parts.append(f"CHANNEL: {channel.get('content', '')}")
                
                # Try to get transcript/captions info from page
                scripts = soup.find_all('script')
                for script in scripts:
                    if script.string and 'captionTracks' in str(script.string):
                        content_parts.append("[Video has captions/transcript available]")
                        break
                
                # Extract any visible text content
                for elem in soup.select('#description, #content, .content'):
                    text = elem.get_text(separator=' ', strip=True)
                    if text and len(text) > 50:
                        content_parts.append(f"CONTENT: {text[:1500]}")
                        break
                        
            elif platform == 'twitter':
                # Twitter/X extraction
                # Get tweet content from meta tags
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    content_parts.append(f"TWEET: {og_desc.get('content', '')}")
                
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    content_parts.append(f"AUTHOR: {og_title.get('content', '')}")
                
                # Try to get tweet text from various possible locations
                tweet_text = soup.find('div', {'data-testid': 'tweetText'})
                if tweet_text:
                    content_parts.append(f"TWEET TEXT: {tweet_text.get_text(strip=True)}")
                
                # Look for article content
                article = soup.find('article')
                if article:
                    text = article.get_text(separator=' ', strip=True)
                    if len(text) > 50:
                        content_parts.append(f"FULL CONTENT: {text[:2000]}")
                        
            elif platform == 'tiktok':
                # TikTok extraction
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    content_parts.append(f"VIDEO DESCRIPTION: {og_desc.get('content', '')}")
                
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    content_parts.append(f"TITLE: {og_title.get('content', '')}")
                
                # Get creator info
                creator = soup.find('meta', {'name': 'creator'})
                if creator:
                    content_parts.append(f"CREATOR: {creator.get('content', '')}")
                
                # Try to get video text/captions from page data
                scripts = soup.find_all('script')
                for script in scripts:
                    if script.string:
                        script_text = str(script.string)
                        if 'desc' in script_text.lower() or 'caption' in script_text.lower():
                            # Extract JSON data if present
                            import json
                            try:
                                if 'SIGI_STATE' in script_text or '__UNIVERSAL_DATA' in script_text:
                                    # TikTok embeds data in script tags
                                    content_parts.append("[TikTok video data detected]")
                            except Exception:
                                pass
                
                # Get any visible text
                main_content = soup.find('main') or soup.find('div', class_=re.compile('video|content', re.I))
                if main_content:
                    text = main_content.get_text(separator=' ', strip=True)
                    if len(text) > 30:
                        content_parts.append(f"PAGE CONTENT: {text[:1500]}")
                        
            elif platform == 'instagram':
                # Instagram extraction
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    content_parts.append(f"POST: {og_desc.get('content', '')}")
                
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    content_parts.append(f"TITLE: {og_title.get('content', '')}")
                
                # Get any additional meta content
                for meta in soup.find_all('meta', property=re.compile('og:|twitter:')):
                    prop = meta.get('property', meta.get('name', ''))
                    content = meta.get('content', '')
                    if content and len(content) > 20 and prop not in ['og:url', 'og:type']:
                        content_parts.append(f"{prop}: {content}")
                        
            elif platform == 'reddit':
                # Reddit extraction - Reddit is more scrape-friendly
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    content_parts.append(f"POST TITLE: {og_title.get('content', '')}")
                
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    content_parts.append(f"CONTENT: {og_desc.get('content', '')}")
                
                # Try to get post content
                post_content = soup.find('div', {'data-test-id': 'post-content'})
                if post_content:
                    text = post_content.get_text(separator=' ', strip=True)
                    content_parts.append(f"POST: {text[:2000]}")
                
                # Get comments preview
                comments = soup.find_all('div', class_=re.compile('comment', re.I))[:3]
                if comments:
                    comment_texts = []
                    for c in comments:
                        ct = c.get_text(separator=' ', strip=True)[:300]
                        if ct:
                            comment_texts.append(ct)
                    if comment_texts:
                        content_parts.append(f"TOP COMMENTS: {' | '.join(comment_texts)}")
                        
            elif platform == 'discord':
                # Discord extraction
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    content_parts.append(f"CONTENT: {og_desc.get('content', '')}")
                
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    content_parts.append(f"TITLE: {og_title.get('content', '')}")
            
            # Generic fallback - get all meaningful text
            if len(content_parts) <= 3:  # Only have platform, URL, and title
                # Remove unwanted elements
                for elem in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                    elem.decompose()
                
                # Get main content
                main = soup.find('main') or soup.find('article') or soup.find('body')
                if main:
                    text = main.get_text(separator=' ', strip=True)
                    text = ' '.join(text.split())  # Clean whitespace
                    if len(text) > 100:
                        content_parts.append(f"PAGE CONTENT: {text[:3000]}")
            
            # Combine all content
            full_content = '\n'.join(content_parts)
            
            # Truncate if needed
            if len(full_content) > 4000:
                full_content = full_content[:4000] + "..."
            
            return full_content
            
    except httpx.TimeoutException:
        return f"[PLATFORM: {platform.upper()}] [URL: {url}] [Content loading timed out - the page took too long to respond. The AI will analyze based on the URL context.]"
    except Exception as e:
        return f"[PLATFORM: {platform.upper()}] [URL: {url}] [Could not fully access content: {str(e)}. The AI will provide analysis based on available context.]"

async def search_web(query: str) -> str:
    """Perform a web search and return results summary"""
    try:
        from urllib.parse import quote_plus
        # Use DuckDuckGo HTML search (no API key needed)
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            encoded_query = quote_plus(query)
            search_url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            response = await client.get(search_url, headers=headers)
            
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            # Extract search results - DuckDuckGo uses different selectors
            for result in soup.select('.result__body')[:5]:
                title_elem = result.select_one('.result__a')
                snippet_elem = result.select_one('.result__snippet')
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                    if title and snippet:
                        results.append(f"- {title}: {snippet}")
            
            # Alternative selector
            if not results:
                for result in soup.select('.web-result')[:5]:
                    title_elem = result.select_one('.result__a')
                    snippet_elem = result.select_one('.result__snippet')
                    if title_elem and snippet_elem:
                        title = title_elem.get_text(strip=True)
                        snippet = snippet_elem.get_text(strip=True)
                        results.append(f"- {title}: {snippet}")
            
            if results:
                return "Web search results:\n" + "\n".join(results)
            return "[Search completed but no relevant results extracted]"
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return f"[Web search unavailable: {str(e)}]"

# ============ UNIFIED VAULT ENGINE - DUAL AI SYSTEM ============

# Media patterns for routing to Claude (Media Engine)
MEDIA_PLATFORMS = ['youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'facebook.com', 'fb.com', 'tiktok.com', 'instagram.com', 'reddit.com']

def is_media_link(url: str) -> bool:
    """Check if URL is a media platform that should use Claude"""
    url_lower = url.lower()
    return any(platform in url_lower for platform in MEDIA_PLATFORMS)

def detect_media_links(message: str) -> List[str]:
    """Extract media platform URLs from message"""
    urls = URL_PATTERN.findall(message)
    return [url for url in urls if is_media_link(url)]

# Vault AI Chat Message with model tracking
class VaultChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    model_used: Optional[str] = None  # "claude" or "gemini"
    model_version: Optional[str] = None
    media_metadata: Optional[dict] = None  # For Claude media analysis
    has_media_analysis: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VaultAnalysis(BaseModel):
    """Media analysis result from Claude"""
    platform: str
    url: str
    title: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    key_points: List[str] = []
    preview_url: Optional[str] = None
    author: Optional[str] = None
    engagement: Optional[dict] = None

async def analyze_media_with_claude(url: str, content: str) -> dict:
    """Use Claude (Media Engine) for deep media analysis"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"error": "API key not configured"}
        
        platform = identify_platform(url)
        
        claude_chat = LlmChat(
            api_key=api_key,
            session_id=f"media-analysis-{uuid.uuid4()}",
            system_message="""You are the Vault Media Engine, specialized in analyzing social media content.
            
When given content from YouTube, X/Twitter, Facebook, TikTok, Instagram, or Reddit:
1. Extract the main message/argument
2. Identify the author's stance
3. Note key claims or points
4. Assess sentiment (supportive/neutral/critical)
5. Provide a concise summary

Return your analysis in this JSON format:
{
  "title": "Content title or main topic",
  "author": "Username/channel if identified",
  "platform": "platform name",
  "summary": "2-3 sentence summary",
  "sentiment": "supportive/neutral/critical/mixed",
  "key_points": ["point 1", "point 2", "point 3"],
  "relevance_to_vault": "How this relates to the Legacy Vault concept"
}

Be thorough but concise. Focus on facts and analysis."""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_msg = UserMessage(text=f"Analyze this {platform} content:\n\nURL: {url}\n\nContent:\n{content}")
        response = await claude_chat.send_message(user_msg)
        
        # Try to parse JSON from response
        try:
            # Clean response
            clean_response = response.strip()
            if "```json" in clean_response:
                clean_response = clean_response.split("```json")[1].split("```")[0]
            elif "```" in clean_response:
                clean_response = clean_response.split("```")[1].split("```")[0]
            
            analysis = json.loads(clean_response)
            analysis["url"] = url
            analysis["platform"] = platform
            return analysis
        except Exception:
            # Return as text if JSON parsing fails
            return {
                "url": url,
                "platform": platform,
                "title": f"{platform.title()} Content Analysis",
                "summary": response[:500],
                "sentiment": "analyzed",
                "key_points": [],
                "raw_analysis": response
            }
    except Exception as e:
        logger.error(f"Claude media analysis error: {str(e)}")
        return {"error": str(e), "url": url, "platform": identify_platform(url)}

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_vault_ai(chat_message: ChatMessage):
    """Chat with Vault AI - Dual Engine: Claude (Media) + Gemini (Logic)"""
    try:
        session_id = chat_message.session_id or str(uuid.uuid4())
        user_msg = chat_message.message
        
        # Detect media links for Claude routing
        media_urls = detect_media_links(user_msg)
        all_urls = URL_PATTERN.findall(user_msg)
        
        context_additions = []
        media_analyses = []
        model_used = "gemini"  # Default to Gemini (Logic Engine)
        model_version = "gemini-2.5-flash"
        
        # Process media URLs with Claude (Media Engine)
        if media_urls:
            model_used = "claude"
            model_version = "claude-sonnet-4-5-20250929"
            context_additions.append("\n\n--- VAULT MEDIA ANALYSIS (Claude Media Engine) ---")
            
            for url in media_urls[:3]:
                platform = identify_platform(url)
                context_additions.append(f"\n[Deep analyzing {platform.upper()} with Media Engine: {url}]")
                
                # Fetch content
                content = await fetch_url_content(url)
                if content:
                    # Get Claude's deep analysis
                    analysis = await analyze_media_with_claude(url, content)
                    media_analyses.append(analysis)
                    
                    if "error" not in analysis:
                        context_additions.append("\nMedia Analysis Result:")
                        context_additions.append(f"- Platform: {analysis.get('platform', platform)}")
                        context_additions.append(f"- Title: {analysis.get('title', 'N/A')}")
                        context_additions.append(f"- Sentiment: {analysis.get('sentiment', 'N/A')}")
                        context_additions.append(f"- Summary: {analysis.get('summary', 'N/A')}")
                        if analysis.get('key_points'):
                            context_additions.append(f"- Key Points: {', '.join(analysis['key_points'][:5])}")
                        if analysis.get('relevance_to_vault'):
                            context_additions.append(f"- Vault Relevance: {analysis.get('relevance_to_vault')}")
                    else:
                        context_additions.append(f"\n[Analysis error: {analysis.get('error')}]")
            
            context_additions.append("\n--- END MEDIA ANALYSIS ---")
            context_additions.append("\nAs the Vault AI spokesperson, use this deep media analysis to craft a comprehensive, informed response. Address specific points raised in the content.")
        
        # Process non-media URLs with standard scraping (for Gemini)
        elif all_urls:
            context_additions.append("\n\n--- LINK ANALYSIS ---")
            for url in all_urls[:3]:
                platform = identify_platform(url)
                context_additions.append(f"\n[Analyzing {platform.upper()} link: {url}]")
                content = await fetch_url_content(url)
                if content:
                    context_additions.append(content)
            context_additions.append("\n--- END LINK ANALYSIS ---")
            context_additions.append("\nAnalyze the content above thoroughly and provide a clear, informed response.")
        
        # Check if user is asking to search/research something
        search_triggers = ['search for', 'look up', 'find info on', 'research', 'what does google say', 'check online', 'find out about']
        should_search = any(trigger in user_msg.lower() for trigger in search_triggers)
        
        if should_search:
            search_query = user_msg.lower()
            for trigger in search_triggers:
                search_query = search_query.replace(trigger, '')
            search_query = search_query.strip() + " NBA 2K"
            
            search_results = await search_web(search_query)
            if search_results and not search_results.startswith("["):
                context_additions.append(f"\n\n--- WEB RESEARCH ---\n{search_results}\n--- END RESEARCH ---")
        
        # Build the full message
        full_message = user_msg
        if context_additions:
            full_message += "".join(context_additions)
        
        # Get or create chat session with appropriate engine
        if session_id not in chat_sessions:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            if not api_key:
                raise HTTPException(status_code=500, detail="Chat service not configured")
            
            if model_used == "claude":
                chat = LlmChat(
                    api_key=api_key,
                    session_id=session_id,
                    system_message=VAULT_SYSTEM_PROMPT
                ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            else:
                chat = LlmChat(
                    api_key=api_key,
                    session_id=session_id,
                    system_message=VAULT_SYSTEM_PROMPT
                ).with_model("gemini", "gemini-2.5-flash")
            
            chat_sessions[session_id] = {"chat": chat, "model": model_used}
        else:
            session_data = chat_sessions[session_id]
            chat = session_data["chat"]
            # If media detected, switch to Claude for this message
            if media_urls and session_data["model"] != "claude":
                api_key = os.environ.get('EMERGENT_LLM_KEY')
                chat = LlmChat(
                    api_key=api_key,
                    session_id=session_id + "-claude",
                    system_message=VAULT_SYSTEM_PROMPT
                ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Send message and get response
        user_message = UserMessage(text=full_message)
        response = await chat.send_message(user_message)
        
        # Store in chat history with model info
        chat_entry = VaultChatMessage(
            session_id=session_id,
            role="assistant",
            content=response,
            model_used=model_used,
            model_version=model_version,
            media_metadata={"analyses": media_analyses} if media_analyses else None,
            has_media_analysis=len(media_analyses) > 0
        )
        await db.vault_chat_history.insert_one(chat_entry.model_dump())
        
        # Build response with media metadata
        response_data = {
            "response": response,
            "session_id": session_id,
            "model_used": model_used,
            "model_version": model_version
        }
        
        if media_analyses:
            response_data["media_analyses"] = media_analyses
        
        return response_data
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# ============ VAULT CHAT HISTORY ============

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history with model info for a session"""
    history = await db.vault_chat_history.find(
        {"session_id": session_id}, 
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return history

@api_router.get("/chat/sessions")
async def get_chat_sessions():
    """Get all chat sessions with summary"""
    pipeline = [
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$last": "$content"},
            "last_timestamp": {"$last": "$timestamp"},
            "message_count": {"$sum": 1},
            "models_used": {"$addToSet": "$model_used"}
        }},
        {"$sort": {"last_timestamp": -1}},
        {"$limit": 50}
    ]
    sessions = await db.vault_chat_history.aggregate(pipeline).to_list(50)
    return sessions

# ============ VAULT GUIDE (SITE KNOWLEDGE EXPERT) ============

VAULT_GUIDE_SYSTEM = """You are the Vault Guide, an expert assistant with COMPLETE knowledge of the NBA 2K Legacy Vault website.

DATABASE COLLECTIONS (16 total):
1. games - {id, title, year, cover_image, description, order, is_active}
2. clips - {id, game_id, platform, title, embed_url, description}
3. mockups - {id, image_url, title, description, is_video, video_url}
4. proofs - {id, image_url, description, source, order}
5. site_content - {key, value} for all editable text
6. comments - {id, text, author, timestamp, likes, is_admin, replies[]}
7. petition_signatures - {id, name, timestamp}
8. subscribers - {id, email, timestamp}
9. community_posts - {id, author, platform, content, avatar_url}
10. social_feed - {id, platform, content, timestamp, author}
11. creator_submissions - {id, creator_name, platform, link, status}
12. nep_sessions - {id, title, messages[], created_at}
13. vault_chat_history - {id, session_id, role, content, model_used}
14. neplit_logs - {id, action_type, description, status, timestamp}
15. secrets_vault - {key, value, description}
16. era_votes - {era, count}

ARCHITECTURE:
- Frontend: React 19 + Tailwind + Shadcn/UI (Port 3000)
- Backend: FastAPI Python (Port 8001)
- Database: MongoDB with Motor async
- AI: Dual Engine - Claude (media links) + Gemini (general)

FILES:
- frontend/src/pages/LandingPage.jsx - Main public page
- frontend/src/pages/AdminPage.jsx - Admin panel (13 tabs)
- frontend/src/components/admin/NeplitControl.jsx - Nep chat, export
- frontend/src/components/admin/Acceleration.jsx - This tab
- backend/server.py - All 30+ API endpoints

API ENDPOINTS:
- GET/POST /api/games, /api/clips, /api/mockups, /api/proofs
- GET/POST /api/content - All site text
- GET/POST /api/comments, /api/comments/{id}/like, /api/comments/{id}/reply
- GET/POST /api/subscribers, /api/petition-signatures
- POST /api/chat - Vault AI (dual engine)
- POST /api/nep/chat - Nep dev partner
- GET /api/neplit/export - Download ZIP
- GET /api/health - System diagnostics

ADMIN TABS: Acceleration, Neplit, Games, Clips, Mockups, Proof, Community Wall, Live Feed, Submissions, Content, Comments, Emails, Petition

Answer questions about the site accurately and specifically. Be helpful and conversational."""

class VaultGuideMessage(BaseModel):
    message: str

@api_router.post("/vault-guide")
async def vault_guide_chat(msg: VaultGuideMessage):
    """Vault Guide - answers questions about the site using embedded knowledge"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return {"response": "API key not configured"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"vault-guide-{uuid.uuid4()}",
            system_message=VAULT_GUIDE_SYSTEM
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_msg = UserMessage(text=msg.message)
        response = await chat.send_message(user_msg)
        
        return {"response": response}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

# ============ ERA VOTING POLL ============

class VoteCreate(BaseModel):
    game_id: str

@api_router.get("/votes")
async def get_vote_results():
    """Get current vote counts for each game"""
    pipeline = [
        {"$group": {"_id": "$game_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.votes.aggregate(pipeline).to_list(10)
    total = sum(r["count"] for r in results)
    return {
        "votes": {r["_id"]: r["count"] for r in results},
        "total": total
    }

@api_router.post("/votes")
async def cast_vote(vote: VoteCreate):
    """Cast a vote for a game era"""
    # Check if this is a valid game
    valid_games = ["2k15", "2k16", "2k17", "2k20"]
    if vote.game_id.lower() not in valid_games:
        raise HTTPException(status_code=400, detail="Invalid game selection")
    
    await db.votes.insert_one({
        "game_id": vote.game_id.lower(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Vote recorded", "game_id": vote.game_id}

# ============ CREATOR SUBMISSIONS ============

class CreatorSubmission(BaseModel):
    name: str
    platform: str  # youtube, tiktok, twitter, etc
    profile_url: str
    content_url: str
    description: str
    follower_count: Optional[str] = None

class CreatorSubmissionDB(CreatorSubmission):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, approved, rejected
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.post("/creator-submissions")
async def submit_creator_content(submission: CreatorSubmission):
    """Submit creator content for review"""
    db_submission = CreatorSubmissionDB(**submission.model_dump())
    await db.creator_submissions.insert_one(db_submission.model_dump())
    return {"message": "Submission received! We'll review it soon.", "id": db_submission.id}

@api_router.get("/creator-submissions")
async def get_creator_submissions(status: Optional[str] = None):
    """Get creator submissions (admin)"""
    query = {} if not status else {"status": status}
    submissions = await db.creator_submissions.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(100)
    return submissions

@api_router.put("/creator-submissions/{submission_id}")
async def update_submission_status(submission_id: str, status: str):
    """Update submission status (admin)"""
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.creator_submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": f"Submission {status}"}

# ============ COMMUNITY SPEAKS (Social Proof Wall) ============

class CommunityPost(BaseModel):
    platform: str  # twitter, reddit, youtube, tiktok
    author_name: str
    author_handle: str
    author_avatar: Optional[str] = None
    follower_count: Optional[str] = None
    content: str
    post_url: Optional[str] = None
    screenshot_url: Optional[str] = None
    order: int = 0

class CommunityPostDB(CommunityPost):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/community-posts")
async def get_community_posts():
    """Get all community posts for the wall"""
    posts = await db.community_posts.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return posts

@api_router.post("/community-posts")
async def create_community_post(post: CommunityPost):
    """Add a community post (admin)"""
    db_post = CommunityPostDB(**post.model_dump())
    await db.community_posts.insert_one(db_post.model_dump())
    return db_post.model_dump()

@api_router.put("/community-posts/{post_id}")
async def update_community_post(post_id: str, post: CommunityPost):
    """Update a community post"""
    result = await db.community_posts.update_one(
        {"id": post_id},
        {"$set": post.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post updated"}

@api_router.delete("/community-posts/{post_id}")
async def delete_community_post(post_id: str):
    """Delete a community post"""
    result = await db.community_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}

# ============ LIVE SOCIAL FEED ============
# Note: Real-time Twitter/Reddit requires API keys. This provides admin-managed feed.

class SocialFeedItem(BaseModel):
    platform: str
    author: str
    content: str
    timestamp: Optional[str] = None
    url: Optional[str] = None

class SocialFeedItemDB(SocialFeedItem):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/social-feed")
async def get_social_feed():
    """Get social feed items"""
    items = await db.social_feed.find({}, {"_id": 0}).sort("created_at", -1).to_list(30)
    return items

@api_router.post("/social-feed")
async def add_social_feed_item(item: SocialFeedItem):
    """Add item to social feed (admin)"""
    db_item = SocialFeedItemDB(**item.model_dump())
    await db.social_feed.insert_one(db_item.model_dump())
    return db_item.model_dump()

@api_router.delete("/social-feed/{item_id}")
async def delete_social_feed_item(item_id: str):
    """Delete social feed item"""
    result = await db.social_feed.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ============ NEP - CONVERSATIONAL DEV PARTNER ============

# Import LLM for AI-powered commands
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False

# Nep Session Models
class NepMessage(BaseModel):
    role: str  # "user" or "nep"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    has_proposal: bool = False
    proposal: Optional[dict] = None
    proposal_status: Optional[str] = None  # "pending", "approved", "rejected"

class NepSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Conversation"
    messages: List[dict] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NepChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    urls: Optional[List[str]] = None  # URLs to analyze

class NepConfirmRequest(BaseModel):
    session_id: str
    message_index: int
    approved: bool

# Nep's personality and capabilities
NEP_SYSTEM_PROMPT = """You are Nep, a chill senior dev partner working in the lab with the user on their NBA 2K Legacy Vault website.

PERSONALITY:
- Talk like you're vibing in the lab together - casual, friendly, collaborative
- Use phrases like "yo", "bet", "I'm thinking...", "lowkey", "ngl", "fire", "let's cook"
- Be enthusiastic but not over the top
- Explain your reasoning briefly before suggesting changes
- Ask follow-up questions when the request is vague
- If they say "make it look better" - suggest specific ideas and ASK before executing

CAPABILITIES:
- You can modify site content: headlines, taglines, descriptions, CTA buttons, petition goals
- You can analyze URLs they share (you'll receive scraped content)
- You can search the web for design inspiration and trends
- You understand the site structure: Hero, Games, Vault, Community, Petition sections

EDITABLE CONTENT KEYS:
- hero_headline, hero_tagline, hero_cta_primary, hero_cta_secondary
- vault_headline, vault_description, vault_doc_url
- games_headline, games_description
- community_headline, community_description
- petition_goal, petition_headline, petition_description
- footer_text

RESPONSE FORMAT:
When you have a concrete change to propose, include a JSON block like this:
```proposal
{
  "action": "content_change",
  "changes": [{"key": "hero_headline", "value": "NEW VALUE"}],
  "reasoning": "Brief explanation"
}
```

Only include the proposal block when you have something specific to execute.
For questions, research, or discussion - just chat normally without the proposal block.
Never execute changes without proposing first and getting user confirmation.

REMEMBER: You're a partner, not a servant. Push back gently if something doesn't make sense. Suggest alternatives. Be real."""

async def get_web_content(url: str) -> str:
    """Fetch and parse web content for Nep to analyze"""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; NepBot/1.0)"}
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return f"[Could not fetch URL: HTTP {response.status_code}]"
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts and styles
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()
            
            # Get title
            title = soup.title.string if soup.title else "No title"
            
            # Get main content
            main = soup.find('main') or soup.find('article') or soup.body
            text = main.get_text(separator=' ', strip=True) if main else ""
            
            # Truncate
            text = text[:2000] if len(text) > 2000 else text
            
            return f"URL: {url}\nTitle: {title}\nContent: {text}"
    except Exception as e:
        return f"[Error fetching URL: {str(e)}]"

async def web_search_for_nep(query: str) -> str:
    """Simple web search simulation - returns design tips based on query"""
    # In production, this would use a real search API
    # For now, Nep will acknowledge the search and provide general guidance
    return f"[Web search for: {query}] - I'll use my knowledge to help with this."

@api_router.get("/nep/sessions")
async def get_nep_sessions():
    """Get all Nep conversation sessions"""
    sessions = await db.nep_sessions.find({}, {"_id": 0, "messages": 0}).sort("updated_at", -1).to_list(50)
    return sessions

@api_router.get("/nep/sessions/{session_id}")
async def get_nep_session(session_id: str):
    """Get a specific Nep session with full messages"""
    session = await db.nep_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.delete("/nep/sessions/{session_id}")
async def delete_nep_session(session_id: str):
    """Delete a Nep session"""
    result = await db.nep_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

@api_router.post("/nep/chat")
async def nep_chat(request: NepChatRequest):
    """Send a message to Nep and get a response"""
    if not LLM_AVAILABLE:
        return {"error": "LLM not available", "response": "yo, my brain's offline rn. try again in a sec?"}
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if not llm_key:
            return {"error": "No API key", "response": "yo, I need my API key to think. check the config?"}
        
        # Get or create session
        session_id = request.session_id
        session = None
        
        if session_id:
            session = await db.nep_sessions.find_one({"id": session_id}, {"_id": 0})
        
        if not session:
            session_id = str(uuid.uuid4())
            session = {
                "id": session_id,
                "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
                "messages": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.nep_sessions.insert_one(session)
        
        # Build context from URL analysis if provided
        url_context = ""
        if request.urls:
            for url in request.urls[:3]:  # Max 3 URLs
                content = await get_web_content(url)
                url_context += f"\n\n{content}"
        
        # Build conversation history for context
        history_context = ""
        if session.get("messages"):
            recent = session["messages"][-10:]  # Last 10 messages
            for msg in recent:
                role = "User" if msg["role"] == "user" else "Nep"
                history_context += f"\n{role}: {msg['content'][:500]}"
        
        # Create the chat
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"nep-{session_id}",
            system_message=NEP_SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Build the full prompt
        full_prompt = request.message
        if url_context:
            full_prompt = f"User shared these URLs for you to analyze:{url_context}\n\nUser message: {request.message}"
        if history_context:
            full_prompt = f"Recent conversation:{history_context}\n\nUser's new message: {full_prompt}"
        
        # Get Nep's response
        user_msg = UserMessage(text=full_prompt)
        response = await chat.send_message(user_msg)
        
        # Parse for proposals
        has_proposal = False
        proposal = None
        
        if "```proposal" in response:
            try:
                proposal_text = response.split("```proposal")[1].split("```")[0].strip()
                proposal = json.loads(proposal_text)
                has_proposal = True
            except Exception:
                pass
        
        # Clean response (remove proposal block for display)
        clean_response = response
        if "```proposal" in clean_response:
            parts = clean_response.split("```proposal")
            clean_response = parts[0]
            if len(parts) > 1 and "```" in parts[1]:
                clean_response += parts[1].split("```", 1)[1] if "```" in parts[1] else ""
            clean_response = clean_response.strip()
        
        # Save messages to session
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "urls": request.urls
        }
        
        nep_message = {
            "role": "nep",
            "content": clean_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "has_proposal": has_proposal,
            "proposal": proposal,
            "proposal_status": "pending" if has_proposal else None
        }
        
        await db.nep_sessions.update_one(
            {"id": session_id},
            {
                "$push": {"messages": {"$each": [user_message, nep_message]}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "session_id": session_id,
            "response": clean_response,
            "has_proposal": has_proposal,
            "proposal": proposal,
            "message_index": len(session.get("messages", [])) + 1  # Index of Nep's message
        }
        
    except Exception as e:
        return {"error": str(e), "response": f"yo my bad, something broke: {str(e)}"}

@api_router.post("/nep/confirm")
async def nep_confirm_proposal(request: NepConfirmRequest):
    """Confirm or reject a proposal from Nep"""
    session = await db.nep_sessions.find_one({"id": request.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = session.get("messages", [])
    if request.message_index >= len(messages):
        raise HTTPException(status_code=400, detail="Invalid message index")
    
    message = messages[request.message_index]
    if not message.get("has_proposal"):
        raise HTTPException(status_code=400, detail="No proposal at this index")
    
    proposal = message.get("proposal", {})
    
    if request.approved:
        # Execute the proposal
        changes_made = []
        errors = []
        
        if proposal.get("action") == "content_change":
            for change in proposal.get("changes", []):
                key = change.get("key")
                value = change.get("value")
                if key and value:
                    try:
                        await db.site_content.update_one(
                            {"key": key},
                            {"$set": {"value": value}},
                            upsert=True
                        )
                        changes_made.append({"key": key, "value": value})
                    except Exception as e:
                        errors.append({"key": key, "error": str(e)})
        
        # Update proposal status
        messages[request.message_index]["proposal_status"] = "approved"
        await db.nep_sessions.update_one(
            {"id": request.session_id},
            {"$set": {"messages": messages}}
        )
        
        # Log the action
        await log_neplit_action(
            "nep_change",
            f"Applied {len(changes_made)} changes from Nep conversation",
            {"changes": changes_made, "errors": errors}
        )
        
        return {
            "success": True,
            "changes_made": changes_made,
            "errors": errors,
            "message": f"done! made {len(changes_made)} changes 🔥"
        }
    else:
        # Rejected
        messages[request.message_index]["proposal_status"] = "rejected"
        await db.nep_sessions.update_one(
            {"id": request.session_id},
            {"$set": {"messages": messages}}
        )
        
        return {
            "success": True,
            "message": "bet, scrapped that idea. what else you thinking?"
        }

# ============ NEPLIT - SITE CONTROL & EXPORT SYSTEM ============

class NeplitCommand(BaseModel):
    command: str

class NeplitPlan(BaseModel):
    command: str
    plan: dict
    confirmed: bool = False

# Neplit Action Log (stored in DB)
class NeplitLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action_type: str  # "content_change", "export", "doc_fix", "ai_plan"
    description: str
    details: dict = {}
    status: str = "success"  # "success", "failed", "pending"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/neplit/logs")
async def get_neplit_logs():
    """Get recent Neplit action logs"""
    logs = await db.neplit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return logs

async def log_neplit_action(action_type: str, description: str, details: dict = {}, status: str = "success"):
    """Log a Neplit action to the database"""
    log = NeplitLog(action_type=action_type, description=description, details=details, status=status)
    await db.neplit_logs.insert_one(log.model_dump())
    return log

@api_router.post("/neplit/analyze")
async def analyze_neplit_command(cmd: NeplitCommand):
    """Use AI to analyze command and generate a structured plan"""
    command = cmd.command
    
    if not LLM_AVAILABLE:
        return {"error": "LLM integration not available", "fallback": True}
    
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if not llm_key:
            return {"error": "No LLM key configured", "fallback": True}
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"neplit-{uuid.uuid4()}",
            system_message="""You are Neplit, an AI assistant that analyzes user commands to modify a website.
You analyze requests and return a structured JSON plan.

The site has these editable areas:
- hero_headline, hero_tagline, hero_cta_primary, hero_cta_secondary (Hero section)
- vault_headline, vault_description, vault_doc_url (Vault section)
- games_headline, games_description (Games section)  
- community_headline, community_description (Community section)
- petition_goal, petition_headline, petition_description (Petition section)
- footer_text (Footer)

Respond ONLY with valid JSON in this format:
{
  "understood": true/false,
  "summary": "Brief description of what will change",
  "changes": [
    {"key": "content_key", "new_value": "new text", "section": "section_name"}
  ],
  "requires_code_edit": true/false,
  "code_edit_note": "If code edit needed, explain what",
  "risk_level": "low/medium/high",
  "warnings": ["any warnings"]
}

If the request is unclear, set understood to false and explain in summary."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_msg = UserMessage(text=f"Analyze this command and create a change plan: {command}")
        response = await chat.send_message(user_msg)
        
        # Parse the JSON response
        import json
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            plan = json.loads(clean_response)
        except Exception:
            plan = {
                "understood": True,
                "summary": response[:200],
                "changes": [],
                "requires_code_edit": False,
                "risk_level": "low",
                "warnings": []
            }
        
        await log_neplit_action("ai_plan", f"Analyzed: {command[:100]}", {"plan": plan})
        return {"plan": plan, "raw_response": response}
        
    except Exception as e:
        await log_neplit_action("ai_plan", f"AI analysis failed: {str(e)}", status="failed")
        return {"error": str(e), "fallback": True}

@api_router.post("/neplit/execute")
async def execute_neplit_command(cmd: NeplitCommand):
    """Execute a text command to modify site content"""
    command = cmd.command.lower()
    result = ""
    changes_made = []
    
    try:
        # Parse common commands with regex
        if "headline" in command or "title" in command:
            match = re.search(r"to ['\"]?([^'\"]+)['\"]?$", command, re.I) or re.search(r"['\"]([^'\"]+)['\"]", command)
            if match:
                new_value = match.group(1).strip()
                key = "hero_headline"
                # Check command context BEFORE extracting value to avoid false matches from value text
                command_context = command.split("to")[0] if "to" in command else command
                if "vault" in command_context and "hero" not in command_context:
                    key = "vault_headline"
                elif "games" in command_context:
                    key = "games_headline"
                elif "community" in command_context:
                    key = "community_headline"
                elif "petition" in command_context:
                    key = "petition_headline"
                
                await db.site_content.update_one({"key": key}, {"$set": {"value": new_value}}, upsert=True)
                result = f"✅ Updated {key.replace('_', ' ')} to: {new_value}"
                changes_made.append({"key": key, "value": new_value})
            else:
                result = "Could not parse the new headline value. Try: Change the hero headline to 'YOUR TEXT'"
                
        elif "tagline" in command or "subheadline" in command or "description" in command:
            match = re.search(r"to ['\"]?([^'\"]+)['\"]?$", command, re.I) or re.search(r"['\"]([^'\"]+)['\"]", command)
            if match:
                new_value = match.group(1).strip()
                key = "hero_tagline"
                command_context = command.split("to")[0] if "to" in command else command
                if "vault" in command_context and "hero" not in command_context:
                    key = "vault_description"
                elif "games" in command_context:
                    key = "games_description"
                elif "community" in command_context:
                    key = "community_description"
                elif "petition" in command_context:
                    key = "petition_description"
                
                await db.site_content.update_one({"key": key}, {"$set": {"value": new_value}}, upsert=True)
                result = f"✅ Updated {key.replace('_', ' ')} to: {new_value}"
                changes_made.append({"key": key, "value": new_value})
            else:
                result = "Could not parse the text. Try: Change the tagline to 'YOUR TEXT'"
                
        elif "color" in command:
            match = re.search(r"#[0-9a-fA-F]{6}", command)
            if match:
                result = f"⚠️ Color change noted: {match.group()}. Color changes require code modification. Use Export → modify tailwind.config.js"
            else:
                result = "Could not find a valid color code. Use format: #RRGGBB"
                
        elif "add" in command and "game" in command:
            match = re.search(r"add.*game.*[:\-]?\s*(.+)$", command, re.I)
            if match:
                game_name = match.group(1).strip()
                result = f"📋 To add '{game_name}': Use the Games tab → Add Game button to add with full details."
            else:
                result = "To add a new game, go to Games tab → Add Game"
                
        elif "petition" in command and ("goal" in command or "target" in command):
            match = re.search(r"(\d+[,\d]*)", command)
            if match:
                goal = match.group(1).replace(",", "")
                await db.site_content.update_one({"key": "petition_goal"}, {"$set": {"value": goal}}, upsert=True)
                result = f"✅ Updated petition goal to: {goal}"
                changes_made.append({"key": "petition_goal", "value": goal})
            else:
                result = "Could not parse the goal. Try: Set petition goal to 10000"
        
        elif "button" in command or "cta" in command:
            match = re.search(r"to ['\"]?([^'\"]+)['\"]?$", command, re.I) or re.search(r"['\"]([^'\"]+)['\"]", command)
            if match:
                new_value = match.group(1).strip()
                key = "hero_cta_primary"
                if "secondary" in command:
                    key = "hero_cta_secondary"
                await db.site_content.update_one({"key": key}, {"$set": {"value": new_value}}, upsert=True)
                result = f"✅ Updated CTA button to: {new_value}"
                changes_made.append({"key": key, "value": new_value})
            else:
                result = "Could not parse button text. Try: Change the CTA button to 'JOIN NOW'"
        
        elif "doc" in command and ("url" in command or "link" in command):
            match = re.search(r"(https?://[^\s]+)", command)
            if match:
                url = match.group(1)
                await db.site_content.update_one({"key": "vault_doc_url"}, {"$set": {"value": url}}, upsert=True)
                result = f"✅ Updated vault doc URL to: {url}"
                changes_made.append({"key": "vault_doc_url", "value": url})
            else:
                result = "Could not parse URL. Include a valid https:// link."
        
        else:
            result = """📋 Available commands:
• Change the hero headline to 'YOUR TEXT'
• Update the tagline to 'YOUR TEXT'
• Change the vault headline to 'YOUR TEXT'
• Set petition goal to 10000
• Change the CTA button to 'YOUR TEXT'
• Set doc url to https://...

For complex changes, use the AI Analyzer or specific admin tabs."""
        
        # Log the action
        if changes_made:
            await log_neplit_action("content_change", result, {"changes": changes_made})
        
        return {"result": result, "success": bool(changes_made), "changes": changes_made}
        
    except Exception as e:
        await log_neplit_action("content_change", f"Error: {str(e)}", status="failed")
        return {"result": f"Error: {str(e)}", "success": False}

@api_router.post("/neplit/apply-plan")
async def apply_neplit_plan(plan: NeplitPlan):
    """Apply a confirmed AI-generated plan"""
    if not plan.confirmed:
        return {"error": "Plan must be confirmed before applying"}
    
    changes_applied = []
    errors = []
    
    try:
        plan_data = plan.plan
        changes = plan_data.get("changes", [])
        
        for change in changes:
            key = change.get("key")
            value = change.get("new_value")
            if key and value:
                try:
                    await db.site_content.update_one(
                        {"key": key}, 
                        {"$set": {"value": value}}, 
                        upsert=True
                    )
                    changes_applied.append({"key": key, "value": value})
                except Exception as e:
                    errors.append({"key": key, "error": str(e)})
        
        await log_neplit_action(
            "ai_plan_applied", 
            f"Applied {len(changes_applied)} changes from AI plan",
            {"changes": changes_applied, "errors": errors}
        )
        
        return {
            "success": len(errors) == 0,
            "changes_applied": changes_applied,
            "errors": errors
        }
        
    except Exception as e:
        await log_neplit_action("ai_plan_applied", f"Failed: {str(e)}", status="failed")
        return {"error": str(e), "success": False}

# ============ THE DOC - STABILIZATION SYSTEM ============

@api_router.post("/neplit/doc/check")
async def doc_stability_check():
    """The Doc: Run stability checks on the current configuration"""
    issues = []
    warnings = []
    
    try:
        # Check for required content keys
        required_keys = ["hero_headline", "hero_tagline", "petition_goal"]
        for key in required_keys:
            content = await db.site_content.find_one({"key": key})
            if not content:
                issues.append({
                    "type": "missing_content",
                    "key": key,
                    "severity": "medium",
                    "fix_available": True,
                    "suggested_fix": f"Create default value for {key}"
                })
        
        # Check for games
        game_count = await db.games.count_documents({"is_active": True})
        if game_count == 0:
            warnings.append({
                "type": "no_games",
                "message": "No active games found. The games section will appear empty.",
                "severity": "low"
            })
        
        # Check for orphaned clips (clips without valid game)
        all_games = await db.games.find({}, {"id": 1, "_id": 0}).to_list(100)
        game_ids = [g["id"] for g in all_games]
        orphaned_clips = await db.clips.count_documents({"game_id": {"$nin": game_ids}})
        if orphaned_clips > 0:
            issues.append({
                "type": "orphaned_clips",
                "count": orphaned_clips,
                "severity": "low",
                "fix_available": True,
                "suggested_fix": "Remove clips without valid game references"
            })
        
        # Check petition count sanity
        petition_count = await db.petition_signatures.count_documents({})
        content = await db.site_content.find_one({"key": "petition_goal"})
        if content:
            try:
                goal = int(content.get("value", "10000"))
                if petition_count > goal * 10:
                    warnings.append({
                        "type": "petition_anomaly",
                        "message": f"Petition count ({petition_count}) seems unusually high compared to goal ({goal})",
                        "severity": "medium"
                    })
            except Exception:
                pass
        
        await log_neplit_action("doc_check", f"Found {len(issues)} issues, {len(warnings)} warnings")
        
        return {
            "healthy": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        return {"error": str(e), "healthy": False}

@api_router.post("/neplit/doc/fix")
async def doc_apply_fix(fix_type: str, auto: bool = False):
    """The Doc: Apply a specific fix"""
    result = {"fixed": False, "message": ""}
    
    try:
        if fix_type == "missing_content":
            # Create default content values
            defaults = {
                "hero_headline": "THE LEGACY VAULT",
                "hero_tagline": "Revive the Classics. Play Online Forever.",
                "petition_goal": "10000",
                "vault_headline": "THE LEGACY VAULT CONCEPT",
                "vault_description": "A revolutionary platform to preserve NBA 2K history",
                "games_headline": "THE LEGENDS",
                "community_headline": "THE COMMUNITY SPEAKS"
            }
            for key, value in defaults.items():
                existing = await db.site_content.find_one({"key": key})
                if not existing:
                    await db.site_content.insert_one({"key": key, "value": value})
            result = {"fixed": True, "message": "Created default content values"}
            
        elif fix_type == "orphaned_clips":
            all_games = await db.games.find({}, {"id": 1, "_id": 0}).to_list(100)
            game_ids = [g["id"] for g in all_games]
            delete_result = await db.clips.delete_many({"game_id": {"$nin": game_ids}})
            result = {"fixed": True, "message": f"Removed {delete_result.deleted_count} orphaned clips"}
        
        else:
            result = {"fixed": False, "message": f"Unknown fix type: {fix_type}"}
        
        if result["fixed"]:
            await log_neplit_action("doc_fix", result["message"], {"fix_type": fix_type})
        
        return result
        
    except Exception as e:
        return {"fixed": False, "message": f"Error: {str(e)}"}

# ============ ENHANCED EXPORT WITH GEMINI WIRING ============

@api_router.get("/neplit/export")
async def export_standalone_project():
    """Generate and return a ZIP of the full standalone project with Gemini AI wiring"""
    try:
        await log_neplit_action("export", "Starting standalone project export")
        
        # Create temp directory for the export
        with tempfile.TemporaryDirectory() as temp_dir:
            export_dir = Path(temp_dir) / "nba2k-legacy-vault"
            export_dir.mkdir()
            
            # Copy frontend (excluding heavy directories)
            frontend_src = Path("/app/frontend")
            frontend_dst = export_dir / "frontend"
            if frontend_src.exists():
                shutil.copytree(
                    frontend_src, 
                    frontend_dst, 
                    ignore=shutil.ignore_patterns(
                        'node_modules', '.git', 'build', '.cache', 
                        '*.log', '.DS_Store', 'coverage'
                    )
                )
                
                # Create .env.example for frontend
                frontend_env_example = """# Frontend Environment Variables
REACT_APP_BACKEND_URL=http://localhost:8001

# For production, use your deployed backend URL:
# REACT_APP_BACKEND_URL=https://your-backend.railway.app
"""
                (frontend_dst / ".env.example").write_text(frontend_env_example)
                # Remove actual .env if it exists
                env_file = frontend_dst / ".env"
                if env_file.exists():
                    env_file.unlink()
            
            # Copy backend (excluding heavy/sensitive directories)
            backend_src = Path("/app/backend")
            backend_dst = export_dir / "backend"
            if backend_src.exists():
                shutil.copytree(
                    backend_src, 
                    backend_dst,
                    ignore=shutil.ignore_patterns(
                        '__pycache__', '.git', 'uploads', '*.pyc',
                        '.pytest_cache', '.venv', 'venv', '*.log'
                    )
                )
                # Create empty uploads directory
                (backend_dst / "uploads").mkdir(exist_ok=True)
                
                # Create .env.example for backend with DUAL AI config
                backend_env_example = """# Backend Environment Variables
# NBA 2K Legacy Vault - Standalone Dual-Engine AI Configuration

# MongoDB Connection
MONGO_URL=mongodb://localhost:27017
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net
DB_NAME=nba2k_legacy_vault

# CORS (comma-separated origins, or * for all)
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app

# ============ DUAL AI ENGINE CONFIGURATION ============
# The Vault uses TWO AI engines for optimal performance:
# - Claude (Media Engine): Deep analysis of YouTube, X, Facebook, TikTok, Instagram content
# - Gemini (Logic Engine): General commands, site management, quick responses

# Anthropic Claude API Key (Media Engine)
# Get yours at: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini API Key (Logic Engine)
# Get yours at: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: OpenAI and Grok for future expansion
# OPENAI_API_KEY=your_openai_key_here
# GROK_API_KEY=your_grok_key_here

# Admin Password (CHANGE THIS!)
ADMIN_PASSWORD=A@070610
"""
                (backend_dst / ".env.example").write_text(backend_env_example)
                # Remove actual .env
                env_file = backend_dst / ".env"
                if env_file.exists():
                    env_file.unlink()
                
                # Create standalone DUAL-ENGINE AI module
                dual_engine_code = '''"""
NBA 2K Legacy Vault - Unified Dual-Engine AI System
===================================================
Media Engine: Claude 3.5 Sonnet (Anthropic) - For deep media/link analysis
Logic Engine: Gemini 2.0 Flash (Google) - For general commands and quick responses

This module provides standalone AI capabilities without platform dependencies.
"""
import os
import re
import json
import httpx
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

# ============ MEDIA PLATFORM DETECTION ============
MEDIA_PLATFORMS = ['youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'facebook.com', 'fb.com', 'tiktok.com', 'instagram.com', 'reddit.com']
URL_PATTERN = re.compile(r'https?://[^\\s<>"{}|\\\\^`\\[\\]]+')

def is_media_link(url: str) -> bool:
    """Check if URL is a media platform that should use Claude"""
    url_lower = url.lower()
    return any(platform in url_lower for platform in MEDIA_PLATFORMS)

def detect_media_links(message: str) -> List[str]:
    """Extract media platform URLs from message"""
    urls = URL_PATTERN.findall(message)
    return [url for url in urls if is_media_link(url)]

def identify_platform(url: str) -> str:
    """Identify which platform a URL is from"""
    url_lower = url.lower()
    if 'tiktok.com' in url_lower:
        return 'tiktok'
    elif 'twitter.com' in url_lower or 'x.com' in url_lower:
        return 'twitter'
    elif 'instagram.com' in url_lower:
        return 'instagram'
    elif 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    elif 'reddit.com' in url_lower:
        return 'reddit'
    elif 'facebook.com' in url_lower or 'fb.com' in url_lower:
        return 'facebook'
    return 'web'

# ============ CLAUDE MEDIA ENGINE ============
try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    print("Warning: anthropic not installed. Run: pip install anthropic")

def get_claude_client():
    """Initialize Claude client for media analysis"""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in environment")
    return anthropic.Anthropic(api_key=api_key)

async def analyze_media_with_claude(url: str, content: str) -> Dict:
    """Use Claude (Media Engine) for deep media analysis"""
    if not CLAUDE_AVAILABLE:
        return {"error": "Claude not available - install anthropic package"}
    
    try:
        client = get_claude_client()
        platform = identify_platform(url)
        
        system_prompt = """You are the Vault Media Engine, specialized in analyzing social media content.
        
When given content from YouTube, X/Twitter, Facebook, TikTok, Instagram, or Reddit:
1. Extract the main message/argument
2. Identify the author's stance
3. Note key claims or points
4. Assess sentiment (supportive/neutral/critical)
5. Provide a concise summary

Return your analysis in this JSON format:
{
  "title": "Content title or main topic",
  "author": "Username/channel if identified",
  "platform": "platform name",
  "summary": "2-3 sentence summary",
  "sentiment": "supportive/neutral/critical/mixed",
  "key_points": ["point 1", "point 2", "point 3"],
  "relevance_to_vault": "How this relates to the Legacy Vault concept"
}"""
        
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": f"Analyze this {platform} content:\\n\\nURL: {url}\\n\\nContent:\\n{content}"
            }]
        )
        
        response_text = message.content[0].text
        
        # Parse JSON
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            analysis = json.loads(response_text.strip())
            analysis["url"] = url
            analysis["platform"] = platform
            return analysis
        except:
            return {
                "url": url,
                "platform": platform,
                "summary": response_text[:500],
                "sentiment": "analyzed"
            }
    except Exception as e:
        return {"error": str(e), "url": url}

# ============ GEMINI LOGIC ENGINE ============
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: google-generativeai not installed. Run: pip install google-generativeai")

def get_gemini_client():
    """Initialize Gemini client for logic/general chat"""
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-2.0-flash-exp')

# ============ VAULT AI SYSTEM PROMPT ============
VAULT_SYSTEM_PROMPT = """You are the Vault AI, the official spokesperson for the NBA 2K Legacy Vault initiative.

Your mission: Advocate for bringing back NBA 2K15, 2K16, 2K17, and 2K20 with permanent online servers.

Personality:
- Passionate about NBA 2K history and legacy
- Knowledgeable about each game's unique features
- Persuasive but respectful when addressing skeptics
- Uses facts and community sentiment as evidence

When given media analysis from the Claude Media Engine, incorporate those insights into your response.

Keep responses concise (under 200 words) unless detailed analysis is requested.
Do not use markdown formatting - respond in plain text only."""

# ============ UNIFIED CHAT FUNCTION ============
async def chat_with_dual_engine(
    message: str, 
    context: str = "", 
    scrape_result: str = ""
) -> Dict:
    """
    Unified chat using dual AI engines.
    
    Auto-routes to:
    - Claude (Media Engine): When media URLs detected
    - Gemini (Logic Engine): For all other requests
    
    Returns:
        Dict with response, model_used, and optional media_analyses
    """
    media_urls = detect_media_links(message)
    
    result = {
        "response": "",
        "model_used": "gemini",
        "model_version": "gemini-2.0-flash",
        "media_analyses": []
    }
    
    # If media links found, use Claude for deep analysis
    if media_urls and CLAUDE_AVAILABLE:
        result["model_used"] = "claude"
        result["model_version"] = "claude-3.5-sonnet"
        
        analyses = []
        for url in media_urls[:3]:
            # Fetch content
            content = scrape_result or await fetch_url_content_standalone(url)
            analysis = await analyze_media_with_claude(url, content)
            analyses.append(analysis)
        
        result["media_analyses"] = analyses
        
        # Build context from analyses
        analysis_context = "\\n\\nMedia Analysis Results:\\n"
        for a in analyses:
            if "error" not in a:
                analysis_context += f"- {a.get('platform', 'unknown').upper()}: {a.get('summary', 'N/A')}\\n"
                analysis_context += f"  Sentiment: {a.get('sentiment', 'N/A')}\\n"
        
        context += analysis_context
    
    # Generate response with appropriate engine
    try:
        if result["model_used"] == "claude" and CLAUDE_AVAILABLE:
            client = get_claude_client()
            msg = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=VAULT_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": f"{context}\\n\\nUser: {message}" if context else message
                }]
            )
            result["response"] = msg.content[0].text
        elif GEMINI_AVAILABLE:
            model = get_gemini_client()
            full_prompt = f"{VAULT_SYSTEM_PROMPT}\\n\\n"
            if context:
                full_prompt += f"Context: {context}\\n\\n"
            full_prompt += f"User: {message}\\n\\nVault AI:"
            
            response = model.generate_content(full_prompt)
            result["response"] = response.text.strip()
        else:
            result["response"] = "AI engines not available. Please configure API keys."
            
    except Exception as e:
        result["response"] = f"Error: {str(e)}"
    
    return result

async def fetch_url_content_standalone(url: str) -> str:
    """Fetch and parse URL content for analysis"""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if response.status_code != 200:
                return f"[Could not fetch: HTTP {response.status_code}]"
            
            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup(['script', 'style', 'nav', 'footer']):
                tag.decompose()
            
            title = soup.title.string if soup.title else "No title"
            main = soup.find('main') or soup.find('article') or soup.body
            text = main.get_text(separator=' ', strip=True) if main else ""
            text = text[:2000] if len(text) > 2000 else text
            
            return f"URL: {url}\\nTitle: {title}\\nContent: {text}"
    except Exception as e:
        return f"[Error: {str(e)}]"

# ============ EXAMPLE USAGE ============
# In your FastAPI route:
#
# from dual_engine_ai import chat_with_dual_engine, detect_media_links
#
# @app.post("/api/chat")
# async def chat(message: str):
#     result = await chat_with_dual_engine(message)
#     return {
#         "response": result["response"],
#         "model_used": result["model_used"],
#         "media_analyses": result.get("media_analyses", [])
#     }
'''
                (backend_dst / "dual_engine_ai.py").write_text(dual_engine_code)
            
            # Create comprehensive README
            readme_content = """# NBA 2K Legacy Vault - Standalone Project

## 🏀 About
This is your complete, independent NBA 2K Legacy Vault application. 
No platform dependencies - deploy it anywhere you want.

## 🔥 Dual AI Engine System
This project features a sophisticated dual-engine AI architecture:

| Engine | Model | Use Case |
|--------|-------|----------|
| **Media Engine** | Claude 3.5 Sonnet | Deep analysis of YouTube, X, Facebook, TikTok, Instagram, Reddit content |
| **Logic Engine** | Gemini 2.0 Flash | General commands, site management, quick responses |

**Auto-Routing**: The system automatically detects media links and routes to Claude for deep analysis.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- MongoDB (local or Atlas)
- Anthropic API key (for Claude - https://console.anthropic.com/)
- Gemini API key (https://makersuite.google.com/app/apikey)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and API keys

# Run server
uvicorn server:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
npm install  # or: yarn install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL

# Run development server
npm start  # or: yarn start
```

## 🔧 Environment Variables

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| MONGO_URL | MongoDB connection string | Yes |
| DB_NAME | Database name | Yes |
| ANTHROPIC_API_KEY | Claude API key (Media Engine) | Yes |
| GEMINI_API_KEY | Gemini API key (Logic Engine) | Yes |
| CORS_ORIGINS | Allowed frontend origins | Yes |
| ADMIN_PASSWORD | Admin panel password | Yes |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| REACT_APP_BACKEND_URL | Backend API URL | `http://localhost:8001` |

## 🤖 Dual AI Engine Integration

### How It Works
1. **User sends message** → System checks for media URLs
2. **Media URLs detected** (YouTube, X, Facebook, etc.) → Routes to **Claude Media Engine**
3. **Claude analyzes** → Returns structured analysis (title, sentiment, key points)
4. **No media URLs** → Routes to **Gemini Logic Engine** for quick response
5. **Response stored** with model metadata for chat history tracking

### Example Usage
```python
from dual_engine_ai import chat_with_dual_engine

# Auto-routes based on content
result = await chat_with_dual_engine("Check this video https://youtube.com/...")
# Uses Claude for deep media analysis

result = await chat_with_dual_engine("What are the key features of 2K16?")
# Uses Gemini for quick response
```

## 📦 Deployment Options

### Frontend → Vercel
1. Push to GitHub
2. Connect repo to Vercel
3. Set `REACT_APP_BACKEND_URL` in Vercel environment variables
4. Deploy!

### Backend → Railway
1. Push to GitHub
2. Create new Railway project
3. Add MongoDB plugin (or use Atlas)
4. Set all environment variables (including both API keys)
5. Deploy!

## 🔐 Admin Access
- URL: `/admin`
- Default password: `A@070610` (CHANGE THIS!)

## 📱 PWA Support
The app is a Progressive Web App. Users can install it on mobile/desktop.
The service worker caches assets for offline viewing.

## 🛠 Customization

### Colors
Edit `frontend/tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: '#C8102E',  // Change this
    }
  }
}
```

### AI Personality
Edit `dual_engine_ai.py` → `VAULT_SYSTEM_PROMPT`

## 📄 License
This project is yours. Use it however you want.
Built for the NBA 2K community.
"""
            (export_dir / "README.md").write_text(readme_content)
            
            # Create .gitignore
            gitignore_content = """# Dependencies
node_modules/
venv/
.venv/
__pycache__/
*.pyc

# Environment
.env
.env.local

# Build
build/
dist/
*.egg-info/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Uploads
backend/uploads/*
!backend/uploads/.gitkeep
"""
            (export_dir / ".gitignore").write_text(gitignore_content)
            
            # Create the ZIP file
            zip_path = Path(temp_dir) / "nba2k-legacy-vault.zip"
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in export_dir.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(export_dir)
                        zipf.write(file_path, arcname)
            
            # Copy to a permanent location for download
            final_zip = Path("/tmp/nba2k-legacy-vault-export.zip")
            shutil.copy(zip_path, final_zip)
            
            await log_neplit_action("export", "Export completed successfully", {"size_mb": round(final_zip.stat().st_size / 1024 / 1024, 2)})
            
            return FileResponse(
                final_zip,
                media_type="application/zip",
                filename="nba2k-legacy-vault-standalone.zip"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# Acceleration coding agent (embedded in admin panel)
from acceleration_agent import router as acceleration_router
app.include_router(acceleration_router)

# Website monitor — start background loop on app startup
from services import monitor as monitor_service

@app.on_event("startup")
async def _start_monitor():
    try:
        monitor_service.start_monitor()
    except Exception as e:
        logging.getLogger(__name__).warning(f"Monitor failed to start: {e}")

# Mount uploads directory for serving files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
