# -*- coding: utf-8 -*-
# 写真の自動整形(「サイトを更新.bat」から自動実行される)
# 1) iPhone形式(HEIC/HEIF)をブラウザで表示できるJPGに変換
# 2) 大きすぎる画像をWeb表示用サイズに縮小(読み込み中グレー表示の防止)
# いずれも元ファイルの更新日時を引き継ぐため、時系列順の並びに影響しない。
import os
import sys

# (フォルダ, 長辺の最大px, 縮小を始めるサイズKB)
FOLDERS = [
    ("images/hero", 2400, 800),
    ("images/about-hero", 2400, 800),
    ("images/gallery", 1600, 500),
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
    converted = optimized = 0

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
                img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
                img.thumbnail((max_side, max_side))
                img.save(out, "JPEG", quality=QUALITY, optimize=True)
                os.utime(out, (st.st_atime, st.st_mtime))
                os.remove(src)
                print("HEIC変換: %s/%s -> %s" % (folder, name, os.path.basename(out)))
                converted += 1
            except Exception as e:
                print("[ERROR] %s/%s: %s" % (folder, name, e))

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
                img = ImageOps.exif_transpose(img).convert("RGB")
                img.thumbnail((max_side, max_side))
                out = path
                if not name.lower().endswith((".jpg", ".jpeg")):
                    out = os.path.splitext(path)[0] + ".jpg"
                img.save(out, "JPEG", quality=QUALITY, optimize=True)
                os.utime(out, (st.st_atime, st.st_mtime))
                if out != path:
                    os.remove(path)
                print("縮小: %s/%s %dKB -> %dKB" % (folder, name, kb, os.path.getsize(out) // 1024))
                optimized += 1
            except Exception as e:
                print("[ERROR] %s/%s: %s" % (folder, name, e))

    print("写真整形おわり: HEIC変換 %d件 / 縮小 %d件" % (converted, optimized))
    return 0


if __name__ == "__main__":
    sys.exit(main())
