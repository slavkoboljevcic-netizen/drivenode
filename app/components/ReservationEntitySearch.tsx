"use client";

import { useEffect, useId, useState } from "react";
import Button from "./Button";
import CustomInput from "./CustomInput";

export type ReservationSearchOption = {
  id: number;
  label: string;
  meta: string;
  searchText: string;
  selectedText: string;
  subtitle: string;
};

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function ReservationEntitySearch({
  disabled,
  emptyMessage,
  inputId,
  loading,
  loadingPlaceholder,
  noOptionsMessage,
  onSelect,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  emptyMessage: string;
  inputId: string;
  loading: boolean;
  loadingPlaceholder: string;
  noOptionsMessage: string;
  onSelect: (id: string) => void;
  options: ReservationSearchOption[];
  placeholder: string;
  value: string;
}) {
  const listboxId = useId();
  const selectedOption = options.find((option) => option.id === Number(value));
  const selectedText = selectedOption?.selectedText;
  const [query, setQuery] = useState(selectedText || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  useEffect(() => {
    if (value && selectedText) setQuery(selectedText);
  }, [selectedText, value]);
  const normalizedQuery = normalizeSearch(query);
  const compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, "");
  const matches = normalizedQuery
    ? options
        .filter((option) => {
          const text = normalizeSearch(option.searchText);
          const compactText = text.replace(/[^a-z0-9]/g, "");
          return (
            text.includes(normalizedQuery) ||
            (compactQuery.length > 0 && compactText.includes(compactQuery))
          );
        })
        .slice(0, 8)
    : [];
  const showResults = open && normalizedQuery.length > 0;

  const choose = (option: ReservationSearchOption) => {
    onSelect(String(option.id));
    setQuery(option.selectedText);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div
      className="reservation-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <CustomInput
        aria-activedescendant={
          showResults && activeIndex >= 0 && matches[activeIndex]
            ? `${listboxId}-${matches[activeIndex].id}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={showResults ? listboxId : undefined}
        aria-expanded={showResults}
        autoComplete="off"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          setQuery(event.target.value);
          onSelect("");
          setOpen(Boolean(event.target.value.trim()));
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (!value && query.trim()) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (!showResults || !matches.length) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((current) => {
              if (current < 0)
                return direction === 1 ? 0 : matches.length - 1;
              return (current + direction + matches.length) % matches.length;
            });
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(matches[activeIndex >= 0 ? activeIndex : 0]);
          }
        }}
        placeholder={
          loading
            ? loadingPlaceholder
            : options.length
              ? placeholder
              : noOptionsMessage
        }
        role="combobox"
        value={query}
      />
      {showResults && (
        <div
          className="reservation-search-results"
          id={listboxId}
          role="listbox"
        >
          {matches.map((option, index) => (
            <Button
              aria-selected={index === activeIndex}
              className={`reservation-search-option${index === activeIndex ? " active" : ""}`}
              id={`${listboxId}-${option.id}`}
              key={option.id}
              onClick={() => choose(option)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <strong>
                {option.label} <em>{option.meta}</em>
              </strong>
              <span>{option.subtitle}</span>
            </Button>
          ))}
          {!matches.length && (
            <div className="reservation-search-state">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}
