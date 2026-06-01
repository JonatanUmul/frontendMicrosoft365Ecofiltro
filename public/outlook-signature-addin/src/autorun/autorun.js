Office.onReady();

window.SignatureService.logEvent("autorun_loaded", "", {
  href: window.location.href
});

function completeEvent(event) {
  if (event && typeof event.completed === "function") {
    event.completed();
  }
}

function setSignature(html, event) {
  const item = Office.context.mailbox.item;
  const email = Office.context.mailbox.userProfile?.emailAddress || "";

  window.SignatureService.setManagedSignature(item, html, function (result) {
    window.SignatureService.logEvent("signature_inserted", email, {
      method: result.method,
      status: result.status,
      error: result.error?.message || "",
      fallback_reason: result.fallback_reason || ""
    });
    completeEvent(event);
  });
}

async function onNewMessageComposeHandler(event) {
  try {
    const profile = Office.context.mailbox.userProfile || {};
    const email = profile.emailAddress || "";
    await window.SignatureService.logEvent("new_message_compose", email, {
      itemType: Office.context.mailbox.item?.itemType || "unknown"
    });
    const html = await window.SignatureService.getSignatureForEmail(email);
    setSignature(html, event);
  } catch (error) {
    console.error("No se pudo insertar la firma automatica.", error);
    window.SignatureService.logEvent("signature_error", "", {
      message: error.message
    });
    completeEvent(event);
  }
}

if (typeof Office.actions !== "undefined" && Office.actions.associate) {
  Office.actions.associate("onNewMessageComposeHandler", onNewMessageComposeHandler);
}
