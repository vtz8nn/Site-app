from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------------- MongoDB ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


# ---------------- Auth helpers ----------------
JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------- Models ----------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class StoreConfig(BaseModel):
    whatsapp_dono: str = ""
    store_name: str = "Minha Loja"


class ProductCreate(BaseModel):
    nome: str
    foto_url: str = ""  # base64 data URL
    preco_venda: float
    quantidade_estoque: int
    estoque_minimo: int
    whatsapp_fornecedor: str = ""


class ProductUpdate(BaseModel):
    nome: Optional[str] = None
    foto_url: Optional[str] = None
    preco_venda: Optional[float] = None
    quantidade_estoque: Optional[int] = None
    estoque_minimo: Optional[int] = None
    whatsapp_fornecedor: Optional[str] = None


# ---------------- App / router ----------------
app = FastAPI()
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Estoque API"}


# ---------------- Auth endpoints ----------------
@api.post("/auth/register")
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name or email.split("@")[0],
        "password_hash": hash_password(payload.password),
        "picture": "",
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"user_id": user_id, "email": email, "name": doc["name"], "picture": "", "access_token": token}


@api.post("/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, token)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture", ""),
        "access_token": token,
    }


@api.post("/auth/google-session")
async def google_session(payload: GoogleSessionRequest, response: Response):
    # Exchange Emergent session_id for user info
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão Google inválida")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email),
            "picture": data.get("picture", ""),
            "password_hash": None,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, token)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture", ""),
        "access_token": token,
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------------- Store Config ----------------
@api.get("/config")
async def get_config(user: dict = Depends(get_current_user)):
    cfg = await db.store_configs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not cfg:
        cfg = {"user_id": user["user_id"], "whatsapp_dono": "", "store_name": "Minha Loja"}
    return cfg


@api.put("/config")
async def update_config(payload: StoreConfig, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = user["user_id"]
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.store_configs.update_one(
        {"user_id": user["user_id"]}, {"$set": doc}, upsert=True
    )
    doc.pop("_id", None)
    return doc


# ---------------- Products ----------------
def product_serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@api.get("/products")
async def list_products(user: dict = Depends(get_current_user)):
    items = await db.products.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.post("/products")
async def create_product(payload: ProductCreate, user: dict = Depends(get_current_user)):
    pid = str(uuid.uuid4())
    doc = payload.model_dump()
    doc["id"] = pid
    doc["user_id"] = user["user_id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.products.insert_one(doc)
    return product_serialize(doc)


@api.get("/products/{product_id}")
async def get_product(product_id: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": product_id, "user_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return p


@api.put("/products/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nada para atualizar")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one(
        {"id": product_id, "user_id": user["user_id"]}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    return p


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    r = await db.products.delete_one({"id": product_id, "user_id": user["user_id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"ok": True}


class StockAdjust(BaseModel):
    delta: int


@api.post("/products/{product_id}/adjust")
async def adjust_stock(product_id: str, payload: StockAdjust, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": product_id, "user_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    new_qty = max(0, p["quantidade_estoque"] + payload.delta)
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"quantidade_estoque": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    p["quantidade_estoque"] = new_qty
    return p


# ---------------- Startup ----------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.products.create_index([("user_id", 1), ("created_at", -1)])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@estoque.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one(
            {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": admin_email,
                "name": "Admin",
                "password_hash": hash_password(admin_password),
                "picture": "",
                "auth_provider": "password",
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    else:
        if not existing.get("password_hash") or not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}},
            )


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

frontend_url = os.environ.get("FRONTEND_URL", "")
allowed = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")]
if frontend_url and frontend_url not in allowed:
    allowed.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed if allowed != ["*"] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
