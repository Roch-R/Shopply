const crypto = require("crypto");

const JWT_SECRET = "shopply_secret_key_123456789";

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

async function testTypingFlow() {
  const reponteId = 1783655570856;
  const rochellId = 1783590526824;

  const reponteToken = generateToken({ userId: reponteId });
  const rochellToken = generateToken({ userId: rochellId });

  console.log("1. Sending typing indicator POST request from Reponte to Rochell...");
  try {
    const postRes = await fetch(`https://shopply-nine.vercel.app/api/chat/${rochellId}/typing`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${reponteToken}`
      }
    });
    console.log(`POST response: ${postRes.status} ${postRes.statusText}`);
    console.log(await postRes.text());
  } catch (err) {
    console.error("POST fetch error:", err);
  }

  console.log("\n2. Immediately fetching messages GET request from Rochell's perspective...");
  try {
    const getRes = await fetch(`https://shopply-nine.vercel.app/api/chat/${reponteId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${rochellToken}`
      }
    });
    console.log(`GET response: ${getRes.status} ${getRes.statusText}`);
    const body = await getRes.json();
    console.log(`GET response contains: is_typing = ${body.is_typing}`);
  } catch (err) {
    console.error("GET fetch error:", err);
  }
}

testTypingFlow();
