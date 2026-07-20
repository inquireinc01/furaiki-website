# -*- coding: utf-8 -*-
"""全ページ共通部(<head> / ヘッダー / フッター / スキップリンク)の単一ソース。

このスクリプトが「共通部の正」です。ヘッダー・フッター・meta・OGP・バージョン等は
各HTMLを直接編集せず、ここを直してから `python tools/build_common.py` を実行して
全ページへ一括反映してください(「サイトを更新.bat」からも自動実行されます)。

- 各ページ固有の情報(タイトル・説明)は下の PAGES 表で管理します。
- ページ本文(<main>〜</main>)には手を加えません。共通部だけを差し替えます。
"""
import os
import re

# リポジトリのルート(このファイルの1つ上の階層)。絶対パスを埋め込まず可搬にする。
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SITE = "https://www.furaiki.org"        # 正規ドメイン(canonical / OGP の基準)
V = "20260722m"                          # CSS/JS のキャッシュバスト用バージョン
TAILWIND_CDN = "https://cdn.tailwindcss.com/3.4.16"  # バージョン固定(最新追従による突然の崩壊を防ぐ)
GA4_ID = "G-53J7NCFSF3"                   # Googleアナリティクス4 測定ID。空にするとGA4タグを出力しない。
OG_IMAGE = SITE + "/images/mascot.png"

# ページ固有のメタ情報。file: (title, description, main_bg_class)
# main_bg_class は <main> 直後にスキップ先を置くための識別に使うだけ(表示には無関係)。
PAGES = {
    "index.html": (
        "NPO法人フライキプロジェクト | ラグビーの精神で被災地を「ワンチーム」に",
        "特定非営利活動法人フライキプロジェクトの公式サイト。ラグビーの精神と大漁旗「フライキ」で被災地に心の復興を届ける活動を行っています。",
    ),
    "organization.html": (
        "団体概要 | NPO法人フライキプロジェクト",
        "NPO法人フライキプロジェクトの団体概要、役員情報、設立趣意書をご紹介します。",
    ),
    "message.html": (
        "代表挨拶 | NPO法人フライキプロジェクト",
        "特定非営利活動法人フライキプロジェクト 代表理事 園部浩誉からのご挨拶。ラグビーで培った絆と体力を、復興への力に。",
    ),
    "about.html": (
        "活動報告 | NPO法人フライキプロジェクト",
        "特定非営利活動法人フライキプロジェクトの活動報告。緊急災害復興支援・心の復興支援・地域コミュニティ支援の様子をご紹介します。",
    ),
    "financial.html": (
        "決算報告 | NPO法人フライキプロジェクト",
        "特定非営利活動法人フライキプロジェクトの決算報告・事業報告書のご案内。第1期決算報告は2027年7月頃公開予定です。",
    ),
    "corporate.html": (
        "企業・団体様へ | NPO法人フライキプロジェクト",
        "特定非営利活動法人フライキプロジェクトとのCSR連携・協賛・共同プロジェクトのご案内。",
    ),
    "contact.html": (
        "お問合せ | NPO法人フライキプロジェクト",
        "NPO法人フライキプロジェクトへのお問合せ、ご寄付、ボランティア参加のご案内。",
    ),
    "privacy.html": (
        "プライバシーポリシー | NPO法人フライキプロジェクト",
        "NPO法人フライキプロジェクトの個人情報保護方針(プライバシーポリシー)です。",
    ),
}

# ナビゲーション(順序も定義)
NAV = [
    ("organization.html", "団体概要"),
    ("message.html", "代表挨拶"),
    ("about.html", "活動報告"),
    ("financial.html", "決算報告"),
    ("corporate.html", "企業・団体様へ"),
    ("contact.html", "お問合せ"),
]

