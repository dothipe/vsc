export function isEmptyValue(val: any): boolean {
  if (val === undefined || val === null || val === "" || val === false) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && val !== null) {
    const keys = Object.keys(val);
    const hasNonEmpty = keys.some(k => !isEmptyValue(val[k]));
    return !hasNonEmpty;
  }
  return false;
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  const isEmptyA = isEmptyValue(a);
  const isEmptyB = isEmptyValue(b);
  if (isEmptyA && isEmptyB) return true;
  if (isEmptyA !== isEmptyB) return false;

  if (typeof a === "object" || typeof b === "object") {
    if (typeof a !== typeof b) return false;
  }

  if (typeof a === "object" && a !== null && b !== null) {
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    } else {
      if (Array.isArray(b)) return false;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        if (!deepEqual(a[k], b[k])) return false;
      }
      return true;
    }
  }

  const strA = a === undefined || a === null ? "" : String(a);
  const strB = b === undefined || b === null ? "" : String(b);
  return strA === strB;
}

export function getStageDisplayName(index: number, stageObj: any): string {
  if (!stageObj) return `Vòng ${index + 1}`;
  const raw = stageObj.name || stageObj.distance || `Cự ly ${index + 1}`;
  if (/^vòng\s*\d+/i.test(raw)) return raw;
  return `Vòng ${index + 1}: ${raw}`;
}
