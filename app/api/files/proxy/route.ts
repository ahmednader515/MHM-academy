import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getS3ObjectByUrl } from "@/lib/s3";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const url = searchParams.get("url");

        if (!url) {
            return new NextResponse("Missing file url", { status: 400 });
        }

        const object = await getS3ObjectByUrl(url);
        if (!object?.Body) {
            return new NextResponse("File not found", { status: 404 });
        }

        const body = object.Body.transformToWebStream();
        const headers = new Headers();
        headers.set("Content-Type", object.ContentType || "application/octet-stream");
        headers.set("Cache-Control", "private, max-age=60");
        if (object.ContentLength) {
            headers.set("Content-Length", String(object.ContentLength));
        }

        return new NextResponse(body, { headers });
    } catch (error) {
        console.error("[FILE_PROXY]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
