window.VA = window.VA || {};

const CITY_LABEL = {
  ORY: "Paris (Orly)",
  CDG: "Paris (Charles de Gaulle)",
  LHR: "Londres (Heathrow)",
  LGW: "Londres (Gatwick)",
};

function cityLabel(airport) {
  return CITY_LABEL[airport.iata] || airport.city;
}

function padTime(clock) {
  const [hours, minutes] = String(clock).split(":");
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function formatEnglishDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(VA.parseISODate(iso));
}

function formatEur(amount) {
  return `€${amount.toFixed(2)}`;
}

function groupNameFor(origin, destination, outbound) {
  const date = VA.parseISODate(outbound);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `Vantly ${origin} ${destination} ${month}${year}`;
}

function offerReference(payload) {
  const n = (VA.hash(JSON.stringify(payload)) % 900000) + 100000;
  return `GB-${n}`;
}

function priceFor(flight, pax, index) {
  const cents = 6810 + index * 2300 + (VA.hash(flight.id) % 800);
  const perPax = cents / 100;
  return { perPax, total: Math.round(perPax * pax * 100) / 100 };
}

function pricedOptions(origin, destination, iso, pax, startIndex) {
  return VA.flightsFor(origin, destination, iso).slice(0, 3).map((flight, index) => {
    const price = priceFor(flight, pax, index);
    const from = VA.airportByIata(origin);
    const to = VA.airportByIata(destination);
    return {
      index: startIndex + index,
      date: iso,
      dateLabel: formatEnglishDate(iso),
      depart: padTime(flight.depart),
      arrive: padTime(flight.arrive),
      originIata: origin,
      destIata: destination,
      originCity: cityLabel(from),
      destCity: cityLabel(to),
      number: `VA${7600 + (startIndex + index) * 4 + (VA.hash(flight.id) % 4)}`,
      perPax: price.perPax,
      total: price.total,
    };
  });
}

VA.buildGroupOffer = function buildGroupOffer(input) {
  const origin = VA.airportByIata(input.origin);
  const destination = VA.airportByIata(input.destination);
  if (!origin || !destination) {
    return { ok: false, error: "Sélectionnez une origine et une destination dans la liste." };
  }
  const allowed = VA.destinationsFrom(origin.iata).some((item) => item.iata === destination.iata);
  if (!allowed) {
    return { ok: false, error: "Choisissez une destination desservie depuis l’aéroport d’origine." };
  }
  if (!input.outbound || !input.returnDate) {
    return { ok: false, error: "Utilisez le calendrier pour choisir les dates." };
  }
  if (input.returnDate < input.outbound) {
    return { ok: false, error: "La date de retour doit être après le départ." };
  }
  const pax = Number(input.pax);
  if (!Number.isFinite(pax) || pax < 10 || pax > 99) {
    return { ok: false, error: "Indiquez entre 10 et 99 passagers." };
  }

  const firstName = (input.firstName || "Remi").trim() || "Remi";
  const email = (input.email || "remi@getvantly.com").trim() || "remi@getvantly.com";
  const groupName = groupNameFor(origin.iata, destination.iata, input.outbound);
  const outboundOptions = pricedOptions(origin.iata, destination.iata, input.outbound, pax, 1);
  const inboundOptions = pricedOptions(destination.iata, origin.iata, input.returnDate, pax, 1 + outboundOptions.length);
  if (!outboundOptions.length || !inboundOptions.length) {
    return { ok: false, error: "Aucun vol disponible pour ces dates." };
  }

  const identity = {
    origin: origin.iata,
    destination: destination.iata,
    outbound: input.outbound,
    returnDate: input.returnDate,
    pax,
    groupName,
  };

  return {
    ok: true,
    offer: {
      ...identity,
      reference: offerReference(identity),
      firstName,
      lastName: (input.lastName || "Duvoux").trim() || "Duvoux",
      email,
      outboundOptions,
      inboundOptions,
    },
  };
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function letterParagraphs(offer) {
  return [
    `Nous vous remercions pour votre demande d'offre concernant le groupe ${offer.groupName}. Vous trouverez la/les offre(s) de groupe requise(s) ci-dessous. Les conditions générales applicables aux offres de groupes sont en pièce-jointe du présent e-mail.`,
    "Nous vous conseillons de ne pas trop attendre car la/les offre(s) sont basées sur les sièges actuellement disponibles. Si ces disponibilités sont différentes au moment où vous confirmez votre réservation, nous vous ferons parvenir une offre actualisée avec les prix et disponibilités valables à ce moment-là.",
    "Si vous avez besoin de plus de temps pour prendre une décision, vous pouvez mettre cette offre en option en répondant à cet e-mail et en précisant bien quelle option vous souhaitez poser. Nous demandons alors un règlement de €100 pour les groupes comptant jusqu'à 50 passagers ou de €200 pour les groupes plus importants, pour lequel vous recevrez un lien de paiement. Cette possibilité est ouverte jusqu'à 60 jours avant le départ.",
    "Nous offrons la possibilité de prolonger la période d'option pour les réservations effectuées plus de 180 jours avant le départ. Pour un versement de 200 €, ce délai peut être prolongé de deux semaines supplémentaires, en plus des 21 jours actuels.",
    "Si vous souhaitez poursuivre le processus de réservation, veuillez répondre à cet e-mail en indiquant la ou les options choisies.",
  ];
}

function optionCardHtml(option, pax) {
  return `
    <article class="quote-option">
      <div class="quote-option-head">
        <strong>Option ${option.index}</strong>
        <span>Indiqué en Heure Locale</span>
      </div>
      <p class="quote-date">${option.dateLabel}</p>
      <div class="quote-legs">
        <div>
          <strong>${option.depart}</strong>
          <span>${option.originCity}</span>
          <span class="quote-iata">${option.originIata}</span>
        </div>
        <div class="quote-leg-line" aria-hidden="true"></div>
        <div>
          <strong>${option.arrive}</strong>
          <span>${option.destCity}</span>
          <span class="quote-iata">${option.destIata}</span>
        </div>
      </div>
      <p class="quote-flight">Numéro de vol: ${option.number}</p>
      <table class="quote-price">
        <thead>
          <tr><th></th><th>Par passager</th><th>Total</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${pax} x Adultes et Enfants</td>
            <td>${formatEur(option.perPax)}</td>
            <td>${formatEur(option.total)}</td>
          </tr>
          <tr class="is-total">
            <td>Total</td>
            <td></td>
            <td>${formatEur(option.total)}</td>
          </tr>
        </tbody>
      </table>
    </article>
  `;
}

function documentHtml(offer) {
  const paragraphs = letterParagraphs(offer).map((text) => `<p>${text}</p>`).join("");
  return `
    <article class="quote-sheet" id="quote-document">
      <header class="quote-mailhead">
        <p><span>De</span> Vantly Airlines &lt;groupes@vantly-airlines.test&gt;</p>
        <p><span>À</span> ${escapeHtml(offer.firstName)} ${escapeHtml(offer.lastName)} &lt;${escapeHtml(offer.email)}&gt;</p>
        <p><span>Objet</span> ${escapeHtml(offer.reference)} - Offre de groupe</p>
      </header>
      <p class="quote-kicker">Offre de groupe</p>
      <h1>Cher/Chere ${escapeHtml(offer.firstName)}</h1>
      ${paragraphs}
      <p>Cordialement,<br>Le Service Groupes.<br>T 01 84 88 00 00</p>
      <h2>Vol Aller</h2>
      ${offer.outboundOptions.map((option) => optionCardHtml(option, offer.pax)).join("")}
      <h2>Vol retour</h2>
      ${offer.inboundOptions.map((option) => optionCardHtml(option, offer.pax)).join("")}
    </article>
  `;
}

VA.downloadGroupOfferPdf = function downloadGroupOfferPdf(offer) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  const width = 174;
  const bottom = 280;
  let y = 18;

  const ensure = (needed) => {
    if (y + needed <= bottom) return;
    doc.addPage();
    y = 18;
  };

  const textBlock = (text, size, style, leading) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width);
    ensure(lines.length * leading + 1);
    doc.text(lines, left, y);
    y += lines.length * leading;
  };

  doc.setFillColor(34, 92, 72);
  doc.rect(0, 0, 210, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Vantly Airlines", left, 9);
  doc.setFont("helvetica", "normal");
  doc.text("Service Groupes", 210 - left, 9, { align: "right" });
  doc.setTextColor(30, 30, 30);
  y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Offre de groupe", left, y);
  doc.setFontSize(12);
  doc.text(offer.reference, 210 - left, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`De : Vantly Airlines <groupes@vantly-airlines.test>`, left, y);
  y += 4.2;
  doc.text(`A : ${offer.firstName} ${offer.lastName} <${offer.email}>`, left, y);
  y += 4.2;
  doc.text(`Objet : ${offer.reference} - Offre de groupe`, left, y);
  y += 8;
  doc.setDrawColor(210, 210, 210);
  doc.line(left, y, left + width, y);
  y += 8;
  doc.setTextColor(30, 30, 30);

  textBlock(`Cher/Chere ${offer.firstName}`, 12, "bold", 6);
  y += 2;
  const paragraphs = letterParagraphs(offer);
  paragraphs.forEach((paragraph, index) => {
    const last = index === paragraphs.length - 1;
    textBlock(paragraph, 10, last ? "bold" : "normal", 5);
    y += 3;
  });
  y += 1;
  textBlock("Cordialement,", 10, "normal", 5);
  textBlock("Le Service Groupes.", 10, "normal", 5);
  textBlock("T 01 84 88 00 00", 10, "normal", 5);
  y += 6;

  const drawOption = (option) => {
    const blockHeight = 52;
    ensure(blockHeight);
    doc.setDrawColor(210, 210, 210);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(left, y, width, 48, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`Option ${option.index}`, left + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("Indique en Heure Locale", left + width - 4, y + 6, { align: "right" });
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.text(option.dateLabel, left + 4, y + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(option.depart, left + 4, y + 23);
    doc.text(option.arrive, left + 92, y + 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(option.originCity, left + 4, y + 29);
    doc.text(option.destCity, left + 92, y + 29);
    doc.setFont("helvetica", "bold");
    doc.text(option.originIata, left + 4, y + 34);
    doc.text(option.destIata, left + 92, y + 34);
    doc.setFont("helvetica", "normal");
    doc.text(`Numero de vol: ${option.number}`, left + 4, y + 40);
    doc.setFontSize(8);
    doc.text("Par passager", left + 128, y + 13);
    doc.text("Total", left + width - 4, y + 13, { align: "right" });
    doc.setFontSize(9);
    doc.text(`${offer.pax} x Adultes et Enfants`, left + 92, y + 40);
    doc.text(formatEur(option.perPax), left + 140, y + 40);
    doc.setFont("helvetica", "bold");
    doc.text(formatEur(option.total), left + width - 4, y + 40, { align: "right" });
    y += 54;
  };

  textBlock("Vol Aller", 13, "bold", 7);
  y += 2;
  offer.outboundOptions.forEach(drawOption);
  y += 2;
  textBlock("Vol retour", 13, "bold", 7);
  y += 2;
  offer.inboundOptions.forEach(drawOption);

  doc.save(`${offer.reference} - Offre de groupe.pdf`);
};

function prefillFromQuery() {
  const params = new URLSearchParams(location.search);
  return {
    origin: (params.get("origin") || "").toUpperCase(),
    destination: (params.get("destination") || "").toUpperCase(),
    outbound: params.get("outbound") || "",
    returnDate: params.get("return") || params.get("returnDate") || "",
    pax: Number(params.get("pax") || 40),
    firstName: params.get("firstName") || "Remi",
    lastName: params.get("lastName") || "Duvoux",
    email: params.get("email") || "remi@getvantly.com",
    download: params.get("download") === "1",
  };
}

function applyAirport(input, iata) {
  const airport = VA.airportByIata(iata);
  if (!airport || !input) return;
  input.value = VA.formatAirport(airport);
  input.dataset.iata = airport.iata;
  input.dataset.confirmed = "1";
}

function applyDate(input, iso) {
  if (!input || !iso) return;
  input.dataset.iso = iso;
  input.dataset.picked = "1";
  input.value = VA.formatDateField(iso);
  input.placeholder = VA.formatDateField(iso);
}

function collectForm(pax) {
  return {
    origin: document.getElementById("origin").dataset.iata,
    destination: document.getElementById("destination").dataset.iata,
    outbound: document.getElementById("outbound").dataset.iso,
    returnDate: document.getElementById("returnDate").dataset.iso,
    pax,
    firstName: document.getElementById("firstName").value,
    lastName: document.getElementById("lastName").value,
    email: document.getElementById("email").value,
  };
}

function renderForm(seed) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="panel">
      <h1>Générer une offre de groupe</h1>
      <p class="lede">Entrez une route et des dates. Le PDF reprend la structure d’une offre Transavia (lettre, options aller/retour, prix par passager) avec des vols Vantly déterministes.</p>
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
          <button type="button" class="pax-pill" id="pax-pill"><span id="pax-label">${seed.pax} voyageurs</span><span>👥</span></button>
          <div class="pax-pop" id="pax-pop" hidden>
            <span>Voyageurs (minimum 10)</span>
            <div class="stepper">
              <button type="button" id="pax-minus" aria-label="Moins de voyageurs">−</button>
              <strong id="pax-value">${seed.pax}</strong>
              <button type="button" id="pax-plus" aria-label="Plus de voyageurs">+</button>
            </div>
          </div>
        </div>
        <div class="row-2">
          <div class="field">
            <label for="firstName">Prénom du booker</label>
            <input id="firstName" value="${seed.firstName}">
          </div>
          <div class="field">
            <label for="lastName">Nom du booker</label>
            <input id="lastName" value="${seed.lastName}">
          </div>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" value="${seed.email}">
        </div>
      </div>
      <p class="alert" id="form-error" hidden></p>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="build-offer">Générer l’offre PDF</button>
      </div>
    </section>
    <div id="quote-result" hidden></div>
  `;

  let pax = Math.min(99, Math.max(10, seed.pax || 40));
  const origin = document.getElementById("origin");
  const destination = document.getElementById("destination");

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
    emptyLabel: "Aucune destination depuis cet aéroport",
  });
  VA.bindDatepicker(document.getElementById("outbound"), {});
  VA.bindDatepicker(document.getElementById("returnDate"), {});
  applyAirport(origin, seed.origin);
  applyAirport(destination, seed.destination);
  applyDate(document.getElementById("outbound"), seed.outbound);
  applyDate(document.getElementById("returnDate"), seed.returnDate);

  document.getElementById("pax-pill").addEventListener("click", () => {
    document.getElementById("pax-pop").hidden = !document.getElementById("pax-pop").hidden;
  });
  document.getElementById("pax-minus").addEventListener("click", () => setPax(pax - 1));
  document.getElementById("pax-plus").addEventListener("click", () => setPax(pax + 1));

  const showOffer = (download) => {
    const error = document.getElementById("form-error");
    error.hidden = true;
    const result = VA.buildGroupOffer(collectForm(pax));
    if (!result.ok) {
      error.textContent = result.error;
      error.hidden = false;
      return;
    }
    renderResult(result.offer, download);
  };

  document.getElementById("build-offer").addEventListener("click", () => showOffer(true));

  if (seed.origin && seed.destination && seed.outbound && seed.returnDate) {
    showOffer(seed.download);
  }
}

function renderResult(offer, download) {
  const holder = document.getElementById("quote-result");
  holder.hidden = false;
  holder.innerHTML = `
    <section class="panel quote-toolbar">
      <div>
        <p class="quote-kicker">Offre générée</p>
        <p class="confirm-ref" id="quote-reference">${escapeHtml(offer.reference)}</p>
        <p class="lede">${escapeHtml(offer.origin)} → ${escapeHtml(offer.destination)} · ${offer.pax} voyageurs · ${escapeHtml(offer.groupName)}</p>
      </div>
      <div class="actions" style="margin-top:0">
        <button type="button" class="btn btn-primary" id="download-pdf">Télécharger le PDF</button>
      </div>
    </section>
    ${documentHtml(offer)}
    <section class="panel">
      <h2>Données d’eval</h2>
      <pre class="payload" id="eval-payload">${JSON.stringify(offer, null, 2)}</pre>
    </section>
  `;
  document.getElementById("download-pdf").addEventListener("click", () => {
    VA.downloadGroupOfferPdf(offer);
  });
  holder.scrollIntoView({ behavior: "smooth", block: "start" });
  if (download) VA.downloadGroupOfferPdf(offer);
}

VA.mountEvalRibbon();
renderForm(prefillFromQuery());
