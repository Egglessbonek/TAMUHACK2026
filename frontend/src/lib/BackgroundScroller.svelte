<script>
  import skyTexture from '$lib/assets/images/sky-texture.png';
  import grassTexture1 from '$lib/assets/images/actual_tiled_grass_1.png';
  import grassTexture2 from '$lib/assets/images/actual_tiled_grass_2.png';

</script>

<style>
  .background-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    /* seconds per full scroll */
    --sky-scroll-speed: 60s;
    --grass-scroll-speed: 12.6s;  
  }

  .background-layer {
    position: absolute;
    inset: 0;
    background-repeat: repeat-x;
    background-position: 0 0;
    will-change: background-position;
  }

  .sky {
    height: 100%;
    top: 0;
    background-size: auto 100%;
    animation: scrollSky var(--sky-scroll-speed) linear infinite;
  }

  .grass {
    height: 50%;
    bottom: 0;
    top: auto;
    background-size: auto 100%;
    background: linear-gradient(to top, #147714 0%, #189218 93%, transparent 93%, transparent 100%);
  }

  .grass-frame-1 {
    height: 50%;
    bottom: 0;
    top: auto;
    background-size: auto 250%;
    opacity: 1;
    animation:
      scrollGrass var(--grass-scroll-speed) linear infinite,
      grassSwapOff 0.6s steps(1, end) infinite;
  }

  .grass-frame-2 {
    height: 50%;
    bottom: 0;
    top: auto;
    background-size: auto 250%;
    opacity: 0;
    animation:
      scrollGrass var(--grass-scroll-speed) linear infinite,
      grassSwapOn 0.6s steps(1, end) infinite;
  }

  /* Move by a fixed pixel distance; repeat-x makes it seamless */
  @keyframes scrollSky {
    from { background-position: 0 0; }
    to   { background-position: -2000px 0; }
  }

  @keyframes scrollGrass {
    from { background-position: 0 0; }
    to   { background-position: 2000px 0; }
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
  <div
    class="background-layer sky"
    style="background-image: url('{skyTexture}');"
  ></div>

  <div class="background-layer grass"></div>
  <div class="background-layer grass-frame-1" style="background-image: url('{grassTexture1}');"></div>
  <div class="background-layer grass-frame-2" style="background-image: url('{grassTexture2}');"></div>

</div>

