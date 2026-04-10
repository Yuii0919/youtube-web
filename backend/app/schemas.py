"""
Pydantic 請求／回應模型（與前端 services/api.ts 對齊）。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TranslateIn(BaseModel):
    """翻譯請求（前端欄位為 q）。"""

    q: str = Field(min_length=1)


class TranslateOut(BaseModel):
    """翻譯回應。"""

    translated: str


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=256)


class FolderUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=256)


class FolderOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoPatch(BaseModel):
    folder_id: int | None = None


class VideoCreateBody(BaseModel):
    youtube_url: str = Field(min_length=1)


class VideoListOut(BaseModel):
    id: int
    youtube_id: str
    title: str
    channel: str
    duration: float | None
    thumbnail_url: str
    segment_count: int
    folder_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SegmentOut(BaseModel):
    id: int
    index: int
    start_time: float
    end_time: float
    text_en: str
    text_zh: str
    letter_template: str

    model_config = {"from_attributes": True}


class VideoDetailOut(BaseModel):
    id: int
    youtube_id: str
    title: str
    channel: str
    duration: float | None
    thumbnail_url: str
    segments: list[SegmentOut]


class AutoSubtitleBody(BaseModel):
    youtube_url: str = Field(min_length=1)


class VideoDownloadOut(BaseModel):
    video_path: str
    message: str


class AiSettingsDto(BaseModel):
    provider: str
    openai_base_url: str
    openai_model: str
    openai_key_masked: str
    has_openai_key: bool
    gemini_model: str
    gemini_key_masked: str
    has_gemini_key: bool
    ollama_base_url: str
    ollama_model: str
    updated_at: datetime | None


class PutAiSettingsBody(BaseModel):
    provider: str | None = None
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_model: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str | None = None
    ollama_base_url: str | None = None
    ollama_model: str | None = None


class TestConnectionResult(BaseModel):
    ok: bool
    message: str


class PostAiExplainBody(BaseModel):
    sentence_en: str = Field(min_length=1)
    full_sentence_zh: str | None = None


class AiExplainOut(BaseModel):
    explanation: str


class HealthOut(BaseModel):
    status: str
