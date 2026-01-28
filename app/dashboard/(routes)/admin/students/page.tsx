"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
import { useCurrency } from "@/lib/contexts/currency-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    curriculum?: string;
    level?: string;
    language?: string;
    grade?: string;
    role: string;
    balance: number;
    points: number;
    createdAt: string;
    updatedAt: string;
    _count: {
        courses: number;
        purchases: number;
        userProgress: number;
    };
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    email: string;
    curriculum: string;
    level: string;
    language: string;
    grade: string;
    role: string;
}

const StudentsPage = () => {
    const { t, isRTL } = useLanguage();
    const { formatPrice } = useCurrency();
    const pathname = usePathname();
    const isSupervisor = pathname?.includes("/supervisor/");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        email: "",
        curriculum: "",
        level: "",
        language: "",
        grade: "",
        role: "USER"
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
            curriculum: user.curriculum || "",
            level: user.level || "",
            language: user.language || "",
            grade: user.grade || "",
            role: user.role
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Prevent role changes for supervisors
        if (isSupervisor && editData.role !== editingUser.role) {
            toast.error(t('admin.roleChangeDisabled') || "Role changes are not allowed for supervisors");
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(isSupervisor ? { ...editData, role: editingUser.role } : editData),
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

    // Filter users based on search and classification
    const filteredUsers = users.filter(user => {
        // Search filter
        const matchesSearch = 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phoneNumber.includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        // Classification filters
        const matchesCurriculum = !selectedCurriculum || user.curriculum === selectedCurriculum;
        const matchesLevel = !selectedLevel || user.level === selectedLevel;
        const matchesLanguage = !selectedLanguage || user.language === selectedLanguage;
        const matchesGrade = !selectedGrade || user.grade === selectedGrade;

        return matchesSearch && matchesCurriculum && matchesLevel && matchesLanguage && matchesGrade;
    });

    // Reset displayed count when search term changes
    useEffect(() => {
        setDisplayedCount(25);
    }, [searchTerm]);

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
                    {t('admin.studentsManagement')}
                </h1>
            </div>

            {/* Filter Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.filterStudents')}</CardTitle>
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

            {/* Students Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.studentsList')}</CardTitle>
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
                            {t('admin.noStudentsFound')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.email')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.curriculum')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.grade')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.balance')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.points') || 'Points'}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.purchasedCoursesCount')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.registrationDate')}</TableHead>
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
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.email}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {user.curriculum ? (
                                                CURRICULA.find(c => c.id === user.curriculum)?.name || user.curriculum
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {user.grade ? (
                                                CURRICULA
                                                    .flatMap(c => c.grades)
                                                    .find(g => g.id === user.grade)?.name || user.grade
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="secondary">
                                                {formatPrice(user.balance)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                                {user.points} {t('dashboard.points') || 'Points'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline">
                                                {user._count.purchases}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                
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
                                ))}
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

            {/* Edit Dialog - Outside table to persist across pagination */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsEditDialogOpen(false);
                    setEditingUser(null);
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            <Label htmlFor="curriculum" className={isRTL ? "text-right" : "text-left"}>
                                {t('admin.curriculum')}
                            </Label>
                            <Select
                                value={editData.curriculum || "none"}
                                onValueChange={(value) => {
                                    setEditData({
                                        ...editData,
                                        curriculum: value === "none" ? "" : value,
                                        level: "",
                                        language: "",
                                        grade: ""
                                    });
                                }}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={t('admin.selectCurriculum')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('common.none')}</SelectItem>
                                    {CURRICULA.map((curriculum) => (
                                        <SelectItem key={curriculum.id} value={curriculum.id}>
                                            {curriculum.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {editData.curriculum && getLevelsByCurriculum(editData.curriculum as any).length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="level" className={isRTL ? "text-right" : "text-left"}>
                                    {t('admin.level')}
                                </Label>
                                <Select
                                    value={editData.level || "none"}
                                    onValueChange={(value) => {
                                        setEditData({
                                            ...editData,
                                            level: value === "none" ? "" : value,
                                            language: "",
                                            grade: ""
                                        });
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t('admin.selectLevel')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('common.none')}</SelectItem>
                                        {getLevelsByCurriculum(editData.curriculum as any).map((level) => (
                                            <SelectItem key={level.id} value={level.id}>
                                                {level.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {editData.curriculum && editData.level && getLanguagesByLevel(editData.curriculum as any, editData.level as any).length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="language" className={isRTL ? "text-right" : "text-left"}>
                                    {t('admin.language')}
                                </Label>
                                <Select
                                    value={editData.language || "none"}
                                    onValueChange={(value) => {
                                        setEditData({
                                            ...editData,
                                            language: value === "none" ? "" : value,
                                            grade: ""
                                        });
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t('admin.selectLanguage')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('common.none')}</SelectItem>
                                        {getLanguagesByLevel(editData.curriculum as any, editData.level as any).map((language) => (
                                            <SelectItem key={language.id} value={language.id}>
                                                {language.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {editData.curriculum && editData.level && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="grade" className={isRTL ? "text-right" : "text-left"}>
                                    {t('admin.grade')}
                                </Label>
                                <Select
                                    value={editData.grade || "none"}
                                    onValueChange={(value) => setEditData({...editData, grade: value === "none" ? "" : value})}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t('admin.selectGrade')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('common.none')}</SelectItem>
                                        {(editData.language
                                            ? getGradesByLanguage(editData.curriculum as any, editData.level as any, editData.language as any)
                                            : getGradesByLevel(editData.curriculum as any, editData.level as any)
                                        ).map((grade) => (
                                            <SelectItem key={grade.id} value={grade.id}>
                                                {grade.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className={isRTL ? "text-right" : "text-left"}>
                                {t('dashboard.role')}
                            </Label>
                            <Select
                                value={editData.role}
                                onValueChange={(value) => setEditData({...editData, role: value})}
                                disabled={isSupervisor}
                            >
                                <SelectTrigger className="col-span-3" disabled={isSupervisor}>
                                    <SelectValue placeholder={t('dashboard.selectRole')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">{t('dashboard.student')}</SelectItem>
                                    <SelectItem value="TEACHER">{t('dashboard.teacher')}</SelectItem>
                                    <SelectItem value="ADMIN">{t('dashboard.admin')}</SelectItem>
                                    <SelectItem value="SUPERVISOR">{t('dashboard.supervisor')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {isSupervisor && (
                                <p className="col-span-3 text-xs text-muted-foreground">
                                    {t('admin.roleChangeDisabled') || "Role changes are not allowed for supervisors"}
                                </p>
                            )}
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
        </div>
    );
};

export default StudentsPage;

