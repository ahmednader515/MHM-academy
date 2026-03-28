import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "UploadThing is no longer used. Use /api/uploads/s3 instead." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ message: "UploadThing is no longer used. Use /api/uploads/s3 instead." }, { status: 410 });
}
