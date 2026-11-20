import { DEFAULT_FORM_FIELDS } from "../src/config/constants.js";

export function field(name, props = {}) {
  return { name, label: name, type: "text", required: true, ...props };
}

const manyFields = Array.from({ length: 40 }, (_, index) => field(`field${index + 1}`, {
  section: `group${Math.floor(index / 8) + 1}`
}));
const splitFields = Array.from({ length: 10 }, (_, index) => field(`item${index + 1}`));

export const scenarios = [
  {
    name: "single-field contact form",
    fields: [field("email", { label: "Email address", type: "email" })],
    groups: [["email"]]
  },
  {
    name: "delivery address with labeled choices and an optional phone",
    fields: [
      field("street", { section: "delivery" }),
      field("region", { type: "select", section: "delivery", options: [{ value: "north", label: "North" }] }),
      field("phone", { type: "tel", required: false, section: "contact" })
    ],
    groups: [["street", "region"], ["phone"]]
  },
  {
    name: "bundled financial application across its five sections",
    fields: undefined,
    activeField: "annualIncome",
    groups: [
      ["fullName", "email", "phone", "dateOfBirth", "taxId"],
      ["employmentStatus", "employerName", "jobTitle", "yearsAtEmployer"],
      ["annualIncome", "monthlyNetIncome", "additionalIncome", "incomeVerificationType"],
      ["checkingSavingsBalance", "investmentPortfolioValue", "retirementAccountsValue", "realEstateMarketValue"],
      ["monthlyHousingPayment", "totalCreditCardDebt", "autoAndStudentLoans", "monthlyDebtService"]
    ],
    demoFields: DEFAULT_FORM_FIELDS
  },
  {
    name: "event registration with a required consent checkbox",
    fields: [
      field("attendeeName"), field("terms", { type: "checkbox" }),
      field("newsletter", { type: "checkbox", required: false })
    ],
    groups: [["attendeeName", "terms", "newsletter"]]
  },
  {
    name: "account recovery with optional secondary contact",
    fields: [
      field("account", { section: "account" }),
      field("recoveryEmail", { type: "email", section: "recovery" }),
      field("alternatePhone", { type: "tel", section: "recovery", required: false, helpText: "Include country code." })
    ],
    groups: [["account"], ["recoveryEmail", "alternatePhone"]]
  },
  {
    name: "date window with inclusive calendar bounds",
    fields: [field("startDate", { type: "date", min: "2024-02-29", max: "2027-01-01" })],
    groups: [["startDate"]]
  },
  {
    name: "quantity and reference fields with numeric and length validation",
    fields: [
      field("quantity", { type: "number", min: 0, validation: { max: 100, step: "0.5" } }),
      field("reference", { validation: { minLength: 2, maxLength: 8 }, placeholder: "Reference code" })
    ],
    groups: [["quantity", "reference"]]
  },
  {
    name: "unsectioned form split before the eight-field step limit",
    fields: splitFields,
    groups: [["item1", "item2", "item3", "item4", "item5"], ["item6", "item7", "item8", "item9", "item10"]],
    offlineGroups: [splitFields.slice(0, 8).map(({ name }) => name), ["item9", "item10"]]
  },
  {
    name: "legacy string options and omitted required flag",
    fields: [{ name: "plan", label: "Plan", type: "select", options: ["Basic", "Plus"] }],
    groups: [["plan"]]
  },
  {
    name: "maximum supported form size",
    fields: manyFields,
    groups: Array.from({ length: 5 }, (_, index) =>
      manyFields.slice(index * 8, (index + 1) * 8).map(({ name }) => name))
  }
];
