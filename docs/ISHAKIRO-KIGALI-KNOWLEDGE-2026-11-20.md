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
- Administrative hierarchy published by the City: 35 sectors and 161 cells. Village totals conflict: the City overview lists 1,155, while the 2024–2025 Annual Report lists 1,163. Gasabo District pages also disagree (485 on one page, 481 on another). Ishakiro explicitly reports these discrepancies instead of claiming one number is definitive.
- District areas published by the City: Gasabo 429.3 km², Kicukiro 166.7 km² and Nyarugenge 134 km².
- The City overview lists neighbouring districts: Gicumbi and Rulindo to the north, Bugesera and Rwamagana to the east, and Kamonyi to the south.
- District cell counts included: Gasabo 73, Kicukiro 41, Nyarugenge 47 (total 161).
- Kigali's published reference coordinates and city-level climate summary are included (not live user location or a current weather forecast).
- The City's official vision, mission, six goals and main responsibilities are explained in all three languages.

Official source: City of Kigali, About Kigali City  
https://www.kigalicity.gov.rw/about/overview

City of Kigali Annual Report 2024–2025: https://www.kigalicity.gov.rw/fileadmin/user_upload/Kigali_city/Publications/Reports/City_of_Kigali_s_Annual_Report_2024-2025.pdf

City of Kigali Master Plan 2050 launch announcement: https://www.kigalicity.gov.rw/news-detail/city-of-kigali-launches-new-master-plan-2050

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
- Village counts are presented as conflicting source information, never as a single settled figure.
- District sector lists link to the district's official administration pages.
- A city-wide request for all sectors returns the complete list of all 35 sectors, grouped under Gasabo, Kicukiro and Nyarugenge, rather than only returning the total count.
- Language detection covers natural English and French phrasings such as attraction questions and requests to list the City's sectors.

Official source: National Institute of Statistics of Rwanda (NISR), Fifth Rwanda Population and Housing Census, Main Indicators Report, February 2023:
https://statistics.gov.rw/sites/default/files/documents/2025-02/RPHC5_MainIndicatorsReport_Final.pdf

Relevant locations in the report:
- Table 2: urban/rural population distribution and density indicators.
- Table 96: district and sector population counts, including male and female totals.
- Census reference period: August 2022.

### History

The City-level historical outline states that Kigali developed as a colonial administrative outpost in 1907, that Richard Kandt's office was on Nyarugenge Hill in 1908, and that Kigali became Rwanda's capital at independence in 1962.

Sources:
- Ministry of National Unity and Civic Engagement, History of Rwanda: https://www.minubumwe.gov.rw/fileadmin/user_upload/MINUBUMWE/Archives/NURC_Archives/HISTORY_OF_RWANDA_ENGLISH_BOOK.pdf
- Visit Rwanda, Kigali: https://visitrwanda.com/meet-in-rwanda/kigali/
- Rwanda Digital Library, Kandt House historical record: https://rwandadigitalibrary.gov.rw/pmb/opac_css/doc_num.php?explnum_id=440

Ishakiro deliberately does not assign the city's history to a particular district or sector. When asked for an individual district's or sector's history, it says a verified specific history source is not yet available and gives only the supported administrative and census facts.

## Behaviour and safety

- The existing kigali knowledge topic is reused; /api/ishakiro and /api/ai-router remain separate.
- Natural queries naming a Kigali district or sector are routed to Kigali knowledge where the match is unambiguous.
- Queries can ask about city/district area, population, sector lists, cell counts, density, boundaries, village-count discrepancies, city history, vision, mission, responsibilities, Master Plan 2050, tourism, economic contribution, coordinates and climate.
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
- City vision in French and responsibilities in Kinyarwanda.
- Master Plan 2050 and clear distinction between planned and completed projects.
- Kicukiro tourism highlights.
- Economic contribution and separate resident/commuter population measures.
- District cell counts and conflicting village totals.
- Complete city-wide list of all 35 sectors, checked in Kinyarwanda, English and French.
- English and French attraction questions return responses in the language used by the visitor.
- City reference coordinates and climate-versus-weather handling.

## Release boundary

This is a feature-branch implementation only. It is not a Production deployment, does not merge to main, does not change Vercel settings, and does not apply SQL to Supabase. CI and code review must pass before it is considered ready for integration.