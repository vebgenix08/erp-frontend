import {
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Globe,
  Edit3,
  Save,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Badge } from "../../../shared/ui/badge";

export interface StaffEmailInviteData {
  recipientName: string;
  recipientEmail: string;
  temporaryPassword?: string;
  positionRole: string;
  department: string;
  campusName: string;
  reportingTo: string;
  expiryDate: string;
  institutionName: string;
  tagline: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
  campusAddress: string;
  acceptInviteUrl?: string;
}

// Template tokens show layout without fabricating tenant, employee, or credential data.
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_STAFF_INVITE_DATA: StaffEmailInviteData = {
  recipientName: "{{recipient.name}}",
  recipientEmail: "{{recipient.email}}",
  temporaryPassword: "{{invite.temporaryPassword}}",
  positionRole: "{{employee.designation}}",
  department: "{{employee.department}}",
  campusName: "{{campus.name}}",
  reportingTo: "{{employee.reportingTo}}",
  expiryDate: "{{invite.expiresAt}}",
  institutionName: "{{institution.name}}",
  tagline: "{{institution.tagline}}",
  contactPhone: "{{institution.phone}}",
  contactEmail: "{{institution.email}}",
  contactWebsite: "{{institution.website}}",
  campusAddress: "{{campus.address}}",
  acceptInviteUrl: "{{invite.url}}",
};

