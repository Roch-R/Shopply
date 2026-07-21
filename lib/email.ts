import nodemailer from "nodemailer";

/**
 * Send a real OTP code to a user's Gmail address using Gmail SMTP.
 * Tries Port 587 (STARTTLS) first, and falls back to Port 465 (SSL).
 */
export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const rawPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !rawPass) {
    throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not configured in Vercel.");
  }

  // Clean app password (remove any spaces)
  const gmailPass = rawPass.replace(/\s+/g, "");

  const mailOptions = {
    from: `"Shopply" <${gmailUser}>`,
    to,
    subject: `Your Shopply Verification Code is ${otp}`,
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
        <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">This code expires in <strong>5 minutes</strong>. If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  // Attempt 1: Port 587 (Standard STARTTLS for serverless Vercel)
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] OTP email sent via Port 587 to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (err1: any) {
    console.warn(`[email] Port 587 failed (${err1?.message}), trying Port 465 fallback...`);

    // Attempt 2: Port 465 (SSL fallback)
    try {
      const transporter465 = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        connectionTimeout: 8000,
      });

      const info465 = await transporter465.sendMail(mailOptions);
      console.log(`[email] OTP email sent via Port 465 to ${to}. MessageId: ${info465.messageId}`);
      return true;
    } catch (err2: any) {
      console.error(`[email] All SMTP attempts failed for ${to}:`, err2?.message || err2);
      throw new Error(`Gmail SMTP delivery failed: ${err2?.message || err1?.message || "Connection refused"}`);
    }
  }
}
