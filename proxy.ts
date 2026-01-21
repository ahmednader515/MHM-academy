import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Helper function to get dashboard URL by role
function getDashboardUrlByRole(role: string): string {
  switch (role) {
    case "TEACHER":
      return "/dashboard/teacher/courses";
    case "ADMIN":
      return "/dashboard/admin/staff";
    case "SUPERVISOR":
      return "/dashboard/supervisor/staff";
    case "PARENT":
      return "/dashboard/parent";
    case "USER":
    default:
      return "/dashboard";
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/sign-in") || 
                    pathname.startsWith("/sign-up") ||
                    pathname.startsWith("/forgot-password") ||
                    pathname.startsWith("/reset-password");
  
  // Add check for payment status page
  const isPaymentStatusPage = pathname.includes("/payment-status");

  // Check if there's a session cookie in the request (might be set but not yet readable by getToken)
  const hasSessionCookie = request.cookies.has('next-auth.session-token') || 
                          request.cookies.has('__Secure-next-auth.session-token');

  // Get the token using next-auth v5 compatible method
  // getToken automatically detects the cookie name based on environment
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  });

  const isTeacherRoute = pathname.startsWith("/dashboard/teacher");
  const isTeacher = token?.role === "TEACHER";
  const isParentRoute = pathname.startsWith("/dashboard/parent");
  const isParent = token?.role === "PARENT";

  // If user is on auth page and is authenticated, redirect to appropriate dashboard
  if (isAuthPage && token) {
    const userRole = token.role as string || "USER";
    const dashboardUrl = getDashboardUrlByRole(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // If user is not authenticated and trying to access protected routes
  // But exclude payment status page from this check
  // IMPORTANT: If a session cookie exists but token couldn't be read, 
  // it's likely a timing issue (cookie just set). Allow the request through
  // and let the page component handle authentication (it will redirect if needed)
  if (!token && !isAuthPage && !isPaymentStatusPage) {
    // If we have a session cookie but couldn't read the token, 
    // it might be a timing issue - allow the request through
    // The page itself will handle authentication via auth() check
    if (hasSessionCookie) {
      // Cookie exists but token couldn't be read yet - likely timing issue
      // Let the request through and let the server component handle it
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url), { status: 302 });
  }

  const role = (token?.role as string | undefined) || "USER";

  // Check for admin routes
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  const isAdmin = role === "ADMIN";

  // Check for supervisor routes
  const isSupervisorRoute = pathname.startsWith("/dashboard/supervisor");
  const isSupervisor = role === "SUPERVISOR";

  // If user is not a teacher or admin but trying to access teacher routes
  // Only redirect if we have a token (meaning user is authenticated but wrong role)
  if (isTeacherRoute && token && !(isTeacher || isAdmin)) {
    const dashboardUrl = isAdmin ? "/dashboard/admin/staff" : isSupervisor ? "/dashboard/supervisor/staff" : "/dashboard";
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // If user is not a parent but trying to access parent routes
  if (isParentRoute && !isParent) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not an admin but trying to access admin routes
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not a supervisor but trying to access supervisor routes
  if (isSupervisorRoute && !isSupervisor) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is a supervisor, block access to admin routes entirely
  if (isAdminRoute && isSupervisor) {
    return NextResponse.redirect(new URL("/dashboard/supervisor/staff", request.url));
  }

  // If user accesses main dashboard, redirect to role-specific dashboard
  if (pathname === "/dashboard" && token) {
    const userRole = role || "USER";
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

