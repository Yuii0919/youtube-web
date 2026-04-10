"""
SQLAlchemy 模型：資料夾、影片、字幕段、AI 設定。
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Folder(Base):
    """使用者影片資料夾。"""

    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    videos: Mapped[list["Video"]] = relationship("Video", back_populates="folder")


class Video(Base):
    """影片庫項目（YouTube）。"""

    __tablename__ = "videos"
    __table_args__ = (UniqueConstraint("youtube_id", name="uq_videos_youtube_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    youtube_id: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(512), default="")
    channel: Mapped[str] = mapped_column(String(256), default="")
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    thumbnail_url: Mapped[str] = mapped_column(String(1024), default="")
    folder_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("folders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    folder: Mapped["Folder | None"] = relationship("Folder", back_populates="videos")
    segments: Mapped[list["Segment"]] = relationship(
        "Segment",
        back_populates="video",
        cascade="all, delete-orphan",
    )


class Segment(Base):
    """字幕分段（聽打用）。"""

    __tablename__ = "segments"
    __table_args__ = (UniqueConstraint("video_id", "index", name="uq_segments_video_index"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    text_en: Mapped[str] = mapped_column(Text, default="")
    text_zh: Mapped[str] = mapped_column(Text, default="")
    letter_template: Mapped[str] = mapped_column(Text, default="")

    video: Mapped["Video"] = relationship("Video", back_populates="segments")


class AiSetting(Base):
    """AI 解說設定（單例 id=1）。"""

    __tablename__ = "ai_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), default="openai")
    openai_base_url: Mapped[str] = mapped_column(String(512), default="https://api.openai.com/v1")
    openai_model: Mapped[str] = mapped_column(String(128), default="gpt-4o-mini")
    openai_api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    gemini_model: Mapped[str] = mapped_column(String(128), default="gemini-1.5-flash")
    gemini_api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ollama_base_url: Mapped[str] = mapped_column(String(512), default="http://127.0.0.1:11434")
    ollama_model: Mapped[str] = mapped_column(String(128), default="llama3.2")
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
