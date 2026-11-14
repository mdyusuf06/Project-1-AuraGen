/**
 * AuraGen Demo Form Schema: Complex Financial Application (21 Fields across 5 Sections)
 * Sections: personal, employment, income, assets, liabilities
 */

export const FINANCIAL_FORM_SECTIONS = [
  {
    id: "personal",
    title: "1. Personal Information",
    subtitle: "Legal identity and regulatory contact disclosures",
    fields: [
      {
        name: "fullName",
        label: "Full Legal Name",
        type: "text",
        placeholder: "e.g., Jordan Alexander Mercer",
        required: true,
        helpText: "Must match government-issued identification."
      },
      {
        name: "email",
        label: "Primary Email Address",
        type: "email",
        placeholder: "jordan.mercer@enterprise.com",
        required: true,
        helpText: "Used for underwriting notices and encrypted disclosures."
      },
      {
        name: "phone",
        label: "Direct Phone Number",
        type: "tel",
        placeholder: "+1 (555) 234-8910",
        required: true,
        helpText: "Include area code (at least 10 digits)."
      },
      {
        name: "dateOfBirth",
        label: "Date of Birth",
        type: "date",
        required: true,
        helpText: "Applicant must be at least 18 years of age."
      },
      {
        name: "taxId",
        label: "SSN / Federal Tax ID",
        type: "text",
        placeholder: "XXX-XX-XXXX",
        required: true,
        helpText: "9-digit Social Security or Tax Identification Number."
      }
    ]
  },
  {
    id: "employment",
    title: "2. Employment & Occupation",
    subtitle: "Current professional standing and tenure verification",
    fields: [
      {
        name: "employmentStatus",
        label: "Employment Classification",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select status..." },
          { value: "full_time", label: "Full-Time W-2 Employee" },
          { value: "self_employed", label: "Self-Employed / Principal Owner" },
          { value: "part_time", label: "Part-Time / Variable Hours" },
          { value: "retired", label: "Retired / Pensioned" },
          { value: "unemployed", label: "Currently Unemployed" }
        ],
        helpText: "Determines documentation required for income underwriting."
      },
      {
        name: "employerName",
        label: "Employer / Registered Business Name",
        type: "text",
        placeholder: "e.g., Infotact Financial Holdings LLC",
        required: false,
        helpText: "Required if Full-Time, Part-Time, or Self-Employed."
      },
      {
        name: "jobTitle",
        label: "Official Job Title / Role",
        type: "text",
        placeholder: "e.g., Senior Operations Director",
        required: false,
        helpText: "Your primary functional title."
      },
      {
        name: "yearsAtEmployer",
        label: "Tenure at Current Employer (Years)",
        type: "number",
        placeholder: "e.g., 4.5",
        min: 0,
        max: 70,
        step: "0.5",
        required: true,
        helpText: "Enter 0 if unemployed or recently transitioned."
      }
    ]
  },
  {
    id: "income",
    title: "3. Income & Compensation Breakdown",
    subtitle: "Detailed annualized earnings and verification methodology",
    fields: [
      {
        name: "annualIncome",
        label: "Adjusted Gross Annual Income (USD)",
        type: "number",
        placeholder: "e.g., 145000",
        min: 1,
        required: true,
        helpText: "Include base salary, guaranteed distributions, and taxable W-2 earnings before withholdings."
      },
      {
        name: "monthlyNetIncome",
        label: "Monthly Net Take-Home Pay (USD)",
        type: "number",
        placeholder: "e.g., 8800",
        min: 0,
        required: true,
        helpText: "Average post-tax monthly deposit across checking accounts."
      },
      {
        name: "additionalIncome",
        label: "Annual Bonus, Dividends & Secondary Income (USD)",
        type: "number",
        placeholder: "e.g., 15000",
        min: 0,
        required: false,
        helpText: "Optional non-base compensation averaged over the prior 24 months."
      },
      {
        name: "incomeVerificationType",
        label: "Primary Income Verification Method",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select verification method..." },
          { value: "w2_paystubs", label: "W-2 & Recent 60-Day Paystubs" },
          { value: "tax_returns_1040", label: "Federal Tax Returns (Form 1040 + Schedules)" },
          { value: "bank_statements", label: "12-Month Certified Bank Statements" },
          { value: "cpa_letter", label: "CPA Comfort Letter & P&L Statement" }
        ],
        helpText: "Must align with your employment classification."
      }
    ]
  },
  {
    id: "assets",
    title: "4. Liquid Assets & Capital Reserves",
    subtitle: "Verified cash equivalents, marketable securities, and equity",
    fields: [
      {
        name: "checkingSavingsBalance",
        label: "Total Checking & Savings Cash (USD)",
        type: "number",
        placeholder: "e.g., 42000",
        min: 0,
        required: true,
        helpText: "Immediately accessible depository balances."
      },
      {
        name: "investmentPortfolioValue",
        label: "Taxable Stocks, Bonds & Brokerage Value (USD)",
        type: "number",
        placeholder: "e.g., 85000",
        min: 0,
        required: false,
        helpText: "Exclude retirement-restricted accounts."
      },
      {
        name: "retirementAccountsValue",
        label: "401(k), IRA & Pension Reserves (USD)",
        type: "number",
        placeholder: "e.g., 160000",
        min: 0,
        required: false,
        helpText: "Vested balance eligible as long-term reserve."
      },
      {
        name: "realEstateMarketValue",
        label: "Owned Real Estate Estimated Market Value (USD)",
        type: "number",
        placeholder: "e.g., 450000",
        min: 0,
        required: false,
        helpText: "Gross market valuation prior to mortgage encumbrances."
      }
    ]
  },
  {
    id: "liabilities",
    title: "5. Liabilities & Debt Service Obligations",
    subtitle: "Recurring monthly commitments and revolving credit balances",
    fields: [
      {
        name: "monthlyHousingPayment",
        label: "Monthly Primary Mortgage or Rent (USD)",
        type: "number",
        placeholder: "e.g., 2650",
        min: 0,
        required: true,
        helpText: "Include PITI (Principal, Interest, Taxes, Insurance) or base lease."
      },
      {
        name: "totalCreditCardDebt",
        label: "Total Revolving Credit Card Balances (USD)",
        type: "number",
        placeholder: "e.g., 4800",
        min: 0,
        required: true,
        helpText: "Aggregate statement balances across all active cards."
      },
      {
        name: "autoAndStudentLoans",
        label: "Auto, Student & Installment Loan Balances (USD)",
        type: "number",
        placeholder: "e.g., 22500",
        min: 0,
        required: false,
        helpText: "Remaining principal on fixed-term consumer obligations."
      },
      {
        name: "monthlyDebtService",
        label: "Total Monthly Minimum Debt Obligations (USD)",
        type: "number",
        placeholder: "e.g., 750",
        min: 0,
        required: true,
        helpText: "Combined monthly minimums excluding primary housing payment."
      }
    ]
  }
];

export const ALL_FORM_FIELDS = FINANCIAL_FORM_SECTIONS.flatMap((section) =>
  section.fields.map((field) => ({ ...field, section: section.id }))
);

export function createInitialFormValues() {
  const initial = {};
  for (const field of ALL_FORM_FIELDS) {
    initial[field.name] = "";
  }
  return initial;
}

/**
 * Validates a single field against financial underwriting rules.
 * Returns an error string or null if valid.
 */
export function validateField(name, rawValue, allValues = {}) {
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  const fieldDef = ALL_FORM_FIELDS.find((f) => f.name === name);
  if (!fieldDef) return null;

  const isEmpty = value === "" || value === null || value === undefined;

  // Conditional requirements for employment fields
  const isEmployed = ["full_time", "self_employed", "part_time"].includes(
    allValues.employmentStatus
  );
  if ((name === "employerName" || name === "jobTitle") && isEmployed && isEmpty) {
    return `${fieldDef.label} is required for your selected employment status.`;
  }

  if (fieldDef.required && isEmpty) {
    return `${fieldDef.label} is required.`;
  }

  if (isEmpty) return null;

  switch (name) {
    case "fullName":
      if (value.length < 3 || !value.includes(" ")) {
        return "Please enter your full first and last legal name.";
      }
      break;

    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Please enter a valid email address (e.g. name@domain.com).";
      }
      break;

    case "phone": {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        return "Phone number must contain between 10 and 15 digits.";
      }
      break;
    }

    case "dateOfBirth": {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) {
        return "Please enter a valid date of birth.";
      }
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18 || age > 110) {
        return "Applicant must be between 18 and 110 years old.";
      }
      break;
    }

    case "taxId": {
      const digits = value.replace(/\D/g, "");
      if (digits.length !== 9) {
        return "SSN / Tax ID must contain exactly 9 digits (e.g. 123-45-6789).";
      }
      break;
    }

    case "annualIncome": {
      const num = Number(value);
      if (Number.isNaN(num) || num <= 0) {
        return "Gross Annual Income must be greater than $0.";
      }
      break;
    }

    case "monthlyNetIncome": {
      const num = Number(value);
      if (Number.isNaN(num) || num < 0) {
        return "Monthly Net Pay cannot be negative.";
      }
      const grossAnnual = Number(allValues.annualIncome);
      if (!Number.isNaN(grossAnnual) && grossAnnual > 0 && num * 12 > grossAnnual * 1.05) {
        return "Annualized net income cannot exceed gross annual income.";
      }
      break;
    }

    case "yearsAtEmployer": {
      const num = Number(value);
      if (Number.isNaN(num) || num < 0 || num > 70) {
        return "Tenure must be between 0 and 70 years.";
      }
      break;
    }

    default:
      if (fieldDef.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
          return `${fieldDef.label} must be a valid number.`;
        }
        if (fieldDef.min !== undefined && num < fieldDef.min) {
          return `${fieldDef.label} must be at least ${fieldDef.min}.`;
        }
        if (fieldDef.max !== undefined && num > fieldDef.max) {
          return `${fieldDef.label} cannot exceed ${fieldDef.max}.`;
        }
      }
      break;
  }

  return null;
}

/**
 * Validates the entire 21-field form.
 * Returns { isValid: boolean, errors: Record<string, string> }
 */
export function validateAllFields(values) {
  const errors = {};
  for (const field of ALL_FORM_FIELDS) {
    const err = validateField(field.name, values[field.name], values);
    if (err) {
      errors[field.name] = err;
    }
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

