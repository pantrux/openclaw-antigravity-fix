import {
  buildOauthProviderAuthResult,
  emptyPluginConfigSchema,
  type OpenClawPluginApi,
  type ProviderAuthContext,
} from "openclaw/plugin-sdk";
import { loginAntigravityOAuth, refreshAntigravityOAuth } from "./oauth.js";

const PROVIDER_ID = "google-antigravity";
const PROVIDER_LABEL = "Google Antigravity";
const DEFAULT_MODEL = "google-antigravity/gemini-3-pro-low";

const plugin = {
  id: "google-antigravity-auth-custom",
  name: "Google Antigravity OAuth (Custom)",
  description: "Re-enable Google Antigravity OAuth login flow for OpenClaw",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_LABEL,
      docsPath: "/providers/models",
      aliases: ["antigravity"],
      auth: [
        {
          id: "oauth",
          label: "Google OAuth",
          hint: "PKCE + localhost callback",
          kind: "oauth",
          run: async (ctx: ProviderAuthContext) => {
            const spin = ctx.prompter.progress("Starting Google Antigravity OAuth…");
            try {
              const result = await loginAntigravityOAuth({
                isRemote: ctx.isRemote,
                openUrl: ctx.openUrl,
                log: (msg) => ctx.runtime.log(msg),
                note: ctx.prompter.note,
                prompt: async (message) => String(await ctx.prompter.text({ message })),
                progress: spin,
              });

              spin.stop("Google Antigravity OAuth complete");

              return buildOauthProviderAuthResult({
                providerId: PROVIDER_ID,
                defaultModel: DEFAULT_MODEL,
                access: result.access,
                refresh: result.refresh,
                expires: result.expires,
                email: result.email,
                notes: [
                  "Tokens se refrescan automáticamente desde refresh_token.",
                  "Si OAuth falla, define OPENCLAW_ANTIGRAVITY_OAUTH_CLIENT_ID/SECRET.",
                ],
              });
            } catch (error) {
              spin.stop("Google Antigravity OAuth failed");
              await ctx.prompter.note(
                "Verifica acceso de la cuenta Google a Antigravity/Cloud Code Assist e intenta nuevamente.",
                "Antigravity OAuth",
              );
              throw error;
            }
          },
        },
      ],
      refreshOAuth: refreshAntigravityOAuth,
    });
  },
};

export default plugin;
