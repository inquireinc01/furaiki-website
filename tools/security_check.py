# -*- coding: utf-8 -*-
"""公開前のセキュリティ検査(「サイトを更新.bat」と GitHub Actions から実行)。

問題があれば終了コード 1 を返し、bat はアップロードを止める。
追跡対象(git add 済みを含む)のファイルだけを見る。秘密情報らしき値は画面に出さない。
"""
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ページ内での実行を許す外部スクリプトの配信元
ALLOWED_SCRIPT_HOSTS = {"www.googletagmanager.com"}
ALLOWED_FRAME_HOSTS = {"www.youtube.com", "www.youtube-nocookie.com"}
# 寄付・LINEの導線。書き換えられると寄付金の詐取に直結するので固定値と照合する
DONATE_URL = "https://congrant.com/project/furaiki/22163"
LINE_URL = "https://lin.ee/nkWK6v7"
CUSTOM_DOMAIN = "www.furaiki.org"
ALLOWED_PDFS = {"documents/定款.pdf"}

SECRET_PATTERNS = {
    "GitHubトークン": r"gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}",
    "Google APIキー": r"AIza[0-9A-Za-z_-]{35}",
    "AWSキー": r"AKIA[0-9A-Z]{16}",
    "Slackトークン": r"xox[abprs]-[A-Za-z0-9-]{10,}",
    "AI APIキー": r"sk-[A-Za-z0-9_-]{30,}",
    "秘密鍵": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "パスワード記載": r"(?i)(password|passwd|パスワード|暗証番号|app.?secret|client_secret)\s*[:：=]\s*\S{4,}",
}
PII_PATTERNS = {
    "携帯電話番号": r"(?<![0-9])0[789]0[-‐ー]?[0-9]{4}[-‐ー]?[0-9]{4}(?![0-9])",
    "マイナンバーの語": r"マイナンバー\s*[:：]",
    "口座番号の記載": r"口座番号\s*[:：]\s*[0-9]",
}
FORBIDDEN_NAME = re.compile(
    r"(^|/)\.env|\.(pem|key|p12|docx?|xlsx?|csv|bak|heic)$|名簿|口座|マイナンバー|パスワード|password|secret|credential|指示書",
    re.I,
)
TEXT_EXT = (".html", ".js", ".css", ".txt", ".md", ".json", ".py", ".tsv", ".yml", ".yaml", ".xml", ".bat", ".svg")
BANNED_WORDS = ["クラウドファンディング"]

errors = []
warnings = []


def tracked_files():
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [f for f in out.decode("utf-8").split("\0") if f]


