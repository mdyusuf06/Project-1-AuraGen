import "dotenv/config";

export const WS_PORT = Number(process.env.WS_PORT || 8080);
export const COGNITIVE_LOAD_THRESHOLD = Number(process.env.COGNITIVE_LOAD_THRESHOLD || 70);
export const GENERATION_COOLDOWN_MS = Number(process.env.GENERATION_COOLDOWN_MS || 3000);
export const USE_TEAMMATE_CODEGEN = process.env.USE_TEAMMATE_CODEGEN === "true";

/**
 * Default financial form schema used when telemetry does not embed full formFields.
 * Matches the 5-section, 21-field demo form in /frontend.
 */
export const DEFAULT_FORM_FIELDS = [
  // Section 1: Personal
  { name: "fullName", label: "Full Legal Name", section: "personal", type: "text", required: true },
  { name: "email", label: "Email Address", section: "personal", type: "email", required: true },
  { name: "phone", label: "Phone Number", section: "personal", type: "tel", required: true },
  { name: "dateOfBirth", label: "Date of Birth", section: "personal", type: "date", required: true },
  { name: "taxId", label: "SSN / Tax ID", section: "personal", type: "text", required: true },

  // Section 2: Employment
  { name: "employmentStatus", label: "Employment Status", section: "employment", type: "select", required: true },
  { name: "employerName", label: "Employer / Business Name", section: "employment", type: "text", required: false },
  { name: "jobTitle", label: "Job Title / Role", section: "employment", type: "text", required: false },
  { name: "yearsAtEmployer", label: "Years at Current Employer", section: "employment", type: "number", required: true },

  // Section 3: Income
  { name: "annualIncome", label: "Gross Annual Income ($)", section: "income", type: "number", required: true },
  { name: "monthlyNetIncome", label: "Monthly Net Take-Home Pay ($)", section: "income", type: "number", required: true },
  { name: "additionalIncome", label: "Annual Bonus / Dividends / Other Income ($)", section: "income", type: "number", required: false },
  { name: "incomeVerificationType", label: "Primary Income Verification Type", section: "income", type: "select", required: true },

  // Section 4: Assets
  { name: "checkingSavingsBalance", label: "Checking & Savings Balance ($)", section: "assets", type: "number", required: true },
  { name: "investmentPortfolioValue", label: "Stocks, Bonds & Brokerage Value ($)", section: "assets", type: "number", required: false },
  { name: "retirementAccountsValue", label: "401(k) / IRA Retirement Balance ($)", section: "assets", type: "number", required: false },
  { name: "realEstateMarketValue", label: "Owned Real Estate Market Value ($)", section: "assets", type: "number", required: false },

  // Section 5: Liabilities
  { name: "monthlyHousingPayment", label: "Monthly Mortgage / Rent Payment ($)", section: "liabilities", type: "number", required: true },
  { name: "totalCreditCardDebt", label: "Total Credit Card Balances ($)", section: "liabilities", type: "number", required: true },
  { name: "autoAndStudentLoans", label: "Auto & Student Loan Balances ($)", section: "liabilities", type: "number", required: false },
  { name: "monthlyDebtService", label: "Total Monthly Debt Obligations ($)", section: "liabilities", type: "number", required: true }
];

