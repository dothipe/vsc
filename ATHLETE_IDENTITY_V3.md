# VSC Platform V3 — Athlete Identity Specification (ATHLETE_IDENTITY_V3)
Version: 1.0 (Official Standard)

This document establishes the standardization of a sovereign, lifelong, immutable identity for Slingshot athletes in the Vietnam Slingshot Championship (VSC) Platform V3 ecosystem. This is the **Athlete Identity Specification (VSC-ID)**.

---

## 1. Sovereignty & Lifelong Identity

Athlete Identity in VSC Platform V3 is completely independent of:
*   **Seasons**: An athlete retains their identity year-over-year.
*   **Tournaments**: Registrations refer back to the Athlete Identity, never duplicating core fields.
*   **Clubs**: Changing club representation updates affiliation history but leaves the athlete identity invariant.
*   **User Accounts**: Registered users can map to an Athlete Identity, but deleting or modifying user accounts does not damage the underlying Athlete Identity.

---

## 2. Core Identity Properties Schema

Athlete details are stored in the `/athletes` collection. The standard schema guarantees that each competitor has a single, verifiable, unique identity.

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
  "status": "active",
  "userMapping": {
    "isLinked": true,
    "userId": "usr_771892",
    "claimStatus": "verified"
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

### 2.1 Field Glossary

| Field Name | Type | Description | Mutability |
| :--- | :--- | :--- | :--- |
| `athleteId` | string | Unique primary key, generated on first entry. Format: `ath_` + random identifier. | **Immutable** |
| `vscNumber` | string | Standard National Athlete code issued by VSC (e.g., `VSC-HB-0023`). | **Admin-Only** |
| `fullName` | string | Human legal name of the competitor. | **Admin-Only** |
| `dob` | string | Date of Birth (YYYY-MM-DD) for division categorizations. | **Admin-Only** |
| `gender` | string | Male/Female designation for gender-based matches. | **Admin-Only** |
| `province` | string | Base geographical representational province. | Mutable (Admin) |
| `currentClubId` | string | Foreign key referencing the active club record inside `/clubs`. | Trigger-Updated |
| `status` | string | Competitive status: `active`, `retired`, `suspended`. | Trigger-Updated |

---

## 3. Athlete-to-User Mapping Machine (VSC-LINK)

The platform supports linking a single Athlete Identity to a registered user account (`/users`). This facilitates user claims, personal profile management, and dashboard personalization.

### 3.1 Mapping States

1.  **UNLINKED**: The Athlete profile is created by administrators for a tournament entry. No user owns it yet.
2.  **PENDING_CLAIM**: A registered user has initiated a request to verify ownership of this Athlete record.
3.  **VERIFIED**: Administrators have approved the claim request. The user is mapped to the athlete profile. `userMapping.isLinked = true`, `userMapping.userId = "usr_xyz"`.

### 3.2 Ownership Lifecycle Operations

*   **Link Creation**: Links `athleteId` to `userId`. Validates that the target `userId` is not already mapped to another `athleteId`.
*   **Transfer Ownership**: Allows moving the linked `userId` to a new user account (e.g., email change) without modifying historical timeline results or statistics.
*   **Unlink / Revocation**: Triggered by administrators if verification is falsified. Resets status back to `UNLINKED`.

---

## 4. Media & Credentials Framework

The Athlete Identity includes a native media context designed for public identity cards:

*   **Avatar Sanitization**: All base64 upload strings are stripped during Firestore sync and stored locally on device cache or media buckets to comply with document size limits. The path translates to `local-avatar:${athleteId}`.
*   **QR Card Generation**: Dynamically generated card containing the Athlete’s name, VSC Number, verified checkmark, and current Club, embedded with a QR code referencing their Public Athlete Profile.

---

## 5. Sponsor & Equipment Mapping

The identity framework includes a pluggable Sponsorship metadata node:
*   **Sponsor ID**: Reference to `/sponsors`.
*   **Equipment**: Specific model of slingshot, bands, and ammo utilized by the competitor.
*   **Ambassador Status**: Indicates if the competitor is a registered VSC brand representative.
