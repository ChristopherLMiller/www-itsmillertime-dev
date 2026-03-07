<script lang="ts">
	import pkg from '../../package.json';

	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

		submitting = true;
		error = null;

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formData.get('name'),
					email: formData.get('email'),
					message: formData.get('message')
				})
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error ?? 'Failed to send message';
				return;
			}

			success = true;
			form.reset();
		} catch (err) {
			error = 'Failed to send message. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<footer>
  <div class="footer-content">
    <div class="block">
      <h6>Contact Me</h6>
      <p>Reach out to me today with any questions or concerns, or anything else I may be able to do for you!</p>
      
      <form onsubmit={handleSubmit}>
        <div class="input-wrapper">
          <label for="contact-name">Name</label>
          <input type="text" id="contact-name" name="name" required disabled={submitting} />
        </div>
        
        <div class="input-wrapper">
          <label for="contact-email">Email</label>
          <input type="email" id="contact-email" name="email" required disabled={submitting} />
        </div>

        <div class="input-wrapper">
          <label for="contact-message">Message</label>
          <textarea id="contact-message" name="message" rows="4" required disabled={submitting}></textarea>
        </div>

        {#if error}
          <p class="form-error" role="alert">{error}</p>
        {/if}

        {#if success}
          <p class="form-success">Thanks! Your message has been sent.</p>
        {/if}

        <button type="submit" class="submit-btn" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send'}
        </button>
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
    ItsMillerTime | v{pkg.version}
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

  .input-wrapper {
    margin-block-end: 1rem;
    text-align: left;

    label {
      display: block;
      font-size: var(--fs-xs);
      margin-block-end: 0.25rem;
      color: var(--color-tertiary-darkest);
    }

    input,
    textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 2px solid var(--color-tertiary-lightest);
      border-radius: 4px;
      font-family: var(--font-roboto);
      font-size: var(--fs-base);
      background: var(--color-white-lightest);
      color: var(--color-tertiary-darkest);
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.7;
      }
    }

    textarea {
      resize: vertical;
      min-height: 4rem;
    }
  }

  .form-error {
    color: var(--color-primary-darker);
    font-size: var(--fs-xs);
    margin-block-end: 0.5rem;
  }

  .form-success {
    color: oklch(0.4 0.15 145);
    font-size: var(--fs-xs);
    margin-block-end: 0.5rem;
  }

  .submit-btn {
    padding: 0.5rem 1.5rem;
    border: 2px solid var(--color-primary);
    border-radius: 4px;
    background: var(--color-primary);
    color: var(--color-white-lightest);
    font-family: var(--font-roboto);
    font-size: var(--fs-base);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: var(--color-primary-darker);
      border-color: var(--color-primary-darker);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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
