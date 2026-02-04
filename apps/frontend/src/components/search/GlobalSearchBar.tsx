'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchSuggestions } from './GlobalSearchBar/useSearchSuggestions';
import { SearchDropdown } from './GlobalSearchBar/SearchDropdown';
import type { SearchSuggestion } from './GlobalSearchBar/useSearchSuggestions';

interface GlobalSearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
  initialQuery?: string;
}

const MIN_SEARCH_LENGTH = 1;

export function GlobalSearchBar({ className, onSearch, initialQuery = '' }: GlobalSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { suggestions, isLoading } = useSearchSuggestions(query);

  // Sync with initialQuery prop if provided
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Open dropdown when suggestions arrive
  useEffect(() => {
    if (suggestions.length > 0 && query.length >= MIN_SEARCH_LENGTH) {
      setIsOpen(true);
    }
  }, [suggestions, query]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (query.trim()) {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSearch = () => {
    if (query.trim().length < MIN_SEARCH_LENGTH) return;

    setIsOpen(false);
    if (onSearch) {
      onSearch(query.trim());
    } else {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setIsOpen(false);
    setSelectedIndex(-1);

    // Navigate based on suggestion type
    if (suggestion.type === 'problem') {
      window.open(`https://www.acmicpc.net/problem/${suggestion.id}`, '_blank');
    } else if (suggestion.type === 'user') {
      router.push(`/profile/${encodeURIComponent(suggestion.title)}`);
    } else if (suggestion.type === 'workbook') {
      router.push(`/workbooks?id=${suggestion.id}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full max-w-xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <button
          onClick={handleSearch}
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 hover:text-[#E24EA0] transition-colors"
          aria-label="Search"
        >
          <Search className="h-full w-full" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="문제, 사용자, 문제집 검색..."
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[#E24EA0]/20"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div ref={dropdownRef}>
          <SearchDropdown
            suggestions={suggestions}
            isLoading={isLoading}
            selectedIndex={selectedIndex}
            onSelect={handleSelectSuggestion}
          />
        </div>
      )}
    </div>
  );
}
