window.VA = window.VA || {};

VA.detectBase = function detectBase() {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts[0] === "vantly-airlines") return "/vantly-airlines";
  return "";
};

VA.href = function href(path) {
  return VA.detectBase() + path;
};

VA.assetPrefix = function assetPrefix() {
  return "../".repeat(Number(document.body.dataset.depth || "0"));
};

VA.hash = function hash(value) {
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

VA.airportByIata = function airportByIata(iata) {
  return VA.AIRPORTS.find((item) => item.iata === iata) || null;
};

VA.formatAirport = function formatAirport(airport) {
  return `${airport.name} ${airport.iata}`;
};

VA.parseISODate = function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

VA.toISODate = function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

VA.addDays = function addDays(iso, amount) {
  const date = VA.parseISODate(iso);
  date.setDate(date.getDate() + amount);
  return VA.toISODate(date);
};

VA.formatDateField = function formatDateField(iso) {
  const date = VA.parseISODate(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${VA.MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
};

VA.formatDayHeader = function formatDayHeader(iso) {
  const date = VA.parseISODate(iso);
  return `${VA.DAYS_FR[date.getDay()]} ${date.getDate()} ${VA.MONTHS_FR[date.getMonth()]}`;
};

VA.formatClock = function formatClock(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
};

VA.durationFor = function durationFor(origin, destination) {
  const key = `${origin}-${destination}`;
  const reverse = `${destination}-${origin}`;
  return VA.DURATION_MIN[key] || VA.DURATION_MIN[reverse] || 95;
};

VA.destinationsFrom = function destinationsFrom(origin) {
  const codes = VA.NETWORK[origin] || [];
  return codes.map((iata) => VA.airportByIata(iata)).filter(Boolean);
};

VA.searchAirports = function searchAirports(query, pool) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 3) return [];
  return pool.filter((airport) => {
    const haystack = [airport.iata, airport.city, airport.name, airport.country, ...(airport.aliases || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle) || airport.iata.toLowerCase().startsWith(needle);
  }).slice(0, 8);
};

VA.flightsFor = function flightsFor(origin, destination, iso) {
  if (new URLSearchParams(location.search).get("scenario") === "no-flights") return [];
  const duration = VA.durationFor(origin, destination);
  const seed = VA.hash(`${origin}-${destination}-${iso}`);
  const slots = [360, 505, 670, 880, 1025, 1230];
  const count = 4 + (seed % 3);
  const start = seed % 2;
  const chosen = slots.slice(start, start + count);
  return chosen.map((departMin, index) => {
    const arriveMin = departMin + duration;
    const number = 2200 + ((seed + index * 17) % 700);
    return {
      id: `${origin}${destination}${iso}${index}`,
      number: `VA ${number}`,
      origin,
      destination,
      date: iso,
      depart: VA.formatClock(departMin),
      arrive: VA.formatClock(arriveMin),
      durationMin: duration,
      label: `${VA.formatClock(departMin)} - ${VA.formatClock(arriveMin)}`,
    };
  });
};

VA.quoteReference = function quoteReference(payload) {
  const digest = VA.hash(JSON.stringify(payload)).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `VA-GRP-${digest}`;
};

VA.store = {
  key: "va_offer",
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(this.key) || "null");
    } catch {
      return null;
    }
  },
  set(data) {
    sessionStorage.setItem(this.key, JSON.stringify(data));
  },
  update(patch) {
    this.set({ ...(this.get() || {}), ...patch });
  },
  clear() {
    sessionStorage.removeItem(this.key);
  },
};

VA.cookiesAccepted = function cookiesAccepted() {
  return localStorage.getItem("va_cookies") === "accepted";
};

VA.acceptCookies = function acceptCookies() {
  localStorage.setItem("va_cookies", "accepted");
};

VA.requireCookies = function requireCookies() {
  if (VA.cookiesAccepted()) return true;
  const overlay = document.getElementById("cookie-banner");
  if (overlay) overlay.hidden = false;
  return false;
};

