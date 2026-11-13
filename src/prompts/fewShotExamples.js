export const FEW_SHOT_EXAMPLES = [
  {
    name: 'Loan Application',
    input: {
      formName: 'LoanApplication',
      fields: [
        { name: 'fullName', label: 'Applicant Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
        {
          name: 'employmentType',
          label: 'Employment Type',
          type: 'select',
          required: true,
          options: [
            { label: 'Salaried', value: 'salaried' },
            { label: 'Self-Employed', value: 'self_employed' },
            { label: 'Business Owner', value: 'business' }
          ]
        },
        { name: 'monthlyIncome', label: 'Monthly Income ($)', type: 'number', required: true },
        { name: 'loanAmount', label: 'Requested Loan Amount ($)', type: 'number', required: true },
        {
          name: 'loanPurpose',
          label: 'Loan Purpose',
          type: 'select',
          required: true,
          options: [
            { label: 'Home Purchase', value: 'home' },
            { label: 'Debt Consolidation', value: 'debt' },
            { label: 'Education', value: 'education' }
          ]
        },
        { name: 'address', label: 'Residential Address', type: 'text', required: true },
        { name: 'employmentDetails', label: 'Employer Details', type: 'text', required: false }
      ]
    },
    output: {
      componentName: 'LoanApplicationWizard',
      componentCode: `import React, { useState } from 'react';
import { Button, Input, Select, Card, StepProgress } from '@/design-system';

export default function LoanApplicationWizard({ onSubmit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    employmentType: '',
    monthlyIncome: '',
    loanAmount: '',
    loanPurpose: '',
    address: '',
    employmentDetails: ''
  });
  const [errors, setErrors] = useState({});

  const steps = [
    { id: 0, title: 'Personal Info' },
    { id: 1, title: 'Employment' },
    { id: 2, title: 'Loan Details' },
    { id: 3, title: 'Address & Review' }
  ];

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 0) {
      if (!formData.fullName) errs.fullName = 'Full Name is required';
      if (!formData.email) errs.email = 'Valid Email is required';
      if (!formData.phone) errs.phone = 'Phone number is required';
      if (!formData.dob) errs.dob = 'Date of birth is required';
    } else if (step === 1) {
      if (!formData.employmentType) errs.employmentType = 'Select employment type';
      if (!formData.monthlyIncome) errs.monthlyIncome = 'Monthly income is required';
    } else if (step === 2) {
      if (!formData.loanAmount) errs.loanAmount = 'Loan amount is required';
      if (!formData.loanPurpose) errs.loanPurpose = 'Loan purpose is required';
    } else if (step === 3) {
      if (!formData.address) errs.address = 'Address is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(3)) {
      if (onSubmit) onSubmit(formData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <StepProgress steps={steps} currentStep={currentStep} />
      
      {currentStep === 0 && (
        <Card title="Personal Information" description="Provide your personal contact credentials">
          <div className="space-y-4">
            <Input id="fullName" name="fullName" label="Full Name" value={formData.fullName} required error={errors.fullName} onChange={(e) => handleChange('fullName', e.target.value)} />
            <Input id="email" name="email" type="email" label="Email Address" value={formData.email} required error={errors.email} onChange={(e) => handleChange('email', e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="phone" name="phone" type="tel" label="Phone" value={formData.phone} required error={errors.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              <Input id="dob" name="dob" type="date" label="Date of Birth" value={formData.dob} required error={errors.dob} onChange={(e) => handleChange('dob', e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="Employment & Income" description="State your occupation and recurring monthly earnings">
          <div className="space-y-4">
            <Select id="employmentType" name="employmentType" label="Employment Type" value={formData.employmentType} options={[{ label: 'Salaried', value: 'salaried' }, { label: 'Self-Employed', value: 'self_employed' }, { label: 'Business Owner', value: 'business' }]} required error={errors.employmentType} onChange={(e) => handleChange('employmentType', e.target.value)} />
            <Input id="monthlyIncome" name="monthlyIncome" type="number" label="Monthly Income ($)" value={formData.monthlyIncome} required error={errors.monthlyIncome} onChange={(e) => handleChange('monthlyIncome', e.target.value)} />
            <Input id="employmentDetails" name="employmentDetails" label="Employer Details" value={formData.employmentDetails} helperText="Company name or nature of business" onChange={(e) => handleChange('employmentDetails', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card title="Loan Details" description="Select the desired loan amount and intended usage">
          <div className="space-y-4">
            <Input id="loanAmount" name="loanAmount" type="number" label="Loan Amount ($)" value={formData.loanAmount} required error={errors.loanAmount} onChange={(e) => handleChange('loanAmount', e.target.value)} />
            <Select id="loanPurpose" name="loanPurpose" label="Loan Purpose" value={formData.loanPurpose} options={[{ label: 'Home Purchase', value: 'home' }, { label: 'Debt Consolidation', value: 'debt' }, { label: 'Education', value: 'education' }]} required error={errors.loanPurpose} onChange={(e) => handleChange('loanPurpose', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card title="Address & Final Review" description="Verify your residence and confirm application details">
          <div className="space-y-4">
            <Input id="address" name="address" label="Residential Address" value={formData.address} required error={errors.address} onChange={(e) => handleChange('address', e.target.value)} />
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-1 border border-gray-200">
              <p><strong>Applicant:</strong> {formData.fullName || '-'}</p>
              <p><strong>Income:</strong> \${formData.monthlyIncome || '0'}/mo</p>
              <p><strong>Requested:</strong> \${formData.loanAmount || '0'} for {formData.loanPurpose || '-'}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center pt-4">
        {currentStep > 0 ? (
          <Button variant="outline" onClick={handlePrev}>Previous</Button>
        ) : <div />}
        {currentStep < steps.length - 1 ? (
          <Button variant="primary" onClick={handleNext}>Next Step</Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit}>Submit Application</Button>
        )}
      </div>
    </div>
  );
}`,
      steps: [
        { stepIndex: 0, title: 'Personal Info', description: 'Provide your personal contact credentials', fields: ['fullName', 'email', 'phone', 'dob'] },
        { stepIndex: 1, title: 'Employment', description: 'State your occupation and recurring monthly earnings', fields: ['employmentType', 'monthlyIncome', 'employmentDetails'] },
        { stepIndex: 2, title: 'Loan Details', description: 'Select the desired loan amount and intended usage', fields: ['loanAmount', 'loanPurpose'] },
        { stepIndex: 3, title: 'Address & Review', description: 'Verify your residence and confirm application details', fields: ['address'] }
      ],
      fieldMapping: {
        originalFieldCount: 10,
        mappedFieldCount: 10,
        fieldsByStep: {
          '0': ['fullName', 'email', 'phone', 'dob'],
          '1': ['employmentType', 'monthlyIncome', 'employmentDetails'],
          '2': ['loanAmount', 'loanPurpose'],
          '3': ['address']
        }
      },
      validationSummary: {
        isValid: true,
        hasAllRequiredFields: true,
        notes: 'All 10 fields preserved and logically segmented into 4 accessible steps.'
      }
    }
  },
  {
    name: 'KYC Verification',
    input: {
      formName: 'KYCVerification',
      fields: [
        { name: 'fullName', label: 'Full Legal Name', type: 'text', required: true },
        { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Mobile Number', type: 'tel', required: true },
        { name: 'residentialAddress', label: 'Residential Address', type: 'text', required: true },
        {
          name: 'idType',
          label: 'Identification Document Type',
          type: 'select',
          required: true,
          options: [
            { label: 'Passport', value: 'passport' },
            { label: 'Driving License', value: 'license' },
            { label: 'National ID Card', value: 'national_id' }
          ]
        },
        { name: 'idNumber', label: 'ID Document Number', type: 'text', required: true },
        {
          name: 'verificationStatus',
          label: 'PEP / Sanction Status Declaration',
          type: 'select',
          required: true,
          options: [
            { label: 'No exposure (Standard Citizen)', value: 'standard' },
            { label: 'Politically Exposed Person (PEP)', value: 'pep' }
          ]
        }
      ]
    },
    output: {
      componentName: 'KYCVerificationWizard',
      componentCode: `import React, { useState } from 'react';
import { Button, Input, Select, Card, StepProgress } from '@/design-system';

export default function KYCVerificationWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    email: '',
    phone: '',
    residentialAddress: '',
    idType: '',
    idNumber: '',
    verificationStatus: 'standard'
  });
  const [errors, setErrors] = useState({});

  const steps = [
    { id: 0, title: 'Personal Info' },
    { id: 1, title: 'Contact Details' },
    { id: 2, title: 'Identity Info' },
    { id: 3, title: 'Review' }
  ];

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 0) {
      if (!formData.fullName) errs.fullName = 'Full legal name is required';
      if (!formData.dob) errs.dob = 'Date of birth is required';
    } else if (step === 1) {
      if (!formData.email) errs.email = 'Email address is required';
      if (!formData.phone) errs.phone = 'Mobile number is required';
      if (!formData.residentialAddress) errs.residentialAddress = 'Residential address is required';
    } else if (step === 2) {
      if (!formData.idType) errs.idType = 'Select ID document type';
      if (!formData.idNumber) errs.idNumber = 'Document number is required';
      if (!formData.verificationStatus) errs.verificationStatus = 'Declaration is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onComplete) onComplete(formData);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <StepProgress steps={steps} currentStep={currentStep} />

      {currentStep === 0 && (
        <Card title="Personal Information" description="Legal identification as stated on official documents">
          <div className="space-y-4">
            <Input id="fullName" name="fullName" label="Full Legal Name" value={formData.fullName} required error={errors.fullName} onChange={(e) => handleChange('fullName', e.target.value)} />
            <Input id="dob" name="dob" type="date" label="Date of Birth" value={formData.dob} required error={errors.dob} onChange={(e) => handleChange('dob', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="Contact & Address" description="Current address and reachable contact information">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="email" name="email" type="email" label="Email Address" value={formData.email} required error={errors.email} onChange={(e) => handleChange('email', e.target.value)} />
              <Input id="phone" name="phone" type="tel" label="Mobile Number" value={formData.phone} required error={errors.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
            <Input id="residentialAddress" name="residentialAddress" label="Residential Address" value={formData.residentialAddress} required error={errors.residentialAddress} onChange={(e) => handleChange('residentialAddress', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card title="Identity Document" description="Official government identification particulars">
          <div className="space-y-4">
            <Select id="idType" name="idType" label="Identification Type" value={formData.idType} options={[{ label: 'Passport', value: 'passport' }, { label: 'Driving License', value: 'license' }, { label: 'National ID Card', value: 'national_id' }]} required error={errors.idType} onChange={(e) => handleChange('idType', e.target.value)} />
            <Input id="idNumber" name="idNumber" label="ID Number" value={formData.idNumber} required error={errors.idNumber} onChange={(e) => handleChange('idNumber', e.target.value)} />
            <Select id="verificationStatus" name="verificationStatus" label="Sanction / PEP Declaration" value={formData.verificationStatus} options={[{ label: 'No exposure (Standard Citizen)', value: 'standard' }, { label: 'Politically Exposed Person (PEP)', value: 'pep' }]} required error={errors.verificationStatus} onChange={(e) => handleChange('verificationStatus', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card title="Review & Confirm" description="Please verify your submission before KYC verification starts">
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2 border border-gray-200">
            <p><strong>Name:</strong> {formData.fullName}</p>
            <p><strong>DOB:</strong> {formData.dob}</p>
            <p><strong>Contact:</strong> {formData.email} | {formData.phone}</p>
            <p><strong>Document:</strong> {formData.idType} ({formData.idNumber})</p>
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center pt-4">
        {currentStep > 0 ? <Button variant="outline" onClick={handlePrev}>Previous</Button> : <div />}
        {currentStep < 3 ? <Button variant="primary" onClick={handleNext}>Next Step</Button> : <Button variant="primary" onClick={handleSubmit}>Complete Verification</Button>}
      </div>
    </div>
  );
}`,
      steps: [
        { stepIndex: 0, title: 'Personal Info', description: 'Legal identification as stated on official documents', fields: ['fullName', 'dob'] },
        { stepIndex: 1, title: 'Contact Details', description: 'Current address and reachable contact information', fields: ['email', 'phone', 'residentialAddress'] },
        { stepIndex: 2, title: 'Identity Info', description: 'Official government identification particulars', fields: ['idType', 'idNumber', 'verificationStatus'] },
        { stepIndex: 3, title: 'Review', description: 'Please verify your submission before KYC verification starts', fields: [] }
      ],
      fieldMapping: {
        originalFieldCount: 8,
        mappedFieldCount: 8,
        fieldsByStep: {
          '0': ['fullName', 'dob'],
          '1': ['email', 'phone', 'residentialAddress'],
          '2': ['idType', 'idNumber', 'verificationStatus'],
          '3': []
        }
      },
      validationSummary: {
        isValid: true,
        hasAllRequiredFields: true,
        notes: 'KYC fields successfully mapped into 4 structured stages.'
      }
    }
  },
  {
    name: 'Tax Filing',
    input: {
      formName: 'TaxFiling',
      fields: [
        { name: 'taxpayerName', label: 'Taxpayer Full Name', type: 'text', required: true },
        { name: 'panNumber', label: 'PAN Number', type: 'text', required: true },
        {
          name: 'financialYear',
          label: 'Financial Year',
          type: 'select',
          required: true,
          options: [
            { label: '2025-2026', value: '2025-26' },
            { label: '2024-2025', value: '2024-25' }
          ]
        },
        { name: 'employmentIncome', label: 'Income from Salary ($)', type: 'number', required: true },
        { name: 'otherIncome', label: 'Income from Other Sources ($)', type: 'number', required: false },
        { name: 'deductions', label: 'Eligible Tax Deductions ($)', type: 'number', required: false },
        { name: 'taxPaid', label: 'TDS / Advance Tax Paid ($)', type: 'number', required: true },
        { name: 'bankAccount', label: 'Refund Bank Account Number', type: 'text', required: true },
        {
          name: 'declaration',
          label: 'Accuracy Declaration',
          type: 'select',
          required: true,
          options: [
            { label: 'I declare that the information provided is accurate and complete', value: 'accepted' }
          ]
        }
      ]
    },
    output: {
      componentName: 'TaxFilingWizard',
      componentCode: `import React, { useState } from 'react';
import { Button, Input, Select, Card, StepProgress } from '@/design-system';

export default function TaxFilingWizard({ onFileReturn }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    taxpayerName: '',
    panNumber: '',
    financialYear: '2025-26',
    employmentIncome: '',
    otherIncome: '0',
    deductions: '0',
    taxPaid: '',
    bankAccount: '',
    declaration: ''
  });
  const [errors, setErrors] = useState({});

  const steps = [
    { id: 0, title: 'Taxpayer Info' },
    { id: 1, title: 'Income Details' },
    { id: 2, title: 'Deductions & Tax' },
    { id: 3, title: 'Bank & Review' }
  ];

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 0) {
      if (!formData.taxpayerName) errs.taxpayerName = 'Taxpayer Name is required';
      if (!formData.panNumber) errs.panNumber = 'PAN Number is required';
      if (!formData.financialYear) errs.financialYear = 'Financial Year is required';
    } else if (step === 1) {
      if (!formData.employmentIncome) errs.employmentIncome = 'Employment income is required';
    } else if (step === 2) {
      if (!formData.taxPaid) errs.taxPaid = 'Tax paid is required';
    } else if (step === 3) {
      if (!formData.bankAccount) errs.bankAccount = 'Bank account number is required';
      if (formData.declaration !== 'accepted') errs.declaration = 'You must accept the declaration';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(3)) {
      if (onFileReturn) onFileReturn(formData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <StepProgress steps={steps} currentStep={currentStep} />

      {currentStep === 0 && (
        <Card title="Taxpayer Information" description="Identity and applicable tax assessment period">
          <div className="space-y-4">
            <Input id="taxpayerName" name="taxpayerName" label="Taxpayer Full Name" value={formData.taxpayerName} required error={errors.taxpayerName} onChange={(e) => handleChange('taxpayerName', e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input id="panNumber" name="panNumber" label="PAN Number" value={formData.panNumber} required error={errors.panNumber} onChange={(e) => handleChange('panNumber', e.target.value)} />
              <Select id="financialYear" name="financialYear" label="Financial Year" value={formData.financialYear} options={[{ label: '2025-2026', value: '2025-26' }, { label: '2024-2025', value: '2024-25' }]} required error={errors.financialYear} onChange={(e) => handleChange('financialYear', e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="Income Details" description="Disclose all taxable streams earned during the assessment year">
          <div className="space-y-4">
            <Input id="employmentIncome" name="employmentIncome" type="number" label="Income from Salary ($)" value={formData.employmentIncome} required error={errors.employmentIncome} onChange={(e) => handleChange('employmentIncome', e.target.value)} />
            <Input id="otherIncome" name="otherIncome" type="number" label="Income from Other Sources ($)" value={formData.otherIncome} helperText="Interest, capital gains, or dividends" onChange={(e) => handleChange('otherIncome', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card title="Deductions and Tax" description="Eligible exemptions and taxes already remitted">
          <div className="space-y-4">
            <Input id="deductions" name="deductions" type="number" label="Eligible Tax Deductions ($)" value={formData.deductions} helperText="Retirement, insurance, and medical exemptions" onChange={(e) => handleChange('deductions', e.target.value)} />
            <Input id="taxPaid" name="taxPaid" type="number" label="TDS / Advance Tax Paid ($)" value={formData.taxPaid} required error={errors.taxPaid} onChange={(e) => handleChange('taxPaid', e.target.value)} />
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card title="Bank Account & Review" description="Provide refund remittance coordinates and declare accuracy">
          <div className="space-y-4">
            <Input id="bankAccount" name="bankAccount" label="Bank Account Number" value={formData.bankAccount} required error={errors.bankAccount} onChange={(e) => handleChange('bankAccount', e.target.value)} />
            <Select id="declaration" name="declaration" label="Declaration of Accuracy" value={formData.declaration} options={[{ label: 'I declare that the information provided is accurate and complete', value: 'accepted' }]} required error={errors.declaration} onChange={(e) => handleChange('declaration', e.target.value)} />
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center pt-4">
        {currentStep > 0 ? <Button variant="outline" onClick={handlePrev}>Previous</Button> : <div />}
        {currentStep < 3 ? <Button variant="primary" onClick={handleNext}>Next Step</Button> : <Button variant="primary" onClick={handleSubmit}>Submit Tax Return</Button>}
      </div>
    </div>
  );
}`,
      steps: [
        { stepIndex: 0, title: 'Taxpayer Info', description: 'Identity and applicable tax assessment period', fields: ['taxpayerName', 'panNumber', 'financialYear'] },
        { stepIndex: 1, title: 'Income Details', description: 'Disclose all taxable streams earned during the assessment year', fields: ['employmentIncome', 'otherIncome'] },
        { stepIndex: 2, title: 'Deductions & Tax', description: 'Eligible exemptions and taxes already remitted', fields: ['deductions', 'taxPaid'] },
        { stepIndex: 3, title: 'Bank & Review', description: 'Provide refund remittance coordinates and declare accuracy', fields: ['bankAccount', 'declaration'] }
      ],
      fieldMapping: {
        originalFieldCount: 9,
        mappedFieldCount: 9,
        fieldsByStep: {
          '0': ['taxpayerName', 'panNumber', 'financialYear'],
          '1': ['employmentIncome', 'otherIncome'],
          '2': ['deductions', 'taxPaid'],
          '3': ['bankAccount', 'declaration']
        }
      },
      validationSummary: {
        isValid: true,
        hasAllRequiredFields: true,
        notes: 'Tax filing form cleanly grouped into 4 progressive steps with full field preservation.'
      }
    }
  }
];

export default FEW_SHOT_EXAMPLES;
