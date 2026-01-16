import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CurrencyCode = "BRL" | "USD" | "EUR";

interface CurrencyConfig {
  symbol: string;
  locale: string;
}

const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  BRL: { symbol: "R$", locale: "pt-BR" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
};

const digitsOnly = (input: string) => input.replace(/\D+/g, "");

/**
 * Parse a formatted currency string to a raw number.
 * NOTE: This is best-effort; for the robust input use CurrencyInput (digits->cents).
 */
export const parseCurrencyValue = (
  value: string,
  _currency: CurrencyCode = "BRL"
): number | null => {
  if (!value || value.trim() === "") return null;
  const digits = digitsOnly(value);
  if (!digits) return null;
  return Number(digits) / 100;
};

/**
 * Format a number to a currency string (with 2 decimals).
 */
export const formatCurrencyValue = (
  value: number | null | undefined,
  currency: CurrencyCode = "BRL",
  showSymbol: boolean = true
): string => {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  const { locale, symbol } = CURRENCY_CONFIGS[currency];
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  return showSymbol ? `${symbol} ${formatted}` : formatted;
};

/**
 * Read-only display formatter.
 */
export const formatCurrencyDisplay = (
  value: number | string | null | undefined,
  currency: CurrencyCode = "BRL"
): string => {
  if (value === null || value === undefined || value === "") return "Não informado";

  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "Não informado";

  const { locale, symbol } = CURRENCY_CONFIGS[currency];
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  return `${symbol} ${formatted}`;
};

interface CurrencyInputProps {
  value: number | null;
  currency: CurrencyCode;
  onValueChange: (value: number | null) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCurrencySelector?: boolean;
}

/**
 * Robust "digits -> cents" currency input.
 *
 * Rules:
 * - Only digits are accepted.
 * - Each digit appends to the end.
 * - Backspace removes last digit.
 * - Paste keeps only digits.
 * - Display is always formatted with Intl.NumberFormat.
 */
export function CurrencyInput({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  placeholder = "0,00",
  disabled = false,
  className,
  showCurrencySelector = true,
}: CurrencyInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [centsDigits, setCentsDigits] = React.useState<string>("");

  const { locale, symbol } = CURRENCY_CONFIGS[currency];

  const formatted = React.useMemo(() => {
    const cents = centsDigits ? Number(centsDigits) : null;
    if (cents === null || !Number.isFinite(cents)) return "";

    const amount = cents / 100;
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [centsDigits, locale]);

  // Keep internal digits in sync with external value changes.
  React.useEffect(() => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      if (centsDigits !== "") setCentsDigits("");
      return;
    }

    const cents = Math.round(Number(value) * 100);
    const next = String(cents);
    if (next !== centsDigits) setCentsDigits(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = React.useCallback(
    (nextDigits: string) => {
      setCentsDigits(nextDigits);
      if (!nextDigits) {
        onValueChange(null);
        return;
      }
      const cents = Number(nextDigits);
      if (!Number.isFinite(cents)) {
        onValueChange(null);
        return;
      }
      onValueChange(cents / 100);
    },
    [onValueChange]
  );

  const keepCaretAtEnd = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    // next tick to ensure value is updated
    requestAnimationFrame(() => {
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // ignore
      }
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    const key = e.key;

    // Allow navigation keys
    if (
      key === "Tab" ||
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "Home" ||
      key === "End"
    ) {
      return;
    }

    if (key === "Backspace") {
      e.preventDefault();
      emit(centsDigits.slice(0, -1));
      keepCaretAtEnd();
      return;
    }

    if (key === "Delete") {
      e.preventDefault();
      emit("");
      keepCaretAtEnd();
      return;
    }

    // Digits -> append
    if (key.length === 1 && key >= "0" && key <= "9") {
      e.preventDefault();
      const next = (centsDigits + key).replace(/^0+(?=\d)/, "");
      emit(next);
      keepCaretAtEnd();
      return;
    }

    // Block everything else (including decimal separators)
    if (key.length === 1) {
      e.preventDefault();
      keepCaretAtEnd();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text") || "";
    const digits = digitsOnly(text);
    const next = digits.replace(/^0+(?=\d)/, "");
    emit(next);
    keepCaretAtEnd();
  };

  const handleFocus = () => {
    keepCaretAtEnd();
  };

  const handleClick = () => {
    keepCaretAtEnd();
  };

  const handleChange = () => {
    // No-op: we fully control via keydown/paste.
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {showCurrencySelector && (
        <Select
          value={currency}
          onValueChange={(val) => onCurrencyChange(val as CurrencyCode)}
          disabled={disabled}
        >
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BRL">R$ BRL</SelectItem>
            <SelectItem value="USD">$ USD</SelectItem>
            <SelectItem value="EUR">€ EUR</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {symbol}
        </span>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formatted}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onClick={handleClick}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
          aria-label="Valor monetário"
        />
      </div>
    </div>
  );
}

interface CurrencyDisplayProps {
  value: number | string | null | undefined;
  currency?: CurrencyCode;
  className?: string;
  emptyText?: string;
}

export function CurrencyDisplay({
  value,
  currency = "BRL",
  className,
  emptyText = "Não informado",
}: CurrencyDisplayProps) {
  const n = typeof value === "string" ? Number(value) : value;
  const isEmpty = n === null || n === undefined || !Number.isFinite(n);

  if (isEmpty) {
    return <span className={cn("text-muted-foreground text-sm", className)}>{emptyText}</span>;
  }

  return (
    <span className={cn("text-lg font-bold text-foreground", className)}>
      {formatCurrencyDisplay(n, currency)}
    </span>
  );
}
