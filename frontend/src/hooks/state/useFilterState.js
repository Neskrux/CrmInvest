/**
 * Hook para gerenciar estados de filtros
 */
import { useState, useCallback } from 'react';

export function useFilterState() {
  const [filters, setFilters] = useState({
    mostrarFiltros: false,
    nome: '',
    telefone: '',
    cpf: '',
    tipo: '',
    status: '',
    consultor: '',
    dataInicio: '',
    dataFim: ''
  });

  const [filtersNovosLeads, setFiltersNovosLeads] = useState({
    mostrarFiltros: false,
    nome: '',
    status: '',
    empreendimento: ''
  });

  const [filtersNegativos, setFiltersNegativos] = useState({
    mostrarFiltros: false,
    nome: '',
    status: '',
    consultor: ''
  });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilterNovosLeads = useCallback((key, value) => {
    setFiltersNovosLeads(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilterNegativos = useCallback((key, value) => {
    setFiltersNegativos(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      mostrarFiltros: false,
      nome: '',
      telefone: '',
      cpf: '',
      tipo: '',
      status: '',
      consultor: '',
      dataInicio: '',
      dataFim: ''
    });
  }, []);

  return {
    filters,
    filtersNovosLeads,
    filtersNegativos,
    updateFilter,
    updateFilterNovosLeads,
    updateFilterNegativos,
    resetFilters
  };
}

