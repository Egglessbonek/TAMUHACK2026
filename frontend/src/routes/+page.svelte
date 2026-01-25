<script lang="ts">
  // Import both components
  import BackgroundScroller from '$lib/BackgroundScroller.svelte';
  import CowButton from '$lib/CowButton.svelte';
  import { onMount } from 'svelte';

  // Resolve sound assets to final URLs at build time (works in dev + production).
  import ultraRareUrl from '$lib/assets/sounds/ultra_rare_cow_sound.mp3?url';
  const cowSoundUrlModules = import.meta.glob('$lib/assets/sounds/cow_sounds_*.mp3', {
    eager: true,
    import: 'default',
    query: '?url'
  }) as Record<string, string>;

  const cowSoundUrlById = new Map<string, string>(
    Object.entries(cowSoundUrlModules)
      .map(([path, url]) => {
        const match = path.match(/cow_sounds_(\d{3})\.mp3$/);
        return match ? ([match[1], url] as const) : null;
      })
      .filter((x): x is readonly [string, string] => x !== null)
  );

  let totalMoos: number | null = null;
  let wsStatus: 'connecting' | 'online' | 'offline' = 'connecting';
  let ws: WebSocket | null = null;

  const PREFETCH_QUEUE_SIZE = 15;
  let prefetchQueue: string[] = [];

  const BASE_VOLUME = 0.5;
  const FADE_OUT_SECONDS = 0.5;
  const activeAudios = new Set<HTMLAudioElement>();
  const fadingAudios = new Set<HTMLAudioElement>();
  const fadeOutRafByAudio = new Map<HTMLAudioElement, number>();

  const audioObjectUrlCache = new Map<string, string>();
  const audioPrefetchInFlight = new Map<string, Promise<void>>();

  function wsUrl(pathname: string): string {
    let proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // local
    let host = window.location.hostname;
    if (window.location.hostname === 'localhost') {
      proto = 'wss:';
      host = 'moofor.me';
    }
    return `${proto}//${host}${pathname}`;
  }

  function connect() {
    wsStatus = 'connecting';
    ws = new WebSocket(wsUrl('/api/ws'));

    ws.addEventListener('open', () => {
      wsStatus = 'online';
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      const next = Number(raw);
      if (!Number.isNaN(next)) totalMoos = next;
    });

    ws.addEventListener('close', () => {
      wsStatus = 'offline';
    });

    ws.addEventListener('error', () => {
      wsStatus = 'offline';
      try { ws?.close(); } catch {}
    });
  }

  function resolveSoundUrl(id: string): string | null {
    if (id === '000') return ultraRareUrl;
    return cowSoundUrlById.get(id) ?? null;
  }

  function prefetchSound(id: string): Promise<void> {
    if (audioObjectUrlCache.has(id)) return Promise.resolve();
    const existing = audioPrefetchInFlight.get(id);
    if (existing) return existing;

    const url = resolveSoundUrl(id);
    if (!url) return Promise.resolve();

    const promise = (async () => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) return;
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        audioObjectUrlCache.set(id, objectUrl);
      } catch {
        // Ignore prefetch failures; will just retry in the topup loop
      }
    })().finally(() => {
      audioPrefetchInFlight.delete(id);
    });

    audioPrefetchInFlight.set(id, promise);
    return promise;
  }

  function topUpPrefetchQueue() {
    while (prefetchQueue.length < PREFETCH_QUEUE_SIZE) {
      const id = Math.floor(Math.random() * 101).toString().padStart(3, '0');
      prefetchQueue.push(id);
      prefetchSound(id);
    }
  }

  function fadeOutAudio(audio: HTMLAudioElement, fadeSeconds: number) {
    if (audio.paused) return;

    // If it's already fading, don't restart the fade.
    if (fadingAudios.has(audio)) return;
    fadingAudios.add(audio);

    const durationMs = Math.max(0, fadeSeconds * 1000);
    if (durationMs === 0) {
      audio.volume = 0;
      try { audio.pause(); } catch {}
      try { audio.currentTime = 0; } catch {}
      fadingAudios.delete(audio);
      return;
    }

    const startVol = audio.volume;
    const startAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      audio.volume = startVol * Math.sqrt(1 - t);
      if (t < 1 && !audio.paused) {
        const raf = requestAnimationFrame(tick);
        fadeOutRafByAudio.set(audio, raf);
      } else {
        audio.volume = 0;
        try { audio.pause(); } catch {}
        try { audio.currentTime = 0; } catch {}
        fadeOutRafByAudio.delete(audio);
        fadingAudios.delete(audio);
      }
    };

    const raf = requestAnimationFrame(tick);
    fadeOutRafByAudio.set(audio, raf);
  }

  function fadeOutAllPlaying(fadeSeconds: number) {
    for (const audio of activeAudios) fadeOutAudio(audio, fadeSeconds);
  }

  function playSound(id: string) {
    const url = audioObjectUrlCache.get(id) ?? resolveSoundUrl(id);
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.volume = BASE_VOLUME;
      activeAudios.add(audio);

      const cleanup = () => {
        activeAudios.delete(audio);
        fadingAudios.delete(audio);
        const raf = fadeOutRafByAudio.get(audio);
        if (raf) cancelAnimationFrame(raf);
        fadeOutRafByAudio.delete(audio);
        audio.removeEventListener('ended', cleanup);
        audio.removeEventListener('pause', cleanup);
        audio.removeEventListener('error', cleanup);
      };

      audio.addEventListener('ended', cleanup);
      audio.addEventListener('pause', cleanup);
      audio.addEventListener('error', cleanup);

      audio.play();
    } catch {
      // Ignore play errors (e.g., autoplay policies)
    }
  }

  onMount(() => {
    connect();

    // Prefetch and keep a rolling queue of upcoming sounds.
    topUpPrefetchQueue();

    return () => {
      try { ws?.close(); } catch {}

      for (const audio of activeAudios) {
        try { audio.pause(); } catch {}
      }
      activeAudios.clear();
      for (const raf of fadeOutRafByAudio.values()) {
        try { cancelAnimationFrame(raf); } catch {}
      }
      fadeOutRafByAudio.clear();

      // Clean up object URLs we created.
      for (const objectUrl of audioObjectUrlCache.values()) {
        try { URL.revokeObjectURL(objectUrl); } catch {}
      }
      audioObjectUrlCache.clear();
    };
  });

  // Function to handle the cow button click
  function handleCowClick() {
    try {
      if (ws?.readyState === WebSocket.OPEN) ws.send('increment');
    } catch {}

    fadeOutAllPlaying(FADE_OUT_SECONDS);

    // Play from the prefetch queue (and immediately top it up to stay 10 ahead).
    const nextId = prefetchQueue.shift() ?? Math.floor(Math.random() * 101).toString().padStart(3, '0');
    playSound(nextId);
    topUpPrefetchQueue();
  }
</script>

<div class="page-container">
  <!-- Render our animated background component -->
  <BackgroundScroller />

  <!-- Render our animated cow button component -->
  <!-- We pass the handleCowClick function to its onClick prop -->
  <CowButton onClick={handleCowClick} />

  <main class="content-overlay">
    <div class="moo-display" aria-live="polite">
      <span class="moo-value">{totalMoos ?? '—'}</span>
    </div>
  </main>
</div>

<style>
  .page-container {
    width: 100vw;
    height: 100vh;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Optional: Fallback background if images don't load or for debugging */
    background-color: #87CEEB; /* A light blue sky color */
  }
  
  .content-overlay {
    position: absolute;
    top: 1rem;
    z-index: 5; /* This content is above the background (0) but below the cow (10) */
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
    font-family: 'Press Start 2P', cursive, sans-serif; /* Example pixel font */
    text-align: center;
    padding: 20px 20px 5px 20px; /* Add some padding so text isn't right on the edge */
    background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent background for readability */
    border-radius: 4px;
  }

  .moo-display {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    align-items: baseline;
  }

  .moo-value {
    font-variant-numeric: tabular-nums;
    min-width: 2ch;
    text-align: right;
  }
</style>
