"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Rate relative to EGP (base currency)
}

export const CURRENCIES: Currency[] = [
  { code: 'EGP', name: 'جنيه مصري', symbol: 'EGP', rate: 1 },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$', rate: 0.032 },
];

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (priceInEGP: number) => number;
  formatPrice: (priceInEGP: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]); // Default to EGP

  useEffect(() => {
    // Load saved currency from localStorage
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      const currency = CURRENCIES.find(c => c.code === savedCurrency);
      if (currency) {
        setSelectedCurrency(currency);
      }
    }
  }, []);

  const handleSetSelectedCurrency = (currency: Currency) => {
    setSelectedCurrency(currency);
    localStorage.setItem('selectedCurrency', currency.code);
  };

  const convertPrice = (priceInEGP: number): number => {
    return priceInEGP * selectedCurrency.rate;
  };

  const formatPrice = (priceInEGP: number): string => {
    const convertedPrice = convertPrice(priceInEGP);
    return `${convertedPrice.toFixed(2)} ${selectedCurrency.symbol}`;
  };

  const value: CurrencyContextType = {
    selectedCurrency,
    setSelectedCurrency: handleSetSelectedCurrency,
    convertPrice,
    formatPrice,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
