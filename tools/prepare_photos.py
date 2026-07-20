# -*- coding: utf-8 -*-
# 写真の自動整形(「サイトを更新.bat」から自動実行される)
# 1) iPhone形式(HEIC/HEIF)をブラウザで表示できるJPGに変換
# 2) 大きすぎる画像をWeb表示用サイズに縮小(読み込み中グレー表示の防止)
# 3) 各フォルダの写真一覧(list.json)を生成
#    → サイト側はこの静的ファイルを読むため、GitHub APIのレート制限
#      (1時間60回/IP)で画像が消える問題が起きない
# いずれも元ファイルの更新日時を引き継ぐため、時系列順の並びに影響しない。
# EXIF(撮影日時など)は「直近の活動」表示の判定に使うため、変換・縮小後も残す。
import datetime
import json
import os
import re
import sys

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".gif")

# ギャラリー系フォルダは、写真を「撮影日時のファイル名(yyyymmddhhmmss)」へ自動改名する。
# → 連番(01,02..)管理の破綻(挿入時の振り直し・新着順に並べられない等)を回避し、
#   名前だけで時系列ソート/新着順/直近判定ができるようにする。
GALLERY_RENAME_FOLDERS = {
    "images/gallery",
    "images/gallery/recent",
    "images/gallery/saigaifukkou",
    "images/gallery/heartrugby",
    "images/gallery/community",
}
_DATENAME_RE = re.compile(r"^\d{14}(_\d+)?\.(jpe?g|png|webp|gif)$", re.I)
_EXIF_DT_RE = re.compile(r"(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})")


def _capture_stamp(path, Image):
    """撮影日時 yyyymmddhhmmss を返す。EXIF(DateTimeOriginal)優先、無ければ更新日時。"""
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            dt = None
            try:
                sub = exif.get_ifd(0x8769)  # Exif サブIFD
                dt = sub.get(0x9003) or sub.get(0x9004)  # DateTimeOriginal / Digitized
            except Exception:
                dt = None
            if not dt:
                dt = exif.get(0x0132)  # DateTime
            if dt:
                m = _EXIF_DT_RE.search(str(dt))
                if m:
                    return "".join(m.groups())
    except Exception:
        pass
    t = datetime.datetime.fromtimestamp(os.path.getmtime(path))
    return t.strftime("%Y%m%d%H%M%S")


def rename_to_capture_datetime(folder_dir, Image):
    """フォルダ直下の画像を撮影日時ファイル名へ改名(既に14桁形式のものは触らない)。"""
    count = 0
    for name in sorted(os.listdir(folder_dir)):
        if not name.lower().endswith(IMAGE_EXTS) or name.startswith("."):
            continue
        if _DATENAME_RE.match(name):
            continue  # 既に yyyymmddhhmmss 形式
        src = os.path.join(folder_dir, name)
        if not os.path.isfile(src):
            continue
        stamp = _capture_stamp(src, Image)
        ext = os.path.splitext(name)[1].lower()
        if ext == ".jpeg":
            ext = ".jpg"
        target = stamp + ext
        n = 1
        while os.path.exists(os.path.join(folder_dir, target)):
            target = "%s_%d%s" % (stamp, n, ext)
            n += 1
        os.rename(src, os.path.join(folder_dir, target))
        print("リネーム: %s -> %s" % (name, target))
        count += 1
    return count


def write_manifest(folder_dir, valid_exts, exclude_prefixes=()):
    """フォルダ直下の対象ファイル名を list.json に書き出す(サブフォルダは含めない)。
    サイト側JSがGitHub APIの代わりに読む静的な一覧。"""
    try:
        names = [
            n
            for n in os.listdir(folder_dir)
            if n.lower().endswith(valid_exts)
            and not n.startswith(".")
            and not any(n.lower().startswith(p) for p in exclude_prefixes)
            and os.path.isfile(os.path.join(folder_dir, n))
        ]
        names.sort()
        with open(os.path.join(folder_dir, "list.json"), "w", encoding="utf-8") as f:
            json.dump(names, f, ensure_ascii=False)
        return len(names)
    except Exception as e:
        print("[ERROR] list.json (%s): %s" % (folder_dir, e))
        return -1

