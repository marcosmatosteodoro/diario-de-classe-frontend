import fs from 'fs';
import path from 'path';

const fonte = fs.readFileSync(
  path.join(__dirname, 'UserAuthProvider.jsx'),
  'utf-8'
);
const linhas = fonte.split('\n');
const indiceIsAdmin = linhas.findIndex(l => l.includes('const isAdmin = '));
const indiceFecha = indiceIsAdmin - 1;
const indiceAbre = linhas.lastIndexOf(
  linhas
    .slice(0, indiceFecha)
    .reverse()
    .find(l => l.trim() === '/**'),
  indiceFecha
);
const bloco = linhas.slice(indiceAbre, indiceFecha + 1).join('\n');

describe('UserAuthProvider - documentação do isAdmin (AC-004-019)', () => {
  it('a linha imediatamente anterior a `const isAdmin = ` fecha um bloco */', () => {
    expect(indiceIsAdmin).toBeGreaterThan(0);
    expect(linhas[indiceFecha].trim()).toBe('*/');
  });

  it('o bloco abre com /** e não contém outro código entre a abertura e o isAdmin', () => {
    expect(linhas[indiceAbre].trim()).toBe('/**');
    expect(bloco).not.toMatch(/[;{}]\s*$/m);
  });

  it.each(['exibição', 'autorização', 'nunca'])(
    'o texto do bloco contém "%s"',
    expressao => {
      expect(bloco).toContain(expressao);
    }
  );
});
