import { Clock, MapPin, CheckCircle2 } from 'lucide-react';

export const RateCard: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#242424] tracking-tight">
          Xerox Rates & Details
        </h1>
        <p className="text-xs text-[#605e5c] mt-0.5">
          Current printing and photocopying charges at the college Xerox shop
        </p>
      </div>

      {/* Main Pricing Table */}
      <div className="bg-white border border-[#e1dfdd] rounded-[2px] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#f3f2f1] border-b border-[#e1dfdd]">
          <h2 className="text-sm font-semibold text-[#242424]">Document Printing Rates</h2>
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
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹2.00 / page</td>
                <td className="py-3 px-4 font-semibold text-[#107c10]">₹2.00 / sheet (Front & Back)</td>
                <td className="py-3 px-4 text-[#797775]">Assignments, notes, reports</td>
              </tr>
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Color Print</td>
                <td className="py-3 px-4 text-[#605e5c]">A4 Standard</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹10.00 / page</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹9.00 / side</td>
                <td className="py-3 px-4 text-[#797775]">Diagrams, presentations, project cover</td>
              </tr>
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Large Sheet (B&W)</td>
                <td className="py-3 px-4 text-[#605e5c]">A3 Sheet</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹4.00 / page</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹7.00 / side</td>
                <td className="py-3 px-4 text-[#797775]">Drawings, circuit diagrams, charts</td>
              </tr>
              <tr className="hover:bg-[#f3f2f1]/50">
                <td className="py-3 px-4 font-medium">Large Sheet (Color)</td>
                <td className="py-3 px-4 text-[#605e5c]">A3 Sheet</td>
                <td className="py-3 px-4 font-semibold text-[#0067b8]">₹20.00 / page</td>
                <td className="py-3 px-4 text-[#797775]">N/A</td>
                <td className="py-3 px-4 text-[#797775]">Posters and event banners</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Paper Types & Finishing */}
      <div className="bg-white border border-[#e1dfdd] rounded-[2px] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#f3f2f1] border-b border-[#e1dfdd]">
          <h2 className="text-sm font-semibold text-[#242424]">Paper Options & Finishing</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 border border-[#e1dfdd] rounded-[2px] bg-[#faf9f8]">
            <div className="font-semibold text-[#242424]">Plain Paper</div>
            <div className="text-[11px] text-[#605e5c] mt-0.5">Standard 75 GSM multipurpose</div>
            <div className="text-sm font-bold text-[#107c10] mt-2">Included</div>
          </div>
          <div className="p-3 border border-[#0067b8]/40 rounded-[2px] bg-[#eff6fc]/40">
            <div className="font-semibold text-[#0067b8]">Photo Paper</div>
            <div className="text-[11px] text-[#605e5c] mt-0.5">Glossy high-resolution finish</div>
            <div className="text-sm font-bold text-[#0067b8] mt-2">+₹15.00</div>
          </div>
          <div className="p-3 border border-[#e1dfdd] rounded-[2px] bg-[#faf9f8]">
            <div className="font-semibold text-[#242424]">Corner Staple</div>
            <div className="text-[11px] text-[#605e5c] mt-0.5">Top-left corner staple</div>
            <div className="text-sm font-bold text-[#107c10] mt-2">Free</div>
          </div>
        </div>
      </div>

      {/* Guidelines and Counter Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guidelines */}
        <div className="bg-white border border-[#e1dfdd] rounded-[2px] p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[#242424]">
            <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
            <span>Helpful Guidelines for Students</span>
          </div>
          <ul className="text-xs text-[#605e5c] space-y-2 list-disc pl-4">
            <li>PDF files are recommended for accurate layout and exact page count.</li>
            <li>Double-sided printing helps save paper and keeps your report compact.</li>
            <li>Show your <strong>Token ID</strong> at the counter to collect your prints without confusion.</li>
            <li>Payment can be made via UPI QR code or cash at the counter when picking up.</li>
          </ul>
        </div>

        {/* Counter Info */}
        <div className="bg-white border border-[#e1dfdd] rounded-[2px] p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[#242424]">
            <MapPin className="w-4 h-4 text-[#0067b8]" />
            <span>Location & Timings</span>
          </div>
          <div className="text-xs text-[#605e5c] space-y-2">
            <div>
              <strong className="text-[#242424] block">Location:</strong>
              ait xerox shop.
            </div>
            <div>
              <strong className="text-[#242424] block">Operating Hours:</strong>
              Monday to Saturday: 8:30 AM – 4:00 PM (Sunday closed).
            </div>
            <div className="p-2.5 bg-[#e6f2fb] text-[#0067b8] border border-[#cbe4f9] rounded-[2px] flex items-center space-x-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span><strong>Rush Hours:</strong> Lunch break (1:00 PM – 2:00 PM). Order online in advance to skip the queue!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
