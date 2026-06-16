(function () {
  const SIGNATURE_API_BASE = window.SIGNATURE_API_BASE || "https://backendfirmas365.ecofiltro.net";
  const CACHE_TTL_MS = 2 * 60 * 1000;
  const STALE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  async function getSignatureForEmail(email, options) {
    const normalizedEmail = String(email || "").toLowerCase();
    const cached = getCachedSignature(normalizedEmail);
    const freshEnough = cached && Date.now() - cached.savedAt < CACHE_TTL_MS;
    if (freshEnough && options?.preferCache !== false) return cached.html;

    const timeoutMs = Number(options?.timeoutMs || 4500);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const html = await fetchSignature(normalizedEmail, timeoutMs);
        if (html) {
          setCachedSignature(normalizedEmail, html);
          return html;
        }
      } catch (error) {
        console.warn("No se pudo consultar la API de firmas.", error);
        await logEvent("signature_fetch_error", normalizedEmail, { attempt, message: error.message });
      }
    }

    if (cached && Date.now() - cached.savedAt < STALE_CACHE_TTL_MS) {
      await logEvent("signature_cache_used", normalizedEmail, { age_ms: Date.now() - cached.savedAt });
      return cached.html;
    }

    return "";
  }

  async function fetchSignature(email, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${SIGNATURE_API_BASE}/api/public/signature?email=${encodeURIComponent(email)}&t=${Date.now()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        await logEvent("signature_fetch_empty", email, { status: response.status });
        return "";
      }
      const payload = await response.json();
      return payload?.html || "";
    } finally {
      clearTimeout(timer);
    }
  }

  function cacheKey(email) {
    return `firmas365:signature:${email || "unknown"}`;
  }

  function getCachedSignature(email) {
    try {
      const raw = localStorage.getItem(cacheKey(email));
      if (!raw) return null;
      const cached = JSON.parse(raw);
      return cached?.html ? cached : null;
    } catch {
      return null;
    }
  }

  function setCachedSignature(email, html) {
    try {
      localStorage.setItem(cacheKey(email), JSON.stringify({ html, savedAt: Date.now() }));
    } catch {
      // Office clients can disable localStorage in some restricted contexts.
    }
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
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({
          payload: JSON.stringify({
            event_type: eventType,
            email: email || "",
            detail: detail || {}
          })
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
