"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/file-upload";
import { Award, Plus, Download, Image as ImageIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { toast } from "sonner";
import axios from "axios";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";

interface Certificate {
    id: string;
    imageUrl: string;
    title: string | null;
    description: string | null;
    createdAt: string;
    student: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
    };
    assigner: {
        id: string;
        fullName: string;
    };
}

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    role: string;
    curriculum?: string;
    curriculumType?: string;
    level?: string;
    language?: string;
    grade?: string;
}

const CertificatesPage = () => {
    const { t, isRTL } = useLanguage();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Form state
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [certificateImageUrl, setCertificateImageUrl] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);

    // Filter states for student selection
    const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
    const [selectedCurriculumType, setSelectedCurriculumType] = useState<string>("");
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("");

    useEffect(() => {
        fetchCertificates();
        fetchStudents();
    }, []);

    const fetchCertificates = async () => {
        try {
            const response = await axios.get("/api/certificates");
            if (response.data) {
                setCertificates(response.data);
            }
        } catch (error) {
            console.error("Error fetching certificates:", error);
            toast.error(t('certificates.errorLoading') || 'Error loading certificates');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await axios.get("/api/teacher/users");
            if (response.data) {
                // Filter only USER role (students)
                const studentUsers = response.data.filter((user: User) => user.role === "USER");
                setStudents(studentUsers);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
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
    };

    const handleCurriculumTypeChange = (value: string) => {
        setSelectedCurriculumType(value === "all" ? "" : value);
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

    // Filter students based on search and classification
    const filteredStudents = students.filter(student => {
        // Search filter
        const matchesSearch = 
            student.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
            student.phoneNumber.includes(studentSearchTerm) ||
            (student.email && student.email.toLowerCase().includes(studentSearchTerm.toLowerCase()));

        // Classification filters
        const matchesCurriculum = !selectedCurriculum || student.curriculum === selectedCurriculum;
        const matchesCurriculumType = !selectedCurriculumType || student.curriculumType === selectedCurriculumType;
        const matchesLevel = !selectedLevel || student.level === selectedLevel;
        const matchesLanguage = !selectedLanguage || student.language === selectedLanguage;
        const matchesGrade = !selectedGrade || student.grade === selectedGrade;

        return matchesSearch && matchesCurriculum && matchesCurriculumType && matchesLevel && matchesLanguage && matchesGrade;
    });

    const handleSubmit = async () => {
        if (!selectedStudentId || !certificateImageUrl) {
            toast.error(t('certificates.fillRequired') || 'Please fill in all required fields');
            return;
        }

        setUploading(true);
        try {
            await axios.post("/api/certificates", {
                studentId: selectedStudentId,
                imageUrl: certificateImageUrl,
                title: title || null,
                description: description || null,
            });
            
            toast.success(t('certificates.createdSuccess') || 'Certificate created successfully!');
            setIsDialogOpen(false);
            // Reset form
            setSelectedStudentId("");
            setCertificateImageUrl("");
            setTitle("");
            setDescription("");
            setStudentSearchTerm("");
            setSelectedCurriculum("");
            setSelectedCurriculumType("");
            setSelectedLevel("");
            setSelectedLanguage("");
            setSelectedGrade("");
            // Refresh certificates list
            fetchCertificates();
        } catch (error) {
            console.error("Error creating certificate:", error);
            toast.error(t('certificates.createError') || 'Failed to create certificate');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = (imageUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName || 'certificate.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        // Safely remove the link
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    };

    const filteredCertificates = certificates.filter(cert => 
        cert.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.student.phoneNumber.includes(searchTerm)
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
                    {t('certificates.managementTitle') || 'Certificates Management'}
                </h1>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        // Reset form and filters when dialog closes
                        setSelectedStudentId("");
                        setCertificateImageUrl("");
                        setTitle("");
                        setDescription("");
                        setStudentSearchTerm("");
                        setSelectedCurriculum("");
                        setSelectedCurriculumType("");
                        setSelectedLevel("");
                        setSelectedLanguage("");
                        setSelectedGrade("");
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('certificates.createCertificate') || 'Create Certificate'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>{t('certificates.createCertificate') || 'Create Certificate'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Student Filter Section */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold">{t('certificates.selectStudent') || 'Select Student'}</Label>
                                
                                {/* Filter Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">{t('admin.filterStudents') || 'Filter Students'}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* Search */}
                                            <div>
                                                <Label>{t('dashboard.searchByNameOrPhone') || 'Search'}</Label>
                                                <Input
                                                    placeholder={t('dashboard.searchByNameOrPhone') || 'Search by name, phone, or email'}
                                                    value={studentSearchTerm}
                                                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                                                />
                                            </div>

                                            {/* Filter Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                                {/* Curriculum Filter */}
                                                <div className="space-y-2">
                                                    <Label>{t('admin.curriculum') || 'Curriculum'}</Label>
                                                    <Select value={selectedCurriculum || "all"} onValueChange={handleCurriculumChange}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('admin.selectCurriculum') || 'Select Curriculum'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
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
                                                                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                                                                <SelectItem value="morning">{t('admin.morning') || 'صباحي'}</SelectItem>
                                                                <SelectItem value="evening">{t('admin.evening') || 'مسائي'}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                {/* Level Filter */}
                                                {selectedCurriculum && availableLevels.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label>{t('admin.level') || 'Level'}</Label>
                                                        <Select value={selectedLevel || "all"} onValueChange={handleLevelChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('admin.selectLevel') || 'Select Level'} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
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
                                                        <Label>{t('admin.language') || 'Language'}</Label>
                                                        <Select value={selectedLanguage || "all"} onValueChange={handleLanguageChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('admin.selectLanguage') || 'Select Language'} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
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
                                                        <Label>{t('admin.grade') || 'Grade'}</Label>
                                                        <Select value={selectedGrade || "all"} onValueChange={handleGradeChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('admin.selectGrade') || 'Select Grade'} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
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
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Student Select */}
                                <div>
                                    <Label className="mb-2 block">{t('certificates.selectStudent') || 'Select Student'}</Label>
                                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('certificates.selectStudentPlaceholder') || 'Select a student'} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {filteredStudents.length === 0 ? (
                                                <SelectItem value="" disabled>
                                                    {t('admin.noStudentsFound') || 'No students found'}
                                                </SelectItem>
                                            ) : (
                                                filteredStudents.map((student) => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.fullName} ({student.phoneNumber})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {filteredStudents.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {filteredStudents.length} {t('admin.studentsFound') || 'student(s) found'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">{t('certificates.certificateImage') || 'Certificate Image'}</Label>
                                {certificateImageUrl ? (
                                    <div className="space-y-2">
                                        <div className="relative w-full max-w-md border rounded-md">
                                            <img 
                                                src={certificateImageUrl} 
                                                alt="Certificate preview"
                                                className="w-full h-auto rounded-md"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={() => setCertificateImageUrl("")}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <FileUpload
                                        endpoint="certificateImage"
                                        onChange={(res) => {
                                            if (res?.url) {
                                                setCertificateImageUrl(res.url);
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            <div>
                                <Label className="mb-2 block">{t('certificates.titleLabel') || 'Title'} ({t('dashboard.optional') || 'Optional'})</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t('certificates.titlePlaceholder') || 'Certificate title'}
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block">{t('certificates.description') || 'Description'} ({t('dashboard.optional') || 'Optional'})</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('certificates.descriptionPlaceholder') || 'Certificate description'}
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    {t('dashboard.cancel') || 'Cancel'}
                                </Button>
                                <Button onClick={handleSubmit} disabled={uploading || !selectedStudentId || !certificateImageUrl}>
                                    {uploading ? t('dashboard.creating') || 'Creating...' : t('certificates.create') || 'Create'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('certificates.allCertificates') || 'All Certificates'}</CardTitle>
                    <div className="flex items-center space-x-2 mt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('certificates.searchByStudent') || 'Search by student name, email, or phone'}
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
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('certificates.student') || 'Student'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('certificates.titleLabel') || 'Title'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('certificates.assignedBy') || 'Assigned By'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('certificates.createdAt') || 'Created At'}</TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCertificates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        {t('certificates.noCertificates') || 'No certificates found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCertificates.map((certificate) => (
                                    <TableRow key={certificate.id}>
                                        <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                                            {certificate.student.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {certificate.title || '-'}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {certificate.assigner.fullName}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            {format(new Date(certificate.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell className={isRTL ? "text-right" : "text-left"}>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(certificate.imageUrl, '_blank')}
                                                >
                                                    <ImageIcon className="h-4 w-4 mr-2" />
                                                    {t('certificates.view') || 'View'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(certificate.imageUrl, `${certificate.student.fullName}_certificate.jpg`)}
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    {t('certificates.download') || 'Download'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default CertificatesPage;

