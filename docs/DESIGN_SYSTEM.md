# AuraGen Design System Documentation

Welcome to the **AuraGen Design System** component catalog and styling policy specification.

This design system is specifically engineered for deterministic, accessible, and responsive multi-step wizard generation by AI agents within the AuraGen platform.

---

## 1. Components Catalog

### 1. Button

- **Purpose**: Interactive trigger for actions, step navigation, and form submissions.
- **Props**:
  | Prop | Type | Default | Required/Optional | Description |
  |---|---|---|---|---|
  | `children` | `ReactNode` | - | Required | Button label or inner elements |
  | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Optional | Button HTML type. Default is `'button'` to avoid accidental form submits |
  | `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | Optional | Visual styling variant |
  | `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Optional | Size dimensions and text sizing |
  | `disabled` | `boolean` | `false` | Optional | Disables button and prevents interactions |
  | `loading` | `boolean` | `false` | Optional | Displays accessible spinner and disables button |
  | `onClick` | `function` | - | Optional | Click event handler |
  | `className` | `string` | `''` | Optional | Additional approved utility classes |

- **Usage Example**:
  ```jsx
  import { Button } from '@/design-system';

  <Button variant="primary" onClick={handleNext}>
    Next Step
  </Button>
  ```

- **Accessibility**:
  - Automatically sets `aria-disabled` and `aria-busy` during loading or disabled states.
  - Spinner includes `role="status"` and `aria-hidden="true"` SVG with accessible announcements.
  - Visible focus rings with high contrast (`focus:ring-2 focus:ring-offset-2`).

- **Invalid Usage**:
  - Do not use `type="submit"` on intermediate navigation buttons.
  - Do not render raw `<button>` elements with arbitrary Tailwind classes.

---

### 2. Input

- **Purpose**: Controlled text and numeric form inputs with unified labeling and error messaging.
- **Props**:
  | Prop | Type | Default | Required/Optional | Description |
  |---|---|---|---|---|
  | `id` | `string` | `name` | Optional | HTML element ID. Falls back to `name` |
  | `name` | `string` | - | Required | Input name key in form data |
  | `label` | `string` | - | Optional | User-visible label text |
  | `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'date' \| 'tel'` | `'text'` | Optional | Input semantic type |
  | `value` | `string \| number` | - | Optional | Controlled input value |
  | `placeholder` | `string` | `''` | Optional | Hint text inside the input |
  | `required` | `boolean` | `false` | Optional | Marks input required |
  | `disabled` | `boolean` | `false` | Optional | Disables the input |
  | `error` | `string` | - | Optional | Validation error message |
  | `helperText` | `string` | - | Optional | Supporting instructional text |
  | `onChange` | `function` | - | Optional | Input change callback |
  | `className` | `string` | `''` | Optional | Additional container styling |

- **Usage Example**:
  ```jsx
  import { Input } from '@/design-system';

  <Input
    id="email"
    name="email"
    type="email"
    label="Email Address"
    value={formData.email}
    required
    error={errors.email}
    onChange={(e) => handleChange('email', e.target.value)}
  />
  ```

- **Accessibility**:
  - Always associates `<label>` via `htmlFor`.
  - Links validation errors via `aria-describedby` and sets `aria-invalid="true"`.
  - Never relies on placeholder as the sole accessible label.

---

### 3. Select

- **Purpose**: Accessible dropdown selection from structured option lists.
- **Props**:
  | Prop | Type | Default | Required/Optional | Description |
  |---|---|---|---|---|
  | `id` | `string` | `name` | Optional | HTML element ID |
  | `name` | `string` | - | Required | Select name key |
  | `label` | `string` | - | Optional | Form field label |
  | `value` | `string \| number` | `''` | Optional | Selected value |
  | `options` | `Array<{label: string, value: string\|number}>` | `[]` | Optional | Option entries |
  | `placeholder` | `string` | `'Select an option'` | Optional | Disabled default prompt |
  | `required` | `boolean` | `false` | Optional | Marks field required |
  | `disabled` | `boolean` | `false` | Optional | Disables the select |
  | `error` | `string` | - | Optional | Validation error message |
  | `onChange` | `function` | - | Optional | Selection change handler |
  | `className` | `string` | `''` | Optional | Additional container classes |

- **Usage Example**:
  ```jsx
  import { Select } from '@/design-system';

  <Select
    id="loanPurpose"
    name="loanPurpose"
    label="Loan Purpose"
    value={formData.loanPurpose}
    options={[
      { label: 'Home Improvement', value: 'home' },
      { label: 'Education', value: 'education' },
      { label: 'Debt Consolidation', value: 'debt' }
    ]}
    required
    error={errors.loanPurpose}
    onChange={(e) => handleChange('loanPurpose', e.target.value)}
  />
  ```

