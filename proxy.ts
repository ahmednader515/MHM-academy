import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Helper function to get dashboard URL by role
function getDashboardUrlByRole(role: string): string {
  switch (role) {
    case "TEACHER":
      return "/dashboard/teacher/courses";
    case "ADMIN":
      return "/dashboard/admin/users";
    case "PARENT":
      return "/dashboard/parent";
    case "USER":
    default:
      return "/dashboard";
  }
}

export async function proxy(request: NextRequest) {
  // Get the token using next-auth v5 compatible method
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  });

  const pathname = request.nextUrl.pathname;
  const isTeacherRoute = pathname.startsWith("/dashboard/teacher");
  const isTeacher = token?.role === "TEACHER";
  const isParentRoute = pathname.startsWith("/dashboard/parent");
  const isParent = token?.role === "PARENT";
  const isAuthPage = pathname.startsWith("/sign-in") || 
                    pathname.startsWith("/sign-up") ||
                    pathname.startsWith("/forgot-password") ||
                    pathname.startsWith("/reset-password");
  
  // Add check for payment status page
  const isPaymentStatusPage = pathname.includes("/payment-status");

  // If user is on auth page and is authenticated, redirect to appropriate dashboard
  if (isAuthPage && token) {
    const userRole = token.role as string || "USER";
    const dashboardUrl = getDashboardUrlByRole(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // If user is not authenticated and trying to access protected routes
  // But exclude payment status page from this check
  if (!token && !isAuthPage && !isPaymentStatusPage) {
    return NextResponse.redirect(new URL("/sign-in", request.url), { status: 302 });
  }

  // Check for admin routes
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  const isAdmin = token?.role === "ADMIN";

  // If user is not a teacher or admin but trying to access teacher routes
  if (isTeacherRoute && !(isTeacher || isAdmin)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not a parent but trying to access parent routes
  if (isParentRoute && !isParent) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not an admin but trying to access admin routes
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user accesses main dashboard, redirect to role-specific dashboard
  if (pathname === "/dashboard" && token) {
    const userRole = token.role as string || "USER";
    const dashboardUrl = getDashboardUrlByRole(userRole);
    
    // Only redirect if the user's role-specific dashboard is different from the main dashboard
    if (userRole !== "USER") {
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Handle POST requests to payment status page
  if (isPaymentStatusPage && request.method === "POST") {
    // Convert POST to GET by redirecting to the same URL
    return NextResponse.redirect(request.url, { status: 303 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|hero-img.jpg|logo.png|male.png|egypt.png|egypt.jpg|saudi.jpg|idea.png|saudi-arabia.png|summer.jpg|whatsapp.png|$).*)",
  ],
};

