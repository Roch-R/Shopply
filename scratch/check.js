const crypto = require("crypto");

const JWT_SECRET = "shopply_secret_key_123456789";

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

async function testLiveApi() {
  const senderId = 1783655570856; // Reponte's ID
  const receiverId = 1783590526824; // Rochell's ID
  const token = generateToken({ userId: senderId });

  console.log("Generated JWT Token for Reponte:", token);
  console.log("Sending POST request from Reponte to Rochell...");

  const formData = new FormData();
  formData.append("message", "Hello Rochell, this is Reponte!");

  try {
    const res = await fetch(`https://shopply-nine.vercel.app/api/chat/${receiverId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch request error:", err);
  }
}

testLiveApi();