---

### 4. Card

- **Purpose**: Structural surface container that groups wizard step content and contextual information.
- **Props**:
  | Prop | Type | Default | Required/Optional | Description |
  |---|---|---|---|---|
  | `title` | `string` | - | Optional | Section header title |
  | `description` | `string` | - | Optional | Header subtext |
  | `children` | `ReactNode` | - | Required | Body content |
  | `className` | `string` | `''` | Optional | Additional utility classes |
  | `variant` | `'normal' \| 'highlighted'` | `'normal'` | Optional | Surface style |

- **Usage Example**:
  ```jsx
  import { Card } from '@/design-system';

  <Card title="Employment Details" description="Tell us about your current employer and income.">
    {/* Form fields */}
  </Card>
  ```

---

### 5. StepProgress

- **Purpose**: Visual step indicator demonstrating progress, active step, and completed steps in multi-step flows.
- **Props**:
  | Prop | Type | Default | Required/Optional | Description |
  |---|---|---|---|---|
  | `steps` | `Array<{id: string\|number, title: string}> \| string[]` | `[]` | Required | Step definitions |
  | `currentStep` | `number` | `0` | Required | Active step index (0-indexed) |
  | `completedSteps`| `number[]` | - | Optional | Explicit list of completed indices |
  | `className` | `string` | `''` | Optional | Container utility classes |

- **Usage Example**:
  ```jsx
  import { StepProgress } from '@/design-system';

  <StepProgress
    steps={['Personal', 'Financial', 'Loan Details', 'Review']}
    currentStep={currentStep}
  />
  ```

- **Accessibility**:
  - Wrapped in `<nav aria-label="Wizard Progress">` with ordered list `<ol>`.
  - Sets `aria-current="step"` on active step.
  - Provides mobile fallback step description.

---

### 6. Label

- **Purpose**: Accessible form label with explicit required/optional visual markers and screen-reader announcements.
- **Props**:
  | Prop | Type | Default | Required/Optional | Description |
  |---|---|---|---|---|
  | `htmlFor` | `string` | - | Optional | Targeted input/select ID |
  | `children` | `ReactNode` | - | Required | Label text |
  | `required` | `boolean` | `false` | Optional | Displays asterisk and screen-reader hint |
  | `optional` | `boolean` | `false` | Optional | Displays '(optional)' text |
  | `className` | `string` | `''` | Optional | Additional utility classes |

- **Usage Example**:
  ```jsx
  import { Label } from '@/design-system';

  <Label htmlFor="ssn" required>
    Social Security Number
  </Label>
  ```

---

## 2. Finite Tailwind CSS Policy

To guarantee layout stability, visual consistency, and security across LLM-generated React code, only the following finite tokens and utility classes are permitted:

### 1. Layout & Grid
- Permitted: `flex`, `inline-flex`, `grid`, `grid-cols-1`, `grid-cols-2`, `gap-2`, `gap-3`, `gap-4`, `gap-6`, `items-center`, `justify-between`, `justify-end`, `w-full`, `max-w-md`, `max-w-xl`, `max-w-2xl`, `mx-auto`.

### 2. Spacing
- Margin: `mt-1`, `mt-2`, `mt-3`, `mt-4`, `mt-6`, `mb-1`, `mb-2`, `mb-4`, `mb-6`, `my-4`, `mx-auto`.
- Padding: `p-4`, `p-6`, `px-3`, `px-4`, `py-2`, `py-3`, `pb-4`.

### 3. Typography
- Size: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`.
- Weight: `font-normal`, `font-medium`, `font-semibold`, `font-bold`.
- Color: `text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`, `text-blue-600`, `text-red-600`, `text-white`.

### 4. Background Colors
- Permitted: `bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-blue-50`, `bg-blue-600`, `bg-blue-700`, `bg-red-600`.

### 5. Borders & Radius
- Border width: `border`, `border-b`, `border-t`, `border-2`.
- Border color: `border-gray-100`, `border-gray-200`, `border-gray-300`, `border-blue-500`, `border-red-500`.
- Border radius: `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`.

### 6. Focus & Interactive States
- Rings: `focus:outline-none`, `focus:ring-2`, `focus:ring-blue-500`, `focus:ring-offset-2`.
- Hover/Active: `hover:bg-blue-700`, `hover:bg-gray-100`, `active:bg-blue-800`.

### 7. Prohibited Patterns
- ❌ No raw inline styles (`style={{ ... }}`).
- ❌ No arbitrary CSS strings or CSS injection (`<style>` tags).
- ❌ No arbitrary Tailwind values (e.g., `w-[347px]`, `bg-[#123456]`).
- ❌ No external CSS frameworks or CDN links.
- ❌ Never substitute raw `<input>` or `<button>` for design-system components.
