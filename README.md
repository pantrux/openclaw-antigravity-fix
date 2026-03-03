# Fix Google Antigravity (OpenClaw)

## Objetivo
1. Restaurar la autenticación OAuth para el provider `google-antigravity` (eliminada en distribuciones recientes de OpenClaw).
2. Corregir en el runtime la integración de este provider para que funcionen los modelos 3.1:
   - `google-antigravity/gemini-3.1-pro-high`
   - `google-antigravity/gemini-3.1-pro-low`
   - aliases legacy (`gemini-3-pro-high/low`, `gemini-3-1-pro-high/low`)
   - y mantener `gemini-3-flash` operativo.

## Síntomas observados
1. El comando `openclaw models auth login --provider google-antigravity` falla con `Unknown provider "google-antigravity"`.
2. Una vez resuelta la autenticación, los modelos Pro fallan con mensajes tipo:
   - `Gemini 3.1 Pro is not available on this version. Please upgrade to the latest version.`
   - o `Unknown model: google-antigravity/gemini-3-1-pro-high`
3. `gemini-3-flash` sí responde sin problemas.

## Causa raíz confirmada
- **Autenticación (Provider):** El plugin oficial `google-antigravity-auth` fue removido del código fuente stock desde la v2026.2.22. El provider ya no se registra nativamente.
- **Inferencia (Gating):** El backend de Antigravity hace gating por la versión de cliente enviada en el header (`User-Agent antigravity/<version>`). Con la versión vieja default (`1.15.8`), los modelos Pro 3.1 responden "upgrade required". Además, OpenClaw carece de normalización para los IDs 3.1 en sus validadores.

## Cambios necesarios a implementar por el Agente

### 1) Restaurar el Provider OAuth (Plugin Custom)
Crear e instalar un plugin local (ej. en `~/.openclaw/extensions/google-antigravity-auth-custom/`) que registre el provider `google-antigravity`.
- Debe implementar el flujo OAuth PKCE completo hacia los endpoints de Google.
- Debe incluir soporte para localhost callback y fallback manual por consola.
- Debe exponer un método `refreshOAuth` que actualice los tokens contra `https://oauth2.googleapis.com/token`.
- Activar el plugin en la configuración `openclaw.json` y la lista de permitidos.

### 2) Provider runtime (pi-ai)
Archivo a modificar:
- `.../node_modules/@mariozechner/pi-ai/dist/providers/google-gemini-cli.js`

Aplicar:
1. Cambiar la versión por defecto para el User-Agent:
   - `DEFAULT_ANTIGRAVITY_VERSION = "1.15.8"` ➜ `"1.19.6"`
2. Interceptar y normalizar los alias Antigravity en la generación de requests:
   - `gemini-3-pro-low`, `gemini-3-1-pro-low` ➜ `gemini-3.1-pro-low`
   - `gemini-3-pro-high`, `gemini-3-1-pro-high` ➜ `gemini-3.1-pro-high`
   - `gemini-3.1-pro` ➜ `gemini-3.1-pro-low`

### 3) Resolver forward-compat (OpenClaw dist)
Patchear la función `resolveGoogleGeminiCli31ForwardCompatModel(...)` en el core de OpenClaw para que:
- Reconozca el provider `google-antigravity` además de `google-gemini-cli`.
- Redirija correctamente `gemini-3-pro-*` y `gemini-3-1-pro-*` hacia los templates de compatibilidad correspondientes para la rama 3.1.
*(Archivos típicos: `dist/model-bz*.js`, `dist/model-Zur*.js`, `dist/pi-embedded-*.js`, `dist/plugin-sdk/reply-*.js`)*

### 4) Normalización global de IDs Antigravity
Patchear `normalizeAntigravityModelId(...)` y los mapas de alias en los compilados de OpenClaw (`dist/model-selection-*.js`, `dist/auth-profiles-*.js`, `dist/plugin-sdk/config-*.js`).
Regla requerida: Mapear invariablemente `gemini-3-pro-low/high` y `gemini-3-1-pro-low/high` hacia la estructura canónica `gemini-3.1-pro-low/high`.

### 5) Configuración del Workspace (`openclaw.json`)
- En `agents.defaults.models`, asegurar que las claves para los modelos 3.1 Pro (y Flash) estén registradas sin alias problemáticos.
- Desactivar el fallback automático de modelos (`agents.defaults.model.fallbacks = []`) para evitar enmascarar errores de API con saltos al fallback.

## Pruebas de validación (Obligatorias para el Agente)
1. `openclaw models auth login --provider google-antigravity` levanta exitosamente el flujo de login.
2. `google-antigravity/gemini-3.1-pro-high` devuelve texto válido.
3. `google-antigravity/gemini-3.1-pro-low` devuelve texto válido.
4. Alias legacy (`google-antigravity/gemini-3-pro-high`) mapean y responden bien.
5. `google-antigravity/gemini-3-flash` sigue funcionando.
6. Monitoreo de logs libre de: `Unknown model...` y `Gemini 3.1 Pro is not available on this version`.

## Rollback / Plan de Retorno
1. Eliminar el plugin custom de extensiones.
2. Restaurar backups de archivos `dist/` modificados.
3. Restaurar `openclaw.json` y `auth-profiles.json` desde backup.
4. Reiniciar gateway.

## Entregables esperados del agente
- Lista exacta de archivos modificados.
- Código fuente del plugin de Auth restaurado.
- Output de pruebas (high/low/aliases/flash).
- Instrucciones directas en caso de requerir un rollback manual.
