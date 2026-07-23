(() => {
  "use strict";

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const track = (event, data = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...data });
  };

  function scrollToForm(situation = "", location = "unknown") {
    const formSection = qs("#formulario");
    const situationField = qs("#leadForm-situacion");
    const nameField = qs("#leadForm-nombre");

    if (situation && situationField) {
      const optionExists = [...situationField.options].some((option) => option.value === situation);
      if (optionExists) situationField.value = situation;
    }

    track("cta_click", { location, situation });

    if (!formSection) return;

    formSection.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });

    window.setTimeout(() => {
      nameField?.focus({ preventScroll: true });
    }, 650);
  }

  function initHeader() {
    const header = qs("#siteHeader");
    const toggle = qs("#menuToggle");
    const links = qs("#navLinks");

    if (header) {
      const update = () => header.classList.toggle("is-scrolled", window.scrollY > 18);
      update();
      window.addEventListener("scroll", update, { passive: true });
    }

    if (!toggle || !links) return;

    toggle.addEventListener("click", () => {
      const open = !links.classList.contains("is-open");
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });

    qsa("a, button", links).forEach((item) => {
      item.addEventListener("click", () => {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      if (!links.classList.contains("is-open")) return;
      if (links.contains(event.target) || toggle.contains(event.target)) return;
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  function initCtas() {
    qsa(".js-scroll-form").forEach((cta) => {
      cta.addEventListener("click", (event) => {
        event.preventDefault();
        scrollToForm("", cta.dataset.location || "unknown");
      });
    });

    qsa(".js-select-case").forEach((card) => {
      card.addEventListener("click", () => {
        scrollToForm(
          card.dataset.situation || "",
          card.dataset.location || "service-card"
        );
      });
    });
  }

  function initReveal() {
    const items = qsa(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });

    items.forEach((item) => observer.observe(item));
  }

  function initFaq() {
    qsa(".faq-item").forEach((item) => {
      const button = qs("button", item);
      if (!button) return;

      button.addEventListener("click", () => {
        const shouldOpen = !item.classList.contains("is-open");

        qsa(".faq-item").forEach((other) => {
          other.classList.remove("is-open");
          qs("button", other)?.setAttribute("aria-expanded", "false");
        });

        if (shouldOpen) {
          item.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function initRail() {
    qsa("[data-rail]").forEach((wrapper) => {
      const rail = qs(".proof-rail", wrapper);
      const prev = qs("[data-rail-prev]", wrapper);
      const next = qs("[data-rail-next]", wrapper);
      if (!rail || !prev || !next) return;

      const move = (direction) => {
        rail.scrollBy({
          left: direction * rail.clientWidth * .78,
          behavior: "smooth"
        });
      };

      prev.addEventListener("click", () => move(-1));
      next.addEventListener("click", () => move(1));
    });
  }

  function initDynamicHero() {
    const term = (new URLSearchParams(window.location.search).get("utm_term") || "").toLowerCase();
    const title = qs("[data-dynamic-title]");
    const lead = qs("[data-dynamic-lead]");
    const situation = qs("#leadForm-situacion");
    if (!title || !lead) return;

    if (term.includes("inmobili")) {
      title.innerHTML = "¿Tienes un problema inmobiliario? <em>Revisemos tu caso.</em>";
      lead.textContent = "Cuéntanos qué ocurrió. Un abogado revisará la situación, te explicará las opciones que podrían aplicar y te orientará sobre los siguientes pasos.";
      if (situation) situation.value = "Problema inmobiliario";
    } else if (term.includes("negligencia") || term.includes("medica") || term.includes("médica")) {
      title.innerHTML = "¿Quieres revisar una atención médica? <em>Hablemos de tu caso.</em>";
      lead.textContent = "Cuéntanos lo esencial, sin enviar expedientes sensibles. Un abogado revisará el contexto inicial y te explicará cómo puede continuar la valoración.";
      if (situation) situation.value = "Posible negligencia médica";
    }
  }

  function initForm() {
    const form = qs("#leadForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
      const field = qs(`[name="${key}"]`, form);
      if (field) field.value = params.get(key) || "";
    });

    const validateField = (field) => {
      const wrapper = field.closest(".field");
      if (!wrapper) return field.checkValidity();

      const valid = field.checkValidity();
      wrapper.classList.toggle("has-error", !valid);
      const error = qs(".field-error", wrapper);

      if (error) {
        error.textContent = valid
          ? ""
          : field.validity.valueMissing
            ? "Completa este campo."
            : "Revisa la información.";
      }

      return valid;
    };

    qsa("input[required], select[required], textarea[required]", form).forEach((field) => {
      if (field.type === "checkbox") return;
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.closest(".field")?.classList.contains("has-error")) validateField(field);
      });
      field.addEventListener("change", () => {
        if (field.closest(".field")?.classList.contains("has-error")) validateField(field);
      });
    });

    let submitting = false;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (submitting) return;

      const visibleRequired = qsa("input[required], select[required], textarea[required]", form)
        .filter((field) => field.type !== "checkbox");

      const fieldsValid = visibleRequired.map(validateField).every(Boolean);
      const checkbox = qs('input[type="checkbox"][required]', form);

      if (!fieldsValid || (checkbox && !checkbox.checked) || !form.reportValidity()) {
        qs(":invalid", form)?.focus();
        return;
      }

      const lead = Object.fromEntries(new FormData(form).entries());
      lead.brand = "Navigo Corpore";
      lead.createdAt = new Date().toISOString();
      sessionStorage.setItem("landingLead", JSON.stringify(lead));

      track("lead_submit", {
        brand: lead.brand,
        situacion: lead.situacion || "",
        ubicacion: lead.ubicacion || ""
      });

      submitting = true;
      const button = qs("#submitButton");
      const label = qs(".submit-label", button);
      const loading = qs(".submit-loading", button);

      if (button) button.disabled = true;
      if (label) label.hidden = true;
      if (loading) loading.hidden = false;

      /*
        Integración pendiente:
        reemplazar esta simulación por el endpoint real de Monday.com,
        CRM o webhook. Esta versión no transmite datos fuera del navegador.
      */
      window.setTimeout(() => {
        window.location.assign(form.dataset.thanks || "gracias.html");
      }, 550);
    });
  }

  function initScrollTracking() {
    const milestones = new Set();

    const handler = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;

      const percentage = Math.round((window.scrollY / max) * 100);
      [50, 90].forEach((milestone) => {
        if (percentage >= milestone && !milestones.has(milestone)) {
          milestones.add(milestone);
          track(`scroll_${milestone}`, { brand: "Navigo Corpore" });
        }
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
  }

  function initParticles() {
    const canvas = qs("#siteParticles");
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let frame = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(24, Math.min(62, Math.round((width * height) / 28000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: .5 + Math.random() * 1.3,
        vx: (Math.random() - .5) * .08,
        vy: -.05 - Math.random() * .1,
        alpha: .10 + Math.random() * .22
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        context.beginPath();
        context.fillStyle = `rgba(200, 170, 114, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        context.fill();

        if (!reduced) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.y < -4) {
            particle.y = height + 4;
            particle.x = Math.random() * width;
          }
          if (particle.x < -4) particle.x = width + 4;
          if (particle.x > width + 4) particle.x = -4;
        }
      });

      if (!reduced) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", () => {
      cancelAnimationFrame(frame);
      resize();
      draw();
    }, { passive: true });
  }

  function initThanks() {
    if (document.body.dataset.page !== "thanks") return;

    let lead = {};
    try {
      lead = JSON.parse(sessionStorage.getItem("landingLead") || "{}");
    } catch (error) {
      console.warn("No fue posible leer la solicitud.", error);
    }

    const message = qs("#thanksMessage");
    const summary = qs("#thanksSummary");
    const name = (lead.nombre || "").trim();

    if (name && message) {
      message.textContent = `${name}, recibimos tu solicitud. El equipo de Navigo Corpore revisará la información inicial y te contactará para conocer el contexto y explicarte los siguientes pasos.`;
    }

    if (summary && (lead.situacion || lead.ubicacion || lead.etapa)) {
      const rows = [
        lead.situacion ? `<strong>${escapeHtml(lead.situacion)}</strong>` : "",
        lead.ubicacion ? `<span>Ubicación: ${escapeHtml(lead.ubicacion)}</span>` : "",
        lead.etapa ? `<span>Etapa: ${escapeHtml(lead.etapa)}</span>` : ""
      ].filter(Boolean);

      summary.innerHTML = rows.join("");
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initCtas();
    initReveal();
    initFaq();
    initRail();
    initDynamicHero();
    initForm();
    initScrollTracking();
    initParticles();
    initThanks();
    track("view_hero", { brand: "Navigo Corpore" });
  });
})();
