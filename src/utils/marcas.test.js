import { MARCAS, SUPERFICIES_SEM_REGISTRO, resolverMarca } from './marcas.mjs';

describe('resolverMarca', () => {
  it('resolve ausente ou vazia para a marca padrão (mesma identidade de objeto)', () => {
    expect(resolverMarca(undefined)).toBe(MARCAS.padrao);
    expect(resolverMarca('')).toBe(MARCAS.padrao);
  });

  it('resolve o identificador exato "exemplo" para a marca fictícia', () => {
    expect(resolverMarca('exemplo')).toBe(MARCAS.exemplo);
  });

  it.each(['Exemplo', ' exemplo', 'exemplo ', '   ', 'BLS2', 'bls', 'EXEMPLO'])(
    'recusa "%s" sem normalizar caixa ou espaço, sem ecoar o valor',
    valor => {
      let erro;
      try {
        resolverMarca(valor);
      } catch (e) {
        erro = e;
      }
      expect(erro).toBeInstanceOf(Error);
      expect(erro.message).toContain('NEXT_PUBLIC_MARCA');
      // Checa o valor exato recebido (sem trim): a mensagem lista "exemplo"
      // como valor aceito (FR-005-004), então checar a versão já normalizada
      // (' exemplo'.trim() === 'exemplo') colidiria com essa listagem
      // legítima. O que a AC proíbe é ecoar o que o usuário de fato digitou.
      expect(erro.message).not.toContain(valor);
    }
  );
});

describe('MARCAS — imutabilidade', () => {
  it('é congelado em profundidade', () => {
    expect(Object.isFrozen(MARCAS)).toBe(true);
    expect(Object.isFrozen(MARCAS.padrao)).toBe(true);
    expect(Object.isFrozen(MARCAS.exemplo)).toBe(true);
  });

  it('ignora tentativa de reatribuição de campo (lança em modo estrito; valor não muda em qualquer modo)', () => {
    // Módulo ESM é sempre avaliado em modo estrito: a atribuição lança
    // TypeError em vez de falhar silenciosamente. O que importa para esta AC
    // é que o valor não muda, nos dois modos.
    try {
      MARCAS.padrao.nome = 'x';
    } catch (_erro) {
      // esperado em modo estrito
    }
    expect(MARCAS.padrao.nome).toBe('BLS Idiomas');
  });
});

describe('SUPERFICIES_SEM_REGISTRO', () => {
  it.each([
    ['manifest.json', 'manifesto'],
    ['icon-192.png', 'icone192'],
    ['icon-512.png', 'icone512'],
    ['icon-maskable.png', 'iconeMaskable'],
    ['bls.png', 'logoClaro'],
    ['bls-dark.png', 'logoEscuro'],
    ['favicon.ico', 'logoClaro'],
  ])(
    'destino de "%s" é a mesma string de MARCAS.exemplo.%s',
    (literal, campo) => {
      const par = SUPERFICIES_SEM_REGISTRO.find(p => p.literal === literal);
      expect(par).toBeDefined();
      expect(par.destino).toBe(MARCAS.exemplo[campo]);
    }
  );
});
