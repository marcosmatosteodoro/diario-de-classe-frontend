import { SEM_CONEXAO_MESSAGE } from '@/utils/thunkErrorPayload';

export const SessionUnavailable = ({ onRetry }) => (
  <section
    className="max-w-xl mx-auto bg-main rounded-lg shadow-sm p-8 text-center"
    data-testid="session-unavailable"
  >
    <h1 className="text-xl font-semibold text-main mb-2">
      Sessão indisponível
    </h1>
    <p className="text-muted mb-6">{SEM_CONEXAO_MESSAGE}</p>
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => onRetry?.()}
    >
      Tentar novamente
    </button>
  </section>
);
