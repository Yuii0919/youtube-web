"""
影片資料夾 CRUD。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Folder, Video
from app.schemas import FolderCreate, FolderOut, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[FolderOut])
def list_folders(db: Session = Depends(get_db)) -> list[Folder]:
    """列出所有資料夾。"""
    rows = db.scalars(select(Folder).order_by(Folder.id.asc())).all()
    return list(rows)


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(body: FolderCreate, db: Session = Depends(get_db)) -> Folder:
    """新增資料夾。"""
    f = Folder(name=body.name.strip())
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@router.patch("/{folder_id}", response_model=FolderOut)
def update_folder(
    folder_id: int,
    body: FolderUpdate,
    db: Session = Depends(get_db),
) -> Folder:
    """重新命名資料夾。"""
    f = db.get(Folder, folder_id)
    if f is None:
        raise HTTPException(status_code=404, detail="資料夾不存在")
    f.name = body.name.strip()
    db.commit()
    db.refresh(f)
    return f


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(folder_id: int, db: Session = Depends(get_db)) -> None:
    """刪除資料夾；旗下影片改為未分類。"""
    f = db.get(Folder, folder_id)
    if f is None:
        raise HTTPException(status_code=404, detail="資料夾不存在")
    for v in db.scalars(select(Video).where(Video.folder_id == folder_id)).all():
        v.folder_id = None
    db.delete(f)
    db.commit()
