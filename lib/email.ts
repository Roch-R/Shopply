import nodemailer from "nodemailer";

/**
 * Send an OTP code to a user's email address using Gmail SMTP.
 *
 * Required environment variables:
 * - GMAIL_USER: The Gmail address to send from (e.g. yourapp@gmail.com)
 * - GMAIL_APP_PASSWORD: A Google App Password (NOT your regular Gmail password)
 *
 * To create an App Password:
 * 1. Go to https://myaccount.google.com/apppasswords
 * 2. Select "Mail" and your device
 * 3. Copy the 16-character password
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.error("[email] Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars. OTP will only be logged.");
    console.log(`[email] OTP for ${to}: ${otp}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions = {
    from: `"Shopply" <${gmailUser}>`,
    to,
    subject: "Your Shopply Verification Code",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0;">Shopply</h1>
          <p style="font-size:14px;color:#94a3b8;margin:4px 0 0;">Account Verification</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <p style="font-size:15px;color:#475569;margin:0 0 16px;">Use this verification code to complete your registration:</p>
          <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-size:36px;font-weight:800;letter-spacing:12px;padding:16px 32px;border-radius:12px;">
            ${otp}
          </div>
        </div>
        <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">This code expires in <strong>5 minutes</strong>. If you didn't request this, ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[email] OTP email sent to ${to}`);
}