export function StaffEmailInviteTemplate({
  data = DEFAULT_STAFF_INVITE_DATA,
  allowEditing = true,
}: {
  data?: StaffEmailInviteData;
  allowEditing?: boolean;
}) {
  const [formData, setFormData] = useState<StaffEmailInviteData>(data);
  const [isEditing, setIsEditing] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  const updateField = (field: keyof StaffEmailInviteData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(DEFAULT_STAFF_INVITE_DATA);
  };

  const handleSave = () => {
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 3000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Editor Controls Bar */}
      {allowEditing && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="brand" className="text-[10px] font-bold uppercase">
              TEMPLATE EDITOR
            </Badge>
            <span className="text-xs font-bold text-slate-800">
              Customize Staff Email Invite Template Content
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveNotice && (
              <Badge variant="success" className="font-bold text-xs">
                ✓ Template Saved Live!
              </Badge>
            )}
            <Button
              variant={isEditing ? "brand" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 text-xs font-bold"
            >
              <Edit3 size={14} /> {isEditing ? "Close Editor" : "Edit Template Fields"}
            </Button>

            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs font-bold text-slate-600"
                >
                  <RotateCcw size={13} /> Reset Defaults
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={handleSave}
                  className="h-8 text-xs font-bold shadow-xs"
                >
                  <Save size={14} /> Save Template Content
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Template Field Inputs Form (When Editing Mode is Active) */}
      {isEditing && (
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-2">
            ✏️ Edit Email Template Text & Credentials
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">School / Institution Name</label>
              <Input
                value={formData.institutionName}
                onChange={(e) => updateField("institutionName", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Tagline Subtitle</label>
              <Input
                value={formData.tagline}
                onChange={(e) => updateField("tagline", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Recipient Staff Name</label>
              <Input
                value={formData.recipientName}
                onChange={(e) => updateField("recipientName", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Recipient Email Address</label>
              <Input
                value={formData.recipientEmail}
                onChange={(e) => updateField("recipientEmail", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Position / Role</label>
              <Input
                value={formData.positionRole}
                onChange={(e) => updateField("positionRole", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Department</label>
              <Input
                value={formData.department}
                onChange={(e) => updateField("department", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Campus Name</label>
              <Input
                value={formData.campusName}
                onChange={(e) => updateField("campusName", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Reporting Manager</label>
              <Input
                value={formData.reportingTo}
                onChange={(e) => updateField("reportingTo", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Temporary Password</label>
              <Input
                value={formData.temporaryPassword}
                onChange={(e) => updateField("temporaryPassword", e.target.value)}
                className="h-8 text-xs font-bold text-brand-700"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Invite Expiry Notice</label>
              <Input
                value={formData.expiryDate}
                onChange={(e) => updateField("expiryDate", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Contact Phone</label>
              <Input
                value={formData.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Contact Email</label>
              <Input
                value={formData.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Contact Website</label>
              <Input
                value={formData.contactWebsite}
                onChange={(e) => updateField("contactWebsite", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700 block">Campus Address</label>
              <Input
                value={formData.campusAddress}
                onChange={(e) => updateField("campusAddress", e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Email Card Render */}
      <div className="w-full bg-slate-100 py-6 px-3 flex flex-col items-center justify-center font-sans text-slate-800 rounded-2xl">
        {/* Top Pre-header Link */}
        <div className="w-full max-w-xl flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1">
          <span>You are invited to join {formData.institutionName}.</span>
          <button type="button" className="text-brand-700 font-bold hover:underline cursor-pointer">
            View in browser
          </button>
        </div>

        {/* Main Email Container Card */}
        <article className="w-full max-w-xl bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden leading-tight text-xs space-y-6">
          {/* Header Block with Slanted Dark Navy Banner */}
          <header className="relative border-b-2 border-amber-500 bg-white">
            <div className="flex items-center justify-between p-5">
              {/* Left School Logo & Branding */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-amber-500 bg-slate-900 flex items-center justify-center text-amber-400 font-extrabold text-sm shadow-2xs shrink-0">
                  🎓
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    {formData.institutionName}
                  </h1>
                  <p className="text-[10.5px] font-semibold text-amber-800 italic mt-0.5">
                    {formData.tagline}
                  </p>
                </div>
              </div>

              {/* Right Dark Navy Banner "YOU'RE INVITED!" */}
              <div className="bg-slate-900 text-white px-5 py-2.5 rounded-l-2xl shadow-md text-right flex items-center gap-3 shrink-0">
                <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <span className="text-xs font-black tracking-wider block text-amber-400 uppercase">
                    YOU'RE INVITED!
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 block">Join Our Team</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content Body Section */}
          <div className="px-6 space-y-5">
            {/* Greeting */}
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900">
                Hello {formData.recipientName},
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                You have been invited to join{" "}
                <strong className="text-slate-900 font-bold">{formData.institutionName}</strong> as
                a staff member. We are excited to welcome you to our team!
              </p>
            </div>

            {/* Position & Role Summary Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div className="space-y-1.5 flex-1 font-medium text-slate-800 text-xs">
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-slate-500 font-bold">Position / Role</span>
                  <span className="font-extrabold text-slate-900">: {formData.positionRole}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-slate-500 font-bold">Department</span>
                  <span className="font-bold">: {formData.department}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-slate-500 font-bold">Campus</span>
                  <span className="font-bold">: {formData.campusName}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr]">
                  <span className="text-slate-500 font-bold">Reporting To</span>
                  <span className="font-bold text-slate-900">: {formData.reportingTo}</span>
                </div>
              </div>
            </div>

            {/* Call to Action Button */}
            <div className="text-center space-y-2.5 pt-1">
              <p className="text-xs text-slate-600 font-semibold">
                Please accept this invitation and complete your account setup to get started.
              </p>
              <a
                href={formData.acceptInviteUrl || "#"}
                className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-8 py-3 rounded-xl shadow-md transition-all uppercase tracking-wide cursor-pointer"
              >
                Accept Invitation & Set Up Account
              </a>
              <p className="text-[10px] text-slate-400 font-semibold">
                This invite link will expire on{" "}
                <span className="text-slate-700 font-bold">{formData.expiryDate}</span>.
              </p>
            </div>

            <hr className="border-slate-200" />

            {/* Temporary Login Credentials Box */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong className="text-xs font-extrabold text-slate-900 block">
                    Your Temporary Login Credentials
                  </strong>
                  <span className="text-[10.5px] text-slate-500 block">
                    Use the credentials below to set up your account. You will be prompted to create
                    a new password.
                  </span>
                </div>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-3.5 space-y-1.5 font-medium text-xs">
                <div className="grid grid-cols-[130px_1fr]">
                  <span className="text-slate-500 font-bold">Email Address</span>
                  <span className="font-bold text-slate-900">: {formData.recipientEmail}</span>
                </div>
                <div className="grid grid-cols-[130px_1fr]">
                  <span className="text-slate-500 font-bold">Temporary Password</span>
                  <span className="font-black text-brand-700 tracking-wider">
                    : {formData.temporaryPassword || "WEP$2026@Priya"}
                  </span>
                </div>
              </div>
            </div>

            {/* Important Notes Amber Box */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 flex items-start gap-3 text-amber-900 text-xs">
              <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Info size={14} />
              </div>
              <div className="space-y-1">
                <strong className="block font-extrabold text-amber-950">Important Notes:</strong>
                <ul className="space-y-0.5 text-[11px] font-medium text-amber-900 leading-tight">
                  <li>• Please do not share your temporary password with anyone.</li>
                  <li>
                    • For security reasons, you will be required to change your password on first
                    login.
                  </li>
                  <li>• If you did not expect this invitation, please ignore this email.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer Contact Details Row */}
          <div className="border-t border-slate-200 px-6 py-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10.5px] text-slate-600 font-semibold bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="text-brand-600 shrink-0" />
              <span className="truncate">{formData.contactPhone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail size={13} className="text-brand-600 shrink-0" />
              <span className="truncate">{formData.contactEmail}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-brand-600 shrink-0" />
              <span className="truncate">{formData.contactWebsite}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-brand-600 shrink-0" />
              <span className="truncate">{formData.campusAddress}</span>
            </div>
          </div>

          {/* Dark Navy Bottom Footer Bar */}
          <footer className="bg-slate-900 text-white text-center py-3 px-4 text-[10px] space-y-0.5">
            <p className="font-semibold text-slate-300">
              © 2026 {formData.institutionName}. All rights reserved.
            </p>
            <p className="text-slate-400 font-medium">
              This is an automated email. Please do not reply to this email.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
