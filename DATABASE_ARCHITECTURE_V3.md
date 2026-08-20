# VSC Platform V3 — Official Database Architecture (Freeze Version 3.0)

This document is the permanent, frozen specification of the Firestore database architecture for the Vietnam Slingshot Championship (VSC) Platform V3. No other collections, fields, or mapping schemes are permitted. This architecture is the Single Source of Truth for all future repositories, business engines, UI components, and integrations.

---

## 1. CORE ARCHITECTURAL PRINCIPLES

1. **Single Source of Truth**: Every data item has exactly one logical owner. No duplicate data fields.
2. **Read/Write Separation**: 
   * **Repositories**: Own all write operations.
   * **Business Engines**: Perform calculations and produce immutable snapshots or caches.
   * **Presentation/UI Layer**: Performs read-only operations and queries.
3. **No Calculated Values in Master Data**: Master Data (e.g., `/athletes`, `/clubs`) stores identity and configuration *only*. Standing ranks, accuracy statistics, medal counts, and score progressions are strictly calculated by specialized engines and stored in snapshots/caches.
4. **Immutable Score Ledger**: The `official_score_ledger` is the absolute source of truth for scores. No engine may write scores outside of it.
5. **No Embedded Arrays**: Standings, participants list, or logs must never be embedded as growing arrays in parent documents. They must use independent collections or subcollections with references to ensure O(1) query complexity and bypass document size limitations.

---

## 2. OFFICIAL FIRESTORE TREE SCHEMA

The database is composed strictly of the following 19 collections:

### 1. system_settings
* **Collection Path**: `/system_settings`
* **Purpose**: Store global platform configurations and feature toggles.
* **Write Owner**: Super Admin
* **Fields**:
  * `settingId` (string, Primary Key)
  * `databaseVersion` (string, frozen to "3.0")
  * `maintenanceMode` (boolean)
  * `rankingsEnabled` (boolean)
  * `liveboardEnabled` (boolean)
  * `modules` (map)

### 2. users
* **Collection Path**: `/users`
* **Purpose**: Store authentication and profile mapping.
* **Write Owner**: Auth Service / Current Authenticated User
* **Fields**:
  * `uid` (string, Primary Key)
  * `email` (string)
  * `displayName` (string)
  * `googleAvatar` (string)
  * `customAvatar` (string)
  * `phone` (string)
  * `role` (string) — `super_admin`, `director`, `referee`, `athlete`, `guest`
  * `permissions` (array of strings)
  * `linkedAthleteId` (string, optional)
  * `status` (string) — `active`, `suspended`
  * `createdAt` (string, ISO)
  * `lastLogin` (string, ISO)

### 3. athletes
* **Collection Path**: `/athletes`
* **Purpose**: Master registry of all athletic competitors. NO statistics or rankings stored here.
* **Write Owner**: Athlete Registry / Director
* **Fields**:
  * `athleteId` (string, Primary Key)
  * `vscNumber` (string, unique)
  * `fullName` (string)
  * `gender` (string)
  * `birthday` (string, YYYY-MM-DD)
  * `province` (string)
  * `currentClubId` (string, optional)
  * `avatar` (string)
  * `biography` (string)
  * `facebook` (string)
  * `zalo` (string)
  * `emergencyContact` (string)
  * `equipment` (string)
  * `personalNotes` (string)
  * `linkedUserId` (string, optional)
  * `claimStatus` (string) — `unclaimed`, `pending`, `verified`
  * `profileCompletion` (number)
  * `createdAt` (string, ISO)
  * `updatedAt` (string, ISO)

### 4. clubs
* **Collection Path**: `/clubs`
* **Purpose**: Master registry of slingshot clubs.
* **Write Owner**: Club Management Engine / Super Admin
* **Fields**:
  * `clubId` (string, Primary Key)
  * `clubName` (string)
  * `shortName` (string)
  * `logo` (string)
  * `banner` (string)
  * `province` (string)
  * `address` (string)
  * `description` (string)
  * `managerUserId` (string)
  * `foundedDate` (string, YYYY-MM-DD)
  * `status` (string) — `active`, `inactive`
  * `createdAt` (string, ISO)
  * `updatedAt` (string, ISO)

### 5. club_members
* **Collection Path**: `/club_members`
* **Purpose**: Resolve many-to-many relationship of athletes inside clubs.
* **Write Owner**: Club Management Engine
* **Fields**:
  * `memberId` (string, Primary Key)
  * `clubId` (string)
  * `athleteId` (string)
  * `userId` (string)
  * `role` (string) — `leader`, `member`
  * `status` (string) — `active`, `left`
  * `joinedAt` (string, ISO)
  * `leftAt` (string, ISO, optional)

