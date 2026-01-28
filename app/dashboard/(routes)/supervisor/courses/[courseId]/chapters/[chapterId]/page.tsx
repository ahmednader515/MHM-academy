import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChapterPageContent } from "@/app/dashboard/(routes)/admin/courses/[courseId]/chapters/[chapterId]/_components/chapter-page-content";

export default async function SupervisorChapterPage({
    params,
}: {
    params: Promise<{ courseId: string; chapterId: string }>
}) {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;

    const session = await auth();

    if (!session?.user) {
        return redirect("/");
    }

    const userId = session.user.id;
    const user = session.user;

    // Only supervisor or admin can access this page
    if (user.role !== "SUPERVISOR" && user.role !== "ADMIN") {
        return redirect("/dashboard");
    }

    const chapter = await db.chapter.findUnique({
        where: {
            id: chapterId,
            courseId: courseId
        },
        include: {
            attachments: {
                orderBy: {
                    position: 'asc',
                },
            },
            course: {
                select: {
                    isFree: true
                }
            }
        }
    });

    if (!chapter) {
        return redirect(`/dashboard/supervisor/courses/${courseId}`);
    }

    const requiredFields = [
        chapter.title,
        chapter.description,
        chapter.videoUrl
    ];

    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(Boolean).length;

    const completionText = `(${completedFields}/${totalFields})`;

    return (
        <ChapterPageContent
            chapter={chapter}
            courseId={courseId}
            chapterId={chapterId}
            completionText={completionText}
            courseIsFree={chapter.course.isFree}
            isAdmin={true}
            basePath="/dashboard/supervisor"
        />
    );
}

