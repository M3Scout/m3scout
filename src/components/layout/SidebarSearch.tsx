import { useState, useRef, useEffect } from "react";
import { Search, X, LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarSearchProps {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarSearch({ items, collapsed, onNavigate }: SidebarSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filteredItems = query.trim()
    ? items.filter(item => 
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredItems.length > 0) {
      e.preventDefault();
      navigate(filteredItems[selectedIndex].href);
      setQuery("");
      setIsOpen(false);
      onNavigate?.();
    } else if (e.key === "Escape") {
      setQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleItemClick = (href: string) => {
    navigate(href);
    setQuery("");
    setIsOpen(false);
    onNavigate?.();
  };

  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="text-primary font-semibold">{part}</span>
      ) : part
    );
  };

  if (collapsed) {
    return (
      <button
        onClick={() => {
          // Could open a command palette in future
        }}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
      >
        <Search className="w-4 h-4" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar no menu..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on results
            setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-9 pl-9 pr-8 rounded-lg text-[13px]",
            "bg-white/[0.03] border border-white/[0.06]",
            "text-zinc-200 placeholder:text-zinc-600",
            "focus:outline-none focus:border-primary/30 focus:bg-white/[0.05]",
            "transition-all duration-150"
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg bg-zinc-900 border border-white/[0.08] shadow-xl z-50 max-h-[200px] overflow-y-auto">
          {filteredItems.map((item, index) => (
            <button
              key={item.href}
              onClick={() => handleItemClick(item.href)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                index === selectedIndex
                  ? "bg-primary/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
              <span className="text-[13px] truncate">
                {highlightMatch(item.label, query)}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && filteredItems.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 py-3 px-4 rounded-lg bg-zinc-900 border border-white/[0.08] shadow-xl z-50">
          <p className="text-[13px] text-zinc-500 text-center">
            Nenhum item encontrado
          </p>
        </div>
      )}
    </div>
  );
}
