# -*- coding: utf-8 -*-
# HEIC/HEIF -> JPG 自動変換(「サイトを更新.bat」から自動実行される)
# 写真フォルダ内のiPhone形式(HEIC)をブラウザで表示できるJPGに変換し、
# 長辺2400pxに縮小・元ファイルは削除する。更新日時は元ファイルを引き継ぐ。
import os
import sys

FOLDERS = ["images/hero", "images/about-hero", "images/gallery"]
MAX_SIDE = 2400
QUALITY = 88


def main():
    try:
        from PIL import Image, ImageOps
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        print("[WARN] pillow / pillow-heif が未インストールのためHEIC変換をスキップします")
        print("       インストール: python -m pip install pillow pillow-heif")
        return 0

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    count = 0
    for folder in FOLDERS:
        d = os.path.join(root, folder)
        if not os.path.isdir(d):
            continue
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
                img = Image.open(src)
                img = ImageOps.exif_transpose(img).convert("RGB")
                img.thumbnail((MAX_SIDE, MAX_SIDE))
                img.save(out, "JPEG", quality=QUALITY)
                os.utime(out, (st.st_atime, st.st_mtime))
                os.remove(src)
                print("converted: %s/%s -> %s" % (folder, name, os.path.basename(out)))
                count += 1
            except Exception as e:
                print("[ERROR] %s/%s: %s" % (folder, name, e))
    print("HEIC conversion done: %d file(s)" % count)
    return 0


if __name__ == "__main__":
    sys.exit(main())
