"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface SubscriptionRequest {
  id: string;
  transactionImage: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    user: {
      id: string;
      fullName: string;
      phoneNumber: string;
      email: string;
      curriculum: string | null;
      level: string | null;
      language: string | null;
      grade: string | null;
    };
    plan: {
      id: string;
      curriculum: string;
      level: string | null;
      language: string | null;
      grade: string;
      price: number;
      duration: number;
    };
  };
  reviewer: {
    id: string;
    fullName: string;
  } | null;
}

const SubscriptionRequestsPage = () => {
  const { t, isRTL, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(25);

  // Filter states
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  useEffect(() => {
    fetchRequests();
  }, [selectedCurriculum, selectedLevel, selectedLanguage, selectedGrade, selectedStatus]);

  useEffect(() => {
    setDisplayedCount(25);
  }, [selectedCurriculum, selectedLevel, selectedLanguage, selectedGrade, selectedStatus]);

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCurriculum) params.append("curriculum", selectedCurriculum);
      if (selectedLevel) params.append("level", selectedLevel);
      if (selectedLanguage) params.append("language", selectedLanguage);
      if (selectedGrade) params.append("grade", selectedGrade);
      if (selectedStatus) params.append("status", selectedStatus);

      const response = await fetch(`/api/admin/subscription-requests?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error(t('admin.errorLoadingRequests') || 'Error loading requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm(t('admin.approveRequestConfirm') || 'Are you sure you want to approve this request?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscription-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (response.ok) {
        toast.success(t('common.success'));
        fetchRequests();
      } else {
        toast.error(t('common.error'));
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error(t('common.error'));
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!confirm(t('admin.denyRequestConfirm') || 'Are you sure you want to deny this request?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscription-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny" }),
      });

      if (response.ok) {
        toast.success(t('common.success'));
        fetchRequests();
      } else {
        toast.error(t('common.error'));
      }
    } catch (error) {
      console.error("Error denying request:", error);
      toast.error(t('common.error'));
    }
  };

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

  const filteredRequests = requests.slice(0, displayedCount);

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
          {t('admin.subscriptionRequests') || 'Subscription Requests'}
        </h1>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.filterRequests') || 'Filter Requests'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.curriculum')}</Label>
              <Select value={selectedCurriculum || "all"} onValueChange={(value) => {
                setSelectedCurriculum(value === "all" ? "" : value);
                setSelectedLevel("");
                setSelectedLanguage("");
                setSelectedGrade("");
              }}>
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

            {selectedCurriculum && availableLevels.length > 0 && (
              <div className="space-y-2">
                <Label>{t('admin.level')}</Label>
                <Select value={selectedLevel || "all"} onValueChange={(value) => {
                  setSelectedLevel(value === "all" ? "" : value);
                  setSelectedLanguage("");
                  setSelectedGrade("");
                }}>
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

            {selectedCurriculum && selectedLevel && availableLanguages.length > 0 && (
              <div className="space-y-2">
                <Label>{t('admin.language')}</Label>
                <Select value={selectedLanguage || "all"} onValueChange={(value) => {
                  setSelectedLanguage(value === "all" ? "" : value);
                  setSelectedGrade("");
                }}>
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

            {selectedCurriculum && selectedLevel && availableGrades.length > 0 && (
              <div className="space-y-2">
                <Label>{t('admin.grade')}</Label>
                <Select value={selectedGrade || "all"} onValueChange={(value) => setSelectedGrade(value === "all" ? "" : value)}>
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

            <div className="space-y-2">
              <Label>{t('admin.status')}</Label>
              <Select value={selectedStatus || "all"} onValueChange={(value) => setSelectedStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="PENDING">{t('admin.pending') || 'Pending'}</SelectItem>
                  <SelectItem value="APPROVED">{t('admin.approved') || 'Approved'}</SelectItem>
                  <SelectItem value="DENIED">{t('admin.denied') || 'Denied'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.requestsList') || 'Requests List'}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.noRequestsFound') || 'No requests found'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.name')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.phoneNumber')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.grade')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.price')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.status')}</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.transactionImage') || 'Transaction Image'}</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className={`font-medium ${isRTL ? "text-right" : "text-left"}`}>
                      {request.subscription.user.fullName}
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      {request.subscription.user.phoneNumber}
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      {CURRICULA
                        .find(c => c.id === request.subscription.plan.curriculum)
                        ?.grades.find(g => g.id === request.subscription.plan.grade)?.name || request.subscription.plan.grade}
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      {formatPrice(request.subscription.plan.price)}
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <Badge
                        variant={
                          request.status === "APPROVED" ? "default" :
                          request.status === "DENIED" ? "destructive" :
                          "secondary"
                        }
                      >
                        {request.status === "PENDING" ? t('admin.pending') :
                         request.status === "APPROVED" ? t('admin.approved') :
                         t('admin.denied')}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsImageDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : "text-left"}>
                      {request.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeny(request.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {requests.length > displayedCount && (
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

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('admin.transactionImage') || 'Transaction Image'}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="relative w-full h-96">
                <Image
                  src={selectedRequest.transactionImage}
                  alt="Transaction"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>{t('dashboard.name')}:</strong> {selectedRequest.subscription.user.fullName}</p>
                <p><strong>{t('dashboard.phoneNumber')}:</strong> {selectedRequest.subscription.user.phoneNumber}</p>
                <p><strong>{t('dashboard.email')}:</strong> {selectedRequest.subscription.user.email}</p>
                <p><strong>{t('dashboard.price')}:</strong> {formatPrice(selectedRequest.subscription.plan.price)}</p>
                <p><strong>{t('admin.requestDate') || 'Request Date'}:</strong> {format(new Date(selectedRequest.createdAt), "dd/MM/yyyy hh:mm a", { locale: language === 'ar' ? ar : enUS })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionRequestsPage;

