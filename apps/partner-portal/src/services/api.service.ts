import axios, { AxiosError, AxiosInstance, isAxiosError } from 'axios';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'partner-portal:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token == null) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, timeout: 15000 });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      if (isAxiosError(err) && err.response) {
        const data = err.response.data as
          | { message?: string | string[]; error?: string }
          | undefined;

        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : (data?.message ?? data?.error ?? err.message);

        return Promise.reject(new ApiError(err.response.status, message, err.response.data));
      }

      return Promise.reject(new ApiError(0, err.message ?? 'Network error'));
    },
  );

  return client;
}

/**
 * Auth client — points at auth-service. Use for login, refresh, me.
 */
export const authClient = createClient(
  import.meta.env.VITE_AUTH_API_BASE_URL ?? 'http://localhost:3001/api/v1',
);

/**
 * Main API client — points at pricing-service. Use for craftsmen, trades,
 * pricing catalogs, quotes.
 */
export const apiClient = createClient(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
);
