# VSC Platform V3 — Entity Relationship Diagram (ERD) Specification

This document maps out the normalized entities, relations, and reference fields across our frozen Firestore database architecture.

---

## 1. RELATIONSHIP OVERVIEW

```
  [ users ] 1  -----------> 0..1 [ athletes ]
              (auth mapping)

  [ athletes ] 1 <---------- 0..* [ club_members ] 0..* ----------> 1 [ clubs ]
                (membership mapping)

  [ athletes ] 1 <---------- 0..* [ club_join_requests ] ----------> 1 [ clubs ]
                (joining workflow)

  [ seasons ] 1  -----------> 0..* [ tournaments ]
              (seasonal grouping)

  [ tournaments ] 1 --------> 0..* [ official_score_ledger ] <------- 1 [ athletes / participants ]
                 (official shot-by-shot ledger)

  [ tournaments ] 1 --------> 0..1 [ liveboard_snapshots ]
                 (dynamic cache)

  [ tournaments ] 1 --------> 0..* [ ranking_snapshots ]
                 (calculated leaderboard)

  [ seasons ] 1  -----------> 0..* [ hall_of_fame ] <----------- 1 [ athletes ]
              (achievements & awards)
```

---

## 2. DETAILED ENTITY SCHEMAS & RELATION KEYS

### USERS (`/users`)
* `uid` (PK, matches Firebase Auth UID)
* `linkedAthleteId` (FK -> `athletes.athleteId`, NULL if user is not a verified Athlete)

### ATHLETES (`/athletes`)
* `athleteId` (PK, string)
* `vscNumber` (Unique String, e.g., `VSC-2026001`)
* `currentClubId` (FK -> `clubs.clubId`, NULL if independent/guest)
* `linkedUserId` (FK -> `users.uid`, NULL if unclaimed)

### CLUBS (`/clubs`)
* `clubId` (PK, string)
* `managerUserId` (FK -> `users.uid`)

### CLUB MEMBERS (`/club_members`)
* `memberId` (PK, string)
* `clubId` (FK -> `clubs.clubId`)
* `athleteId` (FK -> `athletes.athleteId`)
* `userId` (FK -> `users.uid`)

### CLUB JOIN REQUESTS (`/club_join_requests`)
* `requestId` (PK, string)
* `clubId` (FK -> `clubs.clubId`)
* `athleteId` (FK -> `athletes.athleteId`)
* `userId` (FK -> `users.uid`)

### SEASONS (`/seasons`)
* `seasonId` (PK, string, e.g., `season_2026`)

### RULE TEMPLATES (`/rule_templates`)
* `templateId` (PK, string)

### TOURNAMENTS (`/tournaments`)
* `tournamentId` (PK, string)
* `seasonId` (FK -> `seasons.seasonId`)
* `ownerId` (FK -> `users.uid`)

### OFFICIAL SCORE LEDGER (`/official_score_ledger`)
* `scoreId` (PK, string)
* `tournamentId` (FK -> `tournaments.tournamentId`)
* `participantId` (FK -> `athletes.athleteId`)
* `operator` (FK -> `users.uid` of referee)

### RANKING SNAPSHOTS (`/ranking_snapshots`)
* `snapshotId` (PK, string)
* `tournamentId` (FK -> `tournaments.tournamentId`)

### CAREER SNAPSHOTS (`/career_snapshots`)
* `snapshotId` (PK, string)
* `athleteId` (FK -> `athletes.athleteId`)

### STATISTICS SNAPSHOTS (`/statistics_snapshots`)
* `snapshotId` (PK, string)
* `athleteId` (FK -> `athletes.athleteId`)

### LIVEBOARD SNAPSHOTS (`/liveboard_snapshots`)
* `snapshotId` (PK, string)
* `tournamentId` (FK -> `tournaments.tournamentId`)

### HALL OF FAME (`/hall_of_fame`)
* `hallOfFameId` (PK, string)
* `seasonId` (FK -> `seasons.seasonId`)
* `athleteId` (FK -> `athletes.athleteId`)
* `clubId` (FK -> `clubs.clubId`)

### AUDIT LOGS (`/audit_logs`)
* `logId` (PK, string)
* `userId` (FK -> `users.uid`)
* `targetDocumentId` (string, ID of referenced document)

---

## 3. CARDINALITY AND CONSTRAINTS
* **No Orphan Documents**: Deleting an Athlete or Club must trigger cascaded cleanup or soft-deactivation of corresponding members/join requests.
* **Score-Only Standing**: Leaderboard rankings are never hardcoded inside `athletes`; they must be generated from `ranking_snapshots` to preserve temporal accuracy.
