<div class="top-bar-element">
  <a class="text-small" href="/"><strong>I</strong>ts<strong>M</strong>iller<strong>T</strong>ime</a>
</div>


<style lang="postcss">
  .top-bar-element {
    background: var(--color-tertiary-darker);
    padding-inline: 1vw;
    position: sticky;
    width: 100%;
    height: var(--top-bar-height);
    offset: 0;
    top: 0;
    z-index: 1;
    flex-direction: row;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--box-shadow-elev-1);

  a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 400;
    font-family: var(--font-oswald);

    strong {
      color: var(--color-white-lighter);
      font-weight: 400;
    }
  }
}
</style>