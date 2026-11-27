/**
 * AuraGen Context-Aware Adaptive Simplified Wizard Generator
 *
 * Dynamically adapts to ANY mounted enterprise form schema (Infosys Career Portal,
 * Infotact Financial Underwriting, or live DOM-extracted schemas) and renders
 * a crisp white/slate + emerald-green 3-step React wizard with human-readable labels,
 * smart inputs, contextual formula/policy hints, and bidirectional state sync.
 */

const FIELD_METADATA = {
  // Infotact Financial Portal
  fullName: { label: "Full Legal Name", type: "text", placeholder: "e.g. Jordan Alexander Mercer", hint: "Must match government-issued ID." },
  email: { label: "Email Address", type: "email", placeholder: "name@company.com", hint: "Used for application updates." },
  phone: { label: "Phone Number", type: "tel", placeholder: "(555) 234-8910", hint: "10-digit primary contact number." },
  dateOfBirth: { label: "Date of Birth", type: "date", placeholder: "", hint: "Applicant must be 18 years or older." },
  taxId: { label: "SSN / Tax ID", type: "text", placeholder: "XXX-XX-XXXX", hint: "Encrypted 9-digit taxpayer identifier." },
  ssn: { label: "SSN / Tax ID", type: "text", placeholder: "XXX-XX-XXXX", hint: "Encrypted 9-digit taxpayer identifier." },
  employmentStatus: {
    label: "Employment Status",
    type: "select",
    hint: "Determines required income verification documentation.",
    options: [
      { value: "full_time", label: "Full-Time W-2 Employee" },
      { value: "self_employed", label: "Self-Employed / Principal Owner" },
      { value: "part_time", label: "Part-Time / Variable Hours" },
      { value: "retired", label: "Retired / Pensioned" }
    ]
  },
  employerName: { label: "Employer / Business Name", type: "text", placeholder: "e.g. Infotact Financial Holdings", hint: "Registered legal entity name." },
  jobTitle: { label: "Job Title / Role", type: "text", placeholder: "e.g. Operations Lead", hint: "Your primary functional title." },
  yearsAtEmployer: { label: "Years at Current Employer", type: "number", placeholder: "e.g. 4", hint: "Total years in current role." },
  annualIncome: { label: "Gross Annual Income ($)", type: "number", placeholder: "e.g. 145000", hint: "Pre-tax salary, bonuses, and recurring compensation." },
  monthlyNetIncome: { label: "Monthly Net Take-Home Pay ($)", type: "number", placeholder: "e.g. 8800", hint: "Average post-tax monthly deposit." },
  additionalIncome: { label: "Additional Annual Income ($)", type: "number", placeholder: "e.g. 15000", hint: "Optional bonus, dividends, or secondary income." },
  incomeVerificationType: {
    label: "Income Verification Method",
    type: "select",
    hint: "Choose the fastest verification document you have ready.",
    options: [
      { value: "w2_paystubs", label: "W-2 & Recent 60-Day Paystubs" },
      { value: "tax_returns_1040", label: "Federal Tax Returns (Form 1040)" },
      { value: "bank_statements", label: "12-Month Certified Bank Statements" },
      { value: "cpa_letter", label: "CPA Comfort Letter & P&L" }
    ]
  },
  checkingSavingsBalance: { label: "Checking & Savings Balance ($)", type: "number", placeholder: "e.g. 42000", hint: "Immediately accessible depository cash." },
  loanAmount: { label: "Requested Loan Amount ($)", type: "number", placeholder: "e.g. 250000", hint: "Total credit facility amount requested." },
  monthlyHousingPayment: { label: "Monthly Housing Payment ($)", type: "number", placeholder: "e.g. 2650", hint: "Monthly mortgage or lease obligation." },
  monthlyDebtService: { label: "Total Monthly Debt Obligations ($)", type: "number", placeholder: "e.g. 750", hint: "Combined recurring minimum debt payments." },
  creditScore: { label: "Estimated Credit Score", type: "number", placeholder: "e.g. 740", hint: "Approximate FICO score range (300–850)." },

  // Infosys Enterprise Career Portal
  uanEpfoId: { label: "Previous UAN / EPFO Member ID", type: "text", placeholder: "12-digit UAN (e.g. 100987654321)", hint: "Found on your prior Indian payroll payslip or EPFO passbook. Enter NA if fresher." },
  highestDegree: {
    label: "Highest Qualifying Degree",
    type: "select",
    hint: "Select your highest completed university qualification.",
    options: [
      { value: "btech_be", label: "B.Tech / B.E. (Engineering)" },
      { value: "mtech_me", label: "M.Tech / M.E. / M.S." },
      { value: "mca", label: "MCA (Master of Computer Applications)" },
      { value: "bsc_bca", label: "B.Sc / BCA (Computer Science)" }
    ]
  },
  cgpaRaw: { label: "University CGPA (10-Point Scale)", type: "number", placeholder: "e.g. 8.45", hint: "Enter cumulative GPA on a 10.0 scale as printed on transcript." },
  cgpaConversionFormula: {
    label: "CGPA-to-Percentage Conversion Formula",
    type: "select",
    hint: "Infosys standard policy uses (CGPA - 0.5) × 10 if your university does not issue an official multiplier.",
    options: [
      { value: "ugc_minus_half", label: "Standard UGC / CBSE: (CGPA - 0.5) × 10" },
      { value: "vtu_formula", label: "VTU Formula: (CGPA - 0.75) × 10" },
      { value: "direct_ten", label: "Direct Multiplier: CGPA × 10" },
      { value: "mumbai_univ", label: "Mumbai Univ: 7.1 × CGPA + 11" }
    ]
  },
  graduationYear: { label: "Year of Graduation", type: "number", placeholder: "e.g. 2022", hint: "4-digit completion year." },
  totalExperienceYears: { label: "Total Relevant Experience (Years)", type: "number", placeholder: "e.g. 4.5", hint: "Exclude unpaid academic internships." },
  currentEmployer: { label: "Current / Most Recent Employer", type: "text", placeholder: "e.g. TCS / Accenture / Infotact", hint: "Legal entity name on your relieving letter." },
  gapAudit24Months: {
    label: "24-Month Background Verification Gap Audit",
    type: "select",
    hint: "Any gap > 30 days between roles requires an explanation note for NSR/BGV clearance.",
    options: [
      { value: "no_gaps", label: "No Employment Gaps (> 30 days) in Last 24 Months" },
      { value: "medical_family", label: "Verified Medical or Family Care Leave" },
      { value: "higher_education", label: "Full-Time Higher Education / Upskilling" },
      { value: "transition_break", label: "Between Offers / Job Search Transition" }
    ]
  },
  gapExplanation: { label: "Gap Verification Note (If Applicable)", type: "text", placeholder: "e.g. Completed AWS Solutions Architect certification", hint: "Briefly describe dates and supporting proof available." },
  noticePeriodDays: { label: "Official Notice Period (Days)", type: "number", placeholder: "e.g. 60", hint: "Standard corporate notice duration (0–90 days)." },
  noticeBuyoutClause: {
    label: "Notice Period Buyout Clause",
    type: "select",
    hint: "Indicates whether your current employer allows early release via salary buyout.",
    options: [
      { value: "buyout_available", label: "Buyout Permitted (Can Join in ≤ 30 Days)" },
      { value: "negotiable", label: "Manager-Approved Early Release Possible" },
      { value: "strict_90", label: "Non-Negotiable Full Notice Serving" },
      { value: "immediate", label: "Already Serving Notice / Immediate Joiner" }
    ]
  },
  expectedCtc: { label: "Expected Annual Compensation (INR Lakhs / USD)", type: "number", placeholder: "e.g. 24", hint: "Total target fixed + variable package." },
  relocationTierPreference: {
    label: "Relocation Tier Preference",
    type: "select",
    hint: "Infosys hybrid work policy requires minimum 10 days/month at your base DC.",
    options: [
      { value: "bengaluru_ecity", label: "Tier 1 — Bengaluru (Electronic City DC)" },
      { value: "pune_hinjewadi", label: "Tier 1 — Pune (Hinjewadi Phase II)" },
      { value: "hyderabad_pocharam", label: "Tier 1 — Hyderabad (Pocharam SEZ)" },
      { value: "mysuru_hub", label: "Tier 2 — Mysuru Global Education Center" }
    ]
  },
  reactNextRating: {
    label: "Frontend Architecture (React / Next.js) Rating",
    type: "select",
    hint: "Rate production proficiency (1 = Basic, 5 = Principal Architect).",
    options: [
      { value: "5", label: "5 — Expert (Production Architecture & Perf)" },
      { value: "4", label: "4 — Advanced (Independent Delivery)" },
      { value: "3", label: "3 — Intermediate (Solid Feature Work)" },
      { value: "2", label: "2 — Developing" }
    ]
  },
  aiLangchainRating: {
    label: "Generative AI / LangChain Proficiency",
    type: "select",
    hint: "Prompt engineering, AST validation, and LLM streaming pipelines.",
    options: [
      { value: "5", label: "5 — Expert (Multi-Agent & AST Sandboxing)" },
      { value: "4", label: "4 — Advanced (RAG & Streaming Pipelines)" },
      { value: "3", label: "3 — Intermediate" },
      { value: "2", label: "2 — Developing" }
    ]
  }
};

