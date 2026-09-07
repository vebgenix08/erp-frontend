import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Eye,
  LockKeyhole,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Badge } from "../../../shared/ui/badge";
import { cn } from "../../../shared/ui/utils";
import {
  createTenantTemplate,
  listTenantTemplates,
  publishTenantTemplate,
  updateTenantTemplate,
} from "../api/settings.api";
import type {
  TenantTemplate,
  TenantTemplateField,
  TenantTemplateFieldType,
} from "../model/settings.types";

export type TemplateType = "ENQUIRY" | "APPLICATION" | "STAFF_ONBOARDING";
export type TabMode = "SECTIONS" | "LIBRARY" | "SETTINGS";

export interface FormFieldItem {
  id: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  order: number;
  system?: boolean;
  options?: string[];
  defaultValue?: string;
}

export interface FormSectionItem {
  id: string;
  title: string;
  open: boolean;
  fields: FormFieldItem[];
}

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const NATIONALITY_OPTIONS = ["Indian", "NRI", "Foreign National"];
const CLASS_OPTIONS = [
  "Nursery",
  "LKG",
  "UKG",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11 (Science)",
  "Grade 11 (Commerce)",
  "Grade 11 (Arts)",
  "Grade 12 (Science)",
  "Grade 12 (Commerce)",
  "Grade 12 (Arts)",
];
const MEDIUM_OPTIONS = ["English", "Kannada", "Hindi"];
const ACADEMIC_YEAR_OPTIONS = ["2026 - 2027", "2027 - 2028"];
const LANGUAGE_OPTIONS = ["Kannada", "Hindi", "Sanskrit", "French"];
const YES_NO_OPTIONS = ["Yes", "No"];
const SOURCE_OPTIONS = [
  "Walk-in",
  "Newspaper Ad",
  "Social Media",
  "Friend / Relative",
  "Google Search",
  "School Banner",
];
const MARITAL_OPTIONS = ["Single", "Married"];
const STAFF_CATEGORY_OPTIONS = [
  "Teaching Staff",
  "Non-Teaching Staff",
  "Administrative",
  "Support Staff",
];
const EMPLOYMENT_TYPE_OPTIONS = ["Full time", "Part time", "Contract", "Visiting"];
const TEACHING_PROFILE_OPTIONS = [
  "Principal",
  "Vice Principal",
  "Dean",
  "Head of Department",
  "Academic Coordinator",
  "Teacher",
  "Lecturer",
  "Lab Faculty",
  "Administrative Staff",
  "Support Staff",
  "Other",
];
const DESIGNATION_OPTIONS = [
  "Principal",
  "Vice Principal",
  "Dean",
  "Senior Teacher",
  "Assistant Teacher",
  "PRT Teacher",
  "Lecturer",
  "Professor",
  "Head of Department",
  "Academic Coordinator",
  "Exam Coordinator",
  "Accountant",
  "Administrator",
  "Librarian",
  "Lab Faculty",
  "Lab Assistant",
];
const DEPARTMENT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "Social Studies",
  "Computer Science",
  "Physical Education",
  "Administration",
  "Finance & Accounts",
  "Human Resources",
];
const SYSTEM_ROLE_OPTIONS = [
  "Campus Admin",
  "Teacher",
  "Accountant",
  "Librarian",
  "Front Desk / Admissions Officer",
];

