# -*- coding: utf-8 -*-
"""トップページ「応援メッセージ」枠に出す、丸い顔写真用の小さな正方形サムネイルを作る。

  元: images/messages/<名前>.jpg   (代表挨拶ページの応援メッセージ欄の写真)
  先: images/supporters/<名前>.jpg (160x160。トップでは56pxの丸で表示)

トップページに元写真(1枚40〜130KB)をそのまま5枚読ませると重いので、
顔の周りだけを切り出した軽い画像(1枚数KB)を別に用意している。

応援メッセージの寄稿者を追加・写真を差し替えたときは、下の CROPS に
1行足して(または数値を直して)から実行する:

  python tools/build_supporter_thumbs.py

CROPS の値は (顔の中心x, 顔の中心y, 一辺) を元写真の幅・高さに対する割合で書く。
一辺は「幅に対する割合」。顔が丸の中央に来て、頭の上に少し余白が残る程度にする。
"""
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images", "messages")
DST = os.path.join(ROOT, "images", "supporters")
SIZE = 160

CROPS = {
    "hayashi-toshiyuki.jpg": (0.34, 0.29, 0.76),
    "sakuraba-yoshihiko.jpg": (0.50, 0.40, 0.42),
    "nakajima-shuji.jpg": (0.50, 0.36, 0.62),
    "fujinami-tatsumi.jpg": (0.50, 0.37, 0.82),
    "mukoyama-masatoshi.jpg": (0.50, 0.27, 0.58),
}


def main():
    os.makedirs(DST, exist_ok=True)
    for name, (cx, cy, side) in CROPS.items():
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, name))).convert("RGB")
        w, h = im.size
        s = side * w
        x0 = min(max(cx * w - s / 2, 0), w - s)
        y0 = min(max(cy * h - s / 2, 0), h - s)
        thumb = im.crop((int(x0), int(y0), int(x0 + s), int(y0 + s))).resize((SIZE, SIZE), Image.LANCZOS)
        out = os.path.join(DST, name)
        thumb.save(out, quality=82, optimize=True, progressive=True)
        print("[OK] %s (%d bytes)" % (name, os.path.getsize(out)))


if __name__ == "__main__":
    main()
