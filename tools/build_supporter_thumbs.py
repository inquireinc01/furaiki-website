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
4つ目の値を書くと、その割合(高さに対して)だけ写真の上に背景を足してから切り出す。
None を書くと、その人の分は作らず既存の画像を残す。
"""
import os
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images", "messages")
DST = os.path.join(ROOT, "images", "supporters")
SIZE = 160

CROPS = {
    "hayashi-toshiyuki.jpg": (0.34, 0.29, 0.76),
    # 桜庭氏: 元写真は頭のすぐ上で切れているので、上端(cy=0 → 上に寄せる)から取る
    "sakuraba-yoshihiko.jpg": (0.50, 0.0, 0.44),
    "nakajima-shuji.jpg": (0.50, 0.36, 0.62),
    # 藤波氏: 元写真は頭のすぐ上で切れているので、4つ目の値(0.10)で上に背景を足してから切る。
    #   背景は無地の明るいグレーなので、最上段の色を引き伸ばすだけで自然につながる。
    "fujinami-tatsumi.jpg": (0.50, 0.0, 1.0, 0.10),
    "mukoyama-masatoshi.jpg": (0.50, 0.27, 0.58),
}


def main():
    os.makedirs(DST, exist_ok=True)
    for name, box in CROPS.items():
        if box is None:
            print("[--] %s (作らない。既存の画像を残す)" % name)
            continue
        cx, cy, side = box[:3]
        pad_top = box[3] if len(box) > 3 else 0
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, name))).convert("RGB")
        if pad_top:
            # 頭上の余白が足りない写真用: 最上段(2px)を上へ引き伸ばして背景を足す。無地の背景専用
            w0, h0 = im.size
            px = int(h0 * pad_top)
            top = im.crop((0, 0, w0, 2)).resize((w0, px), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3))
            padded = Image.new("RGB", (w0, h0 + px))
            padded.paste(top, (0, 0))
            padded.paste(im, (0, px))
            im = padded
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
