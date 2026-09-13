"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import CustomInput from "./CustomInput";
import { ChevronDownIcon } from "./icons";

type CustomSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "multiple" | "size"
> & {
  children: ReactNode;
};

type OptionNodeProps = {
  children?: ReactNode;
  disabled?: boolean;
  value?: string | number;
};

type SelectOption = {
  disabled: boolean;
  key: string;
  label: ReactNode;
  text: string;
  value: string;
};

const textFromNode = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromNode(node.props.children);
  }
  return "";
};

const normalizeValue = (
  value: CustomSelectProps["value"] | CustomSelectProps["defaultValue"],
) => {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value == null ? "" : String(value);
};

export default function CustomSelect({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  defaultValue,
  disabled,
  id,
  name,
  onChange,
  required,
  title,
  value,
}: CustomSelectProps) {
  const generatedId = useId();
  const triggerId = id || `${generatedId}-trigger`;
  const listboxId = `${generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isControlled = value !== undefined;
  const options = useMemo<SelectOption[]>(
    () =>
      Children.toArray(children).flatMap((child, index) => {
        if (!isValidElement<OptionNodeProps>(child) || child.type !== "option") {
          return [];
        }

        const text = textFromNode(child.props.children);
        const optionValue =
          child.props.value === undefined ? text : String(child.props.value);

        return {
          disabled: Boolean(child.props.disabled),
          key: child.key ?? `${optionValue}-${index}`,
          label: child.props.children,
          text,
          value: optionValue,
        };
      }),
    [children],
  );
  const firstEnabled = options.find((option) => !option.disabled);
  const normalizedDefaultValue = normalizeValue(defaultValue);
  const [internalValue, setInternalValue] = useState(
    defaultValue === undefined ? firstEnabled?.value || "" : normalizedDefaultValue,
  );
  const selectedValue = isControlled ? normalizeValue(value) : internalValue;
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue,
  );
  const selectedOption = options[selectedIndex] || firstEnabled;
  const isPlaceholderValue = selectedOption?.value === "";
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0,
  );
  const rootClasses = [
    "custom-select",
    open ? "open" : "",
    disabled ? "disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (isControlled) return;
    if (!options.length) return;
    if (options.some((option) => option.value === internalValue)) return;
    setInternalValue(firstEnabled?.value || "");
  }, [firstEnabled?.value, internalValue, isControlled, options]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const openMenu = () => {
    if (disabled || !options.length) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const enabledIndexFrom = (index: number, direction: 1 | -1) => {
    if (!options.length) return -1;
    let nextIndex = index;

    for (let step = 0; step < options.length; step += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) return nextIndex;
    }

    return -1;
  };

  const selectValue = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    setOpen(false);
    triggerRef.current?.focus();

    if (nextValue === selectedValue) return;

    onChange?.({
      currentTarget: { name, value: nextValue },
      target: { name, value: nextValue },
    } as ChangeEvent<HTMLSelectElement>);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }

    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = enabledIndexFrom(activeIndex, direction);
      if (nextIndex >= 0) setActiveIndex(nextIndex);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const enabledOptions = options
        .map((option, index) => ({ index, option }))
        .filter(({ option }) => !option.disabled);
      const next = event.key === "Home" ? enabledOptions[0] : enabledOptions.at(-1);
      if (next) setActiveIndex(next.index);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option && !option.disabled) selectValue(option.value);
    }
  };

  return (
    <div className={rootClasses} ref={rootRef}>
      {name && (
        <CustomInput
          disabled={disabled}
          name={name}
          readOnly
          required={required}
          type="hidden"
          value={selectedValue}
        />
      )}
      <button
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled || undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-required={required || undefined}
        className="custom-select__button"
        disabled={disabled}
        id={triggerId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        role="combobox"
        title={title}
        type="button"
      >
        <span
          className={[
            "custom-select__value",
            isPlaceholderValue ? "is-placeholder" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {selectedOption?.label || "Izaberite"}
        </span>
        <ChevronDownIcon className="custom-select__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="custom-select__menu" id={listboxId} role="listbox">
          {options.map((option, index) => (
            <button
              aria-disabled={option.disabled || undefined}
              aria-selected={option.value === selectedValue}
              className={[
                "custom-select__option",
                option.value === selectedValue ? "selected" : "",
                index === activeIndex ? "active" : "",
                option.disabled ? "disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={option.disabled}
              id={`${listboxId}-${index}`}
              key={option.key}
              onClick={() => selectValue(option.value)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              title={option.text}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
