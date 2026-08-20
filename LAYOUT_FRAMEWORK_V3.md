# VSC Platform V3 — Layout Framework Specification (LAYOUT_FRAMEWORK_V3)
Version: 1.0 (Official Core Freeze)

This document specifies the structural blueprints, grid standards, spacing conventions, and responsive container guidelines for **Layouts** inside the Vietnam Slingshot Championship (VSC) Platform V3.

A **Layout** coordinates individual Widgets and Cards into structured views, ensuring pages across the platform share a cohesive design language.

---

## 1. Grid Systems & Page Blueprints

The Layout Framework defines three standard page structures based on content density and visual hierarchy.

```
       BENTO GRID VIEW                 SIDEBAR GRID VIEW                SINGLE-COLUMN LIST
┌───────────────────────────┐   ┌───────────┬───────────────┐   ┌───────────────────────────┐
│          Header           │   │  Sidebar  │    Header     │   │          Header           │
├───────┬───────────┬───────┤   │           ├───────────────┤   ├───────────────────────────┤
│ Widget│  Widget   │ Widget│   │           │               │   │      List Item Card       │
│   A   │    B      │   C   │   │           │    Main       │   ├───────────────────────────┤
├───────┴───┬───────┴───────┤   │           │    Widget     │   │      List Item Card       │
│  Widget   │  Widget       │   │           │    Area       │   ├───────────────────────────┤
│    D      │    E          │   │           │               │   │      List Item Card       │
└───────────┴───────────────┘   └───────────┴───────────────┘   └───────────────────────────┘
```

### 1.1 Bento Grid Layout (Multi-Dimensional Dashboards)
*   **Best Used For**: Home Dashboards, Province Profiles, and Season Overviews where diverse dataset snapshots must be parsed at a single glance.
*   **Implementation**: Utilizes Tailwind’s `grid-cols-1 md:grid-cols-3 lg:grid-cols-4` with variable row spans (`col-span-2`, `row-span-2`) to create visual hierarchy.

### 1.2 Sidebar Layout (Administrative Views)
*   **Best Used For**: Referee Terminals, Director Panels, and complex Athlete Career Profiles.
*   **Implementation**: A fixed-width or responsive vertical left-hand navigation column (`w-64` or `md:w-80`) paired with a fluid main scroll area (`flex-1 h-screen overflow-y-auto`).

### 1.3 Single-Column List (Dense Historical Ledgers)
*   **Best Used For**: Chronological activity logs, complete roster directories, and historical score ledgers.
*   **Implementation**: Centered, readable, medium-width columns (`max-w-4xl mx-auto`) containing stacked list cards with custom pagination handlers.

---

## 2. Spacing Scales & Structural Margins

To ensure clean design proportions, all layout elements must align to a consistent spacing scale:

| Structural Element | Tailwind Spacing Class | Physical Equivalent | Purpose |
| :--- | :--- | :--- | :--- |
| **Main Page Padding** | `p-4 sm:p-6 lg:p-8` | 16px / 24px / 32px | Outer gutter spacing of primary containers. |
| **Bento Grid Gap** | `gap-4 sm:gap-6` | 16px / 24px | Spacing between modular widget blocks. |
| **Card Inner Padding**| `p-4 sm:p-5` | 16px / 20px | Internal padding within individual cards. |
| **List Stack Gap** | `space-y-3 sm:space-y-4` | 12px / 16px | Vertical spacing between list items. |
| **Section Separator** | `my-8 sm:my-12` | 32px / 48px | Separates distinct functional layouts on a page. |

---

## 3. Responsive Breakpoints & View Container Rules

Layouts must maintain proportional density across viewports, preventing content from becoming too cramped or over-extended.

### 3.1 Maximum Layout Width Boundaries
All standard presentation pages must be wrapped in a fluid, width-constrained container to ensure high-resolution desktop legibility:
```html
<main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Interactive presentation widgets are placed here -->
</main>
```

### 3.2 Responsive Collapsing Strategies
*   **Three-Column to Vertical Column Fold**: 
    ```html
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       <!-- Grid items auto-wrap to vertical rows on mobile viewports -->
    </div>
    ```
*   **Overlapping Sidebar Hide**: On viewports below `1024px` (`lg:`), primary layouts must hide active sidebars behind an absolute drawer layer, toggleable via an administrative menu icon.
*   **Desktop Column Expansion**: As viewports expand, layouts must leverage the extra space to expose supporting widgets (e.g. recent activity logs or auxiliary summaries) instead of simply stretching existing cards wide.
