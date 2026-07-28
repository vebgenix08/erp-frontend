import { useState } from "react";
import { Scissors } from "lucide-react";

export interface FeeReceiptData {
  institution: {
    name: string;
    campusName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    affiliation: string;
    logoUrl?: string;
  };
  receipt: {
    titleBanner?: string;
    number: string;
    date: string;
    mode: string;
    reference: string;
    collectedBy: string;
  };
  student: {
    name: string;
    admissionNumber: string;
    registrationNumber: string;
    className: string;
    sectionName: string;
    academicYear: string;
    campusName: string;
  };
  feeItems: Array<{
    slNo: number;
    feeHead: string;
    feeOrderNo: string;
    totalAmount: number;
    previousPaid: number;
    paidNow: number;
    balance: number;
  }>;
  summary: {
    totalOrderAmount: number;
    totalPaidBefore: number;
    paidNow: number;
    balanceAmount: number;
    amountInWords: string;
  };
  footerNote?: string;
  signatureLabel?: string;
}

const fmt = (num: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

// Receipt preview data is exported for the template editor.
// eslint-disable-next-line react-refresh/only-export-components
export const SAMPLE_RECEIPT_DATA: FeeReceiptData = {
  institution: {
    name: "WISDOM ERA PUBLIC SCHOOL",
    campusName: "Talabalalu Main Campus",
    address: "Talabalalu, Ramanagara - 571 511, Karnataka, India",
    phone: "080-12345678",
    email: "info@wisdomera.edu.in",
    website: "www.wisdomera.edu.in",
    affiliation: "Affiliated to CBSE, New Delhi | Affiliation No: 830123 | School Code: 45678",
  },
  receipt: {
    titleBanner: "RECEIPT",
    number: "RCP/26-27/000123",
    date: "16 May 2026",
    mode: "UPI",
    reference: "UPI/412512345678",
    collectedBy: "Ramesh Kumar (Cashier)",
  },
  student: {
    name: "Aarav Sharma",
    admissionNumber: "ADM/26-27/000089",
    registrationNumber: "REG/66/26-27/000045",
    className: "Grade 6",
    sectionName: "A",
    academicYear: "2026 - 2027",
    campusName: "Talabalalu Main Campus",
  },
  feeItems: [
    { slNo: 1, feeHead: "Tuition Fee (Annual)", feeOrderNo: "FO/26-27/000567", totalAmount: 20000, previousPaid: 10000, paidNow: 10000, balance: 0 },
    { slNo: 2, feeHead: "Development Fee", feeOrderNo: "FO/26-27/000567", totalAmount: 3000, previousPaid: 1500, paidNow: 1500, balance: 0 },
    { slNo: 3, feeHead: "Activity Fee", feeOrderNo: "FO/26-27/000567", totalAmount: 2000, previousPaid: 0, paidNow: 2000, balance: 0 },
  ],
  summary: {
    totalOrderAmount: 25000,
    totalPaidBefore: 11500,
    paidNow: 13500,
    balanceAmount: 0,
    amountInWords: "Rupees Twenty Five Thousand Only",
  },
  footerNote: "Note: This is a computer generated receipt and does not require any signature.",
  signatureLabel: "Authorized Signatory",
};

export function SingleReceiptCopy({
  data,
  copyType,
}: {
  data: FeeReceiptData;
  copyType: "STUDENT COPY" | "OFFICE COPY";
}) {
  const isOffice = copyType === "OFFICE COPY";
  const headerBg = isOffice ? "bg-emerald-900" : "bg-slate-900";
  const badgeBg = isOffice ? "bg-emerald-800" : "bg-brand-900";

  return (
    <div className="relative rounded-xl border border-slate-300 bg-white p-4 shadow-2xs text-[10.5px] leading-tight space-y-3 font-sans w-full max-w-lg mx-auto">
      {/* Top Floating Copy Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className={`px-3 py-0.5 rounded-full text-[9.5px] font-extrabold tracking-wider text-white shadow-2xs ${badgeBg}`}>
          {copyType}
        </span>
      </div>

      {/* Institution Brand Header */}
      <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 border-b border-slate-200 pb-2.5 pt-1 text-center">
        {/* Crest Logo */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="h-11 w-11 rounded-full border-2 border-amber-500 bg-slate-900 flex items-center justify-center text-amber-400 font-extrabold text-xs shadow-2xs">
            🎓
          </div>
          <span className="text-[7.5px] font-extrabold text-slate-500 mt-0.5 uppercase tracking-tighter">ESTD. 2020</span>
        </div>

        {/* Institution Info */}
        <div className="flex-1 space-y-0.5">
          <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">
            {data.institution.name}
          </h1>
          <p className="text-[11px] font-bold text-slate-800">{data.institution.campusName}</p>
          <p className="text-[9.5px] text-slate-500 font-medium">{data.institution.address}</p>
          <p className="text-[9px] text-slate-600 font-medium">
            📞 {data.institution.phone} &nbsp; ✉ {data.institution.email} &nbsp; 🌐 {data.institution.website}
          </p>
          <p className="text-[8.5px] font-bold text-slate-700 pt-0.5">{data.institution.affiliation}</p>
        </div>
        <div aria-hidden="true" className="h-11 w-11" />
      </header>

      {/* RECEIPT Banner */}
      <div className="text-center">
        <span className={`inline-block px-8 py-0.5 text-[11px] font-black tracking-widest text-white rounded-md uppercase ${headerBg}`}>
          {data.receipt.titleBanner || "RECEIPT"}
        </span>
      </div>

      {/* Metadata & Amount in Words Grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 items-stretch text-[10px]">
        <div className="sm:col-span-7 space-y-0.5 font-medium text-slate-800">
          <div className="grid grid-cols-[90px_1fr]">
            <span className="text-slate-500 font-semibold">Receipt No.</span>
            <span className="font-extrabold text-rose-700">: {data.receipt.number}</span>
          </div>
          <div className="grid grid-cols-[90px_1fr]">
            <span className="text-slate-500 font-semibold">Payment Date</span>
            <span className="font-bold">: {data.receipt.date}</span>
          </div>
          <div className="grid grid-cols-[90px_1fr]">
            <span className="text-slate-500 font-semibold">Payment Mode</span>
            <span className="font-bold">: {data.receipt.mode}</span>
          </div>
          <div className="grid grid-cols-[90px_1fr]">
            <span className="text-slate-500 font-semibold">Reference / UTR</span>
            <span className="font-bold truncate">: {data.receipt.reference}</span>
          </div>
          <div className="grid grid-cols-[90px_1fr]">
            <span className="text-slate-500 font-semibold">Collected By</span>
            <span className="font-bold truncate">: {data.receipt.collectedBy}</span>
          </div>
        </div>

        {/* Amount in Words Box */}
        <div className="sm:col-span-5 relative rounded-lg border border-slate-200 bg-slate-50/70 p-2 flex flex-col justify-center overflow-hidden">
          <span className="absolute right-1 bottom-0 text-4xl font-black text-slate-200/50 select-none">₹</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Amount in Words</span>
          <p className="mt-0.5 text-[10.5px] font-bold italic text-brand-900 leading-snug">
            {data.summary.amountInWords}
          </p>
        </div>
      </div>

      {/* STUDENT INFORMATION Bar & Grid */}
      <div className="space-y-1">
        <div className={`px-2.5 py-0.5 rounded text-white font-extrabold text-[9px] uppercase tracking-wider ${headerBg}`}>
          STUDENT INFORMATION
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2 py-1 font-medium text-slate-800 border border-slate-100 rounded-md bg-slate-50/40 text-[10px]">
          <div className="grid grid-cols-[85px_1fr]">
            <span className="text-slate-500 font-semibold">Student Name</span>
            <span className="font-bold text-slate-900 truncate">: {data.student.name}</span>
          </div>
          <div className="grid grid-cols-[85px_1fr]">
            <span className="text-slate-500 font-semibold">Class & Section</span>
            <span className="font-bold text-slate-900 truncate">: {data.student.className} - {data.student.sectionName}</span>
          </div>
          <div className="grid grid-cols-[85px_1fr]">
            <span className="text-slate-500 font-semibold">Admission No.</span>
            <span className="font-bold truncate">: {data.student.admissionNumber}</span>
          </div>
          <div className="grid grid-cols-[85px_1fr]">
            <span className="text-slate-500 font-semibold">Registration No.</span>
            <span className="font-bold truncate">: {data.student.registrationNumber}</span>
          </div>
          <div className="grid grid-cols-[85px_1fr]">
            <span className="text-slate-500 font-semibold">Academic Year</span>
            <span className="font-bold truncate">: {data.student.academicYear}</span>
          </div>
        </div>
      </div>

      {/* FEE DETAILS Table */}
      <div className="space-y-1">
        <div className={`px-2.5 py-0.5 rounded text-white font-extrabold text-[9px] uppercase tracking-wider ${headerBg}`}>
          FEE DETAILS
        </div>
        <table className="w-full border-collapse border border-slate-200 text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[8.5px]">
              <th className="border-r border-slate-200 py-1 px-1 text-center w-7">Sl.No.</th>
              <th className="border-r border-slate-200 py-1 px-1.5 text-left">Fee Head</th>
              <th className="border-r border-slate-200 py-1 px-1.5 text-center">Fee Order No.</th>
              <th className="border-r border-slate-200 py-1 px-1.5 text-right">Total Amount (₹)</th>
              <th className="border-r border-slate-200 py-1 px-1.5 text-right">Previous Paid (₹)</th>
              <th className="border-r border-slate-200 py-1 px-1.5 text-right">Paid Now (₹)</th>
              <th className="py-1 px-1.5 text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {data.feeItems.map((item) => (
              <tr key={item.slNo} className="hover:bg-slate-50">
                <td className="border-r border-slate-200 py-1 px-1 text-center font-bold">{item.slNo}</td>
                <td className="border-r border-slate-200 py-1 px-1.5 font-bold">{item.feeHead}</td>
                <td className="border-r border-slate-200 py-1 px-1.5 text-center text-slate-600 font-medium">{item.feeOrderNo}</td>
                <td className="border-r border-slate-200 py-1 px-1.5 text-right font-medium">{fmt(item.totalAmount)}</td>
                <td className="border-r border-slate-200 py-1 px-1.5 text-right font-medium">{fmt(item.previousPaid)}</td>
                <td className="border-r border-slate-200 py-1 px-1.5 text-right font-extrabold text-slate-900">{fmt(item.paidNow)}</td>
                <td className="py-1 px-1.5 text-right font-bold text-slate-700">{fmt(item.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Summary & Total Paid Now Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 items-stretch pt-0.5 text-[10px]">
        {/* Payment Summary Box */}
        <div className="sm:col-span-7 rounded-lg border border-slate-200 bg-white p-2 space-y-1">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-700 block">Payment Summary</span>
          <div className="space-y-0.5 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Order Amount</span>
              <span className="font-bold text-slate-900">: ₹ {fmt(data.summary.totalOrderAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Paid (Before)</span>
              <span className="font-bold text-slate-900">: ₹ {fmt(data.summary.totalPaidBefore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid Now</span>
              <span className="font-extrabold text-emerald-700">: ₹ {fmt(data.summary.paidNow)}</span>
            </div>
          </div>

          <div className={`mt-1 flex justify-between px-2.5 py-1 rounded-md text-white font-extrabold ${headerBg}`}>
            <span>Balance Amount</span>
            <span>: ₹ {fmt(data.summary.balanceAmount)}</span>
          </div>
        </div>

        {/* TOTAL PAID NOW Card */}
        <div className="sm:col-span-5 rounded-lg border border-slate-300 bg-slate-50/80 p-2 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">TOTAL PAID NOW</span>
          <p className={`mt-0.5 text-xl font-black ${isOffice ? "text-emerald-800" : "text-brand-900"}`}>
            ₹ {fmt(data.summary.paidNow)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-2 flex items-end justify-between border-t border-slate-200 text-[8.5px] text-slate-500">
        <p className="font-semibold text-slate-600 max-w-[240px] leading-tight">
          {data.footerNote || "Note: This is a computer generated receipt and does not require any signature."}
        </p>
        <div className="text-center font-bold text-slate-800 border-t border-slate-400 pt-0.5 w-28">
          {data.signatureLabel || "Authorized Signatory"}
        </div>
      </footer>
    </div>
  );
}

export function DualFeeReceiptView({ data = SAMPLE_RECEIPT_DATA }: { data?: FeeReceiptData }) {
  const [activeTab, setActiveTab] = useState<"STUDENT" | "OFFICE" | "DUAL">("STUDENT");

  return (
    <div className="space-y-4">
      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-3">
        <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("STUDENT")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "STUDENT" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Student Copy (Blue)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("OFFICE")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "OFFICE" ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Office Copy (Green)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DUAL")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "DUAL" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Dual Side-by-Side View
          </button>
        </div>
      </div>

      {/* Rendered Views */}
      {activeTab === "STUDENT" && <SingleReceiptCopy data={data} copyType="STUDENT COPY" />}
      {activeTab === "OFFICE" && <SingleReceiptCopy data={data} copyType="OFFICE COPY" />}
      {activeTab === "DUAL" && (
        <div className="w-full space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 relative">
          <SingleReceiptCopy data={data} copyType="STUDENT COPY" />
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center justify-between pointer-events-none py-4">
            <div className="w-px h-full border-r-2 border-dashed border-slate-300" />
            <div className="my-2 p-1 rounded-full bg-slate-100 border border-slate-300 text-slate-600">
              <Scissors size={14} />
            </div>
            <div className="w-px h-full border-r-2 border-dashed border-slate-300" />
          </div>
          <SingleReceiptCopy data={data} copyType="OFFICE COPY" />
        </div>
      )}
    </div>
  );
}
