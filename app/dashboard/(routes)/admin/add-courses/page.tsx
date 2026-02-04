"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, User, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";
import { Label } from "@/components/ui/label";

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
    _count?: {
        purchases: number;
    };
}

interface Course {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
}

const AddCoursesPage = () => {
    const { t, isRTL } = useLanguage();
    const { formatPrice } = useCurrency();
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [ownedCourses, setOwnedCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "delete">("add");
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);
    const [displayedCount, setDisplayedCount] = useState(25);

    // Filter states
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
    const [selectedCurriculumType, setSelectedCurriculumType] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("");

    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    useEffect(() => {
        setDisplayedCount(25);
    }, [searchTerm]);

    useEffect(() => {
        // fetch owned courses when a user is selected for delete mode
        const fetchOwned = async () => {
            if (!selectedUser) {
                setOwnedCourses([]);
                return;
            }
            try {
                const res = await fetch(`/api/admin/users/${selectedUser.id}/courses`);
                if (res.ok) {
                    const data = await res.json();
                    setOwnedCourses(data.courses || []);
                }
            } catch (e) {
                console.error("Error fetching owned courses", e);
            }
        };
        fetchOwned();
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users");
            if (response.ok) {
                const data = await response.json();
                // Filter only students
                const studentUsers = data.filter((user: User) => user.role === "USER");
                setUsers(studentUsers);
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

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                // Filter only published courses
                const publishedCourses = data.filter((course: Course) => course.isPublished);
                setCourses(publishedCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleAddCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error(t('dashboard.pleaseSelectStudentAndCourse'));
            return;
        }

        setIsAddingCourse(true);
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/add-course`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ courseId: selectedCourse }),
            });

            if (response.ok) {
                toast.success(t('dashboard.courseAddedSuccessfully'));
                setIsDialogOpen(false);
                setSelectedUser(null);
                setSelectedCourse("");
            } else {
                const error = await response.json();
                toast.error(error.message || t('dashboard.errorAddingCourse'));
            }
        } catch (error) {
            console.error("Error adding course:", error);
            toast.error(t('dashboard.errorAddingCourse'));
        } finally {
            setIsAddingCourse(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error(t('dashboard.pleaseSelectStudentAndCourse'));
            return;
        }

        setIsDeletingCourse(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}/add-course`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: selectedCourse })
            });
            if (res.ok) {
                toast.success(t('dashboard.courseRemovedSuccessfully'));
                setIsDialogOpen(false);
                setSelectedCourse("");
                setSelectedUser(null);
                fetchUsers();
            } else {
                const data = await res.json().catch(() => ({} as any));
                toast.error((data as any).error || t('dashboard.errorRemovingCourse'));
            }
        } catch (error) {
            console.error("Error deleting course:", error);
            toast.error(t('dashboard.errorRemovingCourse'));
        } finally {
            setIsDeletingCourse(false);
        }
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
                    {t('dashboard.addRemoveCoursesForStudents')}
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
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.role')}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.purchasedCourses')}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.slice(0, displayedCount).map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                        {user.fullName}
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Badge variant="secondary">
                                            {t('dashboard.students')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <Badge variant="outline">{user._count?.purchases ?? 0}</Badge>
                                    </TableCell>
                                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setDialogMode("add");
                                                    setSelectedCourse("");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                                {t('dashboard.addCourse')}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setDialogMode("delete");
                                                    setSelectedCourse("");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                {t('dashboard.removeCourse')}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredUsers.length > displayedCount && (
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
            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setSelectedCourse("");
                        setSelectedUser(null);
                        setDialogMode("add");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === "add" ? (
                                <>{t('dashboard.addCourseFor')} {selectedUser?.fullName}</>
                            ) : (
                                <>{t('dashboard.removeCourseFrom')} {selectedUser?.fullName}</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${isRTL ? "text-right" : "text-left"}`}>{t('dashboard.selectCourse')}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('dashboard.chooseCourse')} />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" className="max-h-[300px] overflow-y-auto">
                                    {(dialogMode === "delete" ? ownedCourses : courses).map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{course.title}</span>
                                                {typeof course.price === "number" && (
                                                    <Badge variant="outline" className="mr-2">
                                                        {formatPrice(course.price)}
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setSelectedCourse("");
                                    setSelectedUser(null);
                                    setDialogMode("add");
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            {dialogMode === "add" ? (
                                <Button 
                                    onClick={handleAddCourse}
                                    disabled={!selectedCourse || isAddingCourse}
                                >
                                    {isAddingCourse ? t('dashboard.adding') : t('dashboard.addCourse')}
                                </Button>
                            ) : (
                                <Button 
                                    variant="destructive"
                                    onClick={handleDeleteCourse}
                                    disabled={!selectedCourse || isDeletingCourse}
                                >
                                    {isDeletingCourse ? t('dashboard.removing') : t('dashboard.removeCourse')}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddCoursesPage; 