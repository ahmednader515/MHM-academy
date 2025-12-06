"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, BookOpen, CheckCircle, Clock, Image as ImageIcon, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { toast } from "sonner";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    _count: {
        purchases: number;
        userProgress: number;
    };
}

interface UserProgress {
    id: string;
    isCompleted: boolean;
    updatedAt: string;
    chapter: {
        id: string;
        title: string;
        course: {
            id: string;
            title: string;
        };
    };
}

interface Chapter {
    id: string;
    title: string;
    isPublished: boolean;
    course: {
        id: string;
        title: string;
    };
}

interface Purchase {
    id: string;
    status: string;
    createdAt: string;
    course: {
        id: string;
        title: string;
        price: number;
    };
}

interface HomeworkSubmission {
    id: string;
    imageUrl: string;
    createdAt: string;
    student: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    chapter: {
        id: string;
        title: string;
        position?: number;
        course: {
            id: string;
            title: string;
        };
    };
}

interface ActivitySubmission {
    id: string;
    imageUrl: string;
    createdAt: string;
    student: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    activity: {
        id: string;
        title: string;
        description: string | null;
        chapter: {
            id: string;
            title: string;
            position?: number;
            course: {
                id: string;
                title: string;
            };
        };
    };
}

const ProgressPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
    const [userPurchases, setUserPurchases] = useState<Purchase[]>([]);
    const [allChapters, setAllChapters] = useState<Chapter[]>([]);
    const [homeworkSubmissions, setHomeworkSubmissions] = useState<{ [chapterId: string]: HomeworkSubmission[] }>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [selectedChapterHomework, setSelectedChapterHomework] = useState<{ chapterId: string; homework: HomeworkSubmission[] } | null>(null);
    const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
    const [allStudentHomeworks, setAllStudentHomeworks] = useState<HomeworkSubmission[]>([]);
    const [allHomeworksDialogOpen, setAllHomeworksDialogOpen] = useState(false);
    const [loadingHomeworks, setLoadingHomeworks] = useState(false);
    const [allStudentActivities, setAllStudentActivities] = useState<ActivitySubmission[]>([]);
    const [allActivitiesDialogOpen, setAllActivitiesDialogOpen] = useState(false);
    const [loadingActivities, setLoadingActivities] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/teacher/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProgress = async (userId: string) => {
        setLoadingProgress(true);
        try {
            const response = await fetch(`/api/teacher/users/${userId}/progress`);
            if (response.ok) {
                const data = await response.json();
                setUserProgress(data.userProgress);
                setUserPurchases(data.purchases);
                setAllChapters(data.allChapters || []);

                // Fetch homework for all chapters
                const homeworkPromises = data.allChapters.map(async (chapter: Chapter) => {
                    try {
                        const homeworkResponse = await fetch(`/api/teacher/homework/${chapter.id}`);
                        if (homeworkResponse.ok) {
                            const homeworkData = await homeworkResponse.json();
                            return { chapterId: chapter.id, homework: homeworkData };
                        }
                    } catch (error) {
                        console.error(`Error fetching homework for chapter ${chapter.id}:`, error);
                    }
                    return { chapterId: chapter.id, homework: [] };
                });

                const homeworkResults = await Promise.all(homeworkPromises);
                const homeworkMap: { [chapterId: string]: HomeworkSubmission[] } = {};
                homeworkResults.forEach(result => {
                    homeworkMap[result.chapterId] = result.homework.filter((h: HomeworkSubmission) => h.student.id === userId);
                });
                setHomeworkSubmissions(homeworkMap);
            }
        } catch (error) {
            console.error("Error fetching user progress:", error);
        } finally {
            setLoadingProgress(false);
        }
    };

    const handleViewProgress = (user: User) => {
        setSelectedUser(user);
        fetchUserProgress(user.id);
        setIsDialogOpen(true);
    };

    const handleViewHomework = (chapterId: string, homework: HomeworkSubmission[]) => {
        setSelectedChapterHomework({ chapterId, homework });
        setHomeworkDialogOpen(true);
    };

    const handleViewAllHomeworks = async (studentId: string) => {
        // Find the user to set selected user
        const student = users.find(u => u.id === studentId);
        if (student) {
            setSelectedUser(student);
        }

        setLoadingHomeworks(true);
        try {
            const response = await fetch(`/api/teacher/students/${studentId}/homework`);
            if (response.ok) {
                const data = await response.json();
                setAllStudentHomeworks(data);
                setAllHomeworksDialogOpen(true);
            } else {
                console.error("Failed to fetch homeworks");
            }
        } catch (error) {
            console.error("Error fetching homeworks:", error);
        } finally {
            setLoadingHomeworks(false);
        }
    };

    const handleViewAllActivities = async (studentId: string) => {
        // Find the user to set selected user
        const student = users.find(u => u.id === studentId);
        if (student) {
            setSelectedUser(student);
        }

        setLoadingActivities(true);
        try {
            const response = await fetch(`/api/teacher/students/${studentId}/activities`);
            if (response.ok) {
                const data = await response.json();
                setAllStudentActivities(data);
                setAllActivitiesDialogOpen(true);
            } else {
                const errorText = await response.text();
                console.error("Failed to fetch activities:", response.status, errorText);
                toast.error(t('dashboard.failedToLoadActivities') || 'Failed to load activities');
            }
        } catch (error) {
            console.error("Error fetching activities:", error);
            toast.error(t('dashboard.errorLoadingActivities') || 'Error loading activities');
        } finally {
            setLoadingActivities(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const studentUsers = filteredUsers.filter(user => user.role === "USER");

    const completedProgress = userProgress.filter(p => p.isCompleted).length;
    const inProgressChapters = userProgress.filter(p => !p.isCompleted).length;
    const totalAvailableChapters = allChapters.length;
    const notStartedChapters = totalAvailableChapters - completedProgress - inProgressChapters;
    const progressPercentage = totalAvailableChapters > 0 ? (completedProgress / totalAvailableChapters) * 100 : 0;

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('dashboard.loadingUsers')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('dashboard.studentProgress') || 'Student Progress'}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('dashboard.studentsList') || 'Students List'}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('dashboard.searchByNameOrPhone') || 'Search by name or phone'}
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
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber') || 'Phone Number'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.purchasedCourses') || 'Purchased Courses'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.progress') || 'Progress'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                        {user.fullName}
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Badge variant="outline">
                                            {user._count.purchases} {t('dashboard.course') || 'Course'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Badge variant="secondary">
                                            {user._count.userProgress} {t('dashboard.chapter') || 'Chapter'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleViewProgress(user)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {t('dashboard.viewProgress') || 'View Progress'}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleViewAllHomeworks(user.id)}
                                                disabled={loadingHomeworks}
                                            >
                                                <ImageIcon className="h-4 w-4" />
                                                {t('dashboard.viewHomeworks') || 'View Homeworks'}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleViewAllActivities(user.id)}
                                                disabled={loadingActivities}
                                            >
                                                <ClipboardList className="h-4 w-4" />
                                                {t('dashboard.viewActivities') || 'View Activities'}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dashboard.progressFor') || 'Progress for'} {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {loadingProgress ? (
                        <div className="text-center py-8">{t('dashboard.loadingUsers') || 'Loading...'}</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progress Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('dashboard.progressSummary') || 'Progress Summary'}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span>{t('dashboard.completionRate') || 'Completion Rate'}</span>
                                            <span className="font-bold">{progressPercentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={progressPercentage} className="w-full" />
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-green-600">{completedProgress}</div>
                                                <div className="text-sm text-muted-foreground">{t('dashboard.completed') || 'Completed'}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-gray-600">{notStartedChapters}</div>
                                                <div className="text-sm text-muted-foreground">{t('dashboard.notStarted') || 'Not Started'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Progress Details with Homework */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('dashboard.progressDetails') || 'Progress Details'}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.course') || 'Course'}</TableHead>
                                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.chapter') || 'Chapter'}</TableHead>
                                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status') || 'Status'}</TableHead>
                                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.homework') || 'Homework'}</TableHead>
                                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.lastUpdate') || 'Last Update'}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allChapters.map((chapter) => {
                                                const progress = userProgress.find(p => p.chapter.id === chapter.id);
                                                const homework = homeworkSubmissions[chapter.id] || [];
                                                const hasHomework = homework.length > 0;
                                                return (
                                                    <TableRow key={chapter.id}>
                                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                                            {chapter.course.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {chapter.title}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {progress ? (
                                                                progress.isCompleted ? (
                                                                    <Badge variant="default" className="flex items-center gap-1">
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        {t('dashboard.completed') || 'Completed'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {t('dashboard.inProgress') || 'In Progress'}
                                                                    </Badge>
                                                                )
                                                            ) : (
                                                                <Badge variant="outline" className="flex items-center gap-1">
                                                                    <BookOpen className="h-3 w-3" />
                                                                    {t('dashboard.notStarted') || 'Not Started'}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {hasHomework ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleViewHomework(chapter.id, homework)}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <ImageIcon className="h-3 w-3" />
                                                                    {t('dashboard.viewHomework') || 'View Homework'}
                                                                </Button>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">
                                                                    {t('dashboard.noHomework') || 'No homework'}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                            {progress ? (
                                                                format(new Date(progress.updatedAt), "dd/MM/yyyy", { locale: ar })
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Homework Dialog */}
            <Dialog open={homeworkDialogOpen} onOpenChange={setHomeworkDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dashboard.homeworkSubmissions') || 'Homework Submissions'}
                            {selectedChapterHomework && ` - ${allChapters.find(c => c.id === selectedChapterHomework.chapterId)?.title}`}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedChapterHomework && selectedChapterHomework.homework.length > 0 ? (
                        <div className="space-y-4">
                            {selectedChapterHomework.homework.map((submission) => (
                                <Card key={submission.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{submission.student.fullName}</CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {submission.student.email} • {submission.student.phoneNumber}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t('dashboard.submittedOn') || 'Submitted on'}: {format(new Date(submission.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative w-full">
                                            <img 
                                                src={submission.imageUrl} 
                                                alt={`Homework by ${submission.student.fullName}`}
                                                className="w-full h-auto rounded-md border cursor-pointer"
                                                onClick={() => window.open(submission.imageUrl, '_blank')}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={() => window.open(submission.imageUrl, '_blank')}
                                        >
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            {t('dashboard.viewFullSize') || 'View Full Size'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('dashboard.noHomeworkSubmissions') || 'No homework submissions for this chapter.'}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* All Homeworks Dialog - Grouped by Chapter */}
            <Dialog open={allHomeworksDialogOpen} onOpenChange={setAllHomeworksDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dashboard.allHomeworkSubmissions') || 'All Homework Submissions'} - {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingHomeworks ? (
                        <div className="text-center py-8">{t('dashboard.loadingUsers') || 'Loading...'}</div>
                    ) : allStudentHomeworks.length > 0 ? (
                        <div className="space-y-6">
                            {/* Group homeworks by chapter */}
                            {(() => {
                                // Group by chapter
                                const groupedByChapter = allStudentHomeworks.reduce((acc, homework) => {
                                    const chapterKey = homework.chapter.id;
                                    if (!acc[chapterKey]) {
                                        acc[chapterKey] = {
                                            chapter: homework.chapter,
                                            homeworks: []
                                        };
                                    }
                                    acc[chapterKey].homeworks.push(homework);
                                    return acc;
                                }, {} as Record<string, { chapter: HomeworkSubmission['chapter'], homeworks: HomeworkSubmission[] }>);

                                // Convert to array and sort by chapter position
                                const chapters = Object.values(groupedByChapter).sort((a, b) => {
                                    // Sort by course title first, then by chapter position
                                    const courseCompare = a.chapter.course.title.localeCompare(b.chapter.course.title);
                                    if (courseCompare !== 0) return courseCompare;
                                    return (a.chapter.position || 0) - (b.chapter.position || 0);
                                });

                                return chapters.map(({ chapter, homeworks }) => (
                                    <Card key={chapter.id} className="border-l-4 border-l-primary">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <BookOpen className="h-5 w-5" />
                                                {chapter.title}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                {chapter.course.title} • {homeworks.length} {homeworks.length === 1 ? 'submission' : 'submissions'}
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {homeworks.map((submission) => (
                                                    <div key={submission.id} className="border rounded-lg p-4 bg-secondary/50">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <p className="text-sm font-medium">{submission.student.fullName}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {submission.student.email} • {submission.student.phoneNumber}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {t('dashboard.submittedOn') || 'Submitted on'}: {format(new Date(submission.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="relative w-full max-w-2xl mb-3">
                                                            <img 
                                                                src={submission.imageUrl} 
                                                                alt={`Homework by ${submission.student.fullName} for ${chapter.title}`}
                                                                className="w-full h-auto rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => window.open(submission.imageUrl, '_blank')}
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full sm:w-auto"
                                                            onClick={() => window.open(submission.imageUrl, '_blank')}
                                                        >
                                                            <ImageIcon className="h-4 w-4 mr-2" />
                                                            {t('dashboard.viewFullSize') || 'View Full Size'}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ));
                            })()}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('dashboard.noHomeworkSubmissions') || 'No homework submissions found for this student.'}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* All Activities Dialog - Grouped by Chapter */}
            <Dialog open={allActivitiesDialogOpen} onOpenChange={setAllActivitiesDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dashboard.allActivitySubmissions') || 'All Activity Submissions'} - {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingActivities ? (
                        <div className="text-center py-8">{t('dashboard.loadingUsers') || 'Loading...'}</div>
                    ) : allStudentActivities.length > 0 ? (
                        <div className="space-y-6">
                            {/* Group activities by chapter */}
                            {(() => {
                                // Group by chapter
                                const groupedByChapter = allStudentActivities.reduce((acc, submission) => {
                                    const chapterKey = submission.activity.chapter.id;
                                    if (!acc[chapterKey]) {
                                        acc[chapterKey] = {
                                            chapter: submission.activity.chapter,
                                            activities: []
                                        };
                                    }
                                    acc[chapterKey].activities.push(submission);
                                    return acc;
                                }, {} as Record<string, { chapter: ActivitySubmission['activity']['chapter'], activities: ActivitySubmission[] }>);

                                // Convert to array and sort by chapter position
                                const chapters = Object.values(groupedByChapter).sort((a, b) => {
                                    // Sort by course title first, then by chapter position
                                    const courseCompare = a.chapter.course.title.localeCompare(b.chapter.course.title);
                                    if (courseCompare !== 0) return courseCompare;
                                    return (a.chapter.position || 0) - (b.chapter.position || 0);
                                });

                                return chapters.map(({ chapter, activities }) => (
                                    <Card key={chapter.id} className="border-l-4 border-l-blue-500">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <BookOpen className="h-5 w-5" />
                                                {chapter.title}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                {chapter.course.title} • {activities.length} {activities.length === 1 ? 'submission' : 'submissions'}
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {activities.map((submission) => (
                                                    <div key={submission.id} className="border rounded-lg p-4 bg-secondary/50">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <p className="text-sm font-medium">{submission.activity.title}</p>
                                                                {submission.activity.description && (
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        {submission.activity.description}
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    {submission.student.fullName} • {submission.student.email}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {t('dashboard.submittedOn') || 'Submitted on'}: {format(new Date(submission.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="relative w-full max-w-2xl mb-3">
                                                            <img 
                                                                src={submission.imageUrl} 
                                                                alt={`Activity by ${submission.student.fullName} for ${submission.activity.title}`}
                                                                className="w-full h-auto rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => window.open(submission.imageUrl, '_blank')}
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full sm:w-auto"
                                                            onClick={() => window.open(submission.imageUrl, '_blank')}
                                                        >
                                                            <ImageIcon className="h-4 w-4 mr-2" />
                                                            {t('dashboard.viewFullSize') || 'View Full Size'}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ));
                            })()}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('dashboard.noActivitySubmissions') || 'No activity submissions found for this student.'}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProgressPage;

