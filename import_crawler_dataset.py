#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import requests


DEFAULT_BASE_URL = "http://localhost:8080/api"
DEFAULT_METADATA_PATH = Path(r"C:\Users\nhang\Desktop\Desktop\Project\ytb_crawler\metadata.json")
DEFAULT_REPORT_PATH = Path(__file__).resolve().parent / "resource" / "import-reports" / "ytb-crawler-seed-report.json"
DEFAULT_PASSWORD = "SeedUser123!"
MEGABYTE = 1024 * 1024


@dataclass
class SourceVideo:
    source_id: str
    title: str
    description: str
    channel_id: str
    channel_name: str
    username: str
    email: str
    duration: int
    view_count: int
    file_size: int
    local_path: Path
    categories: list[str]
    tags: list[str]
    thumbnail_url: str | None
    source_keyword: str | None
    score: float


class BackendClient:
    def __init__(self, base_url: str, timeout_seconds: int) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def list_videos(self) -> list[dict[str, Any]]:
        response = self.session.get(f"{self.base_url}/videos", timeout=self.timeout_seconds)
        response.raise_for_status()
        return response.json()

    def register_or_login(self, username: str, email: str, password: str) -> tuple[str, dict[str, Any]]:
        payload = {"username": username, "email": email, "password": password}
        response = self.session.post(
            f"{self.base_url}/auth/register",
            json=payload,
            timeout=self.timeout_seconds,
        )
        if response.ok:
            body = response.json()
            return body["token"], body

        login_response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"username": username, "password": password},
            timeout=self.timeout_seconds,
        )
        login_response.raise_for_status()
        body = login_response.json()
        return body["token"], body

    def update_profile(self, token: str, bio: str, avatar_url: str | None) -> None:
        payload = {"bio": bio, "avatarUrl": avatar_url or ""}
        response = self.session.put(
            f"{self.base_url}/profile",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()

    def upload_video(self, token: str, source: SourceVideo, description: str) -> dict[str, Any]:
        with source.local_path.open("rb") as handle:
            response = self.session.post(
                f"{self.base_url}/videos/upload",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": (source.local_path.name, handle, "video/mp4")},
                data={"title": source.title, "description": description},
                timeout=(self.timeout_seconds, max(self.timeout_seconds, 600)),
            )
        response.raise_for_status()
        return response.json()

    def get_discover_snapshot(self) -> dict[str, Any]:
        response = self.session.get(f"{self.base_url}/discover", timeout=self.timeout_seconds)
        response.raise_for_status()
        return response.json()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import a lightweight video seed set from ytb_crawler into the local app.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--metadata-path", type=Path, default=DEFAULT_METADATA_PATH)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--max-total-mb", type=int, default=160)
    parser.add_argument("--max-file-mb", type=int, default=25)
    parser.add_argument("--min-duration", type=int, default=5)
    parser.add_argument("--max-duration", type=int, default=90)
    parser.add_argument("--max-per-channel", type=int, default=2)
    parser.add_argument("--timeout-seconds", type=int, default=30)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def normalize_text(value: Any) -> str:
    text = str(value or "")
    return re.sub(r"\s+", " ", text).strip()


