export type ColorChoice = {
  label: string;
  value: string;
};

export const subjectColorChoices: ColorChoice[] = [
  { label: "Coral", value: "#e76f51" },
  { label: "Amber", value: "#d97706" },
  { label: "Sky", value: "#2563eb" },
  { label: "Teal", value: "#0f766e" },
  { label: "Leaf", value: "#2f855a" },
  { label: "Rose", value: "#be185d" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Slate", value: "#475569" },
];

export const childThemeChoices: ColorChoice[] = [
  { label: "Forest", value: "#4f766a" },
  { label: "Ocean", value: "#386fa4" },
  { label: "Sunset", value: "#c05621" },
  { label: "Berry", value: "#b83280" },
  { label: "Stone", value: "#57534e" },
  { label: "Indigo", value: "#4c51bf" },
];

const subjectAliases: Array<{ matches: string[]; color: string }> = [
  { matches: ["mathematics", "maths", "math"], color: "#e76f51" },
  { matches: ["science"], color: "#2f855a" },
  { matches: ["english"], color: "#2563eb" },
  { matches: ["hindi"], color: "#d97706" },
  { matches: ["marathi"], color: "#be185d" },
  { matches: ["social science", "sst", "history", "geography", "civics"], color: "#0f766e" },
  { matches: ["computer", "coding"], color: "#7c3aed" },
];

export function normalizeSubjectName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashValue(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 1000003;
  }
  return total;
}

export function suggestedSubjectColor(name: string) {
  const normalized = normalizeSubjectName(name);
  const alias = subjectAliases.find((entry) => entry.matches.some((match) => normalized.includes(match)));
  if (alias) return alias.color;
  return subjectColorChoices[hashValue(normalized) % subjectColorChoices.length]?.value ?? subjectColorChoices[0].value;
}

export function resolveSubjectColor(name: string, color?: string | null) {
  const normalizedColor = color?.trim().toLowerCase();
  if (normalizedColor && subjectColorChoices.some((choice) => choice.value === normalizedColor)) {
    return normalizedColor;
  }
  return suggestedSubjectColor(name);
}

export function resolveChildThemeColor(color?: string | null) {
  const normalizedColor = color?.trim().toLowerCase();
  if (normalizedColor && childThemeChoices.some((choice) => choice.value === normalizedColor)) {
    return normalizedColor;
  }
  return childThemeChoices[0].value;
}

export function subjectColorChoicesForChildTheme(childThemeColor?: string | null) {
  if (!childThemeColor) return subjectColorChoices;
  return subjectColorChoices.filter((choice) => choice.value !== childThemeColor.trim().toLowerCase());
}
