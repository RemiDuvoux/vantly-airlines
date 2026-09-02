window.VA = window.VA || {};

function fieldError(id, show) {
  const node = document.getElementById(id);
  if (node) node.hidden = !show;
}

function renderFlagship() {
  document.getElementById("app").innerHTML = `
    <section class="panel" style="box-shadow:none;background:transparent;padding:0">
      <h1>Envoyer une demande de voyage en groupe</h1>
      <p class="lede">Veuillez remplir le formulaire ci-dessous pour demander un devis pour un voyage en groupe. Un groupe se compose d’au moins 10 passagers voyageant ensemble aux mêmes dates et sur les mêmes vols.</p>
      <div class="accordion">
        <article class="acc" id="acc-voyage">
          <button type="button" class="acc-head" data-acc="voyage">Voyage <span>▾</span></button>
          <div class="acc-body">
            <div class="field">
              <label for="tripType">Voyage *</label>
              <select id="tripType">
                <option value="one-way">Aller simple</option>
                <option value="return" selected>Aller-retour</option>
                <option value="multi_city">Multidestination</option>
              </select>
            </div>
            <div class="subblock">
              <h2>Vol de départ</h2>
              <div class="row-2">
                <div class="field">
                  <label for="origin">Départ de *</label>
                  <input id="origin" autocomplete="off">
                  <ul class="suggest" hidden></ul>
                  <p class="field-error" id="err-origin" hidden>Ce champ est obligatoire.</p>
                </div>
                <div class="field">
                  <label for="destination">Arrivée à *</label>
                  <input id="destination" autocomplete="off">
                  <ul class="suggest" hidden></ul>
                  <p class="field-error" id="err-destination" hidden>Ce champ est obligatoire.</p>
                </div>
              </div>
              <div class="row-2">
                <div class="field date-wrap">
                  <label for="outbound">Date de départ *</label>
                  <input id="outbound" placeholder="jj/mm/aaaa">
                  <button type="button" class="icon-calendar" aria-label="Open calendar">📅</button>
                  <div class="datepicker" hidden></div>
                  <p class="field-error" id="err-outbound" hidden>Ce champ est obligatoire.</p>
                </div>
                <div class="field">
                  <label for="timePref">Horaire de voyage souhaité *</label>
                  <select id="timePref">
                    <option value=""> </option>
                    <option value="Morning">Matin</option>
                    <option value="Afternoon">Après-midi</option>
                    <option value="Evening">Soir</option>
                    <option value="NoPreference" selected>Pas de préférence</option>
                  </select>
                </div>
              </div>
              <div class="row-2">
                <div class="field">
                  <label for="cabin">Cabine *</label>
                  <select id="cabin">
                    <option value="economy" selected>Economy</option>
                    <option value="premium-economy">Premium</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div class="field">
                  <label for="pax">Nombre de passagers *</label>
                  <input id="pax" type="number" min="1" value="10">
                  <p class="field-error" id="err-pax" hidden>Veuillez sélectionner 10 passagers au minimum.</p>
                </div>
              </div>
              <label class="choice" style="display:inline-flex;margin-top:0.6rem">
                <input type="checkbox" id="flexible"> Nos dates de voyage sont flexibles
              </label>
            </div>
            <div class="subblock" id="return-block">
              <h2>Vol de retour</h2>
              <div class="field date-wrap">
                <label for="returnDate">Date de retour *</label>
                <input id="returnDate" placeholder="jj/mm/aaaa">
                <button type="button" class="icon-calendar" aria-label="Open calendar">📅</button>
                <div class="datepicker" hidden></div>
                <p class="field-error" id="err-return" hidden>Ce champ est obligatoire.</p>
              </div>
            </div>
            <div class="actions"><button type="button" class="btn btn-primary" id="confirm-voyage">Confirmer</button></div>
          </div>
        </article>

        <article class="acc is-locked" id="acc-group">
          <button type="button" class="acc-head" data-acc="group">Groupe <span>▾</span></button>
          <div class="acc-body">
            <div class="field">
              <label for="groupName">Nom du groupe *</label>
              <input id="groupName">
              <p class="field-error" id="err-groupName" hidden>Ce champ est obligatoire.</p>
            </div>
            <div class="field">
              <label for="reason">Motif du voyage</label>
              <select id="reason">${VA.TRAVEL_REASONS.map((item) => `<option ${item === "Autre" ? "selected" : ""}>${item}</option>`).join("")}</select>
            </div>
            <div class="field">
              <label for="company">Nom de l'entreprise ou numéro bluebiz</label>
              <input id="company">
              <p class="lede">Ne remplissez ce champ que si tous les passagers du groupe appartiennent à la même entreprise.</p>
            </div>
            <h2>Personne à contacter</h2>
            <div>
              <p class="label">Civilité</p>
              <div class="choice-row">
                <label class="choice"><input class="hidden-radio" type="radio" name="civility" value="M." checked> M.</label>
                <label class="choice"><input class="hidden-radio" type="radio" name="civility" value="Mme"> Mme</label>
                <label class="choice"><input class="hidden-radio" type="radio" name="civility" value="Mx"> Mx</label>
              </div>
            </div>
            <div class="row-2">
              <div class="field"><label for="firstName">Prénom *</label><input id="firstName"><p class="field-error" id="err-firstName" hidden>Ce champ est obligatoire.</p></div>
              <div class="field"><label for="lastName">Nom de famille *</label><input id="lastName"><p class="field-error" id="err-lastName" hidden>Ce champ est obligatoire.</p></div>
            </div>
            <h2>Numéro de téléphone</h2>
            <div class="row-2">
              <div class="field">
                <label for="dial">Indicatif pays ou région *</label>
                <select id="dial">${VA.DIAL_CODES.map((item) => `<option value="${item.code}">${item.country} (${item.code})</option>`).join("")}</select>
              </div>
              <div class="field"><label for="phone">Numéro de téléphone *</label><input id="phone"><p class="field-error" id="err-phone" hidden>Ce champ est obligatoire.</p></div>
            </div>
            <div class="row-2">
              <div class="field"><label for="email">Adresse e-mail *</label><input id="email" type="email"><p class="field-error" id="err-email" hidden>Ce champ est obligatoire.</p></div>
              <div class="field"><label for="email2">Confirmer l'adresse e-mail *</label><input id="email2" type="email"><p class="field-error" id="err-email2" hidden>Ce champ est obligatoire.</p></div>
            </div>
            <h2>Adresse</h2>
            <div class="field"><label for="street">Nom de rue</label><input id="street"></div>
            <div class="row-2">
              <div class="field"><label for="city">Ville</label><input id="city"></div>
              <div class="field">
                <label for="country">Pays ou région *</label>
                <select id="country">
                  <option value=""> </option>
                  <option value="France" selected>France</option>
                  <option>Belgique</option>
                  <option>Pays-Bas</option>
                  <option>Portugal</option>
                </select>
                <p class="field-error" id="err-country" hidden>Ce champ est obligatoire.</p>
              </div>
            </div>
            <div class="actions"><button type="button" class="btn btn-primary" id="confirm-group">Confirmer</button></div>
          </div>
        </article>

        <article class="acc is-locked" id="acc-special">
          <button type="button" class="acc-head" data-acc="special">Demande spéciale <span>▾</span></button>
          <div class="acc-body">
            <div class="check-list">
              <label><input type="checkbox" name="special" value="extra-bags"> Bagages supplémentaires</label>
              <label><input type="checkbox" name="special" value="odd-size"> Bagages spéciaux ou plus grands</label>
              <label><input type="checkbox" name="special" value="sport"> Transport d'équipements de sport</label>
              <label><input type="checkbox" name="special" value="reduced-mobility"> Notre groupe comprend un passager à mobilité réduite</label>
            </div>
            <div class="field" style="margin-top:0.8rem">
              <label for="notes">Informations supplémentaires</label>
              <textarea id="notes" maxlength="500" rows="4" placeholder="Ajoutez plus d'informations sur votre demande ici"></textarea>
            </div>
            <div class="actions"><button type="button" class="btn btn-primary" id="confirm-special">Confirmer</button></div>
          </div>
        </article>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="submit" disabled>Envoyer ma demande</button>
      </div>
    </section>
  `;

  const confirmed = { voyage: false, group: false, special: false };
  const origin = document.getElementById("origin");
  const destination = document.getElementById("destination");

  VA.bindAirportField(origin, { pool: () => VA.AIRPORTS });
  VA.bindAirportField(destination, { pool: () => VA.AIRPORTS });
  VA.bindDatepicker(document.getElementById("outbound"), {});
  VA.bindDatepicker(document.getElementById("returnDate"), {});

  document.getElementById("tripType").addEventListener("change", (event) => {
    document.getElementById("return-block").hidden = event.target.value === "one-way";
  });

  document.getElementById("confirm-voyage").addEventListener("click", () => {
    if (!VA.requireCookies()) return;
    const pax = Number(document.getElementById("pax").value);
    const missingOrigin = origin.dataset.confirmed !== "1";
    const missingDest = destination.dataset.confirmed !== "1";
    const missingOut = document.getElementById("outbound").dataset.picked !== "1";
    const tripType = document.getElementById("tripType").value;
    const missingReturn = tripType !== "one-way" && document.getElementById("returnDate").dataset.picked !== "1";
    fieldError("err-origin", missingOrigin);
    fieldError("err-destination", missingDest);
    fieldError("err-outbound", missingOut);
    fieldError("err-return", missingReturn);
    fieldError("err-pax", pax < 10);
    if (missingOrigin || missingDest || missingOut || missingReturn || pax < 10) return;
    confirmed.voyage = true;
    document.getElementById("acc-group").classList.remove("is-locked");
  });

  document.getElementById("confirm-group").addEventListener("click", () => {
    const missing = [
      ["groupName", "err-groupName"],
      ["firstName", "err-firstName"],
      ["lastName", "err-lastName"],
      ["phone", "err-phone"],
      ["email", "err-email"],
      ["email2", "err-email2"],
      ["country", "err-country"],
    ];
    let ok = true;
    missing.forEach(([field, error]) => {
      const empty = !document.getElementById(field).value.trim();
      fieldError(error, empty);
      if (empty) ok = false;
    });
    if (document.getElementById("email").value.trim() !== document.getElementById("email2").value.trim()) {
      fieldError("err-email2", true);
      ok = false;
    }
    if (!ok) return;
    confirmed.group = true;
    document.getElementById("acc-special").classList.remove("is-locked");
  });

  document.getElementById("confirm-special").addEventListener("click", () => {
    confirmed.special = true;
    document.getElementById("submit").disabled = !(confirmed.voyage && confirmed.group && confirmed.special);
  });

  document.getElementById("submit").addEventListener("click", () => {
    if (!VA.requireCookies()) return;
    const body = {
      airline: "Vantly Airlines",
      product: "flagship-group-travel",
      iata: "VA",
      tripType: document.getElementById("tripType").value,
      origin: origin.dataset.iata,
      destination: destination.dataset.iata,
      outbound: document.getElementById("outbound").dataset.iso,
      returnDate: document.getElementById("returnDate").dataset.iso || null,
      timePreference: document.getElementById("timePref").value,
      cabin: document.getElementById("cabin").value,
      passengers: Number(document.getElementById("pax").value),
      flexibleDates: document.getElementById("flexible").checked,
      groupName: document.getElementById("groupName").value.trim(),
      reason: document.getElementById("reason").value,
      company: document.getElementById("company").value.trim(),
      contact: {
        civility: document.querySelector("[name=civility]:checked").value,
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        dial: document.getElementById("dial").value,
        phone: document.getElementById("phone").value.trim(),
        email: document.getElementById("email").value.trim(),
        country: document.getElementById("country").value,
        city: document.getElementById("city").value.trim(),
        street: document.getElementById("street").value.trim(),
      },
      specialRequests: [...document.querySelectorAll("[name=special]:checked")].map((node) => node.value),
      notes: document.getElementById("notes").value.trim(),
    };
    const payload = { ...body, reference: VA.quoteReference(body), status: "submitted" };
    sessionStorage.setItem("va_flag_confirmation", JSON.stringify(payload));
    location.href = VA.href("/group-travel/confirmation/");
  });
}

function renderFlagshipConfirm() {
  const payload = JSON.parse(sessionStorage.getItem("va_flag_confirmation") || "null");
  if (!payload) {
    location.replace(VA.href("/group-travel/"));
    return;
  }
  document.getElementById("app").innerHTML = `
    <section class="panel">
      <h1>Votre demande a bien été envoyée</h1>
      <p class="lede">Un conseiller groupes Vantly Airlines reviendra vers vous sous deux jours ouvrés.</p>
      <p class="confirm-ref" id="quote-reference">${payload.reference}</p>
      <pre class="payload" id="eval-payload">${JSON.stringify(payload, null, 2)}</pre>
      <div class="actions"><a class="btn btn-primary" href="${VA.href("/")}">Retour à l’accueil</a></div>
    </section>
  `;
}

VA.mountEvalRibbon();
VA.mountCookies();
if (document.body.dataset.page === "form") renderFlagship();
if (document.body.dataset.page === "confirm") renderFlagshipConfirm();