FOOTER_LINKS = [
    ("index.html", "ホーム", False),
    ("organization.html", "団体概要", False),
    ("organization.html#history", "沿革", False),
    ("message.html", "代表挨拶", False),
    ("about.html", "活動報告", False),
    ("financial.html", "決算報告", False),
    ("corporate.html", "企業・団体様へ", False),
    ("contact.html", "お問合せ", False),
    ("privacy.html", "プライバシーポリシー", False),
    ("https://congrant.com/project/furaiki/22163", "寄付する", True),
    ("https://lin.ee/nkWK6v7", "LINE公式アカウント", True),
    ("https://www.youtube.com/@FURAIKIProject", "YouTube", True),
    ("https://furaiki.jimdofree.com/", '一般社団法人フライキプロジェクト<span class="block text-xs text-gray-400 font-normal">(旧ホームページ)</span>', True),
]

# 外部リソースを最小限に限定したCSP。TailwindのPlay CDNはJIT(new Function)と
# インラインstyle注入を使うため 'unsafe-eval'/'unsafe-inline' が必須。その制約下でも
# frame/object/base/form の宛先は絞る。GA4(googletagmanager/analytics)も許可済み。
CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://www.googletagmanager.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https://www.furaiki.org https://raw.githubusercontent.com https://www.googletagmanager.com https://www.google-analytics.com; "
    "connect-src 'self' https://api.github.com https://www.google-analytics.com https://region1.google-analytics.com; "
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com; "
    "base-uri 'self'; form-action 'self' mailto:; object-src 'none'"
)


def _canonical(page):
    return SITE + "/" + ("" if page == "index.html" else page)


def _ga4_snippet():
    if not GA4_ID:
        return ""
    return (
        '\n<!-- Google Analytics (GA4) -->\n'
        '<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA4_ID + '"></script>\n'
        "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
        "gtag('js',new Date());gtag('config','" + GA4_ID + "');</script>"
    )


# トップページに埋め込む団体の構造化データ(検索エンジン向け)。
# 住所は登記上の主たる事務所(公開情報)。個人宅住所は含めない。
JSON_LD_INDEX = (
    '\n<script type="application/ld+json">'
    '{"@context":"https://schema.org","@type":"NGO",'
    '"name":"特定非営利活動法人フライキプロジェクト",'
    '"alternateName":"フライキプロジェクト",'
    '"url":"' + SITE + '/",'
    '"logo":"' + SITE + '/images/mascot.png",'
    '"foundingDate":"2026-07-01",'
    '"address":{"@type":"PostalAddress","postalCode":"102-0083",'
    '"addressRegion":"東京都","addressLocality":"千代田区",'
    '"streetAddress":"麹町5-5-3 DUARES麹町ONYX503","addressCountry":"JP"},'
    '"sameAs":["https://lin.ee/nkWK6v7","https://www.youtube.com/@FURAIKIProject",'
    '"https://congrant.com/project/furaiki/22163"]}'
    '</script>'
)


def head_html(page):
    title, desc = PAGES[page]
    canonical = _canonical(page)
    # ブレースを含む noscript/GA4/JSON-LD は f-string を避けて連結する
    noscript = (
        '<noscript><style>.reveal,.gallery-item{opacity:1!important;transform:none!important}</style></noscript>'
    )
    json_ld = JSON_LD_INDEX if page == "index.html" else ""
    return (
        '<head>\n'
        '<meta charset="UTF-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        '<meta http-equiv="Content-Security-Policy" content="' + CSP + '" />\n'
        '<meta name="referrer" content="strict-origin-when-cross-origin" />\n'
        '<title>' + title + '</title>\n'
        '<meta name="description" content="' + desc + '" />\n'
        '<link rel="canonical" href="' + canonical + '" />\n'
        '<meta property="og:type" content="website" />\n'
        '<meta property="og:site_name" content="特定非営利活動法人フライキプロジェクト" />\n'
        '<meta property="og:title" content="' + title + '" />\n'
        '<meta property="og:description" content="' + desc + '" />\n'
        '<meta property="og:url" content="' + canonical + '" />\n'
        '<meta property="og:image" content="' + OG_IMAGE + '" />\n'
        '<meta name="twitter:card" content="summary_large_image" />\n'
        '<meta name="twitter:title" content="' + title + '" />\n'
        '<meta name="twitter:description" content="' + desc + '" />\n'
        '<meta name="twitter:image" content="' + OG_IMAGE + '" />\n'
        '<link rel="icon" href="images/mascot.png" type="image/png" />\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com" />\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
        '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />\n'
        '<script src="' + TAILWIND_CDN + '"></script>\n'
        '<link rel="stylesheet" href="css/style.css?v=' + V + '" />\n'
        + noscript + json_ld + _ga4_snippet() + '\n'
        '</head>'
    )


