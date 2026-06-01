Office.onReady();

function completeEvent(event) {
  if (event && typeof event.completed === "function") {
    event.completed();
  }
}

function setSignature(html, event) {
  const item = Office.context.mailbox.item;
  const options = { coercionType: Office.CoercionType.Html };

  if (item.body && typeof item.body.setSignatureAsync === "function") {
    item.body.setSignatureAsync(html, options, function () {
      completeEvent(event);
    });
    return;
  }

  item.body.setSelectedDataAsync(html, options, function () {
    completeEvent(event);
  });
}

async function onNewMessageComposeHandler(event) {
  try {
    const profile = Office.context.mailbox.userProfile || {};
    const email = profile.emailAddress || "";
    const html = await window.SignatureService.getSignatureForEmail(email);
    setSignature(html, event);
  } catch (error) {
    console.error("No se pudo insertar la firma automatica.", error);
    completeEvent(event);
  }
}

if (typeof Office.actions !== "undefined" && Office.actions.associate) {
  Office.actions.associate("onNewMessageComposeHandler", onNewMessageComposeHandler);
}
