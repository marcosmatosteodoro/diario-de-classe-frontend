import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants.js';
import { assertApiUrlForBuild } from './assertApiUrlForBuild.mjs';

describe('assertApiUrlForBuild', () => {
  it('lança no build de produção sem a env', () => {
    expect(() =>
      assertApiUrlForBuild({ phase: PHASE_PRODUCTION_BUILD, env: {} })
    ).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it.each(['', '   '])('lança no build com a env vazia (%j)', valor => {
    expect(() =>
      assertApiUrlForBuild({
        phase: PHASE_PRODUCTION_BUILD,
        env: { NEXT_PUBLIC_API_URL: valor },
      })
    ).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('não lança no build com a env definida', () => {
    expect(() =>
      assertApiUrlForBuild({
        phase: PHASE_PRODUCTION_BUILD,
        env: { NEXT_PUBLIC_API_URL: 'https://api.example.test/api' },
      })
    ).not.toThrow();
  });

  it.each([PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER])(
    'não lança na fase %s sem a env',
    phase => {
      expect(() => assertApiUrlForBuild({ phase, env: {} })).not.toThrow();
    }
  );
});
