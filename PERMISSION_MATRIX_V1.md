# VSC Platform V3 – Permission Matrix Specification
Version: 1.0 (Frozen)

## 1. Multi-Layer Permission Model
VSC Platform V3 implements a four-layered security permission paradigm:
1. **Global Role (Layer 1)**: Defines system-wide access levels.
2. **Tournament Role (Layer 2)**: Defines active tournament capabilities.
3. **Capabilities (Layer 3)**: Granular functional permissions mapped from roles.
4. **Workflow Stage (Layer 4)**: Temporal visibility gate depending on active tournament status.

---

## 2. Defined Roles
### Global Roles (`GlobalRole`):
- **`guest`**: Public viewers, anonymous users.
- **`user`**: Registered athletes and regular members.
- **`user_admin`**: Administrative moderators.
- **`admin`**: System administrators.
- **`system_owner`**: Root database and infrastructure owner.

### Tournament Roles (`TournamentRole`):
- **`spectator`**: General public watching results.
- **`athlete`**: Checked-in participant in the event.
- **`club_manager`**: Leader of registered clubs.
- **`referee`**: Certified line officers scoring shooters.
- **`head_referee`**: Senior officer approving ledger scores.
- **`sub_admin`**: Co-organizers with specialized capabilities.
- **`tournament_director`**: Event coordinator.
- **`tournament_owner`**: Primary tournament creator.
