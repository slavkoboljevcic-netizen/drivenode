"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

type CustomInputProps = InputHTMLAttributes<HTMLInputElement>;

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    const resolvedClassName = [
      "custom-input",
      type ? `custom-input--${type}` : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <input
        {...props}
        className={resolvedClassName}
        ref={ref}
        type={type}
      />
    );
  },
);

CustomInput.displayName = "CustomInput";

export default CustomInput;
