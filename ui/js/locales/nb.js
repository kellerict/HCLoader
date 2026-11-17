/* HCLoader UI texts – Norsk bokmål.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "nb", "name": "Norsk bokmål", "dir": "ltr", "intl": "nb-NO"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "ARKIV FOR HARD MUSIKK",
    "mock": "DEMOMODUS"
  },
  "nav": {
    "discover": "Oppdag",
    "inbox": "Innboks",
    "watchlist": "Overvåking",
    "downloads": "Nedlastinger",
    "library": "Bibliotek",
    "log": "Logg",
    "settings": "Innstillinger"
  },
  "navfoot": {
    "today": "I DAG",
    "next": "NESTE SJEKK"
  },
  "common": {
    "ok": "OK",
    "cancel": "Avbryt",
    "save": "Lagre",
    "delete": "Slett",
    "edit": "Rediger",
    "remove": "Fjern",
    "reset": "Tilbakestill",
    "on": "på",
    "off": "av",
    "current": "gjeldende",
    "loading": "laster …",
    "add_chip": "+ legg til",
    "empty": "«tom»",
    "empty_list": "«ingen»"
  },
  "fmt": {
    "today": "i dag",
    "yesterday": "i går",
    "never": "aldri",
    "no_date": "Ukjent dato",
    "just_now": "nå nettopp",
    "today_at": "i dag {t}",
    "tomorrow_at": "i morgen {t}",
    "yesterday_at": "i går {t}",
    "views": {
      "one": "{v} visning",
      "other": "{v} visninger"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "minutter",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "tegn",
    "results": "resultater",
    "entries": "oppføringer",
    "clock": "24 t"
  },
  "range": {
    "ge_sleep": "≥ minimum",
    "ge_initial": "≥ startverdi"
  },
  "status": {
    "new": "Ny",
    "inbox": "I innboksen",
    "queued": "I kø",
    "downloading": "Laster ned",
    "done": "Lastet ned",
    "ignored": "Ignorert",
    "failed": "Feil"
  },
  "period": {
    "all": "Alle",
    "7d": "Siste 7 dager",
    "30d": "Siste 30 dager",
    "1y": "Siste 12 måneder",
    "year": "Bestemt år",
    "custom": "Egendefinert"
  },
  "source_type": {
    "channel": "Kanal",
    "playlist": "Spilleliste",
    "search": "Søk"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Plattform",
    "sc_off": "SoundCloud er slått av – slå det på under Innstillinger › SoundCloud."
  },
  "genre": {
    "change": "Endre sjanger",
    "manual": "Sjanger satt manuelt",
    "change_manual": "Endre sjanger (satt manuelt)"
  },
  "run_kind": {
    "watchlist": "Overvåking",
    "headless": "Oppgaveplanlegger",
    "manual": "Manuell"
  },
  "phase": {
    "waiting": "Venter",
    "sleep": "Pause til neste nedlasting",
    "download": "Laster ned",
    "convert": "Konverterer",
    "tag": "Merker",
    "failed": "Mislyktes"
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
    "missing": "mangler",
    "po": "PO token",
    "po_active": "aktiv ({mode})",
    "po_inactive": "inaktiv",
    "po_error": "Feil",
    "backoff": "Backoff",
    "backoff_none": "ingen",
    "backoff_until": "til {t} · {rest} igjen",
    "queue": "Kø",
    "queue_empty": "tom",
    "queue_active": "aktiv",
    "queue_paused": "satt på pause",
    "today": "I dag",
    "next": "Neste sjekk",
    "next_off": "av",
    "backoff_until_short": "til {t}",
    "sc_backoff": "Backoff til {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · lastet ned i dag {day}/{day_max} · {s}/{s_max} søk denne timen",
    "sc_tip": "SoundCloud · lastet ned i dag {day}/{day_max} · {s}/{s_max} søk denne timen",
    "backoff_tip": "{p}: backoff til {t} ({rest} igjen)"
  },
  "schedule": {
    "due": "forfalt",
    "kind_app": "App",
    "kind_task": "Oppgave",
    "tip_app": "Neste sjekk av overvåkingen i appen: {t} (mens HCLoader kjører).",
    "tip_task": "Neste sjekk av overvåkingen via Windows Oppgaveplanlegger: {t}.",
    "tip_any": "Neste sjekk av overvåkingen: {t}.",
    "tip_off": "Ingen automatisk sjekk – verken i appen eller via Windows Oppgaveplanlegger.",
    "tip_backoff": "Ingen sjekker mens backoff er aktiv."
  },
  "card": {
    "source": "Funnet via overvåkingskilden «{name}»",
    "select": "Velg",
    "open": "Åpne på {p}",
    "ignore": "Ignorer",
    "unignore": "Slutt å ignorere",
    "more": "Flere handlinger",
    "download": "Last ned",
    "watch": "Legg kanalen til i overvåkingen",
    "block": "Blokker kanal",
    "set_genre": "Angi sjanger",
    "date_approx": "Omtrentlig dato – YouTube-søket gir bare «for X år siden»",
    "date_unknown": "Ingen opplastingsdato oppgitt",
    "duplicate": "Trolig allerede lastet ned ({p})",
    "duplicate_title": "Svært lik tittel og samme varighet som «{title}» fra {p} – allerede lastet ned eller i kø der. Du kan likevel laste den ned.",
    "preview": "Bare forhåndsvisning (Go+) – kan ikke lastes ned",
    "preview_title": "SoundCloud gir bare en forhåndsvisning på 30 sekunder (Go+) for dette sporet. Det kan ikke lastes ned."
  },
  "discover": {
    "placeholder": "Søk etter mix, live-sett, DJ, event …",
    "search": "Søk",
    "searching_btn": "Søker …",
    "searching": "Søker – enkel spørring, skånsom mot YouTube …",
    "sort": "Sorter",
    "sort_rel": "Relevans",
    "sort_date": "Nyeste først",
    "sort_dur": "Lengst først",
    "sort_views": "Flest visninger",
    "quota": "Søk denne timen: {n} / {max}",
    "quota_sc": "SoundCloud-søk denne timen: {n} / {max}",
    "placeholder_sc": "Søk på SoundCloud: mix, sett, DJ, podcast …",
    "platform_title": "Hvor skal det søkes",
    "searching_sc": "Søker – enkel spørring, skånsom mot SoundCloud …",
    "ready_text_sc": "Skriv inn et søkeord og trykk Enter for å søke på SoundCloud.",
    "previews": "{n} bare forhåndsvisning (Go+)",
    "previews_title": "Forhåndsvisninger (Go+) kan aldri lastes ned. Synlige når «Skjul nedlastede og ignorerte» er av.",
    "filters": "Filtre",
    "toggle_filters": "Vis/skjul filterpanelet",
    "f_duration": "Varighet (minutter)",
    "f_min": "Minimum",
    "f_max": "Maksimum (tomt = ingen grense)",
    "f_max_ph": "maks",
    "f_period": "Opplastingsperiode",
    "f_year": "År",
    "f_year_prev": "Ett år tilbake",
    "f_year_next": "Ett år frem",
    "f_from": "Fra",
    "f_to": "Til",
    "f_hint_year": "YouTube-søket gir bare en omtrentlig dato («for 13 år siden»). Derfor gjelder ±1 år – og det gjør også hver mix med «{year}» i tittelen.",
    "f_hint_custom": "YouTube-søket gir bare en omtrentlig dato. For omtrentlige datoer gjelder ±1 års toleranse i begge ender.",
    "chip_title": "Klikk: vis/skjul sjanger · Dobbeltklikk: bare denne sjangeren (begrepene legges til i søket)",
    "scope": "Søket utvides med",
    "scope_title": "Neste søk legger til disse begrepene i søketeksten din.",
    "searched": "Søkt med",
    "stale": "Filtre endret siden",
    "re_search": "Søk på nytt",
    "re_search_title": "Resultatene stammer fra forrige søk. Søk på nytt slik at sjanger og år tas med i søkeordet (teller som ett søk).",
    "need_query": "Skriv inn et søkeord først.",
    "f_inc": "Inkluder nøkkelord",
    "f_exc": "Ekskluder nøkkelord",
    "f_show": "Visning",
    "f_hide": "Skjul nedlastede og ignorerte",
    "f_blacklist": "Bruk kanalsvartelisten",
    "count": {
      "one": "{n} resultat · {hidden} filtrert bort",
      "other": "{n} resultater · {hidden} filtrert bort"
    },
    "selected": "{n} valgt",
    "select_all": "Velg alle",
    "download_sel": "Last ned utvalg",
    "ready_title": "Klar",
    "ready_text": "Skriv inn et søkeord og trykk Enter.",
    "none_title": "Ingenting funnet",
    "none_text": "Lemp på filtrene eller prøv andre søkeord.",
    "none_year": "Ingen resultater fra {year}. Søk på nytt slik at året tas med i søkeordet – eller endre året."
  },
  "inbox": {
    "title": "Innboks",
    "sub": "Nye treff fra overvåkingen som består alle filtre",
    "sub_n": {
      "one": "{n} nytt treff fra overvåkingen som består alle filtre",
      "other": "{n} nye treff fra overvåkingen som består alle filtre"
    },
    "ignore_all": "Ignorer alle",
    "download_all": "Last ned alle",
    "ignore_sel": "Ignorer utvalg",
    "download_sel": "Last ned utvalg",
    "select_all": "Velg alle",
    "select_none": "Fjern utvalg",
    "src_all": "Alle kilder",
    "src_none": "Ingen kilde",
    "src_title": "Vis bare treff fra denne kilden",
    "count": {
      "one": "{n} treff",
      "other": "{n} treff"
    },
    "count_of": "{n} av {total} treff",
    "selected": "{n} valgt",
    "empty_title": "Innboksen er tom",
    "empty_text": "Overvåkingen har ikke funnet noen nye mixer.",
    "empty_nosrc": "Ingen kilder i overvåkingen ennå – legg til en kanal, spilleliste eller et søk, så havner nye mixer her.",
    "empty_next": "Neste sjekk: {t}.",
    "to_watchlist": "Til overvåkingen"
  },
  "watchlist": {
    "title": "Overvåking",
    "sub_n": {
      "one": "{n} kilde · {active} aktiv",
      "other": "{n} kilder · {active} aktive"
    },
    "sub_next": "neste sjekk {t}",
    "add": "Kilde",
    "check_all": "Sjekk alle nå",
    "check": "Sjekk",
    "checking": "sjekker …",
    "queued": "venter …",
    "running": "Sjekker …",
    "running_n": "Sjekker {i} / {n} …",
    "col_active": "Aktiv",
    "col_name": "Navn",
    "col_type": "Type",
    "col_genre": "Sjanger",
    "col_auto": "Nye treff",
    "col_max": "Maks.",
    "col_last": "Sist sjekket",
    "col_new": "Nye",
    "genre_auto": "automatisk",
    "genre_auto_long": "Automatisk (fra nøkkelord)",
    "auto_on": "last ned",
    "auto_off": "innboks",
    "auto_title_on": "Nye treff lastes ned automatisk",
    "auto_title_off": "Nye treff går bare til innboksen",
    "new_title": "Vis i innboksen",
    "check_title": "Sjekk denne kilden nå",
    "why_off": "Kilden er ikke aktiv",
    "why_running": "En sjekk pågår allerede",
    "why_backoff": "Backoff er aktiv – sjekking er blokkert",
    "why_backoff_p": "Backoff ({p}) er aktiv – sjekking er blokkert",
    "why_sc_off": "SoundCloud er slått av",
    "error_title": "Siste sjekk mislyktes",
    "backoff": "<b>Backoff aktiv til {t}</b> ({rest} igjen). Overvåkingen kan ikke sjekkes – planlagte sjekker settes også på pause.",
    "backoff_p": "<b>Backoff ({p}) aktiv til {t}</b> ({rest} igjen). Kilder fra {p} hoppes over til da – {other} fortsetter.",
    "backoff_link_sc": "Åpne SoundCloud",
    "backoff_link": "Åpne Struping",
    "none_active": "Ingen aktiv kilde å sjekke",
    "empty_title": "Ingen kilder",
    "empty_text": "Legg til en kanal, spilleliste eller et lagret søk.",
    "add_title": "Legg til kilde",
    "edit_title": "Rediger kilde",
    "f_type": "Type",
    "f_name": "Navn",
    "f_url": "URL",
    "f_query": "Søkeord",
    "f_genre": "Standardsjanger",
    "f_max": "Maks. antall oppføringer",
    "f_newest_last": "De nyeste ligger sist (les spillelisten baklengs)",
    "hint_newest_last": "I mange spillelister legger YouTube nye videoer til sist. Leser hele spillelisten (ca. 1 forespørsel per 100 videoer, maks. 2000 oppføringer).",
    "rev_title": "De nyeste ligger sist – spillelisten leses fra slutten",
    "rev_short": "baklengs",
    "f_enabled": "Aktiv – tas med i «Sjekk alle» og i planen",
    "f_hits": "Nye treff",
    "hits_inbox": "Til innboksen",
    "hits_auto": "Last ned automatisk",
    "hint_inbox": "Treff venter i innboksen til du laster dem ned eller ignorerer dem.",
    "hint_auto": "Treff som består alle filtre går rett til køen.",
    "hint_channel": "YouTube-kanal (…/@navn eller …/channel/UC…, eventuelt /videos eller /streams) eller SoundCloud-profil (soundcloud.com/navn).",
    "hint_playlist": "YouTube-spilleliste med «list=…» eller SoundCloud-sett (soundcloud.com/navn/sets/sett). De nyeste oppføringene sjekkes.",
    "f_platform": "Søk på",
    "detected": "gjenkjent: {p} · {type}",
    "not_detected": "URL-en ble ikke gjenkjent",
    "suggested": "Forslag",
    "suggested_title": "Foreslått ut fra URL-en. Hvis det står uendret, erstattes det av det riktige navnet ved første sjekk – eller skriv over det selv.",
    "hint_name_auto": "Foreslått ut fra URL-en – endre gjerne. Hvis det står uendret, setter første sjekk det riktige navnet.",
    "hint_name_later": "Navnet settes ved første sjekk – eller skriv det inn her selv.",
    "name_auto_title": "Midlertidig navn – neste sjekk setter det riktige",
    "hint_search": "Lagret søk, som under «Oppdag» – teller som ett søk per sjekk.",
    "hint_max": "per sjekk",
    "max_default": "(standard)",
    "max_default_title": "Ingen egen verdi: «Oppføringer per kilde» fra Innstillinger › Plan gjelder",
    "max_title": "Tomt = standard fra Innstillinger › Plan. Høyst 200, 100 for søkekilder.",
    "ph_name": "f.eks. Gabber Vault",
    "ph_name_later": "settes ved første sjekk",
    "ph_channel": "https://www.youtube.com/@kanal  eller  https://soundcloud.com/navn",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  eller  https://soundcloud.com/navn/sets/…",
    "ph_search": "f.eks. frenchcore liveset",
    "form_error": "Kilden kunne ikke lagres."
  },
  "downloads": {
    "title": "Nedlastinger",
    "sub": "Etter hverandre, én nedlasting om gangen",
    "pause": "Sett på pause",
    "resume": "Fortsett",
    "cancel": "Avbryt",
    "retry": "Prøv igjen",
    "remove": "Fjern",
    "up": "Flytt opp",
    "down": "Flytt ned",
    "eta": "Gjenstår",
    "position": "Plass {n}",
    "sleep_left": "fortsetter om",
    "sleep_why": "Struping: tilfeldig pause på {min}–{max} s mellom to nedlastinger",
    "next_up": "Neste",
    "sleeping": "Pauser",
    "sleep_range": "av {min}–{max} s",
    "blocked_wait": "Venter – {why}",
    "why_backoff": "Backoff",
    "why_day": "Dagsgrense",
    "why_run": "Kjøringsgrense",
    "why_paused": "satt på pause",
    "why_restart": "Omstart kreves",
    "why_busy": "en annen kjøring pågår",
    "why_pot": "PO-Token-serveren er ikke klar",
    "why_target": "Målmappen er ikke tilgjengelig",
    "why_error": "Nedlastingsmodul mangler",
    "summary": "I dag {day}/{day_max} · Kjøring {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} laster fortsatt ned.",
    "steps": "Last ned · Konverter · Merk",
    "unlimited": "ubegrenset",
    "l_run": "Denne kjøringen",
    "l_day": "I dag",
    "l_rate": "Hastighetsgrense",
    "l_sleep": "Pause mellom nedlastinger",
    "sec_queue": "Kø",
    "sec_failed": "Mislyktes",
    "empty_title": "Køen er tom",
    "empty_text": "Velg mixer under «Oppdag» eller i «Innboks».",
    "paused": "<b>Køen er satt på pause.</b> Den pågående nedlastingen står stille til du fortsetter.",
    "backoff": "<b>Backoff aktiv til {t}</b> ({rest} igjen). Nedlastinger, søk og overvåking er blokkert.",
    "backoff_rest": {
      "one": "<b>Backoff aktiv til {t}</b> ({rest} igjen). Nedlastinger, søk og overvåking er blokkert – {n} blir liggende i køen.",
      "other": "<b>Backoff aktiv til {t}</b> ({rest} igjen). Nedlastinger, søk og overvåking er blokkert – {n} blir liggende i køen."
    },
    "limit_day": "<b>Dagsgrensen er nådd ({n}/{max}).</b> Resten blir liggende i køen og fortsetter i morgen.",
    "limit_day_rest": {
      "one": "<b>Dagsgrensen er nådd ({n}/{max}).</b> {rest} blir liggende i køen og fortsetter i morgen.",
      "other": "<b>Dagsgrensen er nådd ({n}/{max}).</b> {rest} blir liggende i køen og fortsetter i morgen."
    },
    "limit_run": "<b>Grensen er nådd – {max}/{max} i denne kjøringen.</b> Resten blir liggende i køen og fortsetter i neste kjøring.",
    "limit_run_rest": {
      "one": "<b>Grensen er nådd – {max}/{max} i denne kjøringen.</b> {rest} blir liggende i køen og fortsetter i neste kjøring.",
      "other": "<b>Grensen er nådd – {max}/{max} i denne kjøringen.</b> {rest} blir liggende i køen og fortsetter i neste kjøring."
    },
    "limits_link": "Endre grenser",
    "new_run": "Start ny kjøring",
    "need_restart": "<b>Omstart kreves.</b> yt-dlp er oppdatert – start HCLoader på nytt. Køen beholdes.",
    "busy": "En annen nedlastingskjøring pågår (f.eks. den planlagte sjekken). Køen venter til den er ferdig.",
    "local_pot": {
      "one": "<b>PO-Token-serveren er ikke klar.</b> {rest} blir liggende i køen og fortsetter så snart den kjører.",
      "other": "<b>PO-Token-serveren er ikke klar.</b> {rest} blir liggende i køen og fortsetter så snart den kjører."
    },
    "local_target": {
      "one": "<b>Målmappen er utilgjengelig eller skrivebeskyttet.</b> {rest} blir liggende i køen og fortsetter så snart den er tilgjengelig igjen.",
      "other": "<b>Målmappen er utilgjengelig eller skrivebeskyttet.</b> {rest} blir liggende i køen og fortsetter så snart den er tilgjengelig igjen."
    },
    "local_error": {
      "one": "<b>Nedlastingsmodulen (yt-dlp) kunne ikke lastes.</b> {rest} blir liggende i køen. Neste forsøk etter «Fortsett», nye oppføringer eller når innstillingene lagres.",
      "other": "<b>Nedlastingsmodulen (yt-dlp) kunne ikke lastes.</b> {rest} blir liggende i køen. Neste forsøk etter «Fortsett», nye oppføringer eller når innstillingene lagres."
    },
    "local_link_pot": "Nettverksinnstillinger",
    "local_link_target": "Endre lagringssted",
    "local_link_error": "Vedlikehold"
  },
  "library": {
    "title": "Bibliotek",
    "sub": {
      "one": "{n} mix",
      "other": "{n} mixer"
    },
    "sub_shown": "{n} av {total} vises",
    "search": "Tittel, kanal eller sti …",
    "all_genres": "Alle sjangre",
    "all_channels": "Alle kanaler",
    "all_years": "Alle år",
    "f_genre": "Sjanger",
    "f_channel": "Kanal",
    "f_year": "År",
    "f_sort": "Sorter",
    "sort_newest": "Nyeste først",
    "sort_title": "Tittel A–Å",
    "sort_channel": "Kanal A–Å",
    "sort_duration": "Lengst først",
    "group": "Etter sjanger",
    "group_title": "Grupper oppføringer etter sjanger",
    "view_list": "Liste",
    "view_grid": "Fliser",
    "clear": "Tilbakestill filtre",
    "col_title": "Tittel",
    "col_channel": "Kanal",
    "col_genre": "Sjanger",
    "col_year": "År",
    "col_duration": "Varighet",
    "col_size": "Størrelse",
    "col_loaded": "Lastet ned",
    "play": "Spill av",
    "pause": "Pause",
    "play_external": "Åpne i standardspilleren",
    "play_internal": "Spill av i appens spiller",
    "play_missing": "Filen mangler – kan ikke spilles av",
    "more": "Vis {n} til",
    "now_playing": "Spilles nå",
    "retag_short": "Merk på nytt",
    "genre_working": "Setter sjanger …",
    "open_folder": "Åpne mappe",
    "retag": "Merk på nytt (tagger, omslag og plassering etter gjeldende innstillinger)",
    "delete": "Slett fil",
    "remove": "Fjern oppføring",
    "retagging": "Merker på nytt …",
    "cue_title": "Sporliste som .cue-fil ved siden av MP3-filen",
    "missing": "Filen mangler",
    "missing_title": "Filen ble ikke funnet på det lagrede stedet (flyttet eller slettet?)",
    "missing_chip": {
      "one": "{n} mangler",
      "other": "{n} mangler"
    },
    "missing_chip_title": "Vis bare oppføringer der filen mangler",
    "stat_count": "Mixer",
    "stat_duration": "Total varighet",
    "stat_size": "Størrelse",
    "stat_genres": "Etter sjanger",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} mix · {dur}",
      "other": "{n} mixer · {dur}"
    },
    "empty_title": "Ingenting lastet ned ennå",
    "empty_text": "Hver mix havner her så snart den er lastet ned og merket – med omslag, sjanger og plassering.",
    "empty_discover": "Oppdag mixer",
    "empty_watchlist": "Sett opp overvåking",
    "target_down": "Målmappen er ikke tilgjengelig: {path}",
    "target_down_hint": "Sjekk stasjonen eller nettverksressursen. Så lenge den mangler, er filenes tilstand ukjent: «Merk på nytt» og «Fjern oppføring» er deaktivert.",
    "unknown_title": "Målmappen er ikke tilgjengelig – filens tilstand er ukjent",
    "none_title": "Ingen resultater",
    "none_text": "Ingen oppføring samsvarer med søket og filtrene."
  },
  "player": {
    "label": "Minispiller",
    "play": "Spill av (mellomrom)",
    "pause": "Pause (mellomrom)",
    "back": "30 sekunder tilbake",
    "fwd": "30 sekunder frem",
    "prev": "Forrige spor",
    "next": "Neste spor",
    "seek": "Posisjon",
    "mute": "Slå av lyden",
    "unmute": "Slå på lyden",
    "volume": "Volum",
    "close": "Lukk spilleren",
    "tracks": "Sporliste",
    "tracks_n": {
      "one": "{n} spor",
      "other": "{n} spor"
    },
    "tracks_toggle": "Vis/skjul sporlisten",
    "no_tracks": "Ingen kapitler i denne filen",
    "total": "Total varighet {t}",
    "keys": "Mellomrom: spill av/pause · ←/→: 10 s",
    "err_load": "Kan ikke spilles av",
    "err_src": "Kan ikke spilles av: ugyldig filadresse",
    "err_play": "Filen kan ikke spilles av: {title}",
    "external": "Åpner i standardspilleren …"
  },
  "log": {
    "title": "Logg",
    "sub": "Direktelogg og kjørehistorikk",
    "live": "Direktelogg",
    "history": "Kjørehistorikk",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Advarsel",
    "lvl_error": "Feil",
    "lvl_title": "Vis/skjul nivået «{lvl}»",
    "search": "Søk i loggen …",
    "following": "Live",
    "paused": "På pause",
    "follow_title": "Rull automatisk til nyeste linje (settes på pause når du ruller opp)",
    "jump": "Hopp til slutten",
    "jump_new": {
      "one": "{n} ny linje",
      "other": "{n} nye linjer"
    },
    "copy": "Kopier",
    "copy_title": "Kopier synlige linjer til utklippstavlen",
    "open_logs": "Loggmappe",
    "open_logs_title": "Åpne mappen med de fullstendige loggfilene",
    "lines": {
      "one": "{n} linje",
      "other": "{n} linjer"
    },
    "lines_of": "{n} av {total} linjer",
    "empty": "Ingen linjer for disse nivåene.",
    "empty_search": "Ingen linje inneholder «{q}».",
    "no_runs": "Ingen kjøringer ennå.",
    "no_runs_kind": "Ingen kjøringer av denne typen.",
    "found": "funnet",
    "downloaded": "lastet ned",
    "errors": "feil",
    "running": "pågår …",
    "kind_all": "Alle",
    "timeline": "Tidslinje",
    "table": "Tabell",
    "view_title": "Visning av kjørehistorikk",
    "col_kind": "Type",
    "col_start": "Start",
    "col_duration": "Varighet",
    "col_found": "Funnet",
    "col_downloaded": "Lastet ned",
    "col_errors": "Feil",
    "col_note": "Merknad",
    "backoff": "Backoff",
    "runs_sum": {
      "one": "{n} kjøring · {dl} lastet ned · {err} feil",
      "other": "{n} kjøringer · {dl} lastet ned · {err} feil"
    },
    "today": "I dag",
    "yesterday": "I går"
  },
  "settings": {
    "title": "Innstillinger",
    "sub": "Alt appen gjør kan konfigureres her"
  },
  "tabs": {
    "general": "Generelt",
    "filters": "Filtre og nøkkelord",
    "genres": "Sjangre",
    "download": "Nedlasting og kvalitet",
    "storage": "Lagring og tagger",
    "throttle": "Struping",
    "soundcloud": "SoundCloud",
    "network": "Nettverk og PO-Token",
    "schedule": "Plan",
    "appearance": "Utseende",
    "maintenance": "Vedlikehold"
  },
  "tabs_hint": {
    "general": "Appens grunnleggende oppførsel.",
    "filters": "Standardfiltre for søk og overvåking. Kan overstyres midlertidig i filterpanelet under «Oppdag».",
    "genres": "Rekkefølge = prioritet. Den første sjangeren hvis nøkkelord finnes i tittelen, vinner. Manuelt satte sjangre og en kildes standardsjanger går foran.",
    "download": "YouTube leverer vanligvis Opus med omtrent 130–160 kbit/s. MP3 er en konvertering og høres ikke bedre ut enn kilden – men fungerer overalt.",
    "storage": "Hvor filene havner og hvordan de får navn. Strukturen er laget for mediaservere som Plex eller Jellyfin.",
    "throttle": "Begrenser belastningen på YouTube. Verdiene gjelder for søk, overvåking og nedlastinger samlet. SoundCloud har egne verdier i fanen «SoundCloud».",
    "soundcloud": "SoundCloud som andre kilde for søk, overvåking og nedlastinger – med egne grenser, tellere og backoff, uavhengig av YouTube.",
    "network": "PO-Token identifiserer forespørsler som en ekte nettleser og reduserer risikoen for bot-blokkeringer.",
    "schedule": "Når overvåkingen sjekkes automatisk – i appen og via Windows Oppgaveplanlegger.",
    "appearance": "Utseende og følelse. Endringer forhåndsvises umiddelbart og blir permanente først etter lagring.",
    "maintenance": "Versjoner, oppdateringer, database."
  },
  "set": {
    "default": "Standard",
    "range": "Område",
    "browse": "Bla gjennom",
    "not_set": "ikke satt",
    "saving": "Lagrer …",
    "discard": "Forkast",
    "tab_reset": "Tilbakestill fane",
    "tab_reset_title": "Sett alle felt i denne fanen til standardverdier (gjelder først etter «Lagre»)",
    "state_clean": "Alt er lagret",
    "state_dirty": {
      "one": "{n} ulagret endring",
      "other": "{n} ulagrede endringer"
    },
    "state_errors": {
      "one": "{n} feil – rett opp",
      "other": "{n} feil – rett opp"
    },
    "h": {
      "search": "Søk",
      "duration": "Varighet og periode",
      "keywords": "Nøkkelord",
      "display": "Visning",
      "cover": "Omslag",
      "chapters": "Kapitler og sporliste",
      "tags": "Tagger",
      "soundcloud": "SoundCloud",
      "playback": "Avspilling",
      "pauses": "Pauser og båndbredde",
      "limits": "Grenser",
      "backoff": "Backoff ved blokkering",
      "po": "PO-Token-leverandør",
      "fallback": "Løsninger",
      "in_app": "I appen",
      "task": "Windows Oppgaveplanlegger",
      "updates": "Oppdateringer",
      "app_update": "Appoppdatering",
      "database": "Database",
      "reset": "Tilbakestilling"
    },
    "general": {
      "language": {
        "label": "Språk",
        "help": "Språk for grensesnittet og meldinger. «Automatisk» følger Windows’ visningsspråk (ellers engelsk). Visningen bygges på nytt rett etter lagring."
      },
      "start_view": {
        "label": "Startvisning",
        "help": "Hvilken visning som åpnes ved start."
      },
      "log_level": {
        "label": "Loggnivå",
        "help": "Hvor detaljert loggfilen og direkteloggen er. DEBUG bare ved feilsøking."
      },
      "confirm_delete": {
        "label": "Bekreft sletting",
        "help": "Spør før en mix slettes fra biblioteket (oppføring + fil)."
      }
    },
    "player": {
      "mode": {
        "label": "Spill av med",
        "help": "Hva ▶ i biblioteket bruker. Den innebygde spilleren viser kapitler som hoppmerker og fortsetter å spille når du bytter visning. Det andre alternativet finnes per oppføring i menyen."
      }
    },
    "search": {
      "results_count": {
        "label": "Resultater per søk",
        "help": "Antall resultater et søk henter (enkel spørring). Flere resultater = mer belastning på YouTube."
      },
      "append_year": {
        "label": "Legg år til i søket",
        "help": "Med opplastingsperioden «Bestemt år» legges året til søkeordet (f.eks. «hardcore liveset 2013»). Da finner YouTube flere mixer fra det året."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Minimumslengde",
        "help": "Kortere videoer regnes aldri som en mix."
      },
      "max_duration": {
        "label": "Maksimumslengde",
        "help": "0 = ubegrenset."
      },
      "upload_period": {
        "label": "Opplastingsperiode",
        "help": "Hvilke opplastinger som vises som standard. «Bestemt år» viser bare mixer fra ett år, «Egendefinert» et fra–til-område."
      },
      "upload_year": {
        "label": "År",
        "help": "En mix teller hvis opplastingsåret stemmer eller året står i tittelen. YouTube-søket gir bare en omtrentlig dato – der gjelder ±1 år."
      },
      "upload_from": {
        "label": "Fra",
        "help": "Tidligste opplastingsdato. Tomt = åpent."
      },
      "upload_to": {
        "label": "Til",
        "help": "Seneste opplastingsdato. Tomt = åpent. For omtrentlige datoer gjelder ±1 års toleranse i begge ender."
      },
      "include_keywords": {
        "label": "Inkluder nøkkelord",
        "help": "Minst ett må finnes i tittelen. Tomt = tillat alt. Enter eller komma legger til."
      },
      "exclude_keywords": {
        "label": "Ekskluder nøkkelord",
        "help": "Hvis ett av dem finnes i tittelen, forkastes videoen."
      },
      "match_description": {
        "label": "Søk i beskrivelsen",
        "help": "Sjekk også nøkkelord i videobeskrivelsen. Enkle spørringer leverer den ofte ikke."
      },
      "hide_done_ignored": {
        "label": "Skjul nedlastede og ignorerte",
        "help": "Skjul allerede nedlastede og ignorerte videoer i resultatene."
      },
      "apply_channel_blacklist": {
        "label": "Bruk kanalsvartelisten",
        "help": "Vis aldri videoer fra blokkerte kanaler."
      },
      "hide_cross_platform_duplicates": {
        "label": "Skjul duplikater mellom plattformer",
        "help": "Skjul treff som trolig allerede er lastet ned eller satt i kø fra den andre plattformen (YouTube eller SoundCloud) – samme varighet (±5 s) og svært lik tittel. Av: de vises med merknaden «Trolig allerede lastet ned»."
      }
    },
    "blacklist": {
      "label": "Blokkerte kanaler",
      "help": "Du blokkerer kanaler via menyen på et kort. Her kan du oppheve blokkeringen igjen.",
      "none": "Ingen kanaler blokkert",
      "unblock": "Opphev blokkering"
    },
    "genres": {
      "add": "Sjanger",
      "up": "Høyere prioritet",
      "down": "Lavere prioritet",
      "delete": "Slett sjanger",
      "color": "Velg farge",
      "name_ph": "Navn",
      "kw_ph": "+ nøkkelord",
      "fallback": "Reserve – gjelder når ingen nøkkelord passer. Finnes alltid, alltid sist."
    },
    "download": {
      "audio_format": {
        "label": "Utdataformat",
        "help": "MP3, eller behold YouTubes original uten konvertering."
      },
      "mp3_quality": {
        "label": "MP3-kvalitet",
        "help": "320 kbit/s CBR er mest kompatibelt, V0 VBR sparer litt plass."
      },
      "embed_cover": {
        "label": "Bygg inn omslag",
        "help": "Skriv miniatyrbildet, beskåret kvadratisk, inn i filen som omslag."
      },
      "write_cover_jpg": {
        "label": "Lagre også cover.jpg",
        "help": "For mediaservere som leser mappeomslag."
      },
      "write_cue": {
        "label": "Skriv .cue-fil",
        "help": "Sporliste fra kapitler eller tidsstempler i beskrivelsen, ved siden av lydfilen."
      },
      "write_id3_chapters": {
        "label": "Skriv ID3-kapitler",
        "help": "Bygg kapittelmerker (CHAP/CTOC) rett inn i MP3-filen."
      },
      "keep_original_soundcloud": {
        "label": "Behold SoundCloud-original",
        "help": "Lagre SoundCloud-lyd uendret (AAC 160 kbit/s som .m4a, MP3 128 kbit/s som .mp3) – ingen ny tapsbringende konvertering. Av: som «Utdataformat»."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Målmappe",
        "help": "Rot for musikklagringen. Midlertidige filer ligger i «.tmp» under den. I den bærbare versjonen tolkes en relativ sti som «.\\Music» i forhold til appmappen (f.eks. på en USB-pinne)."
      },
      "path_template": {
        "label": "Stimønster",
        "help": "Relativt til målmappen, uten filendelse. «/» skiller mapper. {id} må være med (for SoundCloud «sc-<id>»). {platform} blir «YouTube» eller «SoundCloud» – f.eks. som toppmappe for å holde kildene adskilt."
      },
      "max_title_length": {
        "label": "Maks. tittellengde",
        "help": "Lengre titler forkortes i filnavnet."
      },
      "max_path_length": {
        "label": "Maks. stilengde",
        "help": "Hele stien inkludert målmappen. Uten ekstra konfigurasjon tillater Windows 259 tegn."
      },
      "artist_from_title": {
        "label": "Les artist fra tittelen",
        "help": "Gjenkjenn mønstrene «ARTIST @ EVENT» og «ARTIST - TITTEL», ellers brukes kanalnavnet."
      },
      "title_cleanup_patterns": {
        "label": "Rydd opp i tittelen",
        "help": "Regulære uttrykk der treffene fjernes fra tittelen. Enter legger til.",
        "ph": "+ regex"
      }
    },
    "path_preview": {
      "label": "Forhåndsvisning",
      "help": "Klikk på plassholdere for å sette dem inn i stimønsteret."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pause mellom forespørsler",
        "help": "Ventetid mellom metadataspørringer (søk, overvåking)."
      },
      "sleep_interval": {
        "label": "Nedlastingspause – minimum",
        "help": "Etter hver nedlasting følger en tilfeldig pause mellom minimum og maksimum."
      },
      "max_sleep_interval": {
        "label": "Nedlastingspause – maksimum",
        "help": "Øvre grense for den tilfeldige pausen."
      },
      "limit_rate_mb": {
        "label": "Nedlastingshastighet",
        "help": "Maksimal båndbredde. 0 = ubegrenset (anbefales ikke)."
      },
      "max_downloads_per_run": {
        "label": "Maks. nedlastinger per kjøring",
        "help": "Resten blir liggende i køen."
      },
      "max_downloads_per_day": {
        "label": "Maks. nedlastinger per dag",
        "help": "Telleren omfatter manuelle og automatiske nedlastinger samlet."
      },
      "max_searches_per_hour": {
        "label": "Maks. søk per time",
        "help": "Beskytter mot utilsiktet søking uten stopp."
      },
      "backoff_initial_hours": {
        "label": "Backoff – startverdi",
        "help": "Sperretid etter HTTP 429 eller «bekreft at du ikke er en robot»."
      },
      "backoff_max_hours": {
        "label": "Backoff – maksimum",
        "help": "Sperretiden dobles ved hver ny blokkering opp til denne verdien."
      }
    },
    "backoff": {
      "none": "Ingen backoff aktiv ({p})",
      "none_detail": "Søk, overvåking og nedlastinger fra {p} er tillatt.",
      "active": "Backoff aktiv ({p})",
      "active_detail": "til {t} · {rest} igjen · nivå {level}",
      "blocked": "{p} signaliserte en blokkering. Søk, overvåking og nedlastinger fra {p} er blokkert til tiden er ute.",
      "clear": "Opphev manuelt",
      "sc_off": "SoundCloud er slått av",
      "sc_off_detail": "Ingen SoundCloud-søk, ingen sjekker av overvåkingen og ingen nedlastinger fra SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Bruk SoundCloud",
        "help": "Av: ingen SoundCloud-søk, ingen sjekker av SoundCloud-kilder og ingen SoundCloud-nedlastinger. Allerede nedlastede oppføringer blir i biblioteket."
      },
      "sleep_requests": {
        "label": "Pause mellom forespørsler",
        "help": "Ventetid mellom metadataspørringer til SoundCloud (søk, overvåking)."
      },
      "sleep_interval": {
        "label": "Nedlastingspause – minimum",
        "help": "Etter hver SoundCloud-nedlasting følger en tilfeldig pause mellom minimum og maksimum."
      },
      "max_sleep_interval": {
        "label": "Nedlastingspause – maksimum",
        "help": "Øvre grense for den tilfeldige pausen."
      },
      "limit_rate_mb": {
        "label": "Nedlastingshastighet",
        "help": "Maksimal båndbredde. 0 = ubegrenset (anbefales ikke)."
      },
      "max_downloads_per_run": {
        "label": "Maks. nedlastinger per kjøring",
        "help": "Egen teller for SoundCloud. Resten blir liggende i køen."
      },
      "max_downloads_per_day": {
        "label": "Maks. nedlastinger per dag",
        "help": "Egen teller for SoundCloud, manuelle og automatiske nedlastinger samlet."
      },
      "max_searches_per_hour": {
        "label": "Maks. søk per time",
        "help": "Egen teller for SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Backoff – startverdi",
        "help": "Sperretid etter at SoundCloud meldte om for mange forespørsler (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – maksimum",
        "help": "Sperretiden dobles ved hver ny blokkering opp til denne verdien."
      }
    },
    "ladder": {
      "label": "Nivåer",
      "help": "Hvordan sperretiden vokser med de gjeldende verdiene.",
      "reset": "Tilbakestilles etter en vellykket kjøring",
      "invalid": "Ugyldige verdier"
    },
    "network": {
      "po_token_mode": {
        "label": "Modus",
        "help": "bgutil-plugin for yt-dlp. Skript starter Deno ved behov, HTTP holder en lokal server i gang."
      },
      "po_token_port": {
        "label": "HTTP-port",
        "help": "Bare HTTP-modus. Serveren lytter på 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Tokenets gyldighet",
        "help": "Etter denne tiden lages et nytt token. Verdien rundes til hele timer (minst 1 t)."
      },
      "cookies_from_browser": {
        "label": "Informasjonskapsler fra nettleser",
        "help": "Logger yt-dlp inn med nettleserens innlogging. Slå bare på hvis det ikke lenger fungerer uten."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Valgfritt, f.eks. socks5://127.0.0.1:1080. Tomt = direkte tilkobling.",
        "ph": "ingen proxy"
      }
    },
    "po": {
      "active": "PO-Token aktiv",
      "inactive": "PO-Token inaktiv",
      "error": "PO-Token-feil",
      "mode": "Modus",
      "test": "Test",
      "testing": "Tester …",
      "test_ok": "Testen var vellykket.",
      "test_fail": "Testen mislyktes.",
      "unsaved": "Testen bruker de lagrede innstillingene. Lagre endringene dine først."
    },
    "cookies": {
      "warn_off": "<b>Anbefalt: av.</b> PO-Token og nettleserens informasjonskapsler samtidig kan gi problemer.",
      "warn_on": "<b>Løsning aktiv.</b> PO-Token og nettleserens informasjonskapsler samtidig kan føre til feil eller blokkeringer, og YouTube-kontoen din brukes til forespørslene. Slå det av igjen så snart det fungerer uten. Informasjonskapsler havner aldri i loggen."
    },
    "schedule": {
      "in_app_check": {
        "label": "Sjekk mens appen kjører",
        "help": "Overvåkingen sjekkes med det innstilte intervallet mens vinduet er åpent."
      },
      "watchlist_interval_hours": {
        "label": "Intervall",
        "help": "Tid mellom to sjekker i appen."
      },
      "entries_per_source": {
        "label": "Oppføringer per kilde",
        "help": "Hvor mange av de nyeste oppføringene som hentes (enkel spørring) per sjekk (standard for nye kilder)."
      },
      "task_scheduler_enabled": {
        "label": "Bruk Oppgaveplanlegger",
        "help": "Sjekker overvåkingen også når appen er lukket (headless). Slås på av «Opprett oppgave»."
      },
      "task_time": {
        "label": "Tidspunkt",
        "help": "Daglig starttidspunkt for den planlagte oppgaven."
      }
    },
    "next": {
      "title": "Neste sjekk",
      "off": "Ingen automatisk sjekk",
      "off_detail": "Verken sjekken i appen eller Windows-oppgaven er aktiv. Overvåkingen sjekkes bare manuelt.",
      "app_detail": "I appen, hver {h}. time – mens HCLoader kjører.",
      "task_detail": "Via Windows Oppgaveplanlegger, daglig kl. {time} – også når appen er lukket.",
      "any_detail": "Den tidligste av appintervallet og Windows-oppgaven.",
      "also_task": "I tillegg: Windows-oppgave daglig kl. {time}.",
      "also_app": "I tillegg i appen hver {h}. time.",
      "pending": "Ikke planlagt ennå",
      "pending_detail": "Appen setter neste dato så snart den har sjekket overvåkingen for første gang.",
      "due": "Forfalt – starter snart",
      "backoff": "<b>Backoff aktiv.</b> Ingen sjekker før {t}; datoen tas igjen eller hoppes over etterpå.",
      "unsaved": "Ulagrede planendringer gjelder først etter lagring."
    },
    "task": {
      "loading": "Spør etter oppgave …",
      "registered": "Oppgave registrert",
      "registered_detail": "{name} · daglig {time} · neste kjøring {next}",
      "none": "Ingen oppgave registrert",
      "none_detail": "Oppretter en daglig Windows-oppgave kl. {time} (schtasks).",
      "create": "Opprett oppgave",
      "remove": "Fjern oppgave",
      "moved": "Appen er flyttet – opprett oppgaven på nytt",
      "moved_detail": "Den planlagte oppgaven starter fortsatt {cmd}. Ved ny oppretting brukes gjeldende appmappe.",
      "recreate": "Opprett oppgave på nytt",
      "unknown": "Oppgavens status er ukjent",
      "unknown_detail": "Windows Oppgaveplanlegger svarte ikke. Innstillingen forblir uendret.",
      "recheck": "Sjekk igjen"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Reduser effekter",
        "help": "Slår av skannelinjer, glitch og alle animasjoner."
      },
      "scanlines": {
        "label": "Skannelinjer og støy",
        "help": "Fint overlegg over hele grensesnittet."
      },
      "pulse_bpm": {
        "label": "Kickpuls",
        "help": "Takten fremdriftslinjen pulserer i."
      }
    },
    "pulse_preview": {
      "label": "Forhåndsvisning",
      "help": "Slik pulserer en pågående nedlasting.",
      "off": "Effekter redusert"
    },
    "versions": {
      "plugin": "PO-Token-plugin",
      "was": "tidligere {v}"
    },
    "update": {
      "label": "yt-dlp og plugin",
      "help": "YouTube endrer seg hele tiden. Oppdater først hvis det oppstår feil (pip i venv).",
      "button": "Oppdater yt-dlp og plugin",
      "running": "Oppdaterer …",
      "last_check": "Siste sjekk",
      "restart": "<b>Omstart kreves.</b> yt-dlp er oppdatert. Søk og nedlastinger er blokkert til HCLoader er startet på nytt; køen beholdes.",
      "restart_title": "Omstart kreves",
      "restart_text": "yt-dlp er oppdatert. Lukk og start HCLoader på nytt – inntil da er søk og nedlastinger blokkert, køen beholdes.",
      "out_live": "Utdata · pågår i {t}",
      "out_done": "Utdata · ferdig etter {t}",
      "out_failed": "Utdata · mislyktes",
      "out_last": "Utdata",
      "waiting": "Starter pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Se etter oppdateringer ved start",
        "help": "yt-dlp og PO-Token-plugin, høyst én gang per dag."
      },
      "check_app_updates_on_start": {
        "label": "Se etter HCLoader-oppdateringer ved start",
        "help": "Spør GitHub én gang per start etter en ny versjon. Ingenting lastes ned før du klikker."
      },
      "apply_update_on_exit": {
        "label": "Installer oppdatering ved avslutning",
        "help": "En nedlastet oppdatering installeres når HCLoader lukkes («Senere»). Av: den tilbys igjen ved neste start."
      },
      "update_repo": {
        "label": "Oppdateringskilde (GitHub)",
        "help": "Repo i formatet «eier/repo». Endres bare for forker."
      }
    },
    "db": {
      "label": "Database",
      "help": "Status for alle videoer, kilder og kjøringer. En sikkerhetskopi kopierer filen til mappen «backups».",
      "backup": "Lag DB-sikkerhetskopi",
      "backing_up": "Sikkerhetskopierer …",
      "open": "Datamappe",
      "open_logs": "Loggmappe",
      "open_title": "Åpne mappen med database, konfigurasjon og sikkerhetskopier",
      "open_logs_title": "Åpne mappen med loggfilene",
      "info": {
        "one": "{n} oppføring · {mb} MB",
        "other": "{n} oppføringer · {mb} MB"
      },
      "last": "Siste sikkerhetskopi",
      "never": "ingen ennå",
      "keep": "De 10 nyeste sikkerhetskopiene beholdes, eldre slettes ved neste sikkerhetskopi.",
      "backups": "Sikkerhetskopier",
      "backups_more": "+ {n} eldre i mappen «backups»",
      "fresh": "ny"
    },
    "reset_all": {
      "label": "Alle innstillinger",
      "help": "Tilbakestiller alle faner til standardverdier. Database og musikkfiler berøres ikke.",
      "button": "Tilbakestill alt"
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
        "auto": "Automatisk (systemspråk)"
      }
    },
    "player": {
      "mode": {
        "internal": "Innebygd spiller (anbefalt)",
        "external": "Windows’ standardspiller"
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
      "title": "Blokker kanal",
      "text": "Videoer fra «{ch}» vises ikke lenger. Angre under Innstillinger › Filtre og nøkkelord.",
      "ok": "Blokker"
    },
    "ignore_all": {
      "title": "Ignorer treff",
      "text": {
        "one": "Merke {n} treff i innboksen som ignorert? Det lastes ikke ned og vises ikke lenger i innboksen.",
        "other": "Merke {n} treff i innboksen som ignorert? De lastes ikke ned og vises ikke lenger i innboksen."
      },
      "ok": "Ignorer"
    },
    "del_source": {
      "title": "Slett kilde",
      "text": "Fjerne «{name}» fra overvåkingen? Allerede nedlastede mixer beholdes."
    },
    "del_mix": {
      "title": "Slett mix",
      "text": "«{title}» fjernes fra biblioteket, og filen slettes fra disken:",
      "ok": "Slett fil",
      "warn": "<b>Dette kan ikke angres.</b> Lydfilen og en tilhørende .cue-fil slettes. Mixen merkes som «ignorert» og <b>lastes ikke ned igjen</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Fjern bare oppføringen",
      "text": "Filen for «{title}» ligger utenfor gjeldende målmappe og slettes derfor ikke:",
      "ok": "Fjern bare oppføringen",
      "warn": "Filen blir urørt der den ligger. Oppføringen forsvinner fra biblioteket, mixen merkes som «ignorert» og <b>lastes ikke ned igjen</b>."
    },
    "remove_mix": {
      "title": "Fjern oppføring",
      "text": "Filen for «{title}» ble ikke funnet på det lagrede stedet:",
      "ok": "Fjern oppføring",
      "warn": "Oppføringen forsvinner fra biblioteket. Mixen merkes som «ignorert» og <b>lastes ikke ned igjen</b>. Hvis filen ligger et annet sted, blir den urørt."
    },
    "backoff": {
      "title": "Opphev backoff",
      "ok": "Opphev likevel",
      "text": "Sperretiden beskytter deg: {p} signaliserte at det kom for mange forespørsler.",
      "warn": "<b>Opphev den bare hvis du er sikker på at blokkeringen er over.</b> Hvis appen går inn igjen for tidlig, kan {p} begrense IP-adressen din lenger eller permanent."
    },
    "reset_all": {
      "title": "Tilbakestill alt",
      "text": "Alle innstillinger i alle faner settes umiddelbart til standardverdier og lagres.",
      "ok": "Tilbakestill"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mix lagt i køen",
      "other": "{n} mixer lagt i køen"
    },
    "enqueued_none": "Ingenting lagt til – allerede i kø eller lastet ned",
    "enqueued_skipped": "{n} hoppet over",
    "queue_cancelled": "Avbrutt: {title}",
    "queue_removed": "Fjernet: {title}",
    "queue_retry": "I kø igjen: {title}",
    "queue_paused": "Køen satt på pause",
    "queue_resumed": "Køen fortsetter",
    "new_run": "Ny kjøring startet",
    "ignored": "Ignorert: {title}",
    "unignored": "Synlig igjen: {title}",
    "ignored_n": {
      "one": "{n} treff ignorert",
      "other": "{n} treff ignorert"
    },
    "opening": "Åpner {p} i nettleseren …",
    "watch_added": "Lagt til i overvåkingen: {ch}",
    "blocked": "Kanal blokkert: {ch}",
    "genre_set": "Sjanger satt: {genre}",
    "done": "Lastet ned: {title}",
    "failed": "Mislyktes: {title} – {error}",
    "wl_started": {
      "one": "Sjekker overvåkingen ({n} kilde, strupet) …",
      "other": "Sjekker overvåkingen ({n} kilder, strupet) …"
    },
    "wl_started_one": "Sjekker «{name}» …",
    "wl_none": "Ingen aktiv kilde – ingenting å sjekke",
    "wl_done": {
      "one": "Kilde sjekket: ingenting nytt",
      "other": "Overvåking sjekket: {n} kilder, ingenting nytt"
    },
    "wl_done_found": {
      "one": "Overvåking sjekket: {n} nytt treff",
      "other": "Overvåking sjekket: {n} nye treff"
    },
    "wl_errors": {
      "one": "{n} kilde med feil",
      "other": "{n} kilder med feil"
    },
    "source_added": "Kilde lagt til: {name}",
    "source_saved": "Kilde lagret: {name}",
    "source_deleted": "Kilde slettet: {name}",
    "retagged": "Merket på nytt: {title}",
    "retagged_moved": "Merket på nytt og flyttet: {title} → {path}",
    "deleted": "Slettet: {title}",
    "removed": "Oppføring fjernet: {title}",
    "folder_opening": "Åpner mappe …",
    "copied": {
      "one": "{n} linje kopiert",
      "other": "{n} linjer kopiert"
    },
    "copy_failed": "Kopiering er ikke mulig",
    "copy_none": "Ingen synlige linjer",
    "settings_saved": "Innstillinger lagret",
    "settings_errors": {
      "one": "{n} inndata er ugyldig",
      "other": "{n} inndata er ugyldige"
    },
    "backoff_cleared": "Backoff ({p}) opphevet manuelt",
    "genre_moved": "Sjanger: {genre} – flyttet til {path}",
    "genre_retagged": "Sjanger: {genre} – tagger oppdatert",
    "genre_entry_only": "Sjanger: {genre} – bare oppføringen ble endret, filen er ikke tilgjengelig",
    "genre_failed": "Sjangeren kunne ikke settes: {error}",
    "task_created": "Oppgave opprettet i Windows Oppgaveplanlegger",
    "task_removed": "Oppgave fjernet",
    "updated": "Oppdatert til yt-dlp {v}",
    "up_to_date": "Allerede oppdatert (yt-dlp {v})",
    "update_failed": "Oppdateringen mislyktes",
    "restart_required": "Oppdatert – start HCLoader på nytt slik at søk og nedlastinger fungerer igjen",
    "backup_done": "Sikkerhetskopi laget: {path}",
    "reset_all": "Alle innstillinger tilbakestilt"
  },
  "upd": {
    "available": "Versjon {v} er tilgjengelig",
    "available_sub": "Installert: {cur}",
    "download": "Last ned",
    "notes": "Endringer",
    "later": "Senere",
    "close": "Lukk",
    "cancel": "Avbryt",
    "retry": "Prøv igjen",
    "downloading": "Laster ned oppdatering {v}",
    "phase_download": "Nedlasting",
    "phase_verify": "Verifisering",
    "phase_prepare": "Forberedelse",
    "ready": "Oppdatering {v} er klar",
    "ready_sub": "For å installere den lukkes HCLoader kort og startes på nytt.",
    "restart_now": "Start på nytt nå",
    "on_exit": "Ved avslutning",
    "applying": "Installerer oppdatering …",
    "applying_sub": "HCLoader lukkes og startes på nytt om et øyeblikk.",
    "error": "Appoppdateringen mislyktes",
    "blocked": "Automatisk oppdatering er ikke mulig",
    "notes_title": "Endringer i versjon {v}",
    "notes_empty": "Ingen versjonsnotater tilgjengelig.",
    "notes_link": "Utgivelse på GitHub",
    "notes_all": "Vis alle endringer",
    "notes_less": "Vis bare høydepunkter",
    "confirm_title": "Starte på nytt nå?",
    "confirm_ok": "Start på nytt",
    "confirm_text": "HCLoader lukkes, oppdateringen installeres og appen startes på nytt. En pågående nedlasting avbrytes og blir liggende i køen. Musikk, innstillinger og database forblir uendret.",
    "on_exit_toast": "Oppdateringen installeres når HCLoader avsluttes.",
    "later_toast": "Oppdateringen blir klar og tilbys igjen ved neste start.",
    "section_label": "HCLoader-versjon",
    "section_help": "Nye versjoner kommer fra GitHub. Data, innstillinger og musikk berøres ikke av oppdateringer; det lages automatisk en sikkerhetskopi før en databasemigrering.",
    "current": "Installert",
    "latest": "Nyeste",
    "checked": "Siste sjekk",
    "check_now": "Sjekk nå",
    "checking": "Sjekker …",
    "st_idle": "Oppdatert",
    "st_available": "Ny versjon tilgjengelig",
    "st_checking": "Sjekker …",
    "st_downloading": "Laster ned …",
    "st_ready": "Klar til installasjon",
    "st_applying": "Installerer …",
    "st_error": "Feil",
    "st_unknown": "Ikke sjekket ennå",
    "up_to_date": "HCLoader er oppdatert (v{v})",
    "portable": "Bærbar versjon",
    "installed": "Installert (setup)",
    "git": "Git-utsjekk",
    "from_repo": "fra {repo} (ikke den offisielle kilden)",
    "unverified": "uten kontrollsum (bare ZIP-integriteten er verifisert)"
  },
  "err": {
    "generic": "Ukjent feil",
    "bridge": "Feil i «{name}»: {msg}",
    "boot": "Starten mislyktes: {msg}",
    "no_backend": "Ingen forbindelse til backend"
  },
  "fatal": {
    "title": "Forbindelsen til backend mislyktes",
    "text": "Grensesnittet fikk ikke svar fra Python-delen av HCLoader. Ingenting som ikke er ekte, vises eller lagres.",
    "waiting": "Venter fortsatt på backend …",
    "reload": "Last inn på nytt"
  }
});
