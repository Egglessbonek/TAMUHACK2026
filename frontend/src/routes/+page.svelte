<script>
  // Import both components
  import BackgroundScroller from '$lib/BackgroundScroller.svelte';
  import CowButton from '$lib/CowButton.svelte';

  // Function to handle the cow button click
  function handleCowClick() {
    alert("Mooooo! The cow says hi!");
    // You can add more complex logic here later, e.g.,
    // dispatch an event, navigate to another page, play a sound.
  }
</script>

<div class="page-container">
  <!-- Render our animated background component -->
  <BackgroundScroller />

  <!-- Render our animated cow button component -->
  <!-- We pass the handleCowClick function to its onClick prop -->
  <CowButton onClick={handleCowClick} />

  <!-- This is just temporary overlay content, it will sit between background and cow -->
  <main class="content-overlay">
    <h1>Welcome to the Moo-ving World!</h1>
    <p>Click the animated cow!</p>
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
    position: relative;
    z-index: 5; /* This content is above the background (0) but below the cow (10) */
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
    font-family: 'Press Start 2P', cursive, sans-serif; /* Example pixel font */
    text-align: center;
    padding: 20px; /* Add some padding so text isn't right on the edge */
    background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent background for readability */
    border-radius: 8px;
  }
  /* Optional: Import a pixel font if you like, e.g., in app.html or via link tag */
  /*
  :global(body) {
    font-family: 'Press Start 2P', cursive, sans-serif;
  }
  */
</style>
