<script lang="ts">
	import Lightbox from "$lib/Lightbox.svelte";
	import Newspaper from "$lib/Newspaper.svelte";
	import SvelteMarkdown from "svelte-markdown";
  
const { data } = $props();
const post = data.post;

const renderers = {
  image: Lightbox
} 
</script>

<Newspaper heading={post.title} headingTransitionName={`article-headline-${post.slug}`} columns={3} featuredImage={post.featuredImage} featuredImageTransitionName={`article-featured-image-${post.slug}`}>
  <div class="meta">
    <hr />
    <h3 style:view-transition-name={`article-pub-date-${post.slug}`}>
      Published on {new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </h3>
    <h3>First written {new Date(post.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </h3>
    <h3 style:view-transition-name={`article-category-${post.slug}`}>
      Filed under {post?.category?.title}
    </h3>
    <hr />
  </div>
  <article class="post contents" style:view-transition-name={`article-content-${post.slug}`}>
    <SvelteMarkdown source={post.markdown} {renderers}/>
  </article>
</Newspaper>

<style lang="postcss">
  .meta {
    font-size: calc(var(--fs-base) * 0.9);
    font-weight: bolder;
    line-height: initial;

    h3 {
      font-size: var(--fs-base);
    }

    hr {
      margin-block: 1rem;
      color: var(--color-tertiary-lighter);
    }
  }
</style>