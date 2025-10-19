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
import { useLanguage } from "@/lib/contexts/language-context";
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

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    college?: string;
    faculty?: string;
    level?: string;
    role: string;
    balance: number;
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
    college: string;
    faculty: string;
    level: string;
    role: string;
}

const UsersPage = () => {
    const { t, isRTL } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        email: "",
        college: "",
        faculty: "",
        level: "",
        role: ""
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/teacher/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error("Error fetching users:", response.status, response.statusText);
                if (response.status === 403) {
                    toast.error(t('teacher.noAccessToPage'));
                } else {
                    toast.error(t('teacher.loadStudentsError'));
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t('teacher.loadStudentsError'));
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
            college: user.college || "",
            faculty: user.faculty || "",
            level: user.level || "",
            role: user.role
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/teacher/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                const userType = editingUser.role === "TEACHER" ? t('teacher.teacher') : editingUser.role === "ADMIN" ? t('teacher.admin') : t('teacher.student');
                toast.success(t('teacher.updateUserSuccess') + " " + userType);
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error updating user:", response.status, error);
                if (response.status === 403) {
                    toast.error(t('teacher.noPermissionToEdit'));
                } else if (response.status === 404) {
                    toast.error(t('teacher.userNotFound'));
                } else if (response.status === 400) {
                    toast.error(error || t('teacher.invalidData'));
                } else {
                    toast.error(t('teacher.updateDataError'));
                }
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(t('teacher.updateStudentDataError'));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/teacher/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t('teacher.deleteUserSuccess'));
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error deleting user:", response.status, error);
                if (response.status === 403) {
                    toast.error(t('teacher.noPermissionToDelete'));
                } else if (response.status === 404) {
                    toast.error(t('teacher.userNotFound'));
                } else {
                    toast.error(error || t('teacher.deleteUserError'));
                }
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(t('teacher.deleteStudentError'));
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    // Separate users by role
    const studentUsers = filteredUsers.filter(user => user.role === "USER");
    const staffUsers = filteredUsers.filter(user => user.role === "TEACHER" || user.role === "ADMIN");

    // Debug logging
    console.log("All users:", users);
    console.log("Filtered users:", filteredUsers);
    console.log("Student users:", studentUsers);
    console.log("Staff users:", staffUsers);
    console.log("Admin users:", filteredUsers.filter(user => user.role === "ADMIN"));

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('teacher.loading')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('teacher.userManagement')}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('teacher.adminsAndTeachers')}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('teacher.searchByNameOrPhone')}
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
                                    <TableHead>{t('teacher.name')}</TableHead>
                                    <TableHead>{t('teacher.phoneNumber')}</TableHead>
                                    <TableHead>{t('teacher.email')}</TableHead>
                                    <TableHead>{t('teacher.role')}</TableHead>
                                    <TableHead>{t('teacher.registrationDate')}</TableHead>
                                    <TableHead>{t('teacher.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "TEACHER" ? "bg-[#090919] text-white hover:bg-[#090919]/90" : 
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? t('teacher.teacher') : 
                                                 user.role === "ADMIN" ? t('teacher.admin') : user.role}
                                            </Badge>
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
                                                            <DialogTitle>{t('teacher.editData')} {user.role === "TEACHER" ? t('teacher.teacher') : t('teacher.admin')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('teacher.editInformation')} {user.role === "TEACHER" ? t('teacher.teacher') : t('teacher.admin')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t('teacher.name')}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t('teacher.phoneNumber')}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="email" className="text-right">
                                                                    {t('teacher.email')}
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
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t('teacher.role')}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t('teacher.selectRole')} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t('teacher.student')}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t('teacher.teacher')}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t('teacher.admin')}</SelectItem>
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
                                                                {t('teacher.saveChanges')}
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
                                                            <AlertDialogTitle>{t('teacher.areYouSure')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('teacher.deleteUserWarning')} {user.role === "TEACHER" ? t('teacher.teacher') : t('teacher.admin')} {t('teacher.andAllAssociatedData')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {t('teacher.delete')}
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
                    </CardContent>
                </Card>
            )}

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('teacher.studentsList')}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('teacher.searchByNameOrPhone')}
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
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.name')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.phoneNumber')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.email')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.role')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.balance')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.purchasedCourses')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.registrationDate')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('teacher.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.phoneNumber}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>{user.email}</TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge 
                                                variant="secondary"
                                                className="bg-green-600 text-white hover:bg-green-700"
                                            >
                                                {t('teacher.student')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant="secondary">
                                                {user.balance} {t('teacher.currency')}
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
                                                            <DialogTitle>{t('teacher.editStudentData')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('teacher.editStudentInformation')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t('teacher.name')}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t('teacher.phoneNumber')}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="email" className="text-right">
                                                                    {t('teacher.email')}
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
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t('teacher.role')}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t('teacher.selectRole')} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t('teacher.student')}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t('teacher.teacher')}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t('teacher.admin')}</SelectItem>
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
                                                                {t('teacher.saveChanges')}
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
                                                            <AlertDialogTitle>{t('teacher.areYouSure')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('teacher.deleteStudentWarning')} {t('teacher.andAllAssociatedData')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {t('teacher.delete')}
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
                    </CardContent>
                </Card>
            )}

            {staffUsers.length === 0 && studentUsers.length === 0 && !loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            {t('teacher.noUsersRegistered')}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default UsersPage;
