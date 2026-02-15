/**
 * Performance Monitoring and Profiling
 * Tracks hook performance, memoization hits/misses, render counts
 */

import { useRef, useEffect, useMemo, useCallback } from 'react'

export interface PerformanceMetrics {
  renderCount: number
  memoHits: number
  memoMisses: number
  avgRenderTime: number
  maxRenderTime: number
  lastRenderTime: number
  dependencyChangeCount: number
}

/**
 * Hook to profile component renders and memoization effectiveness
 * Logs to window.__PERFORMANCE_METRICS for React DevTools integration
 */
export function usePerformanceMonitor(
  componentName: string,
  debugMode: boolean = process.env.NODE_ENV === 'development'
) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    memoHits: 0,
    memoMisses: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    lastRenderTime: 0,
    dependencyChangeCount: 0,
  })

  const renderStartRef = useRef<number>(0)

  useEffect(() => {
    if (!debugMode) return

    // Record render end time
    const renderEnd = performance.now()
    const renderTime = renderEnd - renderStartRef.current

    metricsRef.current.renderCount++
    metricsRef.current.lastRenderTime = renderTime
    metricsRef.current.maxRenderTime = Math.max(
      metricsRef.current.maxRenderTime,
      renderTime
    )

    // Update average
    metricsRef.current.avgRenderTime =
      (metricsRef.current.avgRenderTime * (metricsRef.current.renderCount - 1) +
        renderTime) /
      metricsRef.current.renderCount

    // Store metrics globally for React DevTools
    if (typeof window !== 'undefined') {
      window.__PERFORMANCE_METRICS = window.__PERFORMANCE_METRICS || {}
      window.__PERFORMANCE_METRICS[componentName] = metricsRef.current
    }

    if (renderTime > 16.67) {
      console.warn(
        `[PERF] ${componentName} slow render: ${renderTime.toFixed(2)}ms (target: <16.67ms)`
      )
    }
  })

  // Record render start time
  renderStartRef.current = performance.now()

  return {
    metrics: metricsRef.current,
    recordMemoHit: useCallback(() => {
      metricsRef.current.memoHits++
    }, []),
    recordMemoMiss: useCallback(() => {
      metricsRef.current.memoMisses++
    }, []),
    recordDependencyChange: useCallback(() => {
      metricsRef.current.dependencyChangeCount++
    }, []),
  }
}

/**
 * Memoization tracking wrapper
 * Logs when memoized values are recomputed
 */
export function useMemoWithTracking<T>(
  factory: () => T,
  deps: React.DependencyList,
  label: string = 'unknown'
): T {
  const { recordMemoHit, recordMemoMiss, recordDependencyChange } =
    usePerformanceMonitor('memoization', process.env.NODE_ENV === 'development')

  const previousDepsRef = useRef<React.DependencyList | undefined>(undefined)

  // Check if dependencies changed
  const depsChanged =
    previousDepsRef.current === undefined ||
    !depsAreEqual(previousDepsRef.current, deps)

  if (depsChanged && previousDepsRef.current !== undefined) {
    recordMemoMiss()
    recordDependencyChange()

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[MEMO] Recomputing ${label} - deps changed`)
    }
  }

  previousDepsRef.current = deps

  // Deliberately forwards caller-provided deps for diagnostics wrappers.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  return useMemo(() => {
    recordMemoHit()
    return factory()
  }, deps)
}

/**
 * Callback tracking wrapper
 * Logs when callbacks are recreated
 */
export function useCallbackWithTracking<T extends (...args: any[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
  label: string = 'unknown'
): T {
  const { recordMemoMiss, recordDependencyChange } =
    usePerformanceMonitor('callback', process.env.NODE_ENV === 'development')

  const previousDepsRef = useRef<React.DependencyList | undefined>(undefined)

  const depsChanged =
    previousDepsRef.current === undefined ||
    !depsAreEqual(previousDepsRef.current, deps)

  if (depsChanged && previousDepsRef.current !== undefined) {
    recordMemoMiss()
    recordDependencyChange()

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[CALLBACK] Recreating ${label} - deps changed`)
    }
  }

  previousDepsRef.current = deps

  // Deliberately forwards caller-provided deps for diagnostics wrappers.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  return useCallback((...args: Parameters<T>) => callback(...args), deps) as T
}

/**
 * Utility: Check if dependency arrays are equal
 */
function depsAreEqual(
  prevDeps: React.DependencyList,
  nextDeps: React.DependencyList
): boolean {
  if (prevDeps === nextDeps) return true
  if (prevDeps.length !== nextDeps.length) return false

  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) {
      return false
    }
  }

  return true
}

/**
 * Performance mark helper for custom measurements
 */
export function usePerformanceMark(label: string) {
  const startTimeMark = `${label}-start`
  const endTimeMark = `${label}-end`

  const start = useCallback(() => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(startTimeMark)
    }
  }, [startTimeMark])

  const end = useCallback(() => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(endTimeMark)
      window.performance.measure(label, startTimeMark, endTimeMark)

      // Log measurement
      const measure = window.performance.getEntriesByName(label)[0]
      if (measure) {
        console.debug(`[PERF] ${label}: ${measure.duration.toFixed(2)}ms`)
      }
    }
  }, [endTimeMark, label, startTimeMark])

  return { start, end }
}

/**
 * Hook effect timing tracker
 */
export function useEffectTiming(label: string) {
  return useCallback(() => {
    const start = performance.now()

    return () => {
      const end = performance.now()
      const duration = end - start
      console.debug(`[EFFECT] ${label} cleanup took ${duration.toFixed(2)}ms`)
    }
  }, [label])
}

/**
 * Integration with React DevTools Profiler
 * Adds custom tracing for hooks
 */
export function enableHookProfiling() {
  if (typeof window === 'undefined') return

  window.__PERFORMANCE_METRICS = {}

  // Hook into React's profiler
  if ('__REACT_DEVTOOLS_HOOKS__' in window) {
    console.debug('[PROFILING] React DevTools profiling enabled')
  }

  // Expose performance API for inspection
  window.__GET_PERFORMANCE_METRICS = () => {
    return window.__PERFORMANCE_METRICS || {}
  }

  window.__CLEAR_PERFORMANCE_METRICS = () => {
    window.__PERFORMANCE_METRICS = {}
  }

  window.__GET_METRIC = (componentName: string) => {
    return window.__PERFORMANCE_METRICS?.[componentName]
  }
}

declare global {
  interface Window {
    __PERFORMANCE_METRICS?: Record<string, PerformanceMetrics>
    __GET_PERFORMANCE_METRICS?: () => Record<string, PerformanceMetrics>
    __CLEAR_PERFORMANCE_METRICS?: () => void
    __GET_METRIC?: (name: string) => PerformanceMetrics | undefined
  }
}
