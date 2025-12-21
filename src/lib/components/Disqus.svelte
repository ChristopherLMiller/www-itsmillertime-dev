<script lang="ts">
	import { browser } from "$app/environment";
	import { onMount } from "svelte";

  
  export let identifier: string;
  export let title: string;
  export let url: string;

  const shortname = 'itsmillertimedev';

  onMount(() => {
    if (!browser) return;

    // Prevent duplicate embeds during navigation
    if (window.DISQUS) {
      window.DISQUS.reset({
        reload: true,
        config: function() {
          this.page.identifier = identifier;
          this.page.title = title;
          this.page.url = url;
        }
      });
      return;
    }

    window.disqus_config = function() {
      this.page.identifier = identifier;
      this.page.title = title;
      this.page.url = url;
    }

    const d = document;
    const s = d.createElement('script');
    s.src = `https://${shortname}.disqus.com/embed.js`;
    s.setAttribute('data-timestamp', Date.now());
    s.async = true,
    d.body.appendChild(s);
  })
</script>

<div class='disqus-wrapper'>
  <div id="disqus_thread"></div>
</div>

<style lang="postcss">
  .disqus-wrapper {
    background: rgba(228,228,228,1);
    color: rgb(100,26,18,1);
    border: var(--border-width) solid var(--color-tertiary);
    border-radius: 4px;
    padding: 1rem;
    
    :global(a) {
      background: rgba(228,228,228,1);
      color: rgb(100,26,18,1);
    }
  }
</style>