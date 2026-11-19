import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { MARCAS } from '../utils/marcas.mjs';

const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const manifestFicticioPath = path.join(
  process.cwd(),
  'public',
  'marcas',
  'exemplo',
  'manifest.json'
);
const manifestFicticio = JSON.parse(
  fs.readFileSync(manifestFicticioPath, 'utf-8')
);

// Lê width/height reais gravados no chunk IHDR do PNG (bytes 16-19 e 20-23,
// depois dos 8 bytes de assinatura + 4 de tamanho + 4 do tipo "IHDR") — nunca
// confia só no `sizes` declarado no manifest, que é exatamente o que a
// regressão deixava mentir (src apontando de volta para bls.png 225x224 com
// sizes 192x192/512x512).
function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

// Byte 25 do IHDR é o "color type" do PNG (spec PNG: offset 8 assinatura + 4
// tamanho + 4 tipo + 9 campos do IHDR até o byte de color type). `6` = RGBA,
// `4` = grayscale+alpha, `2`/`3`/`0` não têm canal alfa.
function readPngColorType(filePath) {
  const buffer = fs.readFileSync(filePath);
  return buffer.readUInt8(25);
}

function sha256(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

// (DEC-006-008 · demonstracao) Hashes e dimensões da marca padrão, capturados
// no PLAN antes de qualquer mudança nesses arquivos — transcritos literais,
// nunca recalculados aqui.
const HASHES_MARCA_PADRAO = {
  'bls.png': '148b5e65a5fd5bdc7eeb1e78def19fe0e48648706c1a8c7aed399e2620e9faca',
  'bls-dark.png':
    'db455b2bc1421630a77be400527f27fd799489d64b97340edeceabda71e720bd',
  'icon-192.png':
    '4a73d97554ac8c77ab7c17a701a63ea850db8bbf47162cc4530f95d37efd3d7d',
  'icon-512.png':
    '4e16edc3277d5cf5e2612506756da7018223d82f667d1e45873d21df447b7612',
  'icon-maskable.png':
    'b804a2cbf3425b29380031f6f0f0c2160e4fbbc04a5436bb32e992275d1eae71',
  'manifest.json':
    'abde906221b71df19ddd5fbacce12e04b535bb6a24ae090199eb5b5a33dededa',
};

// Cor de fundo do `icon-maskable.png` fictício, usada pelo comando de geração
// (DEC-006-007 · demonstracao) fora da zona segura de 80%.
const COR_DE_FUNDO_ICONE_MASCARAVEL_FICTICIO = [13, 148, 136];

// Decodificador PNG mínimo (sem dependência nova — DEC-006-007 · demonstracao):
// concatena os chunks IDAT, inflaciona com `zlib` e desfaz o filtro
// por scanline (spec PNG, seção "Filtering") para expor os bytes de pixel.
// Só RGB (color type 2) e RGBA (6), 8 bits, sem interlace — suficiente para
// os PNGs gerados pelo comando de geração (DEC-006-007 · demonstracao).
function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function lerPixelsPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 8 + length + 4;
  }
  const ihdr = chunks.find(chunk => chunk.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const colorType = ihdr.readUInt8(9);
  const bytesPerPixel = { 2: 3, 6: 4 }[colorType];
  if (!bytesPerPixel) {
    throw new Error(
      `lerPixelsPng: color type ${colorType} não suportado (só RGB/RGBA)`
    );
  }
  const idat = Buffer.concat(
    chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data)
  );
  const raw = zlib.inflateSync(idat);
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(height * stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const filt = raw[rawOffset + x];
      const a = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c =
        y > 0 && x >= bytesPerPixel
          ? pixels[(y - 1) * stride + x - bytesPerPixel]
          : 0;
      let value;
      switch (filterType) {
        case 0:
          value = filt;
          break;
        case 1:
          value = filt + a;
          break;
        case 2:
          value = filt + b;
          break;
        case 3:
          value = filt + Math.floor((a + b) / 2);
          break;
        case 4:
          value = filt + paethPredictor(a, b, c);
          break;
        default:
          throw new Error(`lerPixelsPng: filtro desconhecido ${filterType}`);
      }
      pixels[y * stride + x] = value & 0xff;
    }
    rawOffset += stride;
  }
  return {
    width,
    height,
    bytesPerPixel,
    getPixel(x, y) {
      const i = y * stride + x * bytesPerPixel;
      return Array.from(pixels.subarray(i, i + bytesPerPixel));
    },
  };
}

describe('manifest.json', () => {
  it('declara exatamente 3 ícones reais, com tamanhos e purpose corretos', () => {
    expect(manifest.icons).toHaveLength(3);

    const [icon192, icon512, iconMaskable] = manifest.icons;

    expect(icon192).toMatchObject({ sizes: '192x192', purpose: 'any' });
    expect(icon512).toMatchObject({ sizes: '512x512', purpose: 'any' });
    expect(iconMaskable).toMatchObject({
      sizes: '512x512',
      purpose: 'maskable',
    });

    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
  });

  it.each(manifest.icons)(
    '$src existe em public/ e suas dimensões reais (lidas do PNG) batem com sizes ($sizes)',
    ({ src, sizes }) => {
      const iconPath = path.join(process.cwd(), 'public', src);
      expect(fs.existsSync(iconPath)).toBe(true);

      const [expectedWidth, expectedHeight] = sizes.split('x').map(Number);
      const { width, height } = readPngDimensions(iconPath);

      expect(width).toBe(expectedWidth);
      expect(height).toBe(expectedHeight);
    }
  );
});

