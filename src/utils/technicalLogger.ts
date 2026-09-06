/**
 * Modulo di Logging Tecnico Centralizzato
 * Registra eventi critici di persistenza, tentativi di sovrascrittura anomali,
 * errori di rete e performance senza esporre dati sensibili nell'interfaccia.
 */

export interface TechnicalLogEntry {
  level: 'info' | 'warn' | 'error';
  module: 'workouts' | 'athlete' | 'carousel' | 'auth' | 'system';
  action: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

class TechnicalLogger {
  private logBuffer: TechnicalLogEntry[] = [];
  private readonly maxBufferSize = 50;

  public log(
    level: TechnicalLogEntry['level'],
    module: TechnicalLogEntry['module'],
    action: string,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const entry: TechnicalLogEntry = {
      level,
      module,
      action,
      message,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
    };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    const prefix = `[AC-${module.toUpperCase()}] [${action}]`;
    if (level === 'error') {
      console.error(prefix, message, entry.details || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, entry.details || '');
    } else {
      console.info(prefix, message, entry.details || '');
    }
  }

  public warn(module: TechnicalLogEntry['module'], action: string, message: string, details?: Record<string, unknown>): void {
    this.log('warn', module, action, message, details);
  }

  public error(module: TechnicalLogEntry['module'], action: string, message: string, details?: Record<string, unknown>): void {
    this.log('error', module, action, message, details);
  }

  public info(module: TechnicalLogEntry['module'], action: string, message: string, details?: Record<string, unknown>): void {
    this.log('info', module, action, message, details);
  }

  public getRecentLogs(): ReadonlyArray<TechnicalLogEntry> {
    return [...this.logBuffer];
  }

  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(details)) {
      if (/password|token|secret|authorization|key/i.test(k)) {
        safe[k] = '***REDACTED***';
      } else if (typeof v === 'object' && v !== null) {
        try {
          safe[k] = JSON.parse(JSON.stringify(v));
        } catch {
          safe[k] = String(v);
        }
      } else {
        safe[k] = v;
      }
    }
    return safe;
  }
}

export const technicalLogger = new TechnicalLogger();
