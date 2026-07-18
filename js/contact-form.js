// お問い合わせフォーム: 入力内容をメールソフトに引き渡す(mailto方式)
// サーバー送信機能は未導入のため、既定のメールアプリで furaikipj@gmail.com 宛の
// メールを新規作成する。Googleフォーム等に切り替える際はこのファイルを差し替える。
const contactForm = document.getElementById("contact-form");

if (contactForm) {
  const SUBJECT_LABELS = {
    donation: "ご寄付について",
    volunteer: "ボランティアについて",
    inquiry: "一般的なお問い合わせ",
    partnership: "パートナーシップについて",
    media: "メディア取材について",
    other: "その他",
  };

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const fields = contactForm.elements;
    const name = fields["name"].value.trim();
    const email = fields["email"].value.trim();
    const phone = fields["phone"].value.trim();
    const subjectKey = fields["subject"].value;
    const message = fields["message"].value.trim();
    const subjectLabel = SUBJECT_LABELS[subjectKey] || "お問い合わせ";

    const body = [
      "【お名前】",
      name,
      "",
      "【メールアドレス】",
      email,
      "",
      "【電話番号】",
      phone || "(未記入)",
      "",
      "【お問い合わせ内容】",
      subjectLabel,
      "",
      "【メッセージ】",
      message,
    ].join("\n");

    const mailto =
      "mailto:furaikipj@gmail.com" +
      "?subject=" + encodeURIComponent("【HPお問い合わせ】" + subjectLabel + " - " + name) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailto;

    const note = document.getElementById("contact-form-note");
    if (note) {
      note.textContent = "メールアプリが開きます。開かない場合は furaikipj@gmail.com 宛に直接お送りください。";
    }
  });
}
