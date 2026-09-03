import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
});

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

/**
 * Register Clerk's `getToken` so every request fetches a fresh JWT.
 * Clerk session tokens expire after ~60s, so the token cannot be pinned
 * onto the axios instance once at mount — it has to be read per request.
 * Clerk caches internally and only hits the network when the token is stale.
 */
export function setTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

api.interceptors.request.use(async (config) => {
  if (!tokenGetter) return config;
  const token = await tokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

export default api;
