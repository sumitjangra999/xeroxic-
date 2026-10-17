import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  getPricingConfig,
  savePricingConfig,
  resetPricingConfig,
  PricingConfig,
} from '../services/pricing';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Sliders,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface RateCardProps {
  user?: User | null;
}

export const RateCard: React.FC<RateCardProps> = ({ user }) => {
  const isAdmin = user?.role === 'admin';
  const [pricing, setPricing] = useState<PricingConfig>(() => getPricingConfig());
  const [editConfig, setEditConfig] = useState<PricingConfig>(() => getPricingConfig());
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const cfg = e.detail || getPricingConfig();
      setPricing(cfg);
      setEditConfig(cfg);
    };
    window.addEventListener('xeroxic_pricing_updated', handleUpdate);
    return () => window.removeEventListener('xeroxic_pricing_updated', handleUpdate);
  }, []);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    savePricingConfig(editConfig);
    setPricing(editConfig);
    setFeedback({
      message: 'Printing rates updated successfully! New rates are now active across student portals & checkout.',
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all printing prices back to standard campus defaults?')) {
      const def = resetPricingConfig();
      setPricing(def);
      setEditConfig(def);
      setFeedback({
        message: 'Prices reset to campus defaults.',
        type: 'info',
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
            Xerox Rates & Details
          </h1>
          <p className="text-xs text-[#605e5c] mt-0.5">
            Current printing and photocopying charges at the college Xerox shop
          </p>
        </div>

        {isAdmin && (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#0067b8]/10 text-[#0067b8] border border-[#0067b8]/30 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Rate Manager Active</span>
          </span>
        )}
      </div>

      {/* ADMIN ONLY: EDITABLE PRICE CONFIGURATION PANEL */}
      {isAdmin && (
        <div className="bg-white border-2 border-[#0067b8] rounded-xl p-5 shadow-sm space-y-5 animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-[#edebe9]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0067b8] text-white flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#242424]">Admin Print Rates & Criteria Manager</h2>
                <p className="text-[11px] text-[#605e5c]">
                  Change copy prices below. Changes are saved immediately and update student upload calculations instantly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-[#605e5c] hover:text-[#d83b01] flex items-center space-x-1 font-semibold transition-colors"
              title="Reset to campus defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-[#dff6dd] text-[#107c10] border border-[#a2e6a0]'
                  : 'bg-[#e6f2fb] text-[#0067b8] border border-[#cbe4f9]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveRates} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* B&W Single Sided */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  B&W Single Sided (₹)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#605e5c] font-bold">₹</span>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={editConfig.bwSingleSided}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, bwSingleSided: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#0067b8] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">/ page</span>
                </div>
                <p className="text-[10px] text-[#797775]">Each page on separate sheet</p>
              </div>

              {/* B&W Double Sided (Front & Back) */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  B&W Double Sided (₹)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#605e5c] font-bold">₹</span>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={editConfig.bwDoubleSided}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, bwDoubleSided: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#107c10] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">/ sheet</span>
                </div>
                <p className="text-[10px] text-[#797775]">2 pages on 1 sheet (front & back)</p>
              </div>

              {/* Color Single Sided */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  Color Single Sided (₹)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#605e5c] font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editConfig.colorSingleSided}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, colorSingleSided: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#0067b8] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">/ page</span>
                </div>
                <p className="text-[10px] text-[#797775]">Color charts & cover pages</p>
              </div>

              {/* Color Double Sided */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  Color Double Sided (₹)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#605e5c] font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editConfig.colorDoubleSided}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, colorDoubleSided: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#0067b8] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">/ side</span>
                </div>
                <p className="text-[10px] text-[#797775]">Duplex color presentation</p>
              </div>

              {/* A3 Paper Multiplier */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  A3 Sheet Multiplier
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    required
                    value={editConfig.a3Multiplier}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, a3Multiplier: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#242424] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">x (rate)</span>
                </div>
                <p className="text-[10px] text-[#797775]">Default 2x of A4 rate</p>
              </div>

              {/* Photo Paper Fee */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  Photo Paper Finish (+₹)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#605e5c] font-bold">+₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editConfig.photoPaperFee}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, photoPaperFee: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#242424] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">/ copy</span>
                </div>
                <p className="text-[10px] text-[#797775]">Glossy high-resolution finish</p>
              </div>

              {/* Urgent Priority Fee */}
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e1dfdd] space-y-1.5">
                <label className="font-semibold text-[#242424] block">
                  Urgent Priority Fee (+₹)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#605e5c] font-bold">+₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editConfig.urgentFee}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, urgentFee: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full py-1.5 px-2.5 bg-white border border-[#8a8886] rounded text-sm font-bold text-[#d83b01] focus:outline-none focus:border-[#0067b8]"
                  />
                  <span className="text-[11px] text-[#605e5c]">flat</span>
                </div>
                <p className="text-[10px] text-[#797775]">Fast-track queue (10-15 min)</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0067b8] hover:bg-[#005da6] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save New Pricing Rates</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Pricing Table */}
      <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#f3f2f1] border-b border-[#e1dfdd] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#242424]">Document Printing Rates (Live)</h2>
          <span className="text-[11px] text-[#605e5c]">Verified campus rates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf9f8] text-[#605e5c] border-b border-[#edebe9]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Print Type</th>
                <th className="py-2.5 px-4 font-semibold">Paper Size</th>
                <th className="py-2.5 px-4 font-semibold">Single Sided</th>
                <th className="py-2.5 px-4 font-semibold">Double Sided (Back-to-Back)</th>
                <th className="py-2.5 px-4 font-semibold">Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edebe9] text-[#242424]">
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Black & White</td>
                <td className="py-3 px-4 text-[#605e5c]">A4 Standard</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹{pricing.bwSingleSided}.00 / page</td>
                <td className="py-3 px-4 font-semibold text-[#107c10]">
                  ₹{pricing.bwDoubleSided}.00 / sheet (Front & Back)
                </td>
                <td className="py-3 px-4 text-[#797775]">Assignments, notes, reports</td>
              </tr>
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Color Print</td>
                <td className="py-3 px-4 text-[#605e5c]">A4 Standard</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹{pricing.colorSingleSided}.00 / page</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹{pricing.colorDoubleSided}.00 / side</td>
                <td className="py-3 px-4 text-[#797775]">Diagrams, presentations, project cover</td>
              </tr>
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Large Sheet (B&W)</td>
                <td className="py-3 px-4 text-[#605e5c]">A3 Sheet</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">
                  ₹{(pricing.bwSingleSided * pricing.a3Multiplier).toFixed(2)} / page
                </td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">
                  ₹{(pricing.bwDoubleSided * pricing.a3Multiplier).toFixed(2)} / sheet
                </td>
                <td className="py-3 px-4 text-[#797775]">Drawings, circuit diagrams, charts</td>
              </tr>
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Large Sheet (Color)</td>
                <td className="py-3 px-4 text-[#605e5c]">A3 Sheet</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">
                  ₹{(pricing.colorSingleSided * pricing.a3Multiplier).toFixed(2)} / page
                </td>
                <td className="py-3 px-4 text-[#797775]">N/A</td>
                <td className="py-3 px-4 text-[#797775]">Posters and event banners</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Paper Types & Finishing */}
      <div className="bg-white border border-[#e1dfdd] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#f3f2f1] border-b border-[#e1dfdd]">
          <h2 className="text-sm font-semibold text-[#242424]">Paper Options & Finishing</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 border border-[#e1dfdd] rounded-lg bg-[#faf9f8]">
            <div className="font-semibold text-[#242424]">Plain Paper</div>
            <div className="text-[11px] text-[#605e5c] mt-0.5">Standard 75 GSM multipurpose</div>
            <div className="text-sm font-bold text-[#107c10] mt-2">Included</div>
          </div>
          <div className="p-3 border border-[#0067b8]/40 rounded-lg bg-[#eff6fc]/40">
            <div className="font-semibold text-[#0067b8]">Photo Paper</div>
            <div className="text-[11px] text-[#605e5c] mt-0.5">Glossy high-resolution finish</div>
            <div className="text-sm font-bold text-[#0067b8] mt-2">+₹{pricing.photoPaperFee}.00 / copy</div>
          </div>
          <div className="p-3 border border-[#e1dfdd] rounded-lg bg-[#faf9f8]">
            <div className="font-semibold text-[#242424]">Corner Staple</div>
            <div className="text-[11px] text-[#605e5c] mt-0.5">Top-left corner staple</div>
            <div className="text-sm font-bold text-[#107c10] mt-2">Free</div>
          </div>
        </div>
      </div>

      {/* Guidelines and Counter Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guidelines */}
        <div className="bg-white border border-[#e1dfdd] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[#242424]">
            <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
            <span>Helpful Guidelines for Students</span>
          </div>
          <ul className="text-xs text-[#605e5c] space-y-2 list-disc pl-4">
            <li>PDF files are recommended for accurate layout and exact page count.</li>
            <li>Double-sided printing helps save paper: 2 pages fit on 1 sheet for ₹{pricing.bwDoubleSided}.</li>
            <li>Show your <strong>Token ID</strong> at the counter to collect your prints without confusion.</li>
            <li>Payment can be made via Razorpay Online (Instant) or cash/UPI QR at the counter.</li>
          </ul>
        </div>

        {/* Counter Info */}
        <div className="bg-white border border-[#e1dfdd] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[#242424]">
            <MapPin className="w-4 h-4 text-[#0067b8]" />
            <span>Location & Timings</span>
          </div>
          <div className="text-xs text-[#605e5c] space-y-2">
            <div>
              <strong className="text-[#242424] block">Location:</strong>
              ait xerox shop (Library Ground Floor).
            </div>
            <div>
              <strong className="text-[#242424] block">Operating Hours:</strong>
              Monday to Saturday: 8:30 AM – 4:00 PM (Sunday closed).
            </div>
            <div className="p-2.5 bg-[#e6f2fb] text-[#0067b8] border border-[#cbe4f9] rounded-lg flex items-center space-x-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span><strong>Rush Hours:</strong> Lunch break (1:00 PM – 2:00 PM). Order online in advance to skip the counter queue!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
