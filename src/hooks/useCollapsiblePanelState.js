'use client';

import { useCallback, useState } from 'react';
import {
  loadPanelState,
  loadPanelStateMap,
  savePanelState,
  savePanelStateMap,
} from '@/utils/filterStorage';

const ABERTO = 'aberto';
const RECOLHIDO = 'recolhido';

function isConfigDeMapa(storageKey) {
  return (
    storageKey !== null &&
    typeof storageKey === 'object' &&
    Object.hasOwn(storageKey, 'mapKey')
  );
}

/**
 * Estado de abertura (`isOpen`) e persistência de um painel colapsável.
 *
 * `storageKey` é uma string (chave fixa, ex.: `panel_aulas`) ou
 * `{ mapKey, itemId }` (variante de chave-mapa usada em `/relatorios`, onde os
 * cards são dinâmicos), delegando a `loadPanelStateMap`/`savePanelStateMap`.
 *
 * `isOpen` é inicializado sincronamente no inicializador do `useState` — nunca
 * corrigido depois em `useEffect` — para convergir, sem frame intermediário,
 * com o `<script>` anti-flash renderizado por `PainelFiltrosColapsavel`
 * (DEC-002-001). Default `aberto` quando não há preferência salva ou quando a
 * leitura/gravação falha (fail secure).
 *
 * Não renderiza markup nem emite o script anti-flash — isso é responsabilidade
 * de `PainelFiltrosColapsavel`.
 */
export function useCollapsiblePanelState(storageKey) {
  const usaMapa = isConfigDeMapa(storageKey);
  const mapKey = usaMapa ? storageKey.mapKey : null;
  const itemId = usaMapa ? storageKey.itemId : null;

  const [isOpen, setIsOpen] = useState(() => {
    const preferencia = usaMapa
      ? loadPanelStateMap(mapKey, itemId, ABERTO)
      : loadPanelState(storageKey, ABERTO);
    return preferencia !== RECOLHIDO;
  });

  const toggle = useCallback(() => {
    setIsOpen(atual => {
      const proximo = !atual;
      try {
        const valor = proximo ? ABERTO : RECOLHIDO;
        if (usaMapa) {
          savePanelStateMap(mapKey, itemId, valor);
        } else {
          savePanelState(storageKey, valor);
        }
        return proximo;
      } catch {
        // Fail secure: leitura/gravação que lança nunca propaga para fora do
        // hook e nunca deixa o painel recolhido sem persistência confiável.
        return true;
      }
    });
  }, [usaMapa, mapKey, itemId, storageKey]);

  return { isOpen, toggle };
}
