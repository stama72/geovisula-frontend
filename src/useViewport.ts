import { useEffect, useState } from 'react'
import { COMPACT_BREAKPOINT, MOBILE_BREAKPOINT } from './layoutConstants'

function getViewportWidth() {
  return typeof window === 'undefined' ? 1024 : window.innerWidth
}

export default function useViewport() {
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth)

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    viewportWidth,
    isMobile: viewportWidth <= MOBILE_BREAKPOINT,
    isCompact: viewportWidth <= COMPACT_BREAKPOINT,
  }
}