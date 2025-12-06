import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChapterPageContent } from "./_components/chapter-page-content";

export default async function ChapterPage({
    params,
}: {
    params: Promise<{ courseId: string; chapterId: string }>
}) {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;

    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
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
        return redirect("/");
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
        />
    );
} 