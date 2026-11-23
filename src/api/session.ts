import { ConfigManager } from '../config/ConfigManager.js';
import { CredentialManager } from '../config/CredentialManager.js';
import { MujarradClient } from './client.js';

export interface SessionOptions {
  /** Overrides the configured API base URL. */
  apiUrl?: string;
  /** Skip the stored token (used by login and register). */
  anonymous?: boolean;
}

/**
 * Builds a client from, in order of precedence:
 * - `MUJARRAD_TOKEN` (a JWT), or `MUJARRAD_API_KEY` + `MUJARRAD_API_SECRET`
 * - the token stored by `mujarrad auth login`
 * - `MUJARRAD_EMAIL` + `MUJARRAD_PASSWORD`: signs in for this command only, nothing is stored
 *
 * The base URL comes from `--api-url`, then `MUJARRAD_API_BASE_URL`, then ~/.mujarrad/config.json.
 */
export async function createClient(opts: SessionOptions = {}): Promise<MujarradClient> {
  const config = await new ConfigManager().load();
  const baseUrl = opts.apiUrl || config.apiBaseUrl;
  if (opts.anonymous) return new MujarradClient({ baseUrl });

  const env = process.env;
  if (env.MUJARRAD_TOKEN) return new MujarradClient({ baseUrl, token: env.MUJARRAD_TOKEN });
  if (env.MUJARRAD_API_KEY && env.MUJARRAD_API_SECRET) {
    return new MujarradClient({ baseUrl, apiKey: env.MUJARRAD_API_KEY, apiSecret: env.MUJARRAD_API_SECRET });
  }

  let token: string | null = null;
  try {
    const creds = new CredentialManager();
    token = await creds.getToken();
    if (token && !(await creds.isTokenValid())) token = null;
  } catch {
    token = null;
  }
  const client = new MujarradClient({ baseUrl, token });
  if (!token && env.MUJARRAD_EMAIL && env.MUJARRAD_PASSWORD) {
    const result = await client.login(env.MUJARRAD_EMAIL, env.MUJARRAD_PASSWORD);
    client.setToken(result.token);
  }
  return client;
}

/** Like createClient, but fails with a helpful message when there are no credentials. */
export async function requireClient(opts: SessionOptions = {}): Promise<MujarradClient> {
  const client = await createClient(opts);
  if (!client.hasCredentials()) {
    throw new Error('Not signed in. Run "mujarrad auth login", or set MUJARRAD_TOKEN, MUJARRAD_API_KEY/MUJARRAD_API_SECRET, or MUJARRAD_EMAIL/MUJARRAD_PASSWORD.');
  }
  return client;
}
