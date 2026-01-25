<script lang="ts">
  // Import both components
  import BackgroundScroller from '$lib/BackgroundScroller.svelte';
  import CowButton from '$lib/CowButton.svelte';
  import { onMount } from 'svelte';

  let totalMoos: number | null = null;
  let wsStatus: 'connecting' | 'online' | 'offline' = 'connecting';
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function wsUrl(pathname: string): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${pathname}`;
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

  onMount(() => {
    connect();
    return () => {
      try { ws?.close(); } catch {}
    };
  });

  // Function to handle the cow button click
  function handleCowClick() {
    try {
      if (ws?.readyState === WebSocket.OPEN) ws.send('increment');
    } catch {}
  }
</script>

<div class="page-container">
  <!-- Render our animated background component -->
  <BackgroundScroller />

  <!-- Render our animated cow button component -->
  <!-- We pass the handleCowClick function to its onClick prop -->
  <CowButton onClick={handleCowClick} />

  <main class="content-overlay">
    <div class="moo-counter" aria-live="polite">
      <span class="moo-counter__label">TOTAL MOOS</span>
      <span class="moo-counter__value">{totalMoos ?? '—'}</span>
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
    padding: 20px; /* Add some padding so text isn't right on the edge */
    background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent background for readability */
    border-radius: 4px;
  }

  .moo-counter {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    align-items: baseline;
  }

  .moo-counter__value {
    font-variant-numeric: tabular-nums;
    min-width: 2ch;
    text-align: right;
  }
</style>
