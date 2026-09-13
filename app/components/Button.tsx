"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "primary",
  outline: "outline",
  danger: "danger",
};

export default function Button({
  variant,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const resolvedClassName = [
    "ui-button",
    variant ? variantClasses[variant] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button {...props} className={resolvedClassName}>
      {children}
    </button>
  );
}
