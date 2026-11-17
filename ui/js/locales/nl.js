/* HCLoader UI texts – Dutch (Netherlands).
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "nl", "name": "Nederlands", "dir": "ltr", "intl": "nl-NL"}, {
 "app": {
  "title": "HCLoader",
  "tagline": "HARD MUSIC ARCHIVE",
  "mock": "DEMOMODUS"
 },
 "nav": {
  "discover": "Ontdekken",
  "inbox": "Inbox",
  "watchlist": "Volglijst",
  "downloads": "Downloads",
  "library": "Bibliotheek",
  "log": "Logboek",
  "settings": "Instellingen"
 },
 "navfoot": {
  "today": "VANDAAG",
  "next": "VOLGENDE CONTROLE"
 },
 "common": {
  "ok": "OK",
  "cancel": "Annuleren",
  "save": "Opslaan",
  "delete": "Verwijderen",
  "edit": "Bewerken",
  "remove": "Verwijderen",
  "reset": "Herstellen",
  "on": "aan",
  "off": "uit",
  "current": "huidig",
  "loading": "laden …",
  "add_chip": "+ toevoegen",
  "empty": "“leeg”",
  "empty_list": "“geen”"
 },
 "fmt": {
  "today": "vandaag",
  "yesterday": "gisteren",
  "never": "nooit",
  "no_date": "Datum onbekend",
  "just_now": "zojuist",
  "today_at": "vandaag {t}",
  "tomorrow_at": "morgen {t}",
  "yesterday_at": "gisteren {t}",
  "views": {
   "one": "{v} weergave",
   "other": "{v} weergaven"
  }
 },
 "unit": {
  "s": "s",
  "h": "u",
  "minutes": "minuten",
  "mbs": "MB/s",
  "bpm": "BPM",
  "chars": "tekens",
  "results": "resultaten",
  "entries": "items",
  "clock": "uur"
 },
 "range": {
  "ge_sleep": "≥ minimum",
  "ge_initial": "≥ beginwaarde"
 },
 "status": {
  "new": "Nieuw",
  "inbox": "In inbox",
  "queued": "In wachtrij",
  "downloading": "Downloaden",
  "done": "Gedownload",
  "ignored": "Genegeerd",
  "failed": "Fout"
 },
 "period": {
  "all": "Alles",
  "7d": "Laatste 7 dagen",
  "30d": "Laatste 30 dagen",
  "1y": "Laatste 12 maanden",
  "year": "Specifiek jaar",
  "custom": "Aangepast"
 },
 "source_type": {
  "channel": "Kanaal",
  "playlist": "Afspeellijst",
  "search": "Zoekopdracht"
 },
 "platform": {
  "youtube": "YouTube",
  "soundcloud": "SoundCloud",
  "label": "Platform",
  "sc_off": "SoundCloud staat uit – zet het aan onder Instellingen › SoundCloud."
 },
 "genre": {
  "change": "Genre wijzigen",
  "manual": "Genre handmatig ingesteld",
  "change_manual": "Genre wijzigen (handmatig ingesteld)"
 },
 "run_kind": {
  "watchlist": "Volglijst",
  "headless": "Taakplanner",
  "manual": "Handmatig"
 },
 "phase": {
  "waiting": "Wachten",
  "sleep": "Pauze tot de volgende download",
  "download": "Downloaden",
  "convert": "Converteren",
  "tag": "Taggen",
  "failed": "Mislukt"
 },
 "po_mode": {
  "off": "Uit",
  "script": "Script",
  "http": "HTTP"
 },
 "po_mode_long": {
  "off": "Uit",
  "script": "Script (Deno)",
  "http": "HTTP-server (lokaal)"
 },
 "statusbar": {
  "ok": "OK",
  "missing": "ontbreekt",
  "po": "PO-Token",
  "po_active": "actief ({mode})",
  "po_inactive": "inactief",
  "po_error": "Fout",
  "backoff": "Backoff",
  "backoff_none": "geen",
  "backoff_until": "tot {t} · nog {rest}",
  "queue": "Wachtrij",
  "queue_empty": "leeg",
  "queue_active": "actief",
  "queue_paused": "gepauzeerd",
  "today": "Vandaag",
  "next": "Volgende controle",
  "next_off": "uit",
  "backoff_until_short": "tot {t}",
  "sc_backoff": "Backoff tot {t}",
  "sc_today": "{n} / {max}",
  "yt_tip": "YouTube · vandaag gedownload {day}/{day_max} · {s}/{s_max} zoekopdrachten dit uur",
  "sc_tip": "SoundCloud · vandaag gedownload {day}/{day_max} · {s}/{s_max} zoekopdrachten dit uur",
  "backoff_tip": "{p}: backoff tot {t} (nog {rest})"
 },
 "schedule": {
  "due": "aan de beurt",
  "kind_app": "App",
  "kind_task": "Taak",
  "tip_app": "Volgende volglijstcontrole in de app: {t} (zolang HCLoader draait).",
  "tip_task": "Volgende volglijstcontrole via de Windows-taakplanner: {t}.",
  "tip_any": "Volgende volglijstcontrole: {t}.",
  "tip_off": "Geen automatische controle – niet in de app en niet via de Windows-taakplanner.",
  "tip_backoff": "Geen controles zolang de backoff actief is."
 },
 "card": {
  "source": "Gevonden via volglijstbron “{name}”",
  "select": "Selecteren",
  "open": "Openen op {p}",
  "ignore": "Negeren",
  "unignore": "Niet meer negeren",
  "more": "Meer acties",
  "download": "Downloaden",
  "watch": "Kanaal aan volglijst toevoegen",
  "block": "Kanaal blokkeren",
  "set_genre": "Genre instellen",
  "date_approx": "Geschatte datum – de zoekfunctie van YouTube geeft alleen “X jaar geleden”",
  "date_unknown": "Geen uploaddatum beschikbaar",
  "duplicate": "Waarschijnlijk al gedownload ({p})",
  "duplicate_title": "Zeer vergelijkbare titel en dezelfde duur als “{title}” van {p} – daar al gedownload of in de wachtrij. Je kunt het toch downloaden.",
  "preview": "Alleen preview (Go+) – kan niet worden gedownload",
  "preview_title": "SoundCloud levert voor deze track alleen een preview van 30 seconden (Go+). Hij kan niet worden gedownload."
 },
 "discover": {
  "placeholder": "Zoek naar mix, liveset, dj, evenement …",
  "search": "Zoeken",
  "searching_btn": "Zoeken …",
  "searching": "Zoeken – lichte zoekopdracht, spaarzaam voor YouTube …",
  "sort": "Sorteren",
  "sort_rel": "Relevantie",
  "sort_date": "Nieuwste eerst",
  "sort_dur": "Langste eerst",
  "sort_views": "Meeste weergaven",
  "quota": "Zoekopdrachten dit uur: {n} / {max}",
  "quota_sc": "SoundCloud-zoekopdrachten dit uur: {n} / {max}",
  "placeholder_sc": "Zoek op SoundCloud: mix, set, dj, podcast …",
  "platform_title": "Waar zoeken",
  "searching_sc": "Zoeken – lichte zoekopdracht, spaarzaam voor SoundCloud …",
  "ready_text_sc": "Voer een zoekterm in en druk op Enter om op SoundCloud te zoeken.",
  "previews": "{n} alleen preview (Go+)",
  "previews_title": "Go+-previews kunnen nooit worden gedownload. Zichtbaar als “Gedownload en genegeerd verbergen” uit staat.",
  "filters": "Filters",
  "toggle_filters": "Filterpaneel tonen/verbergen",
  "f_duration": "Duur (minuten)",
  "f_min": "Minimum",
  "f_max": "Maximum (leeg = geen limiet)",
  "f_max_ph": "max",
  "f_period": "Uploadperiode",
  "f_year": "Jaar",
  "f_year_prev": "Een jaar terug",
  "f_year_next": "Een jaar vooruit",
  "f_from": "Van",
  "f_to": "Tot",
  "f_hint_year": "De zoekfunctie van YouTube geeft alleen een geschatte datum (“13 jaar geleden”). Daarom geldt ±1 jaar – en ook elke mix met “{year}” in de titel.",
  "f_hint_custom": "De zoekfunctie van YouTube geeft alleen een geschatte datum. Bij geschatte datums geldt aan beide kanten een marge van ±1 jaar.",
  "chip_title": "Klik: genre tonen/verbergen · Dubbelklik: alleen dit genre (de termen worden aan de zoekopdracht toegevoegd)",
  "scope": "Zoekopdracht uitgebreid met",
  "scope_title": "De volgende zoekopdracht voegt deze termen toe aan je zoektekst.",
  "searched": "Gezocht met",
  "stale": "Filters gewijzigd sinds",
  "re_search": "Opnieuw zoeken",
  "re_search_title": "De resultaten komen van de laatste zoekopdracht. Zoek opnieuw zodat genre en jaar in de zoekterm worden opgenomen (telt als één zoekopdracht).",
  "need_query": "Voer eerst een zoekterm in.",
  "f_inc": "Verplichte trefwoorden",
  "f_exc": "Uitgesloten trefwoorden",
  "f_show": "Weergave",
  "f_hide": "Gedownload en genegeerd verbergen",
  "f_blacklist": "Kanaalzwarte lijst toepassen",
  "count": {
   "one": "{n} resultaat · {hidden} uitgefilterd",
   "other": "{n} resultaten · {hidden} uitgefilterd"
  },
  "selected": "{n} geselecteerd",
  "select_all": "Alles selecteren",
  "download_sel": "Selectie downloaden",
  "ready_title": "Klaar",
  "ready_text": "Voer een zoekterm in en druk op Enter.",
  "none_title": "Niets gevonden",
  "none_text": "Versoepel de filters of probeer andere zoektermen.",
  "none_year": "Geen resultaat uit {year}. Zoek opnieuw zodat het jaar in de zoekterm wordt opgenomen – of wijzig het jaar."
 },
 "inbox": {
  "title": "Inbox",
  "sub": "Nieuwe volglijsttreffers die alle filters doorstaan",
  "sub_n": {
   "one": "{n} nieuwe volglijsttreffer die alle filters doorstaat",
   "other": "{n} nieuwe volglijsttreffers die alle filters doorstaan"
  },
  "ignore_all": "Alles negeren",
  "download_all": "Alles downloaden",
  "ignore_sel": "Selectie negeren",
  "download_sel": "Selectie downloaden",
  "select_all": "Alles selecteren",
  "select_none": "Selectie wissen",
  "src_all": "Alle bronnen",
  "src_none": "Geen bron",
  "src_title": "Alleen treffers van deze bron tonen",
  "count": {
   "one": "{n} treffer",
   "other": "{n} treffers"
  },
  "count_of": "{n} van {total} treffers",
  "selected": "{n} geselecteerd",
  "empty_title": "Inbox leeg",
  "empty_text": "De volglijst heeft geen nieuwe mixes gevonden.",
  "empty_nosrc": "Nog geen bronnen in de volglijst – voeg een kanaal, afspeellijst of zoekopdracht toe en nieuwe mixes verschijnen hier.",
  "empty_next": "Volgende controle: {t}.",
  "to_watchlist": "Naar volglijst"
 },
 "watchlist": {
  "title": "Volglijst",
  "sub_n": {
   "one": "{n} bron · {active} actief",
   "other": "{n} bronnen · {active} actief"
  },
  "sub_next": "volgende controle {t}",
  "add": "Bron",
  "check_all": "Alles nu controleren",
  "check": "Controleren",
  "checking": "controleren …",
  "queued": "wachten …",
  "running": "Controleren …",
  "running_n": "Controleren {i} / {n} …",
  "col_active": "Actief",
  "col_name": "Naam",
  "col_type": "Type",
  "col_genre": "Genre",
  "col_auto": "Nieuwe treffers",
  "col_max": "Max.",
  "col_last": "Laatst gecontroleerd",
  "col_new": "Nieuw",
  "genre_auto": "automatisch",
  "genre_auto_long": "Automatisch (uit trefwoorden)",
  "auto_on": "downloaden",
  "auto_off": "inbox",
  "auto_title_on": "Nieuwe treffers worden automatisch gedownload",
  "auto_title_off": "Nieuwe treffers gaan alleen naar de inbox",
  "new_title": "In inbox tonen",
  "check_title": "Deze bron nu controleren",
  "why_off": "Bron is niet actief",
  "why_running": "Er loopt al een controle",
  "why_backoff": "Backoff actief – controleren is geblokkeerd",
  "why_backoff_p": "Backoff ({p}) actief – controleren is geblokkeerd",
  "why_sc_off": "SoundCloud staat uit",
  "error_title": "Laatste controle mislukt",
  "backoff": "<b>Backoff actief tot {t}</b> (nog {rest}). De volglijst kan niet worden gecontroleerd – geplande controles zijn ook gepauzeerd.",
  "backoff_p": "<b>Backoff ({p}) actief tot {t}</b> (nog {rest}). Bronnen van {p} worden tot dan overgeslagen – {other} blijft doorlopen.",
  "backoff_link_sc": "SoundCloud openen",
  "backoff_link": "Beperkingen openen",
  "none_active": "Geen actieve bron om te controleren",
  "empty_title": "Geen bronnen",
  "empty_text": "Voeg een kanaal, afspeellijst of opgeslagen zoekopdracht toe.",
  "add_title": "Bron toevoegen",
  "edit_title": "Bron bewerken",
  "f_type": "Type",
  "f_name": "Naam",
  "f_url": "URL",
  "f_query": "Zoekterm",
  "f_genre": "Standaardgenre",
  "f_max": "Max. items",
  "f_newest_last": "Nieuwste staan achteraan (afspeellijst achterstevoren lezen)",
  "hint_newest_last": "Bij veel afspeellijsten voegt YouTube nieuwe video’s achteraan toe. Leest de hele afspeellijst (ongeveer 1 verzoek per 100 video’s, max. 2000 items).",
  "rev_title": "Nieuwste staan achteraan – de afspeellijst wordt van achteren gelezen",
  "rev_short": "achterstevoren",
  "f_enabled": "Actief – meenemen bij “Alles controleren” en in het schema",
  "f_hits": "Nieuwe treffers",
  "hits_inbox": "Naar de inbox",
  "hits_auto": "Automatisch downloaden",
  "hint_inbox": "Treffers wachten in de inbox tot je ze downloadt of negeert.",
  "hint_auto": "Treffers die alle filters doorstaan, gaan direct naar de wachtrij.",
  "hint_channel": "YouTube-kanaal (…/@naam of …/channel/UC…, eventueel /videos of /streams) of SoundCloud-profiel (soundcloud.com/naam).",
  "hint_playlist": "YouTube-afspeellijst met “list=…” of SoundCloud-set (soundcloud.com/naam/sets/set). De nieuwste items worden gecontroleerd.",
  "f_platform": "Zoeken op",
  "detected": "herkend: {p} · {type}",
  "not_detected": "URL niet herkend",
  "suggested": "Suggestie",
  "suggested_title": "Voorgesteld op basis van de URL. Als je het ongewijzigd laat, vervangt de eerste controle het door de echte naam – of overschrijf het gewoon.",
  "hint_name_auto": "Voorgesteld op basis van de URL – pas het gerust aan. Ongewijzigd stelt de eerste controle de echte naam in.",
  "hint_name_later": "De naam wordt door de eerste controle ingesteld – of vul hem hier zelf in.",
  "name_auto_title": "Voorlopige naam – de volgende controle stelt de echte in",
  "hint_search": "Opgeslagen zoekopdracht, zoals onder “Ontdekken” – telt als één zoekopdracht per controle.",
  "hint_max": "per controle",
  "max_default": "(standaard)",
  "max_default_title": "Geen eigen waarde: “Items per bron” uit Instellingen › Schema geldt",
  "max_title": "Leeg = standaard uit Instellingen › Schema. Maximaal 200, 100 voor zoekbronnen.",
  "ph_name": "bijv. Gabber Vault",
  "ph_name_later": "wordt door de eerste controle ingesteld",
  "ph_channel": "https://www.youtube.com/@kanaal  of  https://soundcloud.com/naam",
  "ph_playlist": "https://www.youtube.com/playlist?list=…  of  https://soundcloud.com/naam/sets/…",
  "ph_search": "bijv. frenchcore liveset",
  "form_error": "De bron kon niet worden opgeslagen."
 },
 "downloads": {
  "title": "Downloads",
  "sub": "Na elkaar, steeds één download tegelijk",
  "pause": "Pauzeren",
  "resume": "Hervatten",
  "cancel": "Annuleren",
  "retry": "Opnieuw proberen",
  "remove": "Verwijderen",
  "up": "Omhoog",
  "down": "Omlaag",
  "eta": "Resterend",
  "position": "Positie {n}",
  "sleep_left": "gaat verder over",
  "sleep_why": "Beperking: willekeurige pauze van {min}–{max} s tussen twee downloads",
  "next_up": "Hierna",
  "sleeping": "Pauze",
  "sleep_range": "van {min}–{max} s",
  "blocked_wait": "Wachten – {why}",
  "why_backoff": "Backoff",
  "why_day": "Daglimiet",
  "why_run": "Runlimiet",
  "why_paused": "gepauzeerd",
  "why_restart": "Herstart nodig",
  "why_busy": "andere run actief",
  "why_pot": "PO-Token-server niet gereed",
  "why_target": "Doelmap onbereikbaar",
  "why_error": "Downloadmodule ontbreekt",
  "summary": "Vandaag {day}/{day_max} · Run {run}/{run_max}",
  "summary_sc": "SoundCloud {day}/{day_max}",
  "platform_blocked": "{reason}",
  "platform_other": "{p} blijft downloaden.",
  "steps": "Downloaden · Converteren · Taggen",
  "unlimited": "onbeperkt",
  "l_run": "Deze run",
  "l_day": "Vandaag",
  "l_rate": "Snelheidslimiet",
  "l_sleep": "Pauze tussen downloads",
  "sec_queue": "Wachtrij",
  "sec_failed": "Mislukt",
  "empty_title": "Wachtrij leeg",
  "empty_text": "Selecteer mixes onder “Ontdekken” of in de “Inbox”.",
  "paused": "<b>Wachtrij gepauzeerd.</b> De huidige download ligt stil totdat je hervat.",
  "backoff": "<b>Backoff actief tot {t}</b> (nog {rest}). Downloads, zoeken en volglijst zijn geblokkeerd.",
  "backoff_rest": {
   "one": "<b>Backoff actief tot {t}</b> (nog {rest}). Downloads, zoeken en volglijst zijn geblokkeerd – {n} blijft in de wachtrij.",
   "other": "<b>Backoff actief tot {t}</b> (nog {rest}). Downloads, zoeken en volglijst zijn geblokkeerd – {n} blijven in de wachtrij."
  },
  "limit_day": "<b>Daglimiet bereikt ({n}/{max}).</b> De rest blijft in de wachtrij en gaat morgen verder.",
  "limit_day_rest": {
   "one": "<b>Daglimiet bereikt ({n}/{max}).</b> {rest} blijft in de wachtrij en gaat morgen verder.",
   "other": "<b>Daglimiet bereikt ({n}/{max}).</b> {rest} blijven in de wachtrij en gaan morgen verder."
  },
  "limit_run": "<b>Limiet bereikt – {max}/{max} in deze run.</b> De rest blijft in de wachtrij en gaat in de volgende run verder.",
  "limit_run_rest": {
   "one": "<b>Limiet bereikt – {max}/{max} in deze run.</b> {rest} blijft in de wachtrij en gaat in de volgende run verder.",
   "other": "<b>Limiet bereikt – {max}/{max} in deze run.</b> {rest} blijven in de wachtrij en gaan in de volgende run verder."
  },
  "limits_link": "Limieten wijzigen",
  "new_run": "Nieuwe run starten",
  "need_restart": "<b>Herstart nodig.</b> yt-dlp is bijgewerkt – start HCLoader opnieuw. De wachtrij blijft bewaard.",
  "busy": "Er loopt nog een downloadrun (bijv. de geplande controle). De wachtrij wacht tot die klaar is.",
  "local_pot": {
   "one": "<b>PO-Token-server niet gereed.</b> {rest} blijft in de wachtrij en gaat verder zodra de server draait.",
   "other": "<b>PO-Token-server niet gereed.</b> {rest} blijven in de wachtrij en gaan verder zodra de server draait."
  },
  "local_target": {
   "one": "<b>Doelmap onbereikbaar of niet beschrijfbaar.</b> {rest} blijft in de wachtrij en gaat verder zodra de map weer beschikbaar is.",
   "other": "<b>Doelmap onbereikbaar of niet beschrijfbaar.</b> {rest} blijven in de wachtrij en gaan verder zodra de map weer beschikbaar is."
  },
  "local_error": {
   "one": "<b>De downloadmodule (yt-dlp) kon niet worden geladen.</b> {rest} blijft in de wachtrij. Volgende poging na “Hervatten”, nieuwe items of het opslaan van de instellingen.",
   "other": "<b>De downloadmodule (yt-dlp) kon niet worden geladen.</b> {rest} blijven in de wachtrij. Volgende poging na “Hervatten”, nieuwe items of het opslaan van de instellingen."
  },
  "local_link_pot": "Netwerkinstellingen",
  "local_link_target": "Opslaglocatie wijzigen",
  "local_link_error": "Onderhoud"
 },
 "library": {
  "title": "Bibliotheek",
  "sub": {
   "one": "{n} mix",
   "other": "{n} mixes"
  },
  "sub_shown": "{n} van {total} getoond",
  "search": "Titel, kanaal of pad …",
  "all_genres": "Alle genres",
  "all_channels": "Alle kanalen",
  "all_years": "Alle jaren",
  "f_genre": "Genre",
  "f_channel": "Kanaal",
  "f_year": "Jaar",
  "f_sort": "Sorteren",
  "sort_newest": "Nieuwste eerst",
  "sort_title": "Titel A–Z",
  "sort_channel": "Kanaal A–Z",
  "sort_duration": "Langste eerst",
  "view_list": "Lijst",
  "view_grid": "Tegels",
  "clear": "Filters herstellen",
  "col_title": "Titel",
  "col_channel": "Kanaal",
  "col_genre": "Genre",
  "col_year": "Jaar",
  "col_duration": "Duur",
  "col_size": "Grootte",
  "col_loaded": "Gedownload",
  "play": "Afspelen",
  "pause": "Pauzeren",
  "play_external": "Openen in standaardspeler",
  "play_internal": "Afspelen in de app-speler",
  "play_missing": "Bestand ontbreekt – kan niet worden afgespeeld",
  "more": "Nog {n} tonen",
  "now_playing": "Nu aan het afspelen",
  "retag_short": "Opnieuw taggen",
  "genre_working": "Genre instellen …",
  "open_folder": "Map openen",
  "retag": "Opnieuw taggen (tags, cover en locatie volgens de huidige instellingen)",
  "delete": "Bestand verwijderen",
  "remove": "Item verwijderen",
  "retagging": "Opnieuw taggen …",
  "cue_title": "Tracklist als .cue-bestand naast de MP3",
  "missing": "Bestand ontbreekt",
  "missing_title": "Het bestand is niet gevonden op de opgeslagen locatie (verplaatst of verwijderd?)",
  "missing_chip": {
   "one": "{n} ontbreekt",
   "other": "{n} ontbreken"
  },
  "missing_chip_title": "Alleen items tonen waarvan het bestand ontbreekt",
  "stat_count": "Mixes",
  "stat_duration": "Totale duur",
  "stat_size": "Grootte",
  "stat_genres": "Per genre",
  "unit_h": "u",
  "unit_min": "min",
  "unit_gb": "GB",
  "unit_mb": "MB",
  "unit_kb": "KB",
  "group_meta": {
   "one": "{n} mix · {dur}",
   "other": "{n} mixes · {dur}"
  },
  "empty_title": "Nog niets gedownload",
  "empty_text": "Elke mix verschijnt hier zodra hij is gedownload en getagd – met cover, genre en locatie.",
  "empty_discover": "Mixes ontdekken",
  "empty_watchlist": "Volglijst instellen",
  "target_down": "Doelmap onbereikbaar: {path}",
  "target_down_hint": "Controleer de schijf of netwerkmap. Zolang die ontbreekt, is de toestand van de bestanden onbekend: “Opnieuw taggen” en “Item verwijderen” zijn uitgeschakeld.",
  "unknown_title": "Doelmap onbereikbaar – toestand van het bestand onbekend",
  "none_title": "Geen resultaten",
  "none_text": "Geen enkel item komt overeen met de zoekopdracht en filters.",
  "group_by": "Groeperen op",
  "group_none": "Geen",
  "group_genre": "Genre",
  "group_festival": "Festival",
  "group_artist": "Artiest",
  "group_year": "Jaar",
  "group_unknown": "Onbekend"
 },
 "player": {
  "label": "Miniplayer",
  "play": "Afspelen (spatie)",
  "pause": "Pauzeren (spatie)",
  "back": "30 seconden terug",
  "fwd": "30 seconden vooruit",
  "prev": "Vorige track",
  "next": "Volgende track",
  "seek": "Positie",
  "mute": "Dempen",
  "unmute": "Geluid aan",
  "volume": "Volume",
  "close": "Speler sluiten",
  "tracks": "Tracklist",
  "tracks_n": {
   "one": "{n} track",
   "other": "{n} tracks"
  },
  "tracks_toggle": "Tracklist tonen/verbergen",
  "no_tracks": "Geen hoofdstukken in dit bestand",
  "total": "Totale duur {t}",
  "keys": "Spatie: afspelen/pauzeren · ←/→: 10 s",
  "err_load": "Kan niet worden afgespeeld",
  "err_src": "Kan niet worden afgespeeld: ongeldig bestandsadres",
  "err_play": "Het bestand kan niet worden afgespeeld: {title}",
  "external": "Openen in standaardspeler …"
 },
 "log": {
  "title": "Logboek",
  "sub": "Live logboek en runhistorie",
  "live": "Live logboek",
  "history": "Runhistorie",
  "lvl_debug": "Debug",
  "lvl_info": "Info",
  "lvl_warn": "Waarschuwing",
  "lvl_error": "Fout",
  "lvl_title": "Niveau “{lvl}” tonen/verbergen",
  "search": "Logboek doorzoeken …",
  "following": "Live",
  "paused": "Gepauzeerd",
  "follow_title": "Automatisch naar de nieuwste regel scrollen (pauzeert bij omhoog scrollen)",
  "jump": "Naar einde",
  "jump_new": {
   "one": "{n} nieuwe regel",
   "other": "{n} nieuwe regels"
  },
  "copy": "Kopiëren",
  "copy_title": "Zichtbare regels naar het klembord kopiëren",
  "open_logs": "Logmap",
  "open_logs_title": "De map met de volledige logbestanden openen",
  "lines": {
   "one": "{n} regel",
   "other": "{n} regels"
  },
  "lines_of": "{n} van {total} regels",
  "empty": "Geen regels voor deze niveaus.",
  "empty_search": "Geen enkele regel bevat “{q}”.",
  "no_runs": "Nog geen runs.",
  "no_runs_kind": "Geen runs van dit soort.",
  "found": "gevonden",
  "downloaded": "gedownload",
  "errors": "fouten",
  "running": "bezig …",
  "kind_all": "Alles",
  "timeline": "Tijdlijn",
  "table": "Tabel",
  "view_title": "Weergave van de runhistorie",
  "col_kind": "Soort",
  "col_start": "Start",
  "col_duration": "Duur",
  "col_found": "Gevonden",
  "col_downloaded": "Gedownload",
  "col_errors": "Fouten",
  "col_note": "Opmerking",
  "backoff": "Backoff",
  "runs_sum": {
   "one": "{n} run · {dl} gedownload · {err} fouten",
   "other": "{n} runs · {dl} gedownload · {err} fouten"
  },
  "today": "Vandaag",
  "yesterday": "Gisteren"
 },
 "settings": {
  "title": "Instellingen",
  "sub": "Alles wat de app doet, is hier in te stellen"
 },
 "tabs": {
  "general": "Algemeen",
  "filters": "Filters en trefwoorden",
  "genres": "Genres",
  "download": "Download en kwaliteit",
  "storage": "Opslag en tags",
  "throttle": "Beperkingen",
  "soundcloud": "SoundCloud",
  "network": "Netwerk en PO-Token",
  "schedule": "Schema",
  "appearance": "Uiterlijk",
  "maintenance": "Onderhoud",
  "festivals": "Festivals & reeksen"
 },
 "tabs_hint": {
  "general": "Basisgedrag van de app.",
  "filters": "Standaardfilters voor zoeken en volglijst. Tijdelijk te overschrijven in het filterpaneel onder “Ontdekken”.",
  "genres": "Volgorde = prioriteit. Het eerste genre waarvan een trefwoord in de titel voorkomt, wint. Handmatig ingestelde genres en het standaardgenre van een bron gaan voor.",
  "download": "YouTube levert meestal Opus met ongeveer 130–160 kbps. MP3 is een conversie en klinkt niet beter dan de bron – maar speelt overal af.",
  "storage": "Waar de bestanden komen en hoe ze heten. De structuur is ontworpen voor mediaservers zoals Plex of Jellyfin.",
  "throttle": "Beperkt de belasting van YouTube. Deze waarden gelden samen voor zoeken, volglijst en downloads. SoundCloud heeft eigen waarden op het tabblad “SoundCloud”.",
  "soundcloud": "SoundCloud als tweede bron voor zoeken, volglijst en downloads – met eigen limieten, tellers en backoff, onafhankelijk van YouTube.",
  "network": "Het PO-Token laat verzoeken eruitzien als van een echte browser en verkleint het risico op botblokkades.",
  "schedule": "Wanneer de volglijst automatisch wordt gecontroleerd – in de app en via de Windows-taakplanner.",
  "appearance": "Look-and-feel. Wijzigingen zijn direct te zien en worden pas permanent na opslaan.",
  "maintenance": "Versies, updates, database.",
  "festivals": "Herkent festival of reeks, jaar, stage en soort set uit de opgeslagen titels – offline, zonder één extra verzoek."
 },
 "set": {
  "default": "Standaard",
  "range": "Bereik",
  "browse": "Bladeren",
  "not_set": "niet ingesteld",
  "saving": "Opslaan …",
  "discard": "Verwerpen",
  "tab_reset": "Tabblad herstellen",
  "tab_reset_title": "Alle velden van dit tabblad op de standaardwaarden zetten (pas van kracht na “Opslaan”)",
  "state_clean": "Alles opgeslagen",
  "state_dirty": {
   "one": "{n} niet-opgeslagen wijziging",
   "other": "{n} niet-opgeslagen wijzigingen"
  },
  "state_errors": {
   "one": "{n} fout – corrigeer deze",
   "other": "{n} fouten – corrigeer deze"
  },
  "h": {
   "search": "Zoeken",
   "duration": "Duur en periode",
   "keywords": "Trefwoorden",
   "display": "Weergave",
   "cover": "Cover",
   "chapters": "Hoofdstukken en tracklist",
   "tags": "Tags",
   "soundcloud": "SoundCloud",
   "playback": "Afspelen",
   "pauses": "Pauzes en bandbreedte",
   "limits": "Limieten",
   "backoff": "Backoff bij blokkade",
   "po": "PO-Token-provider",
   "fallback": "Noodoplossingen",
   "in_app": "In de app",
   "task": "Windows-taakplanner",
   "updates": "Updates",
   "app_update": "App-update",
   "release_notes": "Release-opmerkingen",
   "database": "Database",
   "reset": "Herstellen",
   "detection": "Herkenning",
   "series": "Reeksen"
  },
  "general": {
   "language": {
    "label": "Taal",
    "help": "Taal van de interface en meldingen. “Automatisch” volgt de weergavetaal van Windows (anders Engels). De weergave wordt direct na het opslaan opnieuw opgebouwd."
   },
   "start_view": {
    "label": "Startweergave",
    "help": "Welke weergave na het starten opent."
   },
   "log_level": {
    "label": "Logniveau",
    "help": "Hoe gedetailleerd het logbestand en het live logboek zijn. DEBUG alleen voor probleemoplossing."
   },
   "confirm_delete": {
    "label": "Verwijderen bevestigen",
    "help": "Vragen voordat een mix uit de bibliotheek wordt verwijderd (item + bestand)."
   }
  },
  "player": {
   "mode": {
    "label": "Afspelen met",
    "help": "Wat ▶ in de bibliotheek gebruikt. De ingebouwde speler toont hoofdstukken als sprongmarkeringen en speelt door als je van weergave wisselt. De andere optie is per item beschikbaar in het menu."
   }
  },
  "search": {
   "results_count": {
    "label": "Resultaten per zoekopdracht",
    "help": "Aantal resultaten dat een zoekopdracht ophaalt (licht). Meer resultaten = meer belasting van YouTube."
   },
   "append_year": {
    "label": "Jaar aan zoekopdracht toevoegen",
    "help": "Bij de uploadperiode “Specifiek jaar” wordt het jaar aan de zoekterm toegevoegd (bijv. “hardcore liveset 2013”). Zo vindt YouTube meer mixes uit dat jaar."
   }
  },
  "filters": {
   "min_duration": {
    "label": "Minimale lengte",
    "help": "Kortere video’s worden nooit als mix beschouwd."
   },
   "max_duration": {
    "label": "Maximale lengte",
    "help": "0 = onbeperkt."
   },
   "upload_period": {
    "label": "Uploadperiode",
    "help": "Welke uploads standaard worden getoond. “Specifiek jaar” toont alleen mixes uit één jaar, “Aangepast” een van/tot-bereik."
   },
   "upload_year": {
    "label": "Jaar",
    "help": "Een mix telt mee als het uploadjaar overeenkomt of het jaar in de titel staat. De zoekfunctie van YouTube geeft alleen een geschatte datum – daar geldt ±1 jaar."
   },
   "upload_from": {
    "label": "Van",
    "help": "Vroegste uploaddatum. Leeg = open."
   },
   "upload_to": {
    "label": "Tot",
    "help": "Laatste uploaddatum. Leeg = open. Bij geschatte datums geldt aan beide kanten een marge van ±1 jaar."
   },
   "include_keywords": {
    "label": "Verplichte trefwoorden",
    "help": "Minstens één moet in de titel staan. Leeg = alles toestaan. Enter of komma voegt toe."
   },
   "exclude_keywords": {
    "label": "Uitgesloten trefwoorden",
    "help": "Als een ervan in de titel staat, wordt de video verworpen."
   },
   "match_description": {
    "label": "Beschrijving doorzoeken",
    "help": "Controleer trefwoorden ook in de videobeschrijving. Lichte zoekopdrachten leveren die vaak niet."
   },
   "hide_done_ignored": {
    "label": "Gedownload en genegeerd verbergen",
    "help": "Reeds gedownloade en genegeerde video’s in de resultaten verbergen."
   },
   "apply_channel_blacklist": {
    "label": "Kanaalzwarte lijst toepassen",
    "help": "Video’s van geblokkeerde kanalen nooit tonen."
   },
   "hide_cross_platform_duplicates": {
    "label": "Platformduplicaten verbergen",
    "help": "Treffers verbergen die waarschijnlijk al van het andere platform (YouTube of SoundCloud) zijn gedownload of in de wachtrij staan – dezelfde duur (±5 s) en zeer vergelijkbare titel. Uit: ze verschijnen met de opmerking “Waarschijnlijk al gedownload”."
   }
  },
  "blacklist": {
   "label": "Geblokkeerde kanalen",
   "help": "Je blokkeert kanalen via het menu van een kaart. Hier kun je ze weer deblokkeren.",
   "none": "Geen kanalen geblokkeerd",
   "unblock": "Deblokkeren"
  },
  "genres": {
   "add": "Genre",
   "up": "Hogere prioriteit",
   "down": "Lagere prioriteit",
   "delete": "Genre verwijderen",
   "color": "Kleur kiezen",
   "name_ph": "Naam",
   "kw_ph": "+ trefwoord",
   "fallback": "Terugval – geldt als geen trefwoord overeenkomt. Altijd aanwezig, altijd laatst."
  },
  "download": {
   "audio_format": {
    "label": "Uitvoerformaat",
    "help": "MP3, of het origineel van YouTube behouden zonder conversie."
   },
   "mp3_quality": {
    "label": "MP3-kwaliteit",
    "help": "320 kbps CBR is het meest compatibel, V0 VBR bespaart wat ruimte."
   },
   "embed_cover": {
    "label": "Cover insluiten",
    "help": "De thumbnail, vierkant bijgesneden, als cover in het bestand schrijven."
   },
   "write_cover_jpg": {
    "label": "Ook cover.jpg opslaan",
    "help": "Voor mediaservers die mapcovers lezen."
   },
   "write_cue": {
    "label": ".cue-bestand schrijven",
    "help": "Tracklist uit hoofdstukken of tijdstempels in de beschrijving, naast het audiobestand."
   },
   "write_id3_chapters": {
    "label": "ID3-hoofdstukken schrijven",
    "help": "Hoofdstukmarkeringen (CHAP/CTOC) direct in de MP3 insluiten."
   },
   "keep_original_soundcloud": {
    "label": "SoundCloud-origineel behouden",
    "help": "SoundCloud-audio ongewijzigd opslaan (AAC 160 kbps als .m4a, MP3 128 kbps als .mp3) – geen tweede lossy conversie. Uit: zoals “Uitvoerformaat”."
   }
  },
  "storage": {
   "target_dir": {
    "label": "Doelmap",
    "help": "Hoofdmap van de muziekopslag. Tijdelijke bestanden staan in “.tmp” eronder. In de draagbare versie wordt een relatief pad zoals “.\\Music” opgelost ten opzichte van de app-map (bijv. op een USB-stick)."
   },
   "path_template": {
    "label": "Padpatroon",
    "help": "Relatief ten opzichte van de doelmap, zonder bestandsextensie. “/” scheidt mappen. {id} moet erin staan (bij SoundCloud “sc-<id>”). {platform} wordt “YouTube” of “SoundCloud” – bijv. als bovenste map om de bronnen te scheiden."
   },
   "max_title_length": {
    "label": "Max. titellengte",
    "help": "Langere titels worden in de bestandsnaam ingekort."
   },
   "max_path_length": {
    "label": "Max. padlengte",
    "help": "Volledig pad inclusief de doelmap. Zonder extra configuratie staat Windows 259 tekens toe."
   },
   "artist_from_title": {
    "label": "Artiest uit titel halen",
    "help": "De patronen “ARTIEST @ EVENEMENT” en “ARTIEST - TITEL” herkennen, anders de kanaalnaam gebruiken."
   },
   "title_cleanup_patterns": {
    "label": "Titel opschonen",
    "help": "Reguliere expressies waarvan de treffers uit de titel worden verwijderd. Enter voegt toe.",
    "ph": "+ regex"
   },
   "album_from_edition": {
    "label": "Album = editie",
    "help": "Schrijft de editie (bijv. “Defqon.1 2024”) als albumtag, zodat Plex en Jellyfin alle sets van een festival als één album tonen. Uit: album = titel, zoals voorheen."
   }
  },
  "path_preview": {
   "label": "Voorbeeld",
   "help": "Klik op plaatsaanduidingen om ze in het padpatroon in te voegen.",
   "fest": "{festival}, {event_year} en {stage} zijn alleen gevuld als er een festival is toegewezen. Anders vervallen ze, samen met overgebleven scheidingstekens en lege mappen."
  },
  "throttle": {
   "sleep_requests": {
    "label": "Pauze tussen verzoeken",
    "help": "Wachttijd tussen metadataverzoeken (zoeken, volglijst)."
   },
   "sleep_interval": {
    "label": "Downloadpauze – minimum",
    "help": "Na elke download volgt een willekeurige pauze tussen minimum en maximum."
   },
   "max_sleep_interval": {
    "label": "Downloadpauze – maximum",
    "help": "Bovengrens van de willekeurige pauze."
   },
   "limit_rate_mb": {
    "label": "Downloadsnelheid",
    "help": "Maximale bandbreedte. 0 = onbeperkt (niet aanbevolen)."
   },
   "max_downloads_per_run": {
    "label": "Max. downloads per run",
    "help": "De rest blijft in de wachtrij."
   },
   "max_downloads_per_day": {
    "label": "Max. downloads per dag",
    "help": "De teller omvat handmatige en automatische downloads samen."
   },
   "max_searches_per_hour": {
    "label": "Max. zoekopdrachten per uur",
    "help": "Beschermt tegen per ongeluk non-stop zoeken."
   },
   "backoff_initial_hours": {
    "label": "Backoff – beginwaarde",
    "help": "Blokkeertijd na HTTP 429 of “bevestig dat je geen bot bent”."
   },
   "backoff_max_hours": {
    "label": "Backoff – maximum",
    "help": "De blokkeertijd verdubbelt bij elke volgende blokkade tot deze waarde."
   }
  },
  "backoff": {
   "none": "Geen backoff actief ({p})",
   "none_detail": "Zoeken, volglijst en downloads van {p} zijn toegestaan.",
   "active": "Backoff actief ({p})",
   "active_detail": "tot {t} · nog {rest} · niveau {level}",
   "blocked": "{p} meldde een blokkade. Zoeken, volglijst en downloads van {p} zijn geblokkeerd tot de tijd is verstreken.",
   "clear": "Handmatig opheffen",
   "sc_off": "SoundCloud staat uit",
   "sc_off_detail": "Geen SoundCloud-zoekopdrachten, geen volglijstcontroles en geen downloads van SoundCloud."
  },
  "soundcloud": {
   "enabled": {
    "label": "SoundCloud gebruiken",
    "help": "Uit: geen SoundCloud-zoekopdrachten, geen controle van SoundCloud-bronnen en geen SoundCloud-downloads. Reeds gedownloade items blijven in de bibliotheek."
   },
   "sleep_requests": {
    "label": "Pauze tussen verzoeken",
    "help": "Wachttijd tussen metadataverzoeken aan SoundCloud (zoeken, volglijst)."
   },
   "sleep_interval": {
    "label": "Downloadpauze – minimum",
    "help": "Na elke SoundCloud-download volgt een willekeurige pauze tussen minimum en maximum."
   },
   "max_sleep_interval": {
    "label": "Downloadpauze – maximum",
    "help": "Bovengrens van de willekeurige pauze."
   },
   "limit_rate_mb": {
    "label": "Downloadsnelheid",
    "help": "Maximale bandbreedte. 0 = onbeperkt (niet aanbevolen)."
   },
   "max_downloads_per_run": {
    "label": "Max. downloads per run",
    "help": "Aparte teller voor SoundCloud. De rest blijft in de wachtrij."
   },
   "max_downloads_per_day": {
    "label": "Max. downloads per dag",
    "help": "Aparte teller voor SoundCloud, handmatige en automatische downloads samen."
   },
   "max_searches_per_hour": {
    "label": "Max. zoekopdrachten per uur",
    "help": "Aparte teller voor SoundCloud."
   },
   "backoff_initial_hours": {
    "label": "Backoff – beginwaarde",
    "help": "Blokkeertijd nadat SoundCloud te veel verzoeken meldde (HTTP 429)."
   },
   "backoff_max_hours": {
    "label": "Backoff – maximum",
    "help": "De blokkeertijd verdubbelt bij elke volgende blokkade tot deze waarde."
   }
  },
  "ladder": {
   "label": "Niveaus",
   "help": "Hoe de blokkeertijd groeit met de huidige waarden.",
   "reset": "Herstellen na een geslaagde run",
   "invalid": "Ongeldige waarden"
  },
  "network": {
   "po_token_mode": {
    "label": "Modus",
    "help": "bgutil-plug-in voor yt-dlp. Script start Deno wanneer nodig, HTTP houdt een lokale server draaiend."
   },
   "po_token_port": {
    "label": "HTTP-poort",
    "help": "Alleen HTTP-modus. De server luistert op 127.0.0.1."
   },
   "po_token_ttl_hours": {
    "label": "Geldigheid van token",
    "help": "Na deze tijd wordt een nieuw token gegenereerd. De waarde wordt afgerond op hele uren (minstens 1 u)."
   },
   "cookies_from_browser": {
    "label": "Cookies uit browser",
    "help": "Meldt yt-dlp aan met je browserlogin. Alleen inschakelen als het zonder niet meer werkt."
   },
   "proxy": {
    "label": "Proxy",
    "help": "Optioneel, bijv. socks5://127.0.0.1:1080. Leeg = directe verbinding.",
    "ph": "geen proxy"
   }
  },
  "po": {
   "active": "PO-Token actief",
   "inactive": "PO-Token inactief",
   "error": "PO-Token-fout",
   "mode": "Modus",
   "test": "Testen",
   "testing": "Testen …",
   "test_ok": "Test geslaagd.",
   "test_fail": "Test mislukt.",
   "unsaved": "De test gebruikt de opgeslagen instellingen. Sla eerst je wijzigingen op."
  },
  "cookies": {
   "warn_off": "<b>Aanbevolen: uit.</b> PO-Token en browsercookies samen kunnen problemen veroorzaken.",
   "warn_on": "<b>Noodoplossing actief.</b> PO-Token en browsercookies samen kunnen tot fouten of blokkades leiden, en je YouTube-account wordt voor de verzoeken gebruikt. Zet het weer uit zodra het zonder werkt. Cookies komen nooit in het logboek."
  },
  "schedule": {
   "in_app_check": {
    "label": "Controleren terwijl de app draait",
    "help": "De volglijst wordt op het ingestelde interval gecontroleerd zolang het venster open is."
   },
   "watchlist_interval_hours": {
    "label": "Interval",
    "help": "Tijd tussen twee controles in de app."
   },
   "entries_per_source": {
    "label": "Items per bron",
    "help": "Hoeveel van de nieuwste items per controle worden opgehaald (licht) (standaard voor nieuwe bronnen)."
   },
   "task_scheduler_enabled": {
    "label": "Taakplanner gebruiken",
    "help": "Controleert de volglijst ook als de app gesloten is (headless). Wordt ingeschakeld door “Taak maken”."
   },
   "task_time": {
    "label": "Tijd",
    "help": "Dagelijkse starttijd van de geplande taak."
   }
  },
  "next": {
   "title": "Volgende controle",
   "off": "Geen automatische controle",
   "off_detail": "Noch de controle in de app, noch de Windows-taak is actief. De volglijst wordt alleen handmatig gecontroleerd.",
   "app_detail": "In de app, elke {h} u – zolang HCLoader draait.",
   "task_detail": "Via de Windows-taakplanner, dagelijks om {time} – ook als de app gesloten is.",
   "any_detail": "De vroegste van het app-interval en de Windows-taak.",
   "also_task": "Ook: Windows-taak dagelijks om {time}.",
   "also_app": "Ook in de app elke {h} u.",
   "pending": "Nog niet gepland",
   "pending_detail": "De app bepaalt de volgende datum zodra hij de volglijst voor het eerst heeft gecontroleerd.",
   "due": "Aan de beurt – start zo meteen",
   "backoff": "<b>Backoff actief.</b> Geen controles tot {t}; de datum wordt daarna ingehaald of overgeslagen.",
   "unsaved": "Niet-opgeslagen schemawijzigingen werken pas na opslaan."
  },
  "task": {
   "loading": "Taak opvragen …",
   "registered": "Taak geregistreerd",
   "registered_detail": "{name} · dagelijks {time} · volgende run {next}",
   "none": "Geen taak geregistreerd",
   "none_detail": "Maakt een dagelijkse Windows-taak om {time} (schtasks).",
   "create": "Taak maken",
   "remove": "Taak verwijderen",
   "moved": "App is verplaatst – maak de taak opnieuw",
   "moved_detail": "De geplande taak start nog steeds {cmd}. Opnieuw maken gebruikt de huidige app-map.",
   "recreate": "Taak opnieuw maken",
   "unknown": "Taakstatus onbekend",
   "unknown_detail": "De Windows-taakplanner reageerde niet. De instelling blijft ongewijzigd.",
   "recheck": "Opnieuw controleren"
  },
  "appearance": {
   "reduce_effects": {
    "label": "Effecten verminderen",
    "help": "Schakelt scanlines, glitch en alle animaties uit."
   },
   "scanlines": {
    "label": "Scanlines en ruis",
    "help": "Fijne overlay over de hele interface."
   },
   "pulse_bpm": {
    "label": "Kickpuls",
    "help": "De beat waarop de voortgangsbalk pulseert."
   }
  },
  "pulse_preview": {
   "label": "Voorbeeld",
   "help": "Zo pulseert een lopende download.",
   "off": "Effecten verminderd"
  },
  "versions": {
   "plugin": "PO-Token-plug-in",
   "was": "eerder {v}"
  },
  "update": {
   "label": "yt-dlp en plug-in",
   "help": "YouTube verandert voortdurend. Werk bij fouten eerst bij (pip in de venv).",
   "button": "yt-dlp en plug-in bijwerken",
   "running": "Bijwerken …",
   "last_check": "Laatste controle",
   "restart": "<b>Herstart nodig.</b> yt-dlp is bijgewerkt. Zoeken en downloads zijn geblokkeerd totdat HCLoader opnieuw is gestart; de wachtrij blijft bewaard.",
   "restart_title": "Herstart nodig",
   "restart_text": "yt-dlp is bijgewerkt. Sluit HCLoader en start het opnieuw – tot dan zijn zoeken en downloads geblokkeerd, de wachtrij blijft bewaard.",
   "out_live": "Uitvoer · loopt al {t}",
   "out_done": "Uitvoer · klaar na {t}",
   "out_failed": "Uitvoer · mislukt",
   "out_last": "Uitvoer",
   "waiting": "pip starten …"
  },
  "maintenance": {
   "check_updates_on_start": {
    "label": "Bij start op updates controleren",
    "help": "yt-dlp en PO-Token-plug-in, hooguit één keer per dag."
   },
   "check_app_updates_on_start": {
    "label": "Bij start op HCLoader-updates controleren",
    "help": "Vraagt GitHub één keer per start om een nieuwe versie. Er wordt niets gedownload totdat je klikt."
   },
   "apply_update_on_exit": {
    "label": "Update installeren bij afsluiten",
    "help": "Een gedownloade update wordt geïnstalleerd wanneer HCLoader sluit (“Later”). Uit: hij wordt bij de volgende start opnieuw aangeboden."
   },
   "update_repo": {
    "label": "Updatebron (GitHub)",
    "help": "Repo in het formaat “eigenaar/repo”. Alleen wijzigen voor forks."
   }
  },
  "db": {
   "label": "Database",
   "help": "Status van alle video’s, bronnen en runs. Een back-up kopieert het bestand naar de map “backups”.",
   "backup": "DB-back-up maken",
   "backing_up": "Back-up maken …",
   "open": "Gegevensmap",
   "open_logs": "Logmap",
   "open_title": "De map met database, configuratie en back-ups openen",
   "open_logs_title": "De map met de logbestanden openen",
   "info": {
    "one": "{n} item · {mb} MB",
    "other": "{n} items · {mb} MB"
   },
   "last": "Laatste back-up",
   "never": "nog geen",
   "keep": "De 10 nieuwste back-ups blijven bewaard, oudere worden bij de volgende back-up verwijderd.",
   "backups": "Back-ups",
   "backups_more": "+ {n} oudere in de map “backups”",
   "fresh": "nieuw"
  },
  "reset_all": {
   "label": "Alle instellingen",
   "help": "Zet alle tabbladen terug op de standaardwaarden. Database en muziekbestanden blijven onaangeroerd.",
   "button": "Alles herstellen"
  },
  "festivals": {
   "detect": {
    "label": "Automatisch herkennen",
    "help": "Wijst festival of reeks, jaar, stage en soort set toe aan nieuwe resultaten en downloads. Handmatig ingestelde waarden worden nooit overschreven."
   },
   "min_confidence": {
    "label": "Herkenningsdrempel",
    "help": "Zekerheid vanaf waar een treffer wordt toegewezen. Daaronder verschijnt hij alleen als suggestie die je kunt overnemen."
   },
   "year_from_upload_date": {
    "label": "Jaar uit de uploaddatum",
    "help": "Staat er geen jaartal in de titel, dan geldt het uploadjaar (telt als minder zeker)."
   },
   "match_description": {
    "label": "Ook de beschrijving doorzoeken",
    "help": "Zoekt festivalnamen ook in de opgeslagen beschrijving."
   },
   "extra_stages": {
    "label": "Extra stages",
    "help": "Stagenamen naast de ingebouwde (RED, BLUE, BLACK, UV, Mainstage …).",
    "ph": "+ stage"
   }
  },
  "fest_types": {
   "label": "Eigen termen voor soorten sets",
   "help": "Woorden in de titel die op een soort set wijzen. Ze worden vóór de ingebouwde termen gecontroleerd.",
   "ph": "Term in de titel",
   "add": "Term"
  },
  "fest_test": {
   "label": "Titel testen",
   "help": "Toont wat de herkenning in een titel vindt. Er wordt niets opgeslagen; de opgeslagen instellingen gelden.",
   "ph": "bijv. Defqon.1 2024 | RED | Closing Ceremony",
   "none": "Niets herkend",
   "assigned": "zou worden toegewezen",
   "suggested": "alleen suggestie"
  },
  "fest_status": {
   "title": "{assigned} van {total} mixes toegewezen",
   "last": "Laatste doorloop",
   "help": "Loopt offline over de bestaande bibliotheek. Handmatige waarden blijven; bestanden worden niet opnieuw getagd of verplaatst.",
   "button": "Festivals nu toewijzen",
   "running": "Toewijzen … {done} / {total}"
  },
  "series": {
   "hint": "Bekende festivals, radioshows en podcasts. Wijzigingen in deze lijst worden direct opgeslagen.",
   "add": "Reeks",
   "show_hidden": "Verborgen tonen",
   "reset_all": "Ingebouwde reeksen herstellen",
   "builtin": "ingebouwd",
   "own": "eigen",
   "modified": "aangepast",
   "hidden": "verborgen",
   "no_aliases": "geen aliassen",
   "enable": "Deze reeks herkennen",
   "hide": "Verbergen",
   "restore": "Terugzetten",
   "new_title": "Nieuwe reeks",
   "edit_title": "Reeks bewerken",
   "name": "Naam",
   "kind": "Soort",
   "default_genre": "Standaardgenre",
   "aliases": "Aliassen",
   "aliases_help": "Andere schrijfwijzen. Eén treffer in de titel volstaat.",
   "weak_aliases": "Zwakke aliassen",
   "weak_help": "Alledaagse woorden die alleen samen met een jaartal tellen.",
   "variants": "Varianten",
   "variants_help": "Eigen edities, bijv. Australia of at Home.",
   "channels": "Kanalen van de organisator",
   "channels_help": "Kanaalnaam, ID of URL. Verhoogt alleen de zekerheid."
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
    "auto": "Automatisch (systeemtaal)"
   }
  },
  "player": {
   "mode": {
    "internal": "Ingebouwde speler (aanbevolen)",
    "external": "Windows-standaardspeler"
   }
  },
  "download": {
   "audio_format": {
    "mp3": "MP3",
    "original": "Origineel (Opus/M4A, geen conversie)"
   },
   "mp3_quality": {
    "320": "320 kbps CBR",
    "v0": "V0 VBR"
   }
  },
  "network": {
   "cookies_from_browser": {
    "none": "Uit",
    "edge": "Edge",
    "chrome": "Chrome",
    "firefox": "Firefox",
    "brave": "Brave"
   }
  }
 },
 "dlg": {
  "block": {
   "title": "Kanaal blokkeren",
   "text": "Video’s van “{ch}” worden niet meer getoond. Ongedaan maken kan onder Instellingen › Filters en trefwoorden.",
   "ok": "Blokkeren"
  },
  "ignore_all": {
   "title": "Treffers negeren",
   "text": {
    "one": "{n} treffer in de inbox als genegeerd markeren? Hij wordt niet gedownload en verschijnt niet meer in de inbox.",
    "other": "{n} treffers in de inbox als genegeerd markeren? Ze worden niet gedownload en verschijnen niet meer in de inbox."
   },
   "ok": "Negeren"
  },
  "del_source": {
   "title": "Bron verwijderen",
   "text": "“{name}” uit de volglijst verwijderen? Reeds gedownloade mixes blijven bewaard."
  },
  "del_mix": {
   "title": "Mix verwijderen",
   "text": "“{title}” wordt uit de bibliotheek verwijderd en het bestand wordt van schijf gewist:",
   "ok": "Bestand verwijderen",
   "warn": "<b>Dit kan niet ongedaan worden gemaakt.</b> Het audiobestand en een bijbehorend .cue-bestand worden gewist. De mix wordt als “genegeerd” gemarkeerd en <b>wordt niet opnieuw gedownload</b>.",
   "meta": "{dur} · {size}"
  },
  "outside_mix": {
   "title": "Alleen item verwijderen",
   "text": "Het bestand van “{title}” staat buiten de huidige doelmap en wordt daarom niet gewist:",
   "ok": "Alleen item verwijderen",
   "warn": "Het bestand blijft onaangeroerd staan waar het staat. Het item verdwijnt uit de bibliotheek, de mix wordt als “genegeerd” gemarkeerd en <b>wordt niet opnieuw gedownload</b>."
  },
  "remove_mix": {
   "title": "Item verwijderen",
   "text": "Het bestand van “{title}” is niet gevonden op de opgeslagen locatie:",
   "ok": "Item verwijderen",
   "warn": "Het item verdwijnt uit de bibliotheek. De mix wordt als “genegeerd” gemarkeerd en <b>wordt niet opnieuw gedownload</b>. Als het bestand ergens anders staat, blijft het onaangeroerd."
  },
  "backoff": {
   "title": "Backoff opheffen",
   "ok": "Toch opheffen",
   "text": "De blokkeertijd beschermt je: {p} meldde dat er te veel verzoeken binnenkwamen.",
   "warn": "<b>Hef alleen op als je zeker weet dat de blokkade voorbij is.</b> Als de app te vroeg opnieuw toegang probeert, kan {p} je IP langer of permanent beperken."
  },
  "reset_all": {
   "title": "Alles herstellen",
   "text": "Alle instellingen op alle tabbladen worden direct op de standaardwaarden gezet en opgeslagen.",
   "ok": "Herstellen"
  },
  "series_delete": {
   "title": "Reeks verwijderen?",
   "text": "“{name}” en de bijbehorende edities worden verwijderd.",
   "warn": {
    "one": "{n} mix verliest zijn toewijzing.",
    "other": "{n} mixes verliezen hun toewijzing."
   }
  },
  "series_hide": {
   "title": "Reeks verbergen?",
   "text": "“{name}” wordt niet meer herkend. Met “Verborgen tonen” haal je hem terug."
  },
  "series_reset": {
   "title": "Ingebouwde reeksen herstellen?",
   "text": "Alle ingebouwde reeksen keren terug naar de oorspronkelijke staat, verborgen reeksen komen terug. Je eigen reeksen blijven.",
   "ok": "Herstellen"
  }
 },
 "toast": {
  "enqueued": {
   "one": "{n} mix aan de wachtrij toegevoegd",
   "other": "{n} mixes aan de wachtrij toegevoegd"
  },
  "enqueued_none": "Niets toegevoegd – al in de wachtrij of gedownload",
  "enqueued_skipped": "{n} overgeslagen",
  "queue_cancelled": "Geannuleerd: {title}",
  "queue_removed": "Verwijderd: {title}",
  "queue_retry": "Opnieuw in de wachtrij: {title}",
  "queue_paused": "Wachtrij gepauzeerd",
  "queue_resumed": "Wachtrij hervat",
  "new_run": "Nieuwe run gestart",
  "ignored": "Genegeerd: {title}",
  "unignored": "Weer zichtbaar: {title}",
  "ignored_n": {
   "one": "{n} treffer genegeerd",
   "other": "{n} treffers genegeerd"
  },
  "opening": "{p} openen in de browser …",
  "watch_added": "Aan volglijst toegevoegd: {ch}",
  "blocked": "Kanaal geblokkeerd: {ch}",
  "genre_set": "Genre ingesteld: {genre}",
  "done": "Gedownload: {title}",
  "failed": "Mislukt: {title} – {error}",
  "wl_started": {
   "one": "Volglijst controleren ({n} bron, beperkt) …",
   "other": "Volglijst controleren ({n} bronnen, beperkt) …"
  },
  "wl_started_one": "“{name}” controleren …",
  "wl_none": "Geen actieve bron – niets te controleren",
  "wl_done": {
   "one": "Bron gecontroleerd: niets nieuws",
   "other": "Volglijst gecontroleerd: {n} bronnen, niets nieuws"
  },
  "wl_done_found": {
   "one": "Volglijst gecontroleerd: {n} nieuwe treffer",
   "other": "Volglijst gecontroleerd: {n} nieuwe treffers"
  },
  "wl_errors": {
   "one": "{n} bron met fouten",
   "other": "{n} bronnen met fouten"
  },
  "source_added": "Bron toegevoegd: {name}",
  "source_saved": "Bron opgeslagen: {name}",
  "source_deleted": "Bron verwijderd: {name}",
  "retagged": "Opnieuw getagd: {title}",
  "retagged_moved": "Opnieuw getagd en verplaatst: {title} → {path}",
  "deleted": "Verwijderd: {title}",
  "removed": "Item verwijderd: {title}",
  "folder_opening": "Map openen …",
  "copied": {
   "one": "{n} regel gekopieerd",
   "other": "{n} regels gekopieerd"
  },
  "copy_failed": "Kopiëren niet mogelijk",
  "copy_none": "Geen zichtbare regels",
  "settings_saved": "Instellingen opgeslagen",
  "settings_errors": {
   "one": "{n} invoer is ongeldig",
   "other": "{n} invoeren zijn ongeldig"
  },
  "backoff_cleared": "Backoff ({p}) handmatig opgeheven",
  "genre_moved": "Genre: {genre} – verplaatst naar {path}",
  "genre_retagged": "Genre: {genre} – tags bijgewerkt",
  "genre_entry_only": "Genre: {genre} – alleen het item is gewijzigd, het bestand is niet bereikbaar",
  "genre_failed": "Genre kon niet worden ingesteld: {error}",
  "task_created": "Taak aangemaakt in de Windows-taakplanner",
  "task_removed": "Taak verwijderd",
  "updated": "Bijgewerkt naar yt-dlp {v}",
  "up_to_date": "Al up-to-date (yt-dlp {v})",
  "update_failed": "Bijwerken mislukt",
  "restart_required": "Bijgewerkt – start HCLoader opnieuw zodat zoeken en downloads weer werken",
  "backup_done": "Back-up gemaakt: {path}",
  "reset_all": "Alle instellingen hersteld",
  "festival_entry_only": "“{name}” alleen in het item opgeslagen – het bestand is niet bereikbaar",
  "series_saved": "Reeks “{name}” opgeslagen",
  "series_deleted": "Reeks “{name}” verwijderd",
  "series_hidden": "Reeks “{name}” verborgen",
  "series_reset": "Ingebouwde reeksen hersteld",
  "assign_done": "Festivals toegewezen: {assigned} nieuw, {suggested} suggesties",
  "assign_cancelled": "Toewijzen afgebroken: {assigned} nieuw, {suggested} suggesties"
 },
 "upd": {
  "available": "Versie {v} beschikbaar",
  "available_sub": "Geïnstalleerd: {cur}",
  "download": "Downloaden",
  "notes": "Wijzigingen",
  "later": "Later",
  "close": "Sluiten",
  "cancel": "Annuleren",
  "retry": "Opnieuw proberen",
  "downloading": "Update {v} downloaden",
  "phase_download": "Downloaden",
  "phase_verify": "Controleren",
  "phase_prepare": "Voorbereiden",
  "ready": "Update {v} gereed",
  "ready_sub": "Om te installeren wordt HCLoader even gesloten en opnieuw gestart.",
  "restart_now": "Nu herstarten",
  "on_exit": "Bij afsluiten",
  "applying": "Update installeren …",
  "applying_sub": "HCLoader sluit zo en start opnieuw.",
  "error": "App-update mislukt",
  "blocked": "Automatisch bijwerken niet mogelijk",
  "notes_title": "Wijzigingen in versie {v}",
  "notes_empty": "Geen release-opmerkingen beschikbaar.",
  "notes_link": "Release op GitHub",
  "notes_all": "Alle wijzigingen tonen",
  "notes_less": "Alleen hoogtepunten tonen",
  "confirm_title": "Nu herstarten?",
  "confirm_ok": "Herstarten",
  "confirm_text": "HCLoader wordt gesloten, de update geïnstalleerd en de app opnieuw gestart. Een lopende download wordt geannuleerd en blijft in de wachtrij. Muziek, instellingen en database blijven ongewijzigd.",
  "on_exit_toast": "De update wordt geïnstalleerd wanneer HCLoader afsluit.",
  "later_toast": "De update blijft gereed en wordt bij de volgende start opnieuw aangeboden.",
  "section_label": "HCLoader-versie",
  "section_help": "Nieuwe versies komen van GitHub. Gegevens, instellingen en muziek blijven bij updates onaangeroerd; vóór een databasemigratie wordt automatisch een back-up gemaakt.",
  "current": "Geïnstalleerd",
  "latest": "Nieuwste",
  "checked": "Laatste controle",
  "check_now": "Nu controleren",
  "checking": "Controleren …",
  "st_idle": "Up-to-date",
  "st_available": "Nieuwe versie beschikbaar",
  "st_checking": "Controleren …",
  "st_downloading": "Downloaden …",
  "st_ready": "Klaar om te installeren",
  "st_applying": "Installeren …",
  "st_error": "Fout",
  "st_unknown": "Nog niet gecontroleerd",
  "up_to_date": "HCLoader is up-to-date (v{v})",
  "portable": "Draagbare versie",
  "installed": "Geïnstalleerd (setup)",
  "git": "Git-checkout",
  "from_repo": "van {repo} (niet de officiële bron)",
  "unverified": "zonder controlesom (alleen ZIP-integriteit gecontroleerd)",
  "rn_label": "Release-opmerkingen",
  "rn_help": "Wat er in elke versie veranderd is, uit de meegeleverde opmerkingen (werkt ook offline).",
  "rn_older": "Ouder",
  "rn_newer": "Nieuwer",
  "rn_pos": "{i} van {n}",
  "rn_installed": "geïnstalleerd",
  "rn_empty": "Geen release-opmerkingen gevonden.",
  "rn_version": "Versie"
 },
 "err": {
  "generic": "Onbekende fout",
  "bridge": "Fout in “{name}”: {msg}",
  "boot": "Starten mislukt: {msg}",
  "no_backend": "Geen verbinding met de backend"
 },
 "fatal": {
  "title": "Verbinding met de backend mislukt",
  "text": "De interface kreeg geen antwoord van het Python-deel van HCLoader. Er wordt niets getoond of opgeslagen dat niet echt is.",
  "waiting": "Nog steeds wachten op de backend …",
  "reload": "Opnieuw laden"
 },
 "fest": {
  "all": "Alle reeksen",
  "other": "Overig / niet toegewezen",
  "other_hint": "Geen festival",
  "sets": {
   "one": "{n} set",
   "other": "{n} sets"
  },
  "editions": {
   "one": "{n} editie",
   "other": "{n} edities"
  },
  "suggestions": {
   "one": "{n} suggestie",
   "other": "{n} suggesties"
  },
  "all_years": "Alle",
  "no_stage": "Geen stage",
  "kind": {
   "festival": "Festival",
   "radio": "Radioshow",
   "podcast": "Podcast"
  },
  "set_type": {
   "live_set": "Liveset",
   "closing_ceremony": "Closing ceremony",
   "opening": "Opening",
   "endshow": "Endshow",
   "full_show": "Volledige show",
   "warm_up": "Warm-up",
   "anthem": "Anthem",
   "episode": "Aflevering"
  },
  "change": "festival wijzigen",
  "change_manual": "handmatig ingesteld, klik om te wijzigen",
  "add": "Festival of reeks instellen",
  "suggested": "Onzekere suggestie: {name}",
  "accept": "Suggestie overnemen",
  "p_title": "Festival / reeks",
  "p_search": "Reeks zoeken …",
  "p_none": "Geen festival",
  "p_no_match": "Geen reeks gevonden",
  "p_year": "Jaar",
  "p_variant": "Variant",
  "p_stage": "Stage",
  "p_type": "Soort set",
  "p_apply": "Toepassen",
  "p_auto": "Terug naar automatisch"
 }
});
