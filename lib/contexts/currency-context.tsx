"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Rate relative to EGP (base currency)
}

// Base currency definitions (rates will be updated from API)
const BASE_CURRENCIES: Omit<Currency, 'rate'>[] = [
  { code: 'EGP', name: 'جنيه مصري', symbol: 'EGP' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
];

// Default fallback rates
const DEFAULT_RATES: Record<string, number> = {
  EGP: 1,
  USD: 0.032, // Fallback rate
};

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (priceInEGP: number) => number;
  formatPrice: (priceInEGP: number) => string;
  currencies: Currency[];
  isLoadingRates: boolean;
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
  const initialCurrencies = BASE_CURRENCIES.map(c => ({ ...c, rate: DEFAULT_RATES[c.code] || 1 }));
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(initialCurrencies[0]); // Default to EGP
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // Fetch exchange rates from API
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        setIsLoadingRates(true);
        const response = await fetch('/api/exchange-rates');
        const data = await response.json();

        if (data.success && data.rates) {
          // Update currencies with real-time rates
          const updatedCurrencies = BASE_CURRENCIES.map(c => ({
            ...c,
            rate: data.rates[c.code] || DEFAULT_RATES[c.code] || 1,
          }));
          setCurrencies(updatedCurrencies);

          // Update selected currency if it exists, otherwise keep current
          setSelectedCurrency(prev => {
            const updatedSelected = updatedCurrencies.find(c => c.code === prev.code);
            return updatedSelected || prev;
          });
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        // Keep default rates on error
      } finally {
        setIsLoadingRates(false);
      }
    };

    fetchExchangeRates();

    // Refresh rates every hour
    const interval = setInterval(fetchExchangeRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // Only run on mount

  useEffect(() => {
    // Load saved currency from localStorage after currencies are loaded
    if (!isLoadingRates) {
      const savedCurrency = localStorage.getItem('selectedCurrency');
      if (savedCurrency) {
        const currency = currencies.find(c => c.code === savedCurrency);
        if (currency) {
          setSelectedCurrency(currency);
        }
      }
    }
  }, [currencies, isLoadingRates]);

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
    currencies,
    isLoadingRates,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Export currencies array for components that need it (will be updated dynamically)
export const CURRENCIES = BASE_CURRENCIES.map(c => ({ ...c, rate: DEFAULT_RATES[c.code] || 1 }));
