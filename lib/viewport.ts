/** Where the chat panel should sit when the phone keyboard shrinks the visible viewport. */
export function keyboardFrame(
  innerHeight: number,
  vvHeight: number,
  vvOffsetTop: number,
): { top: number; height: number } | null {
  if (innerHeight - vvHeight - vvOffsetTop <= 80) return null;
  const top = Math.max(0, vvOffsetTop) + 8;
  const height = Math.max(96, Math.round(vvHeight - 16));
  return { top, height: Math.min(height, Math.round(vvHeight - 8)) };
}
