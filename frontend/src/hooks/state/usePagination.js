/**
 * Hook para gerenciar paginação
 */
import { useState, useMemo, useEffect } from 'react';

export function usePagination(items, pageSize = 10, dependencies = []) {
  const [currentPage, setCurrentPage] = useState(1);

  // Resetar página quando dependências mudarem (ex: filtros)
  useEffect(() => {
    setCurrentPage(1);
  }, dependencies);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}