const INITIAL_ENQUIRY_SECTIONS: FormSectionItem[] = [
  {
    id: "sec_student",
    title: "Student Details Section",
    open: true,
    fields: [
      {
        id: "f1",
        label: "Full Name of Student",
        type: "Text",
        required: true,
        visible: true,
        order: 1,
        system: true,
      },
      { id: "f2", label: "Date of Birth", type: "Date", required: true, visible: true, order: 2 },
      {
        id: "f3",
        label: "Gender",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 3,
        options: GENDER_OPTIONS,
      },
      {
        id: "f4",
        label: "Nationality",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 4,
        options: NATIONALITY_OPTIONS,
        defaultValue: "Indian",
      },
      {
        id: "f5",
        label: "Aadhar Number (Optional)",
        type: "Text",
        required: false,
        visible: true,
        order: 5,
      },
      {
        id: "f6",
        label: "Current Class / Grade",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 6,
        options: CLASS_OPTIONS,
      },
      {
        id: "f7",
        label: "Medium",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 7,
        options: MEDIUM_OPTIONS,
      },
      {
        id: "f8",
        label: "School Currently Studying",
        type: "Text",
        required: false,
        visible: true,
        order: 8,
      },
    ],
  },
  {
    id: "sec_parent",
    title: "Parent / Guardian Details Section",
    open: false,
    fields: [
      {
        id: "f9",
        label: "Father / Guardian Name",
        type: "Text",
        required: true,
        visible: true,
        order: 1,
      },
      { id: "f10", label: "Mother Name", type: "Text", required: false, visible: true, order: 2 },
      {
        id: "f11",
        label: "Primary Phone Number",
        type: "Text",
        required: true,
        visible: true,
        order: 3,
        system: true,
      },
      {
        id: "f12",
        label: "Email Address",
        type: "Email",
        required: false,
        visible: true,
        order: 4,
      },
    ],
  },
  {
    id: "sec_academic",
    title: "Academic Interest Section",
    open: false,
    fields: [
      {
        id: "f13",
        label: "Target Class / Grade",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 1,
        options: CLASS_OPTIONS,
      },
      {
        id: "f14",
        label: "Second Language Option",
        type: "Dropdown",
        required: false,
        visible: true,
        order: 2,
        options: LANGUAGE_OPTIONS,
      },
      {
        id: "f15",
        label: "Transport Required",
        type: "Dropdown",
        required: false,
        visible: true,
        order: 3,
        options: YES_NO_OPTIONS,
      },
    ],
  },
  {
    id: "sec_additional",
    title: "Additional Info Section",
    open: false,
    fields: [
      {
        id: "f16",
        label: "How did you hear about us?",
        type: "Dropdown",
        required: false,
        visible: true,
        order: 1,
        options: SOURCE_OPTIONS,
      },
      {
        id: "f17",
        label: "Remarks / Questions",
        type: "Textarea",
        required: false,
        visible: true,
        order: 2,
      },
    ],
  },
  {
    id: "sec_review",
    title: "Review & Submit Section",
    open: false,
    fields: [
      {
        id: "f18",
        label: "Declaration Acceptance",
        type: "Checkbox",
        required: true,
        visible: true,
        order: 1,
        system: true,
      },
    ],
  },
];

