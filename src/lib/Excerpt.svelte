<script lang="ts">
	import { getFirstParagraph } from "../utilities/getFirstParagraph";
	import Image from "./Image.svelte";
  let {item} = $props();
  const featuredImage = $derived(item?.featuredImage);
</script>

<article style:view-transition-name={`article-${item.slug}`}>
  {#if featuredImage}
    <Image transitionName={`article-featured-image-${item.slug}`} image={featuredImage} hasBorder={true}/>  
  {/if}
  <a class="headline" href="/articles/{item.slug}" style:view-transition-name={`article-headline-${item.slug}`}>{item.title}</a>
  <div class="meta">
  <div class="pub-date" style:view-transition-name={`article-pub-date-${item.slug}`}>
    {#if item.originalPublicationDate}
      {new Date(item.originalPublicationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    {:else}
      Draft
    {/if} | {Math.round(item?.word_count / 183)} minute read
    </div>
  {#if item.category}
  <div class="category" style:view-transition-name={`article-category-${item.slug}`}>Filed under: <a href="/articles?category={item?.category?.slug}">{item?.category?.title}</a></div>
  {/if}
  </div>
  <p class="excerpt" style:view-transition-name={`article-content-${item.slug}`}>{getFirstParagraph(item?.content)}</p>
  <a class="read-more" href="/articles/{item.slug}">Read more &gt;</a>
</article>

<style lang="postcss">
  article {
    break-inside: avoid;
    page-break-inside: avoid;
    border-bottom: 2px solid var(--color-tertiary-lightest);
    margin-block: 1rem;

    &:first-child {
      margin-block-start: 0;
    }
  }

  a {
    text-decoration: none;
    color: var(--color-primary);
    font-size: var(--fs-base);
  }

  .excerpt {
    text-indent: 1.5ch;
    &::first-letter {
      text-transform: uppercase;
      color: var(--color-tertiary);
    }
  }

  .headline {
    font-size:calc(var(--fs-base) * 1.3);
  }

  .meta {
    font-size: calc(var(--fs-base) * 0.9);
    font-weight: bolder;
    line-height: initial;
    padding-block-end: 0.5rem;
  }

  .read-more {
    text-align: right;
    display: block;
  }
</style>