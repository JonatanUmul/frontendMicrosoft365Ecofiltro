Office.onReady(function () {
  const email = Office.context.mailbox.userProfile?.emailAddress || "";
  window.SignatureService.logEvent("taskpane_loaded", email, {
    href: window.location.href
  });
  document.getElementById("status").textContent = "Complemento listo.";
  document.getElementById("insertSignature").addEventListener("click", insertSignature);
});

async function insertSignature() {
  const status = document.getElementById("status");
  const item = Office.context.mailbox.item;
  const profile = Office.context.mailbox.userProfile || {};
  const email = profile.emailAddress || "";
  const html = await window.SignatureService.getSignatureForEmail(email);

  status.textContent = "Insertando firma...";
  await window.SignatureService.logEvent("manual_insert_clicked", email);

  item.body.setSignatureAsync(html, { coercionType: Office.CoercionType.Html }, function (result) {
    window.SignatureService.logEvent("manual_insert_result", email, {
      status: result.status,
      error: result.error?.message || ""
    });
    status.textContent = result.status === Office.AsyncResultStatus.Succeeded
      ? "Firma insertada correctamente."
      : "No se pudo insertar la firma. Revisa permisos o compatibilidad del cliente Outlook.";
  });
}
