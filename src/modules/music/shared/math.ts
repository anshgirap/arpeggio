import type { Fraction } from "./types";

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x || 1;
}

export function fraction(numerator: number, denominator: number): Fraction {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new RangeError("A fraction requires safe integer terms and a non-zero denominator.");
  }
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return { numerator: (numerator / divisor) * sign, denominator: Math.abs(denominator) / divisor };
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function divideFractions(a: Fraction, b: Fraction): Fraction {
  if (b.numerator === 0) throw new RangeError("Cannot divide by zero.");
  return fraction(a.numerator * b.denominator, a.denominator * b.numerator);
}

export function fractionNumber(value: Fraction): number {
  return value.numerator / value.denominator;
}

export function compareFractions(a: Fraction, b: Fraction): number {
  return Math.sign(a.numerator * b.denominator - b.numerator * a.denominator);
}
