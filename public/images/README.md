# /public/images — Asset Catalogue

All artwork used across the Binary Beats platform lives here, organised into
five subfolders.  Every file follows a semantic hex-style naming scheme so
the filename alone tells you _where_ the image goes and _what shape_ it is.

---

## Naming Convention

```
0x[ROLE][SEQ][ASP].jpeg
```

| Segment | Length | Meaning |
|---------|--------|---------|
| `ROLE`  | 2 chars | Destination role (see table below) |
| `SEQ`   | 3 digits | Zero-padded sequence number within that role |
| `ASP`   | 1 char | Aspect-ratio hint |

### ROLE codes

| Code | Folder | Used in | Typical content |
|------|--------|---------|-----------------|
| `BG` | `backgrounds/` | `BG_IMAGES` (heroDefault, bountyBg, leaderboardBg, profileBg, blitzBg) | Wide-landscape full-bleed page backgrounds |
| `AC` | `arc-covers/`  | `DEFAULT_ARC_COVERS` (arc 1–9) | Portrait cover art, one per learning arc |
| `EP` | `episodes/`    | `getEpisodeImage()` (72+ episode IDs) | Episode thumbnail cards |
| `AV` | `avatars/`     | `AVATAR_IMAGES` | Square profile-picture options |
| `MC` | `misc/`        | ad-hoc | Uncategorised / pending placement |

### ASP codes

| Code | Ratio range | Best fit |
|------|-------------|----------|
| `w`  | > 1.5 : 1   | Hero banners, full-width backgrounds |
| `s`  | 0.85 – 1.2  | Avatars, circular crops, wanted-poster thumbnails |
| `p`  | 0.58 – 0.85 | Episode cards, arc covers, character portraits |
| `t`  | < 0.58      | Tall mobile-style splash panels |

---

## Folder Map

```
public/images/
├── backgrounds/          5 files   0xBG001w – 0xBG005w
│   ├── 0xBG001w.jpeg     heroDefault      – One Piece crew / burning ship, ultra-wide panorama (2.4:1)
│   ├── 0xBG002w.jpeg     bountyBg         – JJK cobalt-blue + orange action scene (1.78:1)
│   ├── 0xBG003w.jpeg     leaderboardBg    – fire silhouette, arms outstretched (1.78:1)
│   ├── 0xBG004w.jpeg     profileBg        – three-face close-up study (1.78:1)
│   └── 0xBG005w.jpeg     blitzBg         – black/pink rooftop fight (1.5:1)
│
├── arc-covers/           9 files   0xAC001p – 0xAC009p
│   ├── 0xAC001p.jpeg     Arc 1 Algorithms        – "Romance Dawn" One Piece poster
│   ├── 0xAC002p.jpeg     Arc 2 Cybersecurity     – Shibuya Station noir infiltration
│   ├── 0xAC003p.jpeg     Arc 3 Machine Learning  – crimson temple interior, neural depth
│   ├── 0xAC004p.jpeg     Arc 4 Networks          – concentric-ring swordsman
│   ├── 0xAC005p.jpeg     Arc 5 Data Structures   – Berserk dark rider under eclipse
│   ├── 0xAC006p.jpeg     Arc 6 Competitive       – Miles Morales rain charge
│   ├── 0xAC007p.jpeg     Arc 7 Mathematics       – silhouette in red flower field
│   ├── 0xAC008p.jpeg     Arc 8 Probability       – Laila Starr comic cover
│   └── 0xAC009p.jpeg     Arc 9 Initiation        – masked figure, gold cross
│
├── episodes/            83 files   0xEP001p – 0xEP083t
│   ├── 0xEP001p – 0xEP008p   Arc 1 Algorithms episode thumbnails
│   ├── 0xEP009p – 0xEP016p   Arc 2 Cybersecurity
│   ├── 0xEP017p – 0xEP024p   Arc 3 Machine Learning
│   ├── 0xEP025p – 0xEP032p   Arc 4 Networks
│   ├── 0xEP033p – 0xEP040p   Arc 5 Data Structures
│   ├── 0xEP041p – 0xEP048p   Arc 6 Competitive Programming
│   ├── 0xEP049p – 0xEP056p   Arc 7 Mathematics
│   ├── 0xEP057p – 0xEP064p   Arc 8 Probability
│   ├── 0xEP065p – 0xEP068p   Legacy ML episode IDs (S1E1–S2E3)
│   ├── 0xEP069p – 0xEP076t   Arc 9 Initiation
│   └── 0xEP077t – 0xEP083t   Tall-portrait spares (ratio < 0.58, mobile/splash)
│
├── avatars/             23 files   0xAV001s – 0xAV023s
│   ├── 0xAV001s – 0xAV005s   "Blue-neon bunny" blitz (cobalt + neon-red, painterly)
│   ├── 0xAV006s – 0xAV007s   STARBOY graphic poster art
│   ├── 0xAV008s              Berserk Guts portrait
│   └── 0xAV009s – 0xAV023s   Assorted anime/graphic square art
│
└── misc/                 3 files   0xMC001x – 0xMC003x
    └── Uncategorised assets; assign to a named folder when a placement is decided
```

---

## Colour Palette & Uniformity

All images were selected to sit within the **Synth Sunset** design-token palette
defined in `src/styles/App.css :root`:

| Token | Hex | Role in imagery |
|-------|-----|-----------------|
| `--cyber-blue` | `#00d4ff` | Highlight strokes, neon accents |
| Cobalt field | `#0000cc–#1a1aff` | Dominant background hue across bunny blitz, JJK art |
| `--red` / accent | `#ff2020–#ff6a00` | Character outlines, flame, neon rabbits |
| `--gold` | `#ffd700` | STARBOY lettering, eclipse rings |
| Near-black | `#050510` | Page-level background, matches `--bg` token |

Images that deviate from this palette (e.g. the green-teal "Perfect Days" poster
`0xEP023p`) are placed in episode slots where they appear small enough not to
break the global feel.  To swap any image, drop a replacement with the same
filename into the same subfolder — no code changes needed.

---

## How to Replace an Image

1. Drop the new file into the correct subfolder with the **same filename**.
2. Prefer the same aspect ratio (check the `ASP` suffix).
3. Run `npm run build` to confirm zero TypeScript errors.
4. No changes to `src/lib/imageMapping.ts` are required unless you are adding
   a brand-new slot (new arc, new background key, etc.).

## How to Add a New Slot

1. Assign the next available `SEQ` for the relevant `ROLE`.
2. Add the file to the subfolder.
3. Add the new path to `imageMapping.ts` under the appropriate export.
4. Reference `getArcCover()`, `getEpisodeImage()`, `BG_IMAGES`, or
   `AVATAR_IMAGES` in your component.
