'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { classNameDefault, BaseField } from './base';
import { Loading } from '../Loading';
import { normalizeSearchText } from '@/utils/matchesSearchText';

export const SearchableSelectField = ({
  htmlFor,
  label,
  placeholder,
  value,
  onChange,
  options = [],
  isLoading = false,
  errorMessage,
  inputGroupClass,
  labelClass,
  className,
}) => {
  className ||= classNameDefault;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const listboxId = `${htmlFor}-listbox`;

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
  const displayValue = isOpen ? query : selectedOption?.label || '';

  const openList = () => {
    const selectedIndex = normalizedOptions.findIndex(
      option => option.value === value
    );
    setIsOpen(true);
    setQuery('');
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
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
    setHighlightedIndex(0);
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
      setHighlightedIndex(index =>
        Math.min(index + 1, filteredOptions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(index => Math.max(index - 1, 0));
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

  return (
    <BaseField
      htmlFor={htmlFor}
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
          autoComplete="off"
          placeholder={placeholder}
          value={displayValue}
          onClick={handleInputClick}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`${className} pr-10`}
          data-testid="searchable-select-field-input"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          <ChevronDown size={20} strokeWidth={1.5} />
        </div>

        {isOpen && (
          <div
            className="absolute z-10 mt-1 w-full rounded-md border-main bg-main shadow-sm max-h-60 overflow-auto"
            data-testid="searchable-select-field-dropdown"
          >
            {isLoading && !errorMessage ? (
              <Loading />
            ) : (
              <>
                {errorMessage && (
                  <p
                    className="px-3 py-2 text-sm text-red-600"
                    data-testid="searchable-select-field-error"
                  >
                    {errorMessage}
                  </p>
                )}
                {filteredOptions.length === 0 ? (
                  <p
                    className="px-3 py-2 text-sm text-muted"
                    data-testid="searchable-select-field-empty"
                  >
                    Nenhum resultado encontrado.
                  </p>
                ) : (
                  <ul
                    id={listboxId}
                    role="listbox"
                    data-testid="searchable-select-field-listbox"
                  >
                    {filteredOptions.map((option, index) => (
                      <li
                        key={option.value}
                        role="option"
                        aria-selected={index === highlightedIndex}
                        data-testid="searchable-select-field-option"
                        className={
                          index === highlightedIndex
                            ? 'bg-secondary px-3 py-2 cursor-pointer tap-target'
                            : 'px-3 py-2 cursor-pointer tap-target hover:bg-secondary'
                        }
                        onClick={() => selectOption(option)}
                      >
                        {option.label}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </BaseField>
  );
};
