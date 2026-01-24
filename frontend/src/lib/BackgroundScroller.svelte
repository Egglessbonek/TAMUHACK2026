<script>
  import skyTexture from '$lib/assets/images/sky-texture.png';
  import grassTexture from '$lib/assets/images/grass-texture.png';
</script>

<div class="background-container">
  <div
    class="background-layer sky"
    style="background-image: url('{skyTexture}')"
  ></div>

  <div
    class="background-layer grass"
    style="background-image: url('{grassTexture}')"
  ></div>
</div>

<style>
  .background-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
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
    animation: scrollSky 60s linear infinite;
  }

  .grass {
    height: 50%;
    bottom: 0;
    top: auto;
    background-size: auto 100%;
    animation: scrollGrass 5s linear infinite;
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
</style>
