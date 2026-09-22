import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return Response.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const to = body.email || profile.email;

    if (!to) {
      return Response.json(
        { error: "Recipient email is required." },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject: "Digital Heroes — Email Test",
      html: `
        <!DOCTYPE html>
        <html>
          <body
            style="
              margin:0;
              padding:0;
              background:#f5f5f0;
              font-family:Arial,sans-serif;
            "
          >
            <div
              style="
                max-width:600px;
                margin:40px auto;
                background:#ffffff;
                padding:40px;
                border-radius:16px;
              "
            >
              <h1 style="font-size:28px;margin:0 0 20px;">
                Email is working 🎉
              </h1>

              <p style="font-size:16px;line-height:1.6;">
                Hi ${profile.full_name || "Admin"},
              </p>

              <p style="font-size:16px;line-height:1.6;">
                This is a test email from your Digital Heroes application.
              </p>

              <p style="font-size:16px;line-height:1.6;">
                Your Resend integration is working correctly.
              </p>

              <p
                style="
                  margin-top:30px;
                  font-size:14px;
                  color:#666;
                "
              >
                Digital Heroes
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (!result.success) {
      return Response.json(
        {
          error: result.error || "Failed to send email.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Test email sent successfully.",
    });
  } catch (error: any) {
    console.error("Test email error:", error);

    return Response.json(
      {
        error: error?.message || "Unable to send test email.",
      },
      { status: 500 }
    );
  }
}