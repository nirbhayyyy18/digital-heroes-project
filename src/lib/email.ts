import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.");
    return {
      success: false,
      error: "Email service is not configured.",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend email error:", error);

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("Email sending failed:", error);

    return {
      success: false,
      error: error?.message || "Failed to send email.",
    };
  }
}