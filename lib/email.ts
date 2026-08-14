interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

/** Default in dev / until a real provider is configured — logs instead of sending. */
class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    console.log(`[email:console] to=${input.to} subject="${input.subject}"`);
    console.log(input.text ?? input.html);
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private from: string) {}

  async send(input: SendEmailInput): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Email provider returned ${res.status}`);
    }
  }
}

function buildProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "resend" && process.env.RESEND_API_KEY) {
    return new ResendEmailProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM ?? "no-reply@example.com");
  }
  return new ConsoleEmailProvider();
}

const provider = buildProvider();

export async function sendEmail(input: SendEmailInput): Promise<void> {
  await provider.send(input);
}
