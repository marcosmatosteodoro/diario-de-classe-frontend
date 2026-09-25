export const FormSection = ({
  title,
  children,
  dataTestId = 'form-section',
}) => {
  return (
    <fieldset className="border-0 p-0 m-0 min-w-0" data-testid={dataTestId}>
      <legend className="text-lg text-main font-semibold mb-3">{title}</legend>
      {children}
    </fieldset>
  );
};
