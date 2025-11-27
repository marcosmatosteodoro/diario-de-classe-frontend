export const Form = ({ children, handleSubmit, props }) => {
  return (
    <form
      {...props}
      className="bg-white shadow-md rounded-lg p-6"
      onSubmit={handleSubmit}
    >
      {children}
    </form>
  );
};
