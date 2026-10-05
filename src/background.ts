import { connectHost, type GuestMessageItem } from '@openchamber/sdk';

const host = connectHost();

type Settings = {
  enabled: boolean;
  maxChars: number;
};

const DEFAULTS: Settings = {
  enabled: true,
  maxChars: 16_000,
};

function sanitizeForTTS(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u0060\u0060\u0060[\s\S]*?\u0060\u0060\u0060/g, '')
    .replace(/\u0060([^\u0060\n]*)\u0060/g, '$1')
    .replace(/[*_~#]/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/(^|\s)\/(?:[\w.-]+\/)*[\w.-]+/g, '$1')
    .replace(/([\w.])\/([\w.])/g, '$1 slash $2')
    .replace(/^\s*[$#>]\s*/gm, '')
    .replace(/[\[\]{}()<>|&;]/g, ' ')
    .replace(/\\/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

function ensureLineTerminalPunctuation(text: string): string {
  return text
    .split('\n')
    .map((line) => /[\p{L}\p{N}]$/u.test(line) ? line + '.' : line)
    .join('\n');
}

function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULTS };
  const source = value as Record<string, unknown>;
  const maxChars = typeof source.maxChars === 'number' && Number.isFinite(source.maxChars)
    ? Math.min(32_000, Math.max(2_000, Math.floor(source.maxChars)))
    : DEFAULTS.maxChars;
  return {
    enabled: source.enabled !== false,
    maxChars,
  };
}

function chunkSpeech(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const sentences = text.split(/(?<=[.!?。！？])\s+/u);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let offset = 0; offset < sentence.length; offset += maxChars) {
        chunks.push(sentence.slice(offset, offset + maxChars));
      }
      continue;
    }
    const candidate = current ? current + ' ' + sentence : sentence;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

host.onAction(async (item) => {
  if (item.kind !== 'message' || item.role !== 'assistant') return;

  const settings = normalizeSettings(await host.storage.get('settings'));
  if (!settings.enabled) return;

  const clean = ensureLineTerminalPunctuation(sanitizeForTTS(item.text));
  if (!clean) return;

  for (const chunk of chunkSpeech(clean, settings.maxChars)) {
    // Deliberately send text only. The OpenChamber host resolves the active
    // provider, model, voice and speed from its own Voice settings.
    await host.speak({ text: chunk });
  }
});
