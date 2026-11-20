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
    "settings": "Inställningar",
    "stats": "Statistik"
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
    "empty_list": "”ingen”",
    "undo": "Ångra"
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
    "clock": "24 h",
    "req_h": "förfr./h",
    "lufs": "LUFS",
    "db": "dB",
    "pct": "%"
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
    "sc_off": "SoundCloud är avstängt – slå på det under Inställningar › SoundCloud.",
    "mixcloud": "Mixcloud",
    "hearthis": "hearthis.at",
    "p_off": "{p} är avstängt – slå på under Inställningar › Fler källor.",
    "all": "Alla"
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
    "backoff_tip": "{p}: backoff till {t} ({rest} kvar)",
    "p_tip": "{p} · nedladdat idag {day}/{day_max} · {s}/{s_max} sökningar denna timme",
    "system": "System",
    "system_title": "Systemstatus"
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
    "select": "Bara prenumeranter (Select)",
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
    "preview_title": "SoundCloud ger bara en förhandslyssning på 30 sekunder (Go+) för det här spåret. Det kan inte laddas ner.",
    "select_title": "Den här Mixcloud-uppladdningen är bara tillgänglig för skaparens prenumeranter (Mixcloud Select). Den kan inte laddas ned."
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
    "none_year": "Inget resultat från {year}. Sök igen så att året ingår i söktermen – eller ändra året.",
    "quota_p": "{p}-sökningar denna timme: {n} / {max}",
    "placeholder_p": "Sök på {p}: mix, set, DJ, podcast …",
    "searching_p": "Söker – enkel förfrågan, skonsam mot {p} …",
    "ready_text_p": "Skriv en sökterm och tryck på Enter för att söka på {p}.",
    "previews_mc": "{n} bara för prenumeranter (Select)",
    "previews_mc_title": "Mixcloud Select-uppladdningar är bara för betalande prenumeranter och kan aldrig laddas ned. Syns när ”Dölj nedladdade och ignorerade” är av.",
    "placeholder_all": "Sök på alla plattformar: mix, liveset, DJ, event …",
    "searching_all": "Söker på {p} ({i} av {n}) – en plattform i taget …",
    "ready_text_all": "Skriv ett sökord och tryck Enter – alla aktiverade plattformar genomsöks en i taget.",
    "quota_all": "Sökningar den här timmen: {list}",
    "platform_current": "Plattform: {p}",
    "platform_all_title": "Söker på alla aktiverade plattformar, en i taget. Varje plattform behåller sina egna pauser och sin egen gräns för ”sökningar per timme”.",
    "platform_backoff": "{p}: backoff till {t} – hoppas över av ”Alla”",
    "platform_backoff_short": "backoff",
    "skipped": "Överhoppade: {list}",
    "skipped_title": "De här plattformarna genomsöktes inte den här gången.",
    "skip_backoff": "backoff till {t}",
    "skip_error": "inget svar",
    "all_none": "Ingen plattform kunde genomsökas.",
    "kw_clear": "Ta bort alla",
    "kw_cleared_inc": "Obligatoriska nyckelord borttagna",
    "kw_cleared_exc": "Uteslutna nyckelord borttagna",
    "kw_sugg_title": "Lägg till igen (från de sparade inställningarna)",
    "kw_sugg_label": "Förslag från de sparade inställningarna",
    "kw_session_hint": "Gäller bara den här sessionen – inget sparas här. Startvärden: Inställningar › Filter och nyckelord.",
    "kw_group": "Nyckelord",
    "kw_count": "{inc} inkl. · {exc} exkl."
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
    "hint_channel": "YouTube-kanal (…/@namn eller …/channel/UC…, valfritt /videos eller /streams), SoundCloud-profil (soundcloud.com/namn), Mixcloud-användare (mixcloud.com/namn) eller hearthis.at-användare (hearthis.at/namn).",
    "hint_playlist": "YouTube-spellista med ”list=…”, SoundCloud-set (soundcloud.com/namn/sets/set), Mixcloud-spellista (mixcloud.com/namn/playlists/lista) eller hearthis.at-set (hearthis.at/namn/set/set). De senaste posterna kontrolleras.",
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
    "form_error": "Källan kunde inte sparas.",
    "backoff_link_p": "Öppna {p}",
    "why_p_off": "{p} är avstängt"
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
    "local_link_error": "Underhåll",
    "summary_p": "{p} {day}/{day_max}"
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
    "none_text": "Ingen post matchar sökningen och filtren.",
    "group_by": "Gruppera efter",
    "group_none": "Ingen",
    "group_genre": "Genre",
    "group_festival": "Festival",
    "group_artist": "Artist",
    "group_year": "År",
    "group_unknown": "Okänt",
    "continue": "Fortsätt lyssna",
    "continue_title": "Fortsätt ”{title}” vid {t}",
    "continue_left": "{t} kvar",
    "continue_forget": "Ta bort från ”Fortsätt lyssna”",
    "export": "M3U",
    "export_title": "Exportera det som visas som M3U8-spellista",
    "export_continue": "Exportera ”Fortsätt lyssna” som spellista",
    "sections": "Bibliotekets delar"
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
    "external": "Öppnar i standardspelaren …",
    "norm_title": "Ljudstyrka utjämnad: {lufs} LUFS → mål {target} LUFS ({gain})",
    "norm_capped": "endast sänkt – förstärkning kräver ljudmotorn",
    "norm_fallback": "Normalisering: ljudmotorn är tyst här – spelar utan den (endast sänka, ingen förstärkning)",
    "resume_q": "Fortsätta där du slutade?",
    "resume_at": "vid {t}",
    "resume": "Fortsätt",
    "restart": "Från början",
    "resumed_at": "Fortsatte vid {t}",
    "sleep": "Insomningstimer",
    "sleep_min": "{n} min",
    "sleep_end": "Slutet av det här setet",
    "sleep_end_short": "slut",
    "sleep_off": "Stäng av",
    "sleep_on": "Timer: stoppar om {t}",
    "sleep_end_on": "Timer: stoppar i slutet av det här setet",
    "sleep_done": "Timer: uppspelningen stoppad",
    "queue_pos": "{i}/{n}",
    "queue_title": "Spela alla · {label}: set {i} av {n}"
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
    "maintenance": "Underhåll",
    "festivals": "Festivaler & serier",
    "playback": "Uppspelning",
    "notifications": "Aviseringar",
    "mediaserver": "Mediaserver",
    "sources": "Fler källor",
    "reupload": "Omuppladdningar"
  },
  "tab_groups": {
    "app": "App",
    "find": "Hitta och sortera",
    "download": "Nedladdning",
    "sources": "Källor och servrar",
    "system": "System"
  },
  "tabs_hint": {
    "general": "Appens grundläggande beteende.",
    "filters": "Standardfilter för sökning och bevakning. Kan åsidosättas tillfälligt i filterpanelen under ”Upptäck”.",
    "genres": "Ordning = prioritet. Den första genre vars nyckelord förekommer i titeln vinner. Manuellt angivna genrer och en källas standardgenre går före.",
    "download": "YouTube levererar oftast Opus med cirka 130–160 kbit/s. MP3 är en konvertering och låter inte bättre än källan – men fungerar överallt.",
    "storage": "Var filerna hamnar och hur de namnges. Strukturen är gjord för mediaservrar som Plex eller Jellyfin.",
    "throttle": "Begränsar belastningen på YouTube. Värdena gäller för sökning, bevakning och nedladdningar tillsammans. SoundCloud har egna värden på fliken ”SoundCloud”. Mixcloud och hearthis.at har egna värden under ”Fler källor”.",
    "soundcloud": "SoundCloud som andra källa för sökning, bevakning och nedladdningar – med egna gränser, räknare och backoff, oberoende av YouTube.",
    "network": "PO-Token identifierar förfrågningar som en riktig webbläsare och minskar risken för bot-blockeringar.",
    "schedule": "När bevakningen kontrolleras automatiskt – i appen och via Windows Aktivitetshanteraren.",
    "appearance": "Utseende och känsla. Ändringar förhandsvisas direkt och blir permanenta först när du sparar.",
    "maintenance": "Versioner, uppdateringar, databas.",
    "festivals": "Känner igen festival eller serie, år, scen och settyp ur de sparade titlarna – offline, utan en enda extra förfrågan.",
    "playback": "Inbyggd spelare, ljudnormalisering, sparade positioner och offlineanalysen av dina filer.",
    "notifications": "Windows-aviseringar för nya set i inkorgen och klara eller misslyckade nedladdningar – samlade i ett meddelande, aldrig en flod. Ett klick öppnar appen på rätt ställe.",
    "mediaserver": "Låt din Plex- eller Jellyfin-server skanna om biblioteket efter nedladdningar – samlat, bara i hemnätverket. Token sparas i Windows Autentiseringshanteraren, aldrig i config.yaml.",
    "sources": "Mixcloud och hearthis.at som extra källor för sökning, bevakningslista och nedladdningar – var och en med egna gränser, räknare och backoff, oberoende av YouTube och SoundCloud.",
    "reupload": "Känner igen samma mix som laddats upp igen (annan kanal, annan plattform, nytt id) med ett kompakt ljudfingeravtryck – beräknat offline från dina filer, utan nätverk."
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
      "collector": "Festivalsamlare",
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
      "release_notes": "Versionsinformation",
      "database": "Databas",
      "reset": "Återställning",
      "detection": "Igenkänning",
      "series": "Serier",
      "backfill": "Läs in allt (en gång)",
      "loudness": "Ljudstyrka",
      "memory": "Minne & vågform",
      "analysis": "Analys (offline, ffmpeg)",
      "playlists": "Spellistor (M3U8)",
      "notify_events": "Avisera vid",
      "quiet": "Tysta timmar",
      "ms_paths": "Sökvägar & tidpunkt",
      "more_sources": "Mixcloud & hearthis.at",
      "fingerprint": "Fingeravtryck"
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
      },
      "normalize": {
        "label": "Utjämna ljudstyrka",
        "help": "Spelar varje set med samma upplevda ljudstyrka (ReplayGain från offlineanalysen eller befintliga taggar). Klipper aldrig: förstärkningen begränsas av den uppmätta true peak."
      },
      "target_lufs": {
        "label": "Målljudstyrka",
        "help": "−18 LUFS är referensen för ReplayGain 2.0. Högre (t.ex. −14) = starkare, men fler set når sin toppgräns."
      },
      "resume": {
        "label": "Kom ihåg position",
        "help": "Per set, utanför de första och sista 30 sekunderna. ”Fråga” erbjuder att fortsätta, ”Automatiskt” fortsätter tyst. Biblioteket visar de fem senaste ofärdiga seten."
      },
      "waveform": {
        "label": "Vågform som tidslinje",
        "help": "Visar setet som vågform med tracklistans markeringar. Beräknas en gång per fil med ffmpeg (vid första uppspelningen eller i analysen); annars den enkla stapeln."
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
      },
      "keep_original_mixcloud": {
        "label": "Behåll Mixcloud-original",
        "help": "Spara Mixcloud-ljud oförändrat (AAC, oftast 64–128 kbps, som .m4a) – ingen andra förstörande konvertering. Av: som ”Utdataformat”."
      },
      "keep_original_hearthis": {
        "label": "Behåll hearthis.at-original",
        "help": "Spara hearthis.at-strömmen oförändrad (MP3) – ingen andra förstörande konvertering. Av: som ”Utdataformat”."
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
      },
      "album_from_edition": {
        "label": "Album = upplaga",
        "help": "Skriver upplagan (t.ex. ”Defqon.1 2024”) som albumtagg, så att Plex och Jellyfin visar alla set från en festival som ett album. Av: album = titel, som tidigare."
      }
    },
    "path_preview": {
      "label": "Förhandsvisning",
      "help": "Klicka på platshållare för att infoga dem i sökvägsmönstret.",
      "fest": "{festival}, {event_year} och {stage} fylls bara i när en festival är tilldelad. Annars faller de bort, tillsammans med överblivna skiljetecken och tomma mappar."
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
      "sc_off_detail": "Ingen SoundCloud-sökning, inga kontroller av bevakning och inga nedladdningar från SoundCloud.",
      "p_off": "{p} är avstängt",
      "p_off_detail": "Ingen {p}-sökning, inga kontroller av bevakning och inga nedladdningar från {p}."
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
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Sökningar per timme",
        "help": "”Sök saknade set” fördelar sökningarna jämnt (10 = en var 6:e min). Dessutom gäller den globala gränsen för sökningar per timme."
      },
      "collector_results_per_search": {
        "label": "Resultat per sökning",
        "help": "Hur många resultat en sökning efter ett saknat set tittar på (en förfrågan per sökning)."
      },
      "collector_auto_confirm": {
        "label": "Bekräfta automatiskt från",
        "help": "Från den här säkerheten räknas en träff utan din bekräftelse – bara med DJ, festival och år i titeln. Allt därunder väntar på ett klick."
      },
      "detect": {
        "label": "Känn igen automatiskt",
        "help": "Tilldelar festival eller serie, år, scen och settyp till nya träffar och nedladdningar. Manuellt satta värden skrivs aldrig över."
      },
      "min_confidence": {
        "label": "Tröskel för igenkänning",
        "help": "Säkerhet från vilken en träff tilldelas. Under den visas den bara som ett förslag som du kan godta."
      },
      "year_from_upload_date": {
        "label": "År från uppladdningsdatum",
        "help": "Om titeln saknar årtal gäller uppladdningsåret (räknas som mindre säkert)."
      },
      "match_description": {
        "label": "Sök även i beskrivningen",
        "help": "Letar efter festivalnamn även i den sparade beskrivningen."
      },
      "extra_stages": {
        "label": "Extra scener",
        "help": "Scennamn utöver de inbyggda (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ scen"
      }
    },
    "fest_types": {
      "label": "Egna termer för settyper",
      "help": "Ord i titeln som tyder på en settyp. De kontrolleras före de inbyggda termerna.",
      "ph": "Term i titeln",
      "add": "Term"
    },
    "fest_test": {
      "label": "Testa en titel",
      "help": "Visar vad igenkänningen hittar i en titel. Inget sparas; de sparade inställningarna gäller.",
      "ph": "t.ex. Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Inget hittades",
      "assigned": "skulle tilldelas",
      "suggested": "endast förslag"
    },
    "fest_status": {
      "title": "{assigned} av {total} mixar tilldelade",
      "last": "Senaste körning",
      "help": "Körs offline över det befintliga biblioteket. Manuella värden står kvar; filer taggas inte om och flyttas inte.",
      "button": "Tilldela festivaler nu",
      "running": "Tilldelar … {done} / {total}"
    },
    "series": {
      "hint": "Kända festivaler, radioprogram och podcaster. Ändringar i listan sparas direkt.",
      "add": "Serie",
      "show_hidden": "Visa dolda",
      "reset_all": "Återställ inbyggda serier",
      "builtin": "inbyggd",
      "own": "egen",
      "modified": "ändrad",
      "hidden": "dold",
      "no_aliases": "inga alias",
      "enable": "Känn igen den här serien",
      "hide": "Dölj",
      "restore": "Återställ",
      "new_title": "Ny serie",
      "edit_title": "Redigera serie",
      "name": "Namn",
      "kind": "Typ",
      "default_genre": "Standardgenre",
      "aliases": "Alias",
      "aliases_help": "Andra stavningar. En träff i titeln räcker.",
      "weak_aliases": "Svaga alias",
      "weak_help": "Vardagsord som bara räknas tillsammans med ett årtal.",
      "variants": "Varianter",
      "variants_help": "Egna upplagor, t.ex. Australia eller at Home.",
      "channels": "Arrangörens kanaler",
      "channels_help": "Kanalnamn, ID eller URL. Höjer bara säkerheten."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Max. poster per källa",
        "help": "”Läs in allt (en gång)” i bevakningslistan läser högst så många poster från en kanal eller spellista."
      },
      "backfill_requests_per_hour": {
        "label": "Förfrågningar per timme",
        "help": "Sidförfrågningar från ”Läs in allt” fördelas jämnt (120 = en var 30:e s); det vanliga avståndet och backoffen gäller också. En schemalagd körning (Schemaläggaren) fortsätter med högst så många förfrågningar."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Analysera efter varje nedladdning",
        "help": "Mäter ljudstyrkan (EBU R128) och beräknar vågformen direkt efter en nedladdning – offline, med låg prioritet, en fil i taget."
      },
      "write_tags": {
        "label": "Skriv ReplayGain-taggar",
        "help": "Skriver REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) eller R128_TRACK_GAIN (Opus) i filen så att andra spelare också kan använda det. Ljudet kodas aldrig om."
      },
      "waveforms": {
        "label": "Förberäkna vågformer",
        "help": "Beräknar vågformer även under analysen. Av: först när ett set spelas för första gången."
      }
    },
    "analysis": {
      "title": "{done} av {total} filer analyserade",
      "counts": "{tagged} taggade · {waves} vågformer · {failed} misslyckade",
      "help": "Körs offline över biblioteket, en fil i taget med låg prioritet – inget nätverk, ljudet lämnas orört. Kan avbrytas när som helst.",
      "button": "Analysera nya filer",
      "button_n": "Analysera {n} nya",
      "all": "Analysera allt igen",
      "all_title": "Mät varje fil igen (t.ex. efter att filer ersatts utanför appen)",
      "running": "Analyserar … {done} / {total}",
      "no_ffmpeg_title": "ffmpeg saknas",
      "no_ffmpeg": "Ljudstyrka och vågformer kräver ffmpeg (bin\\ffmpeg.exe, installeras av setup.ps1). Inställningar › Underhåll visar status."
    },
    "playlists": {
      "folder": {
        "label": "Mapp för spellistor",
        "help": "Här sparas exporterade spellistor. Tomt = ”Playlists” i målmappen.",
        "ph": "”Playlists” i målmappen"
      },
      "relative_paths": {
        "label": "Relativa sökvägar",
        "help": "Poster relativt spellistan så att den fungerar även när musikmappen flyttas (t.ex. till ett USB-minne). Filer på en annan enhet får alltid full sökväg."
      },
      "sync_after_download": {
        "label": "Uppdatera sparade spellistor efter nedladdningar",
        "help": "Spellistor som exporterats med ”Håll uppdaterad” skrivs om efter varje nedladdning – bara lokalt, inget nätverk."
      }
    },
    "playlists_saved": {
      "label": "Sparade spellistor",
      "help": "Varje export sparas här. ”Håll uppdaterad” skriver om den efter nedladdningar.",
      "none": "Inga spellistor exporterade än – använd ”M3U” i biblioteket, på en DJ-sida eller i en checklista.",
      "gone": "filen saknas",
      "sync": "Håll uppdaterad",
      "sync_title": "Skriv om den här spellistan efter nedladdningar",
      "forget": "Ta bort från listan (filen finns kvar)",
      "now": "Uppdatera nu"
    },
    "notifications": {
      "enabled": {
        "label": "Windows-aviseringar",
        "help": "Visa en avisering i Windows meddelandecenter – även efter en schemalagd kontroll när appen är stängd."
      },
      "new_sets": {
        "label": "Nya set i inkorgen",
        "help": "En kontroll av bevakningslistan (i appen eller schemalagd) hittade nya set."
      },
      "downloads_done": {
        "label": "Nedladdningar klara",
        "help": "Ett meddelande per nedladdningsomgång med antal set och titlar."
      },
      "downloads_failed": {
        "label": "Nedladdningar misslyckades",
        "help": "Ett meddelande per omgång om en nedladdning misslyckades. Detaljer finns under Nedladdningar."
      },
      "quiet_hours": {
        "label": "Tysta timmar",
        "help": "Inga aviseringar under den här tiden. Det som hänt visas efteråt som en sammanfattning."
      },
      "quiet_from": {
        "label": "Från",
        "help": "Början på de tysta timmarna (24 h)."
      },
      "quiet_to": {
        "label": "Till",
        "help": "Slutet på de tysta timmarna. Tidigare än början = över midnatt (t.ex. 22:00–07:00)."
      }
    },
    "notify": {
      "on": "Aviseringar på",
      "off": "Aviseringar av",
      "detail": "Visas via {backend}. Flera händelser tätt efter varandra blir en avisering.",
      "backend_powershell": "Windows PowerShell (ingår i Windows)",
      "backend_winrt": "Windows aviserings-API (pywinrt)",
      "test": "Skicka test",
      "testing": "Skickar …",
      "test_sent": "Testavisering skickad – titta längst ned till höger på skärmen.",
      "unavailable": "Windows-aviseringar inte tillgängliga",
      "unavailable_detail": "Systemet kan inte visa dem (Windows PowerShell saknas eller är blockerat). Händelser skrivs bara till loggen."
    },
    "media_server": {
      "type": {
        "label": "Mediaserver",
        "help": "Vilken server som ska skanna om sitt bibliotek efter nedladdningar. Av = HCLoader kontaktar ingen mediaserver."
      },
      "url": {
        "label": "Serveradress",
        "help": "Adress i hemnätverket, t.ex. http://192.168.1.10:32400 (Plex) eller http://nas:8096 (Jellyfin). Bara denna adress kontaktas.",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "Mapp på servern",
        "help": "Var servern ser din målmapp (NAS, Docker), t.ex. /data/music/HCLoader. Tom = samma sökväg som här. Behövs för att bara skanna de nya mapparna.",
        "ph": "samma sökväg som målmappen"
      },
      "delay_seconds": {
        "label": "Vänta innan skanning",
        "help": "Vänta så här länge efter den senaste nedladdningen – flera nedladdningar blir då en skanning."
      },
      "verify_tls": {
        "label": "Kontrollera certifikat",
        "help": "För https://-adresser. Stäng av bara för ett självsignerat certifikat i hemnätverket."
      }
    },
    "ms": {
      "off": "Ingen mediaserver",
      "off_detail": "Välj Plex eller Jellyfin nedan för att biblioteket ska skannas om efter nedladdningar.",
      "unsaved": "Osparade ändringar – skanningen använder de sparade inställningarna.",
      "on": "{server} uppdateras efter nedladdningar",
      "last_ok": "Senaste skanning {t} ({n} nya filer)",
      "last_fail": "Senaste skanning {t} misslyckades",
      "never": "Ingen skanning ännu",
      "all_libraries": "Alla bibliotek",
      "no_secret": "Ingen token / API-nyckel sparad ännu – ange den nedan och testa anslutningen.",
      "scan_now": "Skanna nu",
      "scanning": "Begär …",
      "scan_sent": "Skanning begärd – servern läser in biblioteket i bakgrunden.",
      "secret_plex": {
        "label": "Plex-token",
        "help": "Din X-Plex-Token (Plex Web › valfritt objekt › Hämta info › Visa XML: ”X-Plex-Token=” i adressen). Sparas i Windows Autentiseringshanteraren efter ett lyckat test – aldrig i config.yaml eller loggen."
      },
      "secret_jellyfin": {
        "label": "Jellyfin-API-nyckel",
        "help": "Kontrollpanel › API-nycklar › ”+”. Sparas i Windows Autentiseringshanteraren efter ett lyckat test – aldrig i config.yaml eller loggen."
      },
      "secret_ph": "klistra in här",
      "secret_kept": "sparad – lämna tomt för att behålla",
      "stored_short": "sparad",
      "stored_title": "Sparad i Windows Autentiseringshanteraren",
      "forget": "Ta bort",
      "forgotten": "Token borttagen från Windows Autentiseringshanteraren",
      "connect": {
        "label": "Anslutning",
        "help": "Kontrollerar adress och token och hämtar listan över bibliotek. Två korta förfrågningar till din server, inget annat."
      },
      "test": "Testa anslutning",
      "testing": "Testar …",
      "test_ok": "Ansluten till {name} (version {v}).",
      "test_libs": "{n} bibliotek hittades.",
      "stored": "Token sparad.",
      "library": {
        "label": "Bibliotek",
        "help": "Vilket bibliotek som skannas. ”Alla bibliotek” skannar allt (långsammare på stora servrar)."
      },
      "lib_paths": "Mappar på servern: {p}"
    },
    "platform": {
      "enabled": {
        "label": "Använd {p}",
        "help": "Av: ingen {p}-sökning, inga kontroller av {p}-källor och inga {p}-nedladdningar. Redan nedladdade poster ligger kvar i biblioteket."
      },
      "sleep_requests": {
        "label": "Paus mellan förfrågningar",
        "help": "Väntetid mellan metadatafrågor till {p} (sökning, bevakning)."
      },
      "sleep_interval": {
        "label": "Nedladdningspaus – minimum",
        "help": "Efter varje {p}-nedladdning följer en slumpmässig paus mellan minimum och maximum."
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
        "help": "Separat räknare för {p}. Resten ligger kvar i kön."
      },
      "max_downloads_per_day": {
        "label": "Max nedladdningar per dag",
        "help": "Separat räknare för {p}, manuella och automatiska nedladdningar tillsammans."
      },
      "max_searches_per_hour": {
        "label": "Max sökningar per timme",
        "help": "Separat räknare för {p}."
      },
      "backoff_initial_hours": {
        "label": "Backoff – startvärde",
        "help": "Spärrtid efter att {p} har meddelat för många förfrågningar (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – maximum",
        "help": "Spärrtiden fördubblas vid varje ny blockering upp till detta värde."
      }
    },
    "reupload": {
      "enabled": {
        "label": "Känn igen omuppladdningar",
        "help": "Beräknar offline med ffmpeg ett kompakt ljudfingeravtryck per set och jämför nya nedladdningar med ditt bibliotek. En träff markeras ”Trolig omuppladdning av …” – inget raderas automatiskt."
      },
      "fingerprint_after_download": {
        "label": "Fingeravtryck efter varje nedladdning",
        "help": "En fil i taget med låg prioritet, efter ljudstyrkeanalysen. Av: bara biblioteksjämförelsen nedan."
      },
      "precheck": {
        "label": "Kontrollera före nedladdning",
        "help": "Jämför före en nedladdning även längd (±5 s) och titel med biblioteket på samma plattform – utan extra förfrågan. Träffar hamnar i inkorgen i stället för kön och visar ”Troligen redan nedladdad”."
      },
      "head_minutes": {
        "label": "Minuter från början",
        "help": "Hur mycket av början som ingår i fingeravtrycket. Mer = säkrare för set med långt identiskt intro, lite långsammare."
      },
      "windows": {
        "label": "Extra fönster",
        "help": "30-sekundersfönster på fasta tider: hälften från början (5, 10, 15 … min), hälften före slutet (2, 6, 12 … min), så att en kopia med längre intro eller outro ändå matchar. De skiljer två olika set som börjar med samma låt. 0 = bara början."
      },
      "min_score": {
        "label": "Tröskel för träff",
        "help": "Andel matchande fingeravtrycks-hashar från vilken ett set räknas som omuppladdning. Lägre = hittar fler, men fler felträffar."
      },
      "title": "{done} av {total} filer har fingeravtryck",
      "marks": "{open} öppna · {linked} länkade · {kept} behållna",
      "help": "Körs offline över biblioteket, en fil i taget med låg prioritet – utan nätverk, ljudet förblir orört. Kan avbrytas när som helst.",
      "button": "Jämför nya filer",
      "button_n": "Jämför {n} nya",
      "all": "Jämför allt igen",
      "all_title": "Beräkna varje fingeravtryck på nytt (t.ex. efter ändrade fönster) – dina beslut finns kvar",
      "running": "Jämför … {done} / {total} · {found} hittade",
      "show": "Visa {n} i biblioteket",
      "no_ffmpeg": "Fingeravtryck kräver ffmpeg (bin\\ffmpeg.exe, installeras av setup.ps1). Inställningar › Underhåll visar statusen."
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
      },
      "resume": {
        "ask": "Fråga",
        "auto": "Automatiskt",
        "off": "Av"
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
    },
    "media_server": {
      "type": {
        "off": "Av",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
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
    },
    "series_delete": {
      "title": "Ta bort serien?",
      "text": "”{name}” och dess upplagor tas bort.",
      "warn": {
        "one": "{n} mix förlorar sin tilldelning.",
        "other": "{n} mixar förlorar sin tilldelning."
      }
    },
    "series_hide": {
      "title": "Dölj serien?",
      "text": "”{name}” känns inte längre igen. Du hämtar tillbaka den med ”Visa dolda”."
    },
    "series_reset": {
      "title": "Återställ inbyggda serier?",
      "text": "Alla inbyggda serier återgår till ursprungsläget och dolda kommer tillbaka. Dina egna serier finns kvar.",
      "ok": "Återställ"
    },
    "reupload_del": {
      "title": "Radera omuppladdning?",
      "ok": "Radera fil",
      "text": "”{title}” är troligen samma mix som ”{of}”. Radera den här nyare filen?",
      "note": "Originalet finns kvar. Posten sätts till ”ignorerad” och laddas inte ned igen."
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
    "reset_all": "Alla inställningar återställda",
    "festival_entry_only": "”{name}” sparades bara i posten – filen går inte att nå",
    "series_saved": "Serien ”{name}” sparad",
    "series_deleted": "Serien ”{name}” borttagen",
    "series_hidden": "Serien ”{name}” dold",
    "series_reset": "Inbyggda serier återställda",
    "assign_done": "Festivaler tilldelade: {assigned} nya, {suggested} förslag",
    "assign_cancelled": "Tilldelningen avbröts: {assigned} nya, {suggested} förslag",
    "analysis_done": "Ljudstyrka analyserad: {n} filer ({failed} misslyckade)",
    "analysis_cancelled": "Analysen avbröts efter {n} filer",
    "fp_done": "Biblioteket jämfört: {n} filer, {found} troliga omuppladdningar",
    "fp_cancelled": "Jämförelsen avbröts efter {n} filer"
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
    "unverified": "utan kontrollsumma (bara ZIP-integriteten verifierad)",
    "rn_label": "Versionsinformation",
    "rn_help": "Vad som ändrats i varje version, från anteckningarna som följer med (fungerar offline).",
    "rn_older": "Äldre",
    "rn_newer": "Nyare",
    "rn_pos": "{i} av {n}",
    "rn_installed": "installerad",
    "rn_empty": "Ingen versionsinformation hittades.",
    "rn_version": "Version",
    "notes_more": "mer"
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
  },
  "fest": {
    "all": "Alla serier",
    "other": "Övrigt / ej tilldelat",
    "other_hint": "Ingen festival",
    "sets": {
      "one": "{n} set",
      "other": "{n} set"
    },
    "editions": {
      "one": "{n} upplaga",
      "other": "{n} upplagor"
    },
    "suggestions": {
      "one": "{n} förslag",
      "other": "{n} förslag"
    },
    "all_years": "Alla",
    "no_stage": "Ingen scen",
    "kind": {
      "festival": "Festival",
      "radio": "Radioprogram",
      "podcast": "Podcast"
    },
    "set_type": {
      "live_set": "Liveset",
      "closing_ceremony": "Avslutningsceremoni",
      "opening": "Öppning",
      "endshow": "Endshow",
      "full_show": "Hel show",
      "warm_up": "Warm-up",
      "anthem": "Anthem",
      "episode": "Avsnitt"
    },
    "change": "ändra festival",
    "change_manual": "satt manuellt, klicka för att ändra",
    "add": "Ange festival eller serie",
    "suggested": "Osäkert förslag: {name}",
    "accept": "Godta förslaget",
    "p_title": "Festival / serie",
    "p_search": "Sök serie …",
    "p_none": "Ingen festival",
    "p_no_match": "Ingen serie hittades",
    "p_year": "År",
    "p_variant": "Variant",
    "p_stage": "Scen",
    "p_type": "Settyp",
    "p_apply": "Verkställ",
    "p_auto": "Återgå till automatiskt"
  },
  "backfill": {
    "action": "Läs in allt (en gång)",
    "action_title": "Läs in hela listan för den här källan en gång, sida för sida – nya träffar hamnar i inkorgen",
    "again_title": "Läs in allt igen – bara poster som ännu är okända läggs till",
    "search_title": "Inte för sparade sökningar – en sökning ger högst 100 träffar",
    "why_open": "Inläsningen har redan startat – pausa eller avbryt den under namnet",
    "st_pending": "Väntar",
    "st_running": "Läser in …",
    "st_paused": "Pausad",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / max. {cap}",
    "added": "+{n} i inkorgen",
    "done_short": "Allt inläst {date}",
    "done_title": "Helt inläst: {date} · {n} poster",
    "note_title": "Senaste avbrott",
    "pause": "Pausa",
    "resume": "Fortsätt",
    "cancel": "Avbryt",
    "keep": "Fortsätt läsa",
    "dlg_title": "Läsa in allt från ”{name}”?",
    "dlg_text": "Läser in hela listan för den här källan en gång, sida för sida – platt och billigt, genom begränsningen; inget laddas ner. Träffar som klarar dina filter hamnar i <b>inkorgen</b>, även för källor med automatisk nedladdning. Videor du redan känner till läggs aldrig till två gånger.",
    "dlg_requests": "förfrågningar",
    "dlg_time": "tid",
    "dlg_entries": "poster",
    "dlg_known": "Känt från senaste kontrollen: <b>{n}</b> poster.",
    "dlg_unknown": "Storleken är okänd – försiktigt uppskattat för maximum {cap} poster.",
    "dlg_capped": "Bara de första {cap} posterna läses in (Inställningar › Schema).",
    "dlg_resume": "Fortsätter efter {n} redan lästa poster; deras sidor hämtas först igen.",
    "dlg_headless": "För stort för en schemalagd körning ({n} förfrågningar per timme): stängs appen innan det är klart fortsätter det bara i appen.",
    "dlg_pace": "Högst {n} förfrågningar per timme, jämnt fördelade. En backoff (HTTP 429 / botkontroll), att appen stängs eller ett fel avbryter bara – det fortsätter automatiskt senare. Du kan pausa eller avbryta när som helst.",
    "dlg_ok": "Starta inläsning",
    "dlg_ok_resume": "Fortsätt läsa",
    "dlg_cancel_title": "Avbryta inläsningen?",
    "dlg_cancel_text": "Inläsningen av ”{name}” stoppas och förloppet kastas. Träffar som redan finns i inkorgen ligger kvar.",
    "toast_started": "”{name}” läses in helt – körs i bakgrunden",
    "toast_done": "”{name}” helt inläst – +{n} i inkorgen",
    "toast_paused": "”{name}” pausad – fortsätt med ”Fortsätt”",
    "toast_cancelled": "Inläsningen av ”{name}” avbröts"
  },
  "collector": {
    "nav": "Samlare",
    "open_title": "Festivalsamlaren: samla alla set från en festivalupplaga med en checklista",
    "title": "Festivalsamlare",
    "sub": "Alla set från en festivalupplaga – enligt spelschemat, med checklista",
    "back_library": "Tillbaka till biblioteket",
    "back_list": "Alla checklistor",
    "collect": "Samla den här upplagan",
    "collect_title": "Checklista över alla set från {name}: hitta saknade set och ladda ner dem",
    "open_checklist": "Checklista {n} / {total}",
    "sets": "Set",
    "lists": "Checklistor",
    "card_empty": "Inga set ännu",
    "new_title": "Ny checklista",
    "new_text": "Välj en festival och ett år. Seten kommer från arrangörens spellista, ett inklistrat spelschema eller en medföljande fil.",
    "new_ok": "Öppna checklista",
    "f_series": "Festival / serie",
    "f_series_ph": "Välj …",
    "f_series_other": "Radioprogram och poddar",
    "err_series": "Välj en festival eller serie.",
    "err_year": "Ange upplagans år.",
    "empty_title": "Ingen checklista ännu",
    "empty_text": "En checklista räknar upp varje set från en festivalupplaga och visar vad du redan har.",
    "step1": "Välj festival och år här ovanför.",
    "step2": "Importera arrangörens spellista eller klistra in spelschemat.",
    "step3": "Bocka ur det du inte vill ha, sök efter saknade set och ladda ner.",
    "delete": "Ta bort checklista",
    "dlg_delete_title": "Ta bort checklistan?",
    "dlg_delete_text": "Checklistan för ”{name}” tas bort med alla rader. En pågående sökning stoppas.",
    "dlg_delete_keep": "Nedladdade filer, biblioteksposter och sparade träffar finns kvar.",
    "toast_deleted": "Checklistan ”{name}” togs bort",
    "in_library": "{n} i biblioteket",
    "show_library": "Visa i biblioteket ({n})",
    "more": "Mer",
    "st": {
      "found": "Hittad",
      "queued": "I kö",
      "downloaded": "Nedladdad",
      "missing": "Saknas",
      "ignored": "Ignorerad"
    },
    "filter_status": "Visa bara: {name}",
    "sources": "Källor",
    "src_playlist": "Importera arrangörens spellista",
    "src_paste": "Klistra in spelschema (Beta)",
    "files": "Medföljande spelscheman",
    "src_add": "Lägg till rad",
    "all_stages": "Alla scener",
    "all_days": "Alla dagar",
    "no_day": "Ingen dag",
    "search": "Filtrera på DJ …",
    "col_dj": "DJ / set",
    "col_when": "Dag / tid",
    "col_status": "Status",
    "col_match": "Hittad video",
    "source": {
      "playlist": "Spellista",
      "timetable": "Spelschema",
      "file": "Spelschemafil",
      "manual": "Tillagd för hand"
    },
    "edited": "Ändrad för hand – de här värdena går före senare importer",
    "check_title": "Samla det här setet",
    "all_title": "Markera alla / inga (visade rader)",
    "m_none": "Inte sökt ännu",
    "m_searched": "Inget hittat ({date})",
    "confirm": "Bekräfta",
    "confirm_title": "Osäker träff – bekräfta att det är rätt set",
    "reject_title": "Inte den här videon – föreslå den aldrig mer för raden",
    "reject": "Förkasta träffen",
    "candidates": "Andra träffar: {n}",
    "candidates_head": "Använd en annan träff",
    "ignore": "Ignorera det här setet",
    "unignore": "Sluta ignorera",
    "delete_row": "Ta bort rad",
    "f_artist": "DJ / artist",
    "f_day": "Dag",
    "f_start": "Start",
    "f_end": "Slut",
    "add_ok": "Lägg till",
    "err_artist": "DJ / artist krävs.",
    "none_title": "Inga rader",
    "none_text": "Ingen rad passar de aktuella filtren.",
    "rows_empty_title": "Checklistan är tom",
    "rows_empty_text": "Börja med arrangörens officiella spellista – en enda platt listning täcker oftast de flesta seten. Eller klistra in spelschemat som text.",
    "checked_of": "av {total} ibockade",
    "select_all": "Markera alla",
    "select_none": "Inga",
    "shown": "{n} av {total} rader visas",
    "to_confirm": "Att bekräfta: {n}",
    "to_confirm_title": "Osäkra träffar väntar på din bekräftelse – klicka för att bara visa dem",
    "find": "Sök saknade set ({n})",
    "find_again": "Sök igen ({n})",
    "find_title": "Söker ibockade set utan träff, ett i taget och i lugn takt – visar först en uppskattning",
    "find_again_title": "Alla set har redan sökts – sök igen efter dem utan träff",
    "find_none": "Inget att söka – varje ibockat set har en träff",
    "find_running": "Sökningen pågår",
    "queue": "Ladda ner ibockade ({n})",
    "queue_title": "Lägg alla ibockade, bekräftade set i nedladdningskön",
    "queue_none": "Inget att ladda ner – inget ibockat set med en bekräftad träff som inte redan är nedladdad",
    "job_pending": "Väntar",
    "job_running": "Söker …",
    "job_paused": "Pausad",
    "job_hits": "Hittade: {n}",
    "job_cancel": "Stoppa",
    "job_resume": "Fortsätt",
    "imp_running": "Läser spellistan …",
    "imp_entries": "Poster: {n}",
    "imp_hint": "platt listning, sida för sida",
    "imp_busy": "En spellista läses redan",
    "imp_added": "nya: {n}",
    "imp_merged": "sammanslagna: {n}",
    "imp_matched": "hittade i biblioteket: {n}",
    "imp_unchecked": "urbockade (för korta / aftermovie): {n}",
    "imp_invalid": "ogiltiga: {n}",
    "pl_title": "Importera arrangörens spellista",
    "pl_text": "Arrangörens officiella liveset-spellista är den billigaste källan: en platt listning, inget laddas ner. Varje post blir en bekräftad rad; DJ, scen och settyp hämtas från titeln.",
    "pl_url": "Länk till spellistan",
    "pl_hint": "YouTube-spellista eller SoundCloud-set. För korta poster, aftermovies och trailrar läggs till urbockade. Rader från ett spelschema får den matchande videon.",
    "pl_ok": "Importera",
    "pl_err_empty": "Klistra in länken till en spellista.",
    "toast_pl_started": "Läser spellistan – körs i bakgrunden",
    "toast_pl_done": "Spellistan läst –",
    "toast_pl_cancelled": "Importen av spellistan stoppades –",
    "tt_title": "Klistra in spelschema – {name} (Beta)",
    "tt_text": "Klistra in spelschemat som text eller CSV. Rubriker anger dag och scen, varje annan rad är ett set. Inget sparas förrän du importerar.",
    "tt_input": "Spelschema",
    "tt_preview": "Förhandsvisning",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Här visas de set som känns igen.",
    "tt_nothing": "Inget set har känts igen ännu.",
    "tt_sum": "Set: {n}",
    "tt_days": "Dagar: {n}",
    "tt_stages": "Scener: {n}",
    "tt_skipped": "Rader som inte förstods: {n}",
    "tt_more": "… och {n} till",
    "tt_ok": "Importera ({n})",
    "tt_edit_hint": "Rätta eller ta bort set här före import. Ändrar du texten till vänster läses den in igen.",
    "toast_tt": "Spelschemat importerat –",
    "files_text": "Spelscheman som underhålls i HCLoaders repository och följer med uppdateringar. En import skapar checklistan för den upplagan.",
    "files_empty_title": "Inga spelscheman följer med ännu",
    "files_empty": "Bara spelscheman som bevisligen stämmer följer med – den här versionen har inga. Klistra in spelschemat som text i stället.",
    "files_how_title": "Bidra med ett spelschema",
    "files_how": "En JSON-fil per upplaga med seten (artist, scen, dag, start, slut) och en länk till det officiella spelschemat som källa. Skicka in den som issue eller pull request på GitHub; README-filen bredvid filerna beskriver formatet.",
    "files_meta": "Set: {n} · uppdaterad {date}",
    "files_source": "officiell källa",
    "files_import": "Importera",
    "files_broken": "Ogiltig fil: {error}",
    "files_unknown": "Serien är okänd eller dold här",
    "est_title": "Sök saknade set – {name}",
    "est_text": "Söker varje ibockat set utan träff, ett i taget: <b>DJ + festival + år</b> som platt sökning via strypningen. Inget laddas ner.",
    "est_requests": "sökningar",
    "est_left": "lediga den här timmen",
    "est_again": "Alla set har redan sökts – nu söks de utan träff igen.",
    "est_offline": "Nyss matchade mot ditt bibliotek, gratis: {n}.",
    "est_resume": "Fortsätter den avbrutna sökningen.",
    "est_wait": "Timmens sökgräns är förbrukad – den första sökningen startar {t}.",
    "est_backoff": "Backoff aktiv till {t} – ingen sökning kan starta före det.",
    "est_pace": "Högst {n} sökningar per timme, jämnt fördelade (ungefär en var {min}:e min). Osäkra träffar väntar på din bekräftelse. En backoff, att appen stängs eller ett fel avbryter bara sökningen – den fortsätter automatiskt.",
    "est_ok": "Starta sökning",
    "est_ok_resume": "Fortsätt sökning",
    "toast_find_started": "Söker saknade set från ”{name}” – körs i bakgrunden",
    "toast_find_done": "Sökningen klar – hittade {n} av {total}",
    "toast_find_cancelled": "Sökningen stoppad – ”Sök saknade set” fortsätter den",
    "toast_offline": "Matchade mot ditt bibliotek: {n} – ingen sökning behövs",
    "toast_confirmed": "”{name}” bekräftad",
    "toast_rejected": "Träffen för ”{name}” förkastad",
    "toast_ignored": "”{name}” ignoreras",
    "toast_unignored": "”{name}” samlas igen",
    "toast_row_added": "”{name}” tillagd",
    "toast_row_added_hit": "”{name}” tillagd – hittad i biblioteket",
    "toast_row_saved": "”{name}” sparad",
    "toast_row_retag": "”{name}” sparad – filen taggas om",
    "toast_row_deleted": "Raden ”{name}” togs bort",
    "q_none": "Inget lades i kön",
    "q_unconfirmed": "obekräftade: {n}",
    "q_missing": "utan träff: {n}",
    "q_other": "kan inte laddas: {n}",
    "q_retag": "omtaggade: {n}",
    "export": "Spellista",
    "export_title": "Exportera checklistans nedladdade set som M3U8-spellista"
  },
  "tracks": {
    "nav": "Låtar",
    "open_title": "Vilka set spelar en låt? Sök i bibliotekets spellistor",
    "title": "Låtar",
    "sub": "Vilka set spelar den här låten?",
    "back": "Tillbaka till biblioteket",
    "search": "Artist eller titel, t.ex. Dragonborn",
    "n_tracks": {
      "one": "{n} låt",
      "other": "{n} låtar"
    },
    "n_sets": {
      "one": "{n} set",
      "other": "{n} set"
    },
    "status": "{tracks} i {sets}",
    "status_last": "Inläst:",
    "scan": "Läs in spellistor",
    "scan_title": "Läs in spellistorna för alla set (offline: kapitel, beskrivningar, CUE-filer)",
    "rescan": "Läs in allt igen",
    "rescan_title": "Läs in låtlistorna för alla set igen",
    "scan_new": "Läs in nya",
    "scan_new_title": "Läs bara in set som är nya eller ändrade sedan förra gången",
    "running": "Läser in spellistor … {done} / {total}",
    "engine_like": "Enkel sökning: den här SQLite saknar fulltextindex",
    "top_title": "Mest spelade låtar",
    "top_sub": "i flest set",
    "top_sets": {
      "one": "{n} set",
      "other": "{n} set"
    },
    "top_find": "Visa set med den här låten",
    "top_empty": "Ingen låt finns ännu i mer än ett set.",
    "results": {
      "one": "{n} set med ”{q}”",
      "other": "{n} set med ”{q}”"
    },
    "truncated": "de första {n} – förfina sökningen",
    "more_hits": {
      "one": "+ {n} träff till",
      "other": "+ {n} träffar till"
    },
    "no_results_title": "Inget set spelar ”{q}”",
    "no_results_text": "Prova en del av artisten eller titeln. Bara set med spellista (kapitel, beskrivning, CUE-fil) hittas.",
    "empty_title": "Inga spellistor än",
    "empty_text": "HCLoader läser spellistor ur kapitel, beskrivningar och CUE-filer i dina set – offline, utan att fråga YouTube.",
    "empty_none_title": "Inget av dina set har en spellista",
    "empty_none_text": "Spellistor kommer från kapitel, beskrivningar med tidsstämplar och CUE-filer. Set utan dem går inte att söka i.",
    "library_empty": "Ladda ner några set först – deras spellistor visas här.",
    "jump": "Spela från {time}",
    "jump_external": "Öppnat i standardspelaren – hoppa till {time} där",
    "no_time": "Ingen tidsstämpel i spellistan",
    "tracklist": "Spellista",
    "tracklist_title": "Visa hela spellistan för det här setet",
    "panel_source": "Källa: {source}",
    "source_chapters": "kapitel",
    "source_description": "beskrivning",
    "source_id3": "ID3-kapitel",
    "source_cue": "CUE-fil",
    "source_none": "ingen",
    "panel_empty": "Det här setet har ingen spellista",
    "panel_empty_hint": "Varken kapitel, en beskrivning med spellista eller en CUE-fil hittades.",
    "close": "Stäng",
    "id_track": "Outgiven eller oidentifierad låt (ID)",
    "play_set": "Spela setet från början",
    "toast_done": "Spellistor inlästa: {sets}, {tracks}",
    "toast_cancelled": "Inläsning av spellistor avbruten"
  },
  "pl": {
    "title": "Exportera spellista",
    "export": "Exportera",
    "overwrite": "Skriv över",
    "exists": "Det finns redan en spellista med det här namnet i mappen. ”Skriv över” ersätter den.",
    "nothing": "Inget att exportera – här finns inga nedladdade set.",
    "missing": "{n} filer saknas – de hoppas över",
    "name": "Filnamn",
    "folder": "Mapp",
    "browse": "Bläddra …",
    "paths": "Sökvägar i spellistan",
    "relative": "Relativa",
    "absolute": "Absoluta",
    "relative_help": "Relativt spellistan – fungerar även om du flyttar hela musikmappen. Filer på en annan enhet skrivs med full sökväg.",
    "absolute_help": "Fullständiga sökvägar – spellistan kan ligga var som helst, men slutar fungera om musiken flyttas.",
    "sync": "Håll uppdaterad efter nedladdningar",
    "sync_help": "Skrivs om automatiskt efter varje nedladdning.",
    "sync_off": "Noterat – gäller när ”Uppdatera sparade spellistor efter nedladdningar” är på (Inställningar › Lagring).",
    "done": "Spellista sparad ({sets}): {path}",
    "skipped": "{n} saknade överhoppade",
    "fallback": "{n} på annan enhet med full sökväg",
    "synced": "Spellistor uppdaterade: {n}",
    "sync_failed": "Spellistor ej uppdaterade: {n} (se loggen)"
  },
  "djs": {
    "nav": "DJ:er",
    "open_title": "DJ-sidor: alla artister i ditt bibliotek, med alias och b2b-set",
    "title": "DJ:er",
    "sub": "Artister i ditt bibliotek",
    "back_library": "Tillbaka till biblioteket",
    "back": "Alla DJ:er",
    "add": "Lägg till DJ / akt",
    "search": "Sök DJ:er eller alias",
    "sort": "Sortera",
    "sort_sets": "Set",
    "sort_recent": "Senaste",
    "sort_name": "Namn",
    "hidden_chip": "Dolda: {n}",
    "n_festivals": "Festivaler: {n}",
    "n_b2b": "b2b: {n}",
    "aka": "alias {names}",
    "unhide": "Visa i listan igen",
    "none_title": "Ingen DJ hittades",
    "none_text": "Prova ett annat namn eller alias.",
    "empty_title": "Inga DJ:er än",
    "empty_text": "DJ:er känns igen offline från titlarna på dina nedladdade set, festivalchecklistor och artistkanaler.",
    "b2b_title": "Spelat tillsammans (b2b) – setet räknas för varje artist",
    "b2b_with": "b2b med {names}",
    "aliases": "Alias",
    "no_aliases": "Inga alias",
    "split_title": "Dela av ”{alias}” – räkna som egen DJ",
    "play_all": "Spela alla",
    "export": "Exportera M3U",
    "export_title": "Exportera spellista: {name}",
    "watch": "Lägg till i bevakning",
    "discover": "Sök i Upptäck",
    "stat_sets": "Set",
    "stat_hours": "Timmar",
    "stat_festivals": "Festivaler",
    "stat_years": "År",
    "stat_b2b": "b2b",
    "other_sets": "Andra set · {year}",
    "tracks": "Mest spelat i setten",
    "track_sets": "{n}×",
    "tracks_none": "Inga låtlistor för de här setten än – Bibliotek › Låtar läser in dem offline.",
    "play_all_external": "”Spela alla” kräver den inbyggda spelaren (Inställningar › Uppspelning).",
    "watch_exists": "Finns redan i bevakningen: {name}",
    "watch_title": "Bevaka {name}",
    "watch_ok": "Lägg till i bevakning",
    "watch_channel": "Nya set från {name}s egen kanal hamnar i din inkorg:",
    "watch_search": "Ingen egen kanal känd – bevakningen söker regelbundet på YouTube efter:",
    "watch_note": "Inget laddas ner automatiskt. Du kan ändra eller ta bort källan i bevakningen när som helst.",
    "watch_added": "Tillagd i bevakningen: {name}",
    "split_q_title": "Dela av alias",
    "split_q": "Räkna set krediterade som ”{alias}” som en egen DJ i stället för {name}?",
    "split_ok": "Dela av",
    "split_done": "”{alias}” är en egen DJ igen",
    "edit": "Redigera namn och alias",
    "edit_title": "Redigera {name}",
    "add_title": "Lägg till DJ eller akt",
    "f_name": "Namn",
    "f_aliases": "Alias",
    "f_aliases_help": "Andra stavningar och korta namn (t.ex. ”HH”). Set med ett alias räknas för den här DJ:n.",
    "f_act_help": "Valfritt. En duo med ”&” i namnet (t.ex. ”D-Block & S-te-Fan”) räknas då som en akt i stället för b2b.",
    "f_alias_add": "+ alias",
    "f_channel": "Egen kanal (valfritt)",
    "f_channel_help": "URL till YouTube- eller SoundCloud-kanalen – används av ”Lägg till i bevakning”.",
    "saved": "Sparat",
    "merge": "Slå ihop med annan DJ …",
    "merge_title": "Slå ihop {name}",
    "merge_text": "Alla set och stavningar av {name} räknas då för vald DJ. Du kan dela av senare.",
    "merge_into": "Slå ihop med",
    "merge_ok": "Slå ihop",
    "merge_none": "Det finns ingen annan DJ att slå ihop med.",
    "merged": "{name} ihopslagen",
    "hide": "Inte en DJ – dölj",
    "hidden_done": "Dold i DJ-listan",
    "unhidden_done": "Visas i DJ-listan igen",
    "sub_n": {
      "one": "{n} DJ",
      "other": "{n} DJ:er"
    }
  },
  "stats": {
    "title": "Statistik",
    "sub": "Ditt bibliotek i siffror – offline, från databasen",
    "range": "Period",
    "p_all": "Allt",
    "p_12m": "12 månader",
    "p_30d": "30 dagar",
    "p_year": "I år",
    "p_custom": "Anpassad",
    "from": "Från",
    "to": "Till",
    "n_sets": {
      "one": "{n} set",
      "other": "{n} set"
    },
    "sets_word": {
      "one": "set",
      "other": "set"
    },
    "k_sets": "Set",
    "k_hours": "Speltid",
    "k_size": "På disken",
    "k_avg": "Genomsnittligt set",
    "of_library": "av {n} i biblioteket",
    "since": "sedan {d}",
    "days_nonstop": "{n} dagar nonstop",
    "last_dl": "senaste nedladdning {d}",
    "avg_size": "{s} per set",
    "sizes_missing": {
      "one": "{n} fil ännu inte mätt",
      "other": "{n} filer ännu inte mätta"
    },
    "measuring": "Mäter filstorlekar … {done} / {total}",
    "h_months": "Nedladdningar per månad",
    "h_years_dl": "Nedladdningar per år",
    "best_month": "Bäst: {m} ({n})",
    "h_genres": "Efter genre",
    "h_sources": "Källor",
    "h_festivals": "Toppfestivaler",
    "editions": {
      "one": "{n} upplaga",
      "other": "{n} upplagor"
    },
    "festivals_other": "+ {n} set från {f} andra festivaler",
    "no_festivals": "Inga festivalset under perioden – Inställningar › Festivaler & serier tilldelar dem.",
    "h_djs": "Topp-DJ:s",
    "open_dj": "Öppna DJ-sidan för {name}",
    "no_djs": "Inga DJ:s identifierade under perioden.",
    "h_years": "Efter setets år",
    "year_unknown": "{n} utan känt år",
    "h_tracks": "Mest spelade låtar",
    "no_tracks": "Ingen låt finns ännu i två set – låtlistor kommer från kapitel och beskrivningar (Bibliotek › Låtar).",
    "h_watchlist": "Bevakningslistans aktivitet",
    "w_checks": "Kontroller",
    "w_scheduled": "varav schemalagda",
    "w_found": "Hittade",
    "w_inbox": "I inkorgen",
    "w_library": "I biblioteket",
    "w_source": "Källa",
    "w_found_n": "{n} hittade",
    "w_checks_n": "{n} kontroller",
    "w_last": "senaste kontroll {t}",
    "w_none_range": "Ingen källa hittade något under perioden.",
    "w_no_sources": "Inga källor i bevakningslistan ännu.",
    "none": "Inget under perioden.",
    "range_empty": "Inget laddades ned under perioden – välj en längre.",
    "error": "Statistik inte tillgänglig",
    "empty_title": "Inga set ännu",
    "empty_text": "Så snart de första seten finns i biblioteket ser du här vad du samlar – genrer, festivaler, DJ:s, timmar.",
    "empty_go": "Upptäck set"
  },
  "reupload": {
    "tag": "Omuppladdning?",
    "tag_title": "Troligen en omuppladdning av ”{title}” ({p}, {score} % träff) – klicka för att bestämma",
    "linked": "Samma mix",
    "linked_title": "Länkad som samma mix som ”{title}” ({p})",
    "chip": "Omuppladdningar ({n})",
    "chip_title": "Visa bara set som markerats som trolig omuppladdning",
    "menu_head": "Trolig omuppladdning av ”{title}” · {score} %",
    "menu_head_linked": "Samma mix som ”{title}”",
    "keep": "Behåll båda",
    "link": "Länka som samma mix",
    "undo": "Ångra beslut",
    "show_original": "Visa originalet",
    "delete_new": "Radera den här nyare filen",
    "toast_keep": "Båda behållna – markeringen är borta",
    "toast_link": "Länkad som samma mix",
    "toast_open": "Beslutet ångrat",
    "toast_found": "Trolig omuppladdning: ”{title}” matchar ”{of}” – se biblioteket",
    "dl_notice": "Senaste nedladdningar som troligen är omuppladdningar av set du redan har ({n}):",
    "review": "Granska i biblioteket",
    "adopt": "Originalet saknas – behåll den här kopian",
    "toast_adopt": "Den här kopian ersätter nu det saknade originalet",
    "original_missing_head": "Originalfilen saknas – den här kopian är den sista och kan inte raderas här",
    "original_unknown_head": "Målmappen kan inte nås – originalet kan inte kontrolleras"
  },
  "catchup": {
    "cancel": "Stoppa ikappkörningen i bakgrunden",
    "tip": "Äldre objekt i biblioteket bearbetas offline i bakgrunden. Stoppad fortsätter den vid nästa start.",
    "step": {
      "festivals": "Tilldelar festivaler",
      "tracklists": "Läser låtlistor",
      "analysis": "Analyserar ljudstyrka",
      "fingerprints": "Fingeravtryck"
    }
  }
});
