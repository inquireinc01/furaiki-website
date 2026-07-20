# フライキプロジェクト公式ウェブサイト

特定非営利活動法人フライキプロジェクトの公式サイトです。ラグビーの精神と大漁旗「フライキ」で被災地に心の復興を届ける活動を紹介しています。

- 公開URL: https://www.furaiki.org （GitHub Pages / master ブランチ）
- リポジトリ: https://github.com/inquireinc01/furaiki-website

---

## ページ構成（全8ページ）

| ファイル | 内容 |
|---|---|
| index.html | トップページ |
| organization.html | 団体概要（基本情報・組織体制・沿革・設立趣意書） |
| message.html | 代表挨拶 |
| about.html | 活動報告（フォトギャラリー） |
| financial.html | 決算報告 |
| corporate.html | 企業・団体様へ |
| contact.html | お問合せ（mailto方式フォーム） |
| privacy.html | プライバシーポリシー |

## 技術スタック

- 素のHTML5 / CSS（`css/style.css`）/ Vanilla JavaScript（`js/`）。ビルド不要の静的サイト
- Tailwind CSS（Play CDN、バージョン固定 3.4.16）、Google Fonts（Noto Sans JP）
- 画像・ニュースの一覧はビルド時生成の静的 `list.json` を読み込み（GitHub APIには依存しない）

---

## 日常の更新（非技術者向け）

**基本は「フォルダに入れて『サイトを更新.bat』をダブルクリック」だけです。**

- **写真**: `images/hero`（メインビジュアル）、`images/about-hero`、`images/gallery` とそのカテゴリ別サブフォルダ（`saigaifukkou`／`heartrugby`／`community`／`recent`）などに入れる
- **ニュース**: `news/` に `20260801-見出し.txt` の形式で入れる（1行目=見出し、以降=本文、最終行がURLなら「詳しく見る」リンク。YouTube URLなら動画が埋め込まれる）
- 入れたら一番上の階層の **「サイトを更新.bat」** をダブルクリック → 写真の自動変換・縮小・一覧(list.json)生成 → GitHubへ反映（1〜2分で公開）

各フォルダの `README.txt` に個別の手順があります。

> ⚠️ **画像を足す/リネームしたら必ず bat を通してください。** 直接ファイルを置いただけでは目次（list.json）が更新されず、サイトに出ません。

## 共通部（ヘッダー・フッター・head）の編集

**8ページのヘッダー／フッター／`<head>`（メタ・OGP・バージョン等）は各HTMLを直接編集しないでください。**
唯一の正は **`tools/build_common.py`** です。ここを直してから次を実行すると、全ページへ一括反映されます（robots.txt / sitemap.xml も再生成）。

```bash
python tools/build_common.py
```

- ナビ項目・フッターリンク・メタ情報・キャッシュバスト用バージョン `V`・Tailwindのバージョン・GA4測定ID なども `build_common.py` の先頭で一元管理しています。
- CSS/JSを修正したら `V` を新しい値に上げて上記を実行（全ページの `?v=` が揃い、古いファイルが配信されるのを防ぎます）。

## 初回セットアップ / 別PCでの再現

```bash
git clone https://github.com/inquireinc01/furaiki-website.git
cd furaiki-website
# 写真処理に必要なPythonライブラリ（Python 3.12以降）
python -m pip install -r tools/requirements.txt
```

ローカル確認: `python -m http.server 8000` を実行し `http://localhost:8000` を開く。

---

## やってはいけないこと / 注意

- ❌ 8ページのヘッダー・フッター・`<head>` を手編集（→ `tools/build_common.py` で再生成）
- ❌ `documents/` に個人情報を含むファイル（名簿・住所入りWord等）を置いてコミット（`.gitignore` で `*.docx`/`*.txt`/`*名簿*` 等を除外済みだが、公開してよいPDFだけを個別にコミットすること）
- ⚠️ このリポジトリは OneDrive 同期フォルダ内にあります。同期の競合・自動リネームで `.git` が壊れる恐れがあるため、更新前に OneDrive の同期完了を確認してください（恒久的には OneDrive 外への移動を推奨）。

## 運用・復旧（BCP）メモ

サイトの継続運用に必須の情報（ドメイン／DNS／GitHub／メールの管理者・復旧手段）は、公開リポジトリには置かず、**団体のパスワードマネージャ等で複数の役員が参照できる形**に保管してください。単一担当者・単一PCへの集中は最大のリスクです。詳しい運用手順・残タスクはローカルの `NOTES.md`（gitには含めていません）を参照。

© 2026 特定非営利活動法人フライキプロジェクト All rights reserved.
