# OpenChamber TTS AutoPlay

Automatic read-aloud for completed OpenChamber assistant messages.

## Important: OpenChamber owns the voice settings

The extension does not have its own voice, model, endpoint, speed, pitch, volume, or provider configuration.

Every automatic playback call is text-only:

  host.speak({ text })

The OpenChamber host resolves the currently selected Settings -> OpenChamber -> Voice configuration at playback time. Therefore changing the OpenChamber voice/provider immediately changes AutoPlay too.

Supported OpenChamber providers are followed as configured by the host:

- Browser speech synthesis
- Local TTS
- OpenAI
- OpenAI-compatible
- macOS say

AutoPlay therefore never silently falls back to its own NVIDIA/Magpie voice.

## Browser audio

For server-backed OpenAI-compatible speech, OpenChamber uses signed 16-bit little-endian PCM for browser playback. The web client decodes PCM through Web Audio using the returned sample-rate/channel metadata.

The BKG deployment exposes the OpenAI-compatible TTS proxy at:

  https://bla.eysho.info/tts/v1

The browser never receives the upstream BKG/NVIDIA secret.

## Install directly from Git

Use this URL in OpenChamber:

  https://github.com/soniaschu/openchamber-tts-autoplay.git

For a branch-pinned development install:

  https://github.com/soniaschu/openchamber-tts-autoplay.git#main

OpenChamber copies Git installations into its data directory and checks them for updates from Settings -> Extensions. Bump the extension version, rebuild, commit, and push to publish an update.

## Build

Requirements: Node 22+ and a local checkout of the OpenChamber SDK.

Build the browser bundles:

  npm run build

Run checks:

  npm run check

Build the installable archives:

  npm run package

The compatibility archive requested by the BKG deployment is kept at:

  dist/openchamber-tts-autoplay-0.1.0.zip

The current repository release archive is:

  dist/openchamber-tts-autoplay-0.2.0.zip

## Security

No API key is stored in the extension bundle or sent through extension storage. The extension asks the OpenChamber host to speak; the host and server-side TTS configuration own provider credentials.

## Extension layout

- package.json
- panel/index.html
- panel/main.js
- panel/style.css
- background/index.html
- background/main.js
- assets/panel.svg
- assets/speak.svg
