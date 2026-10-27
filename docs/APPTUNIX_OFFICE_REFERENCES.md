# Apptunix Office — References and Verification Log

This file tracks what we actually know about the real office. Anything not marked **verified** is a provisional design choice that can be edited in `src/world/OfficeLayout.ts`.

## 1. Verified facts

| Fact | Source | Status |
|---|---|---|
| Address: 3rd Floor, C-127, Phase-8, Industrial Area, Sector 73, Mohali, Punjab 160071 | Apptunix contact page | ✅ Verified |
| Office is on the **3rd floor** of C-127 | Apptunix contact page | ✅ Verified |
| A third-party listing (IndiaMART) gives the floor as "basement" and two PIN codes (160071 / 160062) | IndiaMART | ⚠️ Conflicting, ignored in favour of the official site |

## 2. What could not be accessed

- **Glassdoor office photos** (link in the brief) require a login and aren't reachable by automated research.
- Web searches for "Apptunix Mohali office interior", "reception", "meeting room" and "workspace" returned **no interior photographs, floor plans or descriptions**.
- No public footage of the building facade or lobby was found.

**Consequence:** the 3rd-floor layout, room sizes, finishes and the building exterior are **not based on the real office**. They follow typical Mohali IT-office conventions (linear 1200×600 workstations with fabric partitions, glass-fronted meeting rooms, suspended 600×600 ceiling grid with LED panels, a pantry with a water dispenser) at real-world proportions.

## 3. Provisional decisions (all editable)

| Area | Current choice | Where to change it |
|---|---|---|
| Floor plate | 48 m × 34 m, 6 levels (G + 1–5), 4 m slab-to-slab, 3 m ceilings | `BUILDING` in `OfficeLayout.ts` |
| Core | Lift on the west side; washrooms and fire stairs either side of it | `CORE` |
| Zones | Reception, React, Angular, Node (south block); HR, DevOps, Design, QA (middle band); Break, CR1, CR2, CR3, Server, Lounge (north row) | `ZONES` rects |
| Corridors | Main corridor z 14–16.5 (2.5 m), north corridor z 23–25 (2.0 m) | `ZONES` |
| Seats | React 7 (named), Angular 12, Node 12, DevOps 4, Design 4, QA 6 | `REACT_TEAM`, `DEPT_SEATS` |
| Doors | Auto glass entrance, swing glass doors for HR/CR1–3, solid server-room door | `FLOOR3_DOORS` |
| Facade | Cream cladding, dark ribbon windows, 6 m pilaster grid, Apptunix sign at 3rd-floor band | `src/world/Building.ts` |
| Brand | Provisional logo, navy/blue/orange | `Palette.ts` (`brand*`), `drawLogo()` |

## 4. What to collect next (please send)

Priority order. Phone photos are fine; a tape-measure sketch is gold.

1. **Floor plan sketch** of the 3rd floor showing where each department, CR1/CR2/CR3, HR, the pantry and the lift are.
2. Photos of **reception**: desk shape, logo wall, waiting seating.
3. Photos of **one React workstation row**: desk size, partition height and colour, chairs.
4. **CR1, CR2, CR3**: glass or solid walls, table shape, screen or whiteboard positions.
5. **Ceiling and lights**: grid tiles, linear lights or panels; **floor**: carpet tiles or vinyl, and colours.
6. **Wall colours** and any branded walls, posters or murals.
7. Ground-floor **lobby and lift** (doors, indicator style, buttons) and the **building exterior** from the street.
8. The official **logo files** (SVG) and brand colour codes.

When a fact is confirmed, update the zone with `verified: true` in `OfficeLayout.ts` and add a row to §1.

## 5. Research sources
- Apptunix contact page — https://www.apptunix.com/contact-us/
- IndiaMART listing — https://m.indiamart.com/apptunix/other-services.html
- Glassdoor photos (login required) — https://www.glassdoor.com/Photos/Apptunix-Office-Photos-E809348.htm
