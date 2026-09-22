export function subscriptionActivatedEmail(params: {
  name: string;
  plan: string;
}) {
  const { name, plan } = params;

  return {
    subject: "Your Digital Heroes subscription is active",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;padding:40px;border-radius:16px;">
            
            <h1 style="margin:0 0 20px;font-size:28px;">
              Welcome to Digital Heroes 🎉
            </h1>

            <p style="font-size:16px;line-height:1.6;">
              Hi ${name},
            </p>

            <p style="font-size:16px;line-height:1.6;">
              Your Digital Heroes subscription has been successfully activated.
            </p>

            <div style="background:#f5f5f0;padding:20px;border-radius:12px;margin:25px 0;">
              <strong>Plan:</strong> ${plan}
            </div>

            <p style="font-size:16px;line-height:1.6;">
              You can now participate in the monthly draw, manage your scores,
              support your selected charity and track your winnings.
            </p>

            <p style="margin-top:30px;font-size:14px;color:#666;">
              Thank you for being part of Digital Heroes.
            </p>

          </div>
        </body>
      </html>
    `,
  };
}

export function subscriptionRenewedEmail(params: {
  name: string;
  plan: string;
  amount: string;
}) {
  const { name, plan, amount } = params;

  return {
    subject: "Your Digital Heroes subscription has been renewed",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;padding:40px;border-radius:16px;">

            <h1 style="margin:0 0 20px;font-size:28px;">
              Subscription renewed
            </h1>

            <p style="font-size:16px;line-height:1.6;">
              Hi ${name},
            </p>

            <p style="font-size:16px;line-height:1.6;">
              Your Digital Heroes subscription has been successfully renewed.
            </p>

            <div style="background:#f5f5f0;padding:20px;border-radius:12px;margin:25px 0;">
              <p style="margin:0 0 8px;">
                <strong>Plan:</strong> ${plan}
              </p>

              <p style="margin:0;">
                <strong>Amount:</strong> ${amount}
              </p>
            </div>

            <p style="font-size:16px;line-height:1.6;">
              Your subscription remains active and you can continue participating
              in Digital Heroes.
            </p>

          </div>
        </body>
      </html>
    `,
  };
}

export function paymentFailedEmail(params: {
  name: string;
}) {
  const { name } = params;

  return {
    subject: "Action required: Digital Heroes payment failed",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;padding:40px;border-radius:16px;">

            <h1 style="margin:0 0 20px;font-size:28px;">
              Payment failed
            </h1>

            <p style="font-size:16px;line-height:1.6;">
              Hi ${name},
            </p>

            <p style="font-size:16px;line-height:1.6;">
              We were unable to process your latest Digital Heroes subscription payment.
            </p>

            <p style="font-size:16px;line-height:1.6;">
              Please check your payment method and update it through your
              Stripe billing settings.
            </p>

            <p style="font-size:14px;color:#666;margin-top:30px;">
              If you have already resolved the issue, you can ignore this email.
            </p>

          </div>
        </body>
      </html>
    `,
  };
}

export function subscriptionCancelledEmail(params: {
  name: string;
  endDate?: string;
}) {
  const { name, endDate } = params;

  return {
    subject: "Your Digital Heroes subscription has been cancelled",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;padding:40px;border-radius:16px;">

            <h1 style="margin:0 0 20px;font-size:28px;">
              Subscription cancelled
            </h1>

            <p style="font-size:16px;line-height:1.6;">
              Hi ${name},
            </p>

            <p style="font-size:16px;line-height:1.6;">
              Your Digital Heroes subscription has been cancelled.
            </p>

            ${
              endDate
                ? `
                  <div style="background:#f5f5f0;padding:20px;border-radius:12px;margin:25px 0;">
                    <strong>Access ends:</strong> ${endDate}
                  </div>
                `
                : ""
            }

            <p style="font-size:16px;line-height:1.6;">
              Thank you for being part of Digital Heroes.
            </p>

          </div>
        </body>
      </html>
    `,
  };
}