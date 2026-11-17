/* HCLoader UI texts – Svenska.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "sv", "name": "Svenska", "dir": "ltr", "intl": "sv-SE"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "HÅRDMUSIKARKIV",
    "mock": "DEMOLÄGE"
  },
  "nav": {
    "discover": "Upptäck",
    "inbox": "Inkorg",
    "watchlist": "Bevakning",
    "downloads": "Nedladdningar",
    "library": "Bibliotek",
    "log": "Logg",
    "settings": "Inställningar"
  },
  "navfoot": {
    "today": "IDAG",
    "next": "NÄSTA KONTROLL"
  },
  "common": {
    "ok": "OK",
    "cancel": "Avbryt",
    "save": "Spara",
    "delete": "Ta bort",
    "edit": "Redigera",
    "remove": "Ta bort",
    "reset": "Återställ",
    "on": "på",
    "off": "av",
    "current": "aktuell",
    "loading": "laddar …",
    "add_chip": "+ lägg till",
    "empty": "”tom”",
    "empty_list": "”ingen”"
  },
  "fmt": {
    "today": "idag",
    "yesterday": "igår",
    "never": "aldrig",
    "no_date": "Datum okänt",
    "just_now": "nyss",
    "today_at": "idag {t}",
    "tomorrow_at": "imorgon {t}",
    "yesterday_at": "igår {t}",
    "views": {
      "one": "{v} visning",
      "other": "{v} visningar"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "minuter",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "tecken",
    "results": "resultat",
    "entries": "poster",
    "clock": "24 h"
  },
  "range": {
    "ge_sleep": "≥ minimum",
    "ge_initial": "≥ startvärde"
  },
  "status": {
    "new": "Ny",
    "inbox": "I inkorgen",
    "queued": "I kö",
    "downloading": "Laddar ner",
    "done": "Nedladdad",
    "ignored": "Ignorerad",
    "failed": "Fel"
  },
  "period": {
    "all": "Alla",
    "7d": "Senaste 7 dagarna",
    "30d": "Senaste 30 dagarna",
    "1y": "Senaste 12 månaderna",
    "year": "Visst år",
    "custom": "Eget intervall"
  },
  "source_type": {
    "channel": "Kanal",
    "playlist": "Spellista",
    "search": "Sökning"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Plattform",
    "sc_off": "SoundCloud är avstängt – slå på det under Inställningar › SoundCloud."
  },
  "genre": {
    "change": "Ändra genre",
    "manual": "Genre inställd manuellt",
    "change_manual": "Ändra genre (inställd manuellt)"
  },
  "run_kind": {
    "watchlist": "Bevakning",
    "headless": "Aktivitetshanteraren",
    "manual": "Manuell"
  },
  "phase": {
    "waiting": "Väntar",
    "sleep": "Paus till nästa nedladdning",
    "download": "Laddar ner",
    "convert": "Konverterar",
    "tag": "Taggar",
    "failed": "Misslyckades"
  },
  "po_mode": {
    "off": "Av",
    "script": "Skript",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Av",
    "script": "Skript (Deno)",
    "http": "HTTP-server (lokal)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "saknas",
    "po": "PO token",
    "po_active": "aktiv ({mode})",
    "po_inactive": "inaktiv",
    "po_error": "Fel",
    "backoff": "Backoff",
    "backoff_none": "ingen",
    "backoff_until": "till {t} · {rest} kvar",
    "queue": "Kö",
    "queue_empty": "tom",
    "queue_active": "aktiv",
    "queue_paused": "pausad",
    "today": "Idag",
    "next": "Nästa kontroll",
    "next_off": "av",
    "backoff_until_short": "till {t}",
    "sc_backoff": "Backoff till {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · nedladdat idag {day}/{day_max} · {s}/{s_max} sökningar denna timme",
    "sc_tip": "SoundCloud · nedladdat idag {day}/{day_max} · {s}/{s_max} sökningar denna timme",
    "backoff_tip": "{p}: backoff till {t} ({rest} kvar)"
  },
  "schedule": {
    "due": "aktuell",
    "kind_app": "App",
    "kind_task": "Uppgift",
    "tip_app": "Nästa kontroll av bevakningen i appen: {t} (medan HCLoader körs).",
    "tip_task": "Nästa kontroll av bevakningen via Windows Aktivitetshanteraren: {t}.",
    "tip_any": "Nästa kontroll av bevakningen: {t}.",
    "tip_off": "Ingen automatisk kontroll – varken i appen eller via Windows Aktivitetshanteraren.",
    "tip_backoff": "Inga kontroller medan backoff är aktiv."
  },
  "card": {
    "source": "Hittad via bevakningskällan ”{name}”",
    "select": "Markera",
    "open": "Öppna på {p}",
    "ignore": "Ignorera",
    "unignore": "Sluta ignorera",
    "more": "Fler åtgärder",
    "download": "Ladda ner",
    "watch": "Lägg till kanalen i bevakningen",
    "block": "Blockera kanal",
    "set_genre": "Ange genre",
    "date_approx": "Ungefärligt datum – YouTube-sökningen anger bara ”för X år sedan”",
    "date_unknown": "Inget uppladdningsdatum angivet",
    "duplicate": "Troligen redan nedladdad ({p})",
    "duplicate_title": "Mycket lik titel och samma längd som ”{title}” från {p} – redan nedladdad eller i kö där. Du kan ändå ladda ner den.",
    "preview": "Endast förhandslyssning (Go+) – kan inte laddas ner",
    "preview_title": "SoundCloud ger bara en förhandslyssning på 30 sekunder (Go+) för det här spåret. Det kan inte laddas ner."
  },
  "discover": {
    "placeholder": "Sök efter mix, livesets, DJ, event …",
    "search": "Sök",
    "searching_btn": "Söker …",
    "searching": "Söker – enkel förfrågan, skonsam mot YouTube …",
    "sort": "Sortera",
    "sort_rel": "Relevans",
    "sort_date": "Nyast först",
    "sort_dur": "Längst först",
    "sort_views": "Flest visningar",
    "quota": "Sökningar denna timme: {n} / {max}",
    "quota_sc": "SoundCloud-sökningar denna timme: {n} / {max}",
    "placeholder_sc": "Sök på SoundCloud: mix, set, DJ, podcast …",
    "platform_title": "Var ska det sökas",
    "searching_sc": "Söker – enkel förfrågan, skonsam mot SoundCloud …",
    "ready_text_sc": "Skriv en sökterm och tryck på Enter för att söka på SoundCloud.",
    "previews": "{n} endast förhandslyssning (Go+)",
    "previews_title": "Förhandslyssningar (Go+) kan aldrig laddas ner. Syns när ”Dölj nedladdade och ignorerade” är avstängt.",
    "filters": "Filter",
    "toggle_filters": "Visa/dölj filterpanelen",
    "f_duration": "Längd (minuter)",
    "f_min": "Minimum",
    "f_max": "Maximum (tomt = ingen gräns)",
    "f_max_ph": "max",
    "f_period": "Uppladdningsperiod",
    "f_year": "År",
    "f_year_prev": "Ett år bakåt",
    "f_year_next": "Ett år framåt",
    "f_from": "Från",
    "f_to": "Till",
    "f_hint_year": "YouTube-sökningen anger bara ett ungefärligt datum (”för 13 år sedan”). Därför gäller ±1 år – och även varje mix med ”{year}” i titeln.",
    "f_hint_custom": "YouTube-sökningen anger bara ett ungefärligt datum. För ungefärliga datum gäller ±1 års tolerans i båda ändar.",
    "chip_title": "Klick: visa/dölj genre · Dubbelklick: bara den här genren (dess termer läggs till i sökningen)",
    "scope": "Sökningen utökas med",
    "scope_title": "Nästa sökning lägger till de här termerna i din söktext.",
    "searched": "Sökt med",
    "stale": "Filter ändrade sedan",
    "re_search": "Sök igen",
    "re_search_title": "Resultaten kommer från den senaste sökningen. Sök igen så att genre och år ingår i söktermen (räknas som en sökning).",
    "need_query": "Skriv först en sökterm.",
    "f_inc": "Inkludera nyckelord",
    "f_exc": "Exkludera nyckelord",
    "f_show": "Visning",
    "f_hide": "Dölj nedladdade och ignorerade",
    "f_blacklist": "Använd kanalsvartlistan",
    "count": {
      "one": "{n} resultat · {hidden} bortfiltrerade",
      "other": "{n} resultat · {hidden} bortfiltrerade"
    },
    "selected": "{n} markerade",
    "select_all": "Markera alla",
    "download_sel": "Ladda ner markerade",
    "ready_title": "Redo",
    "ready_text": "Skriv en sökterm och tryck på Enter.",
    "none_title": "Inget hittades",
    "none_text": "Lätta på filtren eller prova andra söktermer.",
    "none_year": "Inget resultat från {year}. Sök igen så att året ingår i söktermen – eller ändra året."
  },
  "inbox": {
    "title": "Inkorg",
    "sub": "Nya träffar från bevakningen som klarar alla filter",
    "sub_n": {
      "one": "{n} ny träff från bevakningen som klarar alla filter",
      "other": "{n} nya träffar från bevakningen som klarar alla filter"
    },
    "ignore_all": "Ignorera alla",
    "download_all": "Ladda ner alla",
    "ignore_sel": "Ignorera markerade",
    "download_sel": "Ladda ner markerade",
    "select_all": "Markera alla",
    "select_none": "Avmarkera",
    "src_all": "Alla källor",
    "src_none": "Ingen källa",
    "src_title": "Visa bara träffar från den här källan",
    "count": {
      "one": "{n} träff",
      "other": "{n} träffar"
    },
    "count_of": "{n} av {total} träffar",
    "selected": "{n} markerade",
    "empty_title": "Inkorgen är tom",
    "empty_text": "Bevakningen har inte hittat några nya mixar.",
    "empty_nosrc": "Inga källor i bevakningen än – lägg till en kanal, spellista eller sökning så hamnar nya mixar här.",
    "empty_next": "Nästa kontroll: {t}.",
    "to_watchlist": "Till bevakningen"
  },
  "watchlist": {
    "title": "Bevakning",
    "sub_n": {
      "one": "{n} källa · {active} aktiv",
      "other": "{n} källor · {active} aktiva"
    },
    "sub_next": "nästa kontroll {t}",
    "add": "Källa",
    "check_all": "Kontrollera alla nu",
    "check": "Kontrollera",
    "checking": "kontrollerar …",
    "queued": "väntar …",
    "running": "Kontrollerar …",
    "running_n": "Kontrollerar {i} / {n} …",
    "col_active": "Aktiv",
    "col_name": "Namn",
    "col_type": "Typ",
    "col_genre": "Genre",
    "col_auto": "Nya träffar",
    "col_max": "Max",
    "col_last": "Senast kontrollerad",
    "col_new": "Nya",
    "genre_auto": "automatisk",
    "genre_auto_long": "Automatisk (från nyckelord)",
    "auto_on": "ladda ner",
    "auto_off": "inkorg",
    "auto_title_on": "Nya träffar laddas ner automatiskt",
    "auto_title_off": "Nya träffar går bara till inkorgen",
    "new_title": "Visa i inkorgen",
    "check_title": "Kontrollera den här källan nu",
    "why_off": "Källan är inte aktiv",
    "why_running": "En kontroll pågår redan",
    "why_backoff": "Backoff är aktiv – kontroll blockerad",
    "why_backoff_p": "Backoff ({p}) är aktiv – kontroll blockerad",
    "why_sc_off": "SoundCloud är avstängt",
    "error_title": "Senaste kontrollen misslyckades",
    "backoff": "<b>Backoff aktiv till {t}</b> ({rest} kvar). Bevakningen kan inte kontrolleras – schemalagda kontroller pausas också.",
    "backoff_p": "<b>Backoff ({p}) aktiv till {t}</b> ({rest} kvar). Källor från {p} hoppas över tills dess – {other} fortsätter.",
    "backoff_link_sc": "Öppna SoundCloud",
    "backoff_link": "Öppna Strypning",
    "none_active": "Ingen aktiv källa att kontrollera",
    "empty_title": "Inga källor",
    "empty_text": "Lägg till en kanal, spellista eller sparad sökning.",
    "add_title": "Lägg till källa",
    "edit_title": "Redigera källa",
    "f_type": "Typ",
    "f_name": "Namn",
    "f_url": "URL",
    "f_query": "Sökterm",
    "f_genre": "Standardgenre",
    "f_max": "Max antal poster",
    "f_newest_last": "De nyaste ligger sist (läs spellistan baklänges)",
    "hint_newest_last": "I många spellistor lägger YouTube nya videor sist. Läser hela spellistan (ca 1 förfrågan per 100 videor, max 2000 poster).",
    "rev_title": "De nyaste ligger sist – spellistan läses från slutet",
    "rev_short": "baklänges",
    "f_enabled": "Aktiv – ingår i ”Kontrollera alla” och i schemat",
    "f_hits": "Nya träffar",
    "hits_inbox": "Till inkorgen",
    "hits_auto": "Ladda ner automatiskt",
    "hint_inbox": "Träffar väntar i inkorgen tills du laddar ner eller ignorerar dem.",
    "hint_auto": "Träffar som klarar alla filter går direkt till kön.",
    "hint_channel": "YouTube-kanal (…/@namn eller …/channel/UC…, valfritt /videos eller /streams) eller SoundCloud-profil (soundcloud.com/namn).",
    "hint_playlist": "YouTube-spellista med ”list=…” eller SoundCloud-set (soundcloud.com/namn/sets/set). De nyaste posterna kontrolleras.",
    "f_platform": "Sök på",
    "detected": "identifierad: {p} · {type}",
    "not_detected": "URL:en känns inte igen",
    "suggested": "Förslag",
    "suggested_title": "Föreslaget utifrån URL:en. Om det lämnas oförändrat ersätts det av det riktiga namnet vid första kontrollen – eller skriv över det själv.",
    "hint_name_auto": "Föreslaget utifrån URL:en – ändra gärna. Om det är oförändrat sätter första kontrollen det riktiga namnet.",
    "hint_name_later": "Namnet sätts vid första kontrollen – eller skriv in det här själv.",
    "name_auto_title": "Preliminärt namn – nästa kontroll sätter det riktiga",
    "hint_search": "Sparad sökning, som under ”Upptäck” – räknas som en sökning per kontroll.",
    "hint_max": "per kontroll",
    "max_default": "(standard)",
    "max_default_title": "Inget eget värde: ”Poster per källa” från Inställningar › Schema gäller",
    "max_title": "Tomt = standard från Inställningar › Schema. Högst 200, 100 för sökkällor.",
    "ph_name": "t.ex. Gabber Vault",
    "ph_name_later": "sätts vid första kontrollen",
    "ph_channel": "https://www.youtube.com/@kanal  eller  https://soundcloud.com/namn",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  eller  https://soundcloud.com/namn/sets/…",
    "ph_search": "t.ex. frenchcore liveset",
    "form_error": "Källan kunde inte sparas."
  },
  "downloads": {
    "title": "Nedladdningar",
    "sub": "Efter varandra, en nedladdning i taget",
    "pause": "Pausa",
    "resume": "Återuppta",
    "cancel": "Avbryt",
    "retry": "Försök igen",
    "remove": "Ta bort",
    "up": "Flytta upp",
    "down": "Flytta ner",
    "eta": "Kvar",
    "position": "Plats {n}",
    "sleep_left": "fortsätter om",
    "sleep_why": "Strypning: slumpmässig paus på {min}–{max} s mellan två nedladdningar",
    "next_up": "Nästa",
    "sleeping": "Pausar",
    "sleep_range": "av {min}–{max} s",
    "blocked_wait": "Väntar – {why}",
    "why_backoff": "Backoff",
    "why_day": "Dagsgräns",
    "why_run": "Körningsgräns",
    "why_paused": "pausad",
    "why_restart": "Omstart krävs",
    "why_busy": "en annan körning pågår",
    "why_pot": "PO-Token-servern är inte redo",
    "why_target": "Målmappen är inte nåbar",
    "why_error": "Nedladdningsmodul saknas",
    "summary": "Idag {day}/{day_max} · Körning {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} laddar fortfarande ner.",
    "steps": "Ladda ner · Konvertera · Tagga",
    "unlimited": "obegränsad",
    "l_run": "Denna körning",
    "l_day": "Idag",
    "l_rate": "Hastighetsgräns",
    "l_sleep": "Paus mellan nedladdningar",
    "sec_queue": "Kö",
    "sec_failed": "Misslyckade",
    "empty_title": "Kön är tom",
    "empty_text": "Markera mixar under ”Upptäck” eller i ”Inkorgen”.",
    "paused": "<b>Kön är pausad.</b> Den pågående nedladdningen står still tills du återupptar.",
    "backoff": "<b>Backoff aktiv till {t}</b> ({rest} kvar). Nedladdningar, sökning och bevakning är blockerade.",
    "backoff_rest": {
      "one": "<b>Backoff aktiv till {t}</b> ({rest} kvar). Nedladdningar, sökning och bevakning är blockerade – {n} ligger kvar i kön.",
      "other": "<b>Backoff aktiv till {t}</b> ({rest} kvar). Nedladdningar, sökning och bevakning är blockerade – {n} ligger kvar i kön."
    },
    "limit_day": "<b>Dagsgränsen är nådd ({n}/{max}).</b> Resten ligger kvar i kön och fortsätter i morgon.",
    "limit_day_rest": {
      "one": "<b>Dagsgränsen är nådd ({n}/{max}).</b> {rest} ligger kvar i kön och fortsätter i morgon.",
      "other": "<b>Dagsgränsen är nådd ({n}/{max}).</b> {rest} ligger kvar i kön och fortsätter i morgon."
    },
    "limit_run": "<b>Gränsen är nådd – {max}/{max} i den här körningen.</b> Resten ligger kvar i kön och fortsätter i nästa körning.",
    "limit_run_rest": {
      "one": "<b>Gränsen är nådd – {max}/{max} i den här körningen.</b> {rest} ligger kvar i kön och fortsätter i nästa körning.",
      "other": "<b>Gränsen är nådd – {max}/{max} i den här körningen.</b> {rest} ligger kvar i kön och fortsätter i nästa körning."
    },
    "limits_link": "Ändra gränser",
    "new_run": "Starta ny körning",
    "need_restart": "<b>Omstart krävs.</b> yt-dlp har uppdaterats – starta om HCLoader. Kön bevaras.",
    "busy": "En annan nedladdningskörning pågår (t.ex. den schemalagda kontrollen). Kön väntar tills den är klar.",
    "local_pot": {
      "one": "<b>PO-Token-servern är inte redo.</b> {rest} ligger kvar i kön och fortsätter så fort den körs.",
      "other": "<b>PO-Token-servern är inte redo.</b> {rest} ligger kvar i kön och fortsätter så fort den körs."
    },
    "local_target": {
      "one": "<b>Målmappen är inte nåbar eller inte skrivbar.</b> {rest} ligger kvar i kön och fortsätter så fort den är tillgänglig igen.",
      "other": "<b>Målmappen är inte nåbar eller inte skrivbar.</b> {rest} ligger kvar i kön och fortsätter så fort den är tillgänglig igen."
    },
    "local_error": {
      "one": "<b>Nedladdningsmodulen (yt-dlp) kunde inte laddas.</b> {rest} ligger kvar i kön. Nästa försök efter ”Återuppta”, nya poster eller när inställningarna sparas.",
      "other": "<b>Nedladdningsmodulen (yt-dlp) kunde inte laddas.</b> {rest} ligger kvar i kön. Nästa försök efter ”Återuppta”, nya poster eller när inställningarna sparas."
    },
    "local_link_pot": "Nätverksinställningar",
    "local_link_target": "Ändra lagringsplats",
    "local_link_error": "Underhåll"
  },
  "library": {
    "title": "Bibliotek",
    "sub": {
      "one": "{n} mix",
      "other": "{n} mixar"
    },
    "sub_shown": "{n} av {total} visas",
    "search": "Titel, kanal eller sökväg …",
    "all_genres": "Alla genrer",
    "all_channels": "Alla kanaler",
    "all_years": "Alla år",
    "f_genre": "Genre",
    "f_channel": "Kanal",
    "f_year": "År",
    "f_sort": "Sortera",
    "sort_newest": "Nyast först",
    "sort_title": "Titel A–Ö",
    "sort_channel": "Kanal A–Ö",
    "sort_duration": "Längst först",
    "group": "Efter genre",
    "group_title": "Gruppera poster efter genre",
    "view_list": "Lista",
    "view_grid": "Rutor",
    "clear": "Återställ filter",
    "col_title": "Titel",
    "col_channel": "Kanal",
    "col_genre": "Genre",
    "col_year": "År",
    "col_duration": "Längd",
    "col_size": "Storlek",
    "col_loaded": "Nedladdad",
    "play": "Spela",
    "pause": "Pausa",
    "play_external": "Öppna i standardspelaren",
    "play_internal": "Spela i appens spelare",
    "play_missing": "Filen saknas – kan inte spelas",
    "more": "Visa {n} till",
    "now_playing": "Spelas nu",
    "retag_short": "Tagga om",
    "genre_working": "Ställer in genre …",
    "open_folder": "Öppna mapp",
    "retag": "Tagga om (taggar, omslag och plats enligt aktuella inställningar)",
    "delete": "Ta bort fil",
    "remove": "Ta bort post",
    "retagging": "Taggar om …",
    "cue_title": "Spårlista som .cue-fil bredvid MP3-filen",
    "missing": "Filen saknas",
    "missing_title": "Filen hittades inte på den sparade platsen (flyttad eller raderad?)",
    "missing_chip": {
      "one": "{n} saknas",
      "other": "{n} saknas"
    },
    "missing_chip_title": "Visa bara poster vars fil saknas",
    "stat_count": "Mixar",
    "stat_duration": "Total längd",
    "stat_size": "Storlek",
    "stat_genres": "Efter genre",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} mix · {dur}",
      "other": "{n} mixar · {dur}"
    },
    "empty_title": "Inget nedladdat än",
    "empty_text": "Varje mix hamnar här så fort den är nedladdad och taggad – med omslag, genre och plats.",
    "empty_discover": "Upptäck mixar",
    "empty_watchlist": "Ställ in bevakning",
    "target_down": "Målmappen är inte nåbar: {path}",
    "target_down_hint": "Kontrollera enheten eller nätverksresursen. Så länge den saknas är filernas status okänd: ”Tagga om” och ”Ta bort post” är inaktiverade.",
    "unknown_title": "Målmappen är inte nåbar – filens status är okänd",
    "none_title": "Inga resultat",
    "none_text": "Ingen post matchar sökningen och filtren."
  },
  "player": {
    "label": "Minispelare",
    "play": "Spela (mellanslag)",
    "pause": "Pausa (mellanslag)",
    "back": "30 sekunder bakåt",
    "fwd": "30 sekunder framåt",
    "prev": "Föregående spår",
    "next": "Nästa spår",
    "seek": "Position",
    "mute": "Ljud av",
    "unmute": "Ljud på",
    "volume": "Volym",
    "close": "Stäng spelaren",
    "tracks": "Spårlista",
    "tracks_n": {
      "one": "{n} spår",
      "other": "{n} spår"
    },
    "tracks_toggle": "Visa/dölj spårlista",
    "no_tracks": "Inga kapitel i den här filen",
    "total": "Total längd {t}",
    "keys": "Mellanslag: spela/pausa · ←/→: 10 s",
    "err_load": "Kan inte spelas",
    "err_src": "Kan inte spelas: ogiltig filadress",
    "err_play": "Filen kan inte spelas: {title}",
    "external": "Öppnar i standardspelaren …"
  },
  "log": {
    "title": "Logg",
    "sub": "Direktlogg och körningshistorik",
    "live": "Direktlogg",
    "history": "Körningshistorik",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Varning",
    "lvl_error": "Fel",
    "lvl_title": "Visa/dölj nivån ”{lvl}”",
    "search": "Sök i loggen …",
    "following": "Live",
    "paused": "Pausad",
    "follow_title": "Rulla automatiskt till den nyaste raden (pausas när du rullar uppåt)",
    "jump": "Hoppa till slutet",
    "jump_new": {
      "one": "{n} ny rad",
      "other": "{n} nya rader"
    },
    "copy": "Kopiera",
    "copy_title": "Kopiera synliga rader till urklipp",
    "open_logs": "Loggmapp",
    "open_logs_title": "Öppna mappen med de fullständiga loggfilerna",
    "lines": {
      "one": "{n} rad",
      "other": "{n} rader"
    },
    "lines_of": "{n} av {total} rader",
    "empty": "Inga rader för de här nivåerna.",
    "empty_search": "Ingen rad innehåller ”{q}”.",
    "no_runs": "Inga körningar än.",
    "no_runs_kind": "Inga körningar av det här slaget.",
    "found": "hittade",
    "downloaded": "nedladdade",
    "errors": "fel",
    "running": "pågår …",
    "kind_all": "Alla",
    "timeline": "Tidslinje",
    "table": "Tabell",
    "view_title": "Visning av körningshistorik",
    "col_kind": "Typ",
    "col_start": "Start",
    "col_duration": "Längd",
    "col_found": "Hittade",
    "col_downloaded": "Nedladdade",
    "col_errors": "Fel",
    "col_note": "Anteckning",
    "backoff": "Backoff",
    "runs_sum": {
      "one": "{n} körning · {dl} nedladdade · {err} fel",
      "other": "{n} körningar · {dl} nedladdade · {err} fel"
    },
    "today": "Idag",
    "yesterday": "Igår"
  },
  "settings": {
    "title": "Inställningar",
    "sub": "Allt appen gör kan konfigureras här"
  },
  "tabs": {
    "general": "Allmänt",
    "filters": "Filter och nyckelord",
    "genres": "Genrer",
    "download": "Nedladdning och kvalitet",
    "storage": "Lagring och taggar",
    "throttle": "Strypning",
    "soundcloud": "SoundCloud",
    "network": "Nätverk och PO-Token",
    "schedule": "Schema",
    "appearance": "Utseende",
    "maintenance": "Underhåll"
  },
  "tabs_hint": {
    "general": "Appens grundläggande beteende.",
    "filters": "Standardfilter för sökning och bevakning. Kan åsidosättas tillfälligt i filterpanelen under ”Upptäck”.",
    "genres": "Ordning = prioritet. Den första genre vars nyckelord förekommer i titeln vinner. Manuellt angivna genrer och en källas standardgenre går före.",
    "download": "YouTube levererar oftast Opus med cirka 130–160 kbit/s. MP3 är en konvertering och låter inte bättre än källan – men fungerar överallt.",
    "storage": "Var filerna hamnar och hur de namnges. Strukturen är gjord för mediaservrar som Plex eller Jellyfin.",
    "throttle": "Begränsar belastningen på YouTube. Värdena gäller för sökning, bevakning och nedladdningar tillsammans. SoundCloud har egna värden på fliken ”SoundCloud”.",
    "soundcloud": "SoundCloud som andra källa för sökning, bevakning och nedladdningar – med egna gränser, räknare och backoff, oberoende av YouTube.",
    "network": "PO-Token identifierar förfrågningar som en riktig webbläsare och minskar risken för bot-blockeringar.",
    "schedule": "När bevakningen kontrolleras automatiskt – i appen och via Windows Aktivitetshanteraren.",
    "appearance": "Utseende och känsla. Ändringar förhandsvisas direkt och blir permanenta först när du sparar.",
    "maintenance": "Versioner, uppdateringar, databas."
  },
  "set": {
    "default": "Standard",
    "range": "Intervall",
    "browse": "Bläddra",
    "not_set": "inte angiven",
    "saving": "Sparar …",
    "discard": "Förkasta",
    "tab_reset": "Återställ flik",
    "tab_reset_title": "Sätt alla fält på den här fliken till standardvärden (gäller först efter ”Spara”)",
    "state_clean": "Allt sparat",
    "state_dirty": {
      "one": "{n} osparad ändring",
      "other": "{n} osparade ändringar"
    },
    "state_errors": {
      "one": "{n} fel – åtgärda",
      "other": "{n} fel – åtgärda"
    },
    "h": {
      "search": "Sökning",
      "duration": "Längd och period",
      "keywords": "Nyckelord",
      "display": "Visning",
      "cover": "Omslag",
      "chapters": "Kapitel och spårlista",
      "tags": "Taggar",
      "soundcloud": "SoundCloud",
      "playback": "Uppspelning",
      "pauses": "Pauser och bandbredd",
      "limits": "Gränser",
      "backoff": "Backoff vid blockering",
      "po": "PO-Token-leverantör",
      "fallback": "Lösningar",
      "in_app": "I appen",
      "task": "Windows Aktivitetshanteraren",
      "updates": "Uppdateringar",
      "app_update": "Appuppdatering",
      "database": "Databas",
      "reset": "Återställning"
    },
    "general": {
      "language": {
        "label": "Språk",
        "help": "Språk för gränssnittet och meddelanden. ”Automatiskt” följer Windows visningsspråk (annars engelska). Vyn byggs om direkt efter att du sparat."
      },
      "start_view": {
        "label": "Startvy",
        "help": "Vilken vy som öppnas vid start."
      },
      "log_level": {
        "label": "Loggnivå",
        "help": "Hur detaljerade loggfilen och direktloggen är. DEBUG bara vid felsökning."
      },
      "confirm_delete": {
        "label": "Bekräfta borttagning",
        "help": "Fråga innan en mix tas bort från biblioteket (post + fil)."
      }
    },
    "player": {
      "mode": {
        "label": "Spela med",
        "help": "Vad ▶ i biblioteket använder. Den inbyggda spelaren visar kapitel som hoppmarkörer och fortsätter spela när du byter vy. Det andra alternativet finns per post i menyn."
      }
    },
    "search": {
      "results_count": {
        "label": "Resultat per sökning",
        "help": "Antal resultat som en sökning hämtar (enkel förfrågan). Fler resultat = mer belastning på YouTube."
      },
      "append_year": {
        "label": "Lägg till år i sökningen",
        "help": "Med uppladdningsperioden ”Visst år” läggs året till i söktermen (t.ex. ”hardcore liveset 2013”). Då hittar YouTube fler mixar från det året."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Minsta längd",
        "help": "Kortare videor räknas aldrig som en mix."
      },
      "max_duration": {
        "label": "Största längd",
        "help": "0 = obegränsad."
      },
      "upload_period": {
        "label": "Uppladdningsperiod",
        "help": "Vilka uppladdningar som visas som standard. ”Visst år” visar bara mixar från ett år, ”Eget intervall” ett från–till-intervall."
      },
      "upload_year": {
        "label": "År",
        "help": "En mix räknas om uppladdningsåret stämmer eller året finns i titeln. YouTube-sökningen anger bara ett ungefärligt datum – där gäller ±1 år."
      },
      "upload_from": {
        "label": "Från",
        "help": "Tidigaste uppladdningsdatum. Tomt = öppet."
      },
      "upload_to": {
        "label": "Till",
        "help": "Senaste uppladdningsdatum. Tomt = öppet. För ungefärliga datum gäller ±1 års tolerans i båda ändar."
      },
      "include_keywords": {
        "label": "Inkludera nyckelord",
        "help": "Minst ett måste finnas i titeln. Tomt = tillåt allt. Enter eller komma lägger till."
      },
      "exclude_keywords": {
        "label": "Exkludera nyckelord",
        "help": "Om något av dem finns i titeln förkastas videon."
      },
      "match_description": {
        "label": "Sök i beskrivningen",
        "help": "Kontrollera även nyckelord i videons beskrivning. Enkla förfrågningar levererar den ofta inte."
      },
      "hide_done_ignored": {
        "label": "Dölj nedladdade och ignorerade",
        "help": "Dölj redan nedladdade och ignorerade videor i resultaten."
      },
      "apply_channel_blacklist": {
        "label": "Använd kanalsvartlistan",
        "help": "Visa aldrig videor från blockerade kanaler."
      },
      "hide_cross_platform_duplicates": {
        "label": "Dölj dubbletter mellan plattformar",
        "help": "Dölj träffar som troligen redan har laddats ner eller köats från den andra plattformen (YouTube eller SoundCloud) – samma längd (±5 s) och mycket lik titel. Av: de visas med notisen ”Troligen redan nedladdad”."
      }
    },
    "blacklist": {
      "label": "Blockerade kanaler",
      "help": "Du blockerar kanaler via ett korts meny. Här kan du häva blockeringen igen.",
      "none": "Inga kanaler blockerade",
      "unblock": "Avblockera"
    },
    "genres": {
      "add": "Genre",
      "up": "Högre prioritet",
      "down": "Lägre prioritet",
      "delete": "Ta bort genre",
      "color": "Välj färg",
      "name_ph": "Namn",
      "kw_ph": "+ nyckelord",
      "fallback": "Reserv – gäller när inget nyckelord matchar. Finns alltid, alltid sist."
    },
    "download": {
      "audio_format": {
        "label": "Utdataformat",
        "help": "MP3, eller behåll YouTubes original utan konvertering."
      },
      "mp3_quality": {
        "label": "MP3-kvalitet",
        "help": "320 kbit/s CBR är mest kompatibelt, V0 VBR sparar lite utrymme."
      },
      "embed_cover": {
        "label": "Bädda in omslag",
        "help": "Skriv in miniatyrbilden, beskuren kvadratisk, i filen som omslag."
      },
      "write_cover_jpg": {
        "label": "Spara även cover.jpg",
        "help": "För mediaservrar som läser mappomslag."
      },
      "write_cue": {
        "label": "Skriv .cue-fil",
        "help": "Spårlista från kapitel eller tidsstämplar i beskrivningen, bredvid ljudfilen."
      },
      "write_id3_chapters": {
        "label": "Skriv ID3-kapitel",
        "help": "Bädda in kapitelmarkörer (CHAP/CTOC) direkt i MP3-filen."
      },
      "keep_original_soundcloud": {
        "label": "Behåll SoundCloud-original",
        "help": "Spara SoundCloud-ljud oförändrat (AAC 160 kbit/s som .m4a, MP3 128 kbit/s som .mp3) – ingen andra förlustbehäftad konvertering. Av: som ”Utdataformat”."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Målmapp",
        "help": "Rot för musiklagringen. Tillfälliga filer sparas i ”.tmp” under den. I den portabla versionen tolkas en relativ sökväg som ”.\\Music” relativt appmappen (t.ex. på ett USB-minne)."
      },
      "path_template": {
        "label": "Sökvägsmönster",
        "help": "Relativt målmappen, utan filändelse. ”/” separerar mappar. {id} måste ingå (för SoundCloud ”sc-<id>”). {platform} blir ”YouTube” eller ”SoundCloud” – t.ex. som toppmapp för att hålla källorna åtskilda."
      },
      "max_title_length": {
        "label": "Max titellängd",
        "help": "Längre titlar förkortas i filnamnet."
      },
      "max_path_length": {
        "label": "Max sökvägslängd",
        "help": "Hela sökvägen inklusive målmappen. Utan extra konfiguration tillåter Windows 259 tecken."
      },
      "artist_from_title": {
        "label": "Läs artist från titeln",
        "help": "Känn igen mönstren ”ARTIST @ EVENT” och ”ARTIST - TITEL”, annars används kanalnamnet."
      },
      "title_cleanup_patterns": {
        "label": "Rensa titel",
        "help": "Reguljära uttryck vars träffar tas bort från titeln. Enter lägger till.",
        "ph": "+ regex"
      }
    },
    "path_preview": {
      "label": "Förhandsvisning",
      "help": "Klicka på platshållare för att infoga dem i sökvägsmönstret."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Paus mellan förfrågningar",
        "help": "Väntetid mellan metadatafrågor (sökning, bevakning)."
      },
      "sleep_interval": {
        "label": "Nedladdningspaus – minimum",
        "help": "Efter varje nedladdning följer en slumpmässig paus mellan minimum och maximum."
      },
      "max_sleep_interval": {
        "label": "Nedladdningspaus – maximum",
        "help": "Övre gräns för den slumpmässiga pausen."
      },
      "limit_rate_mb": {
        "label": "Nedladdningshastighet",
        "help": "Maximal bandbredd. 0 = obegränsad (rekommenderas inte)."
      },
      "max_downloads_per_run": {
        "label": "Max nedladdningar per körning",
        "help": "Resten ligger kvar i kön."
      },
      "max_downloads_per_day": {
        "label": "Max nedladdningar per dag",
        "help": "Räknaren omfattar manuella och automatiska nedladdningar tillsammans."
      },
      "max_searches_per_hour": {
        "label": "Max sökningar per timme",
        "help": "Skyddar mot oavsiktlig oavbruten sökning."
      },
      "backoff_initial_hours": {
        "label": "Backoff – startvärde",
        "help": "Spärrtid efter HTTP 429 eller ”bekräfta att du inte är en robot”."
      },
      "backoff_max_hours": {
        "label": "Backoff – maximum",
        "help": "Spärrtiden fördubblas vid varje ny blockering upp till detta värde."
      }
    },
    "backoff": {
      "none": "Ingen backoff aktiv ({p})",
      "none_detail": "Sökning, bevakning och nedladdningar från {p} är tillåtna.",
      "active": "Backoff aktiv ({p})",
      "active_detail": "till {t} · {rest} kvar · nivå {level}",
      "blocked": "{p} signalerade en blockering. Sökning, bevakning och nedladdningar från {p} är blockerade tills tiden har gått ut.",
      "clear": "Häv manuellt",
      "sc_off": "SoundCloud är avstängt",
      "sc_off_detail": "Ingen SoundCloud-sökning, inga kontroller av bevakning och inga nedladdningar från SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Använd SoundCloud",
        "help": "Av: ingen SoundCloud-sökning, inga kontroller av SoundCloud-källor och inga SoundCloud-nedladdningar. Redan nedladdade poster ligger kvar i biblioteket."
      },
      "sleep_requests": {
        "label": "Paus mellan förfrågningar",
        "help": "Väntetid mellan metadatafrågor till SoundCloud (sökning, bevakning)."
      },
      "sleep_interval": {
        "label": "Nedladdningspaus – minimum",
        "help": "Efter varje SoundCloud-nedladdning följer en slumpmässig paus mellan minimum och maximum."
      },
      "max_sleep_interval": {
        "label": "Nedladdningspaus – maximum",
        "help": "Övre gräns för den slumpmässiga pausen."
      },
      "limit_rate_mb": {
        "label": "Nedladdningshastighet",
        "help": "Maximal bandbredd. 0 = obegränsad (rekommenderas inte)."
      },
      "max_downloads_per_run": {
        "label": "Max nedladdningar per körning",
        "help": "Separat räknare för SoundCloud. Resten ligger kvar i kön."
      },
      "max_downloads_per_day": {
        "label": "Max nedladdningar per dag",
        "help": "Separat räknare för SoundCloud, manuella och automatiska nedladdningar tillsammans."
      },
      "max_searches_per_hour": {
        "label": "Max sökningar per timme",
        "help": "Separat räknare för SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Backoff – startvärde",
        "help": "Spärrtid efter att SoundCloud har meddelat för många förfrågningar (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – maximum",
        "help": "Spärrtiden fördubblas vid varje ny blockering upp till detta värde."
      }
    },
    "ladder": {
      "label": "Nivåer",
      "help": "Hur spärrtiden växer med de aktuella värdena.",
      "reset": "Återställs efter en lyckad körning",
      "invalid": "Ogiltiga värden"
    },
    "network": {
      "po_token_mode": {
        "label": "Läge",
        "help": "bgutil-plugin för yt-dlp. Skript startar Deno vid behov, HTTP håller en lokal server igång."
      },
      "po_token_port": {
        "label": "HTTP-port",
        "help": "Endast HTTP-läge. Servern lyssnar på 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Tokens giltighetstid",
        "help": "Efter denna tid skapas en ny token. Värdet avrundas till hela timmar (minst 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies från webbläsare",
        "help": "Loggar in yt-dlp med din webbläsares inloggning. Slå bara på om det inte längre fungerar utan."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Valfritt, t.ex. socks5://127.0.0.1:1080. Tomt = direktanslutning.",
        "ph": "ingen proxy"
      }
    },
    "po": {
      "active": "PO-Token aktiv",
      "inactive": "PO-Token inaktiv",
      "error": "PO-Token-fel",
      "mode": "Läge",
      "test": "Testa",
      "testing": "Testar …",
      "test_ok": "Testet lyckades.",
      "test_fail": "Testet misslyckades.",
      "unsaved": "Testet använder de sparade inställningarna. Spara dina ändringar först."
    },
    "cookies": {
      "warn_off": "<b>Rekommenderas: av.</b> PO-Token och webbläsarcookies i kombination kan ge problem.",
      "warn_on": "<b>Lösning aktiv.</b> PO-Token och webbläsarcookies i kombination kan leda till fel eller blockeringar, och ditt YouTube-konto används för förfrågningarna. Slå av det igen så fort det fungerar utan. Cookies hamnar aldrig i loggen."
    },
    "schedule": {
      "in_app_check": {
        "label": "Kontrollera medan appen körs",
        "help": "Bevakningen kontrolleras med det inställda intervallet medan fönstret är öppet."
      },
      "watchlist_interval_hours": {
        "label": "Intervall",
        "help": "Tid mellan två kontroller i appen."
      },
      "entries_per_source": {
        "label": "Poster per källa",
        "help": "Hur många av de nyaste posterna som hämtas (enkel förfrågan) per kontroll (standard för nya källor)."
      },
      "task_scheduler_enabled": {
        "label": "Använd Aktivitetshanteraren",
        "help": "Kontrollerar bevakningen även när appen är stängd (headless). Slås på av ”Skapa uppgift”."
      },
      "task_time": {
        "label": "Tid",
        "help": "Daglig starttid för den schemalagda uppgiften."
      }
    },
    "next": {
      "title": "Nästa kontroll",
      "off": "Ingen automatisk kontroll",
      "off_detail": "Varken kontrollen i appen eller Windows-uppgiften är aktiv. Bevakningen kontrolleras bara manuellt.",
      "app_detail": "I appen, var {h} h – medan HCLoader körs.",
      "task_detail": "Via Windows Aktivitetshanteraren, dagligen kl. {time} – även när appen är stängd.",
      "any_detail": "Den tidigare av appintervallet och Windows-uppgiften.",
      "also_task": "Dessutom: Windows-uppgift dagligen kl. {time}.",
      "also_app": "Dessutom i appen var {h} h.",
      "pending": "Inte schemalagd än",
      "pending_detail": "Appen sätter nästa datum så fort den har kontrollerat bevakningen för första gången.",
      "due": "Aktuell – startar snart",
      "backoff": "<b>Backoff aktiv.</b> Inga kontroller före {t}; datumet tas igen eller hoppas över efteråt.",
      "unsaved": "Osparade schemaändringar gäller först efter att du sparat."
    },
    "task": {
      "loading": "Frågar efter uppgift …",
      "registered": "Uppgift registrerad",
      "registered_detail": "{name} · dagligen {time} · nästa körning {next}",
      "none": "Ingen uppgift registrerad",
      "none_detail": "Skapar en daglig Windows-uppgift kl. {time} (schtasks).",
      "create": "Skapa uppgift",
      "remove": "Ta bort uppgift",
      "moved": "Appen har flyttats – skapa uppgiften igen",
      "moved_detail": "Den schemalagda uppgiften startar fortfarande {cmd}. Om du skapar den igen används den aktuella appmappen.",
      "recreate": "Skapa uppgift igen",
      "unknown": "Uppgiftens status är okänd",
      "unknown_detail": "Windows Aktivitetshanteraren svarade inte. Inställningen förblir oförändrad.",
      "recheck": "Kontrollera igen"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Minska effekter",
        "help": "Stänger av skanlinjer, glitch och alla animationer."
      },
      "scanlines": {
        "label": "Skanlinjer och brus",
        "help": "Fin överlagring över hela gränssnittet."
      },
      "pulse_bpm": {
        "label": "Kickpuls",
        "help": "Takten som förloppsindikatorn pulserar i."
      }
    },
    "pulse_preview": {
      "label": "Förhandsvisning",
      "help": "Så här pulserar en pågående nedladdning.",
      "off": "Effekter minskade"
    },
    "versions": {
      "plugin": "PO-Token-plugin",
      "was": "tidigare {v}"
    },
    "update": {
      "label": "yt-dlp och plugin",
      "help": "YouTube ändras hela tiden. Uppdatera först om fel uppstår (pip i venv).",
      "button": "Uppdatera yt-dlp och plugin",
      "running": "Uppdaterar …",
      "last_check": "Senaste kontroll",
      "restart": "<b>Omstart krävs.</b> yt-dlp har uppdaterats. Sökning och nedladdningar är blockerade tills HCLoader har startats om; kön bevaras.",
      "restart_title": "Omstart krävs",
      "restart_text": "yt-dlp har uppdaterats. Stäng och starta om HCLoader – tills dess är sökning och nedladdningar blockerade, kön bevaras.",
      "out_live": "Utdata · pågår i {t}",
      "out_done": "Utdata · klar efter {t}",
      "out_failed": "Utdata · misslyckades",
      "out_last": "Utdata",
      "waiting": "Startar pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Sök efter uppdateringar vid start",
        "help": "yt-dlp och PO-Token-plugin, högst en gång per dag."
      },
      "check_app_updates_on_start": {
        "label": "Sök efter HCLoader-uppdateringar vid start",
        "help": "Frågar GitHub en gång per start efter en ny version. Inget laddas ner förrän du klickar."
      },
      "apply_update_on_exit": {
        "label": "Installera uppdatering vid avslut",
        "help": "En nedladdad uppdatering installeras när HCLoader stängs (”Senare”). Av: den erbjuds igen vid nästa start."
      },
      "update_repo": {
        "label": "Uppdateringskälla (GitHub)",
        "help": "Repo i formatet ”ägare/repo”. Ändra bara för forkar."
      }
    },
    "db": {
      "label": "Databas",
      "help": "Status för alla videor, källor och körningar. En säkerhetskopia kopierar filen till mappen ”backups”.",
      "backup": "Skapa DB-säkerhetskopia",
      "backing_up": "Säkerhetskopierar …",
      "open": "Datamapp",
      "open_logs": "Loggmapp",
      "open_title": "Öppna mappen med databas, konfiguration och säkerhetskopior",
      "open_logs_title": "Öppna mappen med loggfilerna",
      "info": {
        "one": "{n} post · {mb} MB",
        "other": "{n} poster · {mb} MB"
      },
      "last": "Senaste säkerhetskopia",
      "never": "ingen än",
      "keep": "De 10 nyaste säkerhetskopiorna sparas, äldre raderas vid nästa säkerhetskopia.",
      "backups": "Säkerhetskopior",
      "backups_more": "+ {n} äldre i mappen ”backups”",
      "fresh": "ny"
    },
    "reset_all": {
      "label": "Alla inställningar",
      "help": "Återställer alla flikar till standardvärden. Databas och musikfiler berörs inte.",
      "button": "Återställ allt"
    }
  },
  "opt": {
    "general": {
      "log_level": {
        "DEBUG": "DEBUG",
        "INFO": "INFO",
        "WARNING": "WARNING",
        "ERROR": "ERROR"
      },
      "language": {
        "auto": "Automatiskt (systemspråk)"
      }
    },
    "player": {
      "mode": {
        "internal": "Inbyggd spelare (rekommenderas)",
        "external": "Windows standardspelare"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Original (Opus/M4A, ingen konvertering)"
      },
      "mp3_quality": {
        "320": "320 kbit/s CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Av",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Blockera kanal",
      "text": "Videor från ”{ch}” visas inte längre. Ångra under Inställningar › Filter och nyckelord.",
      "ok": "Blockera"
    },
    "ignore_all": {
      "title": "Ignorera träffar",
      "text": {
        "one": "Markera {n} träff i inkorgen som ignorerad? Den laddas inte ner och visas inte längre i inkorgen.",
        "other": "Markera {n} träffar i inkorgen som ignorerade? De laddas inte ner och visas inte längre i inkorgen."
      },
      "ok": "Ignorera"
    },
    "del_source": {
      "title": "Ta bort källa",
      "text": "Ta bort ”{name}” från bevakningen? Redan nedladdade mixar behålls."
    },
    "del_mix": {
      "title": "Ta bort mix",
      "text": "”{title}” tas bort från biblioteket och filen raderas från disken:",
      "ok": "Ta bort fil",
      "warn": "<b>Det här kan inte ångras.</b> Ljudfilen och en tillhörande .cue-fil raderas. Mixen markeras som ”ignorerad” och <b>laddas inte ner igen</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Ta bara bort posten",
      "text": "Filen för ”{title}” ligger utanför den aktuella målmappen och raderas därför inte:",
      "ok": "Ta bara bort posten",
      "warn": "Filen lämnas orörd där den ligger. Posten försvinner från biblioteket, mixen markeras som ”ignorerad” och <b>laddas inte ner igen</b>."
    },
    "remove_mix": {
      "title": "Ta bort post",
      "text": "Filen för ”{title}” hittades inte på den sparade platsen:",
      "ok": "Ta bort post",
      "warn": "Posten försvinner från biblioteket. Mixen markeras som ”ignorerad” och <b>laddas inte ner igen</b>. Om filen ligger någon annanstans lämnas den orörd."
    },
    "backoff": {
      "title": "Häv backoff",
      "ok": "Häv ändå",
      "text": "Spärrtiden skyddar dig: {p} signalerade att för många förfrågningar kom in.",
      "warn": "<b>Häv den bara om du är säker på att blockeringen är över.</b> Om appen går åt den för tidigt igen kan {p} begränsa din IP-adress längre eller permanent."
    },
    "reset_all": {
      "title": "Återställ allt",
      "text": "Alla inställningar på alla flikar sätts direkt till standardvärden och sparas.",
      "ok": "Återställ"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mix lades till i kön",
      "other": "{n} mixar lades till i kön"
    },
    "enqueued_none": "Inget lades till – redan i kö eller nedladdat",
    "enqueued_skipped": "{n} hoppades över",
    "queue_cancelled": "Avbruten: {title}",
    "queue_removed": "Borttagen: {title}",
    "queue_retry": "I kö igen: {title}",
    "queue_paused": "Kön pausad",
    "queue_resumed": "Kön återupptagen",
    "new_run": "Ny körning startad",
    "ignored": "Ignorerad: {title}",
    "unignored": "Syns igen: {title}",
    "ignored_n": {
      "one": "{n} träff ignorerad",
      "other": "{n} träffar ignorerade"
    },
    "opening": "Öppnar {p} i webbläsaren …",
    "watch_added": "Tillagd i bevakningen: {ch}",
    "blocked": "Kanal blockerad: {ch}",
    "genre_set": "Genre inställd: {genre}",
    "done": "Nedladdad: {title}",
    "failed": "Misslyckades: {title} – {error}",
    "wl_started": {
      "one": "Kontrollerar bevakningen ({n} källa, strypt) …",
      "other": "Kontrollerar bevakningen ({n} källor, strypt) …"
    },
    "wl_started_one": "Kontrollerar ”{name}” …",
    "wl_none": "Ingen aktiv källa – inget att kontrollera",
    "wl_done": {
      "one": "Källa kontrollerad: inget nytt",
      "other": "Bevakning kontrollerad: {n} källor, inget nytt"
    },
    "wl_done_found": {
      "one": "Bevakning kontrollerad: {n} ny träff",
      "other": "Bevakning kontrollerad: {n} nya träffar"
    },
    "wl_errors": {
      "one": "{n} källa med fel",
      "other": "{n} källor med fel"
    },
    "source_added": "Källa tillagd: {name}",
    "source_saved": "Källa sparad: {name}",
    "source_deleted": "Källa borttagen: {name}",
    "retagged": "Taggad om: {title}",
    "retagged_moved": "Taggad om och flyttad: {title} → {path}",
    "deleted": "Borttagen: {title}",
    "removed": "Post borttagen: {title}",
    "folder_opening": "Öppnar mapp …",
    "copied": {
      "one": "{n} rad kopierad",
      "other": "{n} rader kopierade"
    },
    "copy_failed": "Kopiering inte möjlig",
    "copy_none": "Inga synliga rader",
    "settings_saved": "Inställningar sparade",
    "settings_errors": {
      "one": "{n} inmatning är ogiltig",
      "other": "{n} inmatningar är ogiltiga"
    },
    "backoff_cleared": "Backoff ({p}) hävd manuellt",
    "genre_moved": "Genre: {genre} – flyttad till {path}",
    "genre_retagged": "Genre: {genre} – taggar uppdaterade",
    "genre_entry_only": "Genre: {genre} – bara posten ändrades, filen är inte nåbar",
    "genre_failed": "Genren kunde inte ställas in: {error}",
    "task_created": "Uppgift skapad i Windows Aktivitetshanteraren",
    "task_removed": "Uppgift borttagen",
    "updated": "Uppdaterad till yt-dlp {v}",
    "up_to_date": "Redan aktuell (yt-dlp {v})",
    "update_failed": "Uppdateringen misslyckades",
    "restart_required": "Uppdaterad – starta om HCLoader så att sökning och nedladdningar fungerar igen",
    "backup_done": "Säkerhetskopia skapad: {path}",
    "reset_all": "Alla inställningar återställda"
  },
  "upd": {
    "available": "Version {v} finns",
    "available_sub": "Installerad: {cur}",
    "download": "Ladda ner",
    "notes": "Ändringar",
    "later": "Senare",
    "close": "Stäng",
    "cancel": "Avbryt",
    "retry": "Försök igen",
    "downloading": "Laddar ner uppdatering {v}",
    "phase_download": "Nedladdning",
    "phase_verify": "Verifiering",
    "phase_prepare": "Förberedelse",
    "ready": "Uppdatering {v} är redo",
    "ready_sub": "För att installera den stängs HCLoader kort och startas om.",
    "restart_now": "Starta om nu",
    "on_exit": "Vid avslut",
    "applying": "Installerar uppdatering …",
    "applying_sub": "HCLoader stängs och startas om om en stund.",
    "error": "Appuppdateringen misslyckades",
    "blocked": "Automatisk uppdatering inte möjlig",
    "notes_title": "Ändringar i version {v}",
    "notes_empty": "Inga versionsanteckningar tillgängliga.",
    "notes_link": "Release på GitHub",
    "notes_all": "Visa alla ändringar",
    "notes_less": "Visa bara höjdpunkter",
    "confirm_title": "Starta om nu?",
    "confirm_ok": "Starta om",
    "confirm_text": "HCLoader stängs, uppdateringen installeras och appen startas om. En pågående nedladdning avbryts och ligger kvar i kön. Musik, inställningar och databas förblir oförändrade.",
    "on_exit_toast": "Uppdateringen installeras när HCLoader avslutas.",
    "later_toast": "Uppdateringen ligger kvar och erbjuds igen vid nästa start.",
    "section_label": "HCLoader-version",
    "section_help": "Nya versioner kommer från GitHub. Data, inställningar och musik berörs inte av uppdateringar; en säkerhetskopia skapas automatiskt före en databasmigrering.",
    "current": "Installerad",
    "latest": "Senaste",
    "checked": "Senaste kontroll",
    "check_now": "Kontrollera nu",
    "checking": "Kontrollerar …",
    "st_idle": "Aktuell",
    "st_available": "Ny version finns",
    "st_checking": "Kontrollerar …",
    "st_downloading": "Laddar ner …",
    "st_ready": "Redo att installeras",
    "st_applying": "Installerar …",
    "st_error": "Fel",
    "st_unknown": "Inte kontrollerad än",
    "up_to_date": "HCLoader är aktuell (v{v})",
    "portable": "Portabel version",
    "installed": "Installerad (setup)",
    "git": "Git-checkout",
    "from_repo": "från {repo} (inte den officiella källan)",
    "unverified": "utan kontrollsumma (bara ZIP-integriteten verifierad)"
  },
  "err": {
    "generic": "Okänt fel",
    "bridge": "Fel i ”{name}”: {msg}",
    "boot": "Starten misslyckades: {msg}",
    "no_backend": "Ingen anslutning till backend"
  },
  "fatal": {
    "title": "Anslutningen till backend misslyckades",
    "text": "Gränssnittet fick inget svar från Python-delen av HCLoader. Inget som inte är verkligt visas eller sparas.",
    "waiting": "Väntar fortfarande på backend …",
    "reload": "Ladda om"
  }
});
