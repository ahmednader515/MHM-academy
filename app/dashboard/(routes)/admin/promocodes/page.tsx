"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  points: number;
  hasPromocode: boolean;
  hasPendingRequest: boolean;
  promocode: {
    id: string;
    code: string;
    discountPercentage: number;
    isUsed: boolean;
    createdAt: string;
  } | null;
  pendingRequest: {
    id: string;
    status: string;
    requestedAt: string;
  } | null;
}

export default function PromocodesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<number>(10);
  const [isCreating, setIsCreating] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(25);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    setDisplayedCount(25);
  }, [searchTerm]);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/admin/promocodes");
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        toast.error(t('admin.failedToLoadStudents') || 'Failed to load students');
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error(t('admin.errorLoadingStudents') || 'Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromocode = async () => {
    if (!selectedStudent) return;

    if (discountPercentage < 1 || discountPercentage > 100) {
      toast.error(t('admin.discountMustBeBetween1And100') || 'Discount must be between 1 and 100');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          discountPercentage,
        }),
      });

      if (response.ok) {
        toast.success(t('admin.promocodeCreatedSuccessfully') || 'Promocode created successfully');
        setIsDialogOpen(false);
        fetchStudents();
        router.refresh();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || t('admin.failedToCreatePromocode') || 'Failed to create promocode');
      }
    } catch (error) {
      console.error("Error creating promocode:", error);
      toast.error(t('admin.errorCreatingPromocode') || 'Error creating promocode');
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateDialog = (student: Student) => {
    setSelectedStudent(student);
    setDiscountPercentage(10);
    setIsDialogOpen(true);
  };

  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phoneNumber.includes(searchTerm)
  );

  const studentsWithoutPromocode = filteredStudents.filter((s) => !s.hasPromocode);
  const studentsWithPromocode = filteredStudents.filter((s) => s.hasPromocode);
  
  // Separate students with pending requests
  const studentsWithPendingRequests = filteredStudents.filter((s) => s.hasPendingRequest && !s.hasPromocode);

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
        <div>
          <h1 className="text-3xl font-bold">{t('admin.promocodeManagement') || 'Promocode Management'}</h1>
          <p className="text-muted-foreground">
            {t('admin.manageStudentPromocodes') || 'Manage student promocodes and discount codes'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t('admin.searchStudents') || 'Search students...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students with pending requests */}
      {studentsWithPendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.studentsWithPendingRequests') || 'Students With Pending Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithPendingRequests.slice(0, displayedCount).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50/50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{student.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-sm text-muted-foreground">{student.phoneNumber}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <Ticket className="h-4 w-4 mr-1" />
                        {student.points} {t('navigation.points') || 'Points'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                        {t('admin.pendingRequest') || 'Pending Request'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => openCreateDialog(student)}
                    className="ml-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.createPromocode') || 'Create Promocode'}
                  </Button>
                </div>
              ))}
            </div>
            {studentsWithPendingRequests.length > displayedCount && (
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

      {/* Students without promocode or request */}
      {studentsWithoutPromocode.filter((s) => !s.hasPendingRequest).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.studentsWithoutPromocode') || 'Students Without Promocode'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithoutPromocode.filter((s) => !s.hasPendingRequest).slice(0, displayedCount).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{student.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-sm text-muted-foreground">{student.phoneNumber}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <Ticket className="h-4 w-4 mr-1" />
                        {student.points} {t('navigation.points') || 'Points'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => openCreateDialog(student)}
                    className="ml-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.createPromocode') || 'Create Promocode'}
                  </Button>
                </div>
              ))}
            </div>
            {studentsWithoutPromocode.filter((s) => !s.hasPendingRequest).length > displayedCount && (
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

      {/* Students with promocode */}
      {studentsWithPromocode.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {t('admin.studentsWithPromocode') || 'Students With Promocode'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithPromocode.slice(0, displayedCount).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{student.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-sm text-muted-foreground">{student.phoneNumber}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <Ticket className="h-4 w-4 mr-1" />
                        {student.points} {t('navigation.points') || 'Points'}
                      </span>
                      {student.promocode && (
                        <>
                          <code className="px-2 py-1 rounded bg-gray-100 text-sm font-mono">
                            {student.promocode.code}
                          </code>
                          <span className="text-sm text-muted-foreground">
                            {student.promocode.discountPercentage}% {t('dashboard.discount') || 'discount'}
                          </span>
                          {student.promocode.isUsed && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                              {t('admin.used') || 'Used'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {studentsWithPromocode.length > displayedCount && (
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

      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {t('admin.noStudentsFound') || 'No students found'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Promocode Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.createPromocode') || 'Create Promocode'}</DialogTitle>
            <DialogDescription>
              {t('admin.createPromocodeFor') || 'Create a promocode for'} {selectedStudent?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="discount">{t('admin.discountPercentage') || 'Discount Percentage'}</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.discountPercentageHint') || 'Enter a value between 1 and 100'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isCreating}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleCreatePromocode} disabled={isCreating}>
                {isCreating
                  ? t('common.creating') || 'Creating...'
                  : t('admin.createPromocode') || 'Create Promocode'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

