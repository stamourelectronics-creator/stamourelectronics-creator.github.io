// Utility for rendering real mathematical fraction symbols and math notation
// Transforms words (e.g., 'one over two', '3 over 4') and plain text fractions into real mathematical symbols

export const MATH_FRACTION_SYMBOLS = [
  '½', '⅓', '⅔', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅙', '⅚', '⅛', '⅜', '⅝', '⅞'
];

export const MATH_OPERATION_SYMBOLS = [
  '√', 'π', '±', '÷', '×', '·', '²', '³', '≤', '≥', '≠', '≈', '∞', '∫', '∑', 'θ', '°'
];

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ'
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ'
};

export function toSuperscript(str: string): string {
  return str.split('').map(c => SUPERSCRIPT_MAP[c] || c).join('');
}

export function toSubscript(str: string): string {
  return str.split('').map(c => SUBSCRIPT_MAP[c] || c).join('');
}

const STANDARD_FRACTION_MAP: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/6': '⅙',
  '5/6': '⅚',
  '1/7': '⅐',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
  '1/9': '⅑',
  '1/10': '⅒'
};

/**
 * Transforms plain text fractions, word fractions ('one over two', '3 over 4'),
 * and math notation into real mathematical unicode fraction symbols and proper math typography.
 */
export function formatMathAndFractions(text: string): string {
  if (!text) return '';

  let out = text;

  // 1. Spoken English word fractions -> real symbols
  out = out
    .replace(/\b(one|1)\s*[- ]*(half|over\s*two)\b/gi, '½')
    .replace(/\b(one|1)\s*[- ]*(third|over\s*three)\b/gi, '⅓')
    .replace(/\b(two|2)\s*[- ]*(thirds|over\s*three)\b/gi, '⅔')
    .replace(/\b(one|1)\s*[- ]*(fourth|quarter|over\s*four)\b/gi, '¼')
    .replace(/\b(three|3)\s*[- ]*(fourths|quarters|over\s*four)\b/gi, '¾')
    .replace(/\b(one|1)\s*[- ]*(fifth|over\s*five)\b/gi, '⅕')
    .replace(/\b(two|2)\s*[- ]*(fifths|over\s*five)\b/gi, '⅖')
    .replace(/\b(three|3)\s*[- ]*(fifths|over\s*five)\b/gi, '⅗')
    .replace(/\b(four|4)\s*[- ]*(fifths|over\s*five)\b/gi, '⅘')
    .replace(/\b(one|1)\s*[- ]*(sixth|over\s*six)\b/gi, '⅙')
    .replace(/\b(five|5)\s*[- ]*(sixths|over\s*six)\b/gi, '⅚')
    .replace(/\b(one|1)\s*[- ]*(seventh|over\s*seven)\b/gi, '⅐')
    .replace(/\b(one|1)\s*[- ]*(eighth|over\s*eight)\b/gi, '⅛')
    .replace(/\b(three|3)\s*[- ]*(eighths|over\s*eight)\b/gi, '⅜')
    .replace(/\b(five|5)\s*[- ]*(eighths|over\s*eight)\b/gi, '⅝')
    .replace(/\b(seven|7)\s*[- ]*(eighths|over\s*eight)\b/gi, '⅞')
    .replace(/\b(one|1)\s*[- ]*(ninth|over\s*nine)\b/gi, '⅑')
    .replace(/\b(one|1)\s*[- ]*(tenth|over\s*ten)\b/gi, '⅒');

  // 2. Numeric "N over D" phrases: e.g., "5 over 8" -> ⅝, "7 over 12" -> ⁷⁄₁₂
  out = out.replace(/\b(\d{1,3})\s+over\s+(\d{1,3})\b/gi, (_, num, den) => {
    const pair = `${num.trim()}/${den.trim()}`;
    if (STANDARD_FRACTION_MAP[pair]) {
      return STANDARD_FRACTION_MAP[pair];
    }
    const n = parseInt(num, 10);
    const d = parseInt(den, 10);
    if (d > 0 && n < 100 && d <= 100) {
      return `${toSuperscript(num)}⁄${toSubscript(den)}`;
    }
    return `${num}/${den}`;
  });

  // 3. LaTeX fractions: \frac{a}{b} -> Real Unicode fraction or clean fraction
  out = out.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, (_, num, den) => {
    const pair = `${num.trim()}/${den.trim()}`;
    if (STANDARD_FRACTION_MAP[pair]) {
      return STANDARD_FRACTION_MAP[pair];
    }
    if (/^\d+$/.test(num.trim()) && /^\d+$/.test(den.trim())) {
      return `${toSuperscript(num.trim())}⁄${toSubscript(den.trim())}`;
    }
    return `(${num.trim()}/${den.trim()})`;
  });

  // 4. Standard Slash Fractions: e.g., " 1/2 ", "(1/2)", "3/4"
  // Do NOT match dates like 10/14/2026 or file paths
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/2)(?=[\s).,;:+*~\]>]|$)/g, '$1½');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/3)(?=[\s).,;:+*~\]>]|$)/g, '$1⅓');
  out = out.replace(/(^|[\s(=+\-*~([<])(2\/3)(?=[\s).,;:+*~\]>]|$)/g, '$1⅔');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/4)(?=[\s).,;:+*~\]>]|$)/g, '$1¼');
  out = out.replace(/(^|[\s(=+\-*~([<])(3\/4)(?=[\s).,;:+*~\]>]|$)/g, '$1¾');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/5)(?=[\s).,;:+*~\]>]|$)/g, '$1⅕');
  out = out.replace(/(^|[\s(=+\-*~([<])(2\/5)(?=[\s).,;:+*~\]>]|$)/g, '$1⅖');
  out = out.replace(/(^|[\s(=+\-*~([<])(3\/5)(?=[\s).,;:+*~\]>]|$)/g, '$1⅗');
  out = out.replace(/(^|[\s(=+\-*~([<])(4\/5)(?=[\s).,;:+*~\]>]|$)/g, '$1⅘');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/6)(?=[\s).,;:+*~\]>]|$)/g, '$1⅙');
  out = out.replace(/(^|[\s(=+\-*~([<])(5\/6)(?=[\s).,;:+*~\]>]|$)/g, '$1⅚');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/7)(?=[\s).,;:+*~\]>]|$)/g, '$1⅐');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/8)(?=[\s).,;:+*~\]>]|$)/g, '$1⅛');
  out = out.replace(/(^|[\s(=+\-*~([<])(3\/8)(?=[\s).,;:+*~\]>]|$)/g, '$1⅜');
  out = out.replace(/(^|[\s(=+\-*~([<])(5\/8)(?=[\s).,;:+*~\]>]|$)/g, '$1⅝');
  out = out.replace(/(^|[\s(=+\-*~([<])(7\/8)(?=[\s).,;:+*~\]>]|$)/g, '$1⅞');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/9)(?=[\s).,;:+*~\]>]|$)/g, '$1⅑');
  out = out.replace(/(^|[\s(=+\-*~([<])(1\/10)(?=[\s).,;:+*~\]>]|$)/g, '$1⅒');

  // 5. Arbitrary numeric fractions like " 5/12 ", " 7/16 ", " 9/10 "
  out = out.replace(/(^|[\s(=+\-*~([<])(\d{1,3})\/(\d{1,3})(?=[\s).,;:+*~\]>]|$)/g, (match, prefix, num, den) => {
    // Avoid dates if followed by year-like 4 digits
    if (match.includes('/') && den.length === 4) return match;
    const n = parseInt(num, 10);
    const d = parseInt(den, 10);
    if (d > 0 && n < 100 && d <= 100) {
      return `${prefix}${toSuperscript(num)}⁄${toSubscript(den)}`;
    }
    return match;
  });

  // 6. Square Roots: \sqrt{x} or sqrt(x)
  out = out.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  out = out.replace(/\bsqrt\(([^)]+)\)/g, '√($1)');
  out = out.replace(/\\sqrt\s*([0-9a-zA-Z]+)/g, '√$1');

  // 7. Math Symbols & Greek Letters
  out = out
    .replace(/\\pm\b|\+\/-/g, '±')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\Sigma\b/g, 'Σ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\Omega\b/g, 'Ω')
    .replace(/\\le\b|<=/g, '≤')
    .replace(/\\ge\b|>=/g, '≥')
    .replace(/\\ne\b|!=/g, '≠')
    .replace(/\\approx\b|~=/g, '≈')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\int\b/g, '∫')
    .replace(/\\sum\b/g, '∑')
    .replace(/\\partial\b/g, '∂')
    .replace(/\\degree\b|\^o\b/g, '°');

  // 8. Caret exponents: e.g. x^2 -> x², 10^-3 -> 10⁻³, (a+b)^2 -> (a+b)²
  out = out.replace(/(\b[a-zA-Z0-9)]|\))\^([0-9+\-nixyab]+)/g, (_, base, exp) => {
    return `${base}${toSuperscript(exp)}`;
  });

  return out;
}
