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
  const options = { coercionType: Office.CoercionType.Html };
  const email = Office.context.mailbox.userProfile?.emailAddress || "";

  if (item.body && typeof item.body.setSignatureAsync === "function") {
    item.body.setSignatureAsync(html, options, function (result) {
      window.SignatureService.logEvent("signature_inserted", email, {
        method: "setSignatureAsync",
        status: result.status
      });
      completeEvent(event);
    });
    return;
  }

  item.body.setSelectedDataAsync(html, options, function (result) {
    window.SignatureService.logEvent("signature_inserted", email, {
      method: "setSelectedDataAsync",
      status: result.status
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
