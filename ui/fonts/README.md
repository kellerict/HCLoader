# Fonts

Lokal eingebundene Schriften (nur `latin`-Subset, woff2), alle unter der SIL Open Font License 1.1.
Quelle: npm-Pakete `@fontsource/*` 5.3.0 (unveränderte Dateien).

| Schrift | Schnitte | Lizenz |
|---|---|---|
| Bebas Neue | 400 | `OFL-BebasNeue.txt` |
| Inter | 400, 500, 600 | `OFL-Inter.txt` |
| JetBrains Mono | 400, 600 | `OFL-JetBrainsMono.txt` |

## Andere Schriftsysteme

Die Dateien hier decken nur Latein ab. Für Kyrillisch, Chinesisch, Devanagari und Bengalisch wird nichts
gebündelt: `ui/css/theme.css` hängt an jede Familie Schriften an, die Windows 10/11 mitbringt
(Bahnschrift/Impact, Segoe UI, Consolas, Microsoft YaHei UI, Nirmala UI); der Browser wählt sie pro Zeichen.
Gewicht, Grösse und Laufweite der Überschriften stellt `:root:lang(...)` je Schriftsystem ein
(`--w-head`, `--hs`, `--ls`).
