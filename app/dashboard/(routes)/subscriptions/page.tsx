"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { CheckCircle, Clock, XCircle } from "lucide-react";
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

interface Subscription {
  id: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  plan: SubscriptionPlan;
  request: {
    id: string;
    status: string;
    transactionImage: string;
  } | null;
}

const SubscriptionsPage = () => {
  const { t, isRTL, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const router = useRouter();
  const { data: session } = useSession();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansResponse, subscriptionsResponse] = await Promise.all([
        fetch("/api/subscription-plans"),
        fetch("/api/subscriptions"),
      ]);

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData);
      }

      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json();
        setSubscriptions(subscriptionsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Check for pending subscription
  const pendingSubscription = subscriptions.find(
    (sub) => sub.status === "PENDING" && sub.request?.status === "PENDING"
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  // Show pending confirmation page if there's a pending subscription
  if (pendingSubscription) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('subscriptions.mySubscription') || 'My Subscription'}
          </h1>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              {t('subscriptions.pendingConfirmation') || 'Pending Admin Confirmation'}
            </CardTitle>
            <CardDescription>
              {t('subscriptions.pendingDescription') || 'Your subscription request is pending admin approval. You will be notified once it is reviewed.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.name')}</p>
                <p className="text-lg font-semibold">{session?.user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.plan') || 'Plan'}</p>
                <p className="text-lg font-semibold">
                  {t('subscriptions.gradeSubscription') || 'Grade Subscription'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.price')}</p>
                <p className="text-lg font-semibold">{formatPrice(pendingSubscription.plan.price)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.duration') || 'Duration'}</p>
                <p className="text-lg font-semibold">{pendingSubscription.plan.duration} {t('admin.days') || 'days'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.requestDate') || 'Request Date'}</p>
                <p className="text-lg font-semibold">
                  {format(new Date(pendingSubscription.createdAt), "dd/MM/yyyy hh:mm a", { locale: language === 'ar' ? ar : enUS })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('admin.status')}</p>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {t('admin.pending')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show active or expired subscription if exists
  const activeSubscription = subscriptions.find((sub) => sub.status === "ACTIVE");
  const expiredSubscription = subscriptions.find((sub) => sub.status === "EXPIRED");

  if (activeSubscription || expiredSubscription) {
    const subscription = activeSubscription || expiredSubscription;
    const isExpired = subscription?.status === "EXPIRED" || 
                     (subscription?.endDate && new Date(subscription.endDate) < new Date());

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('subscriptions.mySubscription') || 'My Subscription'}
          </h1>
        </div>

        <Card className={isExpired ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950" : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isExpired ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {isExpired
                ? t('subscriptions.expired') || 'Subscription Expired'
                : t('subscriptions.active') || 'Active Subscription'}
            </CardTitle>
            {isExpired && (
              <CardDescription>
                {t('subscriptions.expiredDescription') || 'Your subscription has expired. Please renew to continue accessing your courses.'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.price')}</p>
                <p className="text-lg font-semibold">{formatPrice(subscription!.plan.price)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.duration') || 'Duration'}</p>
                <p className="text-lg font-semibold">{subscription!.plan.duration} {t('admin.days') || 'days'}</p>
              </div>
              {subscription!.startDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.startDate') || 'Start Date'}</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(subscription!.startDate), "dd/MM/yyyy", { locale: ar })}
                  </p>
                </div>
              )}
              {subscription!.endDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('subscriptions.endDate') || 'End Date'}</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(subscription!.endDate), "dd/MM/yyyy", { locale: ar })}
                  </p>
                </div>
              )}
            </div>
            {isExpired && (
              <Button
                className="w-full"
                onClick={() => router.push(`/dashboard/subscriptions/${subscription!.plan.id}/payment`)}
              >
                {t('subscriptions.renew') || 'Renew Subscription'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show available plans
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('subscriptions.availablePlans') || 'Available Subscription Plans'}
        </h1>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {t('subscriptions.noPlansAvailable') || 'No subscription plans available for your grade.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow duration-300 border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl mb-2">{t('subscriptions.gradeSubscription') || 'Grade Subscription'}</CardTitle>
                <CardDescription className="text-base font-medium text-primary mb-2">
                  {t('subscriptions.allCoursesAvailableFor') || 'All courses will be available for'} {plan.duration} {t('admin.days') || 'days'}
                </CardDescription>
                {plan.description && (
                  <CardDescription className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">{formatPrice(plan.price)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t('subscriptions.duration') || 'Duration'}:</span>
                  <span className="font-semibold">{plan.duration} {t('admin.days') || 'days'}</span>
                </div>
                <Button
                  className="w-full mt-4"
                  size="lg"
                  onClick={() => router.push(`/dashboard/subscriptions/${plan.id}/payment`)}
                >
                  {t('subscriptions.buyNow') || 'Buy Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;

