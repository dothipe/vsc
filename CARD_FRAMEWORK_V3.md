# VSC Platform V3 — Card Framework Specification (CARD_FRAMEWORK_V3)
Version: 1.0 (Official Core Freeze)

This document specifies the standard design rules, markup constraints, and interaction guidelines for **Cards** inside the Vietnam Slingshot Championship (VSC) Platform V3.

A **Card** is the smallest cohesive visual block representing a single database document entity (e.g. an athlete, a club, or a tournament). Cards are used as child elements inside screen grids or widgets, providing consistent aesthetics across the entire platform.

---

## 1. Card Typologies & Specifications

The framework defines seven standard Card modules. All cards must share a unified design structure, utilizing the slate color theme and responsive hover states.

```
                  ┌────────────────────────┐
                  │    CORE CARD MODULE    │
                  └───────────┬────────────┘
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [Athlete Card]        [Club Card]        [Province Card]
         │                    │                    │
         ▼                    ▼                    ▼
  [Tournament Card]     [Season Card]       [Ranking Card]
                              │
                              ▼
                      [Statistics Card]
```

### 1.1 Athlete Card
*   **Representation**: A competitor's basic profile.
*   **Aesthetic Priority**: High-contrast modern identity.
*   **Structure**: Centered avatar or VSC identifier (left), full name, regional affiliation, active club name, and a list of active career badges.
*   **Tailwind Blueprint**:
    ```html
    <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm">
      <img class="w-12 h-12 rounded-full object-cover" src="..." />
      <div class="flex-1">
        <span class="text-xs font-mono text-slate-500">VSC-HN-1024</span>
        <h4 class="font-sans font-medium text-slate-900">Nguyễn Văn A</h4>
        <p class="text-xs text-slate-600">CLB Slingshot Hà Nội</p>
      </div>
    </div>
    ```

### 1.2 Club Card
*   **Representation**: A regional sports club.
*   **Aesthetic Priority**: Bold team branding.
*   **Structure**: Club logo or geometric banner (top), club name, geographic province, name of manager, and active athlete count badge.

### 1.3 Province Card
*   **Representation**: An administrative province/city.
*   **Aesthetic Priority**: Minimalist regional card.
*   **Structure**: Large province acronym (e.g. `HN`, `SG`), province name, active club count, total registered competitors, and current season standing rank.

### 1.4 Tournament Card
*   **Representation**: A scheduled or completed competitive championship.
*   **Aesthetic Priority**: Logistics-focused informational display.
*   **Structure**: Status badge (top-right), tournament title, date span, venue location, and a summary list of registered competition modes (e.g., 10m Individual, 12m Team).

### 1.5 Season Card
*   **Representation**: An annual competitive cycle.
*   **Aesthetic Priority**: Elegant, archival representation.
*   **Structure**: Year banner, season title, status marker, tournament count, and absolute championship records.

### 1.6 Ranking Card
*   **Representation**: An individual or team placement item.
*   **Aesthetic Priority**: Structured spreadsheet-like item.
*   **Structure**: Rank number (left, highlighted for podium ranks 1-3), entity name, vscNumber (or club short-name), accumulated competitive points, and total accuracy percentage.

### 1.7 Statistics Card
*   **Representation**: A standalone performance metric.
*   **Aesthetic Priority**: Clean technical typography.
*   **Structure**: Metric title (e.g., *Highest Streak*, *Average Accuracy*), large mono-spaced numeric value, and a sparkline or horizontal accuracy bar indicating trends.

---

## 2. Interaction & Micro-Animations

To ensure responsive feedback on mouse and touch actions, all cards must conform to standard UI interaction rules:

1.  **Scale Elevation**: On hover, cards scale by `scale-101` and transition border opacity over `duration-200 ease-in-out`.
    *   *Tailwind configuration*: `hover:scale-[1.01] hover:shadow-md transition-all duration-200`
2.  **Focus Feedback**: When active or clicked, cards exhibit a subtle border accent (e.g. `ring-2 ring-slate-800`).
3.  **Podium Themes**: Ranking Cards for podium spots utilize distinct accent borders:
    *   *Rank 1 (Gold)*: `border-amber-400 bg-amber-50/20`
    *   *Rank 2 (Silver)*: `border-slate-300 bg-slate-50/30`
    *   *Rank 3 (Bronze)*: `border-orange-300 bg-orange-50/20`

---

## 3. Accessibility Standards

All cards must enforce readable contrast configurations to ensure accessibility:
*   Body text must match neutral grays (e.g., `text-slate-900` or `text-slate-800` on white backgrounds).
*   Subtitles or metadata must use readable dark grays (minimum `text-slate-600` on white). Light gray (`text-slate-400`) is strictly reserved for auxiliary labels like timestamps.
*   Interactive click zones on mobile devices must expand to a minimum touch target area of `44px x 44px`.
