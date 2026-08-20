# VSC Platform V3 — Athlete Profile Blueprint Specification (ATHLETE_PROFILE_BLUEPRINT_V3)
Version: 1.0 (Official Standard)

This document specifies the technical design, data injection models, and responsive UX layouts for the **Athlete Public Profile** in the Vietnam Slingshot Championship (VSC) Platform V3. 

To maintain high performance and code safety, the Athlete Profile is designed as a **Passive Consumer Component**. It does not perform state calculations, score filtering, or average accuracy mathematics. It acts purely as a visual renderer of pre-calculated documents retrieved from the Athlete Domain.

---

## 1. Unified Profile Architecture

The Athlete Profile UI aggregates data from four distinct Firestore collections based on the target `athleteId`:

```
                       ATHLETE PROFILE VIEW
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Identity Core   │  │ Career Summary   │  │ Statistics Node  │
│   (/athletes)    │  │(/career_snapsh..)│  │(/statistics_s..) │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                        Timeline Feed
                   (/athlete_timeline_events)
```

---

## 2. Page Sections & Layout Blueprints

The profile page is structured as a responsive, multi-grid layout (Bento Grid) optimized for desktop screens while collapsing into a unified single-column vertical stack on mobile devices.

### 2.1 Section 1: Hero Identity Banner
*   **Aesthetic Theme**: High-contrast, dark slate card with emerald green accents.
*   **Elements**:
    *   **Avatar Frame**: Circular, 128px bounding box with a soft green indicator glow for `active` statuses. Checks and replaces base64 placeholders with `local-avatar:${athleteId}` fallback graphics.
    *   **VSC Credential Identifier**: Space Grotesk display typography rendering the official `vscNumber`.
    *   **Core Metadata Grid**: Full Name, Current Club (with logo link), geographical Province, and Joined Date.
    *   **User Association Status Badge**: Displayed to administrators, indicating if the profile has been claimed by a verified User.

### 2.2 Section 2: Career Summary Widget
*   **Elements**:
    *   **Gold, Silver, and Bronze Medallion Tally**: Centered visual nodes with circular icon frames and standard counting tallies.
    *   **Podium Tally**: Sum of Top 3 finishes.
    *   **Participation Numbers**: Total Seasons, Total Tournaments Entered, and Total Registered Events.

### 2.3 Section 3: Performance Statistics Panel (Radial Radar & Distance Bar Charts)
*   **Aesthetic Theme**: Clean JetBrains Mono numbers paired with responsive Recharts visual controls.
*   **Metrics Rendered**:
    *   **Overall Accuracy Meter**: Radial chart displaying `lifetimeAccuracy` percentage.
    *   **Hit Streak Counter**: Visual fire indicator rendering the `highestHitStreak` value.
    *   **Distance Range comparison**: A horizontal bar chart displaying average and best scores segregated for 10m, 12m, and 15m lines.
    *   **Team Multiplier**: Average Team Score Contribution and Team Lanes matching records.

### 2.4 Section 4: Chronological Biography Timeline
*   **Elements**:
    *   A clean vertical track displaying entries retrieved from `/athlete_timeline_events` ordered by `timestamp` desc.
    *   Staggered entry animations utilizing `motion/react` fade-in effects.

---

## 3. Data Extraction Contract (The Loading Sequence)

```typescript
export function useAthleteProfileData(athleteId: string) {
  const [profile, setProfile] = useState<Athlete | null>(null);
  const [career, setCareer] = useState<CareerSnapshot | null>(null);
  const [stats, setStats] = useState<StatisticsSnapshot | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;

    // Concurrent lookups to ensure fastest response
    const loadData = async () => {
      setLoading(true);
      try {
        const [profDoc, careerDoc, statsDoc, timelineSnap] = await Promise.all([
          getDoc(doc(db, "athletes", athleteId)),
          getDoc(doc(db, "career_snapshots", `career_overall_${athleteId}`)),
          getDoc(doc(db, "statistics_snapshots", `stats_overall_${athleteId}`)),
          getDocs(
            query(
              collection(db, "athlete_timeline_events"),
              where("athleteId", "==", athleteId),
              orderBy("timestamp", "desc")
            )
          )
        ]);

        if (profDoc.exists()) setProfile(profDoc.data() as Athlete);
        if (careerDoc.exists()) setCareer(careerDoc.data() as CareerSnapshot);
        if (statsDoc.exists()) setStats(statsDoc.data() as StatisticsSnapshot);
        
        const events: TimelineEvent[] = [];
        timelineSnap.forEach(doc => events.push(doc.data() as TimelineEvent));
        setTimeline(events);
      } catch (error) {
        console.error("Error retrieving Athlete Profile Domain data: ", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [athleteId]);

  return { profile, career, stats, timeline, loading };
}
```

---

## 4. UI-Extension Hooks (Future Integrations)

*   **Sponsors Segment**: Underneath the basic demographics card, a dynamic sponsor grid is supported. If `sponsorships.primarySponsorId` is resolved, it renders the sponsor’s brand tag, equipment description, and links to official partners.
*   **Media Gallery Tab**: Renders a bento grid of verified photography uploads from `/athletes.media.gallery`, allowing athletes to showcase medals, target groups, and certificate scans.
