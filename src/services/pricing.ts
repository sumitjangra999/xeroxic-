// Pricing configuration service for Xeroxic Document Station
import { supabase } from './supabase';

export interface PricingConfig {
  bwSingleSided: number;        // ₹ per page for single-sided B&W
  bwDoubleSided: number;        // ₹ per physical sheet (holds 2 pages front & back)
  colorSingleSided: number;     // ₹ per page for single-sided Color
  colorDoubleSided: number;     // ₹ per side for double-sided Color
  a3Multiplier: number;         // Multiplier for A3 paper (e.g. 2x)
  photoPaperFee: number;        // Surcharge for photo paper per copy (₹)
  urgentFee: number;            // Urgent priority queue fee (₹)
  letterPaperMultiplier: number;// Multiplier for Letter paper (1x)
}

export const DEFAULT_PRICING: PricingConfig = {
  bwSingleSided: 2,
  bwDoubleSided: 2,
  colorSingleSided: 10,
  colorDoubleSided: 9,
  a3Multiplier: 2,
  photoPaperFee: 15,
  urgentFee: 10,
  letterPaperMultiplier: 1,
};

const STORAGE_KEY_PRICING = 'xeroxic_pricing_config_v3';
const SYSTEM_PRICING_FILE = 'system_records/_xeroxic_pricing_config.json';

export function getPricingConfig(): PricingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRICING);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PRICING, JSON.stringify(DEFAULT_PRICING));
      return DEFAULT_PRICING;
    }
    const parsed = JSON.parse(raw);
    return {
      bwSingleSided: Number(parsed.bwSingleSided) || DEFAULT_PRICING.bwSingleSided,
      bwDoubleSided: Number(parsed.bwDoubleSided) || DEFAULT_PRICING.bwDoubleSided,
      colorSingleSided: Number(parsed.colorSingleSided) || DEFAULT_PRICING.colorSingleSided,
      colorDoubleSided: Number(parsed.colorDoubleSided) || DEFAULT_PRICING.colorDoubleSided,
      a3Multiplier: Number(parsed.a3Multiplier) || DEFAULT_PRICING.a3Multiplier,
      photoPaperFee: Number(parsed.photoPaperFee) || DEFAULT_PRICING.photoPaperFee,
      urgentFee: Number(parsed.urgentFee) || DEFAULT_PRICING.urgentFee,
      letterPaperMultiplier: Number(parsed.letterPaperMultiplier) || DEFAULT_PRICING.letterPaperMultiplier,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

export function savePricingConfig(newConfig: PricingConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRICING, JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('xeroxic_pricing_updated', { detail: newConfig }));

    // Upload to Supabase storage in background so all devices get the same updated pricing
    const blob = new Blob([JSON.stringify(newConfig, null, 2)], { type: 'application/json' });
    supabase.storage
      .from('assignment')
      .upload(SYSTEM_PRICING_FILE, blob, { upsert: true })
      .catch((err) => console.warn('Pricing cloud upload note:', err));
  } catch (err) {
    console.error('Error saving pricing config:', err);
  }
}

export function resetPricingConfig(): PricingConfig {
  savePricingConfig(DEFAULT_PRICING);
  return DEFAULT_PRICING;
}

export async function syncPricingFromSupabase(): Promise<PricingConfig> {
  try {
    const { data, error } = await supabase.storage.from('assignment').download(SYSTEM_PRICING_FILE);
    if (!error && data) {
      const text = await data.text();
      const remoteConfig: PricingConfig = JSON.parse(text);
      if (remoteConfig && typeof remoteConfig.bwSingleSided === 'number') {
        localStorage.setItem(STORAGE_KEY_PRICING, JSON.stringify(remoteConfig));
        window.dispatchEvent(new CustomEvent('xeroxic_pricing_updated', { detail: remoteConfig }));
        return remoteConfig;
      }
    }
  } catch (err) {
    console.warn('Could not sync pricing from Supabase storage:', err);
  }
  return getPricingConfig();
}
