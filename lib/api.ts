import { NextResponse } from "next/server";
export function ok(data: any, status = 200) { return NextResponse.json(data, { status }); }
export function err(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export function httpStatus(e: any, fallback = 500) {
  const s = (e as any)?.status;
  return typeof s === "number" ? s : fallback;
}
