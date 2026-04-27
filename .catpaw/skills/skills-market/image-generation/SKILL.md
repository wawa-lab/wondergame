---
name: image-generation
description: 通过美团 AIGC Nano Banana Pro (Gemini 3 Pro) 的 imageGenerate 接口进行生图/图生图，包含请求格式、轮询查询与结果解析。

metadata:
  skillhub.creator: "zhuxiangyu04"
  skillhub.updater: "zhuxiangyu04"
  skillhub.version: "V1"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "73"
---

# Nano Banana Pro (Gemini 3 Pro) Image Generation

当用户需要用美团 AIGC 的 Nano Banana Pro 生图或图生图时使用本技能。

## 前置条件

- 已获取 `appId`（用于 `Authorization: Bearer <appId>`）
- 接口域名：`https://aigc.sankuai.com`
- 模型示例：`gemini-3-pro-image-preview`

## 快速开始（curl）

单轮生图：

```bash
APP_ID="<你的appId>"
MODEL="gemini-3-pro-image-preview"
BASE_URL="https://aigc.sankuai.com/v1/google/models"

curl --location "$BASE_URL/$MODEL:imageGenerate" \
  --header "Authorization: Bearer $APP_ID" \
  --header "Content-Type: application/json" \
  --data '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {"text": "Create a vibrant infographic that explains photosynthesis."}
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {"aspectRatio": "9:16", "imageSize": "1K"}
    }
  }'
```

图生图（在首个 user.parts 里追加参考图 base64）。**凡是包含 base64，一律使用 JSON 文件 + --data-binary**，避免命令行长度限制：
- 最多可使用 14 张参考图片
- 借助 Gemini 3 Pro 预览版，您最多可以混合使用 14 张参考图片。这 14 张图片可以包含以下内容：
    - 最多 6 张高保真对象图片，用于包含在最终图片中
    - 最多 5 张人物图片，以保持角色一致性
```bash
# 先生成 payload.json，再用 --data-binary 发送
python3 - <<'PY'
import base64, json, sys
img_path = "path/to/image.png"
with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
payload = {
  "contents": [{
    "role": "user",
    "parts": [
      {"text": "基于参考图生成同款风格海报"},
      {"inline_data": {"mime_type": "image/png", "data": b64}}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {"aspectRatio": "9:16", "imageSize": "1K"}
  }
}
json.dump(payload, sys.stdout, ensure_ascii=True)
PY > payload.json

curl --location "$BASE_URL/$MODEL:imageGenerate" \
  --header "Authorization: Bearer $APP_ID" \
  --header "Content-Type: application/json" \
  --data-binary @payload.json
```

## 脚本快速生成（推荐）

为了避免重复拼装 JSON，提供脚本 `skills/image-generation/scripts/generate_image.py`：手动指定 prompt + 引用图（更通用）：

```bash
APP_ID="<你的appId>"
python3 skills/image-generation/scripts/generate_image.py \
  --prompt "参考图1为风格/构图...参考图2..n为商品外观..." \
  --image path/to/ref1.jpg \
  --image path/to/ref2.png \
  --image path/to/ref3.png \
  --out output/generated.png
```

常用参数：
- `--aspect`（默认 `3:4`）
- `--size`（默认 `1K`）
- `--save-response` 保存原始响应 JSON（便于排查）
- `--update-plan` 当使用 `--plan/--index` 时，将生成的图片 URL 回写到 `copy.json` 的 `image_plan[i].image_url`
- 若配置了 `IMAGE_UPLOAD_URL`（在 `.env` 或环境变量中），且返回 URL 以 `https://s3plus.vip.sankuai.com/` 开头，会先上传并同时写入 `image_url_raw`

## 轮询查询（异步）

生成接口可能返回 **纯任务 ID 字符串**（非 JSON），需要兼容解析。

```bash
TASK_ID="<上一步返回的 task id>"

curl --location --request GET "$BASE_URL/$TASK_ID:imageGenerateQuery" \
  --header "Authorization: Bearer $APP_ID" \
  --header "Content-Type: application/json"
```

建议首次等待 10s，然后每 8-12s 轮询一次，总计 8-12 次。

## 结果解析要点

- `status == 1` 通常表示完成（以实际返回为准）
- 图片 URL 在 `data.candidates[0].content.parts` 中 `inlineData.data`
- 可能同时包含多段 `text`（思考或描述），忽略即可

## 常见问题

- 401/403：`Authorization: Bearer` 不正确或 appId 无权限
- 400：请求体字段不匹配（注意 `contents/parts/inline_data` 结构）
- 413：base64 图片过大，尝试压缩或减少参考图数量

## 输出建议

- 返回图片 URL + 关键参数（prompt/ratio/size）
- 如需落盘，下载保存到 `output/`
