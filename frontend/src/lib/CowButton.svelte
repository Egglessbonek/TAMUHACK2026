<script>
  import cowSprite from '$lib/assets/images/cow-walk-sprite-2.png';

  export let onClick = () => console.log('Moooo! Cow button clicked!');

  const SCALE_FACTOR = 10;

  const ORIGINAL_FRAME_WIDTH = 50;
  const ORIGINAL_FRAME_HEIGHT = 36;

  const NUM_FRAMES = 6;

  const FRAME_WIDTH = ORIGINAL_FRAME_WIDTH * SCALE_FACTOR;
  const FRAME_HEIGHT = ORIGINAL_FRAME_HEIGHT * SCALE_FACTOR;

  // total sprite sheet width when displayed
  const SHEET_WIDTH = FRAME_WIDTH * NUM_FRAMES;

  // how far to move to reach the last frame (0..NUM_FRAMES-1)
  const WALK_DISTANCE = FRAME_WIDTH * NUM_FRAMES;
</script>

<button
  class="cow-button"
  on:click={onClick}
  aria-label="Clickable animated cow"
  style="
    --frame-width: {FRAME_WIDTH}px;
    --frame-height: {FRAME_HEIGHT}px;
    --sheet-width: {SHEET_WIDTH}px;
    --walk-distance: {WALK_DISTANCE}px;
    --num-frames: {NUM_FRAMES};
  "
>
  <div class="cow-sprite-display" style="--cow-sprite-url: url('{cowSprite}');" />
</button>

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
  }

  .cow-sprite-display {
    width: 100%;
    height: 100%;
    background-image: var(--cow-sprite-url);
    background-repeat: no-repeat;

    /* scale the whole sheet to the intended pixel size */
    background-size: var(--sheet-width) var(--frame-height);

    image-rendering: pixelated;
    image-rendering: crisp-edges;

    animation: cowWalk 0.8s steps(var(--num-frames)) infinite;
  }

  @keyframes cowWalk {
    from { background-position: 0 0; }
    to   { background-position: calc(-1 * var(--walk-distance)) 0; }
  }
</style>
