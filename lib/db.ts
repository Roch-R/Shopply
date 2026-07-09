import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "shopply_secret_key_123456789";
const HASH_SALT = "shopply_password_salt_987654321";

// Password Hashing
export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", HASH_SALT).update(password).digest("hex");
}

export function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Lightweight JWT Tokens (No external dependencies)
export function generateToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

export function verifyToken(token: string): any | null {
  try {
    const [header, data, signature] = token.split(".");
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSig) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// User helper formatting matching backend structure
export function formatUser(userData: any): any {
  return {
    id: userData.id,
    name: userData.name,
    username: userData.username,
    email: userData.username,
    phone: userData.phone || null,
    avatar: userData.avatar || null,
    followers_count: userData.followers_count || 0,
    following_count: userData.following_count || 0,
    reviews_count: userData.reviews_count || 0,
    reviews_avg_rating: userData.reviews_avg_rating || 0.0,
    email_verified_at: userData.email_verified_at || null,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
  };
}

// Extract auth user from Request
export async function getAuthUser(req: Request): Promise<any | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;

    const userDocRef = doc(db, "users", String(decoded.userId));
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return null;
    return { ...userDoc.data(), id: decoded.userId };
  } catch (err) {
    console.error("[db] getAuthUser error:", err);
    return null;
  }
}
