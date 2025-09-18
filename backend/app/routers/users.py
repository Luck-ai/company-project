from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from .. import models, schemas
from ..database import get_db
import hashlib
import logging
from ..security import create_access_token
from datetime import timedelta
import secrets
from datetime import datetime, timezone
from fastapi import BackgroundTasks
from .. import schemas
from ..routers.email import send_verification_email_sync

router = APIRouter(prefix="/users", tags=["users"])


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


@router.post("/", response_model=schemas.UserOut)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    hashed = _hash_password(user.password)
    # create verification token and set not verified
    token = secrets.token_urlsafe(32)
    db_user = models.User(full_name=user.full_name, email=user.email, password_hash=hashed,
                          is_verified=False, verification_token=token,
                          verification_sent_at=datetime.now(timezone.utc))
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.get("/", response_model=List[schemas.UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(models.User))
        users = result.scalars().all()
        return users

@router.post('/login', response_model=schemas.Token)
async def login(data: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    hashed = _hash_password(data.password)
    result = await db.execute(select(models.User).where(models.User.email == data.email))
    user = result.scalars().first()
    if not user or user.password_hash != hashed:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    if not getattr(user, 'is_verified', False):
        raise HTTPException(status_code=403, detail='Email not verified')
    # create token with subject = user.id
    access_token_expires = timedelta(minutes=60)
    token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}

@router.post('/send-verification')
async def send_verification(request: schemas.VerifyRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # find user and ensure token exists
    result = await db.execute(select(models.User).where(models.User.email == request.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if getattr(user, 'is_verified', False):
        return {"status": "ok", "detail": "Already verified"}

    # ensure token exists, otherwise create one
    if not user.verification_token:
        user.verification_token = secrets.token_urlsafe(32)
        user.verification_sent_at = datetime.now(timezone.utc)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # background task: call the SendGrid helper directly (runs in background thread)
    verify_link = f"http://localhost:3000/verify?token={user.verification_token}&email={user.email}"
    background_tasks.add_task(send_verification_email_sync, user.email, verify_link, user.full_name)
    return {"status": "ok", "detail": "Verification email queued"}


@router.get('/verify')
async def verify_email(token: str, email: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.is_verified:
        return {"status": "ok", "detail": "Already verified"}
    if not user.verification_token or user.verification_token != token:
        raise HTTPException(status_code=400, detail='Invalid token')
    user.is_verified = True
    user.verification_token = None
    db.add(user)
    await db.commit()
    return {"status": "ok", "detail": "Email verified"}
