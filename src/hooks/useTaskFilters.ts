import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  applyFiltersToParams,
  DEFAULT_FILTERS,
  filtersFromParams,
  type TaskFilters,
} from '../lib/taskFilters'

/** Filtros guardados en la URL: sobreviven a recargar y se pueden compartir con el link */
export function useTaskFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])

  const setFilters = useCallback(
    (patch: Partial<TaskFilters>) => {
      setParams((prev) => applyFiltersToParams({ ...filtersFromParams(prev), ...patch }, prev), { replace: true })
    },
    [setParams]
  )

  const clearFilters = useCallback(() => {
    setParams((prev) => applyFiltersToParams({ ...DEFAULT_FILTERS, sort: filtersFromParams(prev).sort }, prev), {
      replace: true,
    })
  }, [setParams])

  return { filters, setFilters, clearFilters }
}