# (フォルダ, 長辺の最大px, 縮小を始めるサイズKB)
FOLDERS = [
    ("images/hero", 1600, 500),
    ("images/about-hero", 1920, 600),
    ("images/gallery", 1600, 500),
    ("images/gallery/recent", 1600, 500),
    ("images/gallery/saigaifukkou", 1600, 500),
    ("images/gallery/heartrugby", 1600, 500),
    ("images/gallery/community", 1600, 500),
    ("images/timeline", 1200, 400),
    ("images/org-highlights", 1600, 500),
]
QUALITY = 85


def main():
    sys.stdout.reconfigure(errors="replace")
    try:
        from PIL import Image, ImageOps
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        print("[WARN] pillow / pillow-heif が未インストールのため写真の自動整形をスキップします")
        print("       インストール: python -m pip install pillow pillow-heif")
        return 0

    # 自前の写真を扱うため巨大画像の安全上限は解除する
    Image.MAX_IMAGE_PIXELS = None

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    converted = optimized = renamed = 0

    for folder, max_side, limit_kb in FOLDERS:
        d = os.path.join(root, folder)
        if not os.path.isdir(d):
            continue

        # 1) HEIC -> JPG
        for name in sorted(os.listdir(d)):
            if not name.lower().endswith((".heic", ".heif")):
                continue
            src = os.path.join(d, name)
            base = os.path.splitext(name)[0]
            out = os.path.join(d, base + ".jpg")
            n = 1
            while os.path.exists(out):
                out = os.path.join(d, "%s_%d.jpg" % (base, n))
                n += 1
            try:
                st = os.stat(src)
                original = Image.open(src)
                exif_bytes = original.info.get("exif", b"")
                img = ImageOps.exif_transpose(original).convert("RGB")
                img.thumbnail((max_side, max_side))
                save_kwargs = {"quality": QUALITY, "optimize": True}
                if exif_bytes:
                    save_kwargs["exif"] = exif_bytes
                img.save(out, "JPEG", **save_kwargs)
                os.utime(out, (st.st_atime, st.st_mtime))
                os.remove(src)
                print("HEIC変換: %s/%s -> %s" % (folder, name, os.path.basename(out)))
                converted += 1
            except Exception as e:
                print("[ERROR] %s/%s: %s" % (folder, name, e))

        # 1.5) ギャラリー系は撮影日時ファイル名へ改名(HEIC変換後・縮小前)
        if folder in GALLERY_RENAME_FOLDERS:
            renamed += rename_to_capture_datetime(d, Image)

        # 2) 大きすぎるJPG/PNGを縮小
        for name in sorted(os.listdir(d)):
            if not name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            path = os.path.join(d, name)
            try:
                kb = os.path.getsize(path) // 1024
                img = Image.open(path)
                # 寸法が上限内なら原則スキップ(再圧縮の繰り返しによる画質劣化を防ぐ)。
                # 例外として、寸法内でも極端に重いファイルだけは一度だけ再圧縮する。
                if max(img.size) <= max_side and kb <= max(limit_kb, 1200):
                    continue
                st = os.stat(path)
                exif_bytes = img.info.get("exif", b"")
                img = ImageOps.exif_transpose(img).convert("RGB")
                img.thumbnail((max_side, max_side))
                out = path
                if not name.lower().endswith((".jpg", ".jpeg")):
                    out = os.path.splitext(path)[0] + ".jpg"
                save_kwargs = {"quality": QUALITY, "optimize": True}
                if exif_bytes:
                    save_kwargs["exif"] = exif_bytes
                img.save(out, "JPEG", **save_kwargs)
                os.utime(out, (st.st_atime, st.st_mtime))
                if out != path:
                    os.remove(path)
                print("縮小: %s/%s %dKB -> %dKB" % (folder, name, kb, os.path.getsize(out) // 1024))
                optimized += 1
            except Exception as e:
                print("[ERROR] %s/%s: %s" % (folder, name, e))

    # 3) 各フォルダの写真一覧(list.json)を生成。サイト側はこれを読む。
    manifests = 0
    for folder, _max_side, _limit_kb in FOLDERS:
        d = os.path.join(root, folder)
        if os.path.isdir(d):
            if write_manifest(d, IMAGE_EXTS) >= 0:
                manifests += 1
    # ニュース(.txt)の一覧も同様に生成(README は除外)
    news_dir = os.path.join(root, "news")
    if os.path.isdir(news_dir):
        if write_manifest(news_dir, (".txt",), exclude_prefixes=("readme",)) >= 0:
            manifests += 1

    print(
        "写真整形おわり: HEIC変換 %d件 / 改名 %d件 / 縮小 %d件 / 一覧生成 %d件"
        % (converted, renamed, optimized, manifests)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
