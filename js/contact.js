// Contact section: Web3Forms submission via fetch (no page navigation) and
// copy-email-to-clipboard with inline confirmation.
(function () {
  "use strict";

  var EMAIL = "jiangyuqing0508@outlook.com";

  // ---- Copy email --------------------------------------------------------
  var copyBtn = document.getElementById("copy-email");
  var copyValue = document.getElementById("copy-email-value");
  if (copyBtn && copyValue) {
    var restoreTimer = null;
    copyBtn.addEventListener("click", function () {
      function confirmCopied(ok) {
        copyValue.textContent = ok ? "Copied!" : "Copy failed — select it manually";
        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(function () {
          copyValue.textContent = EMAIL;
        }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EMAIL).then(
          function () { confirmCopied(true); },
          function () { confirmCopied(false); }
        );
      } else {
        confirmCopied(false);
      }
    });
  }

  // ---- Form submission ---------------------------------------------------
  var form = document.getElementById("contact-form");
  var submit = document.getElementById("cf-submit");
  var status = document.getElementById("cf-status");
  if (!form || !submit || !status) return;

  function setStatus(kind, text) {
    status.textContent = text;
    status.classList.remove("ok", "err");
    if (kind) status.classList.add(kind);
  }

  // Hand the message off to the visitor's mail client. Used whenever the form
  // backend is unavailable, so a submission is never silently lost.
  function handOffToMailClient(reason) {
    var name = (form.querySelector("[name='name']") || {}).value || "";
    var from = (form.querySelector("[name='email']") || {}).value || "";
    var message = (form.querySelector("[name='message']") || {}).value || "";
    var body =
      message + "\n\n—\n" + (name ? name : "") + (from ? " <" + from + ">" : "");

    window.location.href =
      "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent("Message from jackyjiang08.github.io") +
      "&body=" + encodeURIComponent(body);

    setStatus(null, reason);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // native validation with visible messages
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Web3Forms access keys are UUIDs; anything else means the backend has not
    // been configured, so fall back to email rather than failing the visitor.
    var key = (form.querySelector("[name='access_key']") || {}).value || "";
    if (!/^[0-9a-f-]{36}$/i.test(key)) {
      handOffToMailClient("Opening your email client…");
      return;
    }

    submit.disabled = true;
    var originalLabel = submit.textContent;
    submit.textContent = "Sending…";
    setStatus(null, "");

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.success) {
          form.reset();
          setStatus("ok", "Message sent — thank you! I'll get back to you soon.");
        } else {
          handOffToMailClient("Couldn't send from here — opening your email client…");
        }
      })
      .catch(function () {
        handOffToMailClient("Network error — opening your email client…");
      })
      .finally(function () {
        submit.disabled = false;
        submit.textContent = originalLabel;
      });
  });
})();
