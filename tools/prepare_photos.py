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

# スマホ向けの軽量版(srcset用)のファイル名は "<元名>-<幅>w.jpg" という派生名になる。
# 派生ファイル自身は「元画像」として扱わない(改名・再縮小・一覧掲載の対象外にする)。
_WIDTH_SUFFIX_RE = re.compile(r"-\d+w\.(jpe?g|png|webp|gif)$", re.I)


def _capture_stamp(path, Image):
    """(stamp14, how) を返す。how は 'name' / 'exif' / 'mtime'。
    優先順位: ファイル名先頭の日付 > EXIF撮影日時 > 更新日時(アップロード日=概算)。
    ※ LINE経由の写真はEXIFが消えるため、正しい日付にしたい場合は
      ファイル名の先頭を日付(例 20250719 や 20250719120000)にしておくと尊重される。"""
    name = os.path.basename(path)
    # 1) ファイル名の先頭に日付(8桁 yyyymmdd、任意で+6桁 hhmmssまたは+4桁 hhmm)
    #    があれば最優先。4桁(hhmm)は秒を00で補う。時刻が無ければ12:00:00とする
    #    (※ 以前は6桁ちょうどでない時刻表記を無視して時刻無し扱いにしてしまい、
    #      hhmmで秒を省略した場合に指定した時刻が失われるバグがあった)
    m = re.match(r"^(\d{8})(\d{6}|\d{4})?", name)
    if m:
        try:
            datetime.datetime.strptime(m.group(1), "%Y%m%d")
            time_part = m.group(2)
            if time_part is None:
                time_part = "120000"
            elif len(time_part) == 4:
                time_part += "00"
            return m.group(1) + time_part, "name"
        except ValueError:
            pass
    # 2) EXIF DateTimeOriginal
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
                m2 = _EXIF_DT_RE.search(str(dt))
                if m2:
                    return "".join(m2.groups()), "exif"
    except Exception:
        pass
    # 3) 更新日時(アップロード日=概算。撮影日と異なる場合があるので最終手段)
    t = datetime.datetime.fromtimestamp(os.path.getmtime(path))
    return t.strftime("%Y%m%d%H%M%S"), "mtime"


def _next_free_name(folder_dir, stamp, ext):
    """同じタイムスタンプのファイルが既にあれば、秒を1つずつ繰り上げて
    空いているファイル名を探す(末尾に_1/_2を付けず、綺麗な14桁のまま保つ)。
    ※ ファイル名の先頭に日付だけ書いて時刻を省略した場合、時刻部分は
      12:00:00で補完される(_capture_stamp)。同じ日付の写真が複数あると
      元々は全部同じ14桁になり"_1"等の連番が必要だったが、この関数が
      1秒ずつ繰り上げて空きを探すため、連番無しの綺麗な14桁のまま並べられる。
    stampが不正な形式(壊れた手動リネーム等でパース不能)の場合のみ、
    従来通り末尾に_連番を付けて衝突を回避する。"""
    try:
        dt = datetime.datetime.strptime(stamp, "%Y%m%d%H%M%S")
    except ValueError:
        target = stamp + ext
        n = 1
        while os.path.exists(os.path.join(folder_dir, target)):
            target = "%s_%d%s" % (stamp, n, ext)
            n += 1
        return target
    while True:
        target = dt.strftime("%Y%m%d%H%M%S") + ext
        if not os.path.exists(os.path.join(folder_dir, target)):
            return target
        dt += datetime.timedelta(seconds=1)


def rename_to_capture_datetime(folder_dir, Image, warn_mtime):
    """フォルダ直下の画像を撮影日時ファイル名へ改名(既に14桁形式のものは触らない)。
    更新日時でしか命名できなかったものは warn_mtime に記録して呼び出し側で警告する。"""
    count = 0
    for name in sorted(os.listdir(folder_dir)):
        if not name.lower().endswith(IMAGE_EXTS) or name.startswith("."):
            continue
        if _WIDTH_SUFFIX_RE.search(name):
            continue  # srcset用の派生ファイルは元画像として扱わない
        if _DATENAME_RE.match(name):
            continue  # 既に yyyymmddhhmmss 形式(=手動補正済み含む)は絶対に触らない
        src = os.path.join(folder_dir, name)
        if not os.path.isfile(src):
            continue
        stamp, how = _capture_stamp(src, Image)
        ext = os.path.splitext(name)[1].lower()
        if ext == ".jpeg":
            ext = ".jpg"
        target = _next_free_name(folder_dir, stamp, ext)
        os.rename(src, os.path.join(folder_dir, target))
        print("リネーム(%s): %s -> %s" % (how, name, target))
        if how == "mtime":
            warn_mtime.append(folder_dir.split("images/")[-1] + "/" + target
                              if "images/" in folder_dir else target)
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
            and not _WIDTH_SUFFIX_RE.search(n)  # srcset用の派生ファイルは一覧に出さない
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

