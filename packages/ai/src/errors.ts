export type AiErrorCode =
  | 'NO_KEY'
  | 'INVALID_KEY'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'NO_MODEL'
  | 'EMPTY_RESPONSE'
  | 'PARSE_FAILED'
  | 'IMPLAUSIBLE'
  | 'NETWORK'
  | 'HTTP';

export interface AiErrorDetails {
  retryAfterMs?: number;
  status?: number;
  problems?: string[];
}

/** The UI maps `code` to a translated message; `message` is for logs only. */
export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly details: AiErrorDetails;

  constructor(code: AiErrorCode, message: string, details: AiErrorDetails = {}) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.details = details;
  }
}
