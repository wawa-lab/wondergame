#!/usr/bin/env python3
"""
Music Analyzer - 音乐旋律特征分析脚本
用法: python3 analyze.py <音频文件路径>
支持格式: mp3, mp4, wav, flac, m4a, ogg 等
"""

import sys
import warnings
warnings.filterwarnings('ignore')

def check_and_install():
    """检查并安装依赖"""
    try:
        import librosa
        import numpy
        return True
    except ImportError:
        print("[安装依赖] 正在安装 librosa...")
        import subprocess
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "librosa", "soundfile",
             "-i", "https://pypi.tuna.tsinghua.edu.cn/simple", "-q"],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"安装失败: {result.stderr}")
            return False
        print("[安装依赖] 安装完成！")
        return True

def analyze(path):
    import librosa
    import numpy as np

    print(f"\n正在分析: {path}")
    print("加载音频中（大文件可能需要几秒）...\n")

    y, sr = librosa.load(path, sr=None, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    # ── 1. 节奏 / BPM ──────────────────────────────────────────
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo)
    if bpm < 60:
        tempo_desc = "极慢（Largo）"
    elif bpm < 80:
        tempo_desc = "慢速（Adagio）"
    elif bpm < 100:
        tempo_desc = "中慢（Andante）"
    elif bpm < 120:
        tempo_desc = "中速（Moderato）"
    elif bpm < 140:
        tempo_desc = "中快（Allegro）"
    elif bpm < 170:
        tempo_desc = "快速（Vivace）"
    else:
        tempo_desc = "极快（Presto）"

    # ── 2. 调性 / 调式 ─────────────────────────────────────────
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    major_template = np.array([1,0,1,0,1,1,0,1,0,1,0,1], dtype=float)
    minor_template = np.array([1,0,1,1,0,1,0,1,1,0,1,0], dtype=float)
    scores_major, scores_minor = [], []
    for i in range(12):
        scores_major.append(np.dot(chroma_mean, np.roll(major_template, i)))
        scores_minor.append(np.dot(chroma_mean, np.roll(minor_template, i)))

    best_major_idx = int(np.argmax(scores_major))
    best_minor_idx = int(np.argmax(scores_minor))
    if max(scores_major) >= max(scores_minor):
        mode = "大调 (Major)"
        key_str = f"{notes[best_major_idx]} Major"
        mode_emotion = "明亮、积极、开朗"
    else:
        mode = "小调 (Minor)"
        key_str = f"{notes[best_minor_idx]} Minor"
        mode_emotion = "深沉、内敛、忧郁"

    # ── 3. 动态变化 ────────────────────────────────────────────
    rms = librosa.feature.rms(y=y)[0]
    rms_db = librosa.amplitude_to_db(rms)
    times = librosa.times_like(rms, sr=sr)
    n_seg = 6
    seg_len = len(rms) // n_seg
    seg_avgs = []
    segments = []
    for i in range(n_seg):
        seg = rms_db[i*seg_len:(i+1)*seg_len]
        t_start = times[i*seg_len]
        t_end = times[min((i+1)*seg_len, len(times)-1)]
        avg = float(np.mean(seg))
        peak = float(np.max(seg))
        seg_avgs.append(avg)
        segments.append((t_start, t_end, avg, peak))

    diffs = [seg_avgs[i+1] - seg_avgs[i] for i in range(len(seg_avgs)-1)]
    if all(d > 1 for d in diffs):
        dyn_trend = "持续渐强（由弱到强）"
    elif all(d < -1 for d in diffs):
        dyn_trend = "持续渐弱（由强到弱）"
    elif diffs[0] > 1 and diffs[-1] < -1:
        dyn_trend = "先渐强后渐弱（拱形结构）"
    elif diffs[0] < -1 and diffs[-1] > 1:
        dyn_trend = "先弱后强（V形结构）"
    else:
        dyn_trend = "波动起伏（多段变化）"

    dyn_range = max(seg_avgs) - min(seg_avgs)
    if dyn_range < 5:
        dyn_level = "动态范围小（平稳）"
    elif dyn_range < 12:
        dyn_level = "动态范围中等（有层次）"
    else:
        dyn_level = "动态范围大（对比强烈）"

    # ── 4. 音色特征 ────────────────────────────────────────────
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    avg_centroid = float(np.mean(centroid))
    if avg_centroid < 1000:
        timbre = "低频主导，音色厚重温暖（弦乐低音区 / 大提琴 / Bass）"
    elif avg_centroid < 2000:
        timbre = "中低频主导，音色饱满圆润（钢琴 / 木管 / 人声）"
    elif avg_centroid < 3500:
        timbre = "中频主导，音色均衡自然（吉他 / 弦乐 / 混合编排）"
    else:
        timbre = "高频主导，音色明亮清透（小提琴高音区 / 电子合成器）"

    zcr = librosa.feature.zero_crossing_rate(y)[0]
    avg_zcr = float(np.mean(zcr))
    if avg_zcr > 0.1:
        instrument_hint = "含打击乐或强噪声成分（鼓组 / 电吉他失真）"
    elif avg_zcr > 0.05:
        instrument_hint = "混合音色（旋律乐器 + 打击乐）"
    else:
        instrument_hint = "以旋律性乐器为主（弦乐 / 钢琴 / 管乐）"

    # ── 5. 情绪推断 ────────────────────────────────────────────
    if bpm < 80 and "小调" in mode:
        emotion = "忧郁、沉思、悲伤"
    elif bpm < 80 and "大调" in mode:
        emotion = "平静、温暖、沉稳"
    elif bpm < 120 and "小调" in mode:
        emotion = "紧张、期待、神秘"
    elif bpm < 120 and "大调" in mode:
        emotion = "轻松、愉悦、希望"
    elif bpm >= 120 and "小调" in mode:
        emotion = "激烈、紧迫、戏剧性"
    else:
        emotion = "欢快、活力、振奋"

    # ── 输出 ───────────────────────────────────────────────────
    print("=" * 55)
    print("         🎵 音乐旋律分析报告")
    print("=" * 55)
    print(f"文件时长: {duration:.1f} 秒  |  采样率: {sr} Hz")
    print()
    print(f"【情绪基调】")
    print(f"  {emotion}（{mode_emotion}）")
    print()
    print(f"【节奏特征】")
    print(f"  BPM: {bpm:.1f}  →  {tempo_desc}")
    print()
    print(f"【调性 / 调式】")
    print(f"  推测调性: {key_str}  ({mode})")
    print()
    print(f"【音色 / 乐器推断】")
    print(f"  频谱重心: {avg_centroid:.0f} Hz  →  {timbre}")
    print(f"  乐器类型: {instrument_hint}")
    print()
    print(f"【动态变化】")
    print(f"  趋势: {dyn_trend}")
    print(f"  幅度: {dyn_level}（{dyn_range:.1f} dB）")
    print(f"  分段详情:")
    for t_start, t_end, avg, peak in segments:
        bar_len = int((avg - min(seg_avgs)) / max(dyn_range, 1) * 20)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        print(f"    {t_start:5.1f}s-{t_end:.1f}s  [{bar}]  avg {avg:.1f} dB")
    print()
    print("=" * 55)
    print("【框架输出（可直接用于 AI 音乐生成）】")
    print("=" * 55)
    print(f"情绪基调: {emotion}")
    print(f"音乐流派: 根据以上特征推断（见下方说明）")
    print(f"乐器组合: {instrument_hint.split('（')[0]}，{timbre.split('（')[0]}")
    print(f"动态变化: {dyn_trend}，{dyn_level}")
    print()

    # 流派推断
    if avg_centroid < 1500 and bpm < 90 and avg_zcr < 0.05:
        genre = "Cinematic / Neo-Classical（电影配乐 / 新古典）"
    elif avg_zcr > 0.08 and bpm > 100:
        genre = "Rock / Electronic（摇滚 / 电子）"
    elif bpm < 80 and avg_zcr < 0.04:
        genre = "Ambient / Lo-fi（氛围 / 低保真）"
    elif bpm > 120 and avg_zcr < 0.06:
        genre = "Pop / Dance（流行 / 舞曲）"
    else:
        genre = "Acoustic / Folk（原声 / 民谣）"

    print(f"推断流派: {genre}")
    print("=" * 55)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 analyze.py <音频文件路径>")
        print("示例: python3 analyze.py ~/Downloads/music.mp4")
        sys.exit(1)

    if not check_and_install():
        sys.exit(1)

    analyze(sys.argv[1])
