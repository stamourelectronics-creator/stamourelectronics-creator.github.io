# St.Amour Sandbox Security Specification

## 1. Data Invariants
- **Authentication**: All writes to cloud persistent storage (`leaderboard_snake`, `user_snake_skins`, `published_games`) require a valid Google authenticated session (`request.auth != null`).
- **Identity Protection (`user_snake_skins`)**: A user can only write custom skins if the `userId` in the document matches their authenticated `request.auth.uid`.
- **Identity Protection (`published_games`)**: Immutability of the `createdAt` and verification of payload fields.
- **Timestamp Integrity**: All server timestamps (`createdAt`) must exactly match `request.time` on creation. No client-provided timestamps are trusted.
- **Input Validation**: Text fields like `name`, `title`, `genre`, `tagline` must be rigorously constrained in size to prevent denial of service (Denial of Wallet).
- **Immutable Fields**: High-score values, skin characteristics, and game codes are immutable once created; no client update operations are permitted on `leaderboard_snake`, `user_snake_skins`, or `published_games` directly via the client SDK (to prevent fraud, cheating, or defacement). Only reading is allowed (via `get` and `list`).

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads constitute attacks trying to bypass structural state or identity boundaries. They must be strictly blocked by Firestore Rules return `PERMISSION_DENIED`:

### Payload 1: Score Spoofing (No Session ID)
- **Collection**: `leaderboard_snake`
- **Operation**: `create`
- **Target**: Bypassing authentication to submit score under a random identity.
```json
{
  "name": "Hacker",
  "score": 999999,
  "date": "2026-06-09",
  "skin": "Garden Blue",
  "createdAt": "2026-06-09T11:26:49Z"
}
```

### Payload 2: Score Spoofing (Spoofed Server Timestamp)
- **Collection**: `leaderboard_snake`
- **Operation**: `create`
- **Target**: Submitting score with client-defined timestamp instead of `request.time`.
```json
{
  "name": "Cheater",
  "score": 500,
  "date": "2026-06-09",
  "skin": "Garden Blue",
  "createdAt": "2020-01-01T00:00:00Z"
}
```

### Payload 3: Score Spoofing (Massive Denial-of-Wallet Payload String)
- **Collection**: `leaderboard_snake`
- **Operation**: `create`
- **Target**: Sending a huge name string (1MB) to inflate storage costs.
```json
{
  "name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...(1MB)",
  "score": 10,
  "date": "2026-06-09",
  "skin": "Garden Blue",
  "createdAt": "request.time"
}
```

### Payload 4: Score Hijacking (Attempted Score Update)
- **Collection**: `leaderboard_snake`
- **Operation**: `update`
- **Target**: Client trying to change their own or others' recorded scores.
```json
{
  "score": 99999
}
```

### Payload 5: Skin Identity Theft (Impersonating Owner UID)
- **Collection**: `user_snake_skins`
- **Operation**: `create`
- **Target**: Submitting a skin with `userId` of another target user.
```json
{
  "userId": "target_victim_uid_123",
  "name": "Stealth Green",
  "gradientStart": "#00ff00",
  "gradientEnd": "#003300",
  "glow": true,
  "emoji": "🐍",
  "createdAt": "request.time"
}
```

### Payload 6: Skin Vandalism (Attempting to edit saved custom skin)
- **Collection**: `user_snake_skins`
- **Operation**: `update`
- **Target**: Modifying existing skin parameters (skins must be read-only/delete-only for client stability).
```json
{
  "gradientStart": "#ffffff"
}
```

### Payload 7: Skin Deletion by Non-Owner
- **Collection**: `user_snake_skins`
- **Operation**: `delete`
- **Target**: Authenticated User B attempts to delete custom skin created by User A.
```json
{
  "path": "/user_snake_skins/user_a_skin_id"
}
```

### Payload 8: Skin Poisoning (Invalid Type Injection)
- **Collection**: `user_snake_skins`
- **Operation**: `create`
- **Target**: Injecting random types (e.g. `glow` field as integer instead of boolean) to break application serialization.
```json
{
  "userId": "attacker_uid",
  "name": "Malicious",
  "gradientStart": "#ff0000",
  "gradientEnd": "#0000ff",
  "glow": 12345,
  "emoji": "🔥",
  "createdAt": "request.time"
}
```

### Payload 9: Game Defacement (Altering Published Game)
- **Collection**: `published_games`
- **Operation**: `update`
- **Target**: Overwriting someone's compiled HTML sandbox arcade code.
```json
{
  "codeHtml": "<h1>DEFACED BY HACKERS</h1>"
}
```

### Payload 10: Game Poisoning (Missing Title)
- **Collection**: `published_games`
- **Operation**: `create`
- **Target**: Publishing a game without the required structural fields like `title`.
```json
{
  "genre": "Sandbox",
  "tagline": "Unlabeled chaos",
  "rules": ["Ignore rules"],
  "codeHtml": "<html></html>",
  "createdAt": "request.time",
  "authorName": "Anonymous"
}
```

### Payload 11: Game Poisoning (Exceeded Rules Array Size)
- **Collection**: `published_games`
- **Operation**: `create`
- **Target**: Flooding rules with millions of index inputs.
```json
{
  "title": "Flooded rules",
  "genre": "Sandbox",
  "tagline": "Unlabelled",
  "rules": ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12"],
  "codeHtml": "<html></html>",
  "createdAt": "request.time",
  "authorName": "Attacker"
}
```

### Payload 12: Anonymous Game Overwrite
- **Collection**: `published_games`
- **Operation**: `create`
- **Target**: Publishing code without being authenticated.
```json
{
  "title": "Anonymous Sandbox",
  "genre": "Physics",
  "tagline": "No accountability",
  "rules": ["None"],
  "codeHtml": "<html></html>",
  "createdAt": "request.time",
  "authorName": "Stranger"
}
```

---

## 3. Test Runner Definition
We declare a comprehensive `firestore.rules.test.ts` outline that maps tests to the specified rules (verified through compilation or rules simulation checks).