def read_text(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", errors="ignore") as f:
        return f.read()


def check_names(files):
    for f in files:
        # 公開用の英語/日本語ページ名に偶然一致しないよう、画像とニュース本文は名前検査から外さない
        if f.endswith("security_check.py") or f.endswith("security_monitor.py"):
            continue
        if FORBIDDEN_NAME.search(f):
            errors.append("公開してはいけない種類のファイル: " + f)
        if f.lower().endswith(".pdf") and f not in ALLOWED_PDFS:
            errors.append("許可リストにないPDF(個人情報の確認が必要): " + f)


def check_contents(files):
    skip = ("tools/security_check.py", "tools/security_monitor.py", "tools/tailwind/package-lock.json")
    for f in files:
        if not f.lower().endswith(TEXT_EXT) or f in skip:
            continue
        s = read_text(f)
        for label, pat in SECRET_PATTERNS.items():
            if re.search(pat, s):
                errors.append("%sらしき文字列: %s" % (label, f))
        visible = re.sub(r'placeholder="[^"]*"', "", s)  # 入力欄の記入例は実データではない
        for label, pat in PII_PATTERNS.items():
            if re.search(pat, visible):
                errors.append("%sらしき文字列: %s" % (label, f))
        if f.lower().endswith((".html", ".js")) or f.startswith("news/"):
            for w in BANNED_WORDS:
                if w in s:
                    errors.append("使用禁止の語「%s」: %s" % (w, f))


def _jpeg_has_metadata(path):
    with open(path, "rb") as f:
        data = f.read(1 << 18)
    if data[:2] != b"\xff\xd8":
        return False
    i = 2
    while i + 4 <= len(data) and data[i] == 0xFF:
        marker = data[i + 1]
        if marker == 0xDA:
            break
        if marker in (0xE1, 0xED):
            return True
        i += 2 + int.from_bytes(data[i + 2 : i + 4], "big")
    return False


def check_images(files):
    for f in files:
        if f.lower().endswith((".jpg", ".jpeg")) and _jpeg_has_metadata(os.path.join(ROOT, f)):
            errors.append("写真にEXIF等が残っている(位置情報の恐れ): " + f)


def _hosts(attr, tag, html):
    urls = re.findall(r"<%s\b[^>]*\b%s=[\"'](https?:)?//([^/\"']+)" % (tag, attr), html, re.I)
    return {u[1].lower() for u in urls}


def check_pages(files):
    pages = [f for f in files if f.lower().endswith(".html")]
    for f in pages:
        s = read_text(f)
        m = re.search(r'http-equiv="Content-Security-Policy"\s+content="([^"]+)"', s, re.I)
        if not m:
            errors.append("CSPがない: " + f)
        else:
            script_src = re.search(r"script-src([^;]*)", m.group(1))
            if not script_src or "unsafe-eval" in script_src.group(1) or "unsafe-inline" in script_src.group(1):
                errors.append("CSPのscript-srcが緩い: " + f)
        for host in _hosts("src", "script", s) - ALLOWED_SCRIPT_HOSTS:
            errors.append("許可していない外部スクリプト %s: %s" % (host, f))
        for host in _hosts("src", "iframe", s) - ALLOWED_FRAME_HOSTS:
            errors.append("許可していない埋め込み %s: %s" % (host, f))
        if re.search(r"<(?!/)[a-z][^>]*\son[a-z]+\s*=\s*[\"']", s, re.I):
            errors.append("インラインのイベントハンドラ: " + f)
        for tag in re.findall(r"<script\b([^>]*)>\s*\S", s, re.I):
            if "src=" not in tag and "application/ld+json" not in tag:
                errors.append("インラインスクリプト: " + f)
        if "javascript:" in s.lower():
            errors.append("javascript: リンク: " + f)
        for a in re.findall(r"<a\b[^>]*target=\"_blank\"[^>]*>", s, re.I):
            if "noopener" not in a:
                errors.append('rel="noopener" がない外部リンク: ' + f)
        for url in re.findall(r"https://congrant\.com/[^\"'<\s]*", s):
            if url != DONATE_URL:
                errors.append("寄付リンクが想定と違う: %s %s" % (url, f))
        for url in re.findall(r"https://lin\.ee/[^\"'<\s]*", s):
            if url != LINE_URL:
                errors.append("LINEリンクが想定と違う: %s %s" % (url, f))


def check_site_config():
    with open(os.path.join(ROOT, "CNAME"), encoding="utf-8") as f:
        if f.read().strip() != CUSTOM_DOMAIN:
            errors.append("CNAME が想定と違う")
    path = os.path.join(ROOT, ".well-known", "security.txt")
    if not os.path.isfile(path):
        errors.append(".well-known/security.txt がない")
        return
    m = re.search(r"Expires:\s*(\S+)", read_text(".well-known/security.txt"))
    if m:
        left = datetime.fromisoformat(m.group(1)) - datetime.now(timezone(timedelta(hours=9)))
        if left.days < 45:
            warnings.append("security.txt の期限まで %d 日" % left.days)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    files = tracked_files()
    check_names(files)
    check_contents(files)
    check_images(files)
    check_pages(files)
    check_site_config()
    for w in warnings:
        print("[WARN] " + w)
    for e in errors:
        print("[NG] " + e)
    print("security_check: %d files / NG %d / WARN %d" % (len(files), len(errors), len(warnings)))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
