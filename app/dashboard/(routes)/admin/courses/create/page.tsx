import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const AdminCreateCoursePage = async () => {
  const { userId, user } = await auth();

  if (!userId) {
    return redirect("/");
  }

  // Only admin can create courses through admin dashboard
  if (user?.role !== "ADMIN") {
    return redirect("/dashboard");
  }

  const course = await db.course.create({
    data: {
      userId,
      title: "Untitled Course",
    },
  });

  // Redirect to admin course edit page
  return redirect(`/dashboard/admin/courses/${course.id}`);
};

export default AdminCreateCoursePage;


