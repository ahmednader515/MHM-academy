"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/contexts/language-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";

interface Course {
    id: string;
    title: string;
    targetCurriculum: string | null;
    targetLevel: string | null;
    targetLanguage: string | null;
    targetGrade: string | null;
    isPublished: boolean;
}

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    courses?: Course[];
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    email: string;
    role: string;
}

const StaffPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        email: "",
        role: ""
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [displayedCount, setDisplayedCount] = useState(25);

    // Filter states
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("");

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setDisplayedCount(25);
    }, [searchTerm, selectedCurriculum, selectedLevel, selectedLanguage, selectedGrade]);

    const fetchUsers = async () => {
        try {
            const usersResponse = await fetch("/api/admin/users");
            
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                // Filter only staff (ADMIN and TEACHER roles)
                const staffData = usersData.filter((user: User) => user.role === "ADMIN" || user.role === "TEACHER");
                
                // Fetch all courses with user info
                try {
                    const coursesResponse = await fetch("/api/courses?includeProgress=false");
                    if (coursesResponse.ok) {
                        const allCourses = await coursesResponse.json();
                        
                        // Group courses by userId
                        const coursesByUserId: Record<string, Course[]> = {};
                        allCourses.forEach((course: any) => {
                            if (course.user?.id) {
                                const userId = course.user.id;
                                if (!coursesByUserId[userId]) {
                                    coursesByUserId[userId] = [];
                                }
                                coursesByUserId[userId].push({
                                    id: course.id,
                                    title: course.title,
                                    targetCurriculum: course.targetCurriculum,
                                    targetLevel: course.targetLevel,
                                    targetLanguage: course.targetLanguage,
                                    targetGrade: course.targetGrade,
                                    isPublished: course.isPublished
                                });
                            }
                        });
                        
                        // Attach courses to users
                        const usersWithCourses = staffData.map((user: User) => ({
                            ...user,
                            courses: coursesByUserId[user.id] || []
                        }));
                        
                        setUsers(usersWithCourses);
                    } else {
                        // If courses fetch fails, just set users without courses
                        setUsers(staffData.map((user: User) => ({ ...user, courses: [] })));
                    }
                } catch (error) {
                    console.error("Error fetching courses:", error);
                    // If courses fetch fails, just set users without courses
                    setUsers(staffData.map((user: User) => ({ ...user, courses: [] })));
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t('dashboard.errorLoadingUsers'));
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditData({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            role: user.role
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                toast.success(t('common.success'));
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                toast.error(error || t('common.error'));
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(t('common.error'));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t('common.success'));
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                toast.error(error || t('common.error'));
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(t('common.error'));
        } finally {
            setIsDeleting(false);
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
        setSelectedLevel("");
        setSelectedLanguage("");
        setSelectedGrade("");
    };

    const handleLevelChange = (value: string) => {
        setSelectedLevel(value === "all" ? "" : value);
        setSelectedLanguage("");
        setSelectedGrade("");
    };

    const handleLanguageChange = (value: string) => {
        setSelectedLanguage(value === "all" ? "" : value);
        setSelectedGrade("");
    };

    const handleGradeChange = (value: string) => {
        setSelectedGrade(value === "all" ? "" : value);
    };

    // Count published courses by category for a teacher
    const getCourseCounts = (user: User) => {
        if (!user.courses || user.role !== "TEACHER") {
            return { total: 0, byCategory: {} };
        }

        const publishedCourses = user.courses.filter(course => course.isPublished);
        
        // Filter by selected category if any
        let filteredCourses = publishedCourses;
        if (selectedCurriculum) {
            filteredCourses = filteredCourses.filter(c => c.targetCurriculum === selectedCurriculum);
        }
        if (selectedLevel) {
            filteredCourses = filteredCourses.filter(c => c.targetLevel === selectedLevel);
        }
        if (selectedLanguage) {
            filteredCourses = filteredCourses.filter(c => c.targetLanguage === selectedLanguage);
        }
        if (selectedGrade) {
            filteredCourses = filteredCourses.filter(c => c.targetGrade === selectedGrade);
        }

        // Count by category
        const byCategory: Record<string, number> = {};
        publishedCourses.forEach(course => {
            const key = `${course.targetCurriculum || 'none'}-${course.targetLevel || 'none'}-${course.targetLanguage || 'none'}-${course.targetGrade || 'none'}`;
            byCategory[key] = (byCategory[key] || 0) + 1;
        });

        return {
            total: publishedCourses.length,
            filtered: filteredCourses.length,
            byCategory
        };
    };

    // Filter users based on search and course category
    const filteredUsers = users.filter(user => {
        // Search filter
        const matchesSearch = 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phoneNumber.includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        // Course category filter (only for teachers)
        if (user.role === "TEACHER" && user.courses) {
            const publishedCourses = user.courses.filter(course => course.isPublished);
            
            if (selectedCurriculum || selectedLevel || selectedLanguage || selectedGrade) {
                const hasMatchingCourse = publishedCourses.some(course => {
                    const matchesCurriculum = !selectedCurriculum || course.targetCurriculum === selectedCurriculum;
                    const matchesLevel = !selectedLevel || course.targetLevel === selectedLevel;
                    const matchesLanguage = !selectedLanguage || course.targetLanguage === selectedLanguage;
                    const matchesGrade = !selectedGrade || course.targetGrade === selectedGrade;
                    
                    return matchesCurriculum && matchesLevel && matchesLanguage && matchesGrade;
                });
                
                return matchesSearch && hasMatchingCourse;
            }
        }

        return matchesSearch;
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
                    {t('admin.staffAndTeachers')}
                </h1>
            </div>

            {/* Filter Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.filterByCourses')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <CardTitle>{t('admin.staffAndTeachers')}</CardTitle>
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
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('admin.noStaffFound')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.email')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.role')}</TableHead>
                                    {selectedCurriculum || selectedLevel || selectedLanguage || selectedGrade ? (
                                        <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.matchingCourses')}</TableHead>
                                    ) : (
                                        <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.totalPublishedCourses')}</TableHead>
                                    )}
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.registrationDate')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.slice(0, displayedCount).map((user) => {
                                    const courseCounts = getCourseCounts(user);
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                                {user.fullName}
                                            </TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant="secondary"
                                                    className={
                                                        user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                        user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
                                                        user.role === "USER" ? "bg-green-600 text-white hover:bg-green-700" :
                                                        ""
                                                    }
                                                >
                                                    {user.role === "TEACHER" ? t('dashboard.teacher') : 
                                                     user.role === "ADMIN" ? t('dashboard.admin') : 
                                                     user.role === "USER" ? t('dashboard.student') : user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                {user.role === "TEACHER" ? (
                                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                                        {selectedCurriculum || selectedLevel || selectedLanguage || selectedGrade 
                                                            ? courseCounts.filtered 
                                                            : courseCounts.total} {t('admin.courses')}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className={isRTL ? "text-right" : "text-left"}>
                                                {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                            </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t('dashboard.editUser')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('dashboard.editUserInfo')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className={isRTL ? "text-right" : "text-left"}>
                                                                    {t('dashboard.name')}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className={isRTL ? "text-right" : "text-left"}>
                                                                    {t('dashboard.phoneNumber')}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="email" className={isRTL ? "text-right" : "text-left"}>
                                                                    {t('dashboard.email')}
                                                                </Label>
                                                                <Input
                                                                    id="email"
                                                                    type="email"
                                                                    value={editData.email}
                                                                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className={isRTL ? "text-right" : "text-left"}>
                                                                    {t('dashboard.role')}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t('dashboard.selectRole')} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="TEACHER">{t('dashboard.teacher')}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t('dashboard.admin')}</SelectItem>
                                                                        <SelectItem value="USER">{t('dashboard.student')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                {t('common.cancel')}
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                {t('dashboard.saveChanges')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('dashboard.areYouSure')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('dashboard.deleteUserWarning')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {t('dashboard.delete')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
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
        </div>
    );
};

export default StaffPage;

