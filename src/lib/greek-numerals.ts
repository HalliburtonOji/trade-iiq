// Greek alphabetic numerals (Αʹ, Βʹ, Γʹ ... up to ascending sequence)
// For lesson nav we only need 1–24 realistically.
const LETTERS = [
  "Α", "Β", "Γ", "Δ", "Ε", "Ϛ", "Ζ", "Η", "Θ",
  "Ι", "ΙΑ", "ΙΒ", "ΙΓ", "ΙΔ", "ΙΕ", "ΙϚ", "ΙΖ", "ΙΗ", "ΙΘ",
  "Κ", "ΚΑ", "ΚΒ", "ΚΓ", "ΚΔ",
];

export function greekNumeral(n: number): string {
  if (n < 1) return "";
  if (n <= LETTERS.length) return LETTERS[n - 1] + "ʹ";
  return `${n}ʹ`;
}
