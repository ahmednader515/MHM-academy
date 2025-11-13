import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, user } = await auth();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Only for students
    if (user.role !== "USER") {
      return NextResponse.json({ newContent: [] });
    }

    // Get courses the student has purchased
    const purchases = await db.purchase.findMany({
      where: {
        userId: userId,
        status: "ACTIVE"
      },
      select: {
        courseId: true
      }
    });

    const courseIds = purchases.map(p => p.courseId);

    if (courseIds.length === 0) {
      return NextResponse.json({ newContent: [] });
    }

    // Define "new" as published in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch new chapters
    const newChapters = await db.chapter.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        updatedAt: { gte: sevenDaysAgo }
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Fetch new quizzes
    const newQuizzes = await db.quiz.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        updatedAt: { gte: sevenDaysAgo }
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Fetch new livestreams
    const newLiveStreams = await db.liveStream.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        updatedAt: { gte: sevenDaysAgo }
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Fetch new certificates for this student
    const newCertificates = await db.certificate.findMany({
      where: {
        studentId: userId,
        createdAt: { gte: sevenDaysAgo }
      },
      include: {
        assigner: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Combine and format all new content
    const newContent = [
      ...newChapters.map(chapter => ({
        id: chapter.id,
        type: 'chapter' as const,
        title: chapter.title,
        description: chapter.description,
        courseId: chapter.courseId,
        courseTitle: chapter.course.title,
        courseImage: chapter.course.imageUrl,
        createdAt: chapter.updatedAt,
        link: `/courses/${chapter.courseId}/chapters/${chapter.id}`
      })),
      ...newQuizzes.map(quiz => ({
        id: quiz.id,
        type: 'quiz' as const,
        title: quiz.title,
        description: quiz.description,
        courseId: quiz.courseId,
        courseTitle: quiz.course.title,
        courseImage: quiz.course.imageUrl,
        createdAt: quiz.updatedAt,
        link: `/courses/${quiz.courseId}/quizzes/${quiz.id}`
      })),
      ...newLiveStreams.map(stream => ({
        id: stream.id,
        type: 'livestream' as const,
        title: stream.title,
        description: stream.description,
        courseId: stream.courseId,
        courseTitle: stream.course.title,
        courseImage: stream.course.imageUrl,
        createdAt: stream.updatedAt,
        scheduledAt: stream.scheduledAt,
        link: `/courses/${stream.courseId}/livestreams/${stream.id}`
      })),
      ...newCertificates.map(cert => ({
        id: cert.id,
        type: 'certificate' as const,
        title: cert.title || 'Certificate',
        description: cert.description,
        assignerName: cert.assigner.fullName,
        imageUrl: cert.imageUrl,
        createdAt: cert.createdAt,
        link: '/dashboard/certificates'
      }))
    ];

    // Sort by creation date (newest first)
    newContent.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ newContent: newContent.slice(0, 15) });
  } catch (error) {
    console.error("[NEW_CONTENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

