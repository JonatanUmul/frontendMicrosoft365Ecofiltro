# Complemento de Outlook para firmas automaticas

Este paquete es la base para que Microsoft Outlook inserte la firma automaticamente cuando un usuario redacta un nuevo correo.

## Que incluye

- `manifest.xml`: manifiesto del complemento para instalarlo en Microsoft 365.
- `src/autorun/autorun.html`: runtime liviano que Outlook carga automaticamente.
- `src/autorun/autorun.js`: funcion que se ejecuta en `OnNewMessageCompose` e inserta la firma.
- `src/taskpane/taskpane.html`: panel manual para probar o reinsertar la firma.
- `src/taskpane/taskpane.js`: logica del panel manual.
- `src/shared/signature-service.js`: generador y proveedor de firmas.

## Como funciona

1. El usuario abre Outlook.
2. Hace clic en Nuevo correo, Responder o Reenviar.
3. Outlook dispara el evento `OnNewMessageCompose`.
4. El complemento busca la firma del usuario por correo electronico.
5. Inserta la firma con `Office.context.mailbox.item.body.setSignatureAsync`.

## Pasos para produccion

1. Subir esta carpeta a un hosting HTTPS, por ejemplo:
   `https://firmas.tuempresa.com`
2. Cambiar en `manifest.xml` todas las URLs `https://firmas.tuempresa.com` si usas otro dominio.
3. Conectar `src/shared/signature-service.js` con tu API real:
   - Entrada: correo del usuario.
   - Salida: HTML de firma.
4. En Microsoft 365 Admin Center, desplegar el complemento desde:
   `Settings > Integrated apps > Upload custom apps`.
5. Asignarlo a todos los usuarios o a grupos especificos.
6. Probar con 3 a 5 usuarios antes de activarlo para las 110 licencias.

## API sugerida

Endpoint:

```http
GET /api/signature?email=usuario@empresa.com
```

Respuesta:

```json
{
  "html": "<table>...</table>"
}
```

Si la API no responde, el complemento usa una firma base para que el correo no salga sin firma.

## Importante

Los complementos de Office deben servirse por HTTPS en produccion. Para pruebas locales se puede usar un tunel HTTPS o un certificado local confiable.