def header_html(active):
    desktop_items = []
    mobile_items = []
    for href, label in NAV:
        if href == active:
            desktop_items.append(
                f'        <a href="{href}" aria-current="page" class="text-sm font-bold text-[#c8102e] whitespace-nowrap">{label}</a>'
            )
            mobile_items.append(
                f'      <a href="{href}" aria-current="page" class="block px-5 py-3.5 text-sm font-bold text-white rounded-xl bg-white/15">{label}</a>'
            )
        else:
            desktop_items.append(
                f'        <a href="{href}" class="text-sm font-medium text-gray-700 hover:text-[#c8102e] transition-colors whitespace-nowrap">{label}</a>'
            )
            mobile_items.append(
                f'      <a href="{href}" class="block px-5 py-3.5 text-sm font-bold text-white/95 rounded-xl hover:bg-white/10 transition-colors">{label}</a>'
            )
    desktop_nav = "\n".join(desktop_items)
    mobile_nav = "\n".join(mobile_items)
    home_active = "index.html" == active
    home_cur = ' aria-current="page"' if home_active else ""
    home_cls = "block px-5 py-3.5 text-sm font-bold text-white rounded-xl bg-white/15" if home_active else "block px-5 py-3.5 text-sm font-bold text-white/95 rounded-xl hover:bg-white/10 transition-colors"

    return f'''<!-- ===== グローバルヘッダー ===== -->
<header id="site-header" class="sticky top-0 z-50 bg-white border-b border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="relative flex items-center justify-between h-20">
      <!-- ロゴエリア: 通常カラーのエンブレム + 2行文字(1行目は字間を広げて2行目と同じ幅に) -->
      <a href="index.html" class="logo-badge group shrink-0" aria-label="フライキプロジェクト トップページ">
        <span class="logo-badge-img">
          <img src="images/メインロゴ.jpg" alt="" />
        </span>
        <span class="logo-badge-text">
          <span class="logo-badge-line1">特定非営利活動法人</span>
          <span class="logo-badge-line2">フライキプロジェクト</span>
        </span>
      </a>

      <!-- ナビゲーション: 固定の画面幅ではなく、実際に収まるかをJS(header-fit.js)が
           判定して表示を切り替える。初期状態は安全側(非表示・測定専用)にしておく。
           flex-1 + justify-evenly で、ロゴ〜寄付ボタンの間全体に等間隔で配置する -->
      <nav id="desktopNav" aria-label="メインナビゲーション" class="flex-1 items-center justify-evenly mx-6" style="position:absolute; left:-9999px; display:flex;">
{desktop_nav}
      </nav>

      <!-- CTA -->
      <div class="flex items-center gap-4">
        <a href="https://congrant.com/project/furaiki/22163" target="_blank" rel="noopener" id="desktopDonate" class="jiggle-group btn-primary items-center gap-2 pl-1.5 pr-6 py-1.5 text-sm font-bold rounded-full whitespace-nowrap" style="position:absolute; left:-9999px; display:inline-flex;">
          <img src="images/mascot.png" alt="" class="h-12 w-auto -my-2" />
          寄付・支援はこちら
        </a>
        <button id="menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="メニューを開く" class="p-2 text-gray-800">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- ナビが収まらない画面幅で使うメニュー(表示判定はheader-fit.jsが行う) -->
  <div id="mobile-menu" class="hidden border-t border-gray-100 bg-white">
    <nav aria-label="モバイルナビゲーション" class="flex flex-col p-3">
      <a href="index.html" class="{home_cls}"{home_cur}>ホーム</a>
{mobile_nav}
      <div class="my-2 border-t border-white/25"></div>
      <a href="https://congrant.com/project/furaiki/22163" target="_blank" rel="noopener" class="block px-5 py-3.5 text-sm font-black text-[#c8102e] bg-white rounded-full text-center hover:bg-gray-100 transition-colors">寄付・支援はこちら</a>
    </nav>
  </div>
</header>'''


