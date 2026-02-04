<script lang="ts">
  import BackgroundScroller from '$lib/BackgroundScroller.svelte';
  import CowButton from '$lib/CowButton.svelte';
  import { onMount } from 'svelte';

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

  const FLUSH_INTERVAL_MS = 500;
  const MAX_BATCH = 40;
  let pendingClicks = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const PREFETCH_QUEUE_SIZE = 15;
  let prefetchQueue: string[] = [];
  
  // Night Mode State
  let isNightMode = false;

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
      flushPendingClicks();
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      const next = Number(raw);
      if (!Number.isNaN(next)) totalMoos = next;
    });

    ws.addEventListener('close', (event: CloseEvent) => {
      wsStatus = 'offline';
      if (event.code === 1008) {
        try { sessionStorage.removeItem(TURNSTILE_VALIDATED_KEY); } catch {}
        window.location.reload();
      }
    });

    ws.addEventListener('error', () => {
      wsStatus = 'offline';
      try { ws?.close(); } catch {}
    });
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushPendingClicks();
    }, FLUSH_INTERVAL_MS);
  }

  function flushPendingClicks() {
    if (pendingClicks <= 0) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      scheduleFlush();
      return;
    }

    const batch = Math.min(pendingClicks, MAX_BATCH);
    pendingClicks -= batch;

    try {
      ws.send(`inc:${batch}`);
    } catch {}

    if (pendingClicks > 0) scheduleFlush();
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

  const TURNSTILE_VALIDATED_KEY = 'turnstile_validated';

  function waitForTurnstileValidation(): Promise<void> {
    if (sessionStorage.getItem(TURNSTILE_VALIDATED_KEY) === '1') return Promise.resolve();

    return new Promise((resolve) => {
      const handler = () => {
        window.removeEventListener('turnstile-validated', handler);
        resolve();
      };
      window.addEventListener('turnstile-validated', handler, { once: true });
    });
  }

  onMount(() => {
    let cancelled = false;

    const start = async () => {
      await waitForTurnstileValidation();
      if (cancelled) return;
      connect();

      // Prefetch and keep a rolling queue of upcoming sounds.
      topUpPrefetchQueue();
    };

    void start();

    return () => {
      cancelled = true;
      try { ws?.close(); } catch {}

      if (flushTimer) {
        try { clearTimeout(flushTimer); } catch {}
        flushTimer = null;
      }

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
    pendingClicks += 1;
    scheduleFlush();

    fadeOutAllPlaying(FADE_OUT_SECONDS);

    // Play from the prefetch queue (and immediately top it up to stay N ahead).
    const nextId = prefetchQueue.shift() ?? Math.floor(Math.random() * 101).toString().padStart(3, '0');
    playSound(nextId);
    topUpPrefetchQueue();
  }

  function toggleNightMode() {
    isNightMode = !isNightMode;
  }
</script>

<div class="page-container" class:night-mode={isNightMode}>
  <!-- Render our animated background component -->
  <BackgroundScroller />
  
  {#if isNightMode}
    <div class="night-tint"></div>
  {/if}

  <!-- Render our animated cow button component -->
  <!-- We pass the handleCowClick function to its onClick prop -->
  <CowButton onClick={handleCowClick} />

  <main class="content-overlay">
    <div class="moo-display" aria-live="polite">
      <span class="moo-value">{totalMoos ?? '—'}</span>
      <!-- <span class="moo-value">👷 We have to MOOve things around, the button will be back soon!</span> -->
    </div>
  </main>

  <button class="mode-toggle" on:click={toggleNightMode} aria-label="Toggle Night Mode">
    {isNightMode ? '☀️ Day' : '🌙 Night'}
  </button>
</div>

<style>
  .page-container {
    width: 100vw;
    height: 100vh;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    /* Day background color */
    background: linear-gradient(180deg, #5197d0 0%, #87CEEB 50%);
    transition: background-color 0.3s;
  }

  .page-container.night-mode {
    /* Night background color */
    background: linear-gradient(180deg, #1d2a3e 0%, #6768c9 50%);
  }

  .night-tint {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.3); /* 40% darker tint */
    z-index: 1; /* Above background (0), below cow (10) and overlay (5) */
    pointer-events: none;
  }

  .mode-toggle {
    position: absolute;
    top: 1rem;  
    right: 1rem;
    z-index: 20;
    padding: 15px;
    font-family: 'Press Start 2P', cursive, sans-serif;
    font-size: 0.8rem;
    cursor: pointer;
    
    color: white;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.7);
    background-color: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 4px;
    user-select: text;
    
    transition: background-color 0.2s, transform 0.1s;
  }

  .mode-toggle:hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .mode-toggle:active {
    transform: scale(0.95);
  }
  
  .content-overlay {
    position: absolute;
    top: 1rem;
    z-index: 5; /* This content is above the background (0) but below the cow (10) */
    color: white;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.7);
    font-family: 'Press Start 2P', cursive, sans-serif; /* Example pixel font */
    text-align: center;
    padding: 20px 20px 5px 20px; /* Add some padding so text isn't right on the edge */
    background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent background for readability */
    border-radius: 4px;
    user-select: text;
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
