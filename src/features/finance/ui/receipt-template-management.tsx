import { Eye, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getFinanceReceiptTemplate,
  saveFinanceReceiptTemplate,
} from "../api/finance-operations.api";
import type { FinanceReceiptTemplate } from "../model/finance-operations.types";
import { getInstitutionProfile } from "../../tenant-settings/api/settings.api";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { DualFeeReceiptView, type FeeReceiptData } from "./fee-receipt-document";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";

export interface ExtendedReceiptContent {
  title: string;
  institutionName: string;
  campusName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  affiliation: string;
  footerText: string;
  signatureLabel: string;
  accentColor: string;
}

export function ReceiptTemplateManagement() {
  const { selectedCampus } = useSelectedCampus();
  const [content, setContent] = useState<ExtendedReceiptContent>({
    title: "RECEIPT",
    institutionName: "",
    campusName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    affiliation: "",
    footerText: "Note: This is a computer generated receipt and does not require any signature.",
    signatureLabel: "Authorized Signatory",
    accentColor: "#2563eb",
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([getFinanceReceiptTemplate(), getInstitutionProfile()])
      .then(([template, institution]) => {
        if (!active) return;
        setContent({
          title: template.title,
          institutionName: institution?.name ?? "Institution",
          campusName: selectedCampus?.name ?? "Campus",
          address: institution?.address ?? "",
          phone: institution?.contactPhone ?? "",
          email: institution?.contactEmail ?? "",
          website: "",
          affiliation: template.headerText ?? "",
          footerText: template.footerText ?? "",
          signatureLabel: template.signatureLabel,
          accentColor: template.accentColor,
        });
      })
      .catch((value) => {
        if (active) {
          setError(value instanceof Error ? value.message : "Unable to load the receipt template");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCampus?.id, selectedCampus?.name]);

  // Sync with live receipt data preview
  const liveReceiptData: FeeReceiptData = useMemo(
    () => ({
      institution: {
        name: content.institutionName || "{{institution.name}}",
        campusName: content.campusName || "{{campus.name}}",
        address: content.address,
        phone: content.phone,
        email: content.email,
        website: content.website,
        affiliation: content.affiliation,
      },
      receipt: {
        titleBanner: content.title || "RECEIPT",
        number: "{{receipt.number}}",
        date: "{{receipt.date}}",
        mode: "{{payment.method}}",
        reference: "{{payment.reference}}",
        collectedBy: "{{payment.collectedBy}}",
      },
      student: {
        name: "{{student.name}}",
        admissionNumber: "{{student.admissionNumber}}",
        registrationNumber: "{{student.registrationNumber}}",
        className: "{{student.className}}",
        sectionName: "{{student.sectionName}}",
        academicYear: "{{academicYear.name}}",
        campusName: content.campusName || "{{campus.name}}",
      },
      feeItems: [
        {
          slNo: 1,
          feeHead: "{{feeItem.name}}",
          feeOrderNo: "{{feeOrder.number}}",
          totalAmount: 0,
          previousPaid: 0,
          paidNow: 0,
          balance: 0,
        },
      ],
      summary: {
        totalOrderAmount: 0,
        totalPaidBefore: 0,
        paidNow: 0,
        balanceAmount: 0,
        amountInWords: "{{payment.amountInWords}}",
      },
      footerNote: content.footerText,
      signatureLabel: content.signatureLabel,
    }),
    [content],
  );

  const patch = (key: keyof ExtendedReceiptContent, val: string) => {
    setContent((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const saved: FinanceReceiptTemplate = await saveFinanceReceiptTemplate({
        title: content.title,
        headerText: content.affiliation,
        footerText: content.footerText,
        signatureLabel: content.signatureLabel,
        paperSize: "A4",
        accentColor: content.accentColor,
        showInstitutionLogo: true,
        showInstitutionAddress: true,
        showPaymentMethod: true,
        showPaymentReference: true,
      });
      setContent((current) => ({
        ...current,
        title: saved.title,
        affiliation: saved.headerText ?? "",
        footerText: saved.footerText ?? "",
        signatureLabel: saved.signatureLabel,
        accentColor: saved.accentColor,
      }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save receipt template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading receipt template" />;
  if (error && !content.institutionName) {
    return <ErrorState message={error} />;
  }

  return (
    <section className="space-y-5 pb-8">
      {error ? <ErrorState message={error} /> : null}
      {/* Header & Save Action */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Fee Receipt Content & Template Setup
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Customize header branding, affiliation line, footer terms, and signature label for
            printable receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <Badge variant="success" className="font-bold">
              ✓ Receipt Template Saved!
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            variant="brand"
            className="h-8 text-xs font-bold shadow-xs"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Receipt Template"}
          </Button>
        </div>
      </header>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Input Form Panel (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-0 overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={15} className="text-brand-600" /> Institution Header & Branding
                </CardTitle>
                <p className="mt-1 text-[11px] text-slate-500">
                  Institution and campus details come from Organisation Profile and the active
                  campus.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="inst-name" className="text-xs font-bold text-slate-700">
                  Institution Name
                </Label>
                <Input
                  id="inst-name"
                  value={content.institutionName}
                  readOnly
                  className="h-8 bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="campus-name" className="text-xs font-bold text-slate-700">
                  Campus Name
                </Label>
                <Input
                  id="campus-name"
                  value={content.campusName}
                  readOnly
                  className="h-8 bg-slate-50 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs font-bold text-slate-700">
                  Address Line
                </Label>
                <Input
                  id="address"
                  value={content.address}
                  readOnly
                  className="h-8 bg-slate-50 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                    Contact Phone
                  </Label>
                  <Input
                    id="phone"
                    value={content.phone}
                    readOnly
                    className="h-8 bg-slate-50 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={content.email}
                    readOnly
                    className="h-8 bg-slate-50 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="website" className="text-xs font-bold text-slate-700">
                  Website URL
                </Label>
                <Input
                  id="website"
                  value={content.website}
                  readOnly
                  placeholder="Not configured"
                  className="h-8 bg-slate-50 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="affiliation" className="text-xs font-bold text-slate-700">
                  Affiliation & Code Line
                </Label>
                <Input
                  id="affiliation"
                  value={content.affiliation}
                  onChange={(e) => patch("affiliation", e.target.value)}
                  placeholder="e.g. Affiliated to CBSE | Affiliation No: 830123 | School Code: 45678"
                  className="h-8 text-xs font-medium"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="p-0 overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-900">
                Receipt Header & Footer Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="receipt-title" className="text-xs font-bold text-slate-700">
                  Receipt Banner Title
                </Label>
                <Input
                  id="receipt-title"
                  value={content.title}
                  onChange={(e) => patch("title", e.target.value)}
                  placeholder="RECEIPT"
                  className="h-8 text-xs font-bold uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="footer-note" className="text-xs font-bold text-slate-700">
                  Footer Terms / Notice
                </Label>
                <textarea
                  id="footer-note"
                  rows={2}
                  value={content.footerText}
                  onChange={(e) => patch("footerText", e.target.value)}
                  placeholder="Note: Computer generated receipt..."
                  className="flex w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sig-label" className="text-xs font-bold text-slate-700">
                  Signature Label
                </Label>
                <Input
                  id="sig-label"
                  value={content.signatureLabel}
                  onChange={(e) => patch("signatureLabel", e.target.value)}
                  placeholder="Authorized Signatory"
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Printable Receipt Live Preview (7 Columns) */}
        <div className="lg:col-span-7">
          <Card className="p-0 overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-900">
                <Eye size={15} className="text-brand-600" /> Printable Receipt Live Preview
              </CardTitle>
              <Badge variant="brand" className="text-[10px] font-bold">
                Student Copy + Office Copy Dual Format
              </Badge>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto bg-slate-100/70">
              <DualFeeReceiptView data={liveReceiptData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
