export const INTERNAL_RENDER_SECRET_VARIABLE = 'INTERNAL_RENDER_SECRET';

/** The `.env.example` value; `create` replaces it with a random one and production refuses it. */
export const INTERNAL_RENDER_SECRET_EXAMPLE = 'replace-with-a-random-render-secret-of-32-chars';

export const INTERNAL_RENDER_SECRET_COMMENT =
  'Shared by the web app and the API server: the web app sends it on its own session lookups so they skip the per-address rate limit. Keep it private and identical in both.';
