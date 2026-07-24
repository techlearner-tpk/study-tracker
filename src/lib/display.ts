export function formatClassLabel(className: string) {
  const value = className.trim();
  if (!value) return "Class not set";
  return /^class\b/i.test(value) ? value : `Class ${value}`;
}

export function isDemoName(value: string) {
  return value.toLowerCase().includes("demo");
}
