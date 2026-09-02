# -*- coding: utf-8 -*-
"""全ページ共通部(<head> / ヘッダー / フッター / スキップリンク)の単一ソース。

このスクリプトが「共通部の正」です。ヘッダー・フッター・meta・OGP・バージョン等は
各HTMLを直接編集せず、ここを直してから `python tools/build_common.py` を実行して
全ページへ一括反映してください(「サイトを更新.bat」からも自動実行されます)。

- 日本語版(ルート直下)と英語版(en/ 配下)の両方を、同じ定義から生成します。
  言語ごとに違うのは LANGS の中身だけで、HTMLの組み立て方は完全に共通です。
- 各ページ固有の情報(タイトル・説明)は LANGS[lang]["pages"] で管理します。
- ページ本文(<main>〜</main>)には手を加えません。共通部だけを差し替えます。
"""
import os
import re

# リポジトリのルート(このファイルの1つ上の階層)。絶対パスを埋め込まず可搬にする。
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SITE = "https://www.furaiki.org"        # 正規ドメイン(canonical / OGP の基準)
V = "20260902a"                        # CSS/JS のキャッシュバスト用バージョン
TAILWIND_CDN = "https://cdn.tailwindcss.com/3.4.16"  # バージョン固定(最新追従による突然の崩壊を防ぐ)
GA4_ID = "G-53J7NCFSF3"                   # Googleアナリティクス4 測定ID。空にするとGA4タグを出力しない。
OG_IMAGE = SITE + "/images/mascot.png"

DONATE_URL = "https://congrant.com/project/furaiki/22163"
LINE_URL = "https://lin.ee/nkWK6v7"
YOUTUBE_URL = "https://www.youtube.com/@FURAIKIProject"
OLD_SITE_URL = "https://furaiki.jimdofree.com/"

# 全ページのファイル名(日英で共通。英語版は en/ 配下に同名で置く)
PAGE_FILES = [
    "index.html",
    "organization.html",
    "message.html",
    "about.html",
    "financial.html",
    "corporate.html",
    "contact.html",
    "privacy.html",
]

