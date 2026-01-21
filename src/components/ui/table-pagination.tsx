import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  isLoading = false,
  className,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  // Generate page numbers to display (max 5 with ellipsis)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push("ellipsis");
      }
      
      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between px-4 py-3 border-t border-border", className)}>
      {/* Info */}
      <div className="text-sm text-muted-foreground">
        Affichage <span className="font-medium text-foreground">{from}</span>-<span className="font-medium text-foreground">{to}</span> sur{" "}
        <span className="font-medium text-foreground">{totalCount}</span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={page === 1 || isLoading}
          className="h-8 w-8"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">Première page</span>
        </Button>

        {/* Previous page */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Page précédente</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((pageNum, idx) =>
            pageNum === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "ghost"}
                size="icon"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className="h-8 w-8"
              >
                {pageNum}
              </Button>
            )
          )}
        </div>

        {/* Next page */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Page suivante</span>
        </Button>

        {/* Last page */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || isLoading}
          className="h-8 w-8"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Dernière page</span>
        </Button>
      </div>
    </div>
  );
}

// Skeleton for table rows during pagination loading
export function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-border animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}
