import { useCallback, useEffect, useRef, useState } from 'react'
import { loadValue, saveValue } from '../lib/storage.js'

/**
 * useState + localStorage persistence.
 *
 * The value is read once on mount and written back whenever it changes, so the
 * data survives reloads without any extra plumbing in the components.
 *
 * The hydrated flag skips the very first write: without it, a "reset all"
 * (clearAppStorage + set defaults) would be immediately undone because every
 * hook writes its current value back on mount.
 */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => loadValue(key, initialValue))
  const [hydrated, setHydrated] = useState(false)
  const keyRef = useRef(key)

  useEffect(() => {
    keyRef.current = key
  }, [key])

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveValue(keyRef.current, value)
  }, [hydrated, value])

  const update = useCallback((next) => {
    setValue((previous) => (typeof next === 'function' ? next(previous) : next))
  }, [])

  const reset = useCallback(() => setValue(initialValue), [initialValue])

  return [value, update, reset]
}
