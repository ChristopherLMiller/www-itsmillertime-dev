<script lang="ts">
  import { getMarkdownExcerpt } from "../utilities/getMarkdownExcerpt";
  let {item} = $props();
</script>

<article style:view-transition-name={`article-${item.slug}`}>
  {#if item?.seo?.metaImage}
    <img style:view-transition-name={`article-featured-image-${item.slug}`} src={item.seo.metaImage.url} alt={item.title} />
  {/if}
  <a class="headline" href="/articles/{item.slug}" style:view-transition-name={`article-headline-${item.slug}`}>{item.title}</a>
  <div class="meta">
  <div class="pub-date" style:view-transition-name={`article-pub-date-${item.slug}`}>
    {#if item.publicationDate}
      {new Date(item.publicationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    {:else}
      Draft
    {/if} | {Math.round(item?.wordCount / 183)} minute read
    </div>
  <div class="category" style:view-transition-name={`article-category-${item.slug}`}>Filed under: <a href="/articles?category={item?.postCategory?.slug}">{item?.postCategory?.title}</div>
  </div>
  <p class="excerpt" style:view-transition-name={`article-content-${item.slug}`}>{getMarkdownExcerpt(item?.content, {unit: 'paragraphs', count: 1})}</p>
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

  img {
    width: 100%;
    height: auto;
    border: 5px solid var(--color-primary-darker);
    filter: sepia(80%) contrast(70%) brightness(90%);
    mix-blend-mode: multiply;
    transition: all 0.15s ease-in-out;

    &:hover {
      filter: none;
      mix-blend-mode: normal;
    }
  }
</style>