# ---------------------------------------------------------------------------
# 言語ごとの定義。ここだけが日英で異なる。
#   out_dir  : 出力先(ROOTからの相対)。英語版は en/
#   prefix   : css/js/images への相対プレフィックス。英語版は1階層深いので ../
#   url_base : canonical / OGP に使う公開URLの接頭辞
# ---------------------------------------------------------------------------
LANGS = {
    "ja": {
        "html_lang": "ja",
        "out_dir": "",
        "prefix": "",
        "url_base": SITE + "/",
        "site_name": "特定非営利活動法人フライキプロジェクト",
        "copyright_org": "特定非営利活動法人フライキプロジェクト",
        "skip_link": "本文へスキップ",
        "logo_aria": "フライキプロジェクト トップページ",
        "logo_note": "※認可申請中",
        "nav_aria": "メインナビゲーション",
        "mobile_nav_aria": "モバイルナビゲーション",
        "footer_nav_aria": "フッターナビゲーション",
        "menu_aria": "メニューを開く",
        "donate_cta": "寄付・支援はこちら",
        "home": "ホーム",
        "lang_switch_aria": "言語を切り替える",
        "self_label": "日本語",   # 現在の言語(リンクにしない)
        "other_label": "EN",      # 切替先の言語
        "pages": {
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
        },
        "nav": [
            ("organization.html", "団体概要"),
            ("message.html", "代表挨拶"),
            ("about.html", "活動報告"),
            ("financial.html", "決算報告"),
            ("corporate.html", "企業・団体様へ"),
            ("contact.html", "お問合せ"),
        ],
        "footer_links": [
            ("index.html", "ホーム", False),
            ("organization.html", "団体概要", False),
            ("organization.html#history", "沿革", False),
            ("message.html", "代表挨拶", False),
            ("about.html", "活動報告", False),
            ("financial.html", "決算報告", False),
            ("corporate.html", "企業・団体様へ", False),
            ("contact.html", "お問合せ", False),
            ("privacy.html", "プライバシーポリシー", False),
            (DONATE_URL, "寄付する", True),
            (LINE_URL, "LINE公式アカウント", True),
            (YOUTUBE_URL, "YouTube", True),
            (OLD_SITE_URL, '一般社団法人フライキプロジェクト<span class="block text-xs text-gray-400 font-normal">(旧ホームページ)</span>', True),
        ],
    },
    "en": {
        "html_lang": "en",
        "out_dir": "en",
        "prefix": "../",
        "url_base": SITE + "/en/",
        "site_name": "Furaiki Project, a Specified Non-profit Corporation",
        "copyright_org": "Furaiki Project, a Specified Non-profit Corporation",
        "skip_link": "Skip to main content",
        "logo_aria": "Furaiki Project Home Page",
        "logo_note": "*approval pending",
        "nav_aria": "Main Navigation",
        "mobile_nav_aria": "Mobile Navigation",
        "footer_nav_aria": "Footer Navigation",
        "menu_aria": "Open menu",
        "donate_cta": "Donate or Support Us",
        "home": "Home",
        "lang_switch_aria": "Switch language",
        "self_label": "EN",
        "other_label": "日本語",
        "pages": {
            "index.html": (
                "Furaiki Project | Uniting Disaster-Affected Communities as One Team Through Rugby",
                "The official website of Furaiki Project, a specified non-profit corporation. Through the spirit of rugby and traditional Japanese fishermen's flags known as Furaiki, we help disaster-affected communities rebuild hope and achieve emotional recovery.",
            ),
            "organization.html": (
                "About Us | Furaiki Project",
                "Learn about Furaiki Project's organizational profile, officers, and statement of purpose.",
            ),
            "message.html": (
                "President's Message | Furaiki Project",
                "A message from Hirotaka Sonobe, President of Furaiki Project. Turning the bonds and stamina developed through rugby into strength for recovery.",
            ),
            "about.html": (
                "Activity Reports | Furaiki Project",
                "Reports on Furaiki Project's emergency disaster recovery assistance, emotional recovery support, and local community support.",
            ),
            "financial.html": (
                "Financial Reports | Furaiki Project",
                "Information on Furaiki Project's financial reports and business reports. The financial report for the first fiscal year is scheduled for publication around July 2027.",
            ),
            "corporate.html": (
                "For Companies &amp; Organizations | Furaiki Project",
                "Information on CSR partnerships, sponsorships, and joint projects with Furaiki Project.",
            ),
            "contact.html": (
                "Contact Us | Furaiki Project",
                "Contact Furaiki Project about inquiries, donations, or volunteering.",
            ),
            "privacy.html": (
                "Privacy Policy | Furaiki Project",
                "Furaiki Project's Personal Information Protection Policy (Privacy Policy).",
            ),
        },
        # ヘッダーのナビだけは短縮形を使う。正式な表記(Activity Reports 等)のままだと
        # 横並びに収まらず、英語版だけ画面幅によらず常にハンバーガーになってしまうため。
        # ページ見出し・フッター・<title> は校正済みの正式表記のまま。
        "nav": [
            ("organization.html", "About Us"),
            ("message.html", "Message"),
            ("about.html", "Activities"),
            ("financial.html", "Financials"),
            ("corporate.html", "For Companies"),
            ("contact.html", "Contact"),
        ],
        "footer_links": [
            ("index.html", "Home", False),
            ("organization.html", "About Us", False),
            ("organization.html#history", "History", False),
            ("message.html", "President's Message", False),
            ("about.html", "Activity Reports", False),
            ("financial.html", "Financial Reports", False),
            ("corporate.html", "For Companies &amp; Organizations", False),
            ("contact.html", "Contact Us", False),
            ("privacy.html", "Privacy Policy", False),
            (DONATE_URL, "Donate", True),
            (LINE_URL, "Official LINE Account", True),
            (YOUTUBE_URL, "YouTube", True),
            (OLD_SITE_URL, 'Furaiki Project (General Incorporated Association)<span class="block text-xs text-gray-400 font-normal">(Former Website)</span>', True),
        ],
    },
}

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


def _url(lang, page):
    """公開URL(canonical / hreflang 用)。index.html はディレクトリURLに畳む。"""
    base = LANGS[lang]["url_base"]
    return base if page == "index.html" else base + page


def _other(lang):
    return "en" if lang == "ja" else "ja"


def _switch_href(lang, page):
    """同じページの、もう一方の言語版への相対リンク。"""
    return ("en/" + page) if lang == "ja" else ("../" + page)


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
def _json_ld(lang):
    if lang == "ja":
        name = "特定非営利活動法人フライキプロジェクト"
        alt = "フライキプロジェクト"
        region, locality = "東京都", "千代田区"
        street = "麹町5-5-3 DUARES麹町ONYX503"
    else:
        name = "Furaiki Project, a Specified Non-profit Corporation"
        alt = "Furaiki Project"
        region, locality = "Tokyo", "Chiyoda-ku"
        street = "DUARES Kojimachi ONYX 503, 5-5-3 Kojimachi"
    return (
        '\n<script type="application/ld+json">'
        '{"@context":"https://schema.org","@type":"NGO",'
        '"name":"' + name + '",'
        '"alternateName":"' + alt + '",'
        '"url":"' + _url(lang, "index.html") + '",'
        '"inLanguage":"' + LANGS[lang]["html_lang"] + '",'
        '"logo":"' + SITE + '/images/mascot.png",'
        '"foundingDate":"2026-07-01",'
        '"address":{"@type":"PostalAddress","postalCode":"102-0083",'
        '"addressRegion":"' + region + '","addressLocality":"' + locality + '",'
        '"streetAddress":"' + street + '","addressCountry":"JP"},'
        '"sameAs":["' + LINE_URL + '","' + YOUTUBE_URL + '","' + DONATE_URL + '"]}'
        '</script>'
    )


def head_html(lang, page):
    L = LANGS[lang]
    title, desc = L["pages"][page]
    p = L["prefix"]
    canonical = _url(lang, page)
    noscript = (
        '<noscript><style>.reveal,.gallery-item{opacity:1!important;transform:none!important}</style></noscript>'
    )
    json_ld = _json_ld(lang) if page == "index.html" else ""
    # 日英を相互に指し示す。x-default は日本語(サイトの主言語)。
    alternates = (
        '<link rel="alternate" hreflang="ja" href="' + _url("ja", page) + '" />\n'
        '<link rel="alternate" hreflang="en" href="' + _url("en", page) + '" />\n'
        '<link rel="alternate" hreflang="x-default" href="' + _url("ja", page) + '" />\n'
    )
    return (
        '<head>\n'
        '<meta charset="UTF-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        '<meta http-equiv="Content-Security-Policy" content="' + CSP + '" />\n'
        '<meta name="referrer" content="strict-origin-when-cross-origin" />\n'
        '<title>' + title + '</title>\n'
        '<meta name="description" content="' + desc + '" />\n'
        '<link rel="canonical" href="' + canonical + '" />\n'
        + alternates +
        '<meta property="og:type" content="website" />\n'
        '<meta property="og:locale" content="' + ("ja_JP" if lang == "ja" else "en_US") + '" />\n'
        '<meta property="og:site_name" content="' + L["site_name"] + '" />\n'
        '<meta property="og:title" content="' + title + '" />\n'
        '<meta property="og:description" content="' + desc + '" />\n'
        '<meta property="og:url" content="' + canonical + '" />\n'
        '<meta property="og:image" content="' + OG_IMAGE + '" />\n'
        '<meta name="twitter:card" content="summary_large_image" />\n'
        '<meta name="twitter:title" content="' + title + '" />\n'
        '<meta name="twitter:description" content="' + desc + '" />\n'
        '<meta name="twitter:image" content="' + OG_IMAGE + '" />\n'
        '<link rel="icon" href="' + p + 'images/mascot.png" type="image/png" />\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com" />\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
        '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />\n'
        '<script src="' + TAILWIND_CDN + '"></script>\n'
        '<link rel="stylesheet" href="' + p + 'css/style.css?v=' + V + '" />\n'
        + noscript + json_ld + _ga4_snippet() + '\n'
        '</head>'
    )


def lang_switch_html(lang, page):
    """ヘッダー右上の言語切替。現在の言語は文字のまま、もう一方をリンクにする。
    固有名詞なので自動翻訳の対象から外す(translate="no")。"""
    L = LANGS[lang]
    other = _other(lang)
    return (
        '        <div id="langSwitch" class="lang-switch" translate="no" '
        'aria-label="' + L["lang_switch_aria"] + '">\n'
        '          <span class="lang-current" lang="' + L["html_lang"] + '" aria-current="true">'
        + L["self_label"] + '</span>\n'
        '          <span class="lang-sep" aria-hidden="true">|</span>\n'
        '          <a href="' + _switch_href(lang, page) + '" class="lang-alt" '
        'hreflang="' + LANGS[other]["html_lang"] + '" lang="' + LANGS[other]["html_lang"] + '">'
        + L["other_label"] + '</a>\n'
        '        </div>'
    )


def header_html(lang, page):
    L = LANGS[lang]
    p = L["prefix"]
    active = page
    desktop_items = []
    mobile_items = []
    for href, label in L["nav"]:
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
    switch = lang_switch_html(lang, page)
    # モバイルメニュー内にも切替を置く(ハンバーガー表示時でも言語を変えられるように)
    other = _other(lang)
    mobile_switch = (
        f'      <a href="{_switch_href(lang, page)}" hreflang="{LANGS[other]["html_lang"]}" '
        f'lang="{LANGS[other]["html_lang"]}" translate="no" '
        'class="block px-5 py-3.5 text-sm font-bold text-white/95 rounded-xl hover:bg-white/10 transition-colors">'
        f'{L["other_label"]}</a>'
    )

    return f'''<!-- ===== グローバルヘッダー ===== -->
<header id="site-header" class="sticky top-0 z-50 bg-white border-b border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="relative flex items-center justify-between h-20">
      <!-- ロゴエリア: 通常カラーのエンブレム + 2行文字(1行目は字間を広げて2行目と同じ幅に) -->
      <a href="index.html" class="logo-badge group shrink-0" aria-label="{L["logo_aria"]}">
        <span class="logo-badge-img">
          <img src="{p}images/メインロゴ.jpg" alt="" />
        </span>
        <span class="logo-badge-text" translate="no">
          <span class="logo-badge-line1">特定非営利活動法人</span>
          <span class="logo-badge-line2">フライキプロジェクト</span>
          <span class="logo-badge-note">{L["logo_note"]}</span>
        </span>
      </a>

      <!-- ナビゲーション: 固定の画面幅ではなく、実際に収まるかをJS(header-fit.js)が
           判定して表示を切り替える。初期状態は安全側(非表示・測定専用)にしておく。
           flex-1 + justify-evenly で、ロゴ〜寄付ボタンの間全体に等間隔で配置する -->
      <nav id="desktopNav" aria-label="{L["nav_aria"]}" class="flex-1 items-center justify-evenly mx-6" style="position:absolute; left:-9999px; display:flex;">
{desktop_nav}
      </nav>

      <!-- CTA(言語切替は画面幅によらず常に表示する) -->
      <div class="flex items-center gap-4">
{switch}
        <a href="{DONATE_URL}" target="_blank" rel="noopener" id="desktopDonate" class="jiggle-group btn-primary items-center gap-2 pl-1.5 pr-6 py-1.5 text-sm font-bold rounded-full whitespace-nowrap" style="position:absolute; left:-9999px; display:inline-flex;">
          <img src="{p}images/mascot.png" alt="" class="h-12 w-auto -my-2" />
          {L["donate_cta"]}
        </a>
        <button id="menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="{L["menu_aria"]}" class="p-2 text-gray-800">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- ナビが収まらない画面幅で使うメニュー(表示判定はheader-fit.jsが行う) -->
  <div id="mobile-menu" class="hidden border-t border-gray-100 bg-white">
    <nav aria-label="{L["mobile_nav_aria"]}" class="flex flex-col p-3">
      <a href="index.html" class="{home_cls}"{home_cur}>{L["home"]}</a>
{mobile_nav}
      <div class="my-2 border-t border-white/25"></div>
{mobile_switch}
      <a href="{DONATE_URL}" target="_blank" rel="noopener" class="block px-5 py-3.5 text-sm font-black text-[#c8102e] bg-white rounded-full text-center hover:bg-gray-100 transition-colors">{L["donate_cta"]}</a>
    </nav>
  </div>
</header>'''


def footer_html(lang):
    L = LANGS[lang]
    items = []
    for href, label, external in L["footer_links"]:
        attrs = ' target="_blank" rel="noopener"' if external else ""
        items.append(
            f'        <a href="{href}"{attrs} class="text-sm font-medium text-gray-300 hover:text-white transition-colors">{label}</a>'
        )
    links = "\n".join(items)
    return f'''<!-- ===== フッター ===== -->
<footer class="bg-[#1e1e21] text-white py-12 sm:py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <nav aria-label="{L["footer_nav_aria"]}" class="flex flex-wrap gap-x-8 gap-y-3 justify-center mb-8">
{links}
    </nav>
    <div class="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
      <p>©2026 <span translate="no">{L["copyright_org"]}</span> All rights reserved.</p>
    </div>
  </div>
</footer>'''


