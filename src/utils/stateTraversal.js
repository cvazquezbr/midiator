/**
 * Recursively traverses a state object (or array) and applies a visitor function
 * to each key-value pair. This utility is designed to reliably navigate complex,
 * nested data structures without mutating them directly during traversal.
 *
 * @param {any} data - The state object, array, or primitive to traverse.
 * @param {(key: string, value: any, owner: Object) => void} visitor - A function
 *   called for each value found in the state.
 *   - `key`: The key or index of the current item.
 *   - `value`: The value of the current item.
 *   - `owner`: The object or array that directly contains the value.
 * @param {WeakSet} [visited=new WeakSet()] - A set to keep track of visited
 *   objects to avoid infinite loops in case of circular references.
 */
export const traverseState = (data, visitor, visited = new WeakSet()) => {
  // If the data is not an object (e.g., string, number, null), do nothing.
  if (typeof data !== 'object' || data === null) {
    return;
  }

  // Avoid infinite loops by checking if we've already visited this object.
  if (visited.has(data)) {
    return;
  }
  visited.add(data);

  // Differentiate between an array and a plain object.
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      // The visitor is called for the item itself.
      visitor(index, item, data);
      // Recurse into the item if it's an object or array.
      traverseState(item, visitor, visited);
    });
  } else {
    // It's a plain object.
    Object.keys(data).forEach(key => {
      const value = data[key];
      // The visitor is called for the key-value pair.
      visitor(key, value, data);
      // Recurse into the value if it's an object or array.
      traverseState(value, visitor, visited);
    });
  }
};