# -*- coding: utf-8 -*-
"""トップページのヒーローに置く日本地図 images/japan-map.svg を作り直す。

活動地域が変わったときだけ実行する(普段の更新では不要)。
編集するのは下の ACTIVE / PLAN / PINS の3つだけでよい。

    python tools\\build_japan_map.py

・元データは国土数値情報由来の都道府県ポリゴン(dataofjapan/land)を毎回ダウンロードする。
  13MB あるためリポジトリには置いていない。ネットに繋がらない環境では実行できない。
・表示サイズは500px前後なので Douglas-Peucker で大幅に簡略化し、座標は整数に丸めている
  (これで 25KB 程度。gzip 後は 10KB 弱)。
・色は SVG 側に焼き込む。HTML からは <img> で読むだけなので、CSS では塗り分けられない。
・実行するとピンの位置(left/top の%)を表示する。index.html / en/index.html の
  .hero-areas-pin の style にそのまま貼ること。
"""
import io
import json
import math
import os
import sys

try:
    from urllib.request import urlopen
except ImportError:                                   # Python 2 は想定しないが一応
    from urllib2 import urlopen

SRC_URL = "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images", "japan-map.svg")

# ---- ここだけ編集する ------------------------------------------------------
ACTIVE = {"岩手県", "石川県", "熊本県"}   # 支援活動中 → 赤
PLAN = {"千葉県"}                          # 活動予定   → 薄い赤
PINS = [                                   # ロゴマークを立てる地点(経度, 緯度, 表示名)
    (141.88, 39.27, "岩手県・釜石"),
    (136.90, 37.39, "石川県・能登"),
    (130.71, 32.79, "熊本県"),
]
# ---------------------------------------------------------------------------

COLOR_ACTIVE = "#e11d3a"
COLOR_PLAN = "#e98d9d"

KX = math.cos(math.radians(37.0))      # 日本付近の見た目に合わせた簡易正距円筒図法
EPS = 0.02                             # 海岸線の簡略化の強さ(度)。約2km
MIN_AREA = 0.004                       # これより小さい島は描かない
MIN_AREA_ISLE = 0.0006                 # インセット(南西諸島)は縮小表示なので、より小さい島も拾う
INSET_SIZE = 360.0                     # インセットの長辺(SVG座標)。大きいほど島が読める
INSET_MARGIN = 16.0                    # インセットの枠と地図の端とのすき間
INSET_GAP = 26.0                       # インセットの枠と本土との最低すき間
INSET_MAX_LON = 130.5                  # これより東の島(大東諸島)はインセットに入れない。
                                       # 入れると横幅が8度に広がり、沖縄本島が豆粒になるため
INSET_MAX_LAT = 29.5                   # 鹿児島県のうち、この緯度より南(奄美・トカラ)もインセットへ
OKINAWA = "沖縄県"
KAGOSHIMA = "鹿児島県"
TOKYO = "東京都"


def rdp(pts, eps):
    """Douglas-Peucker。折れ線の形をなるべく保ったまま点を間引く"""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if norm == 0:
                dist = math.hypot(px - ax, py - ay)
            else:
                dist = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if dist > best:
                best, bi = dist, i
        if best > eps:
            keep[bi] = True
            stack.append((a, bi))
            stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]


