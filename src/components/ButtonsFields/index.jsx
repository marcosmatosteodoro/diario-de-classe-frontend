import Link from 'next/link';

export const ButtonsFields = ({ isSubmitting, isLoading, href }) => {
  return (
    <div className="flex gap-4 mt-8">
      <button
        type="submit"
        disabled={isSubmitting}
        className={`btn btn-primary ${isSubmitting && 'blocked'}`}
      >
        {isLoading ? 'Criando...' : 'Salvar'}
      </button>

      <Link href={href} className="btn btn-secondary">
        Cancelar
      </Link>
    </div>
  );
};
