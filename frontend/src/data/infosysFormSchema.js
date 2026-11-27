/**
 * AuraGen Scenario 2: Infosys Enterprise Career Portal
 * (Senior AI / Full-Stack Engineer Application)
 *
 * Intentionally packed with notoriously confusing corporate HR/BGV fields
 * to demonstrate AuraGen's form-agnostic autonomous DOM extraction and self-healing UI.
 */

export const INFOSYS_FORM_SECTIONS = [
  {
    id: "candidate_identity",
    title: "1. Candidate Identity & Statutory Identifiers",
    subtitle: "Mandatory corporate onboarding & EPFO/NSR compliance details",
    fields: [
      {
        name: "fullName",
        label: "Candidate Full Name (Per Passport / PAN)",
        type: "text",
        placeholder: "e.g. Aarav Vikram Sharma",
        required: true,
        helpText: "Mismatch with government ID delays BGV clearance."
      },
      {
        name: "email",
        label: "Primary Personal Email",
        type: "email",
        placeholder: "aarav.sharma@domain.com",
        required: true,
        helpText: "Used for offer letter dispatch & Launchpad onboarding."
      },
      {
        name: "phone",
        label: "Primary Mobile Number",
        type: "tel",
        placeholder: "+91 98765 43210",
        required: true,
        helpText: "Must be linked to Aadhaar/UAN for OTP verification."
      },
      {
        name: "uanEpfoId",
        label: "Previous UAN / EPFO Member ID",
        type: "text",
        placeholder: "12-digit UAN (e.g. 100987654321)",
        required: true,
        helpText: "12-digit Universal Account Number from prior employer payslip (enter 000000000000 if fresher)."
      }
    ]
  },
  {
    id: "academic_cgpa",
    title: "2. Academic Credentials & CGPA Conversion",
    subtitle: "Strict university grade normalization for eligibility screening",
    fields: [
      {
        name: "highestDegree",
        label: "Highest Qualifying Degree",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select degree classification..." },
          { value: "btech_be", label: "B.Tech / B.E. (4-Year Engineering)" },
          { value: "mtech_me", label: "M.Tech / M.E. / M.S." },
          { value: "mca", label: "MCA (Master of Computer Applications)" },
          { value: "bsc_bca", label: "B.Sc / BCA (Computer Science)" }
        ],
        helpText: "Provisional certificate required during document upload."
      },
      {
        name: "cgpaRaw",
        label: "Cumulative University CGPA (10-Point Scale)",
        type: "number",
        placeholder: "e.g. 8.45",
        min: 0,
        max: 10,
        step: "0.01",
        required: true,
        helpText: "Enter exact cumulative grade point average before percentage conversion."
      },
      {
        name: "cgpaConversionFormula",
        label: "CGPA-to-Percentage Conversion Formula",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select university conversion rule..." },
          { value: "ugc_minus_half", label: "UGC / CBSE Standard: (CGPA - 0.5) × 10" },
          { value: "vtu_formula", label: "VTU Official Rule: (CGPA - 0.75) × 10" },
          { value: "direct_ten", label: "Direct Multiplier: CGPA × 10" },
          { value: "mumbai_univ", label: "Mumbai Univ Scale: 7.1 × CGPA + 11" }
        ],
        helpText: "If university does not specify a formula, select UGC Standard: (CGPA - 0.5) × 10."
      },
      {
        name: "graduationYear",
        label: "Year of Degree Completion",
        type: "number",
        placeholder: "e.g. 2021",
        min: 1985,
        max: 2027,
        required: true,
        helpText: "Month & year of final semester mark sheet issuance."
      }
    ]
  },
  {
    id: "bgv_gap_audit",
    title: "3. Experience & 24-Month Background Verification Gap Audit",
    subtitle: "Mandatory continuous timeline audit for client security compliance",
    fields: [
      {
        name: "totalExperienceYears",
        label: "Total Full-Time Experience (Years)",
        type: "number",
        placeholder: "e.g. 4.5",
        min: 0,
        max: 45,
        step: "0.5",
        required: true,
        helpText: "Exclude unpaid academic internships or part-time freelance gigs."
      },
      {
        name: "currentEmployer",
        label: "Current / Last Legal Employer Name",
        type: "text",
        placeholder: "e.g. Tata Consultancy Services Ltd.",
        required: true,
        helpText: "Must match relieving letter and Form 16."
      },
      {
        name: "gapAudit24Months",
        label: "24-Month Background Verification Gap Audit",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select 24-month continuity status..." },
          { value: "no_gaps", label: "Zero Gaps > 30 Calendar Days in Prior 24 Months" },
          { value: "medical_family", label: "Verified Medical / Family Care Sabbatical (> 30 days)" },
          { value: "higher_education", label: "Full-Time Higher Education / Certification Break" },
          { value: "transition_break", label: "Between Offers / Notice Transition Gap" }
        ],
        helpText: "Unexplained gaps exceeding 30 calendar days trigger manual BGV hold."
      },
      {
        name: "gapExplanation",
        label: "Gap Timeline & Supporting Proof Note",
        type: "text",
        placeholder: "e.g. No gaps, or specify exact dates & certificate",
        required: false,
        helpText: "Mandatory if any continuity break was selected above."
      }
    ]
  },
  {
    id: "notice_relocation",
    title: "4. Notice Period Buyout & Relocation Tiering",
    subtitle: "Joining SLA, buyout eligibility, and Development Center (DC) allocation",
    fields: [
      {
        name: "noticePeriodDays",
        label: "Contractual Notice Period (Calendar Days)",
        type: "number",
        placeholder: "e.g. 60",
        min: 0,
        max: 120,
        required: true,
        helpText: "Enter 0 if currently serving notice with < 15 days left."
      },
      {
        name: "noticeBuyoutClause",
        label: "Notice Period Buyout Clause Eligibility",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select buyout clause terms..." },
          { value: "buyout_available", label: "Employer Permits Salary Buyout (Join ≤ 30 Days)" },
          { value: "negotiable", label: "Manager-Discretionary Early Release Possible" },
          { value: "strict_90", label: "Strict Non-Buyout Clause (Full Notice Mandatory)" },
          { value: "immediate", label: "Immediate Joiner / Serving Final Week" }
        ],
        helpText: "Determines whether Infosys HR will initiate notice buyout reimbursement."
      },
      {
        name: "expectedCtc",
        label: "Expected Annual Fixed + Variable CTC (Lakhs INR / $k)",
        type: "number",
        placeholder: "e.g. 28",
        min: 1,
        required: true,
        helpText: "Provide total annual target compensation."
      },
      {
        name: "relocationTierPreference",
        label: "Relocation Tier Preference (Hybrid DC Policy)",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select preferred DC tier..." },
          { value: "bengaluru_ecity", label: "Tier 1 — Bengaluru (Electronic City SEZ)" },
          { value: "pune_hinjewadi", label: "Tier 1 — Pune (Hinjewadi Phase II)" },
          { value: "hyderabad_pocharam", label: "Tier 1 — Hyderabad (Pocharam Campus)" },
          { value: "mysuru_hub", label: "Tier 2 — Mysuru Global Education Center" }
        ],
        helpText: "Hybrid mandate requires minimum 10 in-office days per month."
      }
    ]
  },
  {
    id: "skill_matrix",
    title: "5. Enterprise Skill Matrix Self-Rating",
    subtitle: "Technical proficiency calibration for Senior AI / Full-Stack band",
    fields: [
      {
        name: "reactNextRating",
        label: "React 19 / Next.js 15 Architecture Rating",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select proficiency (1-5)..." },
          { value: "5", label: "5 — Principal Architect (SSR, Perf, AST)" },
          { value: "4", label: "4 — Advanced Production Delivery" },
          { value: "3", label: "3 — Intermediate" },
          { value: "2", label: "2 — Foundational" }
        ],
        helpText: "Validated during technical panel round 1."
      },
      {
        name: "aiLangchainRating",
        label: "Generative AI / LangChain & LLM Systems Rating",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select proficiency (1-5)..." },
          { value: "5", label: "5 — Expert (Streaming, RAG, Guardrails)" },
          { value: "4", label: "4 — Advanced Integration" },
          { value: "3", label: "3 — Intermediate" },
          { value: "2", label: "2 — Foundational" }
        ],
        helpText: "Includes prompt engineering, caching, and AST security."
      }
    ]
  }
];

