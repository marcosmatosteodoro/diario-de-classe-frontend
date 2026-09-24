'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { classNameDefault, BaseField } from './base';
import { Loading } from '../Loading';
import { normalizeSearchText } from '@/utils/matchesSearchText';

export const SearchableSelectField = ({
  htmlFor,
  required,
  label,
  placeholder,
  value,
  onChange,
  options = [],
  isLoading = false,
  errorMessage,
  disabledReason,
  selectedLabel,
  requiredError,
  inputGroupClass,
  labelClass,
  className,
}) => {
  className ||= classNameDefault;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  // -1: nenhuma opção destacada (estado inicial ao abrir/filtrar — sem
  // destaque automático).
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef([]);

  const listboxId = `${htmlFor}-listbox`;
  const requiredErrorId = `${htmlFor}-required-error`;

  // DEC-002-005: a lista de rótulos normaliza uma vez por mudança de `options`
  // (memoizada); a query normaliza a cada tecla, sem renormalizar os rótulos.
  const normalizedOptions = useMemo(
    () =>
      options.map(option => ({
        ...option,
        normalizedLabel: normalizeSearchText(option.label),
      })),
    [options]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery === '') {
      return normalizedOptions;
    }
    return normalizedOptions.filter(option =>
      option.normalizedLabel.includes(normalizedQuery)
    );
  }, [normalizedOptions, query]);

  const selectedOption = options.find(option => option.value === value);
  // FR-001-010/DEC-002-007: `selectedLabel` só entra quando `value` não bate
  // com nenhuma opção carregada; sem a prop e sem correspondência, cai no
  // próprio `value` bruto (nunca string vazia, para não parecer descarte
  // silencioso). Value vazio continua vazio.
  const resolvedLabel = selectedOption
    ? selectedOption.label
    : value
      ? selectedLabel || String(value)
      : '';
  const displayValue = isOpen ? query : resolvedLabel;

  // Posição de `value` dentro da lista completa (não filtrada) — usada só
  // para rolar até a opção atual ao abrir; a marca visual em si deriva por
  // opção, no render.
  const currentValueIndex = useMemo(
    () => normalizedOptions.findIndex(option => option.value === value),
    [normalizedOptions, value]
  );

  // Item destacado sempre alcançável por rolagem: sem isso, ArrowDown além da
  // área visível do dropdown move o destaque sem o usuário ver, e Enter
  // confirma uma opção nunca vista.
  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [highlightedIndex]);

  // Rola até a opção correspondente a `value` só na transição de abertura
  // (nunca escreve em `highlightedIndex`, que continua exclusivo do destaque
  // de navegação) — por isso o efeito depende só de `isOpen`, não de
  // `currentValueIndex` (que muda a cada tecla e não deve re-disparar a
  // rolagem enquanto o dropdown permanece aberto).
  useEffect(() => {
    if (!isOpen || currentValueIndex < 0) return;
    optionRefs.current[currentValueIndex]?.scrollIntoView?.({
      block: 'nearest',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const openList = () => {
    setIsOpen(true);
    setQuery('');
    setHighlightedIndex(-1);
  };

  const selectOption = option => {
    onChange({ target: { name: htmlFor, value: option.value } });
    setIsOpen(false);
    setQuery('');
  };

  const handleInputClick = () => {
    if (!isOpen) {
      openList();
    }
  };

  const handleInputChange = e => {
    if (!isOpen) {
      setIsOpen(true);
    }
    setQuery(e.target.value);
    setHighlightedIndex(-1);
  };

  // FR-001-016/AC-001-013: Tab ou clique fora com texto digitado e nenhuma
  // opção selecionada descarta o texto, sem alterar `value` — nunca chama
  // `onChange`. Clicar numa opção não deve disparar este blur antes do
  // `onClick` da opção: o `onMouseDown` com `preventDefault` no dropdown
  // (abaixo) impede o input de perder foco ao clicar dentro dele.
  const handleBlur = () => {
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange({ target: { name: htmlFor, value: '' } });
  };

  const handleKeyDown = e => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex(index =>
        index === -1 ? 0 : Math.min(index + 1, filteredOptions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex(index =>
        index === -1 ? filteredOptions.length - 1 : Math.max(index - 1, 0)
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) {
        selectOption(option);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const showError = Boolean(errorMessage);
  // A condição usa `options.length` (não `filteredOptions.length`) para
  // distinguir "não carregou nada" (erro com options vazio: só o erro) de
  // "busca sem resultado" sobre lista carregada (erro com options
  // preenchida: os dois, erro e vazio).
  const showEmptyText =
    filteredOptions.length === 0 && !(showError && options.length === 0);
  const hasRequiredError = Boolean(requiredError);

  return (
    <BaseField
      htmlFor={htmlFor}
      required={required}
      label={label}
      inputGroupClass={inputGroupClass}
      labelClass={labelClass}
    >
      <div className="relative">
        <input
          id={htmlFor}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-busy={isLoading ? 'true' : undefined}
          aria-invalid={hasRequiredError ? 'true' : undefined}
          aria-describedby={hasRequiredError ? requiredErrorId : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={displayValue}
          onClick={handleInputClick}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`${className} ${value ? 'pr-16' : 'pr-10'}`}
          data-testid="searchable-select-field-input"
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 tap-target flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
            aria-label="Limpar seleção"
            data-testid="searchable-select-field-clear"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          <ChevronDown size={20} strokeWidth={1.5} />
        </div>

        {isOpen && (
          <div
            className="absolute z-10 mt-1 w-full rounded-md border border-main bg-main input-field shadow-sm max-h-60 overflow-auto"
            data-testid="searchable-select-field-dropdown"
            onMouseDown={e => e.preventDefault()}
          >
            {disabledReason ? (
              <p
                role="status"
                className="px-3 py-2 text-sm text-muted"
                data-testid="searchable-select-field-disabled-reason"
              >
                {disabledReason}
              </p>
            ) : isLoading && !showError ? (
              <Loading />
            ) : (
              <>
                {showError && (
                  <p
                    className="px-3 py-2 text-sm text-red-600"
                    data-testid="searchable-select-field-error"
                  >
                    {errorMessage}
                  </p>
                )}
                {showEmptyText && (
                  <p
                    role="status"
                    className="px-3 py-2 text-sm text-muted"
                    data-testid="searchable-select-field-empty"
                  >
                    Nenhum resultado encontrado.
                  </p>
                )}
                {filteredOptions.length > 0 && (
                  <ul
                    id={listboxId}
                    role="listbox"
                    data-testid="searchable-select-field-listbox"
                  >
                    {filteredOptions.map((option, index) => {
                      const isCurrentValue = option.value === value;
                      return (
                        <li
                          key={option.value}
                          ref={el => {
                            optionRefs.current[index] = el;
                          }}
                          role="option"
                          aria-selected={index === highlightedIndex}
                          data-testid="searchable-select-field-option"
                          data-current={isCurrentValue ? 'true' : undefined}
                          className={`px-3 py-2 cursor-pointer tap-target flex items-center gap-2${
                            index === highlightedIndex
                              ? ' option-highlighted'
                              : ''
                          }${isCurrentValue ? ' font-semibold' : ''}`}
                          onClick={() => selectOption(option)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          {isCurrentValue && (
                            <Check
                              size={16}
                              strokeWidth={2}
                              className="shrink-0"
                              data-testid="searchable-select-field-current-mark"
                            />
                          )}
                          <span className="min-w-0 flex-1 break-words">
                            {option.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {hasRequiredError && (
        <p
          id={requiredErrorId}
          role="alert"
          className="mt-1 text-sm text-red-600"
          data-testid="searchable-select-field-required-error"
        >
          {requiredError}
        </p>
      )}
    </BaseField>
  );
};
