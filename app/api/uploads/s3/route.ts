import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPresignedUpload, type UploadEndpoint, validateUploadInput } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const endpoint = body.endpoint as UploadEndpoint;
    const fileName = body.fileName as string;
    const fileType = body.fileType as string;
    const fileSize = Number(body.fileSize);

    validateUploadInput(endpoint, {
      name: fileName,
      type: fileType,
      size: fileSize,
    });

    const upload = await createPresignedUpload({
      endpoint,
      fileName,
      fileType,
      userId: session.user.id,
    });

    return NextResponse.json(upload);
  } catch (error) {
    console.error("[S3_PRESIGN]", error);

    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }

    return new NextResponse("Internal Error", { status: 500 });
  }
}
