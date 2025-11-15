document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

  const cta = document.getElementById("cta");
  if (cta) {
    cta.addEventListener("click", () => {
      const email = "hello@pauseai.uk";
      window.location.href = `mailto:${email}?subject=Subscribe%20to%20updates`;
    });
  }
});

