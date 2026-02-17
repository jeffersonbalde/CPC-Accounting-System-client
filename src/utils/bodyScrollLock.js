/**
 * NUCLEAR: Lock body scroll with ZERO layout shift.
 * Main component stays EXACTLY where it is - only modal appears on top.
 */

let lockCount = 0;
let savedState = null;

export function bodyScrollLock() {
  lockCount += 1;
  if (lockCount > 1) return;

  const scrollY =
    window.scrollY ??
    window.pageYOffset ??
    document.documentElement.scrollTop ??
    0;

  savedState = {
    scrollY,
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
  };

  // Lock scroll WITHOUT changing layout - just prevent scrolling
  // Don't touch padding, don't change position - just overflow hidden
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";

  // Ensure no padding changes (scrollbar-gutter handles spacing)
  document.body.style.paddingRight = "0";
  document.documentElement.style.paddingRight = "0";
}

export function bodyScrollUnlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedState) return;

  const { scrollY, overflow, position, top } = savedState;
  savedState = null;

  // Restore scroll position BEFORE removing position:fixed
  if (scrollY !== undefined && scrollY !== null) {
    document.body.style.position = "";
    document.body.style.top = "";
    window.scrollTo(0, scrollY);
    document.documentElement.scrollTop = scrollY;
    document.body.scrollTop = scrollY;
  }

  // Restore styles
  document.body.style.overflow = overflow || "";
  document.body.style.position = position || "";
  document.body.style.top = top || "";
  document.body.style.paddingRight = "";
  document.documentElement.style.paddingRight = "";
}
