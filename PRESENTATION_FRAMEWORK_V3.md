# VSC Platform V3 — Presentation Framework Specification (PRESENTATION_FRAMEWORK_V3)
Version: 1.0 (Official Standard)

This document establishes the official architectural guidelines and conventions for the **Presentation Layer** inside the Vietnam Slingshot Championship (VSC) Platform V3. 

The primary objective of the Presentation Framework is to decouple user interface (UI) rendering from the core business execution engines, enforcing a strict **Passive Consumer** model across all client applications (Web, Mobile, and Public Dashboards).

---

## 1. Presentation Architectural Philosophy

1. **Passive Consumer Model**:
   UI Views and screen layouts must contain **zero business logic, score reductions, or tie-breaker calculations**. The UI's sole responsibility is to ingest pre-compiled snapshots from the Core Domains (Athlete, Club, Province, Season, Tournament) and map them directly to visual layouts.
2. **Modular Composition Pattern**:
   Screens are not built as monolithic page files. Every screen is assembled strictly as a composite hierarchy of reusable **Widgets** and **Cards** bound to domain data.
3. **Data Binding Isolation**:
   Views and Widgets are forbidden from making raw queries to `/official_score_ledger`. They must bind exclusively to stable snapshots in collections like `/career_snapshots`, `/statistics_snapshots`, `/season_rankings`, and `/seasons`.
4. **Responsive Integrity**:
   All visual components must be designed for fluid, responsive presentation (desktop-first precision with mobile-first code blocks), adhering strictly to Tailwind CSS standards and the high-contrast slate aesthetic.

---

## 2. Unidirectional Presentation Data Flow

Data inside the presentation layer propagates exclusively in one direction. Visual actions do not perform direct database mutations; instead, they trigger secured transactions or cloud functions, allowing engines to recalculate snapshots.

```
       CORE DATABASE SNAPSHOTS
                  │
                  ▼ (Direct Read / Subscription)
      [Unified Data Binding Hooks]
                  │
                  ▼ (Propagates read-only state)
         [Screen Layout Templates]
                  │
                  ▼ (Aggregates modular visual blocks)
         [Widget Component Grid]
                  │
                  ▼ (Injects individualized items)
         [Card Component Blocks]
```

---

## 3. Screen Composition Rules

Every public or private interface inside VSC Platform V3 must align with the standardized screen composition blueprint:

```
┌────────────────────────────────────────────────────────┐
│                   SCREEN CONTAINER                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │               Header / Banner Area               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │                Summary Area Widget               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌────────────────────────┬─────────────────────────┐  │
│  │     Left Widget Area   │    Right Widget Area    │  │
│  │   ┌──────────────────┐ │  ┌───────────────────┐  │  │
│  │   │   Widget Block   │ │  │   Widget Block    │  │  │
│  │   └──────────────────┘ │  └───────────────────┘  │  │
│  │   ┌──────────────────┐ │  ┌───────────────────┐  │  │
│  │   │   Widget Block   │ │  │   Widget Block    │  │  │
│  │   └──────────────────┘ │  └───────────────────┘  │  │
│  └────────────────────────┴─────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Detail & Action Area             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Header Area**: Standardized navigation context, identity cards, or season selection dropdowns.
2. **Summary Area**: Highlight-level numerical aggregates (e.g., total athletes, total accuracy gauge) to establish visual anchor points.
3. **Widget Area**: Multi-column Bento Grids or vertical stacks containing modular domain widgets.
4. **Detail & Action Area**: Expanded table ledgers, paginated chronological feeds, or administrative control buttons.

---

## 4. Reusability & Configuration-Over-Code

To avoid component duplication, visual blocks must emphasize **Configuration** over custom programming:
*   A widget must utilize generic props to toggle display options (e.g., `<RankingWidget displayType="condensed" limit={5} />` instead of creating `CondensedRankingTable.tsx`).
*   Component files must be cleanly extracted and stored in designated visual sub-directories:
    *   `/src/components/widgets/`: Multi-data visual units.
    *   `/src/components/cards/`: Itemized entity representations.
    *   `/src/components/layouts/`: Structural frame controllers.
