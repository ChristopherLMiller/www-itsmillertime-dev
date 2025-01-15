<footer>
  <div class="footer-content">
    <div class="block">
      <h6>Contact Me</h6>
      <p>Reach out to me today with any questions or concerns, or anything else I may be able to do for you!</p>
      
      <form>
        <div class="input-wrapper">
          <div class="label-wrapper">
            <label for="name">Name</label>
            <div class="error-message" id="name">* Name is required</div>
          </div>
          <input type="text" id="name" name="name" required />
        </div>
        
        <div class="input-wrapper">
          <div class="label-wrapper">
            <label for="email">Email</label>
            <div class="error-message" id="email">* email is required</div>
          </div>
          <input type="text" id="email" name="email" required />
        </div>
        <div class="input-wrapper">
          <div class="label-wrapper">
            <label for="message">Email</label>
            <div class="error-message" id="name">* Name is required</div>
          </div>
          <input type="text" id="name" name="name" required />
        </div>
      </form>
    </div>
    <div class="block">
      <h6>Follow Me</h6>
      <p>Be sure to see the latest and greatest content from me:</p>
      <div class="icons">
        <a href="https://github.com/ChristopherLMiller" target="_blank" aria-label="GitHub profile"><img src="https://cdn.itsmillertime.dev/6/github_a145b04078.svg" alt="github icon" /></a>
        <a href="https://www.linkedin.com/in/christopher-l-miller/" target="_blank" aria-label="LinkedIn profile"><img src="https://cdn.itsmillertime.dev/6/linkedin_3376a13066.svg" alt="linkedin icon" /></a>
        <a href="https://www.instagram.com/moose51789/" target="_blank" aria-label="Instagram"><img src="https://cdn.itsmillertime.dev/6/instagram_a24a931e4d.svg" alt="instagram icon" /></a>
        <a href="https://www.youtube.com/channel/UCn0P6xSTSYMML80hwj7FDZg" target="_blank" aria-label="YouTube Channel"><img src="https://cdn.itsmillertime.dev/6/youtube_df6751d4bb.svg" alt="youtube icon" /></a>
      </div>

      <h6>Usage</h6>
      <p>Use of this site constitutes your agreement to our <a href="/privacy-policy">Privacy Policy</a>.  The material on this site may not be reproduced, distributed,
        transmitted, cached or otherwise used, except with prior written
        permission of Its Miller Time Dev.</p>

      <p>Copyright &copy; 2017-{new Date().getFullYear()}</p>
    </div>
  </div>
  <div class="bottom-bar">
    ItsMillerTime | v{PKG.version}
  </div>
</footer>

<style lang="postcss">
  footer {
    grid-area: footer;
    background: var(--color-tertiary-lighter);
    display: grid;
    margin-block-start: 3rem;
    grid-template-areas: "l-margin footer-content r-margin" "footer-bottom-bar footer-bottom-bar footer-bottom-bar";
    grid-template-columns:
      [l-margin] minmax(var(--side-margins), auto) [footer-content] minmax(
        0px,
        1200px
      )
      [r-margin] minmax(var(--side-margins), auto);
    box-shadow: var(--box-shadow-elev-1);
    font-family: var(--font-roboto);
    font-weight: 300;
    letter-spacing: 2px;
  }

  .footer-content {
    grid-area: footer-content;
    display: grid;
    gap: 3rem;
    padding: 3rem;
    grid-template-columns: repeat(1, 1fr);
    color: var(--color-tertiary-darker);

    @media (min-width: 650px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .block {
    text-align: center;
    
    h6 {
      font-size: var(--fs-m);
      font-family: var(--font-oswald);
      color: var(--color-primary-darker);
      text-transform: uppercase;
      letter-spacing: 5px;
    }

    p {
      padding-block-end: 1rem;
      line-height: 1em;
    }
  }

  .bottom-bar {
    grid-area: footer-bottom-bar;
    background: var(--color-tertiary-darker);
    font-size: var(--fs-xs);
    font-family: var(--font-permanent-marker);
    line-height: 1em;
    display: flex;
    justify-content: end;
    align-items: center;
    padding-inline: 2rem;
    height: var(--top-bar-height);
    box-shadow: var(--box-shadow-elev-1);

  }

  .icons {
    display: flex;
    justify-content: space-evenly;
    padding-block-end: 3rem;

    a {
      border: none;

      img {
        height: 50px;
        width: 50px;
        transition: all 0.5s ease-in-out;
        transform-origin: center;

        &:hover {
          transform:scale(1.1) rotate(360deg);
        }
      }
    }
  }
</style>
