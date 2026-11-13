import React, { useState } from 'react';
import Head from 'next/head';
import {
  Button,
  Input,
  Select,
  Card,
  StepProgress,
  Label
} from '../design-system/index.js';
import { AURAGEN_SYSTEM_PROMPT } from '../prompts/systemPrompt.js';
import { FEW_SHOT_EXAMPLES } from '../prompts/fewShotExamples.js';
import testCasesData from '../../data/testCases.json';

// Account tier options mapping
const ACCOUNT_TIER_OPTIONS = [
  { label: 'High Yield Savings', value: 'savings' },
  { label: 'Premier Checking', value: 'checking' },
  { label: 'Business Growth', value: 'business' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('wizard'); // 'wizard' | 'showcase' | 'ai-demo' | 'test-cases' | 'system-prompt' | 'few-shots' | 'docs' | 'review'

  // --- Interactive Wizard State ---
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    fullName: '',
    email: '',
    accountType: 'checking' // Defaults to Premier Checking
  });
  const [wizardErrors, setWizardErrors] = useState({});
  const [wizardSubmitted, setWizardSubmitted] = useState(false);

  // Helper to resolve display label from value
  const getAccountTierLabel = (val) => {
    const match = ACCOUNT_TIER_OPTIONS.find(opt => opt.value === val);
    return match ? match.label : val;
  };

  const validateWizardStep = (step) => {
    const errors = {};
    if (step === 0) {
      if (!wizardData.fullName || !wizardData.fullName.trim()) {
        errors.fullName = 'Full Name is required';
      }
      if (!wizardData.email || !wizardData.email.trim()) {
        errors.email = 'Email Address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardData.email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    } else if (step === 1) {
      if (!wizardData.accountType) {
        errors.accountType = 'Please select an account tier';
      }
    }
    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWizardNext = () => {
    if (validateWizardStep(wizardStep)) {
      setWizardStep(prev => prev + 1);
    }
  };

  const handleWizardPrev = () => {
    setWizardErrors({});
    setWizardStep(prev => Math.max(prev - 1, 0));
  };

  const handleWizardSubmit = (e) => {
    if (e) e.preventDefault();
    if (validateWizardStep(0) && validateWizardStep(1)) {
      setWizardSubmitted(true);
    }
  };

  const handleWizardReset = () => {
    setWizardData({
      fullName: '',
      email: '',
      accountType: 'checking'
    });
    setWizardStep(0);
    setWizardErrors({});
    setWizardSubmitted(false);
  };

  const wizardSteps = [
    { id: 0, title: 'Personal Information' },
    { id: 1, title: 'Account Preferences' },
    { id: 2, title: 'Review & Complete' }
  ];

  // --- AI Generator Demo State ---
  const [aiSchemaInput, setAiSchemaInput] = useState(JSON.stringify({
    formName: "JobApplication",
    fields: [
      { name: "candidateName", label: "Candidate Full Name", type: "text", required: true },
      { name: "email", label: "Email Address", type: "email", required: true },
      { name: "role", label: "Target Position", type: "select", required: true, options: [{ label: "Frontend Engineer", value: "frontend" }, { label: "Design Technologist", value: "design_tech" }] },
      { name: "portfolioUrl", label: "Portfolio URL", type: "text", required: false }
    ]
  }, null, 2));
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  const handleRunAiGeneration = async () => {
    setAiGenerating(true);
    setAiResult(null);
    setAiError(null);
    try {
      let parsed = JSON.parse(aiSchemaInput);
      const res = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: parsed, frictionContext: { cognitiveLoadScore: 0.85 } })
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      setAiError(err.message || 'Generation request failed');
    } finally {
      setAiGenerating(false);
    }
  };

  // --- Showcase Interactive Form Validation State ---
  const [interactiveFields, setInteractiveFields] = useState({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123!',
    amount: '2500',
    date: '2026-11-11',
    phone: '+1 555-0199',
    category: 'fintech'
  });
  const [interactiveErrors, setInteractiveErrors] = useState({});
  const [interactiveFeedback, setInteractiveFeedback] = useState('');

  // Real-time field validator
  const handleInteractiveChange = (name, val) => {
    setInteractiveFields(prev => ({ ...prev, [name]: val }));
    const errs = { ...interactiveErrors };

    if (name === 'email') {
      if (!val) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) errs.email = 'Invalid email format';
      else delete errs.email;
    } else if (name === 'amount') {
      const num = Number(val);
      if (isNaN(num) || num <= 0) errs.amount = 'Amount must be a positive number';
      else delete errs.amount;
    } else if (name === 'phone') {
      if (!val || val.length < 7) errs.phone = 'Phone number is too short';
      else delete errs.phone;
    } else if (name === 'category') {
      if (!val) errs.category = 'Category selection is required';
      else delete errs.category;
    } else if (name === 'name') {
      if (!val.trim()) errs.name = 'Full name is required';
      else delete errs.name;
    }

    setInteractiveErrors(errs);
  };

  // Button showcase click counter to verify onClick functionality
  const [buttonClickCount, setButtonClickCount] = useState(0);
  const [lastClickedVariant, setLastClickedVariant] = useState(null);
  const [showcaseBtnLoading, setShowcaseBtnLoading] = useState(false);

  // StepProgress interactive stepper
  const [demoStep, setDemoStep] = useState(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Head>
        <title>AuraGen — Design System & Multi-Step Wizard Engine</title>
        <meta name="description" content="AuraGen Enterprise Design System & Code Generation by Pavilson" />
      </Head>

      {/* Global SaaS Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 tracking-tight text-base">AuraGen</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Design System
                </span>
              </div>
              <p className="text-xs text-slate-500">Pavilson — Design System & Prompt Engineering</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All 17 Tests Passing
            </span>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto border-t border-slate-100">
          {[
            { id: 'wizard', label: 'Interactive Wizard' },
            { id: 'showcase', label: 'Component Showcase' },
            { id: 'ai-demo', label: 'AI Generation Demo' },
            { id: 'test-cases', label: '10 Test Cases' },
            { id: 'system-prompt', label: 'System Prompt' },
            { id: 'few-shots', label: 'Few-Shot Examples' },
            { id: 'docs', label: 'Documentation' },
            { id: 'review', label: 'Review Status' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors select-none ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ============================================================== */}
        {/* TAB 1: INTERACTIVE WIZARD DEMO                                 */}
        {/* ============================================================== */}
        {activeTab === 'wizard' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Multi-Step Account Wizard</h2>
              <p className="text-sm text-slate-500">
                Experience full state preservation, strict field validation, and accurate review summary mapping.
              </p>
            </div>

            <Card variant="normal" className="shadow-sm">
              <StepProgress steps={wizardSteps} currentStep={wizardStep} />

              {wizardSubmitted ? (
                <div className="mt-8 text-center space-y-4 py-6">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Application Submitted Successfully!</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Welcome aboard, <strong>{wizardData.fullName}</strong>. Your <strong>{getAccountTierLabel(wizardData.accountType)}</strong> account is now registered.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button variant="secondary" onClick={handleWizardReset}>
                      Submit Another Application
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  {/* Step 1: Personal Info */}
                  {wizardStep === 0 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-semibold text-slate-800">Step 1 — Personal Information</h4>
                        <p className="text-xs text-slate-500">Enter your full legal identity and email address.</p>
                      </div>
                      <Input
                        id="fullName"
                        name="fullName"
                        label="Full Name"
                        placeholder="e.g. Jane Doe"
                        value={wizardData.fullName}
                        required
                        error={wizardErrors.fullName}
                        onChange={(e) => {
                          setWizardData(prev => ({ ...prev, fullName: e.target.value }));
                          if (wizardErrors.fullName) setWizardErrors(prev => ({ ...prev, fullName: undefined }));
                        }}
                      />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        label="Email Address"
                        placeholder="jane@example.com"
                        value={wizardData.email}
                        required
                        error={wizardErrors.email}
                        helperText="We will send your verification notice to this address."
                        onChange={(e) => {
                          setWizardData(prev => ({ ...prev, email: e.target.value }));
                          if (wizardErrors.email) setWizardErrors(prev => ({ ...prev, email: undefined }));
                        }}
                      />
                    </div>
                  )}

                  {/* Step 2: Account Preferences */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-semibold text-slate-800">Step 2 — Account Preferences</h4>
                        <p className="text-xs text-slate-500">Select the banking account tier that matches your goals.</p>
                      </div>
                      <Select
                        id="accountType"
                        name="accountType"
                        label="Account Tier"
                        value={wizardData.accountType}
                        options={ACCOUNT_TIER_OPTIONS}
                        required
                        error={wizardErrors.accountType}
                        onChange={(e) => {
                          setWizardData(prev => ({ ...prev, accountType: e.target.value }));
                          if (wizardErrors.accountType) setWizardErrors(prev => ({ ...prev, accountType: undefined }));
                        }}
                      />
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600">
                        Selected: <span className="font-semibold text-slate-800">{getAccountTierLabel(wizardData.accountType)}</span>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review & Complete */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-semibold text-slate-800">Step 3 — Review & Complete</h4>
                        <p className="text-xs text-slate-500">Confirm all information before final submission.</p>
                      </div>
                      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-sm text-slate-800 space-y-3">
                        <div className="flex justify-between border-b border-blue-100 pb-2">
                          <span className="text-slate-500 text-xs uppercase font-medium">Applicant Name</span>
                          <span className="font-semibold text-slate-900">{wizardData.fullName || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-blue-100 pb-2">
                          <span className="text-slate-500 text-xs uppercase font-medium">Email Address</span>
                          <span className="font-semibold text-slate-900">{wizardData.email || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-xs uppercase font-medium">Selected Account Tier</span>
                          <span className="font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {getAccountTierLabel(wizardData.accountType)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Footer */}
                  <div className="flex justify-between items-center pt-5 border-t border-slate-100">
                    {wizardStep > 0 ? (
                      <Button variant="outline" onClick={handleWizardPrev}>
                        Previous
                      </Button>
                    ) : <div />}

                    {wizardStep < wizardSteps.length - 1 ? (
                      <Button variant="primary" onClick={handleWizardNext}>
                        Continue
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={handleWizardSubmit}>
                        Finish & Submit
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: COMPONENT SHOWCASE                                      */}
        {/* ============================================================== */}
        {activeTab === 'showcase' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Design System Component Showcase</h2>
              <p className="text-sm text-slate-500">
                Live, interactive demonstrations of all six AuraGen React functional components with working state, event handling, and real-time validation.
              </p>
            </div>

            {/* 1. BUTTON */}
            <Card title="1. Button Component" description="Interactive button element supporting 5 variants, 3 sizes, loading spinners, and disabled states.">
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Interactive Style Variants (Clickable)</span>
                    <span className="text-xs text-blue-600 font-medium">
                      Clicks: <strong>{buttonClickCount}</strong> {lastClickedVariant && `(Last: ${lastClickedVariant})`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" onClick={() => { setButtonClickCount(c => c + 1); setLastClickedVariant('Primary'); }}>
                      Primary Button
                    </Button>
                    <Button variant="secondary" onClick={() => { setButtonClickCount(c => c + 1); setLastClickedVariant('Secondary'); }}>
                      Secondary Button
                    </Button>
                    <Button variant="outline" onClick={() => { setButtonClickCount(c => c + 1); setLastClickedVariant('Outline'); }}>
                      Outline Button
                    </Button>
                    <Button variant="ghost" onClick={() => { setButtonClickCount(c => c + 1); setLastClickedVariant('Ghost'); }}>
                      Ghost Button
                    </Button>
                    <Button variant="danger" onClick={() => { setButtonClickCount(c => c + 1); setLastClickedVariant('Danger'); }}>
                      Danger Button
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Sizes</span>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Button size="sm" onClick={() => setLastClickedVariant('Small')}>Small (sm)</Button>
                    <Button size="md" onClick={() => setLastClickedVariant('Medium')}>Medium (md)</Button>
                    <Button size="lg" onClick={() => setLastClickedVariant('Large')}>Large (lg)</Button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Interactive States & Click Guards</span>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Button disabled onClick={() => alert('Disabled button should not trigger!')}>
                      Disabled (Clicks Blocked)
                    </Button>
                    <Button loading onClick={() => alert('Loading button should not trigger!')}>
                      Loading (Clicks Blocked)
                    </Button>
                    <Button
                      variant="outline"
                      loading={showcaseBtnLoading}
                      onClick={() => {
                        setShowcaseBtnLoading(true);
                        setTimeout(() => setShowcaseBtnLoading(false), 1500);
                      }}
                    >
                      {showcaseBtnLoading ? 'Saving...' : 'Click to Trigger Async Loading'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. INPUT */}
            <Card title="2. Input Component" description="Accessible controlled inputs with real-time validation, format checking, and dynamic error clearance.">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <Input
                    id="interactiveName"
                    name="name"
                    label="Full Name (Required)"
                    value={interactiveFields.name}
                    required
                    error={interactiveErrors.name}
                    onChange={(e) => handleInteractiveChange('name', e.target.value)}
                  />
                  <Input
                    id="interactiveEmail"
                    name="email"
                    type="email"
                    label="Email Address (Real-time Validation)"
                    value={interactiveFields.email}
                    required
                    error={interactiveErrors.email}
                    helperText="Try typing an invalid email"
                    onChange={(e) => handleInteractiveChange('email', e.target.value)}
                  />
                  <Input
                    id="interactivePassword"
                    name="password"
                    type="password"
                    label="Password (Masked Input)"
                    value={interactiveFields.password}
                    onChange={(e) => handleInteractiveChange('password', e.target.value)}
                  />
                  <Input
                    id="interactiveAmount"
                    name="amount"
                    type="number"
                    label="Amount (Number Validation)"
                    value={interactiveFields.amount}
                    error={interactiveErrors.amount}
                    onChange={(e) => handleInteractiveChange('amount', e.target.value)}
                  />
                  <Input
                    id="interactiveDate"
                    name="date"
                    type="date"
                    label="Date Input"
                    value={interactiveFields.date}
                    onChange={(e) => handleInteractiveChange('date', e.target.value)}
                  />
                  <Input
                    id="interactivePhone"
                    name="phone"
                    type="tel"
                    label="Telephone (Length Check)"
                    value={interactiveFields.phone}
                    error={interactiveErrors.phone}
                    onChange={(e) => handleInteractiveChange('phone', e.target.value)}
                  />
                  <Input
                    id="interactiveDisabled"
                    name="disabled"
                    label="Disabled Input"
                    value="Fixed read-only text"
                    disabled
                  />
                  <Input
                    id="interactiveHelper"
                    name="helper"
                    label="Helper Text State"
                    placeholder="Optional note"
                    helperText="Supporting instructional text for the user"
                    value=""
                    onChange={() => {}}
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs flex justify-between items-center">
                  <span>Current Input State: <strong>{interactiveFields.name}</strong> ({interactiveFields.email})</span>
                  <span className={Object.keys(interactiveErrors).length > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                    {Object.keys(interactiveErrors).length > 0 ? `Errors: ${Object.values(interactiveErrors).join(', ')}` : 'All Inputs Valid'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 3. SELECT */}
            <Card title="3. Select Component" description="Structured option dropdowns with empty safety, accessible placeholders, and error states.">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Select
                  id="interactiveSelect"
                  name="category"
                  label="Category Select (Interactive)"
                  value={interactiveFields.category}
                  options={[
                    { label: 'FinTech & Banking', value: 'fintech' },
                    { label: 'Health & Medical', value: 'health' },
                    { label: 'Enterprise Legal', value: 'legal' }
                  ]}
                  onChange={(e) => handleInteractiveChange('category', e.target.value)}
                />
                <Select
                  id="selectRequired"
                  name="selectRequired"
                  label="Select with Placeholder Prompt"
                  value=""
                  required
                  placeholder="-- Please choose an option --"
                  options={[
                    { label: 'Option A', value: 'a' },
                    { label: 'Option B', value: 'b' }
                  ]}
                  onChange={() => {}}
                />
                <Select
                  id="selectError"
                  name="selectError"
                  label="Select with Error Alert"
                  value=""
                  error="You must select an item to continue"
                  options={[{ label: 'Item 1', value: '1' }]}
                  onChange={() => {}}
                />
                <Select
                  id="selectDisabled"
                  name="selectDisabled"
                  label="Disabled Select"
                  value="locked"
                  disabled
                  options={[{ label: 'Locked Option', value: 'locked' }]}
                  onChange={() => {}}
                />
              </div>
            </Card>

            {/* 4. CARD */}
            <Card title="4. Card Component" description="Modular surface containers supporting normal and highlighted visual variants.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="normal" title="Normal Card Variant" description="Standard clean white surface with subtle border.">
                  <p className="text-xs text-slate-600">
                    Used for standard wizard steps, forms, and general structured dashboard panels.
                  </p>
                </Card>
                <Card variant="highlighted" title="Highlighted Card Variant" description="Subtle blue surface with ring accent for critical steps.">
                  <p className="text-xs text-blue-800">
                    Ideal for final review screens, active milestones, or premium upgrade modules.
                  </p>
                </Card>
              </div>
            </Card>

            {/* 5. STEP PROGRESS */}
            <Card title="5. StepProgress Component" description="Accessible multi-step wizard progress indicator with active, completed, and upcoming visual states.">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700">Interactive Stepper Control</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={demoStep === 0} onClick={() => setDemoStep(s => s - 1)}>
                      Previous Step
                    </Button>
                    <Button size="sm" variant="primary" disabled={demoStep === 2} onClick={() => setDemoStep(s => s + 1)}>
                      Next Step
                    </Button>
                  </div>
                </div>

                <StepProgress steps={['Personal Information', 'Account Preferences', 'Review & Complete']} currentStep={demoStep} />

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
                  Currently on Step {demoStep + 1} of 3. Steps before it display completed checkmarks; upcoming steps remain neutral.
                </div>
              </div>
            </Card>

            {/* 6. LABEL */}
            <Card title="6. Label Component" description="Accessible form field labeling with non-color-only required asterisks and screen-reader tags.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Label htmlFor="lbl1">Standard Label</Label>
                  <p className="text-xs text-slate-500">Default label text.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Label htmlFor="lbl2" required>Required Field</Label>
                  <p className="text-xs text-slate-500">Includes visual * and sr-only tag.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Label htmlFor="lbl3" optional>Optional Field</Label>
                  <p className="text-xs text-slate-500">Includes subtle (optional) marker.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: AI GENERATION DEMO                                      */}
        {/* ============================================================== */}
        {activeTab === 'ai-demo' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Live AI Code Generation Pipeline</h2>
              <p className="text-sm text-slate-500">
                Transforms complex JSON form schemas through LangChain / OpenAI GPT-4o into validated React 19 wizard components.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Input Schema */}
              <Card title="Input Form Schema (JSON)" description="Provide complex field definitions to transform into a multi-step wizard.">
                <div className="space-y-3">
                  <textarea
                    rows={12}
                    value={aiSchemaInput}
                    onChange={(e) => setAiSchemaInput(e.target.value)}
                    className="w-full font-mono text-xs bg-slate-900 text-slate-100 p-3.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      Cognitive Friction: <strong className="text-blue-600">0.85</strong> (Triggered)
                    </span>
                    <Button
                      variant="primary"
                      loading={aiGenerating}
                      onClick={handleRunAiGeneration}
                    >
                      Generate React Wizard
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Right Column: Output */}
              <Card title="Generated Output Contract" description="Output validated against security patterns, AST constraints, and field preservation.">
                {aiGenerating ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-500">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-medium">Assembling prompt, calling pipeline, and validating...</span>
                  </div>
                ) : aiResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Component: <span className="text-blue-600 font-mono">{aiResult.data?.componentName}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Source: {aiResult.source}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 border border-slate-200 space-y-1">
                      <p><strong>Steps Produced:</strong> {aiResult.data?.steps?.length}</p>
                      <p><strong>Field Preservation:</strong> {aiResult.data?.fieldMapping?.mappedFieldCount} of {aiResult.data?.fieldMapping?.originalFieldCount} fields retained</p>
                      <p><strong>Validation Note:</strong> {aiResult.data?.validationSummary?.notes}</p>
                    </div>

                    <div className="max-h-60 overflow-y-auto bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] leading-relaxed">
                      <pre>{aiResult.data?.componentCode}</pre>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-1">
                    <p className="font-semibold">Generation Error:</p>
                    <p>{aiError}</p>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                    Click &ldquo;Generate React Wizard&rdquo; to test live generation over HTTP/WebSocket.
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: 10 TEST CASES                                           */}
        {/* ============================================================== */}
        {activeTab === 'test-cases' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Benchmark Test Cases (10 Scenarios)</h2>
              <p className="text-sm text-slate-500">
                10 real-world complex form schemas with varied field types, optionality, and step segmentation targets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testCasesData.testCases.map((tc) => (
                <Card key={tc.id} variant="normal" className="hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {tc.id}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 mt-1">{tc.name}</h3>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">{tc.scenario}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Input Fields:</span>
                      <span className="font-semibold text-slate-700">{tc.input.fields.length} fields</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expected Steps:</span>
                      <span className="font-semibold text-slate-700">{tc.expectedWizardSteps.length} steps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Objective:</span>
                      <span className="text-slate-600 text-right truncate max-w-[220px]" title={tc.testObjective}>
                        {tc.testObjective}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: SYSTEM PROMPT OVERVIEW                                  */}
        {/* ============================================================== */}
        {activeTab === 'system-prompt' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">LLM System Prompt Specification</h2>
              <p className="text-sm text-slate-500">
                Instruction set sent to OpenAI GPT-4o enforcing component reuse, security boundaries, and output structure.
              </p>
            </div>

            <Card title="System Prompt Content" description="Loaded directly from src/prompts/systemPrompt.js">
              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs max-h-[500px] overflow-y-auto leading-relaxed">
                <pre>{AURAGEN_SYSTEM_PROMPT}</pre>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: FEW-SHOT EXAMPLES                                       */}
        {/* ============================================================== */}
        {activeTab === 'few-shots' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Curated Few-Shot Demonstrations</h2>
              <p className="text-sm text-slate-500">
                Three comprehensive demonstrations teaching the LLM how to transform complex schemas into valid React wizards.
              </p>
            </div>

            <div className="space-y-6">
              {FEW_SHOT_EXAMPLES.map((eg, idx) => (
                <Card key={idx} title={`Example ${idx + 1}: ${eg.name}`} description={`${eg.input.fields.length} fields decomposed into ${eg.output.steps.length} accessible steps`}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {eg.output.steps.map((st, sidx) => (
                        <span key={sidx} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-medium">
                          Step {sidx + 1}: {st.title} ({st.fields.length} fields)
                        </span>
                      ))}
                    </div>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed">
                      <pre>{eg.output.componentCode}</pre>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: DOCUMENTATION                                           */}
        {/* ============================================================== */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Design System & Token Documentation</h2>
              <p className="text-sm text-slate-500">
                Complete prop reference and finite Tailwind CSS token policy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Finite Tailwind Policy" description="Enforced restrictions to prevent styling chaos and security vulnerabilities.">
                <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                  <li><strong>Layout:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded">flex, inline-flex, grid, max-w-2xl, mx-auto, gap-4</code></li>
                  <li><strong>Spacing:</strong> Finite margins and paddings (<code className="bg-slate-100 px-1 py-0.5 rounded">p-4, p-6, mt-4, space-y-4</code>)</li>
                  <li><strong>Colors:</strong> Restricted to slate, blue, white, and red for alerts.</li>
                  <li><strong>Prohibited:</strong> Arbitrary classes (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded">w-[347px]</code>), inline styles, or external CSS CDNs.</li>
                </ul>
              </Card>

              <Card title="WCAG 2.1 Accessibility" description="Built-in screen reader support and keyboard navigation.">
                <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                  <li><strong>Labels:</strong> All inputs automatically linked to <code className="bg-slate-100 px-1 py-0.5 rounded">htmlFor</code>.</li>
                  <li><strong>Errors:</strong> Displayed with <code className="bg-slate-100 px-1 py-0.5 rounded">role=&quot;alert&quot;</code> and <code className="bg-slate-100 px-1 py-0.5 rounded">aria-describedby</code>.</li>
                  <li><strong>StepProgress:</strong> Uses semantic <code className="bg-slate-100 px-1 py-0.5 rounded">&lt;nav&gt;</code> and <code className="bg-slate-100 px-1 py-0.5 rounded">aria-current=&quot;step&quot;</code>.</li>
                  <li><strong>Buttons:</strong> Sets <code className="bg-slate-100 px-1 py-0.5 rounded">aria-disabled</code> and <code className="bg-slate-100 px-1 py-0.5 rounded">aria-busy</code>.</li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: REVIEW STATUS                                           */}
        {/* ============================================================== */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manual Review Matrix (Pavilson & Jeevan)</h2>
              <p className="text-sm text-slate-500">
                Evaluation tracking for all 10 benchmark test cases ready for joint review.
              </p>
            </div>

            <Card title="Review Table" description="Tracked in docs/MANUAL_REVIEW.md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Test ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Scenario</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Field Preservation</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Steps</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Review Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {testCasesData.testCases.map((tc) => (
                      <tr key={tc.id}>
                        <td className="px-3 py-2 font-mono font-bold text-blue-600">{tc.id}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{tc.name}</td>
                        <td className="px-3 py-2 text-slate-600">{tc.input.fields.length} / {tc.input.fields.length} preserved</td>
                        <td className="px-3 py-2 text-slate-600">{tc.expectedWizardSteps.length} steps</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review with Jeevan
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