def ring_area(pts):
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def main():
    sys.stdout.write("元データを取得中... %s\n" % SRC_URL)
    data = json.loads(urlopen(SRC_URL, timeout=60).read().decode("utf-8"))

    mainland, okinawa = {}, {}
    for f in data["features"]:
        name = f["properties"]["nam_ja"]
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            ring = poly[0]
            clon = sum(c[0] for c in ring) / len(ring)
            clat = sum(c[1] for c in ring) / len(ring)
            if name == TOKYO and clon > 140.5:   # 小笠原諸島は本州から遠すぎるので描かない
                continue
            # 南西諸島(沖縄県ぜんぶ + 鹿児島県のうち奄美・トカラ)はインセット行き。
            # 大東諸島だけは東に離れすぎていて、入れると枠が横に伸びるので外す。
            to_inset = ((name == OKINAWA and clon <= INSET_MAX_LON)
                        or (name == KAGOSHIMA and clat < INSET_MAX_LAT))
            if ring_area(ring) < (MIN_AREA_ISLE if to_inset else MIN_AREA):
                continue
            simplified = rdp([(c[0] * KX, -c[1]) for c in ring], EPS)
            if len(simplified) < 4:
                continue
            (okinawa if to_inset else mainland).setdefault(name, []).append(simplified)

    pts = [p for rings in mainland.values() for r in rings for p in r]
    minx = min(p[0] for p in pts)
    maxx = max(p[0] for p in pts)
    miny = min(p[1] for p in pts)
    maxy = max(p[1] for p in pts)
    width = 1000.0
    scale = width / (maxx - minx)
    pad = 14.0
    vw = int(round(width + pad * 2))
    vh = int(round((maxy - miny) * scale + pad * 2))

    def to_svg(x, y):
        return ((x - minx) * scale + pad, (y - miny) * scale + pad)

    def to_path(rings, tf):
        out = []
        for r in rings:
            seg = []
            for i, (x, y) in enumerate(r):
                sx, sy = tf(x, y)
                seg.append(("M" if i == 0 else "L") + "%d %d" % (round(sx), round(sy)))
            out.append("".join(seg) + "Z")
        return "".join(out)

    base, hot = [], []
    for name, rings in mainland.items():
        d = to_path(rings, to_svg)
        if name in ACTIVE:
            hot.append('<path fill="%s" fill-opacity="1" stroke-opacity=".7" d="%s"/>' % (COLOR_ACTIVE, d))
        elif name in PLAN:
            hot.append('<path fill="%s" fill-opacity="1" stroke-opacity=".7" d="%s"/>' % (COLOR_PLAN, d))
        else:
            base.append('<path d="%s"/>' % d)

    # 南西諸島(沖縄本島・宮古・八重山)は本土から離れすぎていて、同じ縮尺で描くと
    # 地図が横に間延びする。日本の地図で一般的な、左下に縮小した枠を置く形にする。
    # 位置は九州の南西側なので、方角としても実際の位置関係と食い違わない。
    isles = okinawa
    op = [p for rings in isles.values() for r in rings for p in r]
    oxmin = min(p[0] for p in op)
    oxmax = max(p[0] for p in op)
    oymin = min(p[1] for p in op)
    oymax = max(p[1] for p in op)

    # 枠は地図の左上に置く。北海道が右上、九州が左下にあるため、ここが一番大きく空く。
    # 日本の地図で沖縄を別枠にするときの定番の位置でもある。
    # 枠が本土に当たる場合だけ、当たらなくなる分だけ本土を下へずらす(地図が縦に伸びる)。
    oscale = INSET_SIZE / max(oxmax - oxmin, oymax - oymin)
    box_w = (oxmax - oxmin) * oscale + 40
    box_h = (oymax - oymin) * oscale + 40
    box_x = box_y = INSET_MARGIN

    x0, x1 = box_x - INSET_GAP, box_x + box_w + INSET_GAP
    y1 = box_y + box_h + INSET_GAP
    in_range = [to_svg(x, y)[1] for rings in mainland.values() for r in rings
                for x, y in r if x0 <= to_svg(x, y)[0] <= x1]
    shift = max(0.0, y1 - min(in_range)) if in_range else 0.0
    if shift:
        base_to_svg = to_svg

        def to_svg(x, y, _f=base_to_svg, _d=shift):     # noqa: F811 (本土を下へずらす)
            sx, sy = _f(x, y)
            return sx, sy + _d

        vh = int(round(vh + shift))

    ox, oy = box_x + 20, box_y + 20
    sys.stdout.write("インセット: 長辺%dpx / 枠 %dx%d @ (%d,%d) / 本土のずらし %dpx / viewBox高 %d\n"
                     % (INSET_SIZE, box_w, box_h, box_x, box_y, shift, vh))

    # 本土をずらした場合は描き直す
    if shift:
        base, hot = [], []
        for name, rings in mainland.items():
            d = to_path(rings, to_svg)
            if name in ACTIVE:
                hot.append('<path fill="%s" fill-opacity="1" stroke-opacity=".7" d="%s"/>' % (COLOR_ACTIVE, d))
            elif name in PLAN:
                hot.append('<path fill="%s" fill-opacity="1" stroke-opacity=".7" d="%s"/>' % (COLOR_PLAN, d))
            else:
                base.append('<path d="%s"/>' % d)

    def to_oki(x, y):
        return (ox + (x - oxmin) * oscale, oy + (y - oymin) * oscale)

    for name, rings in isles.items():
        base.append('<path d="%s"/>' % to_path(rings, to_oki))

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">'
        '<rect x="%d" y="%d" width="%d" height="%d" rx="10" fill="none" stroke="#fff" '
        'stroke-opacity=".3" stroke-width="2" stroke-dasharray="6 5"/>'
        '<g fill="#fff" fill-opacity=".26" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" '
        'stroke-linejoin="round">%s%s</g></svg>'
    ) % (vw, vh, vw, vh, int(ox - 20), int(oy - 20), int(box_w), int(box_h),
         "".join(base), "".join(hot))

    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(svg)

    sys.stdout.write("[OK] images/japan-map.svg (%.1f KB, viewBox 0 0 %d %d)\n"
                     % (len(svg.encode("utf-8")) / 1024.0, vw, vh))
    sys.stdout.write("\nindex.html / en/index.html の .hero-areas-pin に貼る値:\n")
    for lon, lat, label in PINS:
        x, y = to_svg(lon * KX, -lat)
        sys.stdout.write('  %s\tstyle="left:%.2f%%;top:%.2f%%"\n' % (label, x / vw * 100, y / vh * 100))
    sys.stdout.write("\n<img> の width/height 属性も %d / %d に合わせること\n" % (vw, vh))


if __name__ == "__main__":
    main()
