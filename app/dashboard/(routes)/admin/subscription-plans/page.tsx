"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { CURRICULA, getLevelsByCurriculum, getLanguagesByLevel, getGradesByLanguage, getGradesByLevel } from "@/lib/data/curriculum-data";

interface SubscriptionPlan {
  id: string;
  curriculum: string;
  level: string | null;
  language: string | null;
  grade: string;
  price: number;
  duration: number;
  isActive: boolean;
  description: string | null;
}

const SubscriptionPlansPage = () => {
  const { t, isRTL } = useLanguage();
  const { formatPrice } = useCurrency();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    curriculum: "",
    level: "",
    language: "",
    grade: "",
    price: "",
    duration: "30",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/subscription-plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error(t('admin.errorLoadingPlans') || 'Error loading plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      curriculum: "",
      level: "",
      language: "",
      grade: "",
      price: "",
      duration: "30",
      description: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      curriculum: plan.curriculum,
      level: plan.level || "",
      language: plan.language || "",
      grade: plan.grade,
      price: plan.price.toString(),
      duration: plan.duration.toString(),
      description: plan.description || "",
      isActive: plan.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.curriculum || !formData.grade || !formData.price) {
      toast.error(t('admin.requiredFields') || 'Please fill all required fields');
      return;
    }

    try {
      if (editingPlan) {
        const response = await fetch(`/api/admin/subscription-plans/${editingPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price: formData.price,
            duration: formData.duration,
            description: formData.description,
            isActive: formData.isActive,
          }),
        });

        if (response.ok) {
          toast.success(t('common.success'));
          setIsDialogOpen(false);
          fetchPlans();
        } else {
          toast.error(t('common.error'));
        }
      } else {
        const response = await fetch("/api/admin/subscription-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            curriculum: formData.curriculum,
            level: formData.level || null,
            language: formData.language || null,
            grade: formData.grade,
            price: formData.price,
            duration: formData.duration,
            description: formData.description || null,
            isActive: formData.isActive,
          }),
        });

        if (response.ok) {
          toast.success(t('common.success'));
          setIsDialogOpen(false);
          fetchPlans();
        } else {
          const error = await response.text();
          toast.error(error || t('common.error'));
        }
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm(t('admin.deletePlanConfirm') || 'Are you sure you want to delete this plan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t('common.success'));
        fetchPlans();
      } else {
        toast.error(t('common.error'));
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(t('common.error'));
    }
  };

  const availableLevels = formData.curriculum
    ? getLevelsByCurriculum(formData.curriculum as any)
    : [];

  const availableLanguages = formData.curriculum && formData.level
    ? getLanguagesByLevel(formData.curriculum as any, formData.level as any)
    : [];

  const availableGrades = formData.curriculum && formData.level
    ? (formData.language
        ? getGradesByLanguage(formData.curriculum as any, formData.level as any, formData.language as any)
        : getGradesByLevel(formData.curriculum as any, formData.level as any))
    : [];

  const getGradeName = (curriculum: string, grade: string) => {
    const gradeObj = CURRICULA
      .find(c => c.id === curriculum)
      ?.grades.find(g => g.id === grade);
    return gradeObj?.name || grade;
  };

  const getCurriculumName = (id: string) => {
    return CURRICULA.find(c => c.id === id)?.name || id;
  };

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
          {t('admin.subscriptionPlans') || 'Subscription Plans'}
        </h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createPlan') || 'Create Plan'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.plansList') || 'Plans List'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.curriculum')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.grade')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.price')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.duration') || 'Duration (days)'}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('admin.status')}</TableHead>
                <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {getCurriculumName(plan.curriculum)}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {getGradeName(plan.curriculum, plan.grade)}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {formatPrice(plan.price)}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    {plan.duration} {t('admin.days') || 'days'}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? t('admin.active') : t('admin.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t('admin.editPlan') || 'Edit Plan' : t('admin.createPlan') || 'Create Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? t('admin.editPlanDescription') || 'Edit subscription plan details' : t('admin.createPlanDescription') || 'Create a new subscription plan for a specific grade'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingPlan && (
              <>
                <div className="space-y-2">
                  <Label>{t('admin.curriculum')}</Label>
                  <Select
                    value={formData.curriculum}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        curriculum: value,
                        level: "",
                        language: "",
                        grade: "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.selectCurriculum')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRICULA.map((curriculum) => (
                        <SelectItem key={curriculum.id} value={curriculum.id}>
                          {curriculum.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.curriculum && availableLevels.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('admin.level')}</Label>
                    <Select
                      value={formData.level || "all"}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          level: value === "all" ? "" : value,
                          language: "",
                          grade: "",
                        });
                      }}
                    >
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

                {formData.curriculum && formData.level && availableLanguages.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('admin.language')}</Label>
                    <Select
                      value={formData.language || "all"}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          language: value === "all" ? "" : value,
                          grade: "",
                        });
                      }}
                    >
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

                {formData.curriculum && formData.level && availableGrades.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('admin.grade')}</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(value) => setFormData({ ...formData, grade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.selectGrade')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGrades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>{t('dashboard.price')}</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('admin.duration') || 'Duration (days)'}</Label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="30"
                min="1"
              />
              <p className="text-sm text-muted-foreground">
                {t('admin.durationHint') || 'The number represents days'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.description') || 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin.planDescriptionPlaceholder') || 'Enter plan description...'}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive">{t('admin.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPlansPage;

