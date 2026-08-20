# VSC Platform V3 — Domain Event Architecture Specification (DOMAIN_EVENT_ARCHITECTURE_V3)
Version: 1.0 (Official Standard)

This document specifies the **Domain Event Architecture** within the Vietnam Slingshot Championship (VSC) Platform V3. 

To eliminate heavy database reads, decouple system sub-modules, and ensure real-time scalability, the VSC platform employs an **Event-Driven Architecture (EDA)**. Rather than relying on periodic batch scans or high-frequency polling, state transitions publish lightweight, atomic events that drive downstream computation engines.

---

## 1. Domain Event Choreography Flow

When a tournament or scoring cycle concludes, a sequence of decoupled events executes to compile the athlete's sovereign profile:

```
[Tournament Completed] 
       │
       ▼ (Publishes EVENT_TOURNAMENT_FINALIZED)
[Career Engine] Recalculates Season Standing
       │
       ▼ (Publishes EVENT_CAREER_UPDATED)
[Statistics Engine] Increments Hits & Streaks
       │
       ▼ (Publishes EVENT_STATS_UPDATED)
[Achievement Engine] Evaluates Badges & Milestones
       │
       ▼ (Publishes EVENT_ACHIEVEMENT_UNLOCKED)
[Timeline Engine] Publishes Entry Ledger Event
       │
       ▼ (Publishes EVENT_TIMELINE_UPDATED)
[Hall Of Fame Engine] Checks Records & Champions
       │
       ▼ (Publishes EVENT_HOF_UPDATED)
[Dashboard Cache] Updates Read-Side Materialized Views
```

---

## 2. Event Payload Contracts

Domain events are defined as structured JSON messages containing standard routing envelopes:

### 2.1 Event: `EVENT_TOURNAMENT_FINALIZED`
Published when a Tournament Director locks a tournament's results.
```json
{
  "eventId": "evt_trn_final_00182",
  "eventType": "EVENT_TOURNAMENT_FINALIZED",
  "timestamp": "2026-06-28T02:00:00Z",
  "actorId": "admin_user_88",
  "payload": {
    "tournamentId": "tour_national_2025",
    "seasonId": "season_2025",
    "finalizedBy": "Nguyễn Văn B"
  }
}
```

### 2.2 Event: `EVENT_CAREER_UPDATED`
Published by the `CareerEngine` once historical participation statistics have been aggregated.
```json
{
  "eventId": "evt_car_upd_882910",
  "eventType": "EVENT_CAREER_UPDATED",
  "timestamp": "2026-06-28T02:00:15Z",
  "payload": {
    "athleteId": "ath_990124",
    "seasonId": "season_2025",
    "updatedFields": ["totalTournaments", "totalEvents", "rankingHistory"]
  }
}
```

### 2.3 Event: `EVENT_STATS_UPDATED`
Published by the `StatisticsEngine` upon committing updated metric files to the `/statistics_snapshots` collection.
```json
{
  "eventId": "evt_sts_upd_332140",
  "eventType": "EVENT_STATS_UPDATED",
  "timestamp": "2026-06-28T02:00:25Z",
  "payload": {
    "athleteId": "ath_990124",
    "environments": ["individual", "team"],
    "newAccuracy": 85.5,
    "streakAchieved": 17
  }
}
```

### 2.4 Event: `EVENT_ACHIEVEMENT_UNLOCKED`
Published by the `AchievementEngine` when an athlete's metric threshold matches a registered rule.
```json
{
  "eventId": "evt_ach_unl_440019",
  "eventType": "EVENT_ACHIEVEMENT_UNLOCKED",
  "timestamp": "2026-06-28T02:00:30Z",
  "payload": {
    "athleteId": "ath_990124",
    "achievementId": "STREAK_MASTER",
    "badgeName": "Streak Master 🔥",
    "triggerMetric": "highestHitStreak",
    "triggerValue": 20
  }
}
```

### 2.5 Event: `EVENT_TIMELINE_UPDATED`
Published once a timeline event has been recorded inside the `/athlete_timeline_events` ledger.
```json
{
  "eventId": "evt_tml_upd_550182",
  "eventType": "EVENT_TIMELINE_UPDATED",
  "timestamp": "2026-06-28T02:00:35Z",
  "payload": {
    "athleteId": "ath_990124",
    "timelineEventId": "evt_timeline_990124_003"
  }
}
```

---

## 3. Storage & Audit Logs Integration

All fired Domain Events must be permanently recorded inside the centralized `/event_logs` collection. This ensures that the entire system timeline is fully auditable, allowing operators to trace data flow or debug synchronization issues.

```typescript
export interface EventLog {
  eventId: string;
  eventType: string;
  timestamp: string; // ISO
  actorId: string;
  payload: any;
  status: "processed" | "failed";
  errorMessage?: string;
}
```
---

## 4. Platform Performance Commitments

To prevent resource-hogging and lockouts:
1.  **Non-Blocking Executions**: Event listeners must process asynchronously. The primary UI thread returns success immediately, leaving calculations to execute in isolated background tasks.
2.  **Idempotent Reductions**: Listening engines must be idempotent. If an event is re-delivered, the resulting calculations must be identical to previous outputs without incrementing tallies twice.
3.  **Strict Serialization**: Events modifying the same athlete record must execute in strict chronological order to avoid race conditions.
