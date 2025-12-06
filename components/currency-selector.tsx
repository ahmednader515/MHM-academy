"use client";

import { useState } from 'react';
import { useCurrency } from '@/lib/contexts/currency-context';

export const CurrencySelector = () => {
  const { selectedCurrency, setSelectedCurrency, currencies } = useCurrency();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const handleCurrencySelect = (currency: typeof currencies[0]) => {
    setSelectedCurrency(currency);
    setIsMobileExpanded(false); // Close on mobile after selection
  };

  const toggleMobileExpanded = () => {
    setIsMobileExpanded(!isMobileExpanded);
  };

  return (
    <>
      {/* Desktop Version - Left Side */}
      <div className="hidden md:block fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
        <div 
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Currency Selector Card */}
          <div className="bg-[#1a1a1a] text-white rounded-r-lg shadow-lg transition-all duration-300 overflow-hidden">
            {/* Collapsed View - Only Currency Letters */}
            {!isHovered && (
              <div className="py-1">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => handleCurrencySelect(currency)}
                    className={`w-full px-2 py-1 text-center transition-all duration-200 ${
                      selectedCurrency.code === currency.code
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-700 text-gray-200'
                    }`}
                  >
                    <span className="text-sm font-bold">{currency.code}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Expanded View - Full Details */}
            {isHovered && (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-center">تحديد العملة</h3>
                </div>
                
                {/* Currency Options */}
                <div className="py-2">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency)}
                      className={`w-full px-4 py-2 text-right transition-all duration-200 flex items-center justify-between ${
                        selectedCurrency.code === currency.code
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-700 text-gray-200'
                      }`}
                    >
                      <span className="text-sm font-medium">{currency.code}</span>
                      <span className="text-sm font-medium mr-3">{currency.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Version - Left Side (Same Design as Desktop) */}
      <div className="md:hidden fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
        <div 
          className="relative"
          onClick={(e) => {
            // If clicking on the collapsed view, expand it
            if (!isMobileExpanded) {
              e.stopPropagation();
              toggleMobileExpanded();
            }
          }}
        >
          {/* Currency Selector Card - Same design as desktop, smaller on mobile */}
          <div className="bg-[#1a1a1a] text-white rounded-r-lg shadow-lg transition-all duration-300 overflow-hidden">
            {/* Collapsed View - Only Currency Letters */}
            {!isMobileExpanded && (
              <div className="py-0.5">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCurrencySelect(currency);
                    }}
                    className={`w-full px-1.5 py-0.5 text-center transition-all duration-200 ${
                      selectedCurrency.code === currency.code
                        ? 'bg-blue-500 text-white'
                        : 'active:bg-gray-700 text-gray-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold">{currency.code}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Expanded View - Full Details */}
            {isMobileExpanded && (
              <>
                {/* Header */}
                <div className="px-2 py-1.5 border-b border-gray-700">
                  <h3 className="text-[10px] font-semibold text-center">تحديد العملة</h3>
                </div>
                
                {/* Currency Options */}
                <div className="py-0.5">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency)}
                      className={`w-full px-2 py-1 text-right transition-all duration-200 flex items-center justify-between ${
                        selectedCurrency.code === currency.code
                          ? 'bg-blue-500 text-white'
                          : 'active:bg-gray-700 text-gray-200'
                      }`}
                    >
                      <span className="text-[10px] font-medium">{currency.code}</span>
                      <span className="text-[10px] font-medium mr-1.5">{currency.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Click outside to close - overlay */}
        {isMobileExpanded && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsMobileExpanded(false)}
          />
        )}
      </div>
    </>
  );
};
