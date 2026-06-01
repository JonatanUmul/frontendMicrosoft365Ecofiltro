(function () {
  const SIGNATURE_API_BASE = window.SIGNATURE_API_BASE || "http://localhost:5174";

  const demoUsers = {
    "ana.morales@empresa.com": {
      name: "Ana Morales",
      title: "Gerente Comercial",
      department: "Ventas",
      email: "ana.morales@empresa.com",
      phone: "+502 2300 1001",
      mobile: "+502 5555 1001"
    },
    "carlos.diaz@empresa.com": {
      name: "Carlos Diaz",
      title: "Soporte Tecnico",
      department: "IT",
      email: "carlos.diaz@empresa.com",
      phone: "+502 2300 1002",
      mobile: "+502 5555 1002"
    }
  };

  const defaultUser = {
    name: "Usuario Microsoft 365",
    title: "Colaborador",
    department: "Empresa",
    email: "usuario@empresa.com",
    phone: "+502 2300 0000",
    mobile: "+502 5555 0000"
  };

  const brand = {
    companyName: "Grupo Ejemplo",
    primaryColor: "#1666c1",
    accentColor: "#0f9f8f",
    logoUrl: "https://dummyimage.com/160x160/1666c1/ffffff.png&text=Logo",
    bannerText: "Felices fiestas: gracias por confiar en nosotros",
    legalText: "Este mensaje puede contener informacion confidencial. Si lo recibio por error, por favor eliminelo y notifique al remitente."
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function buildSignature(user) {
    const safeUser = Object.assign({}, defaultUser, user || {});
    return `
<table role="presentation" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; border-collapse: collapse; max-width: 690px;">
  <tr>
    <td style="vertical-align: top; padding: 0 16px 0 0; width: 90px;">
      <img src="${escapeHtml(brand.logoUrl)}" width="72" height="72" alt="${escapeHtml(brand.companyName)}" style="display: block; border: 0; border-radius: 8px; width: 72px; height: 72px; object-fit: cover;">
    </td>
    <td style="vertical-align: top; border-left: 3px solid ${escapeHtml(brand.primaryColor)}; padding: 0 0 0 16px;">
      <div style="font-size: 18px; line-height: 1.2; color: ${escapeHtml(brand.primaryColor)}; font-weight: 700;">${escapeHtml(safeUser.name)}</div>
      <div style="font-size: 13px; color: #334155; margin-top: 3px;">${escapeHtml(safeUser.title)} | ${escapeHtml(safeUser.department)}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 10px;">
        <strong style="color: ${escapeHtml(brand.accentColor)};">E:</strong> <a href="mailto:${escapeHtml(safeUser.email)}" style="color: #334155; text-decoration: none;">${escapeHtml(safeUser.email)}</a><br>
        <strong style="color: ${escapeHtml(brand.accentColor)};">T:</strong> ${escapeHtml(safeUser.phone)} &nbsp; <strong style="color: ${escapeHtml(brand.accentColor)};">M:</strong> ${escapeHtml(safeUser.mobile)}
      </div>
      <div style="font-size: 13px; color: #1f2937; font-weight: 700; margin-top: 9px;">${escapeHtml(brand.companyName)}</div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 14px;">
      <div style="background: ${escapeHtml(brand.primaryColor)}; color: #ffffff; padding: 10px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
        ${escapeHtml(brand.bannerText)}
      </div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 10px;">
      <div style="font-size: 10px; line-height: 1.4; color: #64748b;">${escapeHtml(brand.legalText)}</div>
    </td>
  </tr>
</table>`.trim();
  }

  async function getSignatureForEmail(email) {
    const normalizedEmail = String(email || "").toLowerCase();

    try {
      const response = await fetch(`${SIGNATURE_API_BASE}/api/public/signature?email=${encodeURIComponent(normalizedEmail)}`, {
        headers: { Accept: "application/json" },
        credentials: "include"
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.html) return payload.html;
      }
    } catch (error) {
      console.warn("No se pudo consultar la API de firmas. Se usara la firma local.", error);
    }

    return buildSignature(demoUsers[normalizedEmail] || Object.assign({}, defaultUser, { email: normalizedEmail || defaultUser.email }));
  }

  window.SignatureService = {
    buildSignature,
    getSignatureForEmail
  };
})();
