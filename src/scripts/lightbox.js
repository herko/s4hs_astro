// Minimal dependency-free lightbox. Any element carrying [data-full] (the URL
// of the full-size image) opens it in a fullscreen overlay on click. Close by
// clicking the overlay or pressing Escape.
let overlay;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = '<img alt="" />';
  overlay.addEventListener("click", close);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return overlay;
}

function open(src, alt) {
  const o = ensureOverlay();
  const img = o.querySelector("img");
  img.src = src;
  img.alt = alt || "";
  o.classList.add("open");
  document.body.style.overflow = "hidden";
}

function close() {
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-full]");
  if (!trigger) return;
  e.preventDefault();
  open(trigger.getAttribute("data-full"), trigger.getAttribute("data-full-alt"));
});
