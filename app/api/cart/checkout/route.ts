import { NextResponse } from "next/server";
import { POST as createOrder } from "../../orders/route";

export async function POST(req: Request) {
  return createOrder(req);
}
