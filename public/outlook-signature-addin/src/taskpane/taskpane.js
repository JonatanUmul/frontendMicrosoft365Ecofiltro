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
  const button = document.getElementById("insertSignature");
  const item = Office.context.mailbox.item;
  const profile = Office.context.mailbox.userProfile || {};
  const email = profile.emailAddress || "";

  button.disabled = true;
  status.textContent = "Insertando firma...";
  await window.SignatureService.logEvent("manual_insert_clicked", email);
  const html = await window.SignatureService.getSignatureForEmail(email);

  window.SignatureService.setManagedSignature(item, html, function (result) {
    window.SignatureService.logEvent("manual_insert_result", email, {
      method: result.method,
      status: result.status,
      error: result.error?.message || "",
      fallback_reason: result.fallback_reason || ""
    });
    status.textContent = result.status === Office.AsyncResultStatus.Succeeded
      ? "Firma actualizada correctamente."
      : "No se pudo insertar la firma. Revisa permisos o compatibilidad del cliente Outlook.";
    button.disabled = false;
  });
}
