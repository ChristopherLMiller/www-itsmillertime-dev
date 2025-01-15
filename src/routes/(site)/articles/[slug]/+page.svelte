<script lang="ts">
  import { page } from "$app/state";
  import Newspaper from "$lib/Newspaper/Newspaper.svelte";
  import SvelteMarkdown from "svelte-markdown";
  
  const post = page.data.post;
  
</script>

<Newspaper heading={post.title} headingTransitionName={`article-headline-${post.slug}`} columns={3} image={post.seo.metaImage}>
  <div class="meta">
    <div class="pub-date" style:view-transition-name={`article-pub-date-${post.slug}`}>{new Date(post.publicationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</div>

    <div class="category" style:view-transition-name={`article-category-${post.slug}`}>Filed under: {post.postCategory.title}</div>
    <hr />
  </div>
  <article class="contents" style:view-transition-name={`article-content-${post.slug}`}>
    <SvelteMarkdown source={post.content} />
  </article>
</Newspaper>

<style lang="postcss">
  .meta {
    font-size: calc(var(--fs-base) * 0.9);
    font-weight: bolder;
    line-height: initial;

    hr {
      margin-block: 1rem;
      color: var(--color-tertiary-lighter);
    }
  }
</style>