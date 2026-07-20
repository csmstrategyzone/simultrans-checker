/** Smooth-scroll the tool card into view, clearing the sticky header. */
export function scrollToTool() {
  const el = document.getElementById("tool");
  if (!el) return;
  const offset = window.innerWidth < 640 ? 64 : 80;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}
