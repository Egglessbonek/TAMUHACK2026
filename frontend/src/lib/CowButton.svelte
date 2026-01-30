<script>
  import cowSprite from '$lib/assets/images/cow-walk-sprite-2.png';
  import realCow from '$lib/assets/images/holstein-cow.png';

  export let onClick = () => console.log('Moooo! Cow button clicked!');

  let isReal = false;
  let realTimeout;

  let isClicked = false;
  let clickTimeout;

  function handleClick() {
    if (Math.random() < 0.01) {
      clearTimeout(realTimeout);
      isReal = true;
      realTimeout = setTimeout(() => {
        isReal = false;
      }, 500);
    } else if (!isReal) {
      isClicked = true;
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        isClicked = false;
      }, 150);
    }
    onClick();
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  const SCALE_FACTOR = 10;
  const ORIGINAL_FRAME_WIDTH = 50;
  const ORIGINAL_FRAME_HEIGHT = 36;
  const NUM_FRAMES = 6;
  const FRAME_WIDTH = ORIGINAL_FRAME_WIDTH * SCALE_FACTOR;
  const FRAME_HEIGHT = ORIGINAL_FRAME_HEIGHT * SCALE_FACTOR;
  const SHEET_WIDTH = FRAME_WIDTH * NUM_FRAMES;
  const WALK_DISTANCE = FRAME_WIDTH * NUM_FRAMES;
</script>

<style>
  .cow-button {
    position: absolute;
    z-index: 10;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: var(--frame-width);
    height: var(--frame-height);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    user-select: none;
    transition: transform 0.1s ease-in-out;
    -webkit-tap-highlight-color: transparent;
  }

  .cow-button.clicked {
    transform: translate(-50%, -40%);
  }

  .cow-sprite-display {
    width: 100%;
    height: 100%;
    background-image: var(--cow-sprite-url);
    background-repeat: no-repeat;
    background-size: var(--sheet-width) var(--frame-height);
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    animation: cowWalk 0.8s steps(var(--num-frames)) infinite;
  }

  @keyframes cowWalk {
    from { background-position: 0 0; }
    to   { background-position: calc(-1 * var(--walk-distance)) 0; }
  }

  .cow-sprite-shadow {
    pointer-events: none;
    position: absolute;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 15%;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 50%;
    filter: blur(4px);
    z-index: -1;
  }

  .cow-real {
    width: 100%;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>

<button
  type="button"
  class="cow-button"
  class:clicked={isClicked}
  on:click={handleClick}
  on:keydown={onKeyDown}
  aria-label="Clickable animated cow"
  tabindex="-1"
  style="
    --frame-width: {FRAME_WIDTH}px;
    --frame-height: {FRAME_HEIGHT}px;
    --sheet-width: {SHEET_WIDTH}px;
    --walk-distance: {WALK_DISTANCE}px;
    --num-frames: {NUM_FRAMES};
  "
>
  {#if isReal}
    <div class="cow-real" style="background-image: url('{realCow}');"></div>
  {:else}
    <div class="cow-sprite-display" style="--cow-sprite-url: url('{cowSprite}');"></div>
  {/if}
    <div class="cow-sprite-shadow"></div>
</button>
