window.VA = window.VA || {};

function hopChrome(current) {
  const steps = [
    ["search", "Demander un nouveau devis"],
    ["offers", "Sélectionner un vol"],
    ["bags", "Ajouter des bagages en soute"],
    ["booker", "Ajouter les détails de la personne qui réserve"],
    ["group", "Ajouter les détails du groupe"],
  ];
  return `
    <aside class="steps" aria-label="Étapes">
      ${steps.map(([id, label]) => `
        <div class="step ${id === current ? "is-current" : ""}">
          <span class="step-ico">✦</span>
          <span>${label}</span>
        </div>
      `).join("")}
    </aside>
  `;
}

function requireOffer(fields) {
  const state = VA.store.get();
  const missing = !state || fields.some((key) => {
    const value = state[key];
    if (Array.isArray(value)) return value.length === 0;
    if (key === "booker") return !value?.firstName;
    return !value;
  });
  if (missing) {
    location.replace(VA.href("/groupoffer/"));
    return null;
  }
  return state;
}

function renderSearch() {
  const today = new Date();
  today.setDate(today.getDate() + 14);
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="layout">
      ${hopChrome("search")}
      <section class="panel">
        <h1>Demander un devis pour un voyage de groupe</h1>
        <p class="lede">C’est rapide et simple de réserver un voyage de groupe avec Vantly Airlines. Demandez en premier lieu un ou plusieurs devis sans obligation d’achat.</p>
        <div class="fields">
          <div class="row-2">
            <div class="field">
              <label for="origin">De</label>
              <input id="origin" autocomplete="off" placeholder="Choisissez votre aéroport de départ">
              <ul class="suggest" hidden></ul>
            </div>
            <div class="field">
              <label for="destination">Vers</label>
              <input id="destination" autocomplete="off" placeholder="Choisissez votre destination">
              <ul class="suggest" hidden></ul>
              <p class="field-error" id="dest-hint" hidden></p>
            </div>
          </div>
          <div class="row-2">
            <div class="field date-wrap">
              <label for="outbound">Départ le</label>
              <input id="outbound" placeholder="Choisissez une date">
              <button type="button" class="icon-calendar" aria-label="Ouvrir le calendrier aller">📅</button>
              <div class="datepicker" hidden></div>
            </div>
            <div class="field date-wrap">
              <label for="returnDate">Retour le</label>
              <input id="returnDate" placeholder="Choisissez une date">
              <button type="button" class="icon-calendar" aria-label="Ouvrir le calendrier retour">📅</button>
              <div class="datepicker" hidden></div>
            </div>
          </div>
          <div>
            <p class="label">Qui voyagera ?</p>
            <p class="lede">Ajoutez ci-dessous vos compagnons de voyage.</p>
            <button type="button" class="pax-pill" id="pax-pill"><span id="pax-label">26 voyageurs</span><span>👥</span></button>
            <div class="pax-pop" id="pax-pop" hidden>
              <span>Voyageurs (minimum 10)</span>
              <div class="stepper">
                <button type="button" id="pax-minus" aria-label="Moins de voyageurs">−</button>
                <strong id="pax-value">26</strong>
                <button type="button" id="pax-plus" aria-label="Plus de voyageurs">+</button>
              </div>
            </div>
          </div>
        </div>
        <p class="alert" id="form-error" hidden></p>
        <div class="actions">
          <button type="button" class="btn btn-primary" id="search-flights">Rechercher les vols</button>
        </div>
      </section>
    </div>
  `;

  const origin = document.getElementById("origin");
  const destination = document.getElementById("destination");
  const destHint = document.getElementById("dest-hint");
  let pax = 26;

  const setPax = (value) => {
    pax = Math.min(99, Math.max(1, value));
    document.getElementById("pax-value").textContent = String(pax);
    document.getElementById("pax-label").textContent = `${pax} voyageurs`;
  };

  VA.bindAirportField(origin, {
    pool: () => VA.AIRPORTS,
    onSelect: () => {
      destination.value = "";
      destination.dataset.confirmed = "0";
      delete destination.dataset.iata;
    },
  });
  VA.bindAirportField(destination, {
    pool: () => {
      const from = origin.dataset.iata;
      if (!from) return [];
      return VA.destinationsFrom(from);
    },
    emptyOnNoRoute: true,
    emptyLabel: "Destinations depuis d'autres aéroports indisponibles — choisissez une destination depuis l’origine",
  });
  VA.bindDatepicker(document.getElementById("outbound"), {});
  VA.bindDatepicker(document.getElementById("returnDate"), {});

  document.getElementById("pax-pill").addEventListener("click", () => {
    document.getElementById("pax-pop").hidden = !document.getElementById("pax-pop").hidden;
  });
  document.getElementById("pax-minus").addEventListener("click", () => setPax(pax - 1));
  document.getElementById("pax-plus").addEventListener("click", () => setPax(pax + 1));

  document.getElementById("search-flights").addEventListener("click", () => {
    if (!VA.requireCookies()) return;
    const error = document.getElementById("form-error");
    destHint.hidden = true;
    error.hidden = true;
    if (origin.dataset.confirmed !== "1" || destination.dataset.confirmed !== "1") {
      error.textContent = "Sélectionnez une origine et une destination dans la liste.";
      error.hidden = false;
      return;
    }
    if (destination.dataset.iata && origin.dataset.iata) {
      const allowed = VA.destinationsFrom(origin.dataset.iata).some((item) => item.iata === destination.dataset.iata);
      if (!allowed) {
        destHint.textContent = "Choisissez une destination dans Destinations depuis l’aéroport d’origine.";
        destHint.hidden = false;
        return;
      }
    }
    const outbound = document.getElementById("outbound");
    const inbound = document.getElementById("returnDate");
    if (!outbound.dataset.iso || !inbound.dataset.iso) {
      error.textContent = "Utilisez le calendrier pour choisir les dates.";
      error.hidden = false;
      return;
    }
    if (pax < 10) {
      error.textContent = "La demande groupe Vantly Airlines n’est pas adaptée sous 10 passagers. Effectuez une réservation individuelle.";
      error.hidden = false;
      return;
    }
    VA.store.set({
      origin: origin.dataset.iata,
      destination: destination.dataset.iata,
      outbound: outbound.dataset.iso,
      returnDate: inbound.dataset.iso,
      calendarOutbound: outbound.dataset.picked === "1",
      calendarReturn: inbound.dataset.picked === "1",
      pax,
      outboundFlights: [],
      inboundFlights: [],
      holdBags: 0,
      booker: {},
    });
    location.href = VA.href("/groupoffer/flight-offers/");
  });
}

function offerColumn(iso, flights, selectedIds, kind, isTarget) {
  return `
    <div class="offer-col ${isTarget ? "is-target" : ""}">
      <h6>${VA.formatDayHeader(iso)}</h6>
      ${flights.map((flight) => `
        <button type="button" class="offer-btn OffersCarousel__button ${selectedIds.includes(flight.id) ? "is-selected" : ""}" data-kind="${kind}" data-id="${flight.id}" data-date="${iso}">
          ${flight.label}
        </button>
      `).join("") || `<p class="lede">Aucun vol</p>`}
    </div>
  `;
}

function renderOffers() {
  const state = requireOffer(["origin", "destination", "outbound", "returnDate"]);
  if (!state) return;
  const invalid = !state.calendarOutbound || !state.calendarReturn;
  const daysOut = [VA.addDays(state.outbound, -1), state.outbound, VA.addDays(state.outbound, 1)];
  const daysIn = [VA.addDays(state.returnDate, -1), state.returnDate, VA.addDays(state.returnDate, 1)];
  const outByDay = Object.fromEntries(daysOut.map((iso) => [iso, VA.flightsFor(state.origin, state.destination, iso)]));
  const inByDay = Object.fromEntries(daysIn.map((iso) => [iso, VA.flightsFor(state.destination, state.origin, iso)]));
  const selectedOut = state.outboundFlights || [];
  const selectedIn = state.inboundFlights || [];

  document.getElementById("app").innerHTML = `
    <div class="layout">
      ${hopChrome("offers")}
      <section class="panel">
        <h1>Sélectionner un vol</h1>
        <p class="lede">Vous pouvez demander trois vols aller et trois vols retour au maximum.</p>
        ${invalid ? `<p class="alert">Vol aller invalide sélectionné</p>` : ""}
        <h2>Aller ${state.origin} → ${state.destination}</h2>
        <div class="offer-grid" id="out-grid">
          ${daysOut.map((iso) => offerColumn(iso, outByDay[iso], selectedOut.map((f) => f.id), "out", iso === state.outbound)).join("")}
        </div>
        <h2>Retour ${state.destination} → ${state.origin}</h2>
        <div class="offer-grid" id="in-grid">
          ${daysIn.map((iso) => offerColumn(iso, inByDay[iso], selectedIn.map((f) => f.id), "in", iso === state.returnDate)).join("")}
        </div>
        <p class="label">Vols demandés</p>
        <div class="chips" id="chips"></div>
        <p class="alert" id="form-error" hidden></p>
        <div class="actions">
          <a class="btn btn-ghost" href="${VA.href("/groupoffer/")}">Retour</a>
          <button type="button" class="btn btn-primary" id="next">Suivant</button>
        </div>
      </section>
    </div>
  `;

  const allOut = Object.values(outByDay).flat();
  const allIn = Object.values(inByDay).flat();
  const paintChips = () => {
    const current = VA.store.get();
    document.getElementById("chips").innerHTML = [
      ...(current.outboundFlights || []).map((f) => `<span class="chip">Aller ${f.label}</span>`),
      ...(current.inboundFlights || []).map((f) => `<span class="chip">Retour ${f.label}</span>`),
    ].join("");
  };
  paintChips();

  document.querySelector(".panel").addEventListener("click", (event) => {
    const button = event.target.closest(".OffersCarousel__button");
    if (!button || invalid) return;
    const kind = button.dataset.kind;
    const listKey = kind === "out" ? "outboundFlights" : "inboundFlights";
    const catalog = kind === "out" ? allOut : allIn;
    const flight = catalog.find((item) => item.id === button.dataset.id);
    const current = VA.store.get();
    const selected = current[listKey] || [];
    const exists = selected.some((item) => item.id === flight.id);
    if (exists) {
      VA.store.update({ [listKey]: selected.filter((item) => item.id !== flight.id) });
    } else if (selected.length >= 3) {
      const error = document.getElementById("form-error");
      error.textContent = "Vous pouvez demander trois vols aller et trois vols retour au maximum.";
      error.hidden = false;
      return;
    } else {
      VA.store.update({ [listKey]: [...selected, flight] });
    }
    button.classList.toggle("is-selected");
    paintChips();
  });

  document.getElementById("next").addEventListener("click", () => {
    const current = VA.store.get();
    const error = document.getElementById("form-error");
    if (invalid) {
      error.textContent = "Vol aller invalide sélectionné";
      error.hidden = false;
      return;
    }
    if (!(current.outboundFlights || []).length || !(current.inboundFlights || []).length) {
      error.textContent = "Sélectionnez au moins un vol aller et un vol retour.";
      error.hidden = false;
      return;
    }
    location.href = VA.href("/groupoffer/ancillaries/");
  });
}

function renderBags() {
  const state = requireOffer(["outboundFlights", "inboundFlights"]);
  if (!state) return;
  document.getElementById("app").innerHTML = `
    <div class="layout">
      ${hopChrome("bags")}
      <section class="panel">
        <h1>Ajouter des bagages en soute</h1>
        <p class="lede">Un petit bagage cabine est inclus par défaut. Laissez les bagages en soute à 0 sauf besoin explicite.</p>
        <div class="pax-pop">
          <span>Bagages en soute 23 kg</span>
          <div class="stepper">
            <button type="button" id="bag-minus" aria-label="Moins de bagages">−</button>
            <strong id="bag-value">${state.holdBags || 0}</strong>
            <button type="button" id="bag-plus" aria-label="Plus de bagages">+</button>
          </div>
        </div>
        <div class="actions">
          <a class="btn btn-ghost" href="${VA.href("/groupoffer/flight-offers/")}">Retour</a>
          <button type="button" class="btn btn-primary" id="next">Suivant</button>
        </div>
      </section>
    </div>
  `;
  let bags = state.holdBags || 0;
  const paint = () => { document.getElementById("bag-value").textContent = String(bags); };
  document.getElementById("bag-minus").addEventListener("click", () => { bags = Math.max(0, bags - 1); paint(); });
  document.getElementById("bag-plus").addEventListener("click", () => { bags += 1; paint(); });
  document.getElementById("next").addEventListener("click", () => {
    VA.store.update({ holdBags: bags });
    location.href = VA.href("/groupoffer/booker-details/");
  });
}

function renderBooker() {
  const state = requireOffer(["pax"]);
  if (!state) return;
  const booker = state.booker || {};
  document.getElementById("app").innerHTML = `
    <div class="layout">
      ${hopChrome("booker")}
      <section class="panel">
        <h1>Détails de la personne en charge de la réservation</h1>
        <div class="fields">
          <div>
            <p class="label">Civilité</p>
            <div class="choice-row">
              <label class="choice"><input class="hidden-radio" type="radio" name="civility" value="Mr." ${booker.civility !== "Mme." ? "checked" : ""}> Mr.</label>
              <label class="choice"><input class="hidden-radio" type="radio" name="civility" value="Mme." ${booker.civility === "Mme." ? "checked" : ""}> Mme.</label>
            </div>
          </div>
          <div class="row-2">
            <div class="field"><label for="firstName">Prénom</label><input id="firstName" value="${booker.firstName || ""}"></div>
            <div class="field"><label for="lastName">Nom</label><input id="lastName" value="${booker.lastName || ""}"></div>
          </div>
          <div class="field"><label for="company">Agence / société</label><input id="company" value="${booker.company || ""}"></div>
          <div class="field"><label for="email">Email</label><input id="email" type="email" value="${booker.email || ""}"></div>
          <div class="row-2">
            <div class="field">
              <label for="dial">Indicatif</label>
              <select id="dial">${VA.DIAL_CODES.map((item) => `<option value="${item.code}" ${item.code === (booker.dial || "+33") ? "selected" : ""}>${item.country} (${item.code})</option>`).join("")}</select>
            </div>
            <div class="field"><label for="phone">Téléphone</label><input id="phone" inputmode="tel" value="${booker.phone || ""}"></div>
          </div>
        </div>
        <p class="alert" id="form-error" hidden></p>
        <div class="actions">
          <a class="btn btn-ghost" href="${VA.href("/groupoffer/ancillaries/")}">Retour</a>
          <button type="button" class="btn btn-primary" id="next">Suivant</button>
        </div>
      </section>
    </div>
  `;
  document.getElementById("next").addEventListener("click", () => {
    const next = {
      civility: document.querySelector("[name=civility]:checked").value,
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      company: document.getElementById("company").value.trim(),
      email: document.getElementById("email").value.trim(),
      dial: document.getElementById("dial").value,
      phone: document.getElementById("phone").value.trim(),
    };
    const error = document.getElementById("form-error");
    if (!next.firstName || !next.lastName || !next.company || !next.email || !next.phone) {
      error.textContent = "Ce champ est obligatoire.";
      error.hidden = false;
      return;
    }
    VA.store.update({ booker: next });
    location.href = VA.href("/groupoffer/group-details/");
  });
}

function renderGroup() {
  const state = requireOffer(["booker"]);
  if (!state) return;
  document.getElementById("app").innerHTML = `
    <div class="layout">
      ${hopChrome("group")}
      <section class="panel">
        <h1>Ajouter les détails du groupe</h1>
        <div class="fields">
          <div class="field">
            <label for="groupName">Nom du groupe</label>
            <input id="groupName" value="${state.groupName || ""}">
          </div>
          <p>Nombre de passagers : <strong id="pax-readonly">${state.pax} voyageurs</strong></p>
        </div>
        <p class="lede">L’envoi est définitif. Vérifiez l’itinéraire avant de cliquer sur Suivant.</p>
        <p class="alert" id="form-error" hidden></p>
        <div class="actions">
          <a class="btn btn-ghost" href="${VA.href("/groupoffer/booker-details/")}">Retour</a>
          <button type="button" class="btn btn-primary" id="next">Suivant</button>
        </div>
      </section>
    </div>
  `;
  document.getElementById("next").addEventListener("click", () => {
    const groupName = document.getElementById("groupName").value.trim();
    if (!groupName) {
      document.getElementById("form-error").textContent = "Ce champ est obligatoire.";
      document.getElementById("form-error").hidden = false;
      return;
    }
    VA.store.update({ groupName });
    const payload = buildHopPayload(VA.store.get());
    sessionStorage.setItem("va_confirmation", JSON.stringify(payload));
    location.href = VA.href("/groupoffer/confirmation/");
  });
}

function buildHopPayload(state) {
  const body = {
    airline: "Vantly Airlines",
    product: "hop-groupoffer",
    iata: "VA",
    origin: state.origin,
    destination: state.destination,
    outbound: state.outbound,
    returnDate: state.returnDate,
    passengers: state.pax,
    holdBags: state.holdBags || 0,
    groupName: state.groupName,
    booker: state.booker,
    flights: {
      outbound: state.outboundFlights,
      inbound: state.inboundFlights,
    },
  };
  return { ...body, reference: VA.quoteReference(body), status: "submitted" };
}

function renderConfirmation() {
  const payload = JSON.parse(sessionStorage.getItem("va_confirmation") || "null");
  if (!payload) {
    location.replace(VA.href("/groupoffer/"));
    return;
  }
  document.getElementById("app").innerHTML = `
    <section class="panel">
      <h1>Merci pour votre demande</h1>
      <p class="lede">Notre équipe groupes vous répondra sous deux jours ouvrés. Conservez ce numéro de dossier.</p>
      <p class="confirm-ref" id="quote-reference">${payload.reference}</p>
      <p>${payload.origin} → ${payload.destination} · ${payload.passengers} voyageurs</p>
      <h2>Données d’eval</h2>
      <pre class="payload" id="eval-payload">${JSON.stringify(payload, null, 2)}</pre>
      <div class="actions">
        <a class="btn btn-primary" href="${VA.href("/")}">Retour à l’accueil</a>
      </div>
    </section>
  `;
}

const page = document.body.dataset.page;
VA.mountEvalRibbon();
VA.mountCookies();
if (page === "search") renderSearch();
if (page === "offers") renderOffers();
if (page === "bags") renderBags();
if (page === "booker") renderBooker();
if (page === "group") renderGroup();
if (page === "confirm") renderConfirmation();
