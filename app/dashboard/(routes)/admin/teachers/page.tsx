"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, BookOpen, FileText, Video, Users, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { toast } from "sonner";

interface Teacher {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    createdAt: string;
    courses: Course[];
    quizzes: Quiz[];
    liveStreams: LiveStream[];
    totalCourses: number;
    totalQuizzes: number;
    totalLiveStreams: number;
    publishedCourses: number;
    publishedQuizzes: number;
    publishedLiveStreams: number;
}

interface Course {
    id: string;
    title: string;
    isPublished: boolean;
    price: number | null;
    createdAt: string;
    _count: {
        chapters: number;
        quizzes: number;
        liveStreams: number;
        purchases: number;
    };
}

interface Quiz {
    id: string;
    title: string;
    isPublished: boolean;
    position: number;
    course: {
        id: string;
        title: string;
    };
    _count: {
        questions: number;
        quizResults: number;
    };
}

interface LiveStream {
    id: string;
    title: string;
    isPublished: boolean;
    scheduledAt: string | null;
    course: {
        id: string;
        title: string;
    };
    createdAt: string;
}

const TeachersPage = () => {
    const { t, isRTL } = useLanguage();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const response = await fetch("/api/admin/teachers");
            if (response.ok) {
                const data = await response.json();
                setTeachers(data);
            } else {
                const errorText = await response.text();
                console.error("Failed to fetch teachers:", response.status, errorText);
                toast.error(t('admin.failedToLoadTeachers') || 'Failed to load teachers');
            }
        } catch (error) {
            console.error("Error fetching teachers:", error);
            toast.error(t('admin.errorLoadingTeachers') || 'Error loading teachers');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setIsDialogOpen(true);
    };

    const filteredTeachers = teachers.filter(teacher =>
        teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.phoneNumber.includes(searchTerm) ||
        teacher.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('dashboard.loadingUsers') || 'Loading...'}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('admin.teachersManagement') || 'Teachers Management'}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.teachersList') || 'Teachers List'}</CardTitle>
                    <div className="flex items-center space-x-2 mt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('admin.searchByNamePhoneOrEmail') || 'Search by name, phone, or email'}
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
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name') || 'Name'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber') || 'Phone'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.email') || 'Email'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.courses') || 'Courses'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.quizzes') || 'Quizzes'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.liveStreams') || 'Live Streams'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTeachers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        {t('admin.noTeachersFound') || 'No teachers found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTeachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                            {teacher.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{teacher.phoneNumber}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{teacher.email || '-'}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline">
                                                {teacher.totalCourses} ({teacher.publishedCourses} {t('dashboard.published') || 'published'})
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline">
                                                {teacher.totalQuizzes} ({teacher.publishedQuizzes} {t('dashboard.published') || 'published'})
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline">
                                                {teacher.totalLiveStreams} ({teacher.publishedLiveStreams} {t('dashboard.published') || 'published'})
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleViewDetails(teacher)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                {t('admin.viewDetails') || 'View Details'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Teacher Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.teacherDetails') || 'Teacher Details'} - {selectedTeacher?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedTeacher && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            {t('admin.totalCourses') || 'Total Courses'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{selectedTeacher.totalCourses}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedTeacher.publishedCourses} {t('dashboard.published') || 'published'}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            {t('admin.totalQuizzes') || 'Total Quizzes'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{selectedTeacher.totalQuizzes}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedTeacher.publishedQuizzes} {t('dashboard.published') || 'published'}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Video className="h-4 w-4" />
                                            {t('admin.totalLiveStreams') || 'Total Live Streams'}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{selectedTeacher.totalLiveStreams}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedTeacher.publishedLiveStreams} {t('dashboard.published') || 'published'}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Courses Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5" />
                                        {t('dashboard.courses') || 'Courses'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedTeacher.courses.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.courseName') || 'Course Name'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.price') || 'Price'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status') || 'Status'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.chapters') || 'Chapters'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.quizzes') || 'Quizzes'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.liveStreams') || 'Live Streams'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.purchases') || 'Purchases'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.createdAt') || 'Created'}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedTeacher.courses.map((course) => (
                                                    <TableRow key={course.id}>
                                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                                            {course.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {course.price !== null ? `${course.price} ${t('dashboard.egp') || 'EGP'}` : t('dashboard.free') || 'Free'}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {course.isPublished ? (
                                                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    {t('dashboard.published') || 'Published'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                                                    <X className="h-3 w-3" />
                                                                    {t('dashboard.draft') || 'Draft'}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {course._count.chapters}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {course._count.quizzes}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {course._count.liveStreams}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {course._count.purchases}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {format(new Date(course.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('admin.noCoursesFound') || 'No courses found'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quizzes Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        {t('dashboard.quizzes') || 'Quizzes'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedTeacher.quizzes.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.quizName') || 'Quiz Name'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.course') || 'Course'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status') || 'Status'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.questions') || 'Questions'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.submissions') || 'Submissions'}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedTeacher.quizzes.map((quiz) => (
                                                    <TableRow key={quiz.id}>
                                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                                            {quiz.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {quiz.course.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {quiz.isPublished ? (
                                                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    {t('dashboard.published') || 'Published'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                                                    <X className="h-3 w-3" />
                                                                    {t('dashboard.draft') || 'Draft'}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {quiz._count.questions}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {quiz._count.quizResults}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('admin.noQuizzesFound') || 'No quizzes found'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Live Streams Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Video className="h-5 w-5" />
                                        {t('admin.liveStreams') || 'Live Streams'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedTeacher.liveStreams.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.streamTitle') || 'Stream Title'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.course') || 'Course'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status') || 'Status'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.scheduledAt') || 'Scheduled At'}</TableHead>
                                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.createdAt') || 'Created'}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedTeacher.liveStreams.map((stream) => (
                                                    <TableRow key={stream.id}>
                                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                                            {stream.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {stream.course.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {stream.isPublished ? (
                                                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    {t('dashboard.published') || 'Published'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                                                    <X className="h-3 w-3" />
                                                                    {t('dashboard.draft') || 'Draft'}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {stream.scheduledAt 
                                                                ? format(new Date(stream.scheduledAt), "dd/MM/yyyy HH:mm", { locale: ar })
                                                                : '-'}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {format(new Date(stream.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('admin.noLiveStreamsFound') || 'No live streams found'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeachersPage;

