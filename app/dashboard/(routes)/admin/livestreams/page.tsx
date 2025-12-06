"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Plus, Calendar, Clock, Video } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import { format } from "date-fns";

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
  course: { 
    id: string; 
    title: string;
    user: {
      id: string;
      fullName: string;
      role: string;
    };
  };
  createdAt: string;
  attendanceCount?: number;
  isExpired?: boolean;
}

export default function AdminLiveStreamsPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        const response = await fetch("/api/admin/livestreams");
        if (response.ok) {
          const data = await response.json();
          setLiveStreams(data);
        } else {
          toast.error(t('dashboard.errorLoadingLiveStreams'));
        }
      } catch (e) {
        toast.error(t('dashboard.loadingError'));
      } finally {
        setLoading(false);
      }
    };
    fetchLiveStreams();
  }, []);

  const filteredLiveStreams = liveStreams.filter((liveStream) =>
    [liveStream.title, liveStream.course.title, liveStream.course.user.fullName].some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePublish = async (liveStreamId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/livestreams/${liveStreamId}/publish`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setLiveStreams(prev => 
          prev.map(ls => 
            ls.id === liveStreamId 
              ? { ...ls, isPublished: !currentStatus }
              : ls
          )
        );
        toast.success(currentStatus ? t('admin.unpublishSuccess') : t('admin.publishSuccess'));
      } else {
        toast.error(t('admin.errorOccurred'));
      }
    } catch (error) {
      toast.error(t('admin.errorOccurred'));
    }
  };

  const handleDelete = async (liveStreamId: string) => {
    if (!confirm(t('admin.confirmDeleteLiveStream'))) return;

    try {
      const response = await fetch(`/api/admin/livestreams/${liveStreamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLiveStreams(prev => prev.filter(ls => ls.id !== liveStreamId));
        toast.success(t('admin.liveStreamDeletedSuccessfully'));
      } else {
        toast.error(t('admin.errorOccurred'));
      }
    } catch (error) {
      toast.error(t('admin.errorOccurred'));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('dashboard.loadingLiveStreams')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.allLiveStreams')}</h1>
        <Button onClick={() => router.push('/dashboard/admin/livestreams/create')} className="bg-[#090919] hover:bg-[#090919]/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createLiveStream')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.liveStreams')}</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchInLiveStreams')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.liveStreamTitle')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.teacherName')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.course')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.scheduledAt')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.duration')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.status')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.attendance')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLiveStreams.map((liveStream) => (
                <TableRow key={liveStream.id}>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{liveStream.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex flex-col">
                      <span className="font-medium">{liveStream.course.user.fullName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{liveStream.course.user.role}</span>
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {liveStream.course.title}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {liveStream.scheduledAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(liveStream.scheduledAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('admin.notScheduled')}</span>
                    )}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {liveStream.duration ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {liveStream.duration} {t('admin.minutes')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('admin.noDuration')}</span>
                    )}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex flex-col gap-1">
                      <Badge variant={liveStream.isPublished ? "default" : "secondary"}>
                        {liveStream.isPublished ? t('admin.published') : t('admin.draft')}
                      </Badge>
                      {liveStream.isExpired && (
                        <Badge variant="destructive" className="text-xs">
                          {t('admin.expired')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <Badge variant="outline">
                      {liveStream.attendanceCount || 0} {t('admin.students')}
                    </Badge>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/livestreams/${liveStream.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePublish(liveStream.id, liveStream.isPublished)}
                      >
                        {liveStream.isPublished ? t('admin.unpublish') : t('admin.publish')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(liveStream.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        {t('admin.delete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredLiveStreams.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? t('admin.noLiveStreamsFound') : t('admin.noLiveStreams')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
