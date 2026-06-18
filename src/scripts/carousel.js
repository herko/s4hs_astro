// Lightweight scroll-snap carousel (no autoplay). Initializes every
// [data-carousel] on the page. One scroll page per slide, mirroring slick's
// slidesToScroll:1 / infinite:false → dots = slides - perView + 1. perView is
// read from the rendered layout, so responsive --per changes are picked up.
function initCarousel(root) {
  const track = root.querySelector("[data-track]");
  const dotsBox = root.querySelector("[data-dots]");
  if (!track || !dotsBox) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;

  let pages = 0;
  const slideWidth = () => slides[0].getBoundingClientRect().width || 1;
  const perView = () => Math.max(1, Math.round(track.clientWidth / slideWidth()));

  const update = () => {
    const idx = Math.min(Math.round(track.scrollLeft / slideWidth()), pages - 1);
    Array.from(dotsBox.children).forEach((dot, i) =>
      dot.setAttribute("aria-current", i === idx ? "true" : "false")
    );
  };

  const build = () => {
    const next = Math.max(1, slides.length - perView() + 1);
    if (next !== pages) {
      pages = next;
      dotsBox.innerHTML = "";
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Strana ${i + 1}`);
        dot.addEventListener("click", () =>
          track.scrollTo({ left: i * slideWidth(), behavior: "smooth" })
        );
        dotsBox.appendChild(dot);
      }
    }
    dotsBox.style.display = pages > 1 ? "flex" : "none";
    update();
  };

  let raf = 0;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener("resize", build);
  build();
}

document.querySelectorAll("[data-carousel]").forEach(initCarousel);
