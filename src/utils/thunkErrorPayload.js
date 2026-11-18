/**
 * Mensagem fixa em pt-BR para quando a chamada não chega a ter resposta do
 * servidor (falha de transporte/rede) — evita propagar `error.message` cru
 * do axios, que vem em inglês (ex.: "Network Error").
 */
export const SEM_CONEXAO_MESSAGE =
  'Não foi possível concluir a ação. Verifique sua conexão com a internet e tente novamente.';

/**
 * Resolve a mensagem de erro de uma chamada de API para o que os slices
 * exibem ao usuário.
 *
 * @param {Error} error erro do axios
 * @param {string} fallback mensagem quando a API responde sem uma mensagem
 * @returns {string} `''` para erro marcado `sessaoTrocada`/`identidadeAlterada`
 */
export function getRequestErrorMessage(error, fallback) {
  // Rejeição marcada é silenciosa: a guarda de sessão é a fonte única do
  // aviso, e o texto interno da marca não é mensagem ao usuário.
  if (error?.sessaoTrocada || error?.identidadeAlterada) {
    return '';
  }
  if (!error.response) {
    return SEM_CONEXAO_MESSAGE;
  }
  return error.response?.data?.message || error.message || fallback;
}

/**
 * Normaliza o erro de um asyncThunk para o formato que os slices guardam.
 *
 * Extraído porque estava duplicado literalmente em mais de um slice novo.
 *
 * @param {Error} error erro do axios
 * @param {string} fallback mensagem quando a API não manda uma
 * @returns {{ message: string, errors: Array, statusError: number|undefined }}
 */
export function thunkErrorPayload(error, fallback) {
  return {
    message: getRequestErrorMessage(error, fallback),
    errors: error.response?.data?.errors || [],
    statusError: error.response?.status,
  };
}
