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
  decimalSeparator: string;
  thousandSeparator: string;
  locale: string;
}

const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  BRL: {
    symbol: "R$",
    decimalSeparator: ",",
    thousandSeparator: ".",
    locale: "pt-BR",
  },
  USD: {
    symbol: "$",
    decimalSeparator: ".",
    thousandSeparator: ",",
    locale: "en-US",
  },
  EUR: {
    symbol: "€",
    decimalSeparator: ",",
    thousandSeparator: ".",
    locale: "de-DE",
  },
};

/**
 * Parse a formatted currency string to a raw number
 */
export const parseCurrencyValue = (
  value: string,
  currency: CurrencyCode = "BRL"
): number | null => {
  if (!value || value.trim() === "") return null;

  const config = CURRENCY_CONFIGS[currency];

  // Remove currency symbol and whitespace
  let cleaned = value.replace(config.symbol, "").trim();

  // Remove thousand separators
  cleaned = cleaned.split(config.thousandSeparator).join("");

  // Replace decimal separator with dot for parsing
  cleaned = cleaned.replace(config.decimalSeparator, ".");

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Format a number to a currency display string
 */
export const formatCurrencyValue = (
  value: number | null | undefined,
  currency: CurrencyCode = "BRL",
  showSymbol: boolean = true
): string => {
  if (value === null || value === undefined || isNaN(value)) return "";

  const config = CURRENCY_CONFIGS[currency];

  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return showSymbol ? `${config.symbol} ${formatted}` : formatted;
};

/**
 * Format a number to a currency display string for read-only view
 */
export const formatCurrencyDisplay = (
  value: number | string | null | undefined,
  currency: CurrencyCode = "BRL"
): string => {
  if (value === null || value === undefined || value === "") return "Não informado";

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "Não informado";

  const config = CURRENCY_CONFIGS[currency];

  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);

  return `${config.symbol} ${formatted}`;
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
  const [displayValue, setDisplayValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const config = CURRENCY_CONFIGS[currency];

  // Update display value when value or currency changes externally
  React.useEffect(() => {
    if (value !== null && value !== undefined) {
      setDisplayValue(formatCurrencyValue(value, currency, false));
    } else {
      setDisplayValue("");
    }
  }, [value, currency]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Only allow numbers, decimal separator, and thousand separator
    const allowedChars = new RegExp(
      `[^0-9${config.decimalSeparator}${config.thousandSeparator}]`,
      "g"
    );
    let cleaned = rawInput.replace(allowedChars, "");

    // Ensure only one decimal separator
    const decimalParts = cleaned.split(config.decimalSeparator);
    if (decimalParts.length > 2) {
      cleaned = decimalParts[0] + config.decimalSeparator + decimalParts.slice(1).join("");
    }

    // Limit decimal places to 2
    if (decimalParts.length === 2 && decimalParts[1].length > 2) {
      cleaned = decimalParts[0] + config.decimalSeparator + decimalParts[1].slice(0, 2);
    }

    setDisplayValue(cleaned);

    // Parse and emit value
    const numValue = parseCurrencyValue(cleaned, currency);
    onValueChange(numValue);
  };

  const handleBlur = () => {
    // Format properly on blur
    if (value !== null && value !== undefined) {
      setDisplayValue(formatCurrencyValue(value, currency, false));
    }
  };

  const handleFocus = () => {
    // Remove formatting on focus for easier editing
    if (value !== null && value !== undefined) {
      const config = CURRENCY_CONFIGS[currency];
      // Show just the number without thousand separators for editing
      const simple = value.toFixed(2).replace(".", config.decimalSeparator);
      setDisplayValue(simple);
    }
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
          {config.symbol}
        </span>
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
        />
      </div>
    </div>
  );
}

// Simple display component for read-only views
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
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const isEmpty = numValue === null || numValue === undefined || isNaN(numValue);

  if (isEmpty) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        {emptyText}
      </span>
    );
  }

  return (
    <span className={cn("text-lg font-bold text-foreground", className)}>
      {formatCurrencyDisplay(numValue, currency)}
    </span>
  );
}
