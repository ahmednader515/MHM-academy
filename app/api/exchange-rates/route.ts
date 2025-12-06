import { NextResponse } from 'next/server';

// Cache exchange rates for 1 hour to avoid hitting rate limits
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;

export async function GET() {
  try {
    // Check if we have cached rates that are still valid
    if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        rates: cachedRates.rates,
        cached: true,
      });
    }

    // Fetch real-time exchange rates from exchangerate-api.com
    // Using the free tier which doesn't require an API key
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EGP', {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();

    // Extract USD rate (1 EGP = X USD, so we need the inverse)
    const usdRate = data.rates?.USD;
    
    if (!usdRate) {
      throw new Error('USD rate not found in response');
    }

    // Calculate rate: 1 EGP = usdRate USD, so to convert EGP to USD: multiply by usdRate
    // For our context, rate is how much of the target currency equals 1 EGP
    const rates = {
      EGP: 1, // Base currency
      USD: usdRate, // 1 EGP = usdRate USD
    };

    // Cache the rates
    cachedRates = {
      rates,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      success: true,
      rates,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if API fails
    return NextResponse.json({
      success: false,
      rates: {
        EGP: 1,
        USD: 0.032, // Fallback rate (approximately 1 USD = 31.25 EGP)
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    });
  }
}

