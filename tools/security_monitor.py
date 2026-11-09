# -*- coding: utf-8 -*-
"""公開サイトの改ざん・乗っ取りの監視(GitHub Actions から毎日実行)。

リポジトリの内容と本番の配信内容の一致、DNS、証明書、ドメイン期限を確認する。
NG があれば GitHub の Issue を作って通知し、解消したら自動で閉じる。
公開リポジトリの Issue に載るので、外から見て分かる事実だけを書く。
"""
import glob
import hashlib
import json
import os
import socket
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.furaiki.org/"
ISSUE_TITLE = "[security-monitor] 要確認の項目があります"
UA = {"User-Agent": "furaiki-security-monitor"}
DEPLOY_GRACE_MIN = 45  # 直近の更新がPagesへ反映されるまでの猶予

EXPECTED_DNS = {
    ("furaiki.org", "A"): {"185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"},
    ("www.furaiki.org", "CNAME"): {"inquireinc01.github.io."},
    ("furaiki.org", "MX"): {"1 smtp.google.com."},
    ("furaiki.org", "NS"): {"nse1.squarespacedns.com.", "nse2.squarespacedns.com.",
                            "nse3.squarespacedns.com.", "nse4.squarespacedns.com."},
}
EXPECTED_CT_NAMES = {"furaiki.org", "www.furaiki.org"}

ng = []
ok = []


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def dns(name, rtype):
    q = urllib.parse.urlencode({"name": name, "type": rtype})
    d = json.loads(fetch("https://dns.google/resolve?" + q))
    return {a["data"] for a in d.get("Answer", []) if a["name"].rstrip(".") == name}


def last_commit_age_min():
    t = int(subprocess.check_output(["git", "log", "-1", "--format=%ct"], cwd=ROOT).strip())
    return (time.time() - t) / 60


def check_live_integrity():
    if last_commit_age_min() < DEPLOY_GRACE_MIN:
        ok.append("本番照合: 直近の更新の反映待ちのため省略")
        return
    targets = []
    for pat in ("*.html", "en/*.html", "js/*.js", "css/*.css", "CNAME"):
        targets += [os.path.relpath(p, ROOT).replace(os.sep, "/") for p in glob.glob(os.path.join(ROOT, pat))]
    targets = [t for t in targets if t != "CNAME"]
    bad = []
    for rel in targets:
        with open(os.path.join(ROOT, rel), "rb") as f:
            want = hashlib.sha256(f.read()).hexdigest()
        url = SITE + urllib.parse.quote(rel) + "?integrity=" + str(int(time.time()))
        try:
            got = hashlib.sha256(fetch(url)).hexdigest()
        except Exception as e:
            bad.append("%s (取得失敗 %s)" % (rel, type(e).__name__))
            continue
        if got != want:
            bad.append(rel)
    if bad:
        ng.append("本番の内容がリポジトリと一致しない: " + ", ".join(bad))
    else:
        ok.append("本番照合: %d ファイル一致" % len(targets))


def check_dns():
    for (name, rtype), want in EXPECTED_DNS.items():
        got = dns(name, rtype)
        if got != want:
            ng.append("DNS %s %s が想定と違う: %s" % (name, rtype, sorted(got)))
    spf = [t for t in dns("furaiki.org", "TXT") if "v=spf1" in t]
    if not spf or "include:_spf.google.com" not in spf[0] or len(spf) > 1:
        ng.append("SPF が想定と違う")
    dmarc = dns("_dmarc.furaiki.org", "TXT")
    if not dmarc:
        ng.append("DMARC レコードがない")
    elif "p=none" in " ".join(dmarc):
        ok.append("注意: DMARC は監視モード(p=none)のまま")
    if not dns("furaiki.org", "DS"):
        ng.append("DNSSEC(DS)が無効になっている")
    ok.append("DNS確認済み")


def check_tls():
    ctx = ssl.create_default_context()
    with socket.create_connection(("www.furaiki.org", 443), timeout=20) as s:
        with ctx.wrap_socket(s, server_hostname="www.furaiki.org") as t:
            cert = t.getpeercert()
    left = (ssl.cert_time_to_seconds(cert["notAfter"]) - time.time()) / 86400
    if left < 14:
        ng.append("TLS証明書の期限まで %d 日" % left)
    else:
        ok.append("TLS証明書 残り %d 日" % left)


def check_domain_expiry():
    d = json.loads(fetch("https://rdap.org/domain/furaiki.org"))
    exp = [e["eventDate"] for e in d.get("events", []) if e["eventAction"] == "expiration"]
    left = (datetime.fromisoformat(exp[0].replace("Z", "+00:00")) - datetime.now(timezone.utc)).days
    if left < 60:
        ng.append("ドメインの期限まで %d 日" % left)
    else:
        ok.append("ドメイン 残り %d 日" % left)


def check_ct():
    # crt.sh は不安定なので、取得できない日はNGにしない
    try:
        d = json.loads(fetch("https://crt.sh/?q=%25.furaiki.org&output=json", timeout=60))
    except Exception as e:
        ok.append("証明書ログ: 取得できず(%s)" % type(e).__name__)
        return
    names = {n.lower() for e in d for n in e["name_value"].split()}
    extra = names - EXPECTED_CT_NAMES
    if extra:
        ng.append("想定外のホスト名の証明書: " + ", ".join(sorted(extra)))
    else:
        ok.append("証明書ログ: 想定外なし")


def check_repo_rules():
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "security_check.py")],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(r.stdout)
    if r.returncode:
        lines = [l for l in r.stdout.splitlines() if l.startswith("[NG]")]
        ng.append("リポジトリ検査: " + " / ".join(lines[:20]))
    else:
        ok.append("リポジトリ検査: 問題なし")


def github(method, path, body=None):
    url = "https://api.github.com/repos/" + os.environ["GITHUB_REPOSITORY"] + path
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None, headers={
        **UA,
        "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
        "Accept": "application/vnd.github+json",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b"null")


def report_issue(body):
    existing = [i for i in github("GET", "/issues?state=open&per_page=100") if i["title"] == ISSUE_TITLE]
    if ng:
        if existing:
            github("POST", "/issues/%d/comments" % existing[0]["number"], {"body": body})
        else:
            github("POST", "/issues", {"title": ISSUE_TITLE, "body": body})
    elif existing:
        github("POST", "/issues/%d/comments" % existing[0]["number"], {"body": "解消を確認しました。\n\n" + body})
        github("PATCH", "/issues/%d" % existing[0]["number"], {"state": "closed"})


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    for check in (check_repo_rules, check_live_integrity, check_dns, check_tls, check_domain_expiry, check_ct):
        try:
            check()
        except Exception as e:
            ng.append("%s が実行できない: %s" % (check.__name__, type(e).__name__))
    body = "\n".join(["## NG"] + ["- " + x for x in ng] + ["", "## OK"] + ["- " + x for x in ok])
    print(body)
    if os.environ.get("GITHUB_TOKEN"):
        report_issue(body)
    return 1 if ng else 0


if __name__ == "__main__":
    sys.exit(main())
