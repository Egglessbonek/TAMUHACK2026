<script>
  import skyTexture from '$lib/assets/images/actual_many_clouds.png';
  import grassTexture1 from '$lib/assets/images/actual_tiled_grass_1_2x.png';
  import grassTexture2 from '$lib/assets/images/actual_tiled_grass_2_2x.png';

</script>

<style>
  .background-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    /* Use a fixed pixel segment width to avoid subpixel seams at segment boundaries.
       Pick a multiple of your tile size (256/512/etc). */
    --segment-width: 6912px;
    --sky-scroll-speed: 35px;
    --grass-scroll-speed: 160px;
  }

  .background-layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    contain: paint;
  }

  :global(.scroll-track) {
    position: absolute;
    inset: 0;
    display: flex;
    width: calc(var(--segment-width) * 2);
    height: 100%;
    will-change: transform;
    transform: translate3d(0, 0, 0);
  }

  :global(.scroll-segment) {
    flex: 0 0 var(--segment-width);
    height: 100%;
    background-repeat: repeat-x;
    background-position: 0 0;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .sky {
    height: 100%;
    top: 0;
  }

  .grass {
    height: 50%;
    bottom: 0;
    top: auto;
    background: linear-gradient(to top, #147714 0%, #189218 93%, transparent 93%, transparent 100%);
  }

  .grass-frame-1 {
    height: 50%;
    bottom: 0;
    top: auto;
    opacity: 1;
    animation:
      grassSwapOff 0.6s steps(1, end) infinite;
  }

  .grass-frame-2 {
    height: 50%;
    bottom: 0;
    top: auto;
    opacity: 0;
    animation:
      grassSwapOn 0.6s steps(1, end) infinite;
  }

  :global(.scroll-sky-track) {
    animation: scrollTrackRight calc((var(--segment-width) / var(--sky-scroll-speed)) * 1s) linear infinite;
  }

  :global(.scroll-grass-track) {
    animation: scrollTrackRight calc((var(--segment-width) / var(--grass-scroll-speed)) * 1s) linear infinite;
  }

  .scroll-sky {
    background-size: auto 80%;
  }

  .scroll-grass {
    background-size: auto 250%;
  }

  /* Two identical segments; move exactly 100vw for a seamless loop. */
  @keyframes scrollTrackRight {
    from { transform: translate3d(calc(-1 * var(--segment-width)), 0, 0); }
    to   { transform: translate3d(0, 0, 0); }
  }

  /* Swap frames every 0.3s (period is 0.6s). steps() prevents cross-fade. */
  @keyframes grassSwapOff {
    0%, 49.999% { opacity: 1; }
    50%, 100%   { opacity: 0; }
  }

  @keyframes grassSwapOn {
    0%, 49.999% { opacity: 0; }
    50%, 100%   { opacity: 1; }
  }
</style>


<div class="background-container">
  <div class="background-layer sky">
    <div class="scroll-track scroll-sky-track">
      <div class="scroll-segment scroll-sky" style="background-image: url('{skyTexture}');"></div>
      <div class="scroll-segment scroll-sky" style="background-image: url('{skyTexture}');"></div>
    </div>
  </div>

  <div class="background-layer grass"></div>
  <div class="background-layer grass-frame-1">
    <div class="scroll-track scroll-grass-track">
      <div class="scroll-segment scroll-grass" style="background-image: url('{grassTexture1}');"></div>
      <div class="scroll-segment scroll-grass" style="background-image: url('{grassTexture1}');"></div>
    </div>
  </div>
  <div class="background-layer grass-frame-2">
    <div class="scroll-track scroll-grass-track">
      <div class="scroll-segment scroll-grass" style="background-image: url('{grassTexture2}');"></div>
      <div class="scroll-segment scroll-grass" style="background-image: url('{grassTexture2}');"></div>
    </div>
  </div>

</div>