const INITIAL_APPLICATION_SECTIONS: FormSectionItem[] = [
  {
    id: "sec_app_student",
    title: "Student Information Section",
    open: true,
    fields: [
      {
        id: "af1",
        label: "Full Name of Student",
        type: "Text",
        required: true,
        visible: true,
        order: 1,
        system: true,
      },
      { id: "af2", label: "Date of Birth", type: "Date", required: true, visible: true, order: 2 },
      {
        id: "af3",
        label: "Gender",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 3,
        options: GENDER_OPTIONS,
      },
      {
        id: "af4",
        label: "Nationality",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 4,
        options: NATIONALITY_OPTIONS,
        defaultValue: "Indian",
      },
      {
        id: "af7",
        label: "Aadhar Number (Optional)",
        type: "Text",
        required: false,
        visible: true,
        order: 5,
      },
      {
        id: "af8",
        label: "Student Photo",
        type: "File Upload",
        required: true,
        visible: true,
        order: 6,
      },
      {
        id: "af9_cls",
        label: "Applying For Class / Grade",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 7,
        options: CLASS_OPTIONS,
      },
      {
        id: "af10_ay",
        label: "Academic Year",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 8,
        options: ACADEMIC_YEAR_OPTIONS,
      },
    ],
  },
  {
    id: "sec_app_parent",
    title: "Parent / Guardian Section",
    open: false,
    fields: [
      { id: "af9", label: "Father Name", type: "Text", required: true, visible: true, order: 1 },
      {
        id: "af10",
        label: "Father Occupation",
        type: "Text",
        required: false,
        visible: true,
        order: 2,
      },
      { id: "af11", label: "Mother Name", type: "Text", required: true, visible: true, order: 3 },
      {
        id: "af12",
        label: "Primary Contact Number",
        type: "Text",
        required: true,
        visible: true,
        order: 4,
        system: true,
      },
    ],
  },
  {
    id: "sec_app_school",
    title: "Previous School Details Section",
    open: false,
    fields: [
      {
        id: "af13",
        label: "Previous School Name",
        type: "Text",
        required: false,
        visible: true,
        order: 1,
      },
      {
        id: "af14",
        label: "Last Grade Attended",
        type: "Dropdown",
        required: false,
        visible: true,
        order: 2,
        options: CLASS_OPTIONS,
      },
      { id: "af15", label: "TC Number", type: "Text", required: false, visible: true, order: 3 },
    ],
  },
  {
    id: "sec_app_address",
    title: "Address & Documents Section",
    open: false,
    fields: [
      {
        id: "af16",
        label: "Residential Address",
        type: "Textarea",
        required: true,
        visible: true,
        order: 1,
      },
      {
        id: "af17",
        label: "Birth Certificate Copy",
        type: "File Upload",
        required: true,
        visible: true,
        order: 2,
      },
      {
        id: "af18",
        label: "Transfer Certificate (TC)",
        type: "File Upload",
        required: false,
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: "sec_app_review",
    title: "Review & Submit Section",
    open: false,
    fields: [
      {
        id: "af19",
        label: "Terms Agreement",
        type: "Checkbox",
        required: true,
        visible: true,
        order: 1,
        system: true,
      },
    ],
  },
];

const INITIAL_STAFF_SECTIONS: FormSectionItem[] = [
  {
    id: "sec_stf_personal",
    title: "Personal Information Section",
    open: true,
    fields: [
      {
        id: "sf1",
        label: "Full Name",
        type: "Text",
        required: true,
        visible: true,
        order: 1,
        system: true,
      },
      {
        id: "sf2",
        label: "Email Address",
        type: "Email",
        required: true,
        visible: true,
        order: 2,
        system: true,
      },
      {
        id: "sf3",
        label: "Mobile Number",
        type: "Text",
        required: true,
        visible: true,
        order: 3,
        system: true,
      },
      { id: "sf4", label: "Date of Birth", type: "Date", required: true, visible: true, order: 4 },
      {
        id: "sf5",
        label: "Gender",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 5,
        options: GENDER_OPTIONS,
      },
      {
        id: "sf5_nat",
        label: "Nationality",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 6,
        options: NATIONALITY_OPTIONS,
        defaultValue: "Indian",
      },
      {
        id: "sf6",
        label: "Marital Status",
        type: "Dropdown",
        required: false,
        visible: true,
        order: 7,
        options: MARITAL_OPTIONS,
      },
      {
        id: "sf7",
        label: "Profile Photo",
        type: "File Upload",
        required: false,
        visible: true,
        order: 8,
      },
      {
        id: "sf8",
        label: "Father / Husband Name",
        type: "Text",
        required: true,
        visible: true,
        order: 9,
      },
      {
        id: "sf9",
        label: "Emergency Contact No.",
        type: "Text",
        required: true,
        visible: true,
        order: 10,
      },
    ],
  },
  {
    id: "sec_stf_employment",
    title: "Employment Details Section",
    open: false,
    fields: [
      {
        id: "sf10",
        label: "Staff Category",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 1,
        options: STAFF_CATEGORY_OPTIONS,
      },
      {
        id: "sf10_profile",
        label: "Teaching Profile",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 2,
        options: TEACHING_PROFILE_OPTIONS,
      },
      {
        id: "sf11",
        label: "Designation",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 3,
        options: DESIGNATION_OPTIONS,
      },
      {
        id: "sf12",
        label: "Department",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 4,
        options: DEPARTMENT_OPTIONS,
      },
      {
        id: "sf13",
        label: "Employment Type",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 5,
        options: EMPLOYMENT_TYPE_OPTIONS,
      },
      {
        id: "sf14_dt",
        label: "Joining Date",
        type: "Date",
        required: true,
        visible: true,
        order: 6,
      },
    ],
  },
  {
    id: "sec_stf_role",
    title: "Role & Access Section",
    open: false,
    fields: [
      {
        id: "sf14",
        label: "System Role",
        type: "Dropdown",
        required: true,
        visible: true,
        order: 1,
        options: SYSTEM_ROLE_OPTIONS,
      },
      {
        id: "sf15",
        label: "Primary Campus Access",
        type: "Text",
        required: true,
        visible: true,
        order: 2,
      },
    ],
  },
  {
    id: "sec_stf_docs",
    title: "Documents Section",
    open: false,
    fields: [
      {
        id: "sf16",
        label: "ID Proof (Aadhar/PAN)",
        type: "File Upload",
        required: true,
        visible: true,
        order: 1,
      },
      {
        id: "sf17",
        label: "Degree Certificate",
        type: "File Upload",
        required: true,
        visible: true,
        order: 2,
      },
      {
        id: "sf18",
        label: "Experience Letter",
        type: "File Upload",
        required: false,
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: "sec_stf_review",
    title: "Review & Invite Section",
    open: false,
    fields: [
      {
        id: "sf19",
        label: "Send Portal Activation Invite",
        type: "Checkbox",
        required: true,
        visible: true,
        order: 1,
        system: true,
      },
    ],
  },
];

export function TemplatesManagement() {
  const [templateType, setTemplateType] = useState<TemplateType>("ENQUIRY");
  const [tabMode, setTabMode] = useState<TabMode>("SECTIONS");
  const [previewModal, setPreviewModal] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TenantTemplate[]>([]);
  const [editingField, setEditingField] = useState<{ secId: string; field: FormFieldItem } | null>(
    null,
  );

  const [enquirySections, setEnquirySections] =
    useState<FormSectionItem[]>(INITIAL_ENQUIRY_SECTIONS);
  const [appSections, setAppSections] = useState<FormSectionItem[]>(INITIAL_APPLICATION_SECTIONS);
  const [staffSections, setStaffSections] = useState<FormSectionItem[]>(INITIAL_STAFF_SECTIONS);

  const sections =
    templateType === "ENQUIRY"
      ? enquirySections
      : templateType === "APPLICATION"
        ? appSections
        : staffSections;

  const setSections =
    templateType === "ENQUIRY"
      ? setEnquirySections
      : templateType === "APPLICATION"
        ? setAppSections
        : setStaffSections;

  const config = {
    ENQUIRY: {
      title: "Enquiry Form Template",
      sub: "Design and manage enquiry form fields. Changes will reflect for new enquiries.",
      color: "bg-slate-900",
      accentBg: "bg-slate-900",
      bannerText: "Student Enquiry Form",
      bannerSub: "Please fill the form below. Our team will contact you soon.",
      badge: "STUDENT ENQUIRY",
      steps: [
        "Student Details",
        "Parent / Guardian Details",
        "Academic Interest",
        "Additional Info",
        "Review & Submit",
      ],
    },
    APPLICATION: {
      title: "Application Form Template",
      sub: "Design and manage application form fields. Changes will reflect for new student applications.",
      color: "bg-purple-900",
      accentBg: "bg-purple-900",
      bannerText: "Student Application Form",
      bannerSub: "Please fill the application form carefully.",
      badge: "STUDENT APPLICATION",
      steps: [
        "Student Information",
        "Parent / Guardian",
        "Previous School Details",
        "Address & Documents",
        "Review & Submit",
      ],
    },
    STAFF_ONBOARDING: {
      title: "Staff Onboarding Form Template",
      sub: "Design fields for staff onboarding.",
      color: "bg-emerald-900",
      accentBg: "bg-emerald-900",
      bannerText: "Staff Onboarding Form",
      bannerSub: "Please fill the details to onboard a new staff member.",
      badge: "STAFF ONBOARDING",
      steps: [
        "Personal Information",
        "Employment Details",
        "Role & Access",
        "Documents",
        "Review & Invite",
      ],
    },
  }[templateType];

  const layout =
    templateType === "ENQUIRY"
      ? "ENQUIRY_FORM"
      : templateType === "APPLICATION"
        ? "APPLICATION_FORM"
        : "STAFF_ONBOARDING";
  const templateName =
    templateType === "ENQUIRY"
      ? "Enquiry Form"
      : templateType === "APPLICATION"
        ? "Admission Application Form"
        : "Staff Onboarding Form";

  useEffect(() => {
    void listTenantTemplates()
      .then(setTemplates)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load templates"),
      );
  }, []);

  useEffect(() => {
    const current = templates.find((item) => item.layout === layout && item.name === templateName);
    if (!current) return;
    const typeName: Record<TenantTemplateFieldType, string> = {
      text: "Text",
      textarea: "Textarea",
      number: "Number",
      email: "Email",
      phone: "Text",
      date: "Date",
      select: "Dropdown",
      checkbox: "Checkbox",
      radio: "Dropdown",
      document: "File Upload",
    };
    const fieldsBySection = new Map<string, FormFieldItem[]>();
    const normalizedFields = current.fields.map((field) => {
      if (layout !== "STAFF_ONBOARDING") return field;
      if (field.key === "employmentType") {
        return { ...field, label: "Employment Type", options: EMPLOYMENT_TYPE_OPTIONS };
      }
      if (field.key === "designation") {
        return { ...field, options: DESIGNATION_OPTIONS };
      }
      if (field.key === "department") {
        return { ...field, options: DEPARTMENT_OPTIONS };
      }
      return field;
    });
    if (
      layout === "STAFF_ONBOARDING" &&
      !normalizedFields.some((field) => field.key === "staffType")
    ) {
      normalizedFields.push({
        key: "staffType",
        label: "Teaching Profile",
        type: "select",
        order: 2,
        required: true,
        visible: true,
        section:
          normalizedFields.find((field) => field.key === "employmentType")?.section ??
          "sec_stf_employment",
        scope: "BOTH",
        options: TEACHING_PROFILE_OPTIONS,
      });
    }
    for (const field of normalizedFields) {
      const sectionKey = field.section || "additional";
      const fields = fieldsBySection.get(sectionKey) ?? [];
      fields.push({
        id: field.key,
        label: field.label,
        type: typeName[field.type],
        required: field.required,
        visible: field.visible,
        order: field.order,
        system:
          current.requiredSystemKeys.includes(field.key) ||
          !["enquiry.", "application.", "staff_onboarding."].some((prefix) =>
            field.key.startsWith(prefix),
          ),
        ...(field.options?.length ? { options: field.options } : {}),
      });
      fieldsBySection.set(sectionKey, fields);
    }
    const storedSections = (
      current.sections.length
        ? current.sections
        : [...fieldsBySection.keys()].map((key, index) => ({
            key,
            label: key.replaceAll("_", " "),
            order: index + 1,
          }))
    )
      .sort((left, right) => left.order - right.order)
      .map((section) => ({
        id: section.key,
        title: section.label,
        open: section.order === 1,
        fields: (fieldsBySection.get(section.key) ?? []).sort(
          (left, right) => left.order - right.order,
        ),
      }));
    setSections(storedSections);
  }, [layout, setSections, templateName, templates]);

  const toggleSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, open: !sec.open } : sec)),
    );
  };

  const toggleFieldProp = (sectionId: string, fieldId: string, prop: "required" | "visible") => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: sec.fields.map((f) => {
            if (f.id !== fieldId) return f;
            return { ...f, [prop]: !f[prop] };
          }),
        };
      }),
    );
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: sec.fields
            .filter((f) => f.id !== fieldId)
            .map((f, idx) => ({ ...f, order: idx + 1 })),
        };
      }),
    );
  };

  const addSection = () => {
    const title = prompt("Enter new section name:", "New Form Section");
    if (!title) return;
    const newSec: FormSectionItem = {
      id: `sec_${Date.now()}`,
      title,
      open: true,
      fields: [],
    };
    setSections((prev) => [...prev, newSec]);
  };

  const addFieldToSection = (sectionId: string) => {
    const label = prompt("Enter field label:", "New Field");
    if (!label) return;
    const normalized = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const aliases = [
      "name",
      "student name",
      "full name",
      "full name of student",
      "grade",
      "class",
      "target class",
      "applying for class",
      "phone",
      "mobile",
      "email",
    ];
    if (
      aliases.includes(normalized) &&
      sections.some((section) =>
        section.fields.some(
          (field) =>
            field.label
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim() === normalized,
        ),
      )
    ) {
      setError(`${label.trim()} already exists in this template.`);
      return;
    }
    const newF: FormFieldItem = {
      id: `f_${Date.now()}`,
      label,
      type: "Text",
      required: false,
      visible: true,
      order: 1,
    };
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: [...sec.fields, { ...newF, order: sec.fields.length + 1 }],
        };
      }),
    );
  };

  const updateOptions = (sectionId: string, fieldId: string, optsStr: string) => {
    const options = optsStr
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          fields: sec.fields.map((f) => (f.id === fieldId ? { ...f, options } : f)),
        };
      }),
    );
  };

  const resetOrder = () => {
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f, idx) => ({ ...f, order: idx + 1 })),
      })),
    );
  };

  const saveTemplate = async () => {
    setSaving(true);
    setError(null);
    try {
      const fieldType = (value: string): TenantTemplateFieldType =>
        (({
          Text: "text",
          Textarea: "textarea",
          Number: "number",
          Email: "email",
          Date: "date",
          Dropdown: "select",
          Checkbox: "checkbox",
          "File Upload": "document",
        })[value] ?? "text") as TenantTemplateFieldType;
      const systemKey = (field: FormFieldItem) => {
        const normalized = field.label.toLowerCase();
        const mappings: Record<TemplateType, Array<[string, string]>> = {
          ENQUIRY: [
            ["full name", "studentName"],
            ["guardian name", "parentName"],
            ["primary phone", "phone"],
            ["email", "email"],
            ["target class", "academicTargetId"],
          ],
          APPLICATION: [
            ["full name", "studentName"],
            ["primary contact", "phone"],
            ["father name", "parentName"],
            ["applying for class", "academicTargetId"],
          ],
          STAFF_ONBOARDING: [
            ["full name", "fullName"],
            ["email", "email"],
            ["mobile", "phone"],
            ["staff category", "staffCategory"],
            ["teaching profile", "staffType"],
            ["employment type", "employmentType"],
            ["staff type", "employmentType"],
            ["designation", "designation"],
            ["department", "department"],
            ["joining date", "joiningDate"],
            ["primary campus", "primaryCampusId"],
            ["system role", "roleIds"],
          ],
        };
        return (
          mappings[templateType].find(([label]) => normalized.includes(label))?.[1] ??
          `${templateType.toLowerCase()}.${field.id}`
        );
      };
      const fields: TenantTemplateField[] = sections.flatMap((section) =>
        section.fields.map((field) => ({
          key: systemKey(field),
          label: field.label,
          type: fieldType(field.type),
          order: field.order,
          required: field.required,
          visible: field.visible,
          section: section.id,
          scope: templateType === "STAFF_ONBOARDING" ? "BOTH" : templateType,
          ...(field.options?.length ? { options: field.options } : {}),
        })),
      );
      const input = {
        name: templateName,
        templateType: "FORM" as const,
        layout,
        description: config.sub,
        sections: sections.map((section, index) => ({
          key: section.id,
          label: section.title,
          order: index + 1,
        })),
        fields,
        requiredSystemKeys: fields
          .filter((field) => field.required && !field.key.includes("."))
          .map((field) => field.key),
      };
      const existing = templates.find(
        (item) =>
          item.layout === layout &&
          (templateType === "STAFF_ONBOARDING"
            ? item.name === templateName
            : item.name === templateName),
      );
      const draft = existing
        ? await updateTenantTemplate(existing.id, input)
        : await createTenantTemplate(input);
      const published = await publishTenantTemplate(draft.id);
      setTemplates((current) => [...current.filter((item) => item.id !== published.id), published]);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save template");
    } finally {
      setSaving(false);
    }
  };

  const openPreview = () => {
    setPreviewStep(0);
    setPreviewModal(true);
  };

  return (
    <section className="space-y-6 pb-12">
      {/* Top 3 Template Selection Selector Bar */}
      <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        {(
          [
            { id: "ENQUIRY", label: "1. Student Enquiry", icon: UserPlus },
            { id: "APPLICATION", label: "2. Student Application", icon: UserPlus },
            { id: "STAFF_ONBOARDING", label: "3. Staff Onboarding", icon: UserCheck },
          ] as const
        ).map((item) => {
          const isActive = templateType === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTemplateType(item.id);
                setEditingField(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 bg-white hover:bg-slate-200/70 border border-slate-200",
              )}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Template Design Canvas Container (Admin View) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}
        {/* Template Design Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{config.title}</h2>
              <Badge variant="brand" className="text-[10px] font-extrabold uppercase">
                {config.badge}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{config.sub}</p>
          </div>

          <div className="flex items-center gap-2">
            {savedNotice && (
              <Badge variant="success" className="font-bold text-xs">
                ✓ Template Saved Live!
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={openPreview}
              className="h-8 text-xs font-bold border-slate-300"
            >
              <Eye size={14} /> Preview Form
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => void saveTemplate()}
              disabled={saving}
              className={cn("h-8 text-xs font-bold text-white shadow-xs", config.accentBg)}
            >
              <Save size={14} /> {saving ? "Saving..." : "Save and publish"}
            </Button>
          </div>
        </header>

        {/* Workspace Mode Tabs: Form Sections | Field Library | Settings */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-500">
          {(
            [
              { id: "SECTIONS", label: "Form Sections" },
              { id: "LIBRARY", label: "Field Library" },
              { id: "SETTINGS", label: "Settings" },
            ] as const
          ).map((tab) => {
            const isActive = tabMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabMode(tab.id)}
                className={cn(
                  "pb-2.5 transition-all border-b-2 cursor-pointer",
                  isActive
                    ? "border-brand-600 text-brand-700 font-extrabold"
                    : "border-transparent hover:text-slate-800",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Form Sections Table Layout */}
        {tabMode === "SECTIONS" && (
          <div className="space-y-4">
            {sections.map((sec) => (
              <div
                key={sec.id}
                className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleSection(sec.id)}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer border-b border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    {sec.open ? (
                      <ChevronDown size={16} className="text-slate-600" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-600" />
                    )}
                    <span className="text-xs font-bold text-slate-900">{sec.title}</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {sec.fields.length} fields
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addFieldToSection(sec.id);
                    }}
                    className="h-7 text-xs font-bold text-brand-600 hover:bg-brand-50"
                  >
                    <Plus size={13} /> Add Field
                  </Button>
                </div>

                {/* Section Field Table */}
                {sec.open && (
                  <div className="p-0 overflow-x-auto">
                    {sec.fields.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400 font-medium">
                        No fields added to this section yet.
                      </p>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                            <th className="py-2.5 px-4">Field Label</th>
                            <th className="py-2.5 px-4">Field Type</th>
                            <th className="py-2.5 px-4">Dropdown Options</th>
                            <th className="py-2.5 px-4 text-center w-24">Required</th>
                            <th className="py-2.5 px-4 text-center w-24">Visible</th>
                            <th className="py-2.5 px-4 text-center w-20">Order</th>
                            <th className="py-2.5 px-4 text-center w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                          {sec.fields.map((field) => (
                            <tr key={field.id} className="hover:bg-slate-50/60 transition-colors">
                              {/* Field Label */}
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  {field.system && (
                                    <span title="System Required Field">
                                      <LockKeyhole size={13} className="text-amber-600 shrink-0" />
                                    </span>
                                  )}
                                  <span>{field.label}</span>
                                </div>
                              </td>

                              {/* Field Type */}
                              <td className="py-2.5 px-4 text-slate-600 font-semibold">
                                {field.type}
                              </td>

                              {/* Options Summary or Editor */}
                              <td className="py-2.5 px-4 max-w-[220px]">
                                {field.type === "Dropdown" ? (
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 font-bold block">
                                      {(field.options ?? []).length} values:{" "}
                                      {(field.options ?? []).slice(0, 3).join(", ")}...
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingField({ secId: sec.id, field })}
                                      className="text-[10px] font-bold text-brand-600 hover:underline cursor-pointer"
                                    >
                                      Edit Options List
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>

                              {/* Required Checkbox */}
                              <td className="py-2.5 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  disabled={field.system}
                                  onChange={() => toggleFieldProp(sec.id, field.id, "required")}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer disabled:opacity-50"
                                />
                              </td>

                              {/* Visible Checkbox */}
                              <td className="py-2.5 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={field.visible}
                                  onChange={() => toggleFieldProp(sec.id, field.id, "visible")}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer"
                                />
                              </td>

                              {/* Order Box */}
                              <td className="py-2.5 px-4 text-center">
                                <span className="inline-block border border-slate-200 bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-700">
                                  {field.order}
                                </span>
                              </td>

                              {/* Action Delete */}
                              <td className="py-2.5 px-4 text-center">
                                {!field.system && (
                                  <button
                                    type="button"
                                    onClick={() => removeField(sec.id, field.id)}
                                    className="text-rose-500 hover:text-rose-700 transition-colors p-1 rounded hover:bg-rose-50"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-2">
              <Button
                onClick={addSection}
                size="sm"
                variant="brand"
                className="h-8 text-xs font-bold"
              >
                <Plus size={14} /> Add Section
              </Button>
              <Button
                onClick={resetOrder}
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold text-slate-600"
              >
                <RotateCcw size={13} /> Reset Order
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Field Library */}
        {tabMode === "LIBRARY" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Full Name", type: "Text", req: true },
              { label: "Date of Birth", type: "Date", req: true },
              { label: "Gender", type: "Dropdown", req: true, options: GENDER_OPTIONS },
              {
                label: "Nationality",
                type: "Dropdown",
                req: true,
                options: NATIONALITY_OPTIONS,
                defaultValue: "Indian",
              },
              {
                label: "Blood Group",
                type: "Dropdown",
                req: false,
                options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
              },
              { label: "ID Proof Upload", type: "File Upload", req: false },
              { label: "Residential Address", type: "Textarea", req: true },
              { label: "Emergency Contact Phone", type: "Text", req: true },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs"
              >
                <div>
                  <strong className="block text-slate-900 font-bold">{item.label}</strong>
                  <span className="text-[11px] text-slate-500">Type: {item.type}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const secId = sections[0]?.id;
                    if (secId) addFieldToSection(secId);
                  }}
                  className="h-7 text-xs font-bold"
                >
                  <Plus size={13} /> Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Settings */}
        {tabMode === "SETTINGS" && (
          <div className="space-y-4 max-w-md text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-800">Form Title Banner</label>
              <Input defaultValue={config.bannerText} className="h-8 text-xs font-semibold" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-800">Form Instructions Subtitle</label>
              <Input defaultValue={config.bannerSub} className="h-8 text-xs font-semibold" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-brand-600" />
              <span className="font-bold text-slate-800">
                Allow parent/applicant to save draft form
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Options List Editor Drawer/Dialog */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Dropdown Options</h3>
                <p className="text-xs text-slate-500">Field: {editingField.field.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Options List (one per line):
              </label>
              <textarea
                rows={8}
                defaultValue={(editingField.field.options ?? []).join("\n")}
                onChange={(e) =>
                  updateOptions(editingField.secId, editingField.field.id, e.target.value)
                }
                placeholder="Enter options (e.g. Option 1&#10;Option 2&#10;Option 3)"
                className="flex w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none font-sans"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="brand"
                onClick={() => setEditingField(null)}
                className="h-8 text-xs font-bold px-5"
              >
                Done & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Multi-Step Live Form Preview Modal with Previous & Next Navigation */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-300 space-y-0 my-8">
            {/* Modal Top Header */}
            <div className="bg-slate-900 px-6 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Form Live Preview ({config.badge}) - Step {previewStep + 1} of {sections.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Page Header */}
            <header className="p-6 text-center border-b border-slate-200 bg-white space-y-1">
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                {"{{institution.name}}"}
              </h1>
              <p className="text-xs font-bold text-slate-800">{"{{campus.name}}"}</p>
            </header>

            {/* Dark Color Form Title Banner */}
            <div className={cn("p-4 text-center text-white space-y-0.5", config.color)}>
              <h3 className="text-sm font-extrabold tracking-wide uppercase">
                {config.bannerText}
              </h3>
              <p className="text-[11px] opacity-80">{config.bannerSub}</p>
            </div>

            {/* Clickable 5-Step Progress Tracker Bar */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs">
                {config.steps.map((stepName, i) => {
                  const isActive = i === previewStep;
                  const isCompleted = i < previewStep;

                  return (
                    <div
                      key={stepName}
                      onClick={() => setPreviewStep(i)}
                      className="flex flex-col items-center gap-1 flex-1 text-center cursor-pointer group"
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-[11px] transition-all",
                          isActive
                            ? "bg-brand-600 text-white shadow-xs ring-2 ring-brand-600 ring-offset-1"
                            : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600 group-hover:bg-slate-300",
                        )}
                      >
                        {isCompleted ? "✓" : i + 1}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold leading-tight max-w-[90px] transition-colors",
                          isActive
                            ? "text-brand-900 font-extrabold"
                            : isCompleted
                              ? "text-emerald-800 font-bold"
                              : "text-slate-500",
                        )}
                      >
                        {stepName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Step Active Section Fields Form View */}
            <div className="p-6 space-y-4 text-xs">
              <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>{sections[previewStep]?.title ?? `Step ${previewStep + 1} Information`}</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Section {previewStep + 1} of {sections.length}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(sections[previewStep]?.fields ?? []).map((f) => {
                  const optionsList =
                    f.options && f.options.length
                      ? f.options
                      : ["Option 1", "Option 2", "Option 3"];
                  const isNationality = f.label.toLowerCase().includes("nationality");
                  const defaultVal = f.defaultValue ?? (isNationality ? "Indian" : "");

                  return (
                    <div
                      key={f.id}
                      className={cn(
                        "space-y-1",
                        f.type === "Textarea" || f.type === "Checkbox" ? "sm:col-span-2" : "",
                      )}
                    >
                      <label className="font-bold text-slate-800 block">
                        {f.label} {f.required && <span className="text-rose-600">*</span>}
                      </label>

                      {f.type === "Text" && (
                        <Input
                          placeholder={`Enter ${f.label.toLowerCase()}`}
                          className="h-8.5 text-xs font-medium"
                        />
                      )}
                      {f.type === "Date" && (
                        <Input type="date" className="h-8.5 text-xs font-medium" />
                      )}
                      {f.type === "Email" && (
                        <Input
                          type="email"
                          placeholder={`Enter ${f.label.toLowerCase()}`}
                          className="h-8.5 text-xs font-medium"
                        />
                      )}
                      {f.type === "Dropdown" && (
                        <select
                          defaultValue={defaultVal}
                          className="flex h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
                        >
                          {!defaultVal && <option value="">Select {f.label}</option>}
                          {optionsList.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                      {f.type === "File Upload" && (
                        <Input
                          type="file"
                          className="h-8.5 text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700"
                        />
                      )}
                      {f.type === "Checkbox" && (
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                          <input
                            type="checkbox"
                            defaultChecked={f.required}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600"
                          />
                          <span className="font-semibold text-slate-800">
                            I accept all details provided above are true and accurate.
                          </span>
                        </label>
                      )}
                      {f.type === "Textarea" && (
                        <textarea
                          rows={2}
                          placeholder={`Enter ${f.label.toLowerCase()}`}
                          className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none font-sans"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Interactive Footer Actions with Previous & Next Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                {previewStep > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewStep((s) => Math.max(0, s - 1))}
                    className="h-8 text-xs font-bold px-4 border-slate-300 text-slate-700"
                  >
                    <ArrowLeft size={14} /> Previous
                  </Button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    📞 Need help? Call us at 080-12345678 or email info@wisdomera.edu.in
                  </span>
                )}

                {previewStep < sections.length - 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="brand"
                    onClick={() => setPreviewStep((s) => Math.min(sections.length - 1, s + 1))}
                    className="h-8 text-xs font-bold px-6 ml-auto"
                  >
                    Next <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      alert("Form submitted successfully!");
                      setPreviewModal(false);
                    }}
                    className="h-8 text-xs font-bold px-6 ml-auto bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    Submit Form ✓
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
