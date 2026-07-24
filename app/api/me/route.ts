import { NextResponse } from "next/server";
import { getAuthUser, formatUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }
    if (user.is_blocked === true) {
      return NextResponse.json({
        message: "Your account has been suspended by the administrator.",
        is_blocked: true
      }, { status: 403 });
    }
    return NextResponse.json({ user: formatUser(user) }, { status: 200 });
  } catch (err: any) {
    console.error("[me] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