# スマホ向けの軽量版(srcset用)を追加生成するフォルダと、その幅(px)。
# ここに挙げたフォルダの写真は「<元名>-480w.jpg」「<元名>-800w.jpg」が
# 元画像と同じフォルダに追加生成され、サイト側(JS)がsrcsetとして
# 画面幅に応じた軽い方を自動選択できるようにする(通信量の削減が目的)。
SRCSET_WIDTHS = (480, 800)
SRCSET_FOLDERS = {
    "images/hero",
    "images/gallery",
    "images/gallery/recent",
    "images/gallery/saigaifukkou",
    "images/gallery/heartrugby",
    "images/gallery/community",
    "images/org-highlights",
}


def generate_srcset_variants(folder_dir, Image, ImageOps, quality):
    """フォルダ内の各写真について、より軽い縮小版(-480w/-800w)を生成する。
    元画像より新しい派生ファイルが既にあれば再生成しない(繰り返し実行での
    画質劣化・無駄な書き込みを防ぐ)。派生ファイル自身は対象から除外する。"""
    count = 0
    for name in sorted(os.listdir(folder_dir)):
        if not name.lower().endswith((".jpg", ".jpeg", ".png")) or name.startswith("."):
            continue
        if _WIDTH_SUFFIX_RE.search(name):
            continue
        path = os.path.join(folder_dir, name)
        if not os.path.isfile(path):
            continue
        stem = os.path.splitext(name)[0]
        src_mtime = os.path.getmtime(path)
        for w in SRCSET_WIDTHS:
            out_path = os.path.join(folder_dir, "%s-%dw.jpg" % (stem, w))
            if os.path.exists(out_path) and os.path.getmtime(out_path) >= src_mtime:
                continue
            try:
                img = Image.open(path)
                img = ImageOps.exif_transpose(img).convert("RGB")
                img.thumbnail((w, w))
                img.save(out_path, "JPEG", quality=quality, optimize=True)
                os.utime(out_path, (src_mtime, src_mtime))
                count += 1
            except Exception as e:
                print("[ERROR] srcset %s/%s: %s" % (folder_dir, name, e))
    return count


def cleanup_orphan_srcset(folder_dir):
    """元画像が削除・改名されて無くなった場合、対応するsrcset派生ファイル
    (-480w/-800w)だけが残ってしまうのを防ぐため、元画像が無い派生ファイルを削除する。"""
    count = 0
    try:
        existing = set(os.listdir(folder_dir))
    except OSError:
        return count
    for name in sorted(existing):
        m = re.match(r"^(.*)-\d+w\.(jpe?g|png|webp|gif)$", name, re.I)
        if not m:
            continue
        stem = m.group(1)
        base_exists = any(
            (stem + ext) in existing for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")
        )
        if not base_exists:
            try:
                os.remove(os.path.join(folder_dir, name))
                print("削除(孤立したsrcset派生): %s" % name)
                count += 1
            except OSError as e:
                print("[ERROR] cleanup %s/%s: %s" % (folder_dir, name, e))
    return count


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
    converted = optimized = renamed = srcset = srcset_cleaned = 0
    mtime_warn = []  # 撮影日時が不明で更新日時(概算)で命名したもの

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
            renamed += rename_to_capture_datetime(d, Image, mtime_warn)

        # 2) 大きすぎるJPG/PNGを縮小
        for name in sorted(os.listdir(d)):
            if not name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            if _WIDTH_SUFFIX_RE.search(name):
                continue  # srcset用の派生ファイルはここでは扱わない
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

        # 2.5) 元画像が消えた派生ファイルを掃除してから、srcset用の軽量版を生成
        if folder in SRCSET_FOLDERS:
            srcset_cleaned += cleanup_orphan_srcset(d)
            srcset += generate_srcset_variants(d, Image, ImageOps, QUALITY)

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
        "写真整形おわり: HEIC変換 %d件 / 改名 %d件 / 縮小 %d件 / srcset生成 %d件"
        " / srcset孤立削除 %d件 / 一覧生成 %d件"
        % (converted, renamed, optimized, srcset, srcset_cleaned, manifests)
    )
    if mtime_warn:
        print("")
        print("[注意] 次の写真は撮影日時が読み取れず、アップロード日で命名しました。")
        print("       日付が違う場合は、ファイル名の先頭を正しい日付に変えて再実行してください")
        print("       (例: 20250719120000.jpg)。一度14桁の日付名にすれば以後は自動改名しません。")
        for p in mtime_warn:
            print("       - " + p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
