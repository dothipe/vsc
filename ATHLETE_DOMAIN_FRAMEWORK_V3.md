# VSC Platform V3 — Athlete Domain Framework Specification
Version: 1.0 (Official Standard)

This document specifies the architecture, entities, mapping mechanisms, and lifecycle guidelines for the **Athlete Domain Framework** inside the Vietnam Slingshot Championship (VSC) Platform V3. 

Rather than treating athletes as simple data records attached to tournaments or local states, this framework models the **Athlete** as an independent, sovereign **Domain Entity** positioned at the core of the VSC digital ecosystem. All other modules (Tournaments, Career, Statistics, Clubs, Sponsors, and User accounts) reference and consume data from this Athlete Domain, establishing it as the absolute **Single Source of Truth** for competitor life cycles.

---

## 1. Domain Architecture & Principles

1. **Sovereign Identity Principle**:
   An athlete’s identity (VSC Number, basic demographics, permanent record) is decoupled from seasons, tournament registrations, and individual user accounts. It exists independently of any single competitive event.
2. **The "Single Source of Truth" Rule**:
   No secondary modules (such as custom tournament entries or local team sheets) may store or duplicate athlete biological records, avatar media, or lifetime achievements. All elements must subscribe to and reference the Athlete Domain.
3. **Event-Driven Integration**:
   Rather than performing periodic, expensive Firestore queries, updates to the Athlete Domain (such as new ranking records, milestones, or club transfers) are published via downstream engine events:
   $$\text{Official Score Ledger} \rightarrow \text{Engines} \rightarrow \text{Athlete Domain Snapshots} \rightarrow \text{Subscribing Clients (Web/Mobile/AI)}$$
4. **Passive UI Consumption**:
   UI Views (Athlete Profiles, Dashboards, Leaderboards, Public Portals) read pre-calculated domain aggregates. They are strictly forbidden from performing client-side reductions on raw transaction logs.

---

## 2. Core Athlete Domain Entity Schema

The Athlete Domain consists of three core structural divisions:
*   **Identity (Mutable/Immutable Profile attributes)**: Stored in `/athletes`.
*   **Career & Statistics Snapshots (Pre-calculated summaries)**: Stored in `/career_snapshots` and `/statistics_snapshots`.
*   **Timeline Events (Chronological lifetime diary)**: Stored in `/athlete_timeline_events`.

```
                    ┌─────────────────────────┐
                    │  ATHLETE DOMAIN ENTITY  │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Identity Core   │    │ Career & Stats   │    │ Lifetime Diary   │
│   (/athletes)    │    │   (Snapshots)    │    │ (/athlete_time..)│
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 2.1 Identity Core Attributes (`/athletes`)
```json
{
  "athleteId": "ath_990124",
  "vscNumber": "VSC-HB-0023",
  "fullName": "Nguyễn Văn A",
  "gender": "Nam",
  "dob": "1995-04-12",
  "province": "Hà Nội",
  "country": "Việt Nam",
  "joinedDate": "2024-03-12T08:00:00Z",
  "currentClubId": "club_hanoi",
  "status": "active", // active, retired, suspended
  "userMapping": {
    "isLinked": true,
    "userId": "usr_771892",
    "claimStatus": "verified" // unlinked, pending_claim, verified
  },
  "media": {
    "avatarUrl": "local-avatar:ath_990124",
    "gallery": [],
    "videos": [],
    "qrCardUrl": "https://vsc-platform.web.app/cards/VSC-HB-0023.png"
  },
  "sponsorships": {
    "primarySponsorId": "spons_slingshot_vn",
    "equipment": "Standard VSC V3 Slingshot Pro",
    "ambassadorStatus": "brand_ambassador"
  },
  "createdAt": "2024-03-12T08:00:00Z",
  "updatedAt": "2026-06-28T02:00:00Z"
}
```

---

## 3. Athlete Timeline (Chronological Legacy Registry)

The **Athlete Timeline** is an incremental, ledger-like collection (`/athlete_timeline_events`) representing the competitor's competitive biography. Timeline entries are append-only and are generated automatically by system events.

### 3.1 Event Structure Schema (`/athlete_timeline_events`)
```json
{
  "eventId": "evt_timeline_990124_001",
  "athleteId": "ath_990124",
  "seasonId": "season_2025",
  "timestamp": "2025-06-15T18:30:00Z",
  "eventType": "TOURNAMENT_FINISH", // JOIN_VSC, CLUB_TRANSFER, TOURNAMENT_FINISH, RECORD_BREAK, PODIUM
  "title": "Vô địch Cá nhân Giải Slingshot Miền Bắc 2025",
  "description": "Nguyễn Văn A đạt Huy chương Vàng (HCV) nội dung Cá nhân với điểm số kỷ lục 98/100.",
  "metadata": {
    "tournamentId": "tour_north_2025",
    "competitionMode": "individual",
    "rank": 1,
    "score": 98,
    "clubId": "club_hanoi",
    "award": "gold_medal"
  }
}
```

### 3.2 Automated Timeline Triggers
*   **VSC Join**: Fired when an athlete profile is first initialized.
*   **Club Transfer**: Fired when an athlete’s `currentClubId` is updated in `/athletes`, storing the departure and arrival clubs to maintain chronological club history.
*   **Tournament Finish**: Fired when tournament results are finalized by the Tournament Director. Includes rank, points, and achievement badges.
*   **Achievement Milestones**: Fired by the `AchievementEngine` when high-performance parameters (perfect rounds, streak targets) are reached.

---

## 4. Athlete-to-User Mapping (Ownership & Security Rules)

An Athlete Entity can be mapped to a registered User Account (`/users`) to allow individuals to claim their profiles, edit personal bios, upload media galleries, and access premium training analytics.

### 4.1 Claim Status Machine
```
   ┌──────────────┐      Claim Requested      ┌─────────────────┐
   │   Unlinked   ├──────────────────────────►│  Pending Claim  │
   └──────┬───────┘                           └────────┬────────┘
          │                                            │
          │                                            │ Admin Approves
          │ Direct Admin Association                   │ / Validates
          │                                            ▼
          │                                   ┌─────────────────┐
          └──────────────────────────────────►│    Verified     │
                                              └─────────────────┘
```

### 4.2 Security Rules (Write Access Boundaries)
*   **Core Identity (VSC Number, full name, dob, gender, province)**: Can ONLY be modified by authenticated Administrators.
*   **Media Gallery & Bio Narrative**: Can be written to by the mapped `userId` ONLY if the mapping status is `verified`.
*   **Timeline & Career Metrics**: System-write only (locked down via Cloud Firestore security rules from client-side direct writes).

---

## 5. Extensible Framework Additions (Sprint-Ready, UI-Deferred)

### 5.1 Athlete Media Specification
Allows athletes to manage their public-facing visual identity. This sub-module supports custom portfolios, tournament image tags, video links of target attempts, and an official printable PDF credential (VSC Athlete QR Card). No direct UI interface is introduced in current layouts, but schemas support this natively under `media`.

### 5.2 Athlete Sponsor Specification
Sponsorship nodes track formal relationships with brands, equipment manufacturers, and local sport academies. This supports rendering sponsor logos directly on athlete public profiles, enabling premium monetization channels for elite competitors.

### 5.3 Athlete AI Analytics Specification
Provides structured hooks for downstream machine learning and AI coaching analysis. By aggregating historical timeline scores and statistics snapshots (e.g., accuracy at 15m vs 10m lines, hit-streak stability under high-stakes finals), an AI model can calculate:
*   **Performance Stability Index**: Variance of scores across tournaments.
*   **Clutch Multiplier**: Performance metrics during final rounds vs qualification heats.
*   **Wind/Fatigue Forecasts**: Shot drift over successive distances.

---

## 6. Implementation Checklist & Integrity Standards

To keep the codebase safe, clean, and perfectly aligned with the upgraded specifications, ensure:
1. **Never mutate `/athletes` directly from the tournament scoring sheet**: Perform state alterations solely through secure transactions.
2. **Retrieve Profiles via IDs**: All modules displaying user-facing dashboards (Leaderboards, Hall of Fame carousel) must load details via `athleteId` lookups to the central `/athletes` and `/career_snapshots` collections.
3. **Always sanitize base64 uploads**: Guard against Firestore 1MB limits using the centralized `local-avatar:${athleteId}` hashing routine.
