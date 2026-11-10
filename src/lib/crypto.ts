import { timingSafeEqual } from "node:crypto";

export function safeEqual(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
