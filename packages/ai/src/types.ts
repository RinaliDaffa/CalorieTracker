export interface TransportResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type Transport = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<TransportResponse>;

export type Lang = 'en' | 'id';

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GenerateConfig {
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: unknown;
}

export interface GeminiClient {
  generate(contents: GeminiContent[], config?: GenerateConfig): Promise<string>;
}

type MaybePromise<T> = T | Promise<T>;

export interface ClientOptions {
  transport: Transport;
  getApiKey: () => MaybePromise<string | undefined>;
  getModel?: () => MaybePromise<string | undefined>;
  onModelResolved?: (model: string) => MaybePromise<void>;
  sleep?: (ms: number) => Promise<void>;
  candidates?: readonly string[];
}
