<script>
  import favicon from '$lib/assets/favicon.png';
  import { onMount } from 'svelte';
  
  let { children } = $props(); // Svelte 5 syntax for children/slots

  // Expose the callback globally so Turnstile can find it
  onMount(() => {
    window.onTurnstileSuccess = async (token) => {
      try {
        const formData = new FormData();
        formData.append('cf-turnstile-response', token);
        const res = await fetch('/api/submit', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
           // Reload to pick up the cookie and start the app fresh (or signal the page)
           // For simplicity in this architecture, reloading ensures +page.svelte mounts with the cookie present.
           window.location.reload(); 
        }
      } catch (e) {
        console.error("Verification failed", e);
      }
    };
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://challenges.cloudflare.com">
  <script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>
</svelte:head>

<!-- This is where the content of your pages (+page.svelte) will be rendered -->
{@render children()}
<div class="cf-turnstile" data-sitekey="0x4AAAAAACWP-TZOq5SLv5yT" data-theme="dark" data-callback="onTurnstileSuccess"></div>
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