export const ALL_INFOSYS_FIELDS = INFOSYS_FORM_SECTIONS.flatMap((section) =>
  section.fields.map((field) => ({ ...field, section: section.id }))
);

export function createInitialInfosysValues() {
  const initial = {};
  for (const field of ALL_INFOSYS_FIELDS) {
    initial[field.name] = "";
  }
  return initial;
}

export function validateInfosysField(name, rawValue, allValues = {}) {
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  const fieldDef = ALL_INFOSYS_FIELDS.find((f) => f.name === name);
  if (!fieldDef) return null;

  const isEmpty = value === "" || value === null || value === undefined;
  if (name === "gapExplanation" && allValues.gapAudit24Months && allValues.gapAudit24Months !== "no_gaps" && isEmpty) {
    return "Gap explanation note is required when a career break > 30 days is declared.";
  }
  if (fieldDef.required && isEmpty) {
    return `${fieldDef.label} is required.`;
  }
  if (isEmpty) return null;

  if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid corporate or personal email address.";
  }
  if (name === "uanEpfoId") {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 12) {
      return "UAN / EPFO ID must be exactly 12 digits (enter 000000000000 if fresher).";
    }
  }
  if (name === "cgpaRaw") {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0 || num > 10) {
      return "CGPA must be between 0.00 and 10.00.";
    }
  }
  return null;
}

export function validateAllInfosysFields(values) {
  const errors = {};
  for (const field of ALL_INFOSYS_FIELDS) {
    const err = validateInfosysField(field.name, values[field.name], values);
    if (err) errors[field.name] = err;
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
