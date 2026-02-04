"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";
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
    balance: number;
    curriculum?: string;
    curriculumType?: string;
    level?: string;
    language?: string;
    grade?: string;
}

const BalancesPage = () => {
    const { t, isRTL } = useLanguage();
    const { formatPrice } = useCurrency();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newBalance, setNewBalance] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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

    const handleBalanceUpdate = async () => {
        if (!selectedUser || !newBalance) {
            toast.error(t('dashboard.pleaseEnterNewBalance'));
            return;
        }

        const balance = parseFloat(newBalance);
        if (isNaN(balance) || balance < 0) {
            toast.error(t('dashboard.pleaseEnterValidBalance'));
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newBalance: balance }),
            });

            if (response.ok) {
                toast.success(t('dashboard.balanceUpdateSuccess'));
                setNewBalance("");
                setIsDialogOpen(false);
                setSelectedUser(null);
                fetchUsers(); // Refresh the list
            } else {
                toast.error(t('dashboard.balanceUpdateError'));
            }
        } catch (error) {
            console.error("Error updating balance:", error);
            toast.error(t('dashboard.balanceUpdateError'));
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

    const studentUsers = filteredUsers;

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
                    {t('dashboard.balanceManagement')}
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

            {/* Students Table */}
            {studentUsers.length > 0 && (
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
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.currentBalance')}</TableHead>
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
                                            <Badge variant="secondary">
                                                {t('dashboard.students')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Wallet className="h-3 w-3" />
                                                {formatPrice(user.balance)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewBalance(user.balance.toString());
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                {t('dashboard.editBalance')}
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
            )}
            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setNewBalance("");
                        setSelectedUser(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('dashboard.editBalanceFor')} {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBalance" className={isRTL ? "text-right" : "text-left"}>{t('dashboard.newBalance')}</Label>
                            <Input
                                id="newBalance"
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                placeholder={t('dashboard.enterNewBalance')}
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setNewBalance("");
                                    setSelectedUser(null);
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={handleBalanceUpdate}>
                                {t('dashboard.updateBalance')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BalancesPage; 