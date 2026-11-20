export default function DynamicFormWizard({
  initialValues = {}, onSubmit = () => {}, onCancel = () => {}, onStepChange = () => {}
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(({ name, type }) => {
    const value = Object.hasOwn(initialValues, name) ? initialValues[name] : undefined;
    return [name, type === "checkbox" ? value === true : value ?? ""];
  })));
  const [errors, setErrors] = useState({});
  const heading = useRef(null);
  const moved = useRef(false);
  const controls = useRef(new Map());
  const prefix = useId();
  const current = wizard.steps[step];
  const last = step === wizard.steps.length - 1;

  useEffect(() => {
    if (moved.current) heading.current.focus();
  }, [step]);

  function moveTo(index) {
    if (index === step) return;
    moved.current = true;
    setStep(index);
    onStepChange(index + 1);
  }

  function update(event) {
    const { name, value, type, checked } = event.currentTarget;
    setValues((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  function checkStep(finalize) {
    const problems = {};
    for (const field of finalize ? fields : current.fields) {
      const { name, type, options, minLength, maxLength } = { ...field, ...field.validation };
      const control = controls.current.get(name);
      const value = values[name];
      let message = validateDemoField ? validateDemoField(name, value, values) : null;
      if (!message && typeof value === "string" && value !== "") {
        if (value.length < minLength) message = "Enter at least " + minLength + " characters.";
        if (value.length > maxLength) message = "Enter at most " + maxLength + " characters.";
      }
      if (!message && type === "select" && value !== "" && !options.some((option) => option.value === value)) {
        message = "Select an available option.";
      }
      if (!message && control && (type === "number" || type === "date") && value !== "" && control.value === "") {
        message = type === "number" ? "Enter a valid number." : "Enter a valid date.";
      }
      if (!message && control && !control.validity.valid) message = control.validationMessage;
      if (message) problems[name] = message;
    }
    setErrors(problems);
    const first = Object.keys(problems)[0];
    if (!first) return true;
    const problemStep = wizard.steps.findIndex(({ fields }) => fields.some(({ name }) => name === first));
    if (problemStep === step) controls.current.get(first)?.focus();
    else moveTo(problemStep);
    return false;
  }

  function submit(event) {
    event.preventDefault();
    if (!checkStep(last)) return;
    if (last) onSubmit({ ...values });
    else moveTo(step + 1);
  }

  function renderField(field) {
    const { name, label, type, required, placeholder, helpText, options, component } = field;
    const { min, max, step: fieldStep, minLength, maxLength } = { ...field, ...field.validation };
    const id = prefix + "-control-" + name;
    const helpId = prefix + "-help-" + name;
    const errorId = prefix + "-error-" + name;
    const error = Object.hasOwn(errors, name) ? errors[name] : null;
    const focused = wizard.activeField === name;
    const description = [helpText && helpId, error && errorId].filter(Boolean).join(" ");
    const props = {
      id, name, required, onChange: update,
      ref: (node) => {
        if (node) controls.current.set(name, node);
        else controls.current.delete(name);
      },
      "aria-invalid": Boolean(error),
      "aria-describedby": description || undefined,
      className: theme[component][error ? "invalid" : focused ? "focused" : "default"]
    };

    return (
      <div key={name} className="space-y-1">
        <label htmlFor={id} className={theme.Label.default}>{label}{required ? " (required)" : ""}</label>
        {component === "Select" ? (
          <select {...props} value={values[name] ?? ""}>
            {options[0].value !== "" && <option value="">Select an option</option>}
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : type === "checkbox" ? (
          <input {...props} type="checkbox" checked={values[name] === true} />
        ) : (
          <input {...props} type={type} value={values[name] ?? ""} placeholder={placeholder}
            min={min} max={max} step={fieldStep} minLength={minLength} maxLength={maxLength} />
        )}
        {helpText && <p id={helpId} className="text-xs text-slate-500">{helpText}</p>}
        {error && <p id={errorId} className="text-xs text-rose-600" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <section aria-labelledby={prefix + "-heading"} className={theme.Card.default}>
      <div className="p-6 space-y-4">
        <h2 ref={heading} tabIndex={-1} id={prefix + "-heading"} className="text-base font-bold text-slate-900">{current.title}</h2>
        <p>Step {step + 1} of {wizard.steps.length}</p>
        <progress aria-label="Wizard progress" value={step + 1} max={wizard.steps.length} className={theme.StepProgress.default} />
        <form noValidate onSubmit={submit} className="space-y-4">
          {current.fields.map(renderField)}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <button type="button" className={theme.Button.secondary} onClick={step > 0 ? () => moveTo(step - 1) : onCancel}>
              {step > 0 ? "Back" : "Cancel"}
            </button>
            {last ? (
              <button type="submit" className={theme.Button.primary}>Submit</button>
            ) : (
              <button type="button" className={theme.Button.primary} onClick={() => {
                if (checkStep(false)) moveTo(step + 1);
              }}>Continue</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
