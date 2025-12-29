"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { toast } from "sonner";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";

interface SubscriptionPlan {
  id: string;
  curriculum: string;
  level: string | null;
  language: string | null;
  grade: string;
  price: number;
  duration: number;
  description: string | null;
}

const PaymentPage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { t, isRTL } = useLanguage();
  const { formatPrice } = useCurrency();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionImage, setTransactionImage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planId = params?.planId as string;

  useEffect(() => {
    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  const fetchPlan = async () => {
    try {
      const response = await fetch("/api/subscription-plans");
      if (response.ok) {
        const plans = await response.json();
        const foundPlan = plans.find((p: SubscriptionPlan) => p.id === planId);
        if (foundPlan) {
          setPlan(foundPlan);
        } else {
          toast.error(t('subscriptions.planNotFound') || 'Plan not found');
          router.push("/dashboard/subscriptions");
        }
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!transactionImage) {
      toast.error(t('subscriptions.transactionImageRequired') || 'Please upload transaction confirmation image');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan?.id,
          transactionImage,
        }),
      });

      if (response.ok) {
        toast.success(t('subscriptions.requestSubmitted') || 'Subscription request submitted successfully');
        router.push("/dashboard/subscriptions");
      } else {
        const error = await response.text();
        toast.error(error || t('common.error'));
      }
    } catch (error) {
      console.error("Error submitting subscription:", error);
      toast.error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  const vodafoneCashNumber = "01002095452";
  const whatsappNumber = "201002095452"; // Admin WhatsApp number for support

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('subscriptions.payment') || 'Payment'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('subscriptions.paymentInformation') || 'Payment Information'}</CardTitle>
            <CardDescription>
              {t('subscriptions.paymentInstructions') || 'Please send the payment amount to the number below and upload the transaction confirmation image.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('subscriptions.amountToPay') || 'Amount to Pay'}</Label>
              <div className="text-2xl font-bold text-[#211FC3]">
                {formatPrice(plan.price)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('subscriptions.sendTo') || 'Send Payment To'}</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="font-semibold text-lg">{vodafoneCashNumber}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('subscriptions.vodafoneCashNumber') || 'This is a Vodafone Cash number'}
                </p>
              </div>
            </div>

            {/* WhatsApp Support Button */}
            <div className="pt-2 space-y-2">
              <Button
                onClick={() => {
                  const userInfo = session?.user?.name ? ` (${session.user.name})` : '';
                  const message = encodeURIComponent(`${t('subscriptions.whatsappSupportMessage') || 'Hello! I need help with my subscription payment'}${userInfo}.`);
                  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Image 
                  src="/whatsapp.png" 
                  alt="WhatsApp" 
                  width={16} 
                  height={16} 
                  className="h-4 w-4 mr-2"
                />
                {t('subscriptions.contactAdminWhatsApp') || 'Contact Admin via WhatsApp'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t('subscriptions.contactAdminHint') || 'In case of any trouble or questions'}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t('subscriptions.paymentNote') || 'After sending the payment, please upload a screenshot or photo of the transaction confirmation.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>{t('subscriptions.transactionConfirmation') || 'Transaction Confirmation'}</CardTitle>
            <CardDescription>
              {t('subscriptions.uploadTransactionImage') || 'Upload the transaction confirmation image (screenshot or photo)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactionImage ? (
              <div className="space-y-4">
                <div className="relative w-full h-64 border rounded-lg overflow-hidden">
                  <Image
                    src={transactionImage}
                    alt="Transaction"
                    fill
                    className="object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setTransactionImage("")}
                  className="w-full"
                >
                  {t('subscriptions.changeImage') || 'Change Image'}
                </Button>
              </div>
            ) : (
              <FileUpload
                endpoint="transactionImage"
                onChange={(res) => {
                  if (res?.url) {
                    setTransactionImage(res.url);
                  }
                }}
              />
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!transactionImage || isSubmitting}
            >
              {isSubmitting ? (
                t('common.submitting') || 'Submitting...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('subscriptions.submitRequest') || 'Submit Request'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptions.subscriptionDetails') || 'Subscription Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.plan') || 'Plan'}</p>
              <p className="text-lg font-semibold">{t('subscriptions.gradeSubscription') || 'Grade Subscription'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.duration') || 'Duration'}</p>
              <p className="text-lg font-semibold">{plan.duration} {t('admin.days') || 'days'}</p>
            </div>
            {plan.description && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">{t('admin.description')}</p>
                <p className="text-sm">{plan.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;

