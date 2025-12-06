"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Wallet, Plus, History, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { Icons } from "@/components/icons";
import Image from "next/image";

interface BalanceTransaction {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PURCHASE";
  description: string;
  createdAt: string;
}

export default function BalancePage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Check if user is a student (USER role)
  const isStudent = session?.user?.role === "USER";

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/balance/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleAddBalance = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t('validation.required'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/balance/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.newBalance);
        setAmount("");
        toast.success(t('common.success'));
        fetchTransactions(); // Refresh transactions
      } else {
        const error = await response.text();
        toast.error(error || t('common.error'));
      }
    } catch (error) {
      console.error("Error adding balance:", error);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.balanceManagement')}</h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? t('dashboard.viewBalanceAndTransactions')
              : t('dashboard.addBalanceToAccount')
            }
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('dashboard.accountBalance')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.availableInAccount')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#211FC3]">
            {balance.toFixed(2)} {t('dashboard.egyptianPound')}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Support Indicator - Only for students */}
      {isStudent && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <Image 
                    src="/whatsapp.png" 
                    alt="WhatsApp" 
                    width={24} 
                    height={24} 
                    className="h-6 w-6"
                  />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  {t('dashboard.whatsappSupport')}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  {t('dashboard.whatsappSupportDescription')}
                </p>
                <Button
                  onClick={() => {
                    const whatsappNumber = "201002095452"; // Admin WhatsApp number
                    const userInfo = session?.user?.name ? ` (${session.user.name})` : '';
                    const message = encodeURIComponent(`Hello! I need to increase my account balance${userInfo}. Please help me add funds to my account.`);
                    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Image 
                    src="/whatsapp.png" 
                    alt="WhatsApp" 
                    width={16} 
                    height={16} 
                    className="h-4 w-4 mr-2"
                  />
                  {t('dashboard.contactWhatsApp')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Balance Section - Only for non-students */}
      {!isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('dashboard.addAmount')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.addAmount')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="number"
                placeholder={t('dashboard.enterAmount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1"
              />
              <Button 
                onClick={handleAddBalance}
                disabled={isLoading}
                className="bg-[#211FC3] hover:bg-[#211FC3]/90"
              >
                {isLoading ? t('dashboard.addingBalance') : t('dashboard.addBalanceButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('dashboard.transactionHistory')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.allFinancialTransactions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#211FC3] mx-auto"></div>
              <p className="mt-2 text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('dashboard.noTransactionsYet')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === "DEPOSIT" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-red-100 text-red-600"
                    }`}>
                      {transaction.type === "DEPOSIT" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                                         <div>
                       <p className="font-medium">
                         {transaction.description.includes("Added") && transaction.type === "DEPOSIT" 
                           ? transaction.description.replace(/Added (\d+(?:\.\d+)?) EGP to balance/, "تم إضافة $1 جنيه إلى الرصيد")
                           : transaction.description.includes("Purchased course:") && transaction.type === "PURCHASE"
                           ? transaction.description.replace(/Purchased course: (.+)/, "تم شراء المادة: $1")
                           : transaction.description
                         }
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {formatDate(transaction.createdAt)}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {transaction.type === "DEPOSIT" ? t('dashboard.depositType') : t('dashboard.purchaseType')}
                       </p>
                     </div>
                   </div>
                   <div className={`font-bold ${
                     transaction.type === "DEPOSIT" ? "text-green-600" : "text-red-600"
                   }`}>
                     {transaction.type === "DEPOSIT" ? "+" : "-"}
                     {Math.abs(transaction.amount).toFixed(2)} {t('dashboard.egyptianPound')}
                   </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 