VA.mountCookies = function mountCookies() {
  if (VA.cookiesAccepted() || document.getElementById("cookie-banner")) return;
  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <div class="cookie-card" role="dialog" aria-labelledby="cookie-title">
      <h2 id="cookie-title">Vantly Airlines utilise des cookies</h2>
      <p>Des cookies fonctionnels sont nécessaires pour demander un devis groupe. Acceptez-les avant d’utiliser le formulaire.</p>
      <div class="cookie-actions">
        <button type="button" class="btn btn-ghost" data-cookie="refuse">Refuser</button>
        <button type="button" class="btn btn-primary" data-cookie="accept">Tout accepter</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
  banner.addEventListener("click", (event) => {
    const action = event.target.closest("[data-cookie]")?.dataset.cookie;
    if (action === "accept") {
      VA.acceptCookies();
      banner.remove();
    }
    if (action === "refuse") {
      banner.remove();
    }
  });
};

VA.mountEvalRibbon = function mountEvalRibbon() {
  if (document.querySelector(".eval-ribbon")) return;
  const ribbon = document.createElement("div");
  ribbon.className = "eval-ribbon";
  ribbon.textContent = "Site fictif Vantly Airlines — uniquement pour tests et evals. Aucune réservation réelle.";
  document.body.prepend(ribbon);
};

VA.bindAirportField = function bindAirportField(input, options) {
  const list = input.parentElement.querySelector(".suggest");
  const pool = () => options.pool();
  const setValue = (airport) => {
    input.value = VA.formatAirport(airport);
    input.dataset.iata = airport.iata;
    input.dataset.confirmed = "1";
    list.hidden = true;
    options.onSelect?.(airport);
  };
  input.addEventListener("input", () => {
    input.dataset.confirmed = "0";
    delete input.dataset.iata;
    const matches = options.emptyOnNoRoute && pool().length === 0
      ? []
      : VA.searchAirports(input.value, pool());
    if (input.value.trim().length < 3) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }
    if (!matches.length) {
      list.innerHTML = `<li class="suggest-empty">${options.emptyLabel || "Aucune destination"}</li>`;
      list.hidden = false;
      return;
    }
    list.innerHTML = matches.map((airport) => (
      `<li><button type="button" data-iata="${airport.iata}">${VA.formatAirport(airport)}</button></li>`
    )).join("");
    list.hidden = false;
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-iata]");
    if (!button) return;
    const airport = VA.airportByIata(button.dataset.iata);
    if (airport) setValue(airport);
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      list.hidden = true;
    }, 150);
  });
};

VA.bindDatepicker = function bindDatepicker(input, options) {
  input.readOnly = true;
  const popover = input.parentElement.querySelector(".datepicker");
  let view = options.value ? VA.parseISODate(options.value) : new Date();
  view.setDate(1);

  const render = () => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selected = input.dataset.iso || "";
    let cells = "";
    for (let i = 0; i < firstDay; i += 1) cells += "<span></span>";
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = VA.toISODate(new Date(year, month, day));
      const isSelected = iso === selected ? " is-selected" : "";
      cells += `<button type="button" class="cal-day${isSelected}" data-iso="${iso}">${day}</button>`;
    }
    popover.innerHTML = `
      <div class="cal-head">
        <button type="button" class="cal-nav" data-nav="-1" aria-label="Mois précédent">‹</button>
        <p>${VA.MONTHS_LONG_FR[month]} ${year}</p>
        <button type="button" class="cal-nav" data-nav="1" aria-label="Mois suivant">›</button>
      </div>
      <div class="cal-dow">${VA.DAYS_FR.map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="cal-grid">${cells}</div>
    `;
  };

  const open = () => {
    popover.hidden = false;
    render();
  };

  input.parentElement.querySelector(".icon-calendar")?.addEventListener("click", (event) => {
    event.preventDefault();
    open();
  });
  input.addEventListener("click", open);

  popover.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      view.setMonth(view.getMonth() + Number(nav.dataset.nav));
      render();
      return;
    }
    const day = event.target.closest(".cal-day");
    if (!day) return;
    input.dataset.iso = day.dataset.iso;
    input.dataset.picked = "1";
    input.value = VA.formatDateField(day.dataset.iso);
    input.placeholder = VA.formatDateField(day.dataset.iso);
    popover.hidden = true;
    options.onPick?.(day.dataset.iso);
  });

  document.addEventListener("click", (event) => {
    if (!input.parentElement.contains(event.target)) popover.hidden = true;
  });
};

VA.el = function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};
