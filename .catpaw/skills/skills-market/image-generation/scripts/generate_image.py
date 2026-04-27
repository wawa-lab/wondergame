#!/usr/bin/env python3
import argparse
import base64
import json
import os
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional

MODEL_DEFAULT = "gemini-3-pro-image-preview"
BASE_URL = "https://aigc.sankuai.com/v1/google/models"
UPLOAD_URL_ENV = "IMAGE_UPLOAD_URL"


def load_env_value(key: str, env_path: Path) -> Optional[str]:
    if os.getenv(key):
        return os.getenv(key)
    try:
        content = env_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() != key:
            continue
        value = v.strip().strip("'").strip('"')
        if value:
            os.environ[key] = value
            return value
    return None


def mime_for(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext == ".png":
        return "image/png"
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    return "application/octet-stream"


def b64_decode_padded(s: str) -> bytes:
    if s is None:
        raise ValueError("missing base64 data")
    pad = (-len(s)) % 4
    if pad:
        s += "=" * pad
    return base64.b64decode(s)


def load_plan(plan_path: str, index_1based: int):
    with open(plan_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    plan = data.get("image_plan") or []
    if index_1based < 1 or index_1based > len(plan):
        raise ValueError("index out of range for image_plan")
    item = plan[index_1based - 1]
    prompt = item.get("prompt") or ""
    style_refs = item.get("style_refs") or []
    product_refs = item.get("product_refs") or []
    return prompt, style_refs, product_refs


def ensure_output_path(out_arg: Optional[str]) -> Path:
    if out_arg:
        out_path = Path(out_arg)
        if out_path.is_dir():
            out_path = out_path / "image.png"
        else:
            out_path.parent.mkdir(parents=True, exist_ok=True)
        return out_path
    ts = time.strftime("%Y%m%d-%H%M%S")
    out_path = Path("output") / f"generated-{ts}.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    return out_path


def post_generate(app_id: str, model: str, payload_bytes: bytes) -> bytes:
    req = urllib.request.Request(
        f"{BASE_URL}/{model}:imageGenerate",
        data=payload_bytes,
        headers={
            "Authorization": f"Bearer {app_id}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def poll_task(app_id: str, task_id: str, attempts: int = 24):
    query_url = f"{BASE_URL}/{task_id}:imageGenerateQuery"
    print(f"⏳ Polling task {task_id}...", flush=True)
    for i in range(attempts):
        wait_time = 10 if i == 0 else 9
        print(f"⏳ Attempt {i+1}/{attempts}, waiting {wait_time}s...", flush=True)
        time.sleep(wait_time)
        req_q = urllib.request.Request(
            query_url,
            headers={
                "Authorization": f"Bearer {app_id}",
                "Content-Type": "application/json",
            },
            method="GET",
        )
        with urllib.request.urlopen(req_q, timeout=60) as resp:
            raw_q = resp.read()
        print(f"📦 Raw response: {raw_q.decode('utf-8', errors='replace')}", flush=True)
        try:
            data = json.loads(raw_q)
            print(f"📋 Parsed JSON: {json.dumps(data, ensure_ascii=False, indent=2)}", flush=True)
        except Exception as e:
            print(f"⚠️  JSON parse error: {e}", flush=True)
            data = None
        if isinstance(data, dict):
            status = data.get("status")
            print(f"📊 Status: {status}", flush=True)
            if status == 1:
                print("✅ Task completed!", flush=True)
                return data
            data_field = data.get("data")
            if isinstance(data_field, dict) and data_field.get("candidates"):
                print("✅ Got candidates!", flush=True)
                return data
        if isinstance(data, str):
            print(f"⚠️  Got string response: {data}", flush=True)
            continue
    print("❌ Polling timeout", flush=True)
    return None


def extract_image_data(data: dict) -> tuple[str, bytes]:
    parts = data.get("data", {}).get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for p in parts:
        inline = p.get("inlineData") or p.get("inline_data")
        if inline and "data" in inline:
            mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
            payload = inline.get("data")
            if isinstance(payload, str) and urllib.parse.urlparse(payload).scheme in ("http", "https"):
                with urllib.request.urlopen(payload, timeout=60) as resp:
                    return mime, resp.read()
            img_bytes = b64_decode_padded(payload)
            return mime, img_bytes
    raise ValueError("No image data found in response")


def extract_image_url(data: dict) -> Optional[str]:
    parts = data.get("data", {}).get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for p in parts:
        inline = p.get("inlineData") or p.get("inline_data")
        if inline and isinstance(inline.get("data"), str):
            payload = inline.get("data")
            if urllib.parse.urlparse(payload).scheme in ("http", "https"):
                return payload
    return None


def update_plan_image_url(plan_path: str, index_1based: int, image_url: str, image_url_raw: Optional[str] = None) -> None:
    with open(plan_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    plan = data.get("image_plan") or []
    if 1 <= index_1based <= len(plan):
        plan[index_1based - 1]["image_url"] = image_url
        if image_url_raw:
            plan[index_1based - 1]["image_url_raw"] = image_url_raw
        with open(plan_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def upload_image_url_to_sankuai(upload_url: str, image_url: str) -> Optional[str]:
    payload = json.dumps({"imageUrl": image_url}, ensure_ascii=True).encode("utf-8")
    req = urllib.request.Request(
        upload_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    data = json.loads(raw)
    if data.get("code") != 0:
        return None
    result_url = data.get("result", {}).get("imageUrl")
    if result_url and "p.vip.sankuai.com" in result_url:
        result_url = result_url.replace("p.vip.sankuai.com", "p0.meituan.net")
    return result_url


def main():
    parser = argparse.ArgumentParser(description="Generate image via Nano Banana Pro (Gemini 3 Pro) with refs.")
    parser.add_argument("--app-id", default=os.getenv("APP_ID"), help="App ID for Authorization Bearer")
    parser.add_argument("--model", default=MODEL_DEFAULT, help="Model name")
    parser.add_argument("--aspect", default="3:4", help="Aspect ratio, e.g. 3:4 or 9:16")
    parser.add_argument("--size", default="1K", help="Image size, e.g. 2K")
    parser.add_argument("--prompt", default="", help="Text prompt")
    parser.add_argument("--image", action="append", default=[], help="Reference image path (repeatable, ordered)")
    parser.add_argument("--style-ref", action="append", default=[], help="Style reference image path (repeatable)")
    parser.add_argument("--product-ref", action="append", default=[], help="Product reference image path (repeatable)")
    parser.add_argument("--plan", help="Path to copy.json with image_plan")
    parser.add_argument("--index", type=int, help="1-based index for image_plan when using --plan")
    parser.add_argument("--out", help="Output image file path or directory")
    parser.add_argument("--save-response", help="Save raw response JSON to file")
    parser.add_argument("--save-raw", help="Save raw API response bytes to file")
    parser.add_argument(
        "--update-plan",
        action="store_true",
        help="When using --plan, write image_url back into copy.json",
    )

    args = parser.parse_args()

    if not args.app_id:
        raise SystemExit("Missing --app-id or APP_ID env var")

    upload_url = load_env_value(UPLOAD_URL_ENV, Path(".env"))

    if args.plan:
        if not args.index:
            raise SystemExit("--index is required when using --plan")
        prompt, style_refs, product_refs = load_plan(args.plan, args.index)
    else:
        prompt = args.prompt
        if args.image:
            style_refs = args.image
            product_refs = []
        else:
            style_refs = args.style_ref
            product_refs = args.product_ref

    if not prompt:
        raise SystemExit("Missing prompt")

    refs = style_refs + product_refs
    parts = [{"text": prompt}]
    for p in refs:
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        parts.append({"inlineData": {"mimeType": mime_for(p), "data": b64}})

    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": args.aspect, "imageSize": args.size},
        },
    }

    payload_bytes = json.dumps(payload, ensure_ascii=True).encode("utf-8")

    print(f"🚀 Sending generation request to {args.model}...", flush=True)
    print(f"📝 Prompt length: {len(prompt)} chars", flush=True)
    print(f"🖼️  Reference images: {len(refs)} files", flush=True)
    raw = post_generate(args.app_id, args.model, payload_bytes)
    print("✅ Request sent, parsing response...", flush=True)
    print(f"📦 Initial raw response: {raw.decode('utf-8', errors='replace')[:500]}...", flush=True)
    if args.save_raw:
        Path(args.save_raw).parent.mkdir(parents=True, exist_ok=True)
        with open(args.save_raw, "wb") as f:
            f.write(raw)

    task_id = None
    data = None
    try:
        data = json.loads(raw)
        if isinstance(data, str):
            task_id = data
            data = None
        elif isinstance(data, dict) and not data.get("data"):
            task_id = data.get("taskId") or data.get("task_id") or data.get("name")
            if task_id:
                data = None
    except Exception:
        task_id = raw.decode("utf-8", errors="ignore").strip().strip('"')

    if task_id:
        data = poll_task(args.app_id, task_id)

    if not isinstance(data, dict):
        raise SystemExit("No valid JSON response received")

    if args.save_response:
        Path(args.save_response).parent.mkdir(parents=True, exist_ok=True)
        with open(args.save_response, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)

    if args.plan and args.update_plan:
        image_url = extract_image_url(data)
        if image_url:
            image_url_raw = None
            if upload_url and image_url.startswith("https://s3plus.vip.sankuai.com/"):
                uploaded = upload_image_url_to_sankuai(upload_url, image_url)
                if uploaded:
                    image_url_raw = image_url
                    image_url = uploaded
            update_plan_image_url(args.plan, args.index, image_url, image_url_raw)

    print("💾 Extracting image data...", flush=True)
    mime, img_bytes = extract_image_data(data)

    ext = ".png"
    if mime == "image/jpeg":
        ext = ".jpg"
    out_path = ensure_output_path(args.out)
    if out_path.suffix.lower() not in (".png", ".jpg", ".jpeg"):
        out_path = out_path.with_suffix(ext)
    else:
        out_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"💾 Saving image ({len(img_bytes)} bytes) to {out_path}...", flush=True)
    with open(out_path, "wb") as f:
        f.write(img_bytes)

    print(f"✅ Done! Image saved to: {out_path}")


if __name__ == "__main__":
    main()
