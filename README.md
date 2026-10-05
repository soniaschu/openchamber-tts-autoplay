# OpenChamber TTS AutoPlay

Automatic text-to-speech playback for OpenChamber assistant replies.

The extension deliberately does not maintain its own voice, model, provider, or speed settings. It calls the OpenChamber SDK host with text only, so Settings → OpenChamber → Voice remains the single source of truth.

For the web UI, OpenChamber sends speech through its server-side TTS path and the host page decodes raw PCM with Web Audio.

## Install in OpenChamber

Open Settings → Extensions and paste:

https://github.com/soniaschu/openchamber-tts-autoplay-extension

OpenChamber supports Git installs and checks the repository version for updates. Ship the built panel and background bundles in the repository. Do not ship node_modules.

## Development

Source:
- src/main.ts
- src/background.ts

Browser bundles:
- panel/main.js
- background/main.js

Build with:
node scripts/build.mjs

Validate with:
node --check panel/main.js
node --check background/main.js
node test/verify.mjs

## Browser audio contract

The browser-facing TTS response is signed 16-bit little-endian PCM.

Headers:
- content-type: audio/pcm;rate=<sample-rate>;channels=<channels>
- x-audio-sample-rate
- x-audio-channels
- x-audio-bits: 16

The upstream BKG TTS service may use WAV internally. The browser never receives the upstream credential.
