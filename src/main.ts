import { connectHost, HostRequestError, type HostReadyContext } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';

const host = connectHost();
const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('TTS AutoPlay root missing');

type Settings = {
  enabled: boolean;
  maxChars: number;
};

const DEFAULTS: Settings = {
  enabled: true,
  maxChars: 16_000,
};

let context: HostReadyContext | null = null;
let settings: Settings = { ...DEFAULTS };
let loaded = false;

function errorText(error: unknown): string {
  return error instanceof HostRequestError
    ? error.code + ': ' + error.message
    : error instanceof Error ? error.message : String(error);
}

function normalize(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULTS };
  const source = value as Record<string, unknown>;
  return {
    enabled: source.enabled !== false,
    maxChars: typeof source.maxChars === 'number' && Number.isFinite(source.maxChars)
      ? Math.min(32_000, Math.max(2_000, Math.floor(source.maxChars)))
      : DEFAULTS.maxChars,
  };
}

async function loadSettings(): Promise<void> {
  try {
    settings = normalize(await host.storage.get('settings'));
  } catch {
    settings = { ...DEFAULTS };
  }
  render();
}

async function saveSettings(): Promise<void> {
  settings = normalize(settings);
  await host.storage.set('settings', settings);
  updateHud();
}

function render(): void {
  root.innerHTML = [
    '<main class="crt-shell">',
      '<header class="cartridge">',
        '<div class="brand-line"><span>OPENCHAMBER</span><span id="connection">LINK</span></div>',
        '<div class="title-row"><div><p class="eyebrow">BROWSER AUDIO SYSTEM</p><h1>TTS AUTOPLAY</h1></div><div class="speaker-mark">SFX</div></div>',
        '<div class="hud-strip"><span>SESSION <b id="session">NO SESSION</b></span><span>VOICE <b id="voice-state">OPENCHAMBER</b></span><span>STATE <b id="state">READY</b></span></div>',
      '</header>',

      '<section class="screen">',
        '<div class="screen-top"><span>PLAYER SETTINGS</span><span>OPENCHAMBER VOICE</span></div>',
        '<div class="notice">',
          '<strong>VOICE SOURCE</strong>',
          '<p>AutoPlay verwendet ausschließlich die TTS-Konfiguration aus Settings → OpenChamber → Voice. Voice, Modell, Geschwindigkeit und Provider werden hier nicht dupliziert.</p>',
        '</div>',
        '<div class="toggle-row">',
          '<div><strong>AUTO PLAY</strong><p>Spricht neue Assistant-Antworten nach Abschluss automatisch.</p></div>',
          '<button id="toggle" class="power-toggle" type="button" aria-pressed="false"><span class="power-light"></span><span id="toggle-label">OFF</span></button>',
        '</div>',
        '<label for="maxChars">MAX SPEECH TEXT <span id="max-value">16000</span></label>',
        '<input id="maxChars" class="pixel-range" type="range" min="2000" max="32000" step="1000">',
      '</section>',

      '<section class="result-screen">',
        '<div class="screen-top"><span>LIVE TTS LINK</span><span id="server-state">OPENCHAMBER HOST</span></div>',
        '<p class="big-status" id="status-copy">Bereit. Audio wird vom OpenChamber-Host anhand deiner Voice-Einstellungen erzeugt und im Windows-Browser abgespielt.</p>',
        '<div class="info-grid">',
          '<div class="info-card"><b>SOURCE</b><span>OpenChamber Voice</span></div>',
          '<div class="info-card"><b>FORMAT</b><span>PCM / browser</span></div>',
          '<div class="info-card"><b>KEYS</b><span>nur Server</span></div>',
          '<div class="info-card"><b>INPUT</b><span>Assistant replies</span></div>',
        '</div>',
      '</section>',

      '<div class="button-row">',
        '<button id="test" class="action primary" type="button">TEST HOST VOICE</button>',
        '<button id="save" class="action" type="button">SAVE STATE</button>',
      '</div>',
      '<footer class="footer"><span>TTS AUTOPLAY EXTENSION</span><span id="surface">SDK HOST · PANEL</span></footer>',
    '</main>',
  ].join('');

  const toggle = document.querySelector<HTMLButtonElement>('#toggle')!;
  const maxChars = document.querySelector<HTMLInputElement>('#maxChars')!;
  const test = document.querySelector<HTMLButtonElement>('#test')!;
  const save = document.querySelector<HTMLButtonElement>('#save')!;

  toggle.addEventListener('click', () => {
    settings.enabled = !settings.enabled;
    updateControls();
    void saveSettings().catch((error) => showError(error));
  });

  maxChars.addEventListener('input', () => {
    settings.maxChars = Number(maxChars.value);
    document.querySelector('#max-value')!.textContent = String(settings.maxChars);
  });

  test.addEventListener('click', () => void testVoice());
  save.addEventListener('click', () => void saveSettings().then(() => setStatus('STATE SAVED')).catch(showError));

  maxChars.value = String(settings.maxChars);
  updateControls();
  updateHud();
  loaded = true;
}

function updateControls(): void {
  const toggle = document.querySelector<HTMLButtonElement>('#toggle');
  const label = document.querySelector('#toggle-label');
  if (toggle) toggle.setAttribute('aria-pressed', String(settings.enabled));
  if (label) label.textContent = settings.enabled ? 'ON' : 'OFF';
  const state = document.querySelector('#state');
  if (state) state.textContent = settings.enabled ? 'ARMED' : 'MUTED';
  const maxValue = document.querySelector('#max-value');
  if (maxValue) maxValue.textContent = String(settings.maxChars);
  const voiceState = document.querySelector('#voice-state');
  if (voiceState) voiceState.textContent = 'OPENCHAMBER';
}

function updateHud(): void {
  if (!context) return;
  const connection = document.querySelector('#connection');
  const session = document.querySelector('#session');
  const surface = document.querySelector('#surface');
  const server = document.querySelector('#server-state');
  if (connection) connection.textContent = context.connection.connected ? 'ONLINE' : 'OFFLINE';
  if (session) session.textContent = context.session?.title ?? context.session?.id ?? 'NO SESSION';
  if (surface) surface.textContent = 'SDK HOST · ' + context.surface.toUpperCase();
  if (server) server.textContent = context.connection.connected ? 'OPENCHAMBER HOST' : 'HOST OFFLINE';
  updateControls();
}

function setStatus(text: string): void {
  const target = document.querySelector('#status-copy');
  if (target) target.textContent = text;
}

function showError(error: unknown): void {
  setStatus('Fehler: ' + errorText(error));
}

async function testVoice(): Promise<void> {
  const previous = settings.enabled;
  settings.enabled = true;
  updateControls();
  try {
    // No voice, model or speed is supplied on purpose. OpenChamber owns all
    // Voice-mode settings and host.speak resolves them server-side.
    await host.speak({
      text: 'TTS AutoPlay ist verbunden. Diese Ansage verwendet die aktuelle OpenChamber Voice-Konfiguration.',
    });
    setStatus('HOST VOICE TEST IN QUEUE');
  } catch (error) {
    showError(error);
  } finally {
    settings.enabled = previous;
    updateControls();
  }
}

host.onReady((next) => {
  context = next;
  applyHostReady(next, document.documentElement);
  if (!loaded) {
    void loadSettings();
  } else {
    updateHud();
  }
});

host.onSession((session) => {
  if (context) context = { ...context, session };
  const target = document.querySelector('#session');
  if (target) target.textContent = session?.title ?? session?.id ?? 'NO SESSION';
});
