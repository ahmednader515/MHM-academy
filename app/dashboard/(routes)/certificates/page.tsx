"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, Award } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { toast } from "sonner";
import axios from "axios";

interface Certificate {
    id: string;
    imageUrl: string;
    title: string | null;
    description: string | null;
    createdAt: string;
    assigner: {
        id: string;
        fullName: string;
    };
}

const MyCertificatesPage = () => {
    const { t, isRTL } = useLanguage();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            const response = await axios.get("/api/certificates/my-certificates");
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

    const handleDownload = (imageUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName || 'certificate.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                <div className="flex items-center gap-2">
                    <Award className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('certificates.myCertificates') || 'My Certificates'}
                    </h1>
                </div>
            </div>

            {certificates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">
                            {t('certificates.noCertificatesYet') || 'You don\'t have any certificates yet.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map((certificate) => (
                        <Card key={certificate.id} className="overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {certificate.title || t('certificates.certificate') || 'Certificate'}
                                </CardTitle>
                                {certificate.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {certificate.description}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {t('certificates.assignedBy') || 'Assigned by'}: {certificate.assigner.fullName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(certificate.createdAt), "dd/MM/yyyy", { locale: ar })}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative w-full aspect-[4/3] border rounded-md overflow-hidden bg-secondary">
                                    <img 
                                        src={certificate.imageUrl} 
                                        alt={certificate.title || 'Certificate'}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => window.open(certificate.imageUrl, '_blank')}
                                    >
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                        {t('certificates.view') || 'View'}
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleDownload(certificate.imageUrl, `${certificate.title || 'certificate'}_${format(new Date(certificate.createdAt), 'yyyy-MM-dd')}.jpg`)}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {t('certificates.download') || 'Download'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyCertificatesPage;

