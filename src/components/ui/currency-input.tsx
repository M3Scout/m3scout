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
 * Handles any currency format and extracts the numeric value
 */
export const parseCurrencyValue = (
  value: string,
  currency: CurrencyCode = "BRL"
): number | null => {
  if (!value || value.trim() === "") return null;

  const config = CURRENCY_CONFIGS[currency];

  // Remove currency symbol and whitespace
  let cleaned = value.replace(config.symbol, "").trim();

  // Remove all thousand separators (escape the dot for regex)
  const thousandRegex = new RegExp(
    config.thousandSeparator === "." ? "\\." : config.thousandSeparator,
    "g"
  );
  cleaned = cleaned.replace(thousandRegex, "");

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
    if (value !== null && value !== undefined && !isNaN(value)) {
      setDisplayValue(formatCurrencyValue(value, currency, false));
    } else {
      setDisplayValue("");
    }
  }, [value, currency]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Remove everything except digits and the decimal separator
    // First, keep only digits and our decimal separator
    let cleaned = "";
    let hasDecimal = false;
    let decimalCount = 0;

    for (const char of rawInput) {
      if (char >= "0" && char <= "9") {
        // After decimal, only allow 2 digits
        if (hasDecimal) {
          if (decimalCount < 2) {
            cleaned += char;
            decimalCount++;
          }
        } else {
          cleaned += char;
        }
      } else if (char === config.decimalSeparator && !hasDecimal) {
        cleaned += char;
        hasDecimal = true;
      }
      // Ignore thousand separators during input - they're just visual
    }

    setDisplayValue(cleaned);

    // Parse to number for the callback
    // Convert to standard format for parsing
    const standardized = cleaned.replace(config.decimalSeparator, ".");
    const numValue = standardized === "" ? null : parseFloat(standardized);
    
    if (numValue === null || !isNaN(numValue)) {
      onValueChange(numValue);
    }
  };

  const handleBlur = () => {
    // Format properly on blur with thousand separators
    if (value !== null && value !== undefined && !isNaN(value)) {
      setDisplayValue(formatCurrencyValue(value, currency, false));
    } else if (displayValue === "" || displayValue === config.decimalSeparator) {
      setDisplayValue("");
      onValueChange(null);
    }
  };

  const handleFocus = () => {
    // On focus, show raw number without thousand separators for easier editing
    if (value !== null && value !== undefined && !isNaN(value)) {
      // Show simple format: digits + decimal separator + 2 decimals
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
