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

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var key = (form.querySelector("[name='access_key']") || {}).value;
    if (!key || key === "YOUR_ACCESS_KEY") {
      setStatus("err", "The form isn't configured yet — please use the email button instead.");
      return;
    }

    // native validation with visible messages
    if (!form.checkValidity()) {
      form.reportValidity();
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
          setStatus("err", "Something went wrong sending the message. Please email me directly.");
        }
      })
      .catch(function () {
        setStatus("err", "Network error — please try again or email me directly.");
      })
      .finally(function () {
        submit.disabled = false;
        submit.textContent = originalLabel;
      });
  });
})();
