# Ishakiro — Kigali City knowledge expansion

Checked and added: 20 November 2026  
Working branch: feature/ishakiro-kigali-city-knowledge-20261120

## Purpose

Expand Iwacu AI (Ishakiro) so residents and visitors can ask detailed questions about the City of Kigali in Kinyarwanda, English and French. This work is limited to Kigali City knowledge. It does not change location detection, leader data, Supabase schema, production settings, or the public deployment.

## Verified information included

### City-wide administration and profile

- Kigali is Rwanda's capital and a first-level administrative entity alongside the four Provinces; it is not a fifth Province.
- Area: 730 km².
- Districts: Gasabo, Kicukiro and Nyarugenge.
- Administrative hierarchy published by the City: 35 sectors, 161 cells and 1,155 villages.
- District areas published by the City: Gasabo 429.3 km², Kicukiro 166.7 km² and Nyarugenge 134 km².
- The City overview lists neighbouring districts: Gicumbi and Rulindo to the north, Bugesera and Rwamagana to the east, and Kamonyi to the south.

Official source: City of Kigali, About Kigali City  
https://www.kigalicity.gov.rw/about/overview

Administrative source: City of Kigali, Good Governance and Territorial Administration  
https://www.kigalicity.gov.rw/1/good-governance-and-territorial-administration

### Population and sectors

Population facts are explicitly labelled as the August 2022 census, not as live/current estimates.

- City of Kigali: 1,745,555 people.
- Gasabo: 879,505 people; 15 sectors.
- Kicukiro: 491,731 people; 10 sectors.
- Nyarugenge: 374,319 people; 10 sectors.
- For all 35 sectors, the assistant includes the NISR Table 96 total and male/female counts.
- The district population replies also distinguish urban and rural census counts.
- Census-based density is included for the City and the three districts.

Official source: National Institute of Statistics of Rwanda (NISR), Fifth Rwanda Population and Housing Census, Main Indicators Report, February 2023:
https://statistics.gov.rw/sites/default/files/documents/2025-02/RPHC5_MainIndicatorsReport_Final.pdf

Relevant locations in the report:
- Table 2: urban/rural population distribution and density indicators.
- Table 96: district and sector population counts, including male and female totals.
- Census reference period: August 2022.

### History

The City-level historical outline states that Kigali developed as a colonial administrative outpost in 1907, that Richard Kandt's office was on Nyarugenge Hill in 1908, and that Kigali became Rwanda's capital at independence in 1962.

Sources:
- Visit Rwanda, Kigali: https://visitrwanda.com/meet-in-rwanda/kigali/
- Rwanda Digital Library, Kandt House historical record: https://rwandadigitalibrary.gov.rw/pmb/opac_css/doc_num.php?explnum_id=440

Ishakiro deliberately does not assign the city's history to a particular district or sector. When asked for an individual district's or sector's history, it says a verified specific history source is not yet available and gives only the supported administrative and census facts.

## Behaviour and safety

- The existing kigali knowledge topic is reused; /api/ishakiro and /api/ai-router remain separate.
- Natural queries naming a Kigali district or sector are routed to Kigali knowledge where the match is unambiguous.
- Queries can ask about city/district area, population, sector lists, density, boundaries and city history.
- Census counts always carry the year 2022. They are not described as today's population.
- A missing district/sector area or individual history is disclosed instead of invented.
- The Nyarugenge and Kicukiro district/sector name overlaps are handled by respecting explicit words such as “Akarere/District” and “Umurenge/Sector”. Kigali Sector is distinguished from Kigali City when the user explicitly asks for a sector.
- Responses and suggested follow-up questions are authored in Kinyarwanda, English and French.

## Tests added

The assistant engine tests cover:
- Kigali's 730 km² area.
- Gasabo's population and census date.
- Kinyinya Sector's population and administrative parent.
- Gasabo's complete list of 15 sectors.
- Kigali's city-level history.
- Safe handling of a sector-history question with no verified source.
- French-language Kigali population response.
- Gasabo district area.

## Release boundary

This is a feature-branch implementation only. It is not a Production deployment, does not merge to main, does not change Vercel settings, and does not apply SQL to Supabase. CI and code review must pass before it is considered ready for integration.