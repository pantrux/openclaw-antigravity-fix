# Documentación de los Parches para OpenClaw (Antigravity 3.1 Pro Fix)

Este directorio contiene los archivos `.patch` necesarios para modificar directamente el código compilado (`dist/`) de OpenClaw y la librería `@mariozechner/pi-ai`, restaurando así la compatibilidad completa con los modelos de la familia Gemini 3.1 Pro del backend de Google Antigravity.

## Contexto Técnico
El problema principal que resuelven estos parches es un desfase de catálogo y de versionado:
1. **User-Agent Gating:** Google Antigravity exige ahora versiones de cliente (IDE) `>= 1.19.6`. Si la petición va con versiones menores (como la `1.15.8` hardcodeada previamente), el servidor rechaza los modelos de la familia 3.1 Pro retornando `"Gemini 3.1 Pro is not available on this version"`.
2. **Nombres de Modelos:** El backend requiere internamente los identificadores antiguos (o alias como los `Mxx` placeholders/dash-separated), pero el catálogo base de OpenClaw no realiza la normalización correcta, devolviendo `Unknown model`.
3. **Serialización de Credenciales:** El provider `google-antigravity` requiere que las credenciales no sean un token plano, sino un objeto serializado con el formato `{"token": "...", "projectId": "..."}`.

---

## Archivos Parcheados y su Función

### 1. Parches en el Provider (Capa de API)
**`google-gemini-cli.js.patch`**  
*(Aplica sobre: `node_modules/@mariozechner/pi-ai/dist/providers/google-gemini-cli.js`)*
- **Actualización de Versión:** Modifica `DEFAULT_ANTIGRAVITY_VERSION` de `"1.15.8"` a `"1.19.6"` para superar el bloqueo por User-Agent.
- **Normalización de Alias:** Actualiza el objeto `ANTIGRAVITY_PRO_MODEL_ALIASES` para que reciba cualquier intento de solicitar `gemini-3-pro-*` o `gemini-3-1-pro-*` y lo mapee correctamente a las firmas compatibles del IDE (`gemini-3.1-pro-high`/`low`).

### 2. Parches de Compatibilidad Hacia Adelante (Forward-Compat)
*(Aplican sobre el core y el runner en `dist/` de OpenClaw)*
- **`model-bzHG4u0Y.js.patch`**, **`model-ZurrFOi9.js.patch`**
- **`pi-embedded-CtM2Mrrj.js.patch`**, **`pi-embedded-DgYXShcG.js.patch`**
- **`reply-DFFRlayb.js.patch`**

**Qué hacen:**
Modifican la función `resolveGoogleGeminiCli31ForwardCompatModel`. Originalmente, esta función sólo interceptaba solicitudes para el provider genérico `google-gemini-cli`. El parche incluye la lógica para:
- Detectar también al provider `google-antigravity`.
- Asociar los templates de sistema específicos para los modelos de Antigravity (declarados ahora mediante las constantes inyectadas `GEMINI_3_1_ANTIGRAVITY_PRO_TEMPLATE_IDS`).

### 3. Parches de Normalización Global y Serialización de Auth
*(Aplican sobre gestores de sesiones y perfiles de OpenClaw en `dist/`)*
- **`model-selection-ikt2OC4j.js.patch`**, **`model-selection-Zb7eBzSY.js.patch`**
- **`model-selection-CjMYMtR0.js.patch`**
- **`auth-profiles-CNyDTsy4.js.patch`**
- **`config-GHoFNNPc.js.patch`**

**Qué hacen:**
- **Serialización (`buildOAuthApiKey`):** Intervienen el generador de credenciales de OpenClaw. Antes, el bloque `return provider === "google-gemini-cli" ? JSON.stringify(...)` dejaba afuera a Antigravity. El parche lo transforma a `provider === "google-gemini-cli" || provider === "google-antigravity"`, empaquetando el Token y el ProjectID para que Code Assist lo acepte correctamente.
- **Model ID Normalizer:** Introducen la función `normalizeAntigravityModelId()` que implementa la lógica rígida para que cualquier sub-agente o hilo que intente llamar al modelo con guiones antiguos caiga sin error en los strings del catálogo 3.1 soportado.

---

## Cómo aplicarlos (Referencia)
Este proceso está diseñado para ser automatizado mediante el script `apply_patch.py` adjunto, pero a nivel de shell puro, se ejecutan en el directorio raíz de la instalación global (`~/.npm-global/lib/node_modules/openclaw`):

```bash
patch -p0 < patches/google-gemini-cli.js.patch
# Repetir para el resto de archivos .patch sobre la ruta absoluta que muestra el diff.
```