### 6. club_join_requests
* **Collection Path**: `/club_join_requests`
* **Purpose**: Manage join club applications.
* **Write Owner**: Club Management Engine / Requesting User
* **Fields**:
  * `requestId` (string, Primary Key)
  * `clubId` (string)
  * `athleteId` (string)
  * `userId` (string)
  * `status` (string) — `pending`, `approved`, `rejected`
  * `requestedAt` (string, ISO)
  * `approvedBy` (string, optional)
  * `approvedAt` (string, ISO, optional)

### 7. seasons
* **Collection Path**: `/seasons`
* **Purpose**: Master season definitions, overall statistics, and historical records.
* **Write Owner**: Director / Season Engine
* **Fields**:
  * `seasonId` (string, Primary Key)
  * `name` (string)
  * `year` (number)
  * `status` (string) — `draft`, `registration`, `active`, `completed`, `archived`
  * `description` (string)
  * `startDate` (string, ISO)
  * `endDate` (string, ISO)
  * `tournamentRegistry` (array of strings)
  * `statistics` (map) — e.g. totalTournaments, totalAthletes, totalClubs, totalShotsFired, totalReferees, totalMatches, totalChampions
  * `records` (map) — e.g. highestIndividualScore, longestHitStreak, topClubPoints, etc.
  * `createdAt` (string, ISO)
  * `updatedAt` (string, ISO)

### 8. rule_templates
* **Collection Path**: `/rule_templates`
* **Purpose**: Scoring and tie-breaker guidelines presets.
* **Write Owner**: Admin / Director
* **Fields**:
  * `templateId` (string, Primary Key)
  * `name` (string)
  * `type` (string) — `scorecard`, `tiebreak`
  * `content` (string) — JSON rules config
  * `status` (string) — `active`, `inactive`
  * `createdAt` (string, ISO)

### 9. tournaments
* **Collection Path**: `/tournaments`
* **Purpose**: Configuration and workflow state of tournaments.
* **Write Owner**: Tournament Management Engine / Director
* **Fields**:
  * `tournamentId` (string, Primary Key)
  * `seasonId` (string)
  * `name` (string)
  * `logo` (string)
  * `banner` (string)
  * `organizer` (string)
  * `ruleSet` (string)
  * `status` (string) — `upcoming`, `active`, `completed`
  * `currentRound` (string) — `qualification`, `semi_final`, `final`
  * `currentDistance` (number) — `10`, `12`, `15`
  * `workflowStage` (string) — `draft`, `registration`, `checkin`, `active`, `finalized`
  * `ownerId` (string)
  * `createdAt` (string, ISO)

### 10. official_score_ledger
* **Collection Path**: `/official_score_ledger`
* **Purpose**: Absolute single source of truth for individual scoring.
* **Write Owner**: Referee Workspace / Scorer Engine
* **Fields**:
  * `scoreId` (string, Primary Key)
  * `tournamentId` (string)
  * `participantId` (string)
  * `round` (string)
  * `distance` (number)
  * `shots` (array of numbers)
  * `total` (number)
  * `soloShots` (array of numbers, optional for tie-breaks)
  * `reSoloShots` (array of numbers, optional for tie-breaks)
  * `operator` (string, userId of referee)
  * `timestamp` (string, ISO)

### 11. ranking_snapshots
* **Collection Path**: `/ranking_snapshots`
* **Purpose**: Round standings and leaderboard cache.
* **Write Owner**: Ranking Calculation Engine
* **Fields**:
  * `snapshotId` (string, Primary Key)
  * `tournamentId` (string)
  * `round` (string)
  * `distance` (number)
  * `rankings` (array of maps)
  * `metadata` (map)
  * `createdAt` (string, ISO)

### 12. career_snapshots
* **Collection Path**: `/career_snapshots`
* **Purpose**: Immutable history of athlete careers, supporting the lifecycle tracking across multiple seasons and competition environments.
* **Write Owner**: Career Calculation Engine (triggered by `EVENT_STATS_UPDATED` or end-of-round state updates)
* **Fields**:
  * `snapshotId` (string, Primary Key - e.g., `career_overall_${athleteId}`)
  * `athleteId` (string)
  * `vscNumber` (string)
  * `fullName` (string)
  * `currentClubId` (string)
  * `province` (string)
  * `joinedDate` (string, ISO)
  * `environmentsParticipated` (array of strings - e.g., `["individual", "team"]`)
  * `careerSummary` (map)
    * `totalSeasons` (number)
    * `totalTournaments` (number)
    * `totalEvents` (number)
    * `totalShotsFired` (number)
    * `totalShotsHit` (number)
    * `lifetimeAccuracy` (number)
  * `achievements` (map)
    * `goldCount` (number)
    * `silverCount` (number)
    * `bronzeCount` (number)
    * `podiums` (number)
    * `top5Finishes` (number)
    * `top10Finishes` (number)
    * `badges` (array of strings)
  * `rankingHistory` (array of maps)
    * `seasonId` (string)
    * `tournamentId` (string)
    * `environment` (string)
    * `rank` (number)
    * `score` (number)
    * `classification` (string)
  * `updatedAt` (string, ISO)