def parse_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_items = value
    elif isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            raw_items = [part.strip() for part in stripped.split(",")]
        else:
            raw_items = parsed if isinstance(parsed, list) else [parsed]
    else:
        raw_items = [value]

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        text = normalize_text(item)
        lowered = text.lower()
        if len(text) < 2 or lowered in seen:
            continue
        cleaned.append(text)
        seen.add(lowered)
    return cleaned


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def slugify(text: str, allow_unicode: bool = False) -> str:
    value = normalize_text(text)
    if not allow_unicode:
        value = strip_accents(value)
    value = value.lower()
    value = re.sub(r"[^a-z0-9_]+" if not allow_unicode else r"[^\w]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value


def build_username(channel_name: str, channel_id: str, used: set[str]) -> str:
    channel_slug = slugify(channel_name)[:24] or "creator"
    channel_token = slugify(channel_id)[:10] or "seed"
    base = f"seed_{channel_slug}"
    candidate = f"{base}_{channel_token}"[:50].strip("_")
    if candidate and candidate not in used:
        used.add(candidate)
        return candidate

    suffix = 2
    while True:
        retry = f"{candidate[:46]}_{suffix}"[:50].strip("_")
        if retry not in used:
            used.add(retry)
            return retry
        suffix += 1


def hashtagify(text: str) -> str | None:
    cleaned = slugify(text)
    if len(cleaned) < 2:
        return None
    return cleaned[:50]


def build_description(item: SourceVideo) -> str:
    lines: list[str] = []
    if item.description:
        lines.append(item.description[:600])

    meta_parts: list[str] = []
    if item.channel_name:
        meta_parts.append(f"Channel: {item.channel_name}")
    if item.categories:
        meta_parts.append("Categories: " + ", ".join(item.categories[:3]))
    if item.source_keyword:
        meta_parts.append(f"Keyword: {item.source_keyword}")
    if meta_parts:
        lines.append(" | ".join(meta_parts))

    hashtag_inputs = item.tags[:6] + item.categories[:3]
    if item.source_keyword:
        hashtag_inputs.append(item.source_keyword)

    hashtags: list[str] = []
    seen: set[str] = set()
    for raw in hashtag_inputs:
        tag = hashtagify(raw)
        if not tag or tag in seen:
            continue
        hashtags.append(f"#{tag}")
        seen.add(tag)
        if len(hashtags) >= 8:
            break
    if hashtags:
        lines.append(" ".join(hashtags))

    return "\n\n".join(part for part in lines if part)


def compute_score(view_count: int, file_size: int, duration: int, tag_count: int, category_count: int) -> float:
    return (
        math.log10(max(view_count, 1)) * 3.5
        + min(tag_count, 10) * 0.25
        + min(category_count, 3) * 0.5
        - (file_size / MEGABYTE) * 0.15
        - abs(duration - 25) * 0.03
    )


def load_previous_report(path: Path) -> set[str]:
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()

    uploaded_ids = data.get("uploadedSourceIds")
    if isinstance(uploaded_ids, list):
        return {str(item) for item in uploaded_ids}
    return set()


def load_existing_pairs(client: BackendClient) -> set[tuple[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for video in client.list_videos():
        title = normalize_text(video.get("title")).casefold()
        user = video.get("user") or {}
        username = normalize_text(user.get("username")).casefold()
        if title and username:
            pairs.add((title, username))
    return pairs


def load_candidates(args: argparse.Namespace, existing_pairs: set[tuple[str, str]], uploaded_source_ids: set[str]) -> list[SourceVideo]:
    raw_items = json.loads(args.metadata_path.read_text(encoding="utf-8"))
    if not isinstance(raw_items, list):
        raise ValueError("Metadata JSON must be a list of videos")

    username_pool: set[str] = set()
    usernames_by_channel: dict[str, str] = {}
    candidates: list[SourceVideo] = []
    max_file_size = args.max_file_mb * MEGABYTE

    for raw in raw_items:
        if not isinstance(raw, dict):
            continue

        source_id = normalize_text(raw.get("id"))
        if not source_id or source_id in uploaded_source_ids:
            continue

        local_path_raw = normalize_text(raw.get("local_path"))
        if not local_path_raw:
            continue
        local_path = Path(local_path_raw)
        if not local_path.exists() or local_path.suffix.lower() != ".mp4":
            continue

        file_size = int(raw.get("filesize") or local_path.stat().st_size)
        duration = int(raw.get("duration") or 0)
        if file_size <= 0 or file_size > max_file_size:
            continue
        if duration < args.min_duration or duration > args.max_duration:
            continue

        title = normalize_text(raw.get("title"))
        description = normalize_text(raw.get("description"))
        channel_name = normalize_text(raw.get("channel_name")) or "Seed Creator"
        channel_id = normalize_text(raw.get("channel_id")) or source_id
        username = usernames_by_channel.get(channel_id)
        if username is None:
            username = build_username(channel_name, channel_id, username_pool)
            usernames_by_channel[channel_id] = username

        if (title.casefold(), username.casefold()) in existing_pairs:
            continue

        categories = parse_string_list(raw.get("categories"))
        tags = parse_string_list(raw.get("tags"))
        view_count = int(raw.get("view_count") or 0)
        score = compute_score(view_count, file_size, duration, len(tags), len(categories))

        candidates.append(
            SourceVideo(
                source_id=source_id,
                title=title,
                description=description,
                channel_id=channel_id,
                channel_name=channel_name,
                username=username,
                email=f"{username}@seed.local",
                duration=duration,
                view_count=view_count,
                file_size=file_size,
                local_path=local_path,
                categories=categories,
                tags=tags,
                thumbnail_url=normalize_text(raw.get("thumbnail_url")) or None,
                source_keyword=normalize_text(raw.get("source_keyword")) or None,
                score=score,
            )
        )

    return candidates


def select_videos(candidates: list[SourceVideo], limit: int, max_total_bytes: int, max_per_channel: int) -> list[SourceVideo]:
    by_channel: dict[str, list[SourceVideo]] = defaultdict(list)
    for item in candidates:
        by_channel[item.username].append(item)

    for items in by_channel.values():
        items.sort(key=lambda video: (-video.score, video.file_size, -video.view_count, video.title.casefold()))

    channels = sorted(
        by_channel,
        key=lambda username: (-by_channel[username][0].score, by_channel[username][0].file_size, username),
    )

    selected: list[SourceVideo] = []
    selected_ids: set[str] = set()
    total_bytes = 0

    for round_index in range(max_per_channel):
        added_this_round = False
        for username in channels:
            channel_items = by_channel[username]
            if round_index >= len(channel_items):
                continue

            candidate = channel_items[round_index]
            if candidate.source_id in selected_ids:
                continue
            if total_bytes + candidate.file_size > max_total_bytes:
                continue

            selected.append(candidate)
            selected_ids.add(candidate.source_id)
            total_bytes += candidate.file_size
            added_this_round = True

            if len(selected) >= limit:
                return selected

        if not added_this_round:
            break

    remaining = sorted(
        (item for item in candidates if item.source_id not in selected_ids),
        key=lambda video: (-video.score, video.file_size, -video.view_count, video.username, video.title.casefold()),
    )

    for candidate in remaining:
        if len(selected) >= limit:
            break
        if total_bytes + candidate.file_size > max_total_bytes:
            continue
        selected.append(candidate)
        selected_ids.add(candidate.source_id)
        total_bytes += candidate.file_size

    return selected


def summarize_selection(selection: list[SourceVideo]) -> dict[str, Any]:
    total_bytes = sum(item.file_size for item in selection)
    creators = sorted({item.username for item in selection})
    categories = sorted({category for item in selection for category in item.categories})
    return {
        "videoCount": len(selection),
        "creatorCount": len(creators),
        "totalSizeMb": round(total_bytes / MEGABYTE, 2),
        "creators": creators,
        "categories": categories,
    }


def build_profile_bio(source: SourceVideo) -> str:
    pieces = ["Imported from the ytb_crawler seed set"]
    if source.categories:
        pieces.append(" / ".join(source.categories[:3]))
    return " - ".join(pieces)


def write_report(path: Path, previous_ids: set[str], uploaded_entries: list[dict[str, Any]], summary: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    merged_ids = sorted(previous_ids | {entry["sourceId"] for entry in uploaded_entries})
    payload = {
        "source": "ytb_crawler",
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
        "uploadedSourceIds": merged_ids,
        "lastRun": {
            **summary,
            "uploaded": uploaded_entries,
        },
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def print_selection(selection: list[SourceVideo]) -> None:
    for index, item in enumerate(selection, start=1):
        print(
            f"{index:02d}. {item.title} | {item.username} | "
            f"{item.file_size / MEGABYTE:.2f} MB | {item.duration}s | views={item.view_count}"
        )


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args()

    if not args.metadata_path.exists():
        raise FileNotFoundError(f"Metadata file not found: {args.metadata_path}")

    client = BackendClient(args.base_url, args.timeout_seconds)
    previous_source_ids = load_previous_report(args.report_path)
    existing_pairs = load_existing_pairs(client)
    candidates = load_candidates(args, existing_pairs, previous_source_ids)
    selection = select_videos(
        candidates=candidates,
        limit=max(args.limit, 1),
        max_total_bytes=max(args.max_total_mb, 1) * MEGABYTE,
        max_per_channel=max(args.max_per_channel, 1),
    )

    if not selection:
        print("No eligible videos found for import.")
        return 0

    summary = summarize_selection(selection)
    print(
        f"Selected {summary['videoCount']} videos from {summary['creatorCount']} creators "
        f"({summary['totalSizeMb']} MB total)."
    )
    print_selection(selection)

    if args.dry_run:
        print("Dry run only, nothing was uploaded.")
        return 0

    uploaded_entries: list[dict[str, Any]] = []
    tokens: dict[str, str] = {}
    profile_done: set[str] = set()

    for index, item in enumerate(selection, start=1):
        print(f"Uploading {index}/{len(selection)}: {item.title}")
        token = tokens.get(item.username)
        if token is None:
            token, _ = client.register_or_login(item.username, item.email, args.password)
            tokens[item.username] = token

        if item.username not in profile_done:
            client.update_profile(token, build_profile_bio(item), item.thumbnail_url)
            profile_done.add(item.username)

        created = client.upload_video(token, item, build_description(item))
        uploaded_entries.append(
            {
                "sourceId": item.source_id,
                "videoId": created.get("id"),
                "title": item.title,
                "username": item.username,
                "filePath": str(item.local_path),
                "fileSize": item.file_size,
                "duration": item.duration,
            }
        )

    write_report(args.report_path, previous_source_ids, uploaded_entries, summary)

    final_videos = client.list_videos()
    discover = client.get_discover_snapshot()
    print(
        f"Done. API now returns {len(final_videos)} videos, "
        f"{len(discover.get('featuredVideos', []))} featured items, "
        f"{len(discover.get('suggestedCreators', []))} suggested creators."
    )
    print(f"Report saved to {args.report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
