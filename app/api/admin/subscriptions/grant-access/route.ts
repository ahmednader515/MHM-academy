import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { grantAccessToAllActiveSubscriptions } from "@/lib/subscription-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await grantAccessToAllActiveSubscriptions();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[GRANT_SUBSCRIPTION_ACCESS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

