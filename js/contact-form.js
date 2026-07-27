// お問合せフォーム: 入力内容をメールソフトに引き渡す(mailto方式)
// - メールアドレスの形式チェック(不正なら入力欄が赤くなる)
// - ロボット対策: かんたんな計算クイズ + ハニーポット(不可視欄)
// Googleフォーム等に切り替える際はこのファイルを差し替える。
const contactForm = document.getElementById("contact-form");

if (contactForm) {
  // 英語版(en/contact.html)からの送信は、件名・本文の項目名も英語にする
  const EN = document.documentElement.lang === "en";

  const SUBJECT_LABELS = EN
    ? {
        donation: "Donations",
        volunteer: "Volunteering",
        inquiry: "General Inquiry",
        partnership: "Partnerships",
        media: "Media Inquiry",
        other: "Other",
      }
    : {
        donation: "ご寄付について",
        volunteer: "ボランティアについて",
        inquiry: "一般的なお問合せ",
        partnership: "パートナーシップについて",
        media: "メディア取材について",
        other: "その他",
      };

  const T = EN
    ? {
        quiz: "Please solve this simple math problem: ",
        badEmail: "Invalid email format (e.g., example@example.com)",
        badQuiz: "The answer to the CAPTCHA calculation is incorrect. Please double-check.",
        opening: "Your email app will open. If it does not open, please send an email directly to info@furaiki.org.",
        defaultSubject: "Inquiry",
        subjectPrefix: "[Website Inquiry] ",
        name: "[Name]",
        email: "[Email Address]",
        phone: "[Phone Number]",
        topic: "[Inquiry Type]",
        message: "[Message]",
        blank: "(Not provided)",
      }
    : {
        quiz: "かんたんな計算にお答えください: ",
        badEmail: "メールアドレスの形式が正しくありません(例: example@example.com)",
        badQuiz: "ロボット確認の計算の答えが違います。もう一度お確かめください",
        opening: "メールアプリが開きます。開かない場合は info@furaiki.org 宛に直接お送りください。",
        defaultSubject: "お問合せ",
        subjectPrefix: "【HPお問合せ】",
        name: "【お名前】",
        email: "【メールアドレス】",
        phone: "【電話番号】",
        topic: "【お問合せ内容】",
        message: "【メッセージ】",
        blank: "(未記入)",
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
    quizQuestion.textContent = T.quiz + quizA + " + " + quizB + " = ?";
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
      if (note) note.textContent = T.badEmail;
      return;
    }

    // ロボット確認クイズ
    if (quizInput) {
      const answer = parseInt(quizInput.value.trim(), 10);
      if (answer !== quizA + quizB) {
        markError(quizInput, true);
        quizInput.focus();
        if (note) note.textContent = T.badQuiz;
        return;
      }
      markError(quizInput, false);
    }

    const name = fields["name"].value.trim();
    const email = emailInput.value.trim();
    const phone = fields["phone"].value.trim();
    const subjectKey = fields["subject"].value;
    const message = fields["message"].value.trim();
    const subjectLabel = SUBJECT_LABELS[subjectKey] || T.defaultSubject;

    const body = [
      T.name,
      name,
      "",
      T.email,
      email,
      "",
      T.phone,
      phone || T.blank,
      "",
      T.topic,
      subjectLabel,
      "",
      T.message,
      message,
    ].join("\n");

    const mailto =
      "mailto:info@furaiki.org" +
      "?subject=" + encodeURIComponent(T.subjectPrefix + subjectLabel + " - " + name) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailto;

    if (note) {
      note.textContent = T.opening;
    }
  });
}
