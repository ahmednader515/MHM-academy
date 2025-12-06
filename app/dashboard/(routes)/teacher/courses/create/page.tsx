import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CreatePage = async () => {
    const session = await auth();

    if (!session?.user) {
        return redirect("/sign-in");
    }

    const userId = session.user.id;
    const user = session.user;

    // Ensure only teachers can access this page
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
        return redirect("/dashboard");
    }

    const course = await db.course.create({
        data: {
            userId,
            title: "مادة غير معرفة",
        }
    });

    return redirect(`/dashboard/teacher/courses/${course.id}`);
};

export default CreatePage; 