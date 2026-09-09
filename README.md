# Vantly Airlines

Fake airline group-quote website for browser-agent tests and evals. Zero backend, static files, GitHub Pages.

This is **not** a real carrier. No booking, payment, or PII is sent anywhere. Confirmation numbers are hashed in the browser from the submitted fields.

## Why it exists

Vantly’s `airline-quote` agent fills live group forms (Transavia `/groupoffer`, Air France `/group-travel`). Those sites rate-limit, show captchas, and change. This site copies the **interaction traps** from the platform skills, with a deterministic happy path.

| Path | Mirrors | Skill |
| --- | --- | --- |
| `/groupoffer/` | Transavia group offer wizard | `transavia-group-request` |
| `/group-travel/` | Air France group travel form | `air-france-group-bookings` |
| `/quote/` | Transavia-style group offer PDF | — |

Shared traps from `navigate-travel-forms`: 3-letter airport autocomplete + click a suggestion; datepicker only (typed dates are ignored).

## Local

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

## Eval contracts

After a successful submit:

- `#quote-reference` — e.g. `VA-GRP-AB12CD` (same inputs → same id)
- `#eval-payload` — JSON of the request

Hop (`/groupoffer`) extra rules:

- Cookie banner **Tout accepter** before the form
- Destination list is **only** routes from the chosen origin
- Flight buttons show times only (`6:00 - 7:20`), not `VA 2245`
- Grid is day-before / requested day / day-after; headers are `h6` like `ven. 11 sept.`
- Max 3 outbound + 3 inbound
- Dates not picked via the calendar → **Vol aller invalide sélectionné**
- Under 10 passengers → group request refused

Flagship (`/group-travel`) extra rules:

- Accordion sections unlock only after **Confirmer**
- Invalid fields: **Ce champ est obligatoire.**
- **Envoyer ma demande** stays disabled until all three sections are confirmed
- Default travel reason is **Autre**; default country is **France**

`/quote/` extra rules:

- Same airport autocomplete + datepicker as Hop
- Builds 3 outbound + 3 inbound fake flights with deterministic prices
- `#quote-reference` — e.g. `GB-572867` (same inputs → same id)
- `#eval-payload` — JSON of the generated offer
- Downloads `{GB-XXXXXX} - Offre de groupe.pdf`

Query flags:

- `?scenario=no-flights` — empty Hop offer grid
- `/quote/?origin=ORY&destination=OPO&outbound=2026-09-10&return=2026-09-15&pax=40` — prefill
- `&download=1` — also trigger the PDF download

## GitHub Pages

Publish the repo root (`/`) from `main`. Project pages live at:

`https://<user>.github.io/vantly-airlines/`
