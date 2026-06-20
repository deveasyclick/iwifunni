/**
 * Detects whether the SMS text uses GSM 7-bit default alphabet or requires UCS-2.
 */
export function getSmsCharset(text: string): 'GSM-7' | 'UCS-2' {
  // GSM 7-bit default alphabet check (basic Latin + some extended)
  const gsm7Regex =
    /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#$%&'()*+,\-./:;<=>?¡¿ÄÖÑÜ§¿äöñüà^{}\\\[~\]|€ ]*$/;
  return gsm7Regex.test(text) ? 'GSM-7' : 'UCS-2';
}

export interface SmsSegmentInfo {
  chars: number;
  segments: number;
  perSegment: number;
  charset: 'GSM-7' | 'UCS-2';
}

/**
 * Computes SMS segment information for a given text.
 *
 * - GSM-7: 160 chars per segment, 153 for multi-segment messages
 * - UCS-2: 70 chars per segment, 67 for multi-segment messages
 */
export function getSmsSegmentInfo(text: string): SmsSegmentInfo {
  const charset = getSmsCharset(text);
  const perSegment = charset === 'GSM-7' ? 160 : 70;
  const multiPerSegment = charset === 'GSM-7' ? 153 : 67;
  const chars = text.length;
  const segments =
    chars === 0
      ? 0
      : chars <= perSegment
        ? 1
        : Math.ceil(chars / multiPerSegment);
  return { chars, segments, perSegment, charset };
}
