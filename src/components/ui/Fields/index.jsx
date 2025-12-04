import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const classNameDefault =
  'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

const LabelField = ({ className, children, ...props }) => {
  className ||= 'block text-sm font-medium text-gray-700 mb-2';
  return (
    <label {...props} className={className}>
      {children}
    </label>
  );
};

const InputGroupField = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

const OptionField = ({ value, label }) => {
  return <option value={value}>{label}</option>;
};

const BaseField = ({
  htmlFor,
  required,
  label,
  inputGroupClass,
  labelClass,
  children,
}) => {
  label = required ? `${label} *` : label;
  return (
    <InputGroupField className={inputGroupClass}>
      <LabelField htmlFor={htmlFor} className={labelClass}>
        {label}
      </LabelField>

      {children}
    </InputGroupField>
  );
};

export const InputField = ({
  htmlFor,
  type,
  placeholder,
  required,
  label,
  value,
  onChange,
  inputGroupClass,
  labelClass,
  className,
  ...props
}) => {
  type ||= 'text';
  className ||= classNameDefault;
  return (
    <BaseField
      htmlFor={htmlFor}
      required={required}
      label={label}
      inputGroupClass={inputGroupClass}
      labelClass={labelClass}
    >
      <input
        type={type}
        id={htmlFor}
        name={htmlFor}
        required={required}
        value={value || ''}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
        {...props}
      />
    </BaseField>
  );
};

export const TextAreaField = ({
  htmlFor,
  placeholder,
  required,
  label,
  value,
  onChange,
  inputGroupClass,
  labelClass,
  className,
  ...props
}) => {
  className ||= classNameDefault;
  return (
    <BaseField
      htmlFor={htmlFor}
      required={required}
      label={label}
      inputGroupClass={inputGroupClass}
      labelClass={labelClass}
    >
      <textarea
        id={htmlFor}
        name={htmlFor}
        required={required}
        value={value}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
        {...props}
      />
    </BaseField>
  );
};

export const SelectField = ({
  htmlFor,
  required,
  placeholder,
  label,
  value,
  onChange,
  inputGroupClass,
  labelClass,
  className,
  options = [],
  ...props
}) => {
  className ||= classNameDefault;
  return (
    <BaseField
      htmlFor={htmlFor}
      required={required}
      label={label}
      inputGroupClass={inputGroupClass}
      labelClass={labelClass}
    >
      <select
        id={htmlFor}
        name={htmlFor}
        required={required}
        value={value}
        onChange={onChange}
        className={className}
        {...props}
      >
        {placeholder && <OptionField value="" label={placeholder} />}
        {options.map(option => (
          <OptionField
            key={option.value}
            value={option.value}
            label={option.label}
          />
        ))}
      </select>
    </BaseField>
  );
};

export const PasswordField = ({
  htmlFor,
  placeholder,
  required,
  label,
  value,
  onChange,
  inputGroupClass,
  labelClass,
  className,
  ...props
}) => {
  className ||= classNameDefault;
  const [type, setType] = useState('password');

  const handleToggleShow = () => {
    setType(type === 'password' ? 'text' : 'password');
  };
  return (
    <BaseField
      htmlFor={htmlFor}
      required={required}
      label={label}
      inputGroupClass={inputGroupClass}
      labelClass={labelClass}
    >
      <div className="relative">
        <input
          type={type}
          id={htmlFor}
          name={htmlFor}
          required={required}
          value={value || ''}
          onChange={onChange}
          className={`${className} pr-10`}
          placeholder={placeholder}
          {...props}
        />
        <button
          type="button"
          onClick={handleToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
          aria-label={type === 'password' ? 'Mostrar senha' : 'Ocultar senha'}
        >
          {type === 'password' ? (
            <Eye size={20} strokeWidth={1.5} />
          ) : (
            <EyeOff size={20} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </BaseField>
  );
};
