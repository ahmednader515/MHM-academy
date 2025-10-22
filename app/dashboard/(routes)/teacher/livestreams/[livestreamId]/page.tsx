"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Video, Calendar, Clock, Link, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { format } from "date-fns";

interface Course {
  id: string;
  title: string;
}

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  meetingUrl: string;
  meetingId: string;
  meetingType: string;
  isPublished: boolean;
  scheduledAt: Date | null;
  duration: number | null;
  course: { id: string; title: string };
  createdAt: string;
}

export default function EditTeacherLiveStreamPage({ params }: { params: Promise<{ livestreamId: string }> }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meetingUrl: "",
    courseId: "",
    scheduledAt: "",
    duration: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, liveStreamRes] = await Promise.all([
          fetch("/api/teacher/courses"),
          fetch(`/api/teacher/livestreams/${(await params).livestreamId}`)
        ]);

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData);
        }

        if (liveStreamRes.ok) {
          const liveStreamData = await liveStreamRes.json();
          setLiveStream(liveStreamData);
          setFormData({
            title: liveStreamData.title,
            description: liveStreamData.description || "",
            meetingUrl: liveStreamData.meetingUrl,
            courseId: liveStreamData.course.id,
            scheduledAt: liveStreamData.scheduledAt 
              ? format(new Date(liveStreamData.scheduledAt), "yyyy-MM-dd'T'HH:mm")
              : "",
            duration: liveStreamData.duration?.toString() || "",
          });
        } else {
          toast.error(t('admin.liveStreamNotFound'));
          router.push("/dashboard/teacher/livestreams");
        }
      } catch (error) {
        toast.error(t('admin.errorOccurred'));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [params, router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.meetingUrl || !formData.courseId) {
      toast.error(t('admin.fillRequiredFields'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/teacher/livestreams/${(await params).livestreamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
          duration: formData.duration ? parseInt(formData.duration) : null,
        }),
      });

      if (response.ok) {
        toast.success(t('admin.liveStreamUpdatedSuccessfully'));
        router.push("/dashboard/teacher/livestreams");
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.errorOccurred'));
      }
    } catch (error) {
      toast.error(t('admin.errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!liveStream) return;

    try {
      const response = await fetch(`/api/teacher/livestreams/${liveStream.id}/publish`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setLiveStream(prev => prev ? { ...prev, isPublished: !prev.isPublished } : null);
        toast.success(liveStream.isPublished ? t('admin.unpublishSuccess') : t('admin.publishSuccess'));
      } else {
        toast.error(t('admin.errorOccurred'));
      }
    } catch (error) {
      toast.error(t('admin.errorOccurred'));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (initialLoading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('dashboard.loading')}</div>
      </div>
    );
  }

  if (!liveStream) {
    return (
      <div className="p-6">
        <div className="text-center">{t('admin.liveStreamNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.editLiveStream')}</h1>
        </div>
        <Button
          onClick={handlePublish}
          variant={liveStream.isPublished ? "outline" : "default"}
          className={liveStream.isPublished ? "" : "bg-[#090919] hover:bg-[#090919]/90 text-white"}
        >
          {liveStream.isPublished ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              {t('admin.unpublish')}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              {t('admin.publish')}
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {t('admin.liveStreamDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">{t('admin.liveStreamTitle')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder={t('admin.enterLiveStreamTitle')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseId">{t('admin.course')} *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => handleInputChange("courseId", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectCourse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('admin.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder={t('admin.enterDescription')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingUrl">{t('admin.meetingUrl')} *</Label>
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
              <p className="text-sm text-muted-foreground">
                {t('admin.meetingUrlHelp')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">{t('admin.scheduledAt')}</Label>
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
                <Label htmlFor="duration">{t('admin.duration')}</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", e.target.value)}
                    placeholder={t('admin.durationInMinutes')}
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#090919] hover:bg-[#090919]/90 text-white"
              >
                {loading ? t('admin.updating') : t('admin.updateLiveStream')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
