import nodemailer from "nodemailer";

/**
 * Send an OTP code to a user's email address using Gmail SMTP.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const rawPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !rawPass) {
    console.error("[email] Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars.");
    console.log(`[email] Fallback OTP for ${to}: ${otp}`);
    return false;
  }

  // Strip any spaces from app password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const gmailPass = rawPass.replace(/\s+/g, "");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const mailOptions = {
    from: `"Shopply Support" <${gmailUser}>`,
    to,
    subject: `Your Shopply Verification Code: ${otp}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:26px;font-weight:700;color:#0f172a;margin:0;">Shopply</h1>
          <p style="font-size:14px;color:#64748b;margin:4px 0 0;">Account Verification</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <p style="font-size:15px;color:#334155;margin:0 0 16px;">Here is your 6-digit verification code:</p>
          <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#ffffff;font-size:36px;font-weight:800;letter-spacing:10px;padding:16px 32px;border-radius:12px;">
            ${otp}
          </div>
        </div>
        <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">This code expires in <strong>5 minutes</strong>. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] OTP email successfully sent to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[email] SMTP sendMail error for ${to}:`, err?.message || err);
    throw new Error(`Failed to send email: ${err?.message || "SMTP connection failed"}`);
  }
}
