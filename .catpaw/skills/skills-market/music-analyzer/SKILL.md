---
name: music-analyzer
description: 音乐旋律特征分析工具。通过 librosa 对音频/视频文件进行声学分析，输出情绪基调、音乐流派、乐器组合、动态变化描述四项关键词框架，可直接用于 AI 音乐生成（Suno/Udio）的 prompt 撰写。支持 mp3、mp4、wav、flac、m4a 等常见格式。当用户说"分析这段音乐"、"识别音乐旋律关键词"、"帮我分析音频特征"、"这段音乐是什么风格"、"提取音乐的情绪/流派/乐器/动态"时使用。

metadata:
  skillhub.creator: "yun.gu"
  skillhub.updater: "yun.gu"
  skillhub.version: "V1"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "16397"
---

# Music Analyzer

## 工作流程

1. 用户提供音频/视频文件路径（或通过附件上传）
2. 运行分析脚本，自动安装依赖（如未安装）
3. 输出四项框架内容，并可选生成 AI 音乐生成 prompt

## 运行分析

```bash
python3 ~/.catpaw/skills/music-analyzer/scripts/analyze.py "<文件路径>"
```

脚本会自动检测并安装 `librosa`（使用清华镜像源），无需手动安装。

## 输出框架说明

脚本输出包含两部分：

**详细分析报告**（含 BPM、调性、频谱重心、动态分段可视化）

**框架输出**（四项关键词，直接可用）：
- **情绪基调**：由 BPM + 调式综合推断（如"平静、温暖、沉稳"）
- **音乐流派**：由频谱重心 + BPM + 零交叉率推断（如"Cinematic / Neo-Classical"）
- **乐器组合**：由频谱重心 + 零交叉率推断主要乐器类型
- **动态变化描述**：分6段可视化，输出趋势（拱形/渐强/渐弱等）和动态范围

## 结果解读与补充

脚本输出的是客观声学特征，向用户呈现结果时：
- 结合用户对音乐的主观描述进行修正
- 如用户需要 AI 生成 prompt，将四项框架整合为自然语言描述
- 如需更精确的乐器识别，建议用户补充主观感受（如"听起来像钢琴"）

## 依赖

- Python 3.x（macOS 自带）
- librosa、soundfile（脚本自动安装）
