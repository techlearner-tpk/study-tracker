"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";

type ConfirmSubmitButtonProps = ComponentProps<typeof Button> & {
  confirmationMessage: string;
};

export function ConfirmSubmitButton({ confirmationMessage, onClick, ...props }: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    />
  );
}
