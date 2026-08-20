# VSC Platform V3 — Official Database Architecture (Freeze Version 3.0)

This file contains the frozen database design for VSC Platform V3. No other collections, fields, or mapping schemes are permitted. Whenever the database is referenced or modified, this architecture must be strictly adhered to.

---

# CORE PRINCIPLES
- **Single Source of Truth**: Every entity has exactly one owner.
- **No Cross-Writes**: UI never writes directly across multiple collections.
- **Strict Layers**: Repositories own all writes. Business Engines consume repositories. Presentation layer reads.

---

# COLLECTION SPECIFICATIONS

## 1. USERS
- **Collection**: `/users`
- **Purpose**: Authentication and application account.
- **Fields**:
  * `uid` (string)
  * `email` (string)
  * `displayName` (string)
  * `googleAvatar` (string)
  * `customAvatar` (string)
  * `phone` (string)
  * `role` (string)
  * `permissions` (array/list)
  * `linkedAthleteId` (string, optional)
  * `status` (string)
  * `createdAt` (timestamp/string)
  * `lastLogin` (timestamp/string)

## 2. ATHLETES
- **Collection**: `/athletes`
- **Purpose**: Permanent Athlete Registry (Single Source of Truth of sporting identity).
- **Fields**:
  * `athleteId` (string)
  * `vscNumber` (string)
  * `fullName` (string)
  * `gender` (string)
  * `birthday` (string)
  * `province` (string)
  * `currentClubId` (string)
  * `avatar` (string)
  * `biography` (string)
  * `facebook` (string)
  * `zalo` (string)
  * `emergencyContact` (string)
  * `equipment` (string)
  * `personalNotes` (string)
  * `linkedUserId` (string, optional)
  * `claimStatus` (string)
  * `profileCompletion` (number)
  * `createdAt` (timestamp/string)

## 3. CLUBS
- **Collection**: `/clubs`
- **Purpose**: Official Club Registry.
- **Fields**:
  * `clubId` (string)
  * `clubName` (string)
  * `shortName` (string)
  * `logo` (string)
  * `banner` (string)
  * `province` (string)
  * `address` (string)
  * `description` (string)
  * `managerUserId` (string)
  * `foundedDate` (string)
  * `status` (string)

## 4. CLUB MEMBERS
- **Collection**: `/club_members`
- **Purpose**: Membership relationship.
- **Fields**:
  * `memberId` (string)
  * `clubId` (string)
  * `athleteId` (string)
  * `userId` (string)
  * `role` (string)
  * `status` (string)
  * `joinedAt` (timestamp/string)
  * `leftAt` (timestamp/string)

## 5. CLUB JOIN REQUESTS
- **Collection**: `/club_join_requests`
- **Fields**:
  * `requestId` (string)
  * `clubId` (string)
  * `athleteId` (string)
  * `userId` (string)
  * `status` (string)
  * `requestedAt` (timestamp/string)
  * `approvedBy` (string)
  * `approvedAt` (timestamp/string)

## 6. SEASONS
- **Collection**: `/seasons`
- **Purpose**: Competition Season.
- **Fields**:
  * `seasonId` (string)
  * `name` (string)
  * `year` (number)
  * `status` (string)
  * `description` (string)
  * `startDate` (timestamp/string)
  * `endDate` (timestamp/string)

## 7. TOURNAMENTS
- **Collection**: `/tournaments`
- **Purpose**: Tournament configuration.
- **Fields**:
  * `tournamentId` (string)
  * `seasonId` (string)
  * `name` (string)
  * `logo` (string)
  * `banner` (string)
  * `organizer` (string)
  * `ruleSet` (string)
  * `status` (string)
  * `currentRound` (string)
  * `currentDistance` (number)
  * `workflowStage` (string)
  * `ownerId` (string)
  * `createdAt` (timestamp/string)

## 8. TOURNAMENT PARTICIPANTS
- **Subcollection**: `/tournaments/{tournamentId}/participants`
- **Purpose**: Snapshot of Athlete during Tournament.
- **Fields**:
  * `participantId` (string)
  * `athleteId` (string)
  * `bibNumber` (string)
  * `category` (string)
  * `checkInStatus` (string)
  * `tournamentStatus` (string)
  * `snapshotProfile` (map)

## 9. REFEREES
- **Subcollection**: `/tournaments/{tournamentId}/referees`
- **Fields**:
  * `refereeId` (string)
  * `userId` (string)
  * `role` (string)
  * `certification` (string)
  * `assignedLanes` (array)

## 10. ASSIGNMENTS
- **Subcollection**: `/tournaments/{tournamentId}/assignments`
- **Purpose**: Lane Assignment.
- **Fields**:
  * `assignmentId` (string)
  * `participantId` (string)
  * `round` (string)
  * `distance` (number)
  * `heat` (number)
  * `lane` (number)
  * `shootingOrder` (number)
  * `refereeId` (string)
  * `assignmentVersion` (string)

## 11. REFEREE WORKSPACES
- **Subcollection**: `/tournaments/{tournamentId}/referee_workspaces`
- **Purpose**: Temporary Live Scoring.
- **Fields**:
  * `workspaceId` (string)
  * `refereeId` (string)
  * `activeParticipants` (array)
  * `temporaryShots` (array)
  * `temporaryScore` (number)
  * `laneStatus` (string)

## 12. OFFICIAL SCORE LEDGER
- **Subcollection**: `/tournaments/{tournamentId}/official_score_ledger`
- **Purpose**: The ONLY official score database.
- **Fields**:
  * `scoreId` (string)
  * `participantId` (string)
  * `round` (string)
  * `distance` (number)
  * `shots` (array)
  * `total` (number)
  * `soloShots` (array)
  * `reSoloShots` (array)
  * `operator` (string)
  * `timestamp` (timestamp/string)

## 13. RANKING SNAPSHOTS
- **Collection**: `/ranking_snapshots`
- **Fields**:
  * `snapshotId` (string)
  * `tournamentId` (string)
  * `round` (string)
  * `rankings` (array)
  * `metadata` (map)

## 14. RANKING VERSIONS
- **Collection**: `/ranking_versions`
- **Fields**:
  * `versionId` (string)
  * `seasonId` (string)
  * `rankings` (array)
  * `createdAt` (timestamp/string)

## 15. RANKING AUDIT
- **Collection**: `/ranking_audit_logs`

## 16. OFFICIAL RESULTS
- **Collection**: `/official_results`

## 17. OFFICIAL RESULT VERSIONS
- **Collection**: `/official_result_versions`

## 18. OFFICIAL RESULT AUDIT
- **Collection**: `/official_result_audit`

## 21. ACHIEVEMENTS
- **Collection**: `/achievements`

## 22. NOTIFICATIONS
- **Collection**: `/notifications`

## 23. SPONSORS
- **Collection**: `/sponsors`

## 24. TEMPLATES
- **Collection**: `/templates`

## 25. SYSTEM SETTINGS
- **Collection**: `/system_settings`

## 26. AUDIT LOGS
- **Collection**: `/audit_logs`
