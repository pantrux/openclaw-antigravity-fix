# google-antigravity-auth-custom

Plugin local para restaurar/login OAuth de `google-antigravity` en OpenClaw.

## Uso

```bash
openclaw models auth login --provider google-antigravity --set-default
```

## Variables opcionales

- `OPENCLAW_ANTIGRAVITY_OAUTH_CLIENT_ID`
- `OPENCLAW_ANTIGRAVITY_OAUTH_CLIENT_SECRET`
- `ANTIGRAVITY_OAUTH_CLIENT_ID`
- `ANTIGRAVITY_OAUTH_CLIENT_SECRET`

Si no están presentes, usa valores fallback del cliente público Antigravity conocido.
