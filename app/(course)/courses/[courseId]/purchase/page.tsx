"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { ArrowLeft, CreditCard, Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
}

export default function PurchasePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const { courseId } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  useEffect(() => {
    fetchCourse();
    fetchUserBalance();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      } else {
        toast.error("حدث خطأ أثناء تحميل المادة");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("حدث خطأ أثناء تحميل المادة");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handlePurchase = async () => {
    if (!course) return;

    setIsPurchasing(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/purchase`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("تم شراء المادة بنجاح!");
        router.push("/dashboard");
      } else {
        const error = await response.text();
        if (error.includes("Insufficient balance")) {
          toast.error("رصيد غير كافي. يرجى إضافة رصيد إلى حسابك");
        } else if (error.includes("already purchased")) {
          toast.error("لقد قمت بشراء هذه المادة مسبقاً");
        } else {
          toast.error(error || "حدث خطأ أثناء الشراء");
        }
      }
    } catch (error) {
      console.error("Error purchasing course:", error);
      toast.error("حدث خطأ أثناء الشراء");
    } finally {
      setIsPurchasing(false);
    }
  };

  const hasSufficientBalance = course && userBalance >= (course.price || 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#211FC3]"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">المادة غير موجودة</h1>
          <Button asChild>
            <Link href="/dashboard">العودة إلى لوحة التحكم</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              رجوع
            </Button>
            <h1 className="text-2xl font-bold">شراء المادة</h1>
          </div>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
              <CardDescription>
                {course.description || "لا يوجد وصف للمادة"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {course.imageUrl && (
                <div className="mb-4">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="text-2xl font-bold text-[#211FC3]">
                {course.price || 0} EGP
              </div>
            </CardContent>
          </Card>

          {/* Balance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                رصيد الحساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#211FC3]"></div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xl font-bold">
                    {userBalance.toFixed(2)} جنيه
                  </div>
                  {!hasSufficientBalance && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>رصيد غير كافي لشراء هذه المادة</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Actions */}
          <div className="space-y-4">
            {!hasSufficientBalance && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-amber-700 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">رصيد غير كافي</span>
                  </div>
                  <p className="text-amber-700 mb-4">
                    تحتاج إلى {(course.price || 0) - userBalance} جنيه إضافية لشراء هذه المادة
                  </p>
                  <Button asChild className="bg-[#090919] hover:bg-[#090919]/90">
                    <Link href="/dashboard/balance">إضافة رصيد</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handlePurchase}
              disabled={isPurchasing || !hasSufficientBalance}
              className="w-full bg-[#090919] hover:bg-[#090919]/90 text-white"
              size="lg"
            >
              {isPurchasing ? (
                "جاري الشراء..."
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  شراء المادة
                </div>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>سيتم خصم {course.price?.toFixed(2) || "0.00"} جنيه من رصيدك</p>
              <p>ستتمكن من الوصول إلى المادة فوراً بعد الشراء</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 