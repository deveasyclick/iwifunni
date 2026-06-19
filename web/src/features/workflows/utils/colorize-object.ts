/**
 * Formats an object as a colorized object literal like:
 *   {
 *     firstName: "Yusuf",
 *     email:     "yusuf@..."
 *   }
 *
 * Keys are plain text, string values are green, non-string values are amber.
 */
export function colorizeObject(data: Record<string, unknown>): string {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return '{ }';

  const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
  const lines = entries.map(([key, value]) => {
    const val =
      typeof value === 'string'
        ? `<span style="color:#16a34a">"${value}"</span>`
        : `<span style="color:#d97706">${String(value)}</span>`;
    return `  ${key.padEnd(maxKeyLen)}: ${val}`;
  });

  return `{\n${lines.join(',\n')}\n}`;
}