### 13. statistics_snapshots
* **Collection Path**: `/statistics_snapshots`
* **Purpose**: Static calculated metrics (accuracy, streaks) processed independently per competition environment.
* **Write Owner**: Statistics Engine
* **Fields**:
  * `snapshotId` (string, Primary Key - e.g., `stats_overall_${athleteId}`)
  * `athleteId` (string)
  * `environments` (map)
    * `individual` (map)
      * `averageScore` (number)
      * `bestScore` (number)
      * `worstScore` (number)
      * `averageAccuracy` (number)
      * `totalShots` (number)
      * `totalHits` (number)
      * `highestHitStreak` (number)
      * `byDistance` (map)
        * `10m` (map: `average`, `best`)
        * `12m` (map: `average`, `best`)
        * `15m` (map: `average`, `best`)
    * `team` (map)
      * `averageTeamScore` (number)
      * `matchesContributed` (number)
      * `contributionRate` (number)
    * `duel` (map, future-ready)
      * `wins` (number)
      * `losses` (number)
      * `draws` (number)
      * `winRate` (number)
      * `currentRating` (number)
      * `highestRating` (number)
      * `streak` (number)
  * `updatedAt` (string, ISO)

### 14. liveboard_snapshots
* **Collection Path**: `/liveboard_snapshots`
* **Purpose**: Real-time broadcast leaderboard state cache.
* **Write Owner**: Liveboard Engine
* **Fields**:
  * `snapshotId` (string, Primary Key)
  * `tournamentId` (string)
  * `activeHeat` (number)
  * `activeLanes` (array of maps)
  * `leaderboard` (array of maps)
  * `updatedAt` (string, ISO)

### 15. hall_of_fame
* **Collection Path**: `/hall_of_fame`
* **Purpose**: Store legends and record-setting entries.
* **Write Owner**: Director
* **Fields**:
  * `hallOfFameId` (string, Primary Key)
  * `seasonId` (string)
  * `athleteId` (string)
  * `clubId` (string)
  * `awardType` (string) — `champion`, `record`, `lifetime`
  * `awardTitle` (string)
  * `description` (string)
  * `imageUrl` (string)
  * `achievedAt` (string, ISO)

### 16. audit_logs
* **Collection Path**: `/audit_logs`
* **Purpose**: Security trail of human/admin mutations.
* **Write Owner**: Audit Logger (never writes back to business data)
* **Fields**:
  * `logId` (string, Primary Key)
  * `userId` (string)
  * `userRole` (string)
  * `action` (string) — `LINK_ACCOUNT`, `OVERRIDE_CLAIM`, `CLUB_JOIN`, `UPDATE_CONFIG`
  * `targetCollection` (string)
  * `targetDocumentId` (string)
  * `oldData` (map, optional)
  * `newData` (map)
  * `timestamp` (string, ISO)

### 17. event_logs
* **Collection Path**: `/event_logs`
* **Purpose**: Audit track of raw event streams.
* **Write Owner**: Event Broker
* **Fields**:
  * `logId` (string, Primary Key)
  * `eventName` (string)
  * `payload` (map)
  * `timestamp` (string, ISO)

### 18. repository_metadata
* **Collection Path**: `/repository_metadata`
* **Purpose**: Cache control, synchronization timestamps.
* **Write Owner**: Repositories
* **Fields**:
  * `id` (string, Primary Key)
  * `collectionName` (string)
  * `lastSyncTime` (string, ISO)

### 19. system_metadata
* **Collection Path**: `/system_metadata`
* **Purpose**: Internal metrics, system health logs.
* **Write Owner**: System Orchestrator
* **Fields**:
  * `id` (string, Primary Key)
  * `moduleName` (string)
  * `status` (string)
  * `diagnostics` (map)

