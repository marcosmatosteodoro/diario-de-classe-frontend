import nextConfig from './next.config.mjs';

const BUILD = 'phase-production-build';
const API_URL = 'https://api.example.test/api';

describe('next.config — NEXT_PUBLIC_API_URL', () => {
  let original;

  beforeEach(() => {
    original = process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = original;
    }
  });

  it('falha o build de produção com a env ausente', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(() => nextConfig(BUILD)).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it.each(['', '   '])('falha o build de produção com a env %j', valor => {
    process.env.NEXT_PUBLIC_API_URL = valor;
    expect(() => nextConfig(BUILD)).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('devolve o config no build de produção com a env definida', () => {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    const config = nextConfig(BUILD);
    expect(config.turbopack).toEqual({});
    expect(config.agentRules).toBe(false);
    expect(typeof config.env.NEXT_PUBLIC_BUILD_ID).toBe('string');
  });

  it.each(['phase-development-server', 'phase-production-server'])(
    'não lança em %s sem a env e devolve o config',
    fase => {
      delete process.env.NEXT_PUBLIC_API_URL;
      const config = nextConfig(fase);
      expect(config.turbopack).toEqual({});
      expect(config.agentRules).toBe(false);
    }
  );
});
