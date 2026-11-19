// (DEC-006-001 · demonstracao) Registro único de marcas, puro, sem leitura de
// ambiente — quem chama resolve o valor do ambiente antes de invocar
// `resolverMarca`. Congelado em profundidade: nenhum consumidor edita o
// registro em runtime.
function congelarProfundamente(objeto) {
  Object.freeze(objeto);
  for (const valor of Object.values(objeto)) {
    if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
      congelarProfundamente(valor);
    }
  }
  return objeto;
}

// (DEC-006-002 · demonstracao) Caminhos próprios por marca, desenho híbrido:
// `exemplo` aponta para `public/marcas/exemplo/...`; quem lê o registro
// (Header, layout) nunca passa por rewrite — só as superfícies sem registro
// (`SUPERFICIES_SEM_REGISTRO`, abaixo) precisam dele.
export const MARCAS = congelarProfundamente({
  padrao: {
    nome: 'BLS Idiomas',
    nomeCurto: 'BLS',
    tituloAba: 'Diário de Classe',
    descricao: 'Diário de Classe - BLS Idiomas',
    altLogo: 'Logo da empresa BLS',
    logoClaro: '/bls.png',
    logoEscuro: '/bls-dark.png',
    icone192: '/icon-192.png',
    icone512: '/icon-512.png',
    iconeMaskable: '/icon-maskable.png',
    manifesto: '/manifest.json',
  },
  exemplo: {
    nome: 'Escola Exemplo de Idiomas',
    nomeCurto: 'Escola Exemplo',
    tituloAba: 'Diário de Classe - Escola Exemplo de Idiomas',
    descricao: 'Diário de Classe - Escola Exemplo de Idiomas',
    altLogo: 'Logo da Escola Exemplo de Idiomas',
    logoClaro: '/marcas/exemplo/logo-claro.png',
    logoEscuro: '/marcas/exemplo/logo-escuro.png',
    icone192: '/marcas/exemplo/icon-192.png',
    icone512: '/marcas/exemplo/icon-512.png',
    iconeMaskable: '/marcas/exemplo/icon-maskable.png',
    manifesto: '/marcas/exemplo/manifest.json',
  },
});

export const IDENTIFICADOR_MARCA_FICTICIA = 'exemplo';

// Fonte única com `MARCAS.exemplo`: as 6 superfícies que pedem a imagem/manifesto
// por literal fixo (precache do service worker, página offline e o
// `<link rel="manifest">`) e, de brinde, o acesso direto aos dois logos antigos.
export const SUPERFICIES_SEM_REGISTRO = congelarProfundamente([
  { literal: 'manifest.json', destino: MARCAS.exemplo.manifesto },
  { literal: 'icon-192.png', destino: MARCAS.exemplo.icone192 },
  { literal: 'icon-512.png', destino: MARCAS.exemplo.icone512 },
  { literal: 'icon-maskable.png', destino: MARCAS.exemplo.iconeMaskable },
  { literal: 'bls.png', destino: MARCAS.exemplo.logoClaro },
  { literal: 'bls-dark.png', destino: MARCAS.exemplo.logoEscuro },
]);

/**
 * Resolve a marca selecionada a partir do valor cru de `NEXT_PUBLIC_MARCA`.
 * Comparação exata, sem normalizar caixa ou espaço (A-005-002): qualquer
 * valor fora do ausente/vazio/`exemplo` é configuração inválida e lança —
 * nunca cai na marca padrão por aproximação (NFR-005-002, fail secure).
 *
 * @param {string | undefined} valor valor cru de `process.env.NEXT_PUBLIC_MARCA`
 * @returns {typeof MARCAS.padrao | typeof MARCAS.exemplo} a marca resolvida
 */
export function resolverMarca(valor) {
  if (valor === undefined || valor === '') return MARCAS.padrao;
  if (valor === IDENTIFICADOR_MARCA_FICTICIA) return MARCAS.exemplo;
  throw new Error(
    'NEXT_PUBLIC_MARCA inválida: valores aceitos são ausente/vazio (marca padrão) ou "exemplo" (marca fictícia).'
  );
}
