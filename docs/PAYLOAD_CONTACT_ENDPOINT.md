# Payload Contact Form Endpoint

The www site POSTs contact form submissions to `{PUBLIC_PAYLOAD_URL}/api/contact-form`. Add this endpoint in your Payload CMS project.

You can add it to a job queue for async processing, or send immediately via `payload.sendEmail()`.

## Example endpoint

Create in your Payload project (e.g. `src/endpoints/contact-form.ts`):

```ts
import type { PayloadHandler } from 'payload/config';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const contactFormEndpoint: PayloadHandler = async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json?.().catch(() => ({}));

  if (!body?.name?.trim() || !body?.email?.trim() || !body?.message?.trim()) {
    return Response.json(
      { error: 'Name, email, and message are required' },
      { status: 400 }
    );
  }

  const toEmail = process.env.CONTACT_EMAIL;
  if (!toEmail) {
    return Response.json(
      { error: 'Contact form recipient is not configured' },
      { status: 500 }
    );
  }

  // Option A: Add to job queue for async processing
  // await req.payload.addJob('contact-form', { name, email, message });

  // Option B: Send immediately via Resend
  await req.payload.sendEmail({
    to: toEmail,
    replyTo: body.email.trim(),
    subject: `Contact form: ${body.name.trim()}`,
    html: `
      <p><strong>From:</strong> ${escapeHtml(body.name.trim())} &lt;${escapeHtml(body.email.trim())}&gt;</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(body.message.trim()).replace(/\n/g, '<br>')}</p>
    `,
  });

  return Response.json({ success: true });
};
```

Register in your Payload config:

```ts
{
  path: '/contact-form',
  method: 'post',
  handler: contactFormEndpoint,
}
```

Ensure the endpoint allows unauthenticated POST (public contact form).
