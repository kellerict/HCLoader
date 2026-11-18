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
    "clock": "24 t",
    "req_h": "foresp./t"
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
    "none_text": "Ingen oppføring samsvarer med søket og filtrene.",
    "group_by": "Grupper etter",
    "group_none": "Ingen",
    "group_genre": "Sjanger",
    "group_festival": "Festival",
    "group_artist": "Artist",
    "group_year": "År",
    "group_unknown": "Ukjent"
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
    "maintenance": "Vedlikehold",
    "festivals": "Festivaler og serier"
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
    "maintenance": "Versjoner, oppdateringer, database.",
    "festivals": "Gjenkjenner festival eller serie, år, scene og sett-type ut fra de lagrede titlene – frakoblet, uten en eneste ekstra forespørsel."
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
      "collector": "Festivalsamler",
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
      "release_notes": "Versjonsnotater",
      "database": "Database",
      "reset": "Tilbakestilling",
      "detection": "Gjenkjenning",
      "series": "Serier",
      "backfill": "Les inn alt (én gang)"
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
      },
      "album_from_edition": {
        "label": "Album = utgave",
        "help": "Skriver utgaven (f.eks. «Defqon.1 2024») som albumtagg, slik at Plex og Jellyfin viser alle sett fra en festival som ett album. Av: album = tittel, som før."
      }
    },
    "path_preview": {
      "label": "Forhåndsvisning",
      "help": "Klikk på plassholdere for å sette dem inn i stimønsteret.",
      "fest": "{festival}, {event_year} og {stage} fylles bare ut når en festival er tilordnet. Ellers faller de bort, sammen med overflødige skilletegn og tomme mapper."
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
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Søk per time",
        "help": "«Søk etter manglende sett» fordeler søkene jevnt (10 = ett hvert 6. min). I tillegg gjelder den globale grensen for søk per time."
      },
      "collector_results_per_search": {
        "label": "Resultater per søk",
        "help": "Hvor mange resultater ett søk etter et manglende sett ser på (én forespørsel per søk)."
      },
      "collector_auto_confirm": {
        "label": "Bekreft automatisk fra",
        "help": "Fra denne sikkerheten teller et treff uten bekreftelsen din – bare med DJ, festival og år i tittelen. Alt under venter på et klikk."
      },
      "detect": {
        "label": "Gjenkjenn automatisk",
        "help": "Tilordner festival eller serie, år, scene og sett-type til nye treff og nedlastinger. Manuelt satte verdier overskrives aldri."
      },
      "min_confidence": {
        "label": "Terskel for gjenkjenning",
        "help": "Sikkerhet et treff må ha for å bli tilordnet. Under den vises det bare som et forslag du kan godta."
      },
      "year_from_upload_date": {
        "label": "År fra opplastingsdato",
        "help": "Hvis tittelen mangler årstall, brukes opplastingsåret (regnes som mindre sikkert)."
      },
      "match_description": {
        "label": "Søk også i beskrivelsen",
        "help": "Leter etter festivalnavn også i den lagrede beskrivelsen."
      },
      "extra_stages": {
        "label": "Ekstra scener",
        "help": "Scenenavn i tillegg til de innebygde (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ scene"
      }
    },
    "fest_types": {
      "label": "Egne begreper for sett-typer",
      "help": "Ord i tittelen som tyder på en sett-type. De sjekkes før de innebygde begrepene.",
      "ph": "Begrep i tittelen",
      "add": "Begrep"
    },
    "fest_test": {
      "label": "Test en tittel",
      "help": "Viser hva gjenkjenningen finner i en tittel. Ingenting lagres; de lagrede innstillingene gjelder.",
      "ph": "f.eks. Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Ingenting gjenkjent",
      "assigned": "ville blitt tilordnet",
      "suggested": "bare forslag"
    },
    "fest_status": {
      "title": "{assigned} av {total} mixer tilordnet",
      "last": "Siste gjennomgang",
      "help": "Kjører frakoblet over det eksisterende biblioteket. Manuelle verdier beholdes; filer merkes ikke på nytt og flyttes ikke.",
      "button": "Tilordne festivaler nå",
      "running": "Tilordner … {done} / {total}"
    },
    "series": {
      "hint": "Kjente festivaler, radioprogrammer og podkaster. Endringer i listen lagres med en gang.",
      "add": "Serie",
      "show_hidden": "Vis skjulte",
      "reset_all": "Tilbakestill innebygde serier",
      "builtin": "innebygd",
      "own": "egen",
      "modified": "endret",
      "hidden": "skjult",
      "no_aliases": "ingen aliaser",
      "enable": "Gjenkjenn denne serien",
      "hide": "Skjul",
      "restore": "Gjenopprett",
      "new_title": "Ny serie",
      "edit_title": "Rediger serie",
      "name": "Navn",
      "kind": "Type",
      "default_genre": "Standardsjanger",
      "aliases": "Aliaser",
      "aliases_help": "Andre skrivemåter. Ett treff i tittelen er nok.",
      "weak_aliases": "Svake aliaser",
      "weak_help": "Hverdagsord som bare teller sammen med et årstall.",
      "variants": "Varianter",
      "variants_help": "Egne utgaver, f.eks. Australia eller at Home.",
      "channels": "Arrangørens kanaler",
      "channels_help": "Kanalnavn, ID eller URL. Øker bare sikkerheten."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Maks. oppføringer per kilde",
        "help": "«Les inn alt (én gang)» i overvåkingslisten leser maks. så mange oppføringer fra en kanal eller spilleliste."
      },
      "backfill_requests_per_hour": {
        "label": "Forespørsler per time",
        "help": "Sideforespørsler fra «Les inn alt» fordeles jevnt (120 = én hvert 30. s); vanlig avstand og backoff gjelder også. En planlagt kjøring (Oppgaveplanlegging) fortsetter med maks. så mange forespørsler."
      }
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
    },
    "series_delete": {
      "title": "Slette serien?",
      "text": "«{name}» og utgavene slettes.",
      "warn": {
        "one": "{n} mix mister tilordningen.",
        "other": "{n} mixer mister tilordningen."
      }
    },
    "series_hide": {
      "title": "Skjule serien?",
      "text": "«{name}» gjenkjennes ikke lenger. Du henter den tilbake med «Vis skjulte»."
    },
    "series_reset": {
      "title": "Tilbakestille innebygde serier?",
      "text": "Alle innebygde serier går tilbake til utgangspunktet, og skjulte kommer tilbake. Dine egne serier beholdes.",
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
    "reset_all": "Alle innstillinger tilbakestilt",
    "festival_entry_only": "«{name}» ble bare lagret i oppføringen – filen er ikke tilgjengelig",
    "series_saved": "Serien «{name}» lagret",
    "series_deleted": "Serien «{name}» slettet",
    "series_hidden": "Serien «{name}» skjult",
    "series_reset": "Innebygde serier gjenopprettet",
    "assign_done": "Festivaler tilordnet: {assigned} nye, {suggested} forslag",
    "assign_cancelled": "Tilordningen ble avbrutt: {assigned} nye, {suggested} forslag"
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
    "unverified": "uten kontrollsum (bare ZIP-integriteten er verifisert)",
    "rn_label": "Versjonsnotater",
    "rn_help": "Hva som er endret i hver versjon, fra notatene som følger med (virker også uten nett).",
    "rn_older": "Eldre",
    "rn_newer": "Nyere",
    "rn_pos": "{i} av {n}",
    "rn_installed": "installert",
    "rn_empty": "Fant ingen versjonsnotater.",
    "rn_version": "Versjon"
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
  },
  "fest": {
    "all": "Alle serier",
    "other": "Øvrig / ikke tilordnet",
    "other_hint": "Ingen festival",
    "sets": {
      "one": "{n} sett",
      "other": "{n} sett"
    },
    "editions": {
      "one": "{n} utgave",
      "other": "{n} utgaver"
    },
    "suggestions": {
      "one": "{n} forslag",
      "other": "{n} forslag"
    },
    "all_years": "Alle",
    "no_stage": "Ingen scene",
    "kind": {
      "festival": "Festival",
      "radio": "Radioprogram",
      "podcast": "Podkast"
    },
    "set_type": {
      "live_set": "Livesett",
      "closing_ceremony": "Avslutningsseremoni",
      "opening": "Åpning",
      "endshow": "Endshow",
      "full_show": "Hele showet",
      "warm_up": "Warm-up",
      "anthem": "Anthem",
      "episode": "Episode"
    },
    "change": "endre festival",
    "change_manual": "satt manuelt, klikk for å endre",
    "add": "Angi festival eller serie",
    "suggested": "Usikkert forslag: {name}",
    "accept": "Godta forslaget",
    "p_title": "Festival / serie",
    "p_search": "Søk etter serie …",
    "p_none": "Ingen festival",
    "p_no_match": "Fant ingen serie",
    "p_year": "År",
    "p_variant": "Variant",
    "p_stage": "Scene",
    "p_type": "Sett-type",
    "p_apply": "Bruk",
    "p_auto": "Tilbake til automatisk"
  },
  "backfill": {
    "action": "Les inn alt (én gang)",
    "action_title": "Les inn hele listen for denne kilden én gang, side for side – nye treff havner i innboksen",
    "again_title": "Les inn alt på nytt – bare oppføringer som ennå er ukjente legges til",
    "search_title": "Ikke for lagrede søk – et søk gir maks. 100 treff",
    "why_open": "Innlesingen har allerede startet – sett den på pause eller avbryt under navnet",
    "st_pending": "Venter",
    "st_running": "Leser inn …",
    "st_paused": "Satt på pause",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / maks. {cap}",
    "added": "+{n} i innboksen",
    "done_short": "Alt innlest {date}",
    "done_title": "Helt innlest: {date} · {n} oppføringer",
    "note_title": "Siste avbrudd",
    "pause": "Pause",
    "resume": "Fortsett",
    "cancel": "Avbryt",
    "keep": "Fortsett å lese",
    "dlg_title": "Lese inn alt fra «{name}»?",
    "dlg_text": "Leser inn hele listen for denne kilden én gang, side for side – flatt og billig, gjennom begrensningen; ingenting lastes ned. Treff som består filtrene dine havner i <b>innboksen</b>, også for kilder med automatisk nedlasting. Videoer du allerede kjenner legges aldri til to ganger.",
    "dlg_requests": "forespørsler",
    "dlg_time": "varighet",
    "dlg_entries": "oppføringer",
    "dlg_known": "Kjent fra siste kontroll: <b>{n}</b> oppføringer.",
    "dlg_unknown": "Størrelsen er ukjent – forsiktig anslått for maksimum {cap} oppføringer.",
    "dlg_capped": "Bare de første {cap} oppføringene leses inn (Innstillinger › Tidsplan).",
    "dlg_resume": "Fortsetter etter {n} allerede leste oppføringer; sidene deres hentes først på nytt.",
    "dlg_headless": "For stort for en planlagt kjøring ({n} forespørsler per time): lukkes appen før det er ferdig, fortsetter det bare i appen.",
    "dlg_pace": "Maks. {n} forespørsler per time, jevnt fordelt. En backoff (HTTP 429 / botsjekk), at appen lukkes eller en feil avbryter bare – det fortsetter automatisk senere. Du kan sette på pause eller avbryte når som helst.",
    "dlg_ok": "Start innlesing",
    "dlg_ok_resume": "Fortsett å lese",
    "dlg_cancel_title": "Avbryte innlesingen?",
    "dlg_cancel_text": "Innlesingen av «{name}» stopper og fremdriften forkastes. Treff som allerede er i innboksen blir værende.",
    "toast_started": "«{name}» leses inn helt – kjører i bakgrunnen",
    "toast_done": "«{name}» helt innlest – +{n} i innboksen",
    "toast_paused": "«{name}» satt på pause – fortsett med «Fortsett»",
    "toast_cancelled": "Innlesingen av «{name}» ble avbrutt"
  },
  "collector": {
    "nav": "Samler",
    "open_title": "Festivalsamleren: samle alle sett fra en festivalutgave med en sjekkliste",
    "title": "Festivalsamler",
    "sub": "Alle sett fra én festivalutgave – etter spilleplanen, med sjekkliste",
    "back_library": "Tilbake til biblioteket",
    "back_list": "Alle sjekklister",
    "collect": "Samle denne utgaven",
    "collect_title": "Sjekkliste over alle sett fra {name}: finn manglende sett og last dem ned",
    "open_checklist": "Sjekkliste {n} / {total}",
    "sets": "Sett",
    "lists": "Sjekklister",
    "card_empty": "Ingen sett ennå",
    "new_title": "Ny sjekkliste",
    "new_text": "Velg en festival og et år. Settene kommer fra arrangørens spilleliste, en innlimt spilleplan eller en medfølgende fil.",
    "new_ok": "Åpne sjekkliste",
    "f_series": "Festival / serie",
    "f_series_ph": "Velg …",
    "f_series_other": "Radioprogrammer og podkaster",
    "err_series": "Velg en festival eller serie.",
    "err_year": "Oppgi året for utgaven.",
    "empty_title": "Ingen sjekkliste ennå",
    "empty_text": "En sjekkliste lister opp hvert sett fra én festivalutgave og viser hva du allerede har.",
    "step1": "Velg festival og år ovenfor.",
    "step2": "Importer arrangørens spilleliste eller lim inn spilleplanen.",
    "step3": "Fjern haken for det du ikke vil ha, søk etter manglende sett og last ned.",
    "delete": "Slett sjekkliste",
    "dlg_delete_title": "Slette sjekklisten?",
    "dlg_delete_text": "Sjekklisten for «{name}» fjernes med alle rader. Et pågående søk stopper.",
    "dlg_delete_keep": "Nedlastede filer, bibliotekoppføringer og lagrede treff beholdes.",
    "toast_deleted": "Sjekklisten «{name}» ble slettet",
    "in_library": "{n} i biblioteket",
    "show_library": "Vis i biblioteket ({n})",
    "more": "Mer",
    "st": {
      "found": "Funnet",
      "queued": "I kø",
      "downloaded": "Lastet ned",
      "missing": "Mangler",
      "ignored": "Ignorert"
    },
    "filter_status": "Vis bare: {name}",
    "sources": "Kilder",
    "src_playlist": "Importer arrangørens spilleliste",
    "src_paste": "Lim inn spilleplan (Beta)",
    "files": "Medfølgende spilleplaner",
    "src_add": "Legg til rad",
    "all_stages": "Alle scener",
    "all_days": "Alle dager",
    "no_day": "Ingen dag",
    "search": "Filtrer på DJ …",
    "col_dj": "DJ / sett",
    "col_when": "Dag / tid",
    "col_status": "Status",
    "col_match": "Funnet video",
    "source": {
      "playlist": "Spilleliste",
      "timetable": "Spilleplan",
      "file": "Spilleplanfil",
      "manual": "Lagt til for hånd"
    },
    "edited": "Endret for hånd – disse verdiene går foran senere importer",
    "check_title": "Samle dette settet",
    "all_title": "Velg alle / ingen (viste rader)",
    "m_none": "Ikke søkt ennå",
    "m_searched": "Ingenting funnet ({date})",
    "confirm": "Bekreft",
    "confirm_title": "Usikkert treff – bekreft at dette er riktig sett",
    "reject_title": "Ikke denne videoen – aldri foreslå den for denne raden igjen",
    "reject": "Forkast treffet",
    "candidates": "Andre treff: {n}",
    "candidates_head": "Bruk et annet treff",
    "ignore": "Ignorer dette settet",
    "unignore": "Slutt å ignorere",
    "delete_row": "Slett rad",
    "f_artist": "DJ / artist",
    "f_day": "Dag",
    "f_start": "Start",
    "f_end": "Slutt",
    "add_ok": "Legg til",
    "err_artist": "DJ / artist er påkrevd.",
    "none_title": "Ingen rader",
    "none_text": "Ingen rad passer til de gjeldende filtrene.",
    "rows_empty_title": "Denne sjekklisten er tom",
    "rows_empty_text": "Start med arrangørens offisielle spilleliste – én flat oppføring dekker som regel de fleste settene. Eller lim inn spilleplanen som tekst.",
    "checked_of": "av {total} haket av",
    "select_all": "Velg alle",
    "select_none": "Ingen",
    "shown": "{n} av {total} rader vises",
    "to_confirm": "Må bekreftes: {n}",
    "to_confirm_title": "Usikre treff venter på bekreftelsen din – klikk for å vise bare dem",
    "find": "Søk etter manglende sett ({n})",
    "find_again": "Søk på nytt ({n})",
    "find_title": "Søker etter avhakede sett uten treff, ett om gangen og i rolig tempo – viser først et anslag",
    "find_again_title": "Alle sett er allerede søkt – søk på nytt etter dem uten treff",
    "find_none": "Ingenting å søke etter – hvert avhaket sett har et treff",
    "find_running": "Søket pågår",
    "queue": "Last ned avhakede ({n})",
    "queue_title": "Legg alle avhakede, bekreftede sett i nedlastingskøen",
    "queue_none": "Ingenting å laste ned – ingen avhakede sett med et bekreftet treff som ikke er lastet ned",
    "job_pending": "Venter",
    "job_running": "Søker …",
    "job_paused": "Satt på pause",
    "job_hits": "Funnet: {n}",
    "job_cancel": "Stopp",
    "job_resume": "Fortsett",
    "imp_running": "Leser spillelisten …",
    "imp_entries": "Oppføringer: {n}",
    "imp_hint": "flat oppføring, side for side",
    "imp_busy": "En spilleliste leses allerede",
    "imp_added": "nye: {n}",
    "imp_merged": "slått sammen: {n}",
    "imp_matched": "funnet i biblioteket: {n}",
    "imp_unchecked": "uten hake (for korte / aftermovie): {n}",
    "imp_invalid": "ugyldige: {n}",
    "pl_title": "Importer arrangørens spilleliste",
    "pl_text": "Arrangørens offisielle liveset-spilleliste er den billigste kilden: én flat oppføring, ingenting lastes ned. Hver oppføring blir en bekreftet rad; DJ, scene og settype hentes fra tittelen.",
    "pl_url": "Lenke til spillelisten",
    "pl_hint": "YouTube-spilleliste eller SoundCloud-sett. For korte oppføringer, aftermovies og trailere legges til uten hake. Rader fra en spilleplan får den videoen som passer.",
    "pl_ok": "Importer",
    "pl_err_empty": "Lim inn lenken til en spilleliste.",
    "toast_pl_started": "Leser spillelisten – kjører i bakgrunnen",
    "toast_pl_done": "Spillelisten er lest –",
    "toast_pl_cancelled": "Importen av spillelisten ble stoppet –",
    "tt_title": "Lim inn spilleplan – {name} (Beta)",
    "tt_text": "Lim inn spilleplanen som tekst eller CSV. Overskrifter angir dag og scene, hver annen linje er et sett. Ingenting lagres før du importerer.",
    "tt_input": "Spilleplan",
    "tt_preview": "Forhåndsvisning",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Her vises settene som gjenkjennes.",
    "tt_nothing": "Ingen sett gjenkjent ennå.",
    "tt_sum": "Sett: {n}",
    "tt_days": "Dager: {n}",
    "tt_stages": "Scener: {n}",
    "tt_skipped": "Linjer som ikke ble forstått: {n}",
    "tt_more": "… og {n} til",
    "tt_ok": "Importer ({n})",
    "tt_edit_hint": "Rett eller fjern sett her før import. Endrer du teksten til venstre, leses den på nytt.",
    "toast_tt": "Spilleplanen er importert –",
    "files_text": "Spilleplaner som vedlikeholdes i HCLoader-repositoriet og følger med oppdateringer. En import oppretter sjekklisten for den utgaven.",
    "files_empty_title": "Ingen spilleplaner følger med ennå",
    "files_empty": "Bare spilleplaner som beviselig stemmer følger med – denne versjonen har ingen. Lim inn spilleplanen som tekst i stedet.",
    "files_how_title": "Bidra med en spilleplan",
    "files_how": "Én JSON-fil per utgave med settene (artist, scene, dag, start, slutt) og en lenke til den offisielle spilleplanen som kilde. Send den inn som issue eller pull request på GitHub; README-filen ved siden av filene beskriver formatet.",
    "files_meta": "Sett: {n} · oppdatert {date}",
    "files_source": "offisiell kilde",
    "files_import": "Importer",
    "files_broken": "Ugyldig fil: {error}",
    "files_unknown": "Serien er ukjent eller skjult her",
    "est_title": "Søk etter manglende sett – {name}",
    "est_text": "Søker etter hvert avhaket sett uten treff, ett om gangen: <b>DJ + festival + år</b> som flatt søk gjennom strupingen. Ingenting lastes ned.",
    "est_requests": "søk",
    "est_left": "ledige denne timen",
    "est_again": "Alle sett er allerede søkt – nå søkes de uten treff på nytt.",
    "est_offline": "Nettopp koblet til biblioteket ditt, gratis: {n}.",
    "est_resume": "Fortsetter det avbrutte søket.",
    "est_wait": "Søkegrensen for denne timen er brukt opp – det første søket starter {t}.",
    "est_backoff": "Backoff aktiv til {t} – ingen søk kan starte før det.",
    "est_pace": "Høyst {n} søk per time, jevnt fordelt (omtrent ett hvert {min}. min). Usikre treff venter på bekreftelsen din. En backoff, at appen lukkes eller en feil avbryter bare søket – det fortsetter automatisk.",
    "est_ok": "Start søk",
    "est_ok_resume": "Fortsett søk",
    "toast_find_started": "Søker etter manglende sett fra «{name}» – kjører i bakgrunnen",
    "toast_find_done": "Søket er ferdig – fant {n} av {total}",
    "toast_find_cancelled": "Søket ble stoppet – «Søk etter manglende sett» fortsetter det",
    "toast_offline": "Koblet til biblioteket ditt: {n} – ingen søk nødvendig",
    "toast_confirmed": "«{name}» bekreftet",
    "toast_rejected": "Treffet for «{name}» forkastet",
    "toast_ignored": "«{name}» ignoreres",
    "toast_unignored": "«{name}» samles igjen",
    "toast_row_added": "«{name}» lagt til",
    "toast_row_added_hit": "«{name}» lagt til – funnet i biblioteket",
    "toast_row_saved": "«{name}» lagret",
    "toast_row_retag": "«{name}» lagret – filen tagges på nytt",
    "toast_row_deleted": "Raden «{name}» ble slettet",
    "q_none": "Ingenting ble lagt i køen",
    "q_unconfirmed": "ubekreftet: {n}",
    "q_missing": "uten treff: {n}",
    "q_other": "kan ikke lastes: {n}",
    "q_retag": "tagget på nytt: {n}"
  },
  "tracks": {
    "nav": "Spor",
    "open_title": "Hvilke sett spiller et spor? Søk i bibliotekets sporlister",
    "title": "Spor",
    "sub": "Hvilke sett spiller dette sporet?",
    "back": "Tilbake til biblioteket",
    "search": "Artist eller tittel, f.eks. Dragonborn",
    "n_tracks": {
      "one": "{n} spor",
      "other": "{n} spor"
    },
    "n_sets": {
      "one": "{n} sett",
      "other": "{n} sett"
    },
    "status": "{tracks} i {sets}",
    "status_last": "Lest inn:",
    "scan": "Les inn sporlister",
    "scan_title": "Les inn sporlistene for alle sett (frakoblet: kapitler, beskrivelser, CUE-filer)",
    "rescan": "Les inn alt på nytt",
    "rescan_title": "Les inn sporlistene for alle sett på nytt",
    "scan_new": "Les inn nye",
    "scan_new_title": "Les bare inn sett som er nye eller endret siden forrige gang",
    "running": "Leser inn sporlister … {done} / {total}",
    "engine_like": "Enkelt søk: denne SQLite har ingen fulltekstindeks",
    "top_title": "Mest spilte spor",
    "top_sub": "i flest sett",
    "top_sets": {
      "one": "{n} sett",
      "other": "{n} sett"
    },
    "top_find": "Vis sett med dette sporet",
    "top_empty": "Ingen spor finnes ennå i mer enn ett sett.",
    "results": {
      "one": "{n} sett med «{q}»",
      "other": "{n} sett med «{q}»"
    },
    "truncated": "de første {n} – avgrens søket",
    "more_hits": {
      "one": "+ {n} treff til",
      "other": "+ {n} treff til"
    },
    "no_results_title": "Ingen sett spiller «{q}»",
    "no_results_text": "Prøv en del av artisten eller tittelen. Bare sett med sporliste (kapitler, beskrivelse, CUE-fil) blir funnet.",
    "empty_title": "Ingen sporlister ennå",
    "empty_text": "HCLoader leser sporlister fra kapitler, beskrivelser og CUE-filer i settene dine – frakoblet, uten å spørre YouTube.",
    "empty_none_title": "Ingen av settene dine har en sporliste",
    "empty_none_text": "Sporlister kommer fra kapitler, beskrivelser med tidsstempler og CUE-filer. Sett uten dem kan ikke søkes i.",
    "library_empty": "Last ned noen sett først – sporlistene deres vises her.",
    "jump": "Spill fra {time}",
    "jump_external": "Åpnet i standardspilleren – hopp til {time} der",
    "no_time": "Ingen tidsstempel i sporlisten",
    "tracklist": "Sporliste",
    "tracklist_title": "Vis hele sporlisten for dette settet",
    "panel_source": "Kilde: {source}",
    "source_chapters": "kapitler",
    "source_description": "beskrivelse",
    "source_id3": "ID3-kapitler",
    "source_cue": "CUE-fil",
    "source_none": "ingen",
    "panel_empty": "Dette settet har ingen sporliste",
    "panel_empty_hint": "Fant verken kapitler, en beskrivelse med sporliste eller en CUE-fil.",
    "close": "Lukk",
    "id_track": "Uutgitt eller ukjent spor (ID)",
    "play_set": "Spill settet fra starten",
    "toast_done": "Sporlister lest inn: {sets}, {tracks}",
    "toast_cancelled": "Innlesing av sporlister avbrutt"
  }
});
