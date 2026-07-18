// お問合せフォーム: 入力内容をメールソフトに引き渡す(mailto方式)
// - メールアドレスの形式チェック(不正なら入力欄が赤くなる)
// - ロボット対策: かんたんな計算クイズ + ハニーポット(不可視欄)
// Googleフォーム等に切り替える際はこのファイルを差し替える。
const contactForm = document.getElementById("contact-form");

if (contactForm) {
  const SUBJECT_LABELS = {
    donation: "ご寄付について",
    volunteer: "ボランティアについて",
    inquiry: "一般的なお問合せ",
    partnership: "パートナーシップについて",
    media: "メディア取材について",
    other: "その他",
  };

  const fields = contactForm.elements;
  const emailInput = fields["email"];
  const quizInput = fields["quiz"];
  const note = document.getElementById("contact-form-note");

  // ロボット確認クイズ(1〜9のたし算をランダム生成)
  const quizA = 1 + Math.floor(Math.random() * 9);
  const quizB = 1 + Math.floor(Math.random() * 9);
  const quizQuestion = document.getElementById("quiz-question");
  if (quizQuestion) {
    quizQuestion.textContent = "かんたんな計算にお答えください: " + quizA + " + " + quizB + " = ?";
  }

  function isValidEmail(value) {
    // 「〜@〜.〜」の形になっているかの簡易チェック
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function markError(el, hasError) {
    el.classList.toggle("input-error", hasError);
    el.setAttribute("aria-invalid", hasError ? "true" : "false");
  }

  // メールアドレスは入力のたびにチェックし、形式が不正なら赤くする
  if (emailInput) {
    const check = () => {
      const v = emailInput.value.trim();
      markError(emailInput, v !== "" && !isValidEmail(v));
    };
    emailInput.addEventListener("input", check);
    emailInput.addEventListener("blur", check);
  }

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // ハニーポットが埋まっていたらロボットと判定して何もしない
    if (fields["company"] && fields["company"].value !== "") {
      return;
    }

    // メールアドレス形式チェック
    if (!isValidEmail(emailInput.value)) {
      markError(emailInput, true);
      emailInput.focus();
      if (note) note.textContent = "メールアドレスの形式が正しくありません(例: example@example.com)";
      return;
    }

    // ロボット確認クイズ
    if (quizInput) {
      const answer = parseInt(quizInput.value.trim(), 10);
      if (answer !== quizA + quizB) {
        markError(quizInput, true);
        quizInput.focus();
        if (note) note.textContent = "ロボット確認の計算の答えが違います。もう一度お確かめください";
        return;
      }
      markError(quizInput, false);
    }

    const name = fields["name"].value.trim();
    const email = emailInput.value.trim();
    const phone = fields["phone"].value.trim();
    const subjectKey = fields["subject"].value;
    const message = fields["message"].value.trim();
    const subjectLabel = SUBJECT_LABELS[subjectKey] || "お問合せ";

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
      "【お問合せ内容】",
      subjectLabel,
      "",
      "【メッセージ】",
      message,
    ].join("\n");

    const mailto =
      "mailto:furaikipj@gmail.com" +
      "?subject=" + encodeURIComponent("【HPお問合せ】" + subjectLabel + " - " + name) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailto;

    if (note) {
      note.textContent = "メールアプリが開きます。開かない場合は furaikipj@gmail.com 宛に直接お送りください。";
    }
  });
}
