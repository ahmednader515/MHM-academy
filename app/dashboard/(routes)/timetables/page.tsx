import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimetableViewContent } from "../teacher/timetables/_components/timetable-view-content";

const StudentTimetablesPage = async () => {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const userId = session.user.id;

  // Ensure only students can access this page
  if (session.user.role !== "USER") {
    return redirect("/dashboard");
  }

  // Fetch full user data from database to get curriculum, grade, language, etc.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      curriculum: true,
      curriculumType: true,
      grade: true,
      language: true,
      role: true,
    },
  });

  if (!user) {
    return redirect("/dashboard");
  }

  // Get timetables matching student's profile
  const conditions: any[] = [];
  const splitCsv = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  // Curriculum: if user has curriculum, timetable must either not specify curriculum or match user's curriculum
  if (user.curriculum) {
    conditions.push({
      OR: [
        { targetCurriculum: null },
        { targetCurriculum: user.curriculum },
      ],
    });
  } else {
    conditions.push({ targetCurriculum: null });
  }

  // Curriculum Type: if user has curriculumType, timetable must either not specify curriculumType or match user's curriculumType
  // If user doesn't have curriculumType, show all timetables (both with and without targetCurriculumType)
  if (user.curriculumType) {
    conditions.push({
      OR: [
        { targetCurriculumType: null },
        { targetCurriculumType: user.curriculumType },
      ],
    });
  }
  // If user has no curriculumType, don't filter by targetCurriculumType (show all)

  // Grade: if user has grade, timetable must either not specify grade or match user's grade
  if (user.grade) {
    const userGrades = splitCsv(user.grade);
    conditions.push({
      OR: [
        { targetGrade: null },
        ...userGrades.flatMap((g) => [
          { targetGrade: g },
          { targetGrade: { contains: `,${g},` } },
          { targetGrade: { startsWith: `${g},` } },
          { targetGrade: { endsWith: `,${g}` } },
        ]),
      ],
    });
  } else {
    conditions.push({ targetGrade: null });
  }

  // Section (Language): if user has language, timetable must either not specify section or match user's language
  if (user.language) {
    const userLanguages = splitCsv(user.language);
    conditions.push({
      OR: [
        { targetSection: null },
        ...userLanguages.flatMap((lang) => [
          { targetSection: lang },
          { targetSection: { contains: `,${lang},` } },
          { targetSection: { startsWith: `${lang},` } },
          { targetSection: { endsWith: `,${lang}` } },
        ]),
      ],
    });
  } else {
    conditions.push({ targetSection: null });
  }

  // Get timetables matching student's profile
  const timetables = await db.timetable.findMany({
    where: {
      AND: conditions,
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <TimetableViewContent timetables={timetables} role="student" />;
};

export default StudentTimetablesPage;

