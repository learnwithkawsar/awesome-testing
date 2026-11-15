/** Replaces every occurrence of each secret with `***`, recursing into arrays and objects. */
export function redact<T>(value: T, secrets: readonly string[]): T {
  if (typeof value === 'string') {
    return secrets.reduce((text, secret) => text.replaceAll(secret, '***'), value as string) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, secrets)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [redact(key, secrets), redact(item, secrets)]),
    ) as T;
  }
  return value;
}

/**
 * Report row fields that can contain secrets: typed values (the `Fill "<password>"` step title)
 * and page content captured in inline text attachments (e.g. the axe scan's HTML snippets).
 */
const REDACTED_FIELDS = ['title', 'subtitle', 'params', 'logs', 'errors', 'attachments'] as const;

/**
 * Builds a monocart-reporter `visitor` that strips the given secrets from every
 * suite, test and step before the dashboard HTML/JSON is written.
 */
export function createRedactingVisitor(secrets: readonly (string | undefined)[]) {
  const values = secrets.filter((secret): secret is string => !!secret);

  return (data: Record<string, unknown>): void => {
    if (values.length === 0) return;
    for (const field of REDACTED_FIELDS) {
      if (data[field] !== undefined) data[field] = redact(data[field], values);
    }
  };
}