def footer_html():
    items = []
    for href, label, external in FOOTER_LINKS:
        attrs = ' target="_blank" rel="noopener"' if external else ""
        items.append(
            f'        <a href="{href}"{attrs} class="text-sm font-medium text-gray-300 hover:text-white transition-colors">{label}</a>'
        )
    links = "\n".join(items)
    return f'''<!-- ===== フッター ===== -->
<footer class="bg-[#1e1e21] text-white py-12 sm:py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <nav aria-label="フッターナビゲーション" class="flex flex-wrap gap-x-8 gap-y-3 justify-center mb-8">
{links}
    </nav>
    <div class="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
      <p>©2026 特定非営利活動法人フライキプロジェクト All rights reserved.</p>
    </div>
  </div>
</footer>'''


# ---- 差し替え(共通部だけを置換。本文<main>には触れない) ----

def replace_head(html, page):
    return re.sub(r"<head>.*?</head>", lambda m: head_html(page), html, count=1, flags=re.S)


def replace_header(html, active):
    return re.sub(
        r"<!-- ===== グローバルヘッダー ===== -->.*?</header>",
        lambda m: header_html(active), html, count=1, flags=re.S,
    )


def replace_footer(html):
    return re.sub(
        r"<!-- ===== フッター ===== -->.*?</footer>",
        lambda m: footer_html(), html, count=1, flags=re.S,
    )


def ensure_skip_link(html):
    """<body ...> の直後にスキップリンクを1つだけ置く(既にあれば入れ直す)。"""
    html = re.sub(r'\s*<a href="#main" class="skip-link[^>]*>.*?</a>', "", html, count=1, flags=re.S)
    link = '\n<a href="#main" class="skip-link">本文へスキップ</a>'
    return re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + link, html, count=1)


def ensure_main_id(html):
    """最初の <main> に id="main" を付与(既にあれば触らない)。"""
    def repl(m):
        tag = m.group(0)
        if "id=" in tag:
            return tag
        return tag[:-1] + ' id="main">' if tag.endswith(">") else tag
    return re.sub(r"<main\b[^>]*>", repl, html, count=1)


def bump_versions(html):
    return re.sub(r'\?v=[0-9a-zA-Z]+"', f'?v={V}"', html)


def write_seo_files():
    """robots.txt と sitemap.xml を PAGES / SITE から生成(内容と自動同期)。"""
    # robots.txt: 全クロール許可 + sitemap の場所を明示
    robots = "User-agent: *\nAllow: /\n\nSitemap: " + SITE + "/sitemap.xml\n"
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(robots)

    # sitemap.xml: 公開8ページのURL一覧
    urls = "".join(
        "  <url><loc>%s</loc></url>\n" % _canonical(p) for p in PAGES
    )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + urls +
        "</urlset>\n"
    )
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(sitemap)
    print("[OK] robots.txt / sitemap.xml")


def apply_all():
    for page in PAGES:
        path = os.path.join(ROOT, page)
        if not os.path.isfile(path):
            print("[SKIP] not found:", page)
            continue
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()
        active = page  # ナビのactive判定(privacyはNAV外なので該当なし=全てinactive)
        html = replace_head(html, page)
        html = replace_header(html, active)
        html = replace_footer(html)
        html = ensure_skip_link(html)
        html = ensure_main_id(html)
        html = bump_versions(html)  # 本文の <script ...?v=> も含め全ての ?v= を V に統一
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print("[OK]", page)


if __name__ == "__main__":
    apply_all()
    write_seo_files()
    print("共通部の再生成おわり (V=%s, GA4=%s)" % (V, GA4_ID or "無効"))
