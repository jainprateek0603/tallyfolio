"use client";

export function ThemeToggle({ tone = "paper" }: { tone?: "paper" | "cover" }) {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("tallyfolio-theme", next ? "dark" : "light");
  }

  const className =
    tone === "cover"
      ? "border border-white/30 px-3 py-1.5 text-sm text-[#e6edf2]"
      : "border border-rule px-3 py-1.5 text-sm text-ink";

  return (
    <button type="button" className={className} onClick={toggle}>
      <span className="dark:hidden">Dark mode</span>
      <span className="hidden dark:inline">Light mode</span>
    </button>
  );
}