// AC-005-001 (oráculo de não-regressão · DEC-006-008 · demonstracao): nenhum
// byte dos 6 arquivos da marca padrão muda com este PLAN — prova mecânica,
// não promessa de "não editei".
describe('oráculo de não-regressão — marca padrão (DEC-006-008 · demonstracao)', () => {
  it.each(Object.entries(HASHES_MARCA_PADRAO))(
    'public/%s tem hash SHA-256 idêntico ao capturado no PLAN',
    (arquivo, hashEsperado) => {
      const caminho = path.join(process.cwd(), 'public', arquivo);
      expect(sha256(caminho)).toBe(hashEsperado);
    }
  );
});

// AC-005-017/AC-005-009/AC-005-014/AC-005-011/AC-005-016/AC-005-012
// (DEC-006-002/007/008 · demonstracao): imagens e manifesto da marca
// fictícia — dimensão/formato equivalentes à padrão, conteúdo próprio
// (hash distinto), consistência com o registro e com os campos não-marca
// do manifesto padrão.
describe('marca fictícia (DEC-006-002/007/008 · demonstracao)', () => {
  const basePath = path.join(process.cwd(), 'public', 'marcas', 'exemplo');

  it.each([
    ['icon-192.png', 192, 192],
    ['icon-512.png', 512, 512],
    ['icon-maskable.png', 512, 512],
    ['logo-claro.png', 225, 224],
    ['logo-escuro.png', 225, 224],
  ])(
    '%s tem dimensão real %sx%s',
    (arquivo, larguraEsperada, alturaEsperada) => {
      const { width, height } = readPngDimensions(path.join(basePath, arquivo));
      expect(width).toBe(larguraEsperada);
      expect(height).toBe(alturaEsperada);
    }
  );

  it('logo-escuro.png tem canal alfa (RGBA ou grayscale+alpha) — legível em fundo escuro', () => {
    const colorType = readPngColorType(path.join(basePath, 'logo-escuro.png'));
    expect([4, 6]).toContain(colorType);
  });

  it('icon-maskable.png pinta o monograma só dentro do círculo de 80% (raio ≤ 0,4×512)', () => {
    const imagem = lerPixelsPng(path.join(basePath, 'icon-maskable.png'));
    const centro = imagem.width / 2;
    const raioForaDaZonaSegura = Math.round(0.41 * imagem.width);

    const bordas = [
      [centro, centro - raioForaDaZonaSegura], // 12 horas
      [centro, centro + raioForaDaZonaSegura], // 6 horas
      [centro - raioForaDaZonaSegura, centro], // 9 horas
      [centro + raioForaDaZonaSegura, centro], // 3 horas
    ];

    for (const [x, y] of bordas) {
      const pixel = imagem.getPixel(x, y);
      const transparente = imagem.bytesPerPixel === 4 && pixel[3] === 0;
      const corDeFundo = pixel
        .slice(0, 3)
        .every(
          (canal, i) => canal === COR_DE_FUNDO_ICONE_MASCARAVEL_FICTICIO[i]
        );
      expect(transparente || corDeFundo).toBe(true);
    }
  });

  it('manifest.json fictício tem nome, nome curto e descrição iguais ao registro (fonte única, MARCAS.exemplo)', () => {
    expect(manifestFicticio.name).toBe(MARCAS.exemplo.nome);
    expect(manifestFicticio.short_name).toBe(MARCAS.exemplo.nomeCurto);
    expect(manifestFicticio.description).toBe(MARCAS.exemplo.descricao);
  });

  it('manifest.json fictício lista os 3 ícones, na ordem icone192/icone512/iconeMaskable, com sizes/purpose da marca padrão', () => {
    expect(manifestFicticio.icons).toEqual([
      {
        src: MARCAS.exemplo.icone192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: MARCAS.exemplo.icone512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: MARCAS.exemplo.iconeMaskable,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
  });

  it.each([
    'start_url',
    'display',
    'background_color',
    'theme_color',
    'orientation',
  ])(
    'manifest.json fictício tem "%s" idêntico ao manifesto padrão (valores de produto, não de marca — FR-005-011)',
    campo => {
      expect(manifestFicticio[campo]).toBe(manifest[campo]);
    }
  );

  it('icon-192.png fictício existe e tem hash diferente do icon-192.png padrão (AC-005-014)', () => {
    const caminhoFicticio = path.join(basePath, 'icon-192.png');
    expect(fs.existsSync(caminhoFicticio)).toBe(true);
    expect(sha256(caminhoFicticio)).not.toBe(
      sha256(path.join(process.cwd(), 'public', 'icon-192.png'))
    );
  });

  const arquivosFicticios = [
    'logo-claro.png',
    'logo-escuro.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable.png',
    'manifest.json',
  ];
  const paresFicticioXPadrao = arquivosFicticios.flatMap(ficticio =>
    Object.keys(HASHES_MARCA_PADRAO).map(padrao => [ficticio, padrao])
  );

  it.each(paresFicticioXPadrao)(
    'hash de marcas/exemplo/%s é diferente do hash de public/%s (AC-005-012/FR-005-013)',
    (ficticio, padrao) => {
      const hashFicticio = sha256(path.join(basePath, ficticio));
      expect(hashFicticio).not.toBe(HASHES_MARCA_PADRAO[padrao]);
    }
  );
});
