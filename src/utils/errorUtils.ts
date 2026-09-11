/**
 * Estrae un messaggio di errore chiaro e leggibile da qualsiasi tipo di eccezione o risposta di errore,
 * inclusi gli oggetti PostgrestError di Supabase (che non estendono Error standard).
 */
export function extractErrorMessage(error: unknown, defaultMessage = 'Errore sconosciuto'): string {
  if (!error) return defaultMessage;
  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string' && err.message.trim().length > 0) {
      if (typeof err.hint === 'string' && err.hint.trim().length > 0) {
        return `${err.message} (${err.hint})`;
      }
      return err.message;
    }
    if (typeof err.error_description === 'string' && err.error_description.trim().length > 0) {
      return err.error_description;
    }
    if (typeof err.details === 'string' && err.details.trim().length > 0) {
      return err.details;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      // Ignora errori di serializzazione
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return defaultMessage;
}
