# VSC Platform V3 — Database Index Plan

This document details the single-field and composite index requirements for the frozen VSC Platform V3 Firestore database.

---

## 1. REQUIRED COMPOSITE INDEXES

Firestore requires explicit composite indexes for queries that filter on one field and sort on another, or filter on multiple fields. The following indexes are mandatory:

### 1. OFFICIAL SCORE LEDGER (`official_score_ledger`)
* **Index fields**:
  * `tournamentId` (Ascending)
  * `round` (Ascending)
  * `timestamp` (Descending)
* **Query usage**: Finding all official scores for a specific tournament round, ordered by when they were entered.

### 2. CLUB MEMBERS (`club_members`)
* **Index fields**:
  * `clubId` (Ascending)
  * `status` (Ascending)
  * `joinedAt` (Descending)
* **Query usage**: Retrieving active club members sorted by join date.

### 3. CLUB JOIN REQUESTS (`club_join_requests`)
* **Index fields**:
  * `clubId` (Ascending)
  * `status` (Ascending)
  * `requestedAt` (Descending)
* **Query usage**: Retrieving pending membership applications for club manager reviews, sorted by oldest request.

### 4. RANKING SNAPSHOTS (`ranking_snapshots`)
* **Index fields**:
  * `tournamentId` (Ascending)
  * `round` (Ascending)
  * `createdAt` (Descending)
* **Query usage**: Fetching the latest calculated leaderboard standing snapshot for a tournament round.

### 5. HALL OF FAME (`hall_of_fame`)
* **Index fields**:
  * `seasonId` (Ascending)
  * `achievedAt` (Descending)
* **Query usage**: Querying Hall of Fame awards by season, sorted from latest achievements.

### 6. AUDIT LOGS (`audit_logs`)
* **Index fields**:
  * `userId` (Ascending)
  * `timestamp` (Descending)
* **Query usage**: Fetching audit logs for a specific user profile, sorted by latest actions.

---

## 2. SINGLE FIELD INDEXES & EXEMPTIONS
* **Auto-indexes**: All standard single fields are indexed automatically by Firestore.
* **Large Strings Exemption**: Heavy fields like `biography` in `/athletes`, `description` in `/clubs` and `/tournaments`, and rule configuration strings in `/rule_templates` should be exempt from indexing to reduce storage usage and speed up write times.
* **Array Indexing**: Array fields such as `shots`, `soloShots`, and `reSoloShots` inside the `official_score_ledger` are indexed using `ARRAY_CONTAINS` to permit queries for specific hit-pattern results.
