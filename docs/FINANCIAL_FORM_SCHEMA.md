# Commercial Credit & Wealth Disclosure 21-Field Form Schema

**Author:** Raksha R. (Senior Frontend Lead)  
**File:** `frontend/src/data/financialFormSchema.js`

---

## Section Breakdown & Field Matrix

### 1. Personal Identity (5 Fields)
- `fullName`: Full Legal Name (Text, Required)
- `email`: Email Address (Email, Required)
- `phone`: Contact Phone Number (Tel, Required)
- `dateOfBirth`: Date of Birth (Date, Required)
- `taxId`: SSN / Tax Identification Number (Text, Required)

### 2. Employment History (4 Fields)
- `employmentStatus`: Employment Status (Select: Employed, Self-Employed, Retired)
- `employerName`: Current Employer / Organization (Text)
- `jobTitle`: Professional Role / Title (Text)
- `yearsAtEmployer`: Tenure at Organization (Number, Required)

### 3. Income Disclosure (4 Fields)
- `annualIncome`: Gross Annual Income ($) (Number, Required)
- `monthlyNetIncome`: Monthly Net Take-Home Pay ($) (Number, Required)
- `additionalIncome`: Dividends, Bonus or Other Income ($) (Number)
- `incomeVerificationType`: Income Verification Method (Select, Required)

### 4. Liquid & Fixed Assets (4 Fields)
- `checkingSavingsBalance`: Checking & Savings Balances ($) (Number, Required)
- `investmentPortfolioValue`: Brokerage & Investment Portfolio ($) (Number)
- `retirementAccountsValue`: 401(k) / IRA Retirement Assets ($) (Number)
- `realEstateMarketValue`: Total Real Estate Property Market Value ($) (Number)

### 5. Liabilities & Debt Obligations (4 Fields)
- `monthlyHousingPayment`: Monthly Mortgage or Rent ($) (Number, Required)
- `totalCreditCardDebt`: Total Outstanding Revolving Credit Balances ($) (Number, Required)
- `autoLoanBalance`: Auto Loan Balances ($) (Number)
- `studentLoanBalance`: Student Loan Balances ($) (Number)
