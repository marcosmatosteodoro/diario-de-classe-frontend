export const FormGroup = ({ children, cols = 2, className = '' }) => {
  let colsClass = '';
  className ||= 'gap-6';
  if (cols === 2) colsClass = 'md:grid-cols-2';
  return (
    <div className={`grid grid-cols-1 ${colsClass} ${className}`}>
      {children}
    </div>
  );
};
