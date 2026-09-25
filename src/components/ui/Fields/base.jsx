export const classNameDefault =
  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 appearance-none disabled:cursor-not-allowed input-field tap-target';

export const LabelField = ({
  className,
  children,
  'data-testid': testId,
  ...props
}) => {
  className ||= 'block text-sm font-medium text-main mb-2';
  return (
    <label
      {...props}
      className={className}
      data-testid={testId || 'label-field'}
    >
      {children}
    </label>
  );
};

export const InputGroupField = ({ children, className }) => {
  return (
    <div className={className} data-testid="input-group-field">
      {children}
    </div>
  );
};

export const OptionField = ({ value, label }) => {
  return (
    <option value={value} data-testid="option-field">
      {label}
    </option>
  );
};

// Único ponto de cálculo dos ids referenciados por aria-describedby: reflete a
// presença real de hint/error, nunca um estado de validação isolado.
export const describedByIds = (htmlFor, { hint, error } = {}) => {
  const ids = [];
  if (hint) ids.push(`${htmlFor}-hint`);
  if (error) ids.push(`${htmlFor}-error`);
  return ids.length ? ids.join(' ') : undefined;
};

export const BaseField = ({
  htmlFor,
  required,
  label,
  inputGroupClass,
  labelClass,
  hint,
  error,
  children,
}) => {
  label = required ? `${label} *` : label;
  return (
    <InputGroupField className={inputGroupClass}>
      <LabelField htmlFor={htmlFor} className={labelClass}>
        {label}
      </LabelField>

      {children}

      {hint && <p id={`${htmlFor}-hint`}>{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </InputGroupField>
  );
};
