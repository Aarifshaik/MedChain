"use client"

import { useEffect } from 'react'

interface UsePageTitleOptions {
  title: string
  suffix?: string
}

/**
 * Hook to dynamically set the page title
 * @param options - Title configuration options
 */
export function usePageTitle({ title, suffix = "Healthcare DLT" }: UsePageTitleOptions) {
  useEffect(() => {
    const fullTitle = suffix ? `${title} | ${suffix}` : title
    document.title = fullTitle
    
    // Cleanup function to restore original title if needed
    return () => {
      // Optional: restore to default title when component unmounts
      // document.title = "Healthcare DLT - Quantum-Resistant Medical Records"
    }
  }, [title, suffix])
}

/**
 * Utility function to set page title imperatively
 * @param title - The page title
 * @param suffix - Optional suffix (defaults to "Healthcare DLT")
 */
export function setPageTitle(title: string, suffix: string = "Healthcare DLT") {
  const fullTitle = suffix ? `${title} | ${suffix}` : title
  document.title = fullTitle
}