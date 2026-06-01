Office.onReady(function () {
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

  item.body.setSignatureAsync(html, { coercionType: Office.CoercionType.Html }, function (result) {
    status.textContent = result.status === Office.AsyncResultStatus.Succeeded
      ? "Firma insertada correctamente."
      : "No se pudo insertar la firma. Revisa permisos o compatibilidad del cliente Outlook.";
  });
}
