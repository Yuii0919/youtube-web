"""
影片庫、字幕、下載。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Segment, Video
from app.schemas import (
    AutoSubtitleBody,
    VideoCreateBody,
    VideoDetailOut,
    VideoDownloadOut,
    VideoListOut,
    VideoPatch,
    SegmentOut,
)
from app.services.srt_ingest import segments_from_pysrt, pysrt_from_string
from app.services.youtube_id import canonical_watch_url, extract_youtube_video_id
from app.services.youtube_oembed import fetch_oembed_sync
from app.services.ytdlp_subs import download_auto_subs_srt, download_video_file

router = APIRouter(prefix="/videos", tags=["videos"])


def _segment_count(db: Session, video_id: int) -> int:
    n = db.scalar(select(func.count()).select_from(Segment).where(Segment.video_id == video_id))
    return int(n or 0)


def _to_list_out(db: Session, v: Video) -> VideoListOut:
    return VideoListOut(
        id=v.id,
        youtube_id=v.youtube_id,
        title=v.title,
        channel=v.channel,
        duration=v.duration,
        thumbnail_url=v.thumbnail_url,
        segment_count=_segment_count(db, v.id),
        folder_id=v.folder_id,
        created_at=v.created_at,
    )


def _to_detail_out(v: Video, segments: list[Segment]) -> VideoDetailOut:
    return VideoDetailOut(
        id=v.id,
        youtube_id=v.youtube_id,
        title=v.title,
        channel=v.channel,
        duration=v.duration,
        thumbnail_url=v.thumbnail_url,
        segments=[SegmentOut.model_validate(s) for s in segments],
    )


@router.get("", response_model=list[VideoListOut])
def list_videos(
    db: Session = Depends(get_db),
    folder_id: int | None = None,
    uncategorized_only: bool = False,
) -> list[VideoListOut]:
    """列出影片；可篩選資料夾或未分類。"""
    q = select(Video).order_by(Video.id.desc())
    if uncategorized_only:
        q = q.where(Video.folder_id.is_(None))
    elif folder_id is not None:
        q = q.where(Video.folder_id == folder_id)
    rows = db.scalars(q).all()
    return [_to_list_out(db, v) for v in rows]


@router.post("", response_model=VideoListOut, status_code=status.HTTP_201_CREATED)
def create_video(body: VideoCreateBody, db: Session = Depends(get_db)) -> VideoListOut:
    """由 YouTube 網址新增影片（重複 id 則回傳既有列）。"""
    vid = extract_youtube_video_id(body.youtube_url)
    if not vid:
        raise HTTPException(status_code=400, detail="無法解析 YouTube 影片 id")

    existing = db.scalar(select(Video).where(Video.youtube_id == vid))
    if existing:
        return _to_list_out(db, existing)

    watch = canonical_watch_url(vid)
    try:
        o = fetch_oembed_sync(watch)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"無法取得影片資訊：{e}") from e

    title = str(o.get("title") or "")
    channel = str(o.get("author_name") or "")
    thumb = str(o.get("thumbnail_url") or "")
    duration = o.get("duration") if isinstance(o.get("duration"), (int, float)) else None

    v = Video(
        youtube_id=vid,
        title=title,
        channel=channel,
        duration=float(duration) if duration is not None else None,
        thumbnail_url=thumb,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return _to_list_out(db, v)


@router.patch("/{video_id}", response_model=VideoListOut)
def patch_video(
    video_id: int,
    body: VideoPatch,
    db: Session = Depends(get_db),
) -> VideoListOut:
    """變更影片所屬資料夾。"""
    v = db.get(Video, video_id)
    if v is None:
        raise HTTPException(status_code=404, detail="影片不存在")
    v.folder_id = body.folder_id
    db.commit()
    db.refresh(v)
    return _to_list_out(db, v)


@router.get("/{video_id}", response_model=VideoDetailOut)
def get_video(video_id: int, db: Session = Depends(get_db)) -> VideoDetailOut:
    """影片詳情與字幕段。"""
    v = db.get(Video, video_id)
    if v is None:
        raise HTTPException(status_code=404, detail="影片不存在")
    segs = db.scalars(
        select(Segment).where(Segment.video_id == video_id).order_by(Segment.index.asc())
    ).all()
    return _to_detail_out(v, list(segs))


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(video_id: int, db: Session = Depends(get_db)) -> None:
    """刪除影片與字幕。"""
    v = db.get(Video, video_id)
    if v is None:
        raise HTTPException(status_code=404, detail="影片不存在")
    db.delete(v)
    db.commit()


def _replace_segments(db: Session, video_id: int, items: list[dict]) -> Video:
    v = db.get(Video, video_id)
    if v is None:
        raise HTTPException(status_code=404, detail="影片不存在")
    db.execute(delete(Segment).where(Segment.video_id == video_id))
    for row in items:
        db.add(
            Segment(
                video_id=video_id,
                index=int(row["index"]),
                start_time=float(row["start_time"]),
                end_time=float(row["end_time"]),
                text_en=str(row.get("text_en") or ""),
                text_zh=str(row.get("text_zh") or ""),
                letter_template=str(row.get("letter_template") or ""),
            )
        )
    db.commit()
    db.refresh(v)
    return v


@router.post("/{video_id}/subtitles/srt", response_model=VideoDetailOut)
async def upload_srt(
    video_id: int,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> VideoDetailOut:
    """上傳 SRT 取代現有字幕。"""
    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("utf-8", errors="replace")
    try:
        subs = pysrt_from_string(text)
        items = segments_from_pysrt(subs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SRT 解析失敗：{e}") from e

    v = _replace_segments(db, video_id, items)
    segs = db.scalars(
        select(Segment).where(Segment.video_id == video_id).order_by(Segment.index.asc())
    ).all()
    return _to_detail_out(v, list(segs))


@router.post("/{video_id}/subtitles/auto", response_model=VideoDetailOut)
def fetch_auto_subs(
    video_id: int,
    body: AutoSubtitleBody,
    db: Session = Depends(get_db),
) -> VideoDetailOut:
    """以 yt-dlp 抓取英文自動字幕。"""
    try:
        items = download_auto_subs_srt(body.youtube_url.strip())
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e) or "自動字幕下載失敗") from e

    v = _replace_segments(db, video_id, items)
    segs = db.scalars(
        select(Segment).where(Segment.video_id == video_id).order_by(Segment.index.asc())
    ).all()
    return _to_detail_out(v, list(segs))


@router.post("/{video_id}/download", response_model=VideoDownloadOut)
def download_youtube_video(video_id: int, db: Session = Depends(get_db)) -> VideoDownloadOut:
    """下載影片檔至伺服器 downloads 目錄。"""
    v = db.get(Video, video_id)
    if v is None:
        raise HTTPException(status_code=404, detail="影片不存在")
    url = canonical_watch_url(v.youtube_id)
    try:
        path, msg = download_video_file(url, v.id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e) or "下載失敗") from e
    return VideoDownloadOut(video_path=path, message=msg)
