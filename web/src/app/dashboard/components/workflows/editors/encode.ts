// ─── Body encoding/decoding for react-email-editor ─────────────────────────

const DESIGN_PREFIX = '<!-- unlayer-design:';
const DESIGN_SUFFIX = ' -->';

export const encodeEmailBody = (design: object, html: string): string => {
  const encoded = Buffer.from(JSON.stringify(design)).toString('base64');
  return `${DESIGN_PREFIX}${encoded}${DESIGN_SUFFIX}\n${html}`;
};

export const decodeEmailBody = (
  body: string,
): { design: object; html: string } | null => {
  if (!body.startsWith(DESIGN_PREFIX)) return null;
  const endIdx = body.indexOf(DESIGN_SUFFIX);
  if (endIdx === -1) return null;

  const b64 = body.slice(DESIGN_PREFIX.length, endIdx);
  const html = body.slice(endIdx + DESIGN_SUFFIX.length).replace(/^\n/, '');

  try {
    const design = JSON.parse(
      Buffer.from(b64, 'base64').toString('utf-8'),
    ) as object;
    return { design, html };
  } catch {
    return null;
  }
};
