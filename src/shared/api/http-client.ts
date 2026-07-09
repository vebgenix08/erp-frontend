export type HttpRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export async function httpClient(
  _url: string,
  _options: HttpRequestOptions = {},
): Promise<unknown> {
  throw new Error("HTTP client is not configured yet.");
}
