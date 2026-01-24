<script>
  import favicon from '$lib/assets/favicon.svg';
  let { children } = $props(); // Svelte 5 syntax for children/slots
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- This is where the content of your pages (+page.svelte) will be rendered -->
{@render children()}

<style>
  /*
    :global() applies styles globally, outside the component's scope.
    We're targeting the HTML and Body elements.
  */
  :global(html, body) {
    margin: 0;           /* Remove default browser margin */
    padding: 0;          /* Remove default browser padding */
    width: 100%;         /* Make them take full width */
    height: 100%;        /* Make them take full height */
    overflow: hidden;    /* PREVENTS SCROLLBARS! Important for moving backgrounds */
  }

  /*
    SvelteKit typically renders your app inside a <div> with id="svelte".
    We want this root div to also take full screen and act as a base
    for positioning our elements.
  */
  :global(#svelte) {
    width: 100%;
    height: 100%;
    position: relative; /* Crucial for absolute positioning of child elements */
  }
</style>
