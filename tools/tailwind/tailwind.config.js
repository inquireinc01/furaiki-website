// サイトで使うクラスを走査して css/tailwind.css を生成する。
// クラス名はHTMLだけでなく、JSのclassName文字列と共通部テンプレートにもある。
module.exports = {
  content: [
    "../../*.html",
    "../../en/*.html",
    "../../js/*.js",
    "../build_common.py",
  ],
};