### 20. athlete_timeline_events
* **Collection Path**: `/athlete_timeline_events`
* **Purpose**: Lifelong timeline events tracking of athletes (club transfers, milestones, results).
* **Write Owner**: Downstream Domain Engines (Career, Achievement, Admin Actions)
* **Fields**:
  * `eventId` (string, Primary Key)
  * `athleteId` (string)
  * `seasonId` (string, optional)
  * `timestamp` (string, ISO)
  * `eventType` (string) — `JOIN_VSC`, `CLUB_TRANSFER`, `TOURNAMENT_FINISH`, `RECORD_BREAK`, `PODIUM`
  * `title` (string)
  * `description` (string)
  * `metadata` (map, optional)

### 21. season_rankings
* **Collection Path**: `/season_rankings`
* **Purpose**: Accumulated individual, team, club, and province rankings across an entire season.
* **Write Owner**: Season Engine / Ranking Engine
* **Fields**:
  * `rankingId` (string, Primary Key) — e.g. `season_rank_season_2026_individual`
  * `seasonId` (string)
  * `type` (string) — `individual` | `team` | `club` | `province`
  * `rankings` (array of maps) — e.g. rank, id, name, vscNumber, clubId, clubName, points, goldCount, silverCount, bronzeCount, totalShots, accuracy
  * `updatedAt` (string, ISO)

### 22. club_timeline_events
* **Collection Path**: `/club_timeline_events`
* **Purpose**: Timeline milestones achieved by clubs.
* **Write Owner**: Downstream Domain Engines (Statistics, Achievements, Admin Actions)
* **Fields**:
  * `eventId` (string, Primary Key)
  * `clubId` (string)
  * `timestamp` (string, ISO)
  * `eventType` (string)
  * `title` (string)
  * `description` (string)
  * `metadata` (map, optional)

### 23. club_history_events
* **Collection Path**: `/club_history_events`
* **Purpose**: Organizational lifecycle mutations of a club (Foundations, renames, leadership transfers, etc).
* **Write Owner**: Club Management Engine
* **Fields**:
  * `eventId` (string, Primary Key)
  * `clubId` (string)
  * `timestamp` (string, ISO)
  * `eventType` (string) — `CLUB_FOUNDED`, `CLUB_RENAMED`, `MANAGER_TRANSFERRED`, `CLUB_MERGED`, `CLUB_DISSOLVED`
  * `title` (string)
  * `description` (string)
  * `actorId` (string)
  * `metadata` (map, optional)

### 24. provinces
* **Collection Path**: `/provinces`
* **Purpose**: Master province identities, regional categorizations, and accumulated statistics.
* **Write Owner**: Province Domain Engine / Admin Actions
* **Fields**:
  * `provinceId` (string, Primary Key)
  * `provinceName` (string)
  * `provinceCode` (string)
  * `region` (string) — `Bắc` | `Trung` | `Nam`
  * `status` (string) — `active` | `inactive` | `suspended`
  * `statistics` (map) — totalClubs, totalAthletes, totalChampions, totalPodiums, totalTournamentsParticipated
  * `rankings` (map) — currentSeasonPoints, currentSeasonRank, allTimePoints, allTimeRank
  * `createdAt` (string, ISO)
  * `updatedAt` (string, ISO)

### 25. province_competition_history
* **Collection Path**: `/province_competition_history`
* **Purpose**: Competitive standings and medal maps of provinces per season and tournament.
* **Write Owner**: Downstream Domain Engines (Statistics / Rankings)
* **Fields**:
  * `historyId` (string, Primary Key)
  * `provinceId` (string)
  * `seasonId` (string)
  * `tournamentId` (string)
  * `competitionMode` (string)
  * `pointsContributed` (number)
  * `topRankAchieved` (number)
  * `medalsCount` (map) — gold, silver, bronze
  * `updatedAt` (string, ISO)

### 26. province_timeline_events
* **Collection Path**: `/province_timeline_events`
* **Purpose**: Timeline milestones achieved by provinces.
* **Write Owner**: Downstream Domain Engines (Statistics / Achievements)
* **Fields**:
  * `eventId` (string, Primary Key)
  * `provinceId` (string)
  * `timestamp` (string, ISO)
  * `eventType` (string) — `PROVINCE_CLUB_FOUNDED`, `PROVINCE_TOURNAMENT_ENTERED`, `PROVINCE_CHAMPION_ESTABLISHED`, `PROVINCE_HOF_ENTRY`
  * `title` (string)
  * `description` (string)
  * `metadata` (map, optional)

---

## 3. COMPLIANCE STATEMENT
No application feature is authorized to alter this schema. It is frozen under V3.0 standards.
