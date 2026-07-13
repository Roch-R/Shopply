export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const message = `Your Shopply verification code is: ${otp}. Expires in 5 minutes.`;

  // 1. Semaphore API (Philippine SMS gateway)
  const semaphoreKey = process.env.SEMAPHORE_API_KEY;
  if (semaphoreKey) {
    try {
      console.log(`[SMS] Attempting to send to ${phone} via Semaphore...`);
      const res = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          apikey: semaphoreKey,
          number: phone,
          message: message,
        }),
      });
      if (res.ok) {
        console.log(`[SMS] Sent to ${phone} via Semaphore successfully.`);
        return true;
      }
      const errText = await res.text();
      console.error(`[SMS] Semaphore API failed:`, errText);
    } catch (err) {
      console.error(`[SMS] Semaphore error:`, err);
    }
  }

  // 2. Twilio API
  const twilioSid = process.env.TWILIO_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_NUMBER;
  if (twilioSid && twilioToken && twilioNumber) {
    try {
      let formattedPhone = phone;
      if (formattedPhone.startsWith("09") && formattedPhone.length === 11) {
        formattedPhone = "+63" + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith("9") && formattedPhone.length === 10) {
        formattedPhone = "+63" + formattedPhone;
      }

      console.log(`[SMS] Attempting to send to ${formattedPhone} via Twilio...`);
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioNumber,
          Body: message,
        }),
      });
      if (res.ok) {
        console.log(`[SMS] Sent to ${formattedPhone} via Twilio successfully.`);
        return true;
      }
      const errText = await res.text();
      console.error(`[SMS] Twilio API failed:`, errText);
    } catch (err) {
      console.error(`[SMS] Twilio error:`, err);
    }
  }

  console.log("-----------------------------------------");
  console.log(`[SMS MOCK] To: ${phone} | OTP: ${otp}`);
  console.log(`[SMS MOCK] Message: ${message}`);
  console.log("-----------------------------------------");
  return false;
}