# ---- 差し替え(共通部だけを置換。本文<main>には触れない) ----

def replace_head(html, lang, page):
    return re.sub(r"<head>.*?</head>", lambda m: head_html(lang, page), html, count=1, flags=re.S)


def replace_header(html, lang, page):
    return re.sub(
        r"<!-- ===== グローバルヘッダー ===== -->.*?</header>",
        lambda m: header_html(lang, page), html, count=1, flags=re.S,
    )


def replace_footer(html, lang):
    return re.sub(
        r"<!-- ===== フッター ===== -->.*?</footer>",
        lambda m: footer_html(lang), html, count=1, flags=re.S,
    )


def ensure_html_lang(html, lang):
    """<html> の lang と、JSがアセットの相対位置を知るための data-base を揃える。
    英語版は en/ の1階層下にあるため、JS内で組み立てるパス(images/ や news/)には
    data-base の値("../")を前置する必要がある。"""
    L = LANGS[lang]
    attrs = 'lang="' + L["html_lang"] + '"'
    if L["prefix"]:
        attrs += ' data-base="' + L["prefix"] + '"'
    return re.sub(r"<html\b[^>]*>", '<html ' + attrs + '>', html, count=1)


def ensure_skip_link(html, lang):
    """<body ...> の直後にスキップリンクを1つだけ置く(既にあれば入れ直す)。"""
    html = re.sub(r'\s*<a href="#main" class="skip-link[^>]*>.*?</a>', "", html, count=1, flags=re.S)
    link = '\n<a href="#main" class="skip-link">' + LANGS[lang]["skip_link"] + '</a>'
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
    """robots.txt と sitemap.xml を生成(内容と自動同期)。日英の全ページを載せ、
    各URLに hreflang の相互参照を付ける。"""
    robots = "User-agent: *\nAllow: /\n\nSitemap: " + SITE + "/sitemap.xml\n"
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(robots)

    entries = []
    for page in PAGE_FILES:
        for lang in ("ja", "en"):
            links = "".join(
                '    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>\n' % (l, _url(l, page))
                for l in ("ja", "en")
            )
            links += '    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>\n' % _url("ja", page)
            entries.append(
                "  <url>\n    <loc>%s</loc>\n%s  </url>\n" % (_url(lang, page), links)
            )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "".join(entries) +
        "</urlset>\n"
    )
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(sitemap)
    print("[OK] robots.txt / sitemap.xml")


def apply_all():
    for lang, L in LANGS.items():
        for page in PAGE_FILES:
            path = os.path.join(ROOT, L["out_dir"], page)
            if not os.path.isfile(path):
                print("[SKIP] not found:", os.path.join(L["out_dir"], page))
                continue
            with open(path, "r", encoding="utf-8") as f:
                html = f.read()
            html = ensure_html_lang(html, lang)
            html = replace_head(html, lang, page)
            html = replace_header(html, lang, page)
            html = replace_footer(html, lang)
            html = ensure_skip_link(html, lang)
            html = ensure_main_id(html)
            html = bump_versions(html)  # 本文の <script ...?v=> も含め全ての ?v= を V に統一
            with open(path, "w", encoding="utf-8") as f:
                f.write(html)
            print("[OK]", os.path.join(L["out_dir"], page) if L["out_dir"] else page)

    # 404.html は共通部の差し替え対象外(独立した最小ページ)だが、
    # バージョン統一だけは合わせておく。
    p404 = os.path.join(ROOT, "404.html")
    if os.path.isfile(p404):
        with open(p404, "r", encoding="utf-8") as f:
            html = f.read()
        with open(p404, "w", encoding="utf-8") as f:
            f.write(bump_versions(html))
        print("[OK] 404.html (バージョンのみ)")


if __name__ == "__main__":
    apply_all()
    write_seo_files()
    print("共通部の再生成おわり (V=%s, GA4=%s)" % (V, GA4_ID or "無効"))
