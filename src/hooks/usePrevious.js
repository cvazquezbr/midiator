import { useRef, useEffect } from 'react';

/**
 * Custom hook to get the previous value of a prop or state.
 * @param {*} value The value to track.
 * @returns The value from the previous render.
 */
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes
  return ref.current;
}
