'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RankingPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function RankingPagination({
  currentPage,
  totalPages,
  onPageChange,
}: RankingPaginationProps): React.ReactNode {
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }

    if (totalPages <= maxVisible) {
      start = 0;
      end = totalPages - 1;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {/* First Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(0)}
        disabled={currentPage === 0}
        title="First Page"
        className="h-8 w-8"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Prev 10 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(0, currentPage - 10))}
        disabled={currentPage === 0}
        title="Previous 10 Pages"
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 mx-2">
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className={cn(
              'min-w-[2rem] h-8 text-xs font-medium',
              currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {page + 1}
          </Button>
        ))}
      </div>

      {/* Next 10 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 10))}
        disabled={currentPage === totalPages - 1}
        title="Next 10 Pages"
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages - 1)}
        disabled={currentPage === totalPages - 1}
        title="Last Page"
        className="h-8 w-8"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
