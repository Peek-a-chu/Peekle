'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { cn } from '@/lib/utils';
import { fetchSearchResults } from '@/api/searchApi';
import ProblemIcon from '@/assets/icons/problem.svg';
import BookIcon from '@/assets/icons/book.svg';
import PeopleIcon from '@/assets/icons/people.svg';

const DEBOUNCE_DELAY_MS = 300;
const MIN_SEARCH_LENGTH = 1;
const MAX_SUGGESTIONS_PER_CATEGORY = 5;

interface SearchSuggestion {
  id: number;
  title: string;
  type: 'problem' | 'user' | 'workbook';
  tier?: string;
}

interface GlobalSearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
  initialQuery?: string;
}

export function GlobalSearchBar({ className, onSearch, initialQuery = '' }: GlobalSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query, DEBOUNCE_DELAY_MS);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with initialQuery prop if provided
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetchSearchResults({
          keyword: debouncedQuery,
          category: 'ALL',
          page: 0,
          size: 4,
        });

        const { problems, workbooks, users } = response.data;
        const newSuggestions: SearchSuggestion[] = [];

        problems.forEach((p) =>
          newSuggestions.push({
            id: p.problemId,
            title: p.title,
            type: 'problem',
            tier: p.tier,
          }),
        );

        users.forEach((u) =>
          newSuggestions.push({
            id: u.userId,
            title: u.handle,
            type: 'user',
            tier: u.tier,
          }),
        );

        workbooks.forEach((w) =>
          newSuggestions.push({
            id: w.workbookId,
            title: w.title,
            type: 'workbook',
          }),
        );

        setSuggestions(newSuggestions);
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

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
      // Open external link for problems
      window.open(`https://www.acmicpc.net/problem/${suggestion.id}`, '_blank');
    } else if (suggestion.type === 'user') {
      router.push(`/profile/${encodeURIComponent(suggestion.title)}`);
    } else if (suggestion.type === 'workbook') {
      router.push(`/workbooks?id=${suggestion.id}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'problem':
        return <ProblemIcon className="h-5 w-5" />;
      case 'user':
        return <PeopleIcon className="h-5 w-5" />;
      case 'workbook':
        return <BookIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'problem':
        return '문제';
      case 'user':
        return '사용자';
      case 'workbook':
        return '문제집';
      default:
        return '';
    }
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
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">검색 중...</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    selectedIndex === index ? 'bg-[#E24EA0]/10 text-[#E24EA0]' : 'hover:bg-gray-50',
                  )}
                >
                  <span className="flex-shrink-0">{getSuggestionIcon(suggestion.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{suggestion.title}</div>
                    <div className="text-xs text-gray-500">
                      {getSuggestionTypeLabel(suggestion.type)}
                      {suggestion.tier && ` · ${suggestion.tier}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
