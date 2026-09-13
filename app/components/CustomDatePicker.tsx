"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import Button from "./Button";
import CustomInput from "./CustomInput";
import {
  BackIcon,
  CalendarIcon,
  ChevronRightIcon,
} from "./icons";

type CustomDatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children" | "onChange" | "type" | "value"
> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: "date" | "datetime-local";
  value?: string;
};

type ParsedValue = {
  date: Date | null;
  hour: number;
  minute: number;
};

const weekdays = ["P", "U", "S", "Č", "P", "S", "N"];
const monthFormatter = new Intl.DateTimeFormat("sr-Latn-RS", {
  month: "long",
  year: "numeric",
});
const pad = (value: number) => String(value).padStart(2, "0");

const parseValue = (value = ""): ParsedValue => {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
  );
  if (!match) return { date: null, hour: 9, minute: 0 };

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return { date: null, hour: 9, minute: 0 };
  }

  return {
    date,
    hour: Number(match[4] ?? 9),
    minute: Number(match[5] ?? 0),
  };
};

const formatValue = (
  date: Date,
  type: NonNullable<CustomDatePickerProps["type"]>,
  hour: number,
  minute: number,
) => {
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;

  return type === "datetime-local"
    ? `${datePart}T${pad(hour)}:${pad(minute)}`
    : datePart;
};

const displayValue = (
  value: string | undefined,
  type: NonNullable<CustomDatePickerProps["type"]>,
) => {
  const parsed = parseValue(value);
  if (!parsed.date) return "";

  const datePart = `${pad(parsed.date.getDate())}. ${pad(
    parsed.date.getMonth() + 1,
  )}. ${parsed.date.getFullYear()}.`;

  return type === "datetime-local"
    ? `${datePart}, ${pad(parsed.hour)}:${pad(parsed.minute)}`
    : datePart;
};

const sameDay = (a: Date | null, b: Date) =>
  Boolean(
    a &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate(),
  );

const monthDaysFor = (viewDate: Date) => {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - ((monthStart.getDay() + 6) % 7));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const makeChangeEvent = (
  name: string | undefined,
  value: string,
): ChangeEvent<HTMLInputElement> =>
  ({
    currentTarget: { name, value },
    target: { name, value },
  }) as ChangeEvent<HTMLInputElement>;

export default function CustomDatePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  className,
  disabled,
  id,
  name,
  onChange,
  placeholder,
  required,
  title,
  type = "date",
  value = "",
}: CustomDatePickerProps) {
  const generatedId = useId();
  const inputId = id || `${generatedId}-date`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(parsed.date || new Date());
  const hourOptions = Array.from({ length: 24 }, (_, index) => index);
  const minuteOptions = useMemo(() => {
    const options = Array.from({ length: 12 }, (_, index) => index * 5);
    if (!options.includes(parsed.minute)) options.push(parsed.minute);
    return options.sort((a, b) => a - b);
  }, [parsed.minute]);
  const pickerClasses = ["custom-date-picker", open ? "open" : "", className]
    .filter(Boolean)
    .join(" ");
  const visualValue = displayValue(value, type);
  const monthDays = monthDaysFor(viewDate);
  const today = new Date();

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const emit = (nextValue: string) => {
    onChange?.(makeChangeEvent(name, nextValue));
  };

  const openPicker = () => {
    if (disabled) return;
    setViewDate(parsed.date || new Date());
    setOpen(true);
  };

  const selectDate = (date: Date) => {
    emit(formatValue(date, type, parsed.hour, parsed.minute));
    if (type === "date") {
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  const selectTime = (hour: number, minute: number) => {
    emit(formatValue(parsed.date || viewDate, type, hour, minute));
  };

  const moveMonth = (direction: number) => {
    setViewDate((date) => {
      const nextDate = new Date(date);
      nextDate.setMonth(nextDate.getMonth() + direction);
      return nextDate;
    });
  };

  const clear = () => {
    emit("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const setToday = () => {
    emit(formatValue(today, type, parsed.hour, parsed.minute));
    setViewDate(today);
    if (type === "date") setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "Enter") {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className={pickerClasses} ref={rootRef}>
      {name && <CustomInput name={name} readOnly type="hidden" value={value} />}
      <div className="custom-date-picker__control">
        <CustomInput
          aria-describedby={ariaDescribedBy}
          aria-label={ariaLabel}
          className="custom-date-picker__input"
          disabled={disabled}
          id={inputId}
          inputMode="numeric"
          onChange={() => undefined}
          onClick={openPicker}
          onFocus={openPicker}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (type === "datetime-local"
              ? "dd. mm. yyyy, --:--"
              : "dd. mm. yyyy")
          }
          required={required}
          title={title}
          type="text"
          value={visualValue}
        />
        <Button
          aria-label="Otvori kalendar"
          className="custom-date-picker__icon"
          disabled={disabled}
          onClick={open ? () => setOpen(false) : openPicker}
          type="button"
        >
          <CalendarIcon aria-hidden="true" />
        </Button>
      </div>
      {open && (
        <div
          aria-label="Izbor datuma"
          className="custom-date-picker__panel"
          role="dialog"
        >
          <div className="custom-date-picker__calendar">
            <div className="custom-date-picker__header">
              <Button
                aria-label="Prethodni mesec"
                onClick={() => moveMonth(-1)}
                type="button"
              >
                <BackIcon aria-hidden="true" />
              </Button>
              <strong>{monthFormatter.format(viewDate)}</strong>
              <Button
                aria-label="Sledeći mesec"
                onClick={() => moveMonth(1)}
                type="button"
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
            <div className="custom-date-picker__weekdays">
              {weekdays.map((weekday, index) => (
                <span key={`${weekday}-${index}`}>{weekday}</span>
              ))}
            </div>
            <div className="custom-date-picker__days">
              {monthDays.map((date) => (
                <Button
                  className={[
                    date.getMonth() !== viewDate.getMonth() ? "muted" : "",
                    sameDay(parsed.date, date) ? "selected" : "",
                    sameDay(today, date) ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={date.toISOString()}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getDate()}
                </Button>
              ))}
            </div>
            <div className="custom-date-picker__footer">
              <Button onClick={clear} type="button">
                Očisti
              </Button>
              <Button onClick={setToday} type="button">
                Danas
              </Button>
            </div>
          </div>
          {type === "datetime-local" && (
            <div className="custom-date-picker__time" aria-label="Vreme">
              <div>
                <span>Sat</span>
                <div>
                  {hourOptions.map((hour) => (
                    <Button
                      className={hour === parsed.hour ? "selected" : ""}
                      key={hour}
                      onClick={() => selectTime(hour, parsed.minute)}
                      type="button"
                    >
                      {pad(hour)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <span>Min</span>
                <div>
                  {minuteOptions.map((minute) => (
                    <Button
                      className={minute === parsed.minute ? "selected" : ""}
                      key={minute}
                      onClick={() => selectTime(parsed.hour, minute)}
                      type="button"
                    >
                      {pad(minute)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
