"use client";

import type { KeyboardEvent, ReactNode } from "react";
import Button from "./Button";
import { AddIcon, KpiIcon } from "./icons";

type Tone = "blue" | "green" | "violet" | "amber" | "red" | "cyan";

export function onKeyboardAction(action: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  onAction,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h1>{title}</h1>
        <small>{subtitle}</small>
      </div>
      {action && (
        <Button variant="primary" className="standalone" onClick={onAction}>
          <AddIcon className="button-icon" aria-hidden="true" />
          {action}
        </Button>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  description,
  metric,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  description: string;
  metric: string;
  tone: Tone | string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`kpi-icon ${tone}`}>
        <KpiIcon aria-hidden="true" />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <footer>
        <small>{description}</small>
        <b className={tone}>{metric}</b>
      </footer>
    </>
  );

  if (onClick) {
    return (
      <Button type="button" className="kpi clickable" onClick={onClick}>
        {content}
      </Button>
    );
  }

  return <article className="kpi">{content}</article>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-table">{children}</div>;
}

export function DrawerFrame({
  children,
  close,
  className = "",
}: {
  children: ReactNode;
  close: () => void;
  className?: string;
}) {
  return (
    <div className="drawer-wrap">
      <Button
        type="button"
        className="drawer-backdrop"
        aria-label="Zatvori panel"
        onClick={close}
      />
      <aside className={["drawer", className].filter(Boolean).join(" ")}>
        {children}
      </aside>
    </div>
  );
}
