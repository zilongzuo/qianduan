(function () {
  "use strict";

  var nav = document.querySelector(".nav");
  var toTop = document.querySelector(".to-top");
  var progress = document.querySelector(".progress");
  var ticking = false;

  function update() {
    var y = window.pageYOffset || document.documentElement.scrollTop;

    if (nav) nav.classList.toggle("is-stuck", y > 10);
    if (toTop) toTop.classList.toggle("show", y > 640);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (y / max) * 100 : 0;
      progress.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("in");
    });
  }
})();
