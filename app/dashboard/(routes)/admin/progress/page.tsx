"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, BookOpen, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    curriculum?: string;
    curriculumType?: string;
    level?: string;
    language?: string;
    grade?: string;
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

const ProgressPage = () => {
    const { t, isRTL } = useLanguage();
    const { formatPrice } = useCurrency();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
    const [userPurchases, setUserPurchases] = useState<Purchase[]>([]);
    const [allChapters, setAllChapters] = useState<Chapter[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [displayedCount, setDisplayedCount] = useState(25);

    // Filter states
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
    const [selectedCurriculumType, setSelectedCurriculumType] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("");

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setDisplayedCount(25);
    }, [searchTerm]);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users");
            if (response.ok) {
                const data = await response.json();
                // Filter only students (USER role)
                const studentData = data.filter((user: User) => user.role === "USER");
                setUsers(studentData);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get available options based on selections
    const availableLevels = selectedCurriculum 
        ? getLevelsByCurriculum(selectedCurriculum as any)
        : [];

    const availableLanguages = selectedCurriculum && selectedLevel
        ? getLanguagesByLevel(selectedCurriculum as any, selectedLevel as any)
        : [];

    const availableGrades = selectedCurriculum && selectedLevel
        ? (selectedLanguage 
            ? getGradesByLanguage(selectedCurriculum as any, selectedLevel as any, selectedLanguage as any)
            : getGradesByLevel(selectedCurriculum as any, selectedLevel as any))
        : [];

    // Handle filter changes
    const handleCurriculumChange = (value: string) => {
        setSelectedCurriculum(value === "all" ? "" : value);
        setSelectedCurriculumType("");
        setSelectedLevel("");
        setSelectedLanguage("");
        setSelectedGrade("");
        setDisplayedCount(25);
    };

    const handleCurriculumTypeChange = (value: string) => {
        setSelectedCurriculumType(value === "all" ? "" : value);
        setDisplayedCount(25);
    };

    const handleLevelChange = (value: string) => {
        setSelectedLevel(value === "all" ? "" : value);
        setSelectedLanguage("");
        setSelectedGrade("");
        setDisplayedCount(25);
    };

    const handleLanguageChange = (value: string) => {
        setSelectedLanguage(value === "all" ? "" : value);
        setSelectedGrade("");
        setDisplayedCount(25);
    };

    const handleGradeChange = (value: string) => {
        setSelectedGrade(value === "all" ? "" : value);
        setDisplayedCount(25);
    };

    const fetchUserProgress = async (userId: string) => {
        setLoadingProgress(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/progress`);
            if (response.ok) {
                const data = await response.json();
                setUserProgress(data.userProgress);
                setUserPurchases(data.purchases);
                setAllChapters(data.allChapters || []);
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

    // Filter users based on search and classification
    const filteredUsers = users.filter(user => {
        // Search filter
        const matchesSearch = 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phoneNumber.includes(searchTerm);

        // Classification filters
        const matchesCurriculum = !selectedCurriculum || user.curriculum === selectedCurriculum;
        const matchesCurriculumType = !selectedCurriculumType || user.curriculumType === selectedCurriculumType;
        const matchesLevel = !selectedLevel || user.level === selectedLevel;
        const matchesLanguage = !selectedLanguage || user.language === selectedLanguage;
        const matchesGrade = !selectedGrade || user.grade === selectedGrade;

        return matchesSearch && matchesCurriculum && matchesCurriculumType && matchesLevel && matchesLanguage && matchesGrade;
    });

    const studentUsers = filteredUsers;

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
                    {t('dashboard.studentProgress')}
                </h1>
            </div>

            {/* Filter Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.filterStudents')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Curriculum Filter */}
                        <div className="space-y-2">
                            <Label>{t('admin.curriculum')}</Label>
                            <Select value={selectedCurriculum || "all"} onValueChange={handleCurriculumChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('admin.selectCurriculum')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.all')}</SelectItem>
                                    {CURRICULA.map((curriculum) => (
                                        <SelectItem key={curriculum.id} value={curriculum.id}>
                                            {curriculum.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Curriculum Type Filter - Only show for Egyptian curriculum */}
                        {selectedCurriculum === "egyptian" && (
                            <div className="space-y-2">
                                <Label>{t('admin.curriculumType') || 'نوع المنهج'}</Label>
                                <Select value={selectedCurriculumType || "all"} onValueChange={handleCurriculumTypeChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('admin.selectCurriculumType') || 'اختر النوع'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
                                        <SelectItem value="morning">{t('admin.morning') || 'صباحي'}</SelectItem>
                                        <SelectItem value="evening">{t('admin.evening') || 'مسائي'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Level Filter */}
                        {selectedCurriculum && availableLevels.length > 0 && (
                            <div className="space-y-2">
                                <Label>{t('admin.level')}</Label>
                                <Select value={selectedLevel || "all"} onValueChange={handleLevelChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('admin.selectLevel')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
                                        {availableLevels.map((level) => (
                                            <SelectItem key={level.id} value={level.id}>
                                                {level.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Language Filter */}
                        {selectedCurriculum && selectedLevel && availableLanguages.length > 0 && (
                            <div className="space-y-2">
                                <Label>{t('admin.language')}</Label>
                                <Select value={selectedLanguage || "all"} onValueChange={handleLanguageChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('admin.selectLanguage')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
                                        {availableLanguages.map((language) => (
                                            <SelectItem key={language.id} value={language.id}>
                                                {language.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Grade Filter */}
                        {selectedCurriculum && selectedLevel && availableGrades.length > 0 && (
                            <div className="space-y-2">
                                <Label>{t('admin.grade')}</Label>
                                <Select value={selectedGrade || "all"} onValueChange={handleGradeChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('admin.selectGrade')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('dashboard.studentsList')}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('dashboard.searchByNameOrPhone')}
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
                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name')}</TableHead>
                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.purchasedCourses')}</TableHead>
                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.progress')}</TableHead>
                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
                             </TableRow>
                         </TableHeader>
                        <TableBody>
                            {studentUsers.slice(0, displayedCount).map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                        {user.fullName}
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Badge variant="outline">
                                            {user._count.purchases} {t('dashboard.course')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Badge variant="secondary">
                                            {user._count.userProgress} {t('dashboard.chapter')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleViewProgress(user)}
                                        >
                                            <Eye className="h-4 w-4" />
                                            {t('dashboard.viewProgress')}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {studentUsers.length > displayedCount && (
                        <div className="flex justify-center mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDisplayedCount(prev => prev + 25)}
                            >
                                {t('common.showMore')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dashboard.progressFor')} {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {loadingProgress ? (
                        <div className="text-center py-8">{t('dashboard.loadingUsers')}</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progress Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('dashboard.progressSummary')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span>{t('dashboard.completionRate')}</span>
                                            <span className="font-bold">{progressPercentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={progressPercentage} className="w-full" />
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-green-600">{completedProgress}</div>
                                                <div className="text-sm text-muted-foreground">{t('dashboard.completed')}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-gray-600">{notStartedChapters}</div>
                                                <div className="text-sm text-muted-foreground">{t('dashboard.notStarted')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Purchased Courses */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('dashboard.purchasedCourses')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                                                                 <TableHeader>
                                             <TableRow>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.courseName')}</TableHead>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.price')}</TableHead>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status')}</TableHead>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.purchaseDate')}</TableHead>
                                             </TableRow>
                                         </TableHeader>
                                        <TableBody>
                                            {userPurchases.map((purchase) => (
                                                <TableRow key={purchase.id}>
                                                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                                        {purchase.course.title}
                                                    </TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                        {formatPrice(purchase.course.price || 0)}
                                                    </TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                        <Badge variant={purchase.status === "ACTIVE" ? "default" : "secondary"}>
                                                            {purchase.status === "ACTIVE" ? t('dashboard.active') : t('dashboard.inactive')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                        {format(new Date(purchase.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Progress Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('dashboard.progressDetails')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                                                                 <TableHeader>
                                             <TableRow>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.course')}</TableHead>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.chapter')}</TableHead>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status')}</TableHead>
                                                 <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.lastUpdate')}</TableHead>
                                             </TableRow>
                                         </TableHeader>
                                        <TableBody>
                                            {allChapters.map((chapter) => {
                                                const progress = userProgress.find(p => p.chapter.id === chapter.id);
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
                                                                        {t('dashboard.completed')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {t('dashboard.inProgress')}
                                                                    </Badge>
                                                                )
                                                            ) : (
                                                                <Badge variant="outline" className="flex items-center gap-1">
                                                                    <BookOpen className="h-3 w-3" />
                                                                    {t('dashboard.notStarted')}
                                                                </Badge>
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
        </div>
    );
};

export default ProgressPage; 