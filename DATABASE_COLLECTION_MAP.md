# VSC Platform V3 — Physical Firestore Collection Map

This document defines the physical location, collection types, path configurations, and purposes for each official collection in the VSC V3 architecture.

---

## 1. PATH DIRECTORY MAP

| #  | Path Pattern | Collection Type | Associated Schema Entity | Primary Storage Purpose |
|----|--------------|-----------------|-------------------------|-------------------------|
| 1  | `/system_settings/{id}` | Root Collection | `SystemSettings` | Platform-wide configurations and toggles |
| 2  | `/users/{uid}` | Root Collection | `User` | User profiles, authorization roles, and account state |
| 3  | `/athletes/{id}` | Root Collection | `Athlete` | Core physical competitor profiles and registry |
| 4  | `/clubs/{id}` | Root Collection | `Club` | Club information, locations, and branding assets |
| 5  | `/club_members/{id}` | Root Collection | `ClubMember` | Resolved membership associations |
| 6  | `/club_join_requests/{id}`| Root Collection | `ClubJoinRequest` | Workflow states of athlete club-joining requests |
| 7  | `/seasons/{id}` | Root Collection | `Season` | Competitive calendar boundaries and rules |
| 8  | `/rule_templates/{id}` | Root Collection | `RuleTemplate` | Pre-configured round and scoring templates |
| 9  | `/tournaments/{id}` | Root Collection | `Tournament` | Competition workflows, stages, and metadata |
| 10 | `/official_score_ledger/{id}`| Root Collection | `OfficialScoreLedger` | Individual hit/miss shot logs & tiebreaks |
| 11 | `/ranking_snapshots/{id}` | Root Collection | `RankingSnapshot` | Round-by-round standing results caching |
| 12 | `/career_snapshots/{id}` | Root Collection | `CareerSnapshot` | Historic season rankings & overall medal count |
| 13 | `/statistics_snapshots/{id}`| Root Collection | `StatisticsSnapshot` | Aggregated mathematical athletic accuracy |
| 14 | `/liveboard_snapshots/{id}` | Root Collection | `LiveboardSnapshot` | Synchronous active lane states and scoreboards |
| 15 | `/hall_of_fame/{id}` | Root Collection | `HallOfFame` | Legends, records, and seasonal championships |
| 16 | `/audit_logs/{id}` | Root Collection | `AuditLog` | Historic tracking of admin state actions |
| 17 | `/event_logs/{id}` | Root Collection | `EventLog` | Event stream and system action auditing |
| 18 | `/repository_metadata/{id}` | Root Collection | `RepositoryMetadata` | Repositories synchronization and lock state |
| 19 | `/system_metadata/{id}` | Root Collection | `SystemMetadata` | Health diagnostics, microservice performance logs |
| 20 | `/athlete_timeline_events/{id}`| Root Collection | `AthleteTimelineEvent` | Lifelong timeline events tracking of athletes |
| 21 | `/season_rankings/{id}` | Root Collection | `SeasonRanking` | Accumulated seasonal individual, team, and club rankings |
| 22 | `/club_timeline_events/{id}`| Root Collection| `ClubTimelineEvent` | Timeline milestones achieved by clubs |
| 23 | `/club_history_events/{id}` | Root Collection| `ClubHistoryEvent` | Organizational lifecycle mutations of a club |
| 24 | `/provinces/{id}` | Root Collection| `Province` | Master province identities, regional categorizations |
| 25 | `/province_competition_history/{id}`| Root Collection| `ProvinceCompetitionHistory` | Competitive standings and medal maps of provinces |
| 26 | `/province_timeline_events/{id}`| Root Collection| `ProvinceTimelineEvent` | Timeline milestones achieved by provinces |

---

## 2. DOCUMENT HIERARCHY STANDARD
To avoid high indexing costs and deep nesting read latency:
* **All main business collections are Root Collections**.
* Cross-referencing utilizes structured **Foreign Key fields** (`athleteId`, `tournamentId`, `clubId`) rather than nested subcollections.
* This flat architecture enables seamless client side filtering, efficient single-read queries, and straightforward security rules without requiring complex nested lookups.
