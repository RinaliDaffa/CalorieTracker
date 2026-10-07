import { AiError } from '@nutrisnap/ai';
import { m } from '@/paraglide/messages.js';

/**
 * A short technical line for support screenshots, shown small under the friendly
 * message. Holds only the error code, HTTP status and Google's error text, which
 * never echoes the key.
 */
export function aiErrorDetail(error: unknown): string {
  const text =
    error instanceof AiError
      ? [error.code, error.details.status, error.message].filter(Boolean).join(' · ')
      : error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
  return text.length > 160 ? `${text.slice(0, 159)}…` : text;
}

/** Users see a translated sentence, never the provider's raw error text. */
export function aiErrorMessage(error: unknown): string {
  if (!(error instanceof AiError)) return m.error_generic();
  switch (error.code) {
    case 'NO_KEY':
      return m.error_no_key();
    case 'INVALID_KEY':
      return m.error_invalid_key();
    case 'RATE_LIMITED':
      return m.error_rate_limited();
    case 'QUOTA_EXHAUSTED':
      return m.error_quota();
    case 'NO_MODEL':
      return m.error_no_model();
    case 'NETWORK':
      return m.error_network();
    case 'EMPTY_RESPONSE':
    case 'PARSE_FAILED':
      return m.error_unreadable();
    case 'IMPLAUSIBLE':
      return m.error_implausible();
    case 'HTTP':
      return m.error_generic();
  }
}
