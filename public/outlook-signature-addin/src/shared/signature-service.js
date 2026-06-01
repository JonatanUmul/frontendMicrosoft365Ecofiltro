(function () {
  const SIGNATURE_API_BASE = window.SIGNATURE_API_BASE || "https://backendfirmas365.ecofiltro.net";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function getSignatureForEmail(email) {
    const normalizedEmail = String(email || "").toLowerCase();

    try {
      const response = await fetch(`${SIGNATURE_API_BASE}/api/public/signature?email=${encodeURIComponent(normalizedEmail)}&t=${Date.now()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.html) return payload.html;
      }

      await logEvent("signature_fetch_empty", normalizedEmail, { status: response.status });
    } catch (error) {
      console.warn("No se pudo consultar la API de firmas.", error);
      await logEvent("signature_fetch_error", normalizedEmail, { message: error.message });
    }

    return "";
  }

  function stripManagedSignature(html) {
    return String(html || "")
      .replace(/<!-- firmas365:start -->[\s\S]*?<!-- firmas365:end -->/g, "")
      .replace(/<span[^>]*data-firmas365-marker=["']start["'][^>]*>[\s\S]*?<\/span>[\s\S]*?<span[^>]*data-firmas365-marker=["']end["'][^>]*>[\s\S]*?<\/span>/g, "")
      .trim();
  }

  function setManagedSignature(item, html, callback) {
    const options = { coercionType: Office.CoercionType.Html };
    if (!html) {
      callback({ status: Office.AsyncResultStatus.Failed, error: { message: "La API no devolvio una firma." }, method: "none" });
      return;
    }

    if (item.body && typeof item.body.setSignatureAsync === "function") {
      item.body.setSignatureAsync(html, options, function (result) {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          callback({ status: result.status, error: result.error, method: "setSignatureAsync" });
          return;
        }
        replaceBodySignature(item, html, callback, result.error?.message || "setSignatureAsync fallo");
      });
      return;
    }

    replaceBodySignature(item, html, callback, "setSignatureAsync no disponible");
  }

  function replaceBodySignature(item, html, callback, reason) {
    const options = { coercionType: Office.CoercionType.Html };
    item.body.getAsync(options, function (getResult) {
      if (getResult.status !== Office.AsyncResultStatus.Succeeded) {
        callback({ status: getResult.status, error: getResult.error, method: "getAsync", fallback_reason: reason });
        return;
      }
      const current = stripManagedSignature(getResult.value);
      const next = `${current}${current ? "<br>" : ""}${html}`;
      item.body.setAsync(next, options, function (setResult) {
        callback({ status: setResult.status, error: setResult.error, method: "setAsyncReplace", fallback_reason: reason });
      });
    });
  }

  async function logEvent(eventType, email, detail) {
    try {
      await fetch(`${SIGNATURE_API_BASE}/api/addin/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          email: email || "",
          detail: detail || {}
        })
      });
    } catch (error) {
      console.warn("No se pudo registrar evento del add-in.", error);
    }
  }

  window.SignatureService = {
    getSignatureForEmail,
    setManagedSignature,
    logEvent
  };
})();
