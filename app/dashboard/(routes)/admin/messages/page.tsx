"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Search, Edit, Trash2, Plus, AlertTriangle } from "lucide-react";
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
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel, getGradeById } from "@/lib/data/curriculum-data";

interface StudentMessage {
    id: string;
    message: string;
    isActive: boolean;
    targetCurriculum: string | null;
    targetLevel: string | null;
    targetLanguage: string | null;
    targetGrade: string | null;
    createdAt: string;
    updatedAt: string;
    creator: {
        id: string;
        fullName: string;
    };
}

interface MessageFormData {
    message: string;
    isActive: boolean;
    targetCurriculum: string;
    targetLevel: string;
    targetLanguage: string;
    targetGrade: string;
}

const MessagesPage = () => {
    const { t, isRTL } = useLanguage();
    const [messages, setMessages] = useState<StudentMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingMessage, setEditingMessage] = useState<StudentMessage | null>(null);
    const [formData, setFormData] = useState<MessageFormData>({
        message: "",
        isActive: true,
        targetCurriculum: "",
        targetLevel: "",
        targetLanguage: "",
        targetGrade: ""
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter states
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("");

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch("/api/admin/messages");
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast.error(t('admin.errorLoadingMessages'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMessage = () => {
        setEditingMessage(null);
        setFormData({
            message: "",
            isActive: true,
            targetCurriculum: "",
            targetLevel: "",
            targetLanguage: "",
            targetGrade: ""
        });
        setIsDialogOpen(true);
    };

    const handleEditMessage = (message: StudentMessage) => {
        setEditingMessage(message);
        setFormData({
            message: message.message,
            isActive: message.isActive,
            targetCurriculum: message.targetCurriculum || "",
            targetLevel: message.targetLevel || "",
            targetLanguage: message.targetLanguage || "",
            targetGrade: message.targetGrade || ""
        });
        setIsDialogOpen(true);
    };

    const handleSaveMessage = async () => {
        if (!formData.message.trim()) {
            toast.error(t('admin.messageRequired'));
            return;
        }

        try {
            const url = editingMessage 
                ? `/api/admin/messages/${editingMessage.id}`
                : "/api/admin/messages";
            const method = editingMessage ? "PATCH" : "POST";

            // Convert empty strings to null for consistency
            const dataToSend = {
                ...formData,
                targetCurriculum: formData.targetCurriculum || null,
                targetLevel: formData.targetLevel || null,
                targetLanguage: formData.targetLanguage || null,
                targetGrade: formData.targetGrade || null,
            };

            // Debug log
            console.log('[SAVE_MESSAGE]', dataToSend);

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                toast.success(t('common.success'));
                setIsDialogOpen(false);
                setEditingMessage(null);
                fetchMessages();
            } else {
                const error = await response.text();
                toast.error(error || t('common.error'));
            }
        } catch (error) {
            console.error("Error saving message:", error);
            toast.error(t('common.error'));
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/messages/${messageId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t('common.success'));
                fetchMessages();
            } else {
                const error = await response.text();
                toast.error(error || t('common.error'));
            }
        } catch (error) {
            console.error("Error deleting message:", error);
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

    // Filter messages based on search and category
    const filteredMessages = messages.filter(message => {
        // Search filter
        const matchesSearch = 
            message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            message.creator.fullName.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filters
        const matchesCurriculum = !selectedCurriculum || message.targetCurriculum === selectedCurriculum;
        const matchesLevel = !selectedLevel || message.targetLevel === selectedLevel;
        const matchesLanguage = !selectedLanguage || message.targetLanguage === selectedLanguage;
        const matchesGrade = !selectedGrade || message.targetGrade === selectedGrade;

        return matchesSearch && matchesCurriculum && matchesLevel && matchesLanguage && matchesGrade;
    });

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t('common.loading')}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('admin.studentMessages')}
                </h1>
                <Button onClick={handleCreateMessage}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.createMessage')}
                </Button>
            </div>

            {/* Filter Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.filterMessages')}</CardTitle>
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

            {/* Messages Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.messagesList')}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('admin.searchMessages')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('admin.noMessagesFound')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.message')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.targetCategory')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.status')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.createdBy')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.createdAt')}</TableHead>
                                    <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMessages.map((message) => (
                                    <TableRow key={message.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"} max-w-md`}>
                                            <div className="truncate">{message.message}</div>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex flex-col gap-1">
                                                {message.targetCurriculum && (
                                                    <Badge variant="outline" className="w-fit">
                                                        {CURRICULA.find(c => c.id === message.targetCurriculum)?.name || message.targetCurriculum}
                                                    </Badge>
                                                )}
                                                {message.targetGrade && (
                                                    <Badge variant="outline" className="w-fit">
                                                        {CURRICULA
                                                            .flatMap(c => c.grades)
                                                            .find(g => g.id === message.targetGrade)?.name || message.targetGrade}
                                                    </Badge>
                                                )}
                                                {!message.targetCurriculum && !message.targetGrade && (
                                                    <span className="text-muted-foreground">{t('admin.allStudents')}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <Badge variant={message.isActive ? "default" : "secondary"}>
                                                {message.isActive ? t('admin.active') : t('admin.inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {message.creator.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {format(new Date(message.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isDialogOpen && editingMessage?.id === message.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsDialogOpen(false);
                                                        setEditingMessage(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditMessage(message)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>{t('admin.editMessage')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('admin.editMessageDescription')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>{t('admin.message')}</Label>
                                                                <Textarea
                                                                    value={formData.message}
                                                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                                                    rows={4}
                                                                    placeholder={t('admin.enterMessage')}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 items-center gap-4">
                                                                <Label>{t('admin.status')}</Label>
                                                                <Select
                                                                    value={formData.isActive ? "active" : "inactive"}
                                                                    onValueChange={(value) => setFormData({...formData, isActive: value === "active"})}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="active">{t('admin.active')}</SelectItem>
                                                                        <SelectItem value="inactive">{t('admin.inactive')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label>{t('admin.curriculum')}</Label>
                                                                <Select
                                                                    value={formData.targetCurriculum || "none"}
                                                                    onValueChange={(value) => {
                                                                        setFormData({
                                                                            ...formData,
                                                                            targetCurriculum: value === "none" ? "" : value,
                                                                            targetLevel: "",
                                                                            targetLanguage: "",
                                                                            targetGrade: ""
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
                                                            {formData.targetCurriculum && getLevelsByCurriculum(formData.targetCurriculum as any).length > 0 && (
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label>{t('admin.level')}</Label>
                                                                    <Select
                                                                        value={formData.targetLevel || "none"}
                                                                        onValueChange={(value) => {
                                                                            setFormData({
                                                                                ...formData,
                                                                                targetLevel: value === "none" ? "" : value,
                                                                                targetLanguage: "",
                                                                                targetGrade: ""
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="col-span-3">
                                                                            <SelectValue placeholder={t('admin.selectLevel')} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">{t('common.none')}</SelectItem>
                                                                            {getLevelsByCurriculum(formData.targetCurriculum as any).map((level) => (
                                                                                <SelectItem key={level.id} value={level.id}>
                                                                                    {level.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                            {formData.targetCurriculum && formData.targetLevel && getLanguagesByLevel(formData.targetCurriculum as any, formData.targetLevel as any).length > 0 && (
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label>{t('admin.language')}</Label>
                                                                    <Select
                                                                        value={formData.targetLanguage || "none"}
                                                                        onValueChange={(value) => {
                                                                            setFormData({
                                                                                ...formData,
                                                                                targetLanguage: value === "none" ? "" : value,
                                                                                targetGrade: ""
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="col-span-3">
                                                                            <SelectValue placeholder={t('admin.selectLanguage')} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">{t('common.none')}</SelectItem>
                                                                            {getLanguagesByLevel(formData.targetCurriculum as any, formData.targetLevel as any).map((language) => (
                                                                                <SelectItem key={language.id} value={language.id}>
                                                                                    {language.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                            {formData.targetCurriculum && formData.targetLevel && (
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label>{t('admin.grade')}</Label>
                                                                    <Select
                                                                        value={formData.targetGrade || "none"}
                                                                        onValueChange={(value) => {
                                                                            if (value === "none") {
                                                                                setFormData({...formData, targetGrade: ""});
                                                                            } else {
                                                                                // Automatically extract level and language from the selected grade
                                                                                const grade = getGradeById(value);
                                                                                if (grade) {
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        targetGrade: value,
                                                                                        targetLevel: grade.level,
                                                                                        targetLanguage: grade.language || ""
                                                                                    });
                                                                                } else {
                                                                                    setFormData({...formData, targetGrade: value});
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="col-span-3">
                                                                            <SelectValue placeholder={t('admin.selectGrade')} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">{t('common.none')}</SelectItem>
                                                                            {(formData.targetLanguage
                                                                                ? getGradesByLanguage(formData.targetCurriculum as any, formData.targetLevel as any, formData.targetLanguage as any)
                                                                                : getGradesByLevel(formData.targetCurriculum as any, formData.targetLevel as any)
                                                                            ).map((grade) => (
                                                                                <SelectItem key={grade.id} value={grade.id}>
                                                                                    {grade.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsDialogOpen(false);
                                                                setEditingMessage(null);
                                                            }}>
                                                                {t('common.cancel')}
                                                            </Button>
                                                            <Button onClick={handleSaveMessage}>
                                                                {t('common.save')}
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
                                                                {t('admin.deleteMessageWarning')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteMessage(message.id)}
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
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen && !editingMessage} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('admin.createMessage')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.createMessageDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('admin.message')}</Label>
                            <Textarea
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                rows={4}
                                placeholder={t('admin.enterMessage')}
                            />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label>{t('admin.status')}</Label>
                            <Select
                                value={formData.isActive ? "active" : "inactive"}
                                onValueChange={(value) => setFormData({...formData, isActive: value === "active"})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('admin.active')}</SelectItem>
                                    <SelectItem value="inactive">{t('admin.inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label>{t('admin.curriculum')}</Label>
                            <Select
                                value={formData.targetCurriculum || "none"}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        targetCurriculum: value === "none" ? "" : value,
                                        targetLevel: "",
                                        targetLanguage: "",
                                        targetGrade: ""
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
                        {formData.targetCurriculum && getLevelsByCurriculum(formData.targetCurriculum as any).length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label>{t('admin.level')}</Label>
                                <Select
                                    value={formData.targetLevel || "none"}
                                    onValueChange={(value) => {
                                        setFormData({
                                            ...formData,
                                            targetLevel: value === "none" ? "" : value,
                                            targetLanguage: "",
                                            targetGrade: ""
                                        });
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t('admin.selectLevel')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('common.none')}</SelectItem>
                                        {getLevelsByCurriculum(formData.targetCurriculum as any).map((level) => (
                                            <SelectItem key={level.id} value={level.id}>
                                                {level.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {formData.targetCurriculum && formData.targetLevel && getLanguagesByLevel(formData.targetCurriculum as any, formData.targetLevel as any).length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label>{t('admin.language')}</Label>
                                <Select
                                    value={formData.targetLanguage || "none"}
                                    onValueChange={(value) => {
                                        setFormData({
                                            ...formData,
                                            targetLanguage: value === "none" ? "" : value,
                                            targetGrade: ""
                                        });
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t('admin.selectLanguage')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('common.none')}</SelectItem>
                                        {getLanguagesByLevel(formData.targetCurriculum as any, formData.targetLevel as any).map((language) => (
                                            <SelectItem key={language.id} value={language.id}>
                                                {language.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {formData.targetCurriculum && formData.targetLevel && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label>{t('admin.grade')}</Label>
                                <Select
                                    value={formData.targetGrade || "none"}
                                    onValueChange={(value) => {
                                        if (value === "none") {
                                            setFormData({...formData, targetGrade: ""});
                                        } else {
                                            // Automatically extract level and language from the selected grade
                                            const grade = getGradeById(value);
                                            if (grade) {
                                                setFormData({
                                                    ...formData,
                                                    targetGrade: value,
                                                    targetLevel: grade.level,
                                                    targetLanguage: grade.language || ""
                                                });
                                            } else {
                                                setFormData({...formData, targetGrade: value});
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={t('admin.selectGrade')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('common.none')}</SelectItem>
                                        {(formData.targetLanguage
                                            ? getGradesByLanguage(formData.targetCurriculum as any, formData.targetLevel as any, formData.targetLanguage as any)
                                            : getGradesByLevel(formData.targetCurriculum as any, formData.targetLevel as any)
                                        ).map((grade) => (
                                            <SelectItem key={grade.id} value={grade.id}>
                                                {grade.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveMessage}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MessagesPage;