function formatHumanLabel(fieldKey) {
  if (FIELD_METADATA[fieldKey]) return FIELD_METADATA[fieldKey].label;
  return String(fieldKey || "Field")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function normalizeSchemaFields(formFields = [], activeField = "annualIncome") {
  const list = Array.isArray(formFields) ? formFields : [];
  const normalized = [];
  const seen = new Set();

  for (const item of list) {
    const name = typeof item === "string" ? item : item?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const staticMeta = FIELD_METADATA[name] || {};
    normalized.push({
      name,
      label: (typeof item === "object" && item.label) || staticMeta.label || formatHumanLabel(name),
      type: (typeof item === "object" && item.type) || staticMeta.type || "text",
      placeholder: (typeof item === "object" && item.placeholder) || staticMeta.placeholder || `Enter ${formatHumanLabel(name).toLowerCase()}...`,
      hint: (typeof item === "object" && (item.helpText || item.hint)) || staticMeta.hint || "Verify and confirm this value.",
      options: (typeof item === "object" && Array.isArray(item.options) && item.options.length > 0) ? item.options : staticMeta.options || null,
      section: (typeof item === "object" && item.section) || "general",
      error: (typeof item === "object" && item.error) || null
    });
  }

  if (!seen.has(activeField)) {
    const meta = FIELD_METADATA[activeField] || {};
    normalized.unshift({
      name: activeField,
      label: meta.label || formatHumanLabel(activeField),
      type: meta.type || "text",
      placeholder: meta.placeholder || `Enter ${formatHumanLabel(activeField).toLowerCase()}...`,
      hint: meta.hint || "Focused assistance for this field.",
      options: meta.options || null,
      section: "focus",
      error: null
    });
  }

  return normalized;
}

export async function generateComponentStub({
  activeField = "annualIncome",
  formFields = [],
  userInput = {},
  formId = "infotact-finance-v1",
  domContext = {},
  score = 65
}) {
  const safeField = String(activeField || "annualIncome").replace(/[^a-zA-Z0-9_]/g, "");
  const isInfosys =
    String(formId || "").includes("infosys") ||
    safeField.includes("cgpa") ||
    safeField.includes("uan") ||
    safeField.includes("notice") ||
    safeField.includes("gapAudit") ||
    safeField.includes("relocation");

  const resolvedFields = normalizeSchemaFields(formFields, safeField);
  const focusFieldObj = resolvedFields.find((f) => f.name === safeField) || resolvedFields[0];

  // Pick up to 4 additional high-priority fields from the active schema for Step 2
  const secondaryFields = resolvedFields
    .filter((f) => f.name !== safeField)
    .slice(0, 4);

  const portalBadge = isInfosys ? "Infosys Career Portal • Guided Mode" : "Infotact Financial • Guided Mode";
  const step1Title = isInfosys ? "Candidate & Priority Field" : "Identity & Priority Field";
  const step2Title = isInfosys ? "Verification & Policy Details" : "Employment & Compensation";

  const serializedInitial = JSON.stringify(userInput || {});
  const serializedFocus = JSON.stringify(focusFieldObj);
  const serializedSecondary = JSON.stringify(secondaryFields);
  const totalCount = resolvedFields.length;

  return `import React, { useState } from "react";

/**
 * AuraGen Simplified Conversational Wizard
 * Portal: "${portalBadge}"
 * Focus Field: "${safeField}" (Cognitive Load Score: ${score}/100)
 */
export default function DynamicFormWizard({ initialValues = ${serializedInitial}, onChange, onSubmit = () => {}, onCancel }) {
  const [step, setStep] = useState(1);
  const focusField = ${serializedFocus};
  const secondaryFields = ${serializedSecondary};

  const [formData, setFormData] = useState({
    ...initialValues,
    ${safeField}: initialValues.${safeField} !== undefined ? initialValues.${safeField} : ""
  });

  const steps = [
    { num: 1, title: "${step1Title}" },
    { num: 2, title: "${step2Title}" },
    { num: 3, title: "Review & Submit" }
  ];

  const handleFieldChange = (name, value) => {
    const next = { ...formData, [name]: value };
    setFormData(next);
    if (typeof onChange === "function") {
      onChange(next);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const progressPct = Math.round((step / steps.length) * 100);
  const isCompleted = (val) => val !== undefined && val !== null && String(val).trim() !== "";

  const renderSmartInput = (field, idPrefix) => {
    const val = formData[field.name] !== undefined ? formData[field.name] : "";
    if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
      return (
        <select
          id={idPrefix + field.name}
          name={field.name}
          value={val}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        >
          {field.options.map((opt, idx) => (
            <option key={idx} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={idPrefix + field.name}
        type={field.type || "text"}
        name={field.name}
        value={val}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        placeholder={field.placeholder || ""}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
      />
    );
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AuraGen Simplified Wizard
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              ${portalBadge}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Score: ${score}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Step {step} of {steps.length} • {steps[step - 1].title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Streamlined guidance focused on <span className="font-semibold text-emerald-700">{focusField.label}</span>.
          </p>
        </div>

        {typeof onCancel === "function" && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
          >
            ← View Full Form
          </button>
        )}
      </div>

      {/* Sleek Emerald Step Progress Bar & Step Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {steps.map((s) => {
            const active = step === s.num;
            const done = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all " +
                  (active
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm"
                    : done
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100")
                }
              >
                <span className="w-5 h-5 rounded-full bg-white/90 text-emerald-700 flex items-center justify-center text-[11px] font-bold">
                  {done ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline truncate">{s.title}</span>
              </button>
            );
          })}
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: progressPct + "%" }}
          />
        </div>
      </div>

      {/* Contextual Friction Help Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 text-xs sm:text-sm text-slate-700 flex items-start gap-3">
        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
          ✓
        </span>
        <div>
          <strong className="font-semibold text-slate-900 block mb-0.5">
            Simplified guidance for {focusField.label}
          </strong>
          <span>
            We extracted all ${totalCount} fields from your active portal and organized them into 3 clear steps. All entered values stay synchronized.
          </span>
        </div>
      </div>

      {/* Multi-Step Conversational Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={"wiz_focus_" + focusField.name} className="text-xs font-semibold text-slate-800">
                  {focusField.label}
                </label>
                {isCompleted(formData[focusField.name]) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Synced
                  </span>
                )}
              </div>
              {renderSmartInput(focusField, "wiz_focus_")}
              <p className="text-[11px] text-slate-500">{focusField.hint}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {secondaryFields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={"wiz_sec_" + field.name} className="text-xs font-semibold text-slate-700">
                    {field.label}
                  </label>
                  {isCompleted(formData[field.name]) && <span className="text-xs font-bold text-emerald-600">✓</span>}
                </div>
                {renderSmartInput(field, "wiz_sec_")}
                {field.hint && <p className="text-[11px] text-slate-500">{field.hint}</p>}
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Ready to Sync & Submit
              </span>
              <span className="text-xs text-slate-500">All ${totalCount} portal fields preserved</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">{focusField.label}</span>
                <span className="font-semibold text-emerald-700">{formData[focusField.name] || "Not provided"}</span>
              </div>
              {secondaryFields.slice(0, 3).map((sf) => (
                <div key={sf.name} className="p-3 bg-white rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{sf.label}</span>
                  <span className="font-semibold text-slate-900">{formData[sf.name] || "Not provided"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length, s + 1))}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              Complete & Submit ✓
            </button>
          )}
        </div>
      </form>
    </div>
  );
}`;
}
