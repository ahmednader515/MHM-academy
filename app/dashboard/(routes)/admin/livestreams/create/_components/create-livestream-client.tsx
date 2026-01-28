"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, Link, Video } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import {
  CURRICULA,
  getGradesByLanguage,
  getGradesByLevel,
  getLanguagesByLevel,
  getLevelsByCurriculum,
} from "@/lib/data/curriculum-data";

interface Course {
  id: string;
  title: string;
  targetCurriculum?: string | null;
  targetCurriculumType?: string | null;
  targetLevel?: string | null;
  targetLanguage?: string | null;
  targetGrade?: string | null;
}

export default function CreateLiveStreamClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const courseIdFromQuery = searchParams.get("courseId");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meetingUrl: "",
    courseId: courseIdFromQuery || "",
    scheduledAt: "",
    duration: "",
  });

  // Filter states
  const [selectedCurriculumType, setSelectedCurriculumType] = useState<string>("");
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/admin/courses/all");
        if (response.ok) {
          const data = await response.json();
          setCourses(data);

          if (courseIdFromQuery) {
            const preselectedCourse = data.find(
              (course: Course) => course.id === courseIdFromQuery
            );
            if (preselectedCourse) {
              setFormData((prev) => ({ ...prev, courseId: courseIdFromQuery }));
            } else {
              toast.error(
                t("admin.courseNotFound") ||
                  "Pre-selected course not found or not accessible."
              );
            }
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error(t("common.error") || "Error loading courses");
      }
    };

    fetchCourses();
  }, [courseIdFromQuery, t]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.meetingUrl || !formData.courseId) {
      toast.error(t("admin.fillRequiredFields"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/livestreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          scheduledAt: formData.scheduledAt
            ? new Date(formData.scheduledAt).toISOString()
            : null,
          duration: formData.duration ? parseInt(formData.duration) : null,
        }),
      });

      if (response.ok) {
        toast.success(t("admin.liveStreamCreatedSuccessfully"));
        router.push("/dashboard/admin/livestreams");
      } else {
        const error = await response.json();
        toast.error(error?.error || t("admin.errorOccurred"));
      }
    } catch {
      toast.error(t("admin.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  // Get available options based on selections
  const availableLevels = selectedCurriculum
    ? getLevelsByCurriculum(selectedCurriculum as any)
    : [];

  const availableLanguages =
    selectedCurriculum && selectedLevel
      ? getLanguagesByLevel(selectedCurriculum as any, selectedLevel as any)
      : [];

  const availableGrades =
    selectedCurriculum && selectedLevel
      ? selectedLanguage
        ? getGradesByLanguage(
            selectedCurriculum as any,
            selectedLevel as any,
            selectedLanguage as any
          )
        : getGradesByLevel(selectedCurriculum as any, selectedLevel as any)
      : [];

  // Handle filter changes
  const handleCurriculumTypeChange = (value: string) => {
    setSelectedCurriculumType(value === "all" ? "" : value);
    setSelectedLevel("");
    setSelectedLanguage("");
    setSelectedGrade("");
    setFormData((prev) => ({ ...prev, courseId: "" }));
  };

  const handleCurriculumChange = (value: string) => {
    const newCurriculum = value === "all" ? "" : value;
    setSelectedCurriculum(newCurriculum);
    if (newCurriculum !== "egyptian") setSelectedCurriculumType("");
    setSelectedLevel("");
    setSelectedLanguage("");
    setSelectedGrade("");
    setFormData((prev) => ({ ...prev, courseId: "" }));
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value === "all" ? "" : value);
    setSelectedLanguage("");
    setSelectedGrade("");
    setFormData((prev) => ({ ...prev, courseId: "" }));
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value === "all" ? "" : value);
    setSelectedGrade("");
    setFormData((prev) => ({ ...prev, courseId: "" }));
  };

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value === "all" ? "" : value);
    setFormData((prev) => ({ ...prev, courseId: "" }));
  };

  // Filter courses based on selected criteria
  const filteredCourses = useMemo(() => {
    let filtered = courses;

    if (selectedCurriculum === "egyptian" && selectedCurriculumType) {
      filtered = filtered.filter(
        (course) =>
          !course.targetCurriculumType ||
          course.targetCurriculumType === selectedCurriculumType
      );
    }

    if (selectedCurriculum) {
      filtered = filtered.filter(
        (course) => !course.targetCurriculum || course.targetCurriculum === selectedCurriculum
      );
    }

    if (selectedLevel) {
      filtered = filtered.filter(
        (course) => !course.targetLevel || course.targetLevel === selectedLevel
      );
    }

    if (selectedLanguage) {
      filtered = filtered.filter(
        (course) => !course.targetLanguage || course.targetLanguage === selectedLanguage
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter(
        (course) => !course.targetGrade || course.targetGrade === selectedGrade
      );
    }

    return filtered;
  }, [
    courses,
    selectedCurriculum,
    selectedCurriculumType,
    selectedGrade,
    selectedLanguage,
    selectedLevel,
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
        <h1 className="text-3xl font-bold">{t("admin.createLiveStream")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {t("admin.liveStreamDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Filter Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <Label className="text-base font-semibold">
                {t("admin.filterCourses") || "Filter Courses"}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Curriculum */}
                <div className="space-y-2">
                  <Label className="text-sm">{t("admin.curriculum")}</Label>
                  <Select
                    value={selectedCurriculum || "all"}
                    onValueChange={handleCurriculumChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.selectCurriculum")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      {CURRICULA.map((curriculum) => (
                        <SelectItem key={curriculum.id} value={curriculum.id}>
                          {curriculum.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Curriculum Type (Egyptian only) */}
                {selectedCurriculum === "egyptian" && (
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {t("admin.curriculumType") || "Curriculum Type"}
                    </Label>
                    <Select
                      value={selectedCurriculumType || "all"}
                      onValueChange={handleCurriculumTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("admin.selectCurriculumType") || "Select Type"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        <SelectItem value="morning">
                          {t("admin.morning") || "Morning"}
                        </SelectItem>
                        <SelectItem value="evening">
                          {t("admin.evening") || "Evening"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Level */}
                {selectedCurriculum && availableLevels.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("admin.level")}</Label>
                    <Select value={selectedLevel || "all"} onValueChange={handleLevelChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.selectLevel")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {availableLevels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Language */}
                {selectedCurriculum && selectedLevel && availableLanguages.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("admin.language")}</Label>
                    <Select
                      value={selectedLanguage || "all"}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.selectLanguage")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {availableLanguages.map((language) => (
                          <SelectItem key={language.id} value={language.id}>
                            {language.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Grade */}
                {selectedCurriculum && selectedLevel && availableGrades.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("admin.grade")}</Label>
                    <Select value={selectedGrade || "all"} onValueChange={handleGradeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.selectGrade")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {availableGrades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">{t("admin.liveStreamTitle")} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder={t("admin.enterLiveStreamTitle")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseId">{t("admin.course")} *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => handleInputChange("courseId", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.selectCourse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCourses.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t("admin.noCoursesFound") || "No courses found"}
                      </SelectItem>
                    ) : (
                      filteredCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {filteredCourses.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.coursesAvailable", { count: filteredCourses.length })}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("admin.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder={t("admin.enterDescription")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingUrl">{t("admin.meetingUrl")} *</Label>
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="meetingUrl"
                  value={formData.meetingUrl}
                  onChange={(e) => handleInputChange("meetingUrl", e.target.value)}
                  placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">{t("admin.meetingUrlHelp")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">{t("admin.scheduledAt")}</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => handleInputChange("scheduledAt", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">{t("admin.duration")}</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", e.target.value)}
                    placeholder={t("admin.durationInMinutes")}
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#090919] hover:bg-[#090919]/90 text-white"
              >
                {loading ? t("admin.creating") : t("admin.createLiveStream")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


