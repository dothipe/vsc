# VSC Platform V3 — Widget Framework Specification (WIDGET_FRAMEWORK_V3)
Version: 1.0 (Official Core Freeze)

This document specifies the standards, definitions, configuration schemas, and reusability rules of the **Widget Framework** inside the Vietnam Slingshot Championship (VSC) Platform V3.

A **Widget** is an independent visual block that displays a specific facet of a Core Domain or Engine. Widgets read data snapshots passively, managing their own responsive layouts and visual states.

---

## 1. Core Widget Taxonomy

The framework establishes seven standard Widget categories to be reused across all application screens.

```
                  ┌────────────────────────┐
                  │      WIDGET CORE       │
                  └───────────┬────────────┘
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [Ranking Widget]   [Statistics Widget]  [Timeline Widget]
         │                    │                    │
         ▼                    ▼                    ▼
   [Status Widget]     [Summary Widget]    [Activity Widget]
                              │
                              ▼
                     [Information Widget]
```

### 1.1 Ranking Widget
*   **Purpose**: Displays leaderboards, standings, and seasonal point distributions.
*   **Data Binding**: `/season_rankings` or `/ranking_snapshots`.
*   **Props Schema**:
    ```typescript
    interface RankingWidgetProps {
      scopeId: string; // seasonId, tournamentId, or clubId
      type: "individual" | "team" | "club" | "province";
      layout: "grid" | "table" | "podium";
      limit?: number;
      showMedals?: boolean;
    }
    ```

### 1.2 Statistics Widget
*   **Purpose**: Displays performance charts, averages, hit/miss ratios, and shot stability.
*   **Data Binding**: `/statistics_snapshots` or `/province_competition_history`.
*   **Props Schema**:
    ```typescript
    interface StatisticsWidgetProps {
      ownerId: string; // athleteId, clubId, or provinceId
      metrics: Array<"accuracy" | "totalShots" | "streak" | "podiums" | "heatMap">;
      chartType?: "radial" | "bar" | "line";
    }
    ```

### 1.3 Timeline Widget
*   **Purpose**: Renders chronological milestone logs and historical events.
*   **Data Binding**: `/athlete_timeline_events`, `/club_timeline_events`, or `/province_timeline_events`.
*   **Props Schema**:
    ```typescript
    interface TimelineWidgetProps {
      entityId: string; // athleteId, clubId, or provinceId
      sortDirection?: "asc" | "desc";
      maxEvents?: number;
      collapsible?: boolean;
    }
    ```

### 1.4 Status Widget
*   **Purpose**: Highlights the current operational or administrative state of an entity.
*   **Data Binding**: `/tournaments/{id}.status` or `/seasons/{id}.status`.
*   **Props Schema**:
    ```typescript
    interface StatusWidgetProps {
      targetId: string;
      collection: "tournaments" | "seasons" | "clubs";
      showBadgeOnly?: boolean;
      interactiveControls?: boolean; // Toggled strictly via user permissions
    }
    ```

### 1.5 Summary Widget
*   **Purpose**: Displays high-level quantitative counts and quick-look tallies (e.g., total athletes, total clubs).
*   **Data Binding**: `/provinces/{id}.statistics` or `/clubs/{id}.statistics`.
*   **Props Schema**:
    ```typescript
    interface SummaryWidgetProps {
      statisticsNode: Record<string, number | string | object>;
      columns?: number; // 2, 3, or 4 grid splits
    }
    ```

### 1.6 Activity Widget
*   **Purpose**: Renders dense logs of recent interactions (such as scores submitted or transfers processed).
*   **Data Binding**: `/official_score_ledger` (limited query snapshot) or `/club_history_events`.
*   **Props Schema**:
    ```typescript
    interface ActivityWidgetProps {
      filterId: string;
      maxItems?: number;
      showTimestamps?: boolean;
    }
    ```

### 1.7 Information Widget
*   **Purpose**: Renders biographical summaries, registration specifications, and primary identities.
*   **Data Binding**: `/athletes`, `/clubs`, or `/provinces` root attributes.
*   **Props Schema**:
    ```typescript
    interface InformationWidgetProps {
      profileData: Record<string, any>;
      editable?: boolean;
    }
    ```

---

## 2. Standard State Handling

To ensure visual consistency, every widget must support three standard rendering states:

1.  **Loading State**: Styled with elegant skeleton animations (`animate-pulse`) mirroring the structural lines of the completed layout.
2.  **Empty State**: Displayed when no snapshot data is returned. Must utilize a clean neutral text label with a subtle centered icon.
3.  **Error State**: Rendered when database permissions are missing or if a network disconnect occurs. Displays a non-intrusive warning card with a "Retry" handler.

---

## 3. Responsive Adaptations

Widgets must automatically scale across standard responsive viewport breakpoints:
*   **Mobile view (`< 768px`)**: Layouts fold into simple single-column vertical scrolls. Complex charts and radial gauges degrade to clean percentage progress bars.
*   **Tablet view (`768px - 1024px`)**: Tables hide low-priority columns (e.g. "VSC Registration Number" or "Manager ID"), showing only critical scoring metrics.
*   **Desktop view (`> 1024px`)**: Grid elements utilize full bento structures with interactive hover states and rich tooltip overlays.
