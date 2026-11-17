/* HCLoader UI texts – Latviešu.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "lv", "name": "Latviešu", "dir": "ltr", "intl": "lv-LV"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "SMAGĀS MŪZIKAS ARHĪVS",
    "mock": "DEMO REŽĪMS"
  },
  "nav": {
    "discover": "Meklēšana",
    "inbox": "Ienākošie",
    "watchlist": "Vērojamie",
    "downloads": "Lejupielādes",
    "library": "Bibliotēka",
    "log": "Žurnāls",
    "settings": "Iestatījumi"
  },
  "navfoot": {
    "today": "ŠODIEN",
    "next": "NĀKAMĀ PĀRBAUDE"
  },
  "common": {
    "ok": "Labi",
    "cancel": "Atcelt",
    "save": "Saglabāt",
    "delete": "Dzēst",
    "edit": "Rediģēt",
    "remove": "Noņemt",
    "reset": "Atiestatīt",
    "on": "ieslēgts",
    "off": "izslēgts",
    "current": "pašreizējā",
    "loading": "ielādē …",
    "add_chip": "+ pievienot",
    "empty": "„tukšs“",
    "empty_list": "„nav“"
  },
  "fmt": {
    "today": "šodien",
    "yesterday": "vakar",
    "never": "nekad",
    "no_date": "Datums nav zināms",
    "just_now": "tikko",
    "today_at": "šodien {t}",
    "tomorrow_at": "rīt {t}",
    "yesterday_at": "vakar {t}",
    "views": {
      "zero": "{v} skatījumu",
      "one": "{v} skatījums",
      "other": "{v} skatījumi"
    }
  },
  "unit": {
    "s": "s",
    "h": "st.",
    "minutes": "minūtes",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "rakstzīmes",
    "results": "rezultāti",
    "entries": "ieraksti",
    "clock": "st.",
    "req_h": "piepr./h"
  },
  "range": {
    "ge_sleep": "≥ minimums",
    "ge_initial": "≥ sākuma vērtība"
  },
  "status": {
    "new": "Jauns",
    "inbox": "Ienākošajos",
    "queued": "Rindā",
    "downloading": "Lejupielādē",
    "done": "Lejupielādēts",
    "ignored": "Ignorēts",
    "failed": "Kļūda"
  },
  "period": {
    "all": "Visi",
    "7d": "Pēdējās 7 dienas",
    "30d": "Pēdējās 30 dienas",
    "1y": "Pēdējie 12 mēneši",
    "year": "Konkrēts gads",
    "custom": "Pielāgots"
  },
  "source_type": {
    "channel": "Kanāls",
    "playlist": "Atskaņošanas saraksts",
    "search": "Meklēšana"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Platforma",
    "sc_off": "SoundCloud ir izslēgts – ieslēdziet sadaļā Iestatījumi › SoundCloud."
  },
  "genre": {
    "change": "Mainīt žanru",
    "manual": "Žanrs iestatīts manuāli",
    "change_manual": "Mainīt žanru (iestatīts manuāli)"
  },
  "run_kind": {
    "watchlist": "Vērojamie avoti",
    "headless": "Uzdevumu plānotājs",
    "manual": "Manuāls"
  },
  "phase": {
    "waiting": "Gaida",
    "sleep": "Pauze līdz nākamajai lejupielādei",
    "download": "Lejupielādē",
    "convert": "Konvertē",
    "tag": "Atzīmē",
    "failed": "Neizdevās"
  },
  "po_mode": {
    "off": "Izslēgts",
    "script": "Skripts",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Izslēgts",
    "script": "Skripts (Deno)",
    "http": "HTTP serveris (lokāls)"
  },
  "statusbar": {
    "ok": "Labi",
    "missing": "trūkst",
    "po": "PO-Token",
    "po_active": "aktīvs ({mode})",
    "po_inactive": "neaktīvs",
    "po_error": "Kļūda",
    "backoff": "Pauze",
    "backoff_none": "nav",
    "backoff_until": "līdz {t} · atlicis {rest}",
    "queue": "Rinda",
    "queue_empty": "tukša",
    "queue_active": "aktīva",
    "queue_paused": "apturēta",
    "today": "Šodien",
    "next": "Nākamā pārbaude",
    "next_off": "izslēgta",
    "backoff_until_short": "līdz {t}",
    "sc_backoff": "Pauze līdz {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · šodien lejupielādēts {day}/{day_max} · šajā stundā meklējumu {s}/{s_max}",
    "sc_tip": "SoundCloud · šodien lejupielādēts {day}/{day_max} · šajā stundā meklējumu {s}/{s_max}",
    "backoff_tip": "{p}: pauze līdz {t} (atlicis {rest})"
  },
  "schedule": {
    "due": "jāpārbauda",
    "kind_app": "Lietotne",
    "kind_task": "Uzdevums",
    "tip_app": "Nākamā vērojamo avotu pārbaude lietotnē: {t} (kamēr darbojas HCLoader).",
    "tip_task": "Nākamā vērojamo avotu pārbaude ar Windows uzdevumu plānotāju: {t}.",
    "tip_any": "Nākamā vērojamo avotu pārbaude: {t}.",
    "tip_off": "Automātiskas pārbaudes nav – ne lietotnē, ne ar Windows uzdevumu plānotāju.",
    "tip_backoff": "Kamēr ir spēkā pauze, pārbaužu nav."
  },
  "card": {
    "source": "Atrasts vērojamajā avotā “{name}”",
    "select": "Atlasīt",
    "open": "Atvērt vietnē {p}",
    "ignore": "Ignorēt",
    "unignore": "Pārstāt ignorēt",
    "more": "Citas darbības",
    "download": "Lejupielādēt",
    "watch": "Pievienot kanālu vērojamajiem",
    "block": "Bloķēt kanālu",
    "set_genre": "Iestatīt žanru",
    "date_approx": "Aptuvens datums – YouTube meklēšana norāda tikai “pirms X gadiem”",
    "date_unknown": "Augšupielādes datums nav norādīts",
    "duplicate": "Iespējams, jau lejupielādēts ({p})",
    "duplicate_title": "Ļoti līdzīgs nosaukums un tāds pats garums kā “{title}” ({p}) – tur jau lejupielādēts vai ielikts rindā. Joprojām varat lejupielādēt.",
    "preview": "Tikai priekšskatījums (Go+) – nevar lejupielādēt",
    "preview_title": "SoundCloud šim ierakstam nodrošina tikai 30 sekunžu priekšskatījumu (Go+). To nevar lejupielādēt."
  },
  "discover": {
    "placeholder": "Meklējiet miksus, dzīvos setus, DJ, pasākumus …",
    "search": "Meklēt",
    "searching_btn": "Meklē …",
    "searching": "Meklē – vienkāršs vaicājums, saudzīgs pret YouTube …",
    "sort": "Kārtot",
    "sort_rel": "Atbilstība",
    "sort_date": "Jaunākie vispirms",
    "sort_dur": "Garākie vispirms",
    "sort_views": "Visvairāk skatījumu",
    "quota": "Meklējumi šajā stundā: {n} / {max}",
    "quota_sc": "SoundCloud meklējumi šajā stundā: {n} / {max}",
    "placeholder_sc": "Meklēt SoundCloud: miksi, seti, DJ, podkāsti …",
    "platform_title": "Kur meklēt",
    "searching_sc": "Meklē – vienkāršs vaicājums, saudzīgs pret SoundCloud …",
    "ready_text_sc": "Ievadiet meklēšanas frāzi un nospiediet Enter, lai meklētu SoundCloud.",
    "previews": "{n} tikai priekšskatījums (Go+)",
    "previews_title": "Go+ priekšskatījumus nekad nevar lejupielādēt. Redzami, kad opcija “Slēpt lejupielādētos un ignorētos” ir izslēgta.",
    "filters": "Filtri",
    "toggle_filters": "Rādīt/paslēpt filtru paneli",
    "f_duration": "Garums (minūtēs)",
    "f_min": "Minimums",
    "f_max": "Maksimums (tukšs = bez ierobežojuma)",
    "f_max_ph": "maks.",
    "f_period": "Augšupielādes periods",
    "f_year": "Gads",
    "f_year_prev": "Gadu atpakaļ",
    "f_year_next": "Gadu uz priekšu",
    "f_from": "No",
    "f_to": "Līdz",
    "f_hint_year": "YouTube meklēšana norāda tikai aptuvenu datumu (“pirms 13 gadiem”). Tāpēc tiek ņemta vērā ±1 gada novirze – kā arī katrs miks ar “{year}” nosaukumā.",
    "f_hint_custom": "YouTube meklēšana norāda tikai aptuvenu datumu. Aptuveniem datumiem abos galos tiek ņemta vērā ±1 gada novirze.",
    "chip_title": "Klikšķis: rādīt/paslēpt žanru · Dubultklikšķis: tikai šis žanrs (tā termini tiek pievienoti meklēšanai)",
    "scope": "Meklēšana papildināta ar",
    "scope_title": "Nākamajā meklēšanā šie termini tiks pievienoti jūsu meklēšanas tekstam.",
    "searched": "Meklēts ar",
    "stale": "Filtri mainīti kopš",
    "re_search": "Meklēt vēlreiz",
    "re_search_title": "Rezultāti ir no pēdējās meklēšanas. Meklējiet vēlreiz, lai žanrs un gads tiktu iekļauti meklēšanas frāzē (skaitās kā viens meklējums).",
    "need_query": "Lūdzu, vispirms ievadiet meklēšanas frāzi.",
    "f_inc": "Iekļaujamie atslēgvārdi",
    "f_exc": "Izslēdzamie atslēgvārdi",
    "f_show": "Attēlošana",
    "f_hide": "Slēpt lejupielādētos un ignorētos",
    "f_blacklist": "Piemērot kanālu melno sarakstu",
    "count": {
      "zero": "{n} rezultātu · {hidden} izfiltrēti",
      "one": "{n} rezultāts · {hidden} izfiltrēti",
      "other": "{n} rezultāti · {hidden} izfiltrēti"
    },
    "selected": "Atlasīti: {n}",
    "select_all": "Atlasīt visu",
    "download_sel": "Lejupielādēt atlasītos",
    "ready_title": "Gatavs",
    "ready_text": "Ievadiet meklēšanas frāzi un nospiediet Enter.",
    "none_title": "Nekas nav atrasts",
    "none_text": "Atslābiniet filtrus vai izmēģiniet citas meklēšanas frāzes.",
    "none_year": "Nav rezultātu no {year}. gada. Meklējiet vēlreiz, lai gads tiktu iekļauts meklēšanas frāzē, vai nomainiet gadu."
  },
  "inbox": {
    "title": "Ienākošie",
    "sub": "Jauni vērojamo avotu atradumi, kas atbilst visiem filtriem",
    "sub_n": {
      "zero": "{n} jauns vērojamo avotu atradums, kas atbilst visiem filtriem",
      "one": "{n} jaunu vērojamo avotu atradumu, kas atbilst visiem filtriem",
      "other": "{n} jauni vērojamo avotu atradumi, kas atbilst visiem filtriem"
    },
    "ignore_all": "Ignorēt visus",
    "download_all": "Lejupielādēt visus",
    "ignore_sel": "Ignorēt atlasītos",
    "download_sel": "Lejupielādēt atlasītos",
    "select_all": "Atlasīt visu",
    "select_none": "Noņemt atlasi",
    "src_all": "Visi avoti",
    "src_none": "Bez avota",
    "src_title": "Rādīt tikai šī avota atradumus",
    "count": {
      "zero": "{n} atradumu",
      "one": "{n} atradums",
      "other": "{n} atradumi"
    },
    "count_of": "{n} no {total} atradumiem",
    "selected": "Atlasīti: {n}",
    "empty_title": "Ienākošo nav",
    "empty_text": "Vērojamie avoti nav atraduši jaunus miksus.",
    "empty_nosrc": "Vērojamo avotu vēl nav – pievienojiet kanālu, atskaņošanas sarakstu vai meklējumu, un jaunie miksi parādīsies šeit.",
    "empty_next": "Nākamā pārbaude: {t}.",
    "to_watchlist": "Doties uz vērojamajiem"
  },
  "watchlist": {
    "title": "Vērojamie avoti",
    "sub_n": {
      "zero": "{n} avotu · {active} aktīvi",
      "one": "{n} avots · {active} aktīvs",
      "other": "{n} avoti · {active} aktīvi"
    },
    "sub_next": "nākamā pārbaude {t}",
    "add": "Avots",
    "check_all": "Pārbaudīt visus tagad",
    "check": "Pārbaudīt",
    "checking": "pārbauda …",
    "queued": "gaida …",
    "running": "Pārbauda …",
    "running_n": "Pārbauda {i} / {n} …",
    "col_active": "Aktīvs",
    "col_name": "Nosaukums",
    "col_type": "Veids",
    "col_genre": "Žanrs",
    "col_auto": "Jaunie atradumi",
    "col_max": "Maks.",
    "col_last": "Pēdējā pārbaude",
    "col_new": "Jauni",
    "genre_auto": "automātiski",
    "genre_auto_long": "Automātiski (pēc atslēgvārdiem)",
    "auto_on": "lejupielādēt",
    "auto_off": "ienākošie",
    "auto_title_on": "Jaunie atradumi tiek lejupielādēti automātiski",
    "auto_title_off": "Jaunie atradumi nonāk tikai ienākošajos",
    "new_title": "Rādīt ienākošajos",
    "check_title": "Pārbaudīt šo avotu tagad",
    "why_off": "Avots nav aktīvs",
    "why_running": "Pārbaude jau notiek",
    "why_backoff": "Pauze ir aktīva – pārbaude nav iespējama",
    "why_backoff_p": "Pauze ({p}) ir aktīva – pārbaude nav iespējama",
    "why_sc_off": "SoundCloud ir izslēgts",
    "error_title": "Pēdējā pārbaude neizdevās",
    "backoff": "<b>Pauze ir aktīva līdz {t}</b> (atlicis {rest}). Vērojamos avotus pārbaudīt nevar – ieplānotās pārbaudes arī tiek apturētas.",
    "backoff_p": "<b>Pauze ({p}) ir aktīva līdz {t}</b> (atlicis {rest}). {p} avoti līdz tam tiek izlaisti – {other} darbojas tālāk.",
    "backoff_link_sc": "Atvērt SoundCloud",
    "backoff_link": "Atvērt ierobežošanu",
    "none_active": "Nav aktīva avota, ko pārbaudīt",
    "empty_title": "Nav avotu",
    "empty_text": "Pievienojiet kanālu, atskaņošanas sarakstu vai saglabātu meklējumu.",
    "add_title": "Pievienot avotu",
    "edit_title": "Rediģēt avotu",
    "f_type": "Veids",
    "f_name": "Nosaukums",
    "f_url": "URL",
    "f_query": "Meklēšanas frāze",
    "f_genre": "Noklusējuma žanrs",
    "f_max": "Maks. ierakstu",
    "f_newest_last": "Jaunākie ir beigās (lasīt sarakstu atpakaļ)",
    "hint_newest_last": "Daudzos atskaņošanas sarakstos YouTube jaunos video pievieno beigās. Tiek nolasīts viss saraksts (apmēram 1 pieprasījums uz 100 video, maks. 2000 ierakstu).",
    "rev_title": "Jaunākie ir beigās – saraksts tiek lasīts no beigām",
    "rev_short": "atpakaļ",
    "f_enabled": "Aktīvs – iekļaut sadaļā “Pārbaudīt visus” un grafikā",
    "f_hits": "Jaunie atradumi",
    "hits_inbox": "Uz ienākošajiem",
    "hits_auto": "Lejupielādēt automātiski",
    "hint_inbox": "Atradumi gaida ienākošajos, līdz tos lejupielādēsiet vai ignorēsiet.",
    "hint_auto": "Atradumi, kas atbilst visiem filtriem, uzreiz nonāk rindā.",
    "hint_channel": "YouTube kanāls (…/@nosaukums vai …/channel/UC…, pēc izvēles /videos vai /streams) vai SoundCloud profils (soundcloud.com/nosaukums).",
    "hint_playlist": "YouTube atskaņošanas saraksts ar “list=…” vai SoundCloud komplekts (soundcloud.com/nosaukums/sets/komplekts). Tiek pārbaudīti jaunākie ieraksti.",
    "f_platform": "Meklēt vietnē",
    "detected": "atpazīts: {p} · {type}",
    "not_detected": "URL nav atpazīts",
    "suggested": "Ieteikums",
    "suggested_title": "Ieteikts no URL. Ja nemainīts, pirmā pārbaude to aizstās ar īsto nosaukumu – vai arī vienkārši pārrakstiet.",
    "hint_name_auto": "Ieteikts no URL – varat brīvi mainīt. Ja nemainīts, pirmā pārbaude iestatīs īsto nosaukumu.",
    "hint_name_later": "Nosaukums tiek iestatīts pirmajā pārbaudē – vai ievadiet to pats.",
    "name_auto_title": "Pagaidu nosaukums – nākamā pārbaude iestatīs īsto",
    "hint_search": "Saglabāts meklējums kā sadaļā “Meklēšana” – katra pārbaude skaitās kā viens meklējums.",
    "hint_max": "vienā pārbaudē",
    "max_default": "(noklusējums)",
    "max_default_title": "Nav savas vērtības: tiek izmantots “Ieraksti uz avotu” no Iestatījumi › Grafiks",
    "max_title": "Tukšs = noklusējums no Iestatījumi › Grafiks. Ne vairāk kā 200, meklēšanas avotiem – 100.",
    "ph_name": "piem., Gabber Vault",
    "ph_name_later": "tiks iestatīts pirmajā pārbaudē",
    "ph_channel": "https://www.youtube.com/@kanals  vai  https://soundcloud.com/nosaukums",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  vai  https://soundcloud.com/nosaukums/sets/…",
    "ph_search": "piem., frenchcore liveset",
    "form_error": "Avotu nevarēja saglabāt."
  },
  "downloads": {
    "title": "Lejupielādes",
    "sub": "Pēc kārtas, viena lejupielāde vienlaikus",
    "pause": "Apturēt",
    "resume": "Turpināt",
    "cancel": "Atcelt",
    "retry": "Mēģināt vēlreiz",
    "remove": "Noņemt",
    "up": "Pārvietot augšup",
    "down": "Pārvietot lejup",
    "eta": "Atlikušais laiks",
    "position": "Pozīcija {n}",
    "sleep_left": "turpināsies pēc",
    "sleep_why": "Ierobežošana: nejauša {min}–{max} s pauze starp divām lejupielādēm",
    "next_up": "Nākamais",
    "sleeping": "Pauze",
    "sleep_range": "no {min}–{max} s",
    "blocked_wait": "Gaida – {why}",
    "why_backoff": "Pauze",
    "why_day": "Dienas limits",
    "why_run": "Palaides limits",
    "why_paused": "apturēts",
    "why_restart": "Nepieciešama restartēšana",
    "why_busy": "darbojas cita palaišana",
    "why_pot": "PO-Token serveris nav gatavs",
    "why_target": "Mērķa mape nav pieejama",
    "why_error": "Trūkst lejupielādes moduļa",
    "summary": "Šodien {day}/{day_max} · Palaišana {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} turpina lejupielādi.",
    "steps": "Lejupielāde · Konvertēšana · Atzīmēšana",
    "unlimited": "neierobežots",
    "l_run": "Šī palaišana",
    "l_day": "Šodien",
    "l_rate": "Ātruma ierobežojums",
    "l_sleep": "Pauze starp lejupielādēm",
    "sec_queue": "Rinda",
    "sec_failed": "Neizdevās",
    "empty_title": "Rinda ir tukša",
    "empty_text": "Atlasiet miksus sadaļā “Meklēšana” vai “Ienākošie”.",
    "paused": "<b>Rinda apturēta.</b> Notiekošā lejupielāde ir apturēta, līdz turpināsiet.",
    "backoff": "<b>Pauze ir aktīva līdz {t}</b> (atlicis {rest}). Lejupielādes, meklēšana un vērojamie avoti ir bloķēti.",
    "backoff_rest": {
      "zero": "<b>Pauze ir aktīva līdz {t}</b> (atlicis {rest}). Lejupielādes, meklēšana un vērojamie avoti ir bloķēti – rindā paliek {n}.",
      "one": "<b>Pauze ir aktīva līdz {t}</b> (atlicis {rest}). Lejupielādes, meklēšana un vērojamie avoti ir bloķēti – rindā paliek {n}.",
      "other": "<b>Pauze ir aktīva līdz {t}</b> (atlicis {rest}). Lejupielādes, meklēšana un vērojamie avoti ir bloķēti – rindā paliek {n}."
    },
    "limit_day": "<b>Sasniegts dienas limits ({n}/{max}).</b> Atlikušie paliek rindā un turpināsies rīt.",
    "limit_day_rest": {
      "zero": "<b>Sasniegts dienas limits ({n}/{max}).</b> Rindā paliek {rest}, tie turpināsies rīt.",
      "one": "<b>Sasniegts dienas limits ({n}/{max}).</b> Rindā paliek {rest}, tie turpināsies rīt.",
      "other": "<b>Sasniegts dienas limits ({n}/{max}).</b> Rindā paliek {rest}, tie turpināsies rīt."
    },
    "limit_run": "<b>Sasniegts limits – {max}/{max} šajā palaišanā.</b> Atlikušie paliek rindā un turpināsies nākamajā palaišanā.",
    "limit_run_rest": {
      "zero": "<b>Sasniegts limits – {max}/{max} šajā palaišanā.</b> Rindā paliek {rest}, tie turpināsies nākamajā palaišanā.",
      "one": "<b>Sasniegts limits – {max}/{max} šajā palaišanā.</b> Rindā paliek {rest}, tie turpināsies nākamajā palaišanā.",
      "other": "<b>Sasniegts limits – {max}/{max} šajā palaišanā.</b> Rindā paliek {rest}, tie turpināsies nākamajā palaišanā."
    },
    "limits_link": "Mainīt limitus",
    "new_run": "Sākt jaunu palaišanu",
    "need_restart": "<b>Nepieciešama restartēšana.</b> yt-dlp tika atjaunināts – lūdzu, restartējiet HCLoader. Rinda tiek saglabāta.",
    "busy": "Darbojas cita lejupielādes palaišana (piem., ieplānotā pārbaude). Rinda gaida, līdz tā beigsies.",
    "local_pot": {
      "zero": "<b>PO-Token serveris nav gatavs.</b> Rindā paliek {rest}; turpinās, tiklīdz serveris darbosies.",
      "one": "<b>PO-Token serveris nav gatavs.</b> Rindā paliek {rest}; turpinās, tiklīdz serveris darbosies.",
      "other": "<b>PO-Token serveris nav gatavs.</b> Rindā paliek {rest}; turpinās, tiklīdz serveris darbosies."
    },
    "local_target": {
      "zero": "<b>Mērķa mape nav pieejama vai tajā nevar rakstīt.</b> Rindā paliek {rest}; turpinās, tiklīdz mape atkal būs pieejama.",
      "one": "<b>Mērķa mape nav pieejama vai tajā nevar rakstīt.</b> Rindā paliek {rest}; turpinās, tiklīdz mape atkal būs pieejama.",
      "other": "<b>Mērķa mape nav pieejama vai tajā nevar rakstīt.</b> Rindā paliek {rest}; turpinās, tiklīdz mape atkal būs pieejama."
    },
    "local_error": {
      "zero": "<b>Lejupielādes moduli (yt-dlp) nevarēja ielādēt.</b> Rindā paliek {rest}. Nākamais mēģinājums – pēc “Turpināt”, jauniem ierakstiem vai iestatījumu saglabāšanas.",
      "one": "<b>Lejupielādes moduli (yt-dlp) nevarēja ielādēt.</b> Rindā paliek {rest}. Nākamais mēģinājums – pēc “Turpināt”, jauniem ierakstiem vai iestatījumu saglabāšanas.",
      "other": "<b>Lejupielādes moduli (yt-dlp) nevarēja ielādēt.</b> Rindā paliek {rest}. Nākamais mēģinājums – pēc “Turpināt”, jauniem ierakstiem vai iestatījumu saglabāšanas."
    },
    "local_link_pot": "Tīkla iestatījumi",
    "local_link_target": "Mainīt glabāšanas vietu",
    "local_link_error": "Apkope"
  },
  "library": {
    "title": "Bibliotēka",
    "sub": {
      "zero": "{n} miksu",
      "one": "{n} miks",
      "other": "{n} miksi"
    },
    "sub_shown": "Parādīti {n} no {total}",
    "search": "Nosaukums, kanāls vai ceļš …",
    "all_genres": "Visi žanri",
    "all_channels": "Visi kanāli",
    "all_years": "Visi gadi",
    "f_genre": "Žanrs",
    "f_channel": "Kanāls",
    "f_year": "Gads",
    "f_sort": "Kārtošana",
    "sort_newest": "Jaunākie vispirms",
    "sort_title": "Nosaukums A–Z",
    "sort_channel": "Kanāls A–Z",
    "sort_duration": "Garākie vispirms",
    "view_list": "Saraksts",
    "view_grid": "Flīzes",
    "clear": "Atiestatīt filtrus",
    "col_title": "Nosaukums",
    "col_channel": "Kanāls",
    "col_genre": "Žanrs",
    "col_year": "Gads",
    "col_duration": "Ilgums",
    "col_size": "Izmērs",
    "col_loaded": "Lejupielādēts",
    "play": "Atskaņot",
    "pause": "Pauze",
    "play_external": "Atvērt noklusējuma atskaņotājā",
    "play_internal": "Atskaņot lietotnes atskaņotājā",
    "play_missing": "Fails nav atrasts – atskaņot nevar",
    "more": "Rādīt vēl {n}",
    "now_playing": "Tagad atskaņo",
    "retag_short": "Atzīmēt atkārtoti",
    "genre_working": "Iestata žanru …",
    "open_folder": "Atvērt mapi",
    "retag": "Atzīmēt atkārtoti (tagi, vāciņš un atrašanās vieta pēc pašreizējiem iestatījumiem)",
    "delete": "Dzēst failu",
    "remove": "Noņemt ierakstu",
    "retagging": "Atzīmē atkārtoti …",
    "cue_title": "Ierakstu saraksts kā .cue fails blakus MP3",
    "missing": "Fails nav atrasts",
    "missing_title": "Fails nav atrasts saglabātajā vietā (pārvietots vai izdzēsts?)",
    "missing_chip": {
      "zero": "trūkst {n}",
      "one": "trūkst {n}",
      "other": "trūkst {n}"
    },
    "missing_chip_title": "Rādīt tikai ierakstus, kuru faila nav",
    "stat_count": "Miksi",
    "stat_duration": "Kopējais ilgums",
    "stat_size": "Izmērs",
    "stat_genres": "Pēc žanra",
    "unit_h": "st.",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "zero": "{n} miksu · {dur}",
      "one": "{n} miks · {dur}",
      "other": "{n} miksi · {dur}"
    },
    "empty_title": "Vēl nekas nav lejupielādēts",
    "empty_text": "Katrs miks šeit parādās, tiklīdz tas ir lejupielādēts un atzīmēts – ar vāciņu, žanru un atrašanās vietu.",
    "empty_discover": "Atklāt miksus",
    "empty_watchlist": "Iestatīt vērojamos avotus",
    "target_down": "Mērķa mape nav pieejama: {path}",
    "target_down_hint": "Pārbaudiet disku vai tīkla koplietojumu. Kamēr tā nav, failu stāvoklis nav zināms: “Atzīmēt atkārtoti” un “Noņemt ierakstu” ir atspējoti.",
    "unknown_title": "Mērķa mape nav pieejama – faila stāvoklis nav zināms",
    "none_title": "Nav rezultātu",
    "none_text": "Neviens ieraksts neatbilst meklēšanai un filtriem.",
    "group_by": "Grupēt pēc",
    "group_none": "Nav",
    "group_genre": "Žanrs",
    "group_festival": "Festivāls",
    "group_artist": "Izpildītājs",
    "group_year": "Gads",
    "group_unknown": "Nezināms"
  },
  "player": {
    "label": "Mini atskaņotājs",
    "play": "Atskaņot (atstarpe)",
    "pause": "Pauze (atstarpe)",
    "back": "30 sekundes atpakaļ",
    "fwd": "30 sekundes uz priekšu",
    "prev": "Iepriekšējais ieraksts",
    "next": "Nākamais ieraksts",
    "seek": "Pozīcija",
    "mute": "Izslēgt skaņu",
    "unmute": "Ieslēgt skaņu",
    "volume": "Skaļums",
    "close": "Aizvērt atskaņotāju",
    "tracks": "Ierakstu saraksts",
    "tracks_n": {
      "zero": "{n} ierakstu",
      "one": "{n} ieraksts",
      "other": "{n} ieraksti"
    },
    "tracks_toggle": "Rādīt/paslēpt ierakstu sarakstu",
    "no_tracks": "Šajā failā nav nodaļu",
    "total": "Kopējais ilgums {t}",
    "keys": "Atstarpe: atskaņot/pauze · ←/→: 10 s",
    "err_load": "Atskaņot nevar",
    "err_src": "Atskaņot nevar: nederīga faila adrese",
    "err_play": "Failu nevar atskaņot: {title}",
    "external": "Tiek atvērts noklusējuma atskaņotājā …"
  },
  "log": {
    "title": "Žurnāls",
    "sub": "Tiešraides žurnāls un palaišanu vēsture",
    "live": "Tiešraides žurnāls",
    "history": "Palaišanu vēsture",
    "lvl_debug": "Atkļūdošana",
    "lvl_info": "Info",
    "lvl_warn": "Brīdinājums",
    "lvl_error": "Kļūda",
    "lvl_title": "Rādīt/paslēpt līmeni “{lvl}”",
    "search": "Meklēt žurnālā …",
    "following": "Tiešraidē",
    "paused": "Apturēts",
    "follow_title": "Automātiski ritināt līdz jaunākajai rindai (apstājas, ritinot uz augšu)",
    "jump": "Uz beigām",
    "jump_new": {
      "zero": "{n} jaunu rindu",
      "one": "{n} jauna rinda",
      "other": "{n} jaunas rindas"
    },
    "copy": "Kopēt",
    "copy_title": "Kopēt redzamās rindas starpliktuvē",
    "open_logs": "Žurnāla mape",
    "open_logs_title": "Atvērt mapi ar pilnajiem žurnāla failiem",
    "lines": {
      "zero": "{n} rindu",
      "one": "{n} rinda",
      "other": "{n} rindas"
    },
    "lines_of": "{n} no {total} rindām",
    "empty": "Šiem līmeņiem rindu nav.",
    "empty_search": "Neviena rinda nesatur “{q}”.",
    "no_runs": "Palaišanu vēl nav.",
    "no_runs_kind": "Šāda veida palaišanu nav.",
    "found": "atrasts",
    "downloaded": "lejupielādēts",
    "errors": "kļūdas",
    "running": "darbojas …",
    "kind_all": "Visi",
    "timeline": "Laika josla",
    "table": "Tabula",
    "view_title": "Palaišanu vēstures skats",
    "col_kind": "Veids",
    "col_start": "Sākums",
    "col_duration": "Ilgums",
    "col_found": "Atrasts",
    "col_downloaded": "Lejupielādēts",
    "col_errors": "Kļūdas",
    "col_note": "Piezīme",
    "backoff": "Pauze",
    "runs_sum": {
      "zero": "{n} palaišanu · {dl} lejupielādēti · {err} kļūdas",
      "one": "{n} palaišana · {dl} lejupielādēti · {err} kļūdas",
      "other": "{n} palaišanas · {dl} lejupielādēti · {err} kļūdas"
    },
    "today": "Šodien",
    "yesterday": "Vakar"
  },
  "settings": {
    "title": "Iestatījumi",
    "sub": "Šeit var konfigurēt visu, ko lietotne dara"
  },
  "tabs": {
    "general": "Vispārīgi",
    "filters": "Filtri un atslēgvārdi",
    "genres": "Žanri",
    "download": "Lejupielāde un kvalitāte",
    "storage": "Glabātuve un tagi",
    "throttle": "Ierobežošana",
    "soundcloud": "SoundCloud",
    "network": "Tīkls un PO-Token",
    "schedule": "Grafiks",
    "appearance": "Izskats",
    "maintenance": "Apkope",
    "festivals": "Festivāli un sērijas"
  },
  "tabs_hint": {
    "general": "Lietotnes pamatuzvedība.",
    "filters": "Noklusējuma filtri meklēšanai un vērojamajiem avotiem. Īslaicīgi var pārrakstīt filtru panelī sadaļā “Meklēšana”.",
    "genres": "Secība = prioritāte. Uzvar pirmais žanrs, kura atslēgvārds ir nosaukumā. Manuāli iestatīti žanri un avota noklusējuma žanrs ir svarīgāki.",
    "download": "YouTube parasti piegādā Opus ar aptuveni 130–160 kbps. MP3 ir konvertēšana un neskan labāk par avotu – bet atskaņojas visur.",
    "storage": "Kur nonāk faili un kā tie tiek nosaukti. Struktūra paredzēta multivides serveriem, piemēram, Plex vai Jellyfin.",
    "throttle": "Ierobežo slodzi uz YouTube. Šīs vērtības attiecas uz meklēšanu, vērojamajiem avotiem un lejupielādēm kopā. SoundCloud ir savas vērtības cilnē “SoundCloud”.",
    "soundcloud": "SoundCloud kā otrs avots meklēšanai, vērojamajiem avotiem un lejupielādēm – ar saviem limitiem, skaitītājiem un pauzi, neatkarīgi no YouTube.",
    "network": "PO-Token identificē pieprasījumus kā īstas pārlūkprogrammas pieprasījumus un samazina robotu bloķēšanas risku.",
    "schedule": "Kad vērojamie avoti tiek pārbaudīti automātiski – lietotnē un ar Windows uzdevumu plānotāju.",
    "appearance": "Izskats un sajūta. Izmaiņas ir redzamas uzreiz un kļūst pastāvīgas tikai pēc saglabāšanas.",
    "maintenance": "Versijas, atjauninājumi, datubāze.",
    "festivals": "Atpazīst festivālu vai sēriju, gadu, skatuvi un seta veidu pēc saglabātajiem nosaukumiem – bezsaistē, bez neviena papildu pieprasījuma."
  },
  "set": {
    "default": "Noklusējums",
    "range": "Diapazons",
    "browse": "Pārlūkot",
    "not_set": "nav iestatīts",
    "saving": "Saglabā …",
    "discard": "Atmest",
    "tab_reset": "Atiestatīt cilni",
    "tab_reset_title": "Iestatīt visus šīs cilnes laukus uz noklusējuma vērtībām (stājas spēkā tikai pēc “Saglabāt”)",
    "state_clean": "Viss saglabāts",
    "state_dirty": {
      "zero": "{n} nesaglabātu izmaiņu",
      "one": "{n} nesaglabāta izmaiņa",
      "other": "{n} nesaglabātas izmaiņas"
    },
    "state_errors": {
      "zero": "{n} kļūdu – lūdzu, izlabojiet",
      "one": "{n} kļūda – lūdzu, izlabojiet",
      "other": "{n} kļūdas – lūdzu, izlabojiet"
    },
    "h": {
      "search": "Meklēšana",
      "duration": "Ilgums un periods",
      "keywords": "Atslēgvārdi",
      "display": "Attēlošana",
      "cover": "Vāciņš",
      "chapters": "Nodaļas un ierakstu saraksts",
      "tags": "Tagi",
      "soundcloud": "SoundCloud",
      "playback": "Atskaņošana",
      "pauses": "Pauzes un joslas platums",
      "limits": "Limiti",
      "backoff": "Pauze pēc bloķēšanas",
      "po": "PO-Token nodrošinātājs",
      "fallback": "Apvedceļi",
      "in_app": "Lietotnē",
      "task": "Windows uzdevumu plānotājs",
      "updates": "Atjauninājumi",
      "app_update": "Lietotnes atjauninājums",
      "release_notes": "Laidiena piezīmes",
      "database": "Datubāze",
      "reset": "Atiestatīšana",
      "detection": "Atpazīšana",
      "series": "Sērijas",
      "backfill": "Ielasīt visu (vienreiz)"
    },
    "general": {
      "language": {
        "label": "Valoda",
        "help": "Saskarnes un ziņojumu valoda. “Automātiski” seko Windows attēlošanas valodai (citādi angļu). Skats tiek pārbūvēts uzreiz pēc saglabāšanas."
      },
      "start_view": {
        "label": "Sākuma skats",
        "help": "Kurš skats tiek atvērts pēc palaišanas."
      },
      "log_level": {
        "label": "Žurnāla līmenis",
        "help": "Cik detalizēts ir žurnāla fails un tiešraides žurnāls. DEBUG tikai problēmu novēršanai."
      },
      "confirm_delete": {
        "label": "Apstiprināt dzēšanu",
        "help": "Pajautāt pirms miksa dzēšanas no bibliotēkas (ieraksts + fails)."
      }
    },
    "player": {
      "mode": {
        "label": "Atskaņot ar",
        "help": "Ko izmanto ▶ bibliotēkā. Iebūvētais atskaņotājs rāda nodaļas kā lēkšanas atzīmes un turpina atskaņot, mainot skatus. Otra iespēja ir pieejama katra ieraksta izvēlnē."
      }
    },
    "search": {
      "results_count": {
        "label": "Rezultāti uz meklējumu",
        "help": "Rezultātu skaits, ko meklējums iegūst (flat). Vairāk rezultātu = lielāka slodze uz YouTube."
      },
      "append_year": {
        "label": "Pievienot gadu meklējumam",
        "help": "Ar augšupielādes periodu “Konkrēts gads” gads tiek pievienots meklēšanas frāzei (piem., “hardcore liveset 2013”). Tā YouTube atrod vairāk šī gada miksu."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Minimālais ilgums",
        "help": "Īsāki video nekad netiek uzskatīti par miksu."
      },
      "max_duration": {
        "label": "Maksimālais ilgums",
        "help": "0 = neierobežots."
      },
      "upload_period": {
        "label": "Augšupielādes periods",
        "help": "Kādas augšupielādes pēc noklusējuma tiek rādītas. “Konkrēts gads” rāda tikai viena gada miksus, “Pielāgots” – no/līdz diapazonu."
      },
      "upload_year": {
        "label": "Gads",
        "help": "Miks tiek ieskaitīts, ja augšupielādes gads sakrīt vai gads ir nosaukumā. YouTube meklēšana norāda tikai aptuvenu datumu – tur tiek ņemta vērā ±1 gada novirze."
      },
      "upload_from": {
        "label": "No",
        "help": "Agrākais augšupielādes datums. Tukšs = atvērts."
      },
      "upload_to": {
        "label": "Līdz",
        "help": "Vēlākais augšupielādes datums. Tukšs = atvērts. Aptuveniem datumiem abos galos tiek ņemta vērā ±1 gada novirze."
      },
      "include_keywords": {
        "label": "Iekļaujamie atslēgvārdi",
        "help": "Vismaz vienam jābūt nosaukumā. Tukšs = atļaut visu. Enter vai komats pievieno."
      },
      "exclude_keywords": {
        "label": "Izslēdzamie atslēgvārdi",
        "help": "Ja kāds no tiem ir nosaukumā, video tiek atmests."
      },
      "match_description": {
        "label": "Meklēt aprakstā",
        "help": "Atslēgvārdi tiek pārbaudīti arī video aprakstā. Flat vaicājumi to bieži nesniedz."
      },
      "hide_done_ignored": {
        "label": "Slēpt lejupielādētos un ignorētos",
        "help": "Slēpt rezultātos jau lejupielādētos un ignorētos video."
      },
      "apply_channel_blacklist": {
        "label": "Piemērot kanālu melno sarakstu",
        "help": "Nekad nerādīt bloķēto kanālu video."
      },
      "hide_cross_platform_duplicates": {
        "label": "Slēpt platformu dublikātus",
        "help": "Slēpt atradumus, kas iespējams jau lejupielādēti vai ielikti rindā no otras platformas (YouTube vai SoundCloud) – tāds pats ilgums (±5 s) un ļoti līdzīgs nosaukums. Izslēgts: tie tiek rādīti ar piezīmi “Iespējams, jau lejupielādēts”."
      }
    },
    "blacklist": {
      "label": "Bloķētie kanāli",
      "help": "Kanālus bloķējat kartītes izvēlnē. Šeit varat tos atkal atbloķēt.",
      "none": "Nav bloķētu kanālu",
      "unblock": "Atbloķēt"
    },
    "genres": {
      "add": "Žanrs",
      "up": "Augstāka prioritāte",
      "down": "Zemāka prioritāte",
      "delete": "Dzēst žanru",
      "color": "Izvēlēties krāsu",
      "name_ph": "Nosaukums",
      "kw_ph": "+ atslēgvārds",
      "fallback": "Rezerves – tiek piemērots, ja neviens atslēgvārds neatbilst. Vienmēr ir, vienmēr pēdējais."
    },
    "download": {
      "audio_format": {
        "label": "Izvades formāts",
        "help": "MP3 vai saglabāt YouTube oriģinālu bez konvertēšanas."
      },
      "mp3_quality": {
        "label": "MP3 kvalitāte",
        "help": "320 kbps CBR ir visvairāk saderīgs, V0 VBR ietaupa nedaudz vietas."
      },
      "embed_cover": {
        "label": "Iegult vāciņu",
        "help": "Ierakstīt sīktēlu, apgrieztu kvadrātā, failā kā vāciņu."
      },
      "write_cover_jpg": {
        "label": "Saglabāt arī cover.jpg",
        "help": "Multivides serveriem, kas nolasa mapju vāciņus."
      },
      "write_cue": {
        "label": "Rakstīt .cue failu",
        "help": "Ierakstu saraksts no nodaļām vai laika atzīmēm aprakstā, blakus audio failam."
      },
      "write_id3_chapters": {
        "label": "Rakstīt ID3 nodaļas",
        "help": "Iegult nodaļu atzīmes (CHAP/CTOC) tieši MP3."
      },
      "keep_original_soundcloud": {
        "label": "Saglabāt SoundCloud oriģinālu",
        "help": "Saglabāt SoundCloud audio nemainītu (AAC 160 kbps kā .m4a, MP3 128 kbps kā .mp3) – bez otras zudumu konvertēšanas. Izslēgts: kā “Izvades formāts”."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Mērķa mape",
        "help": "Mūzikas glabātuves sakne. Pagaidu faili tiek glabāti “.tmp” zem tās. Portatīvajā versijā relatīvs ceļš, piemēram, “.\\Music”, tiek atrisināts attiecībā pret lietotnes mapi (piem., USB atmiņā)."
      },
      "path_template": {
        "label": "Ceļa veidne",
        "help": "Relatīvs pret mērķa mapi, bez faila paplašinājuma. “/” atdala mapes. Jāiekļauj {id} (SoundCloud – “sc-<id>”). {platform} kļūst par “YouTube” vai “SoundCloud” – piem., kā augšējā mape avotu nodalīšanai."
      },
      "max_title_length": {
        "label": "Maks. nosaukuma garums",
        "help": "Garāki nosaukumi faila nosaukumā tiek saīsināti."
      },
      "max_path_length": {
        "label": "Maks. ceļa garums",
        "help": "Pilns ceļš ar mērķa mapi. Bez papildu konfigurācijas Windows pieļauj 259 rakstzīmes."
      },
      "artist_from_title": {
        "label": "Nolasīt izpildītāju no nosaukuma",
        "help": "Atpazīt veidnes “IZPILDĪTĀJS @ PASĀKUMS” un “IZPILDĪTĀJS - NOSAUKUMS”, citādi izmantot kanāla nosaukumu."
      },
      "title_cleanup_patterns": {
        "label": "Tīrīt nosaukumu",
        "help": "Regulārās izteiksmes, kuru atbilstības tiek noņemtas no nosaukuma. Enter pievieno.",
        "ph": "+ regex"
      },
      "album_from_edition": {
        "label": "Albums = izdevums",
        "help": "Ieraksta izdevumu (piem., “Defqon.1 2024”) kā albuma tagu, lai Plex un Jellyfin visus festivāla setus rādītu kā vienu albumu. Izslēgts: albums = nosaukums, kā līdz šim."
      }
    },
    "path_preview": {
      "label": "Priekšskatījums",
      "help": "Noklikšķiniet uz vietturiem, lai ievietotu tos ceļa veidnē.",
      "fest": "{festival}, {event_year} un {stage} tiek aizpildīti tikai tad, ja ir piešķirts festivāls. Citādi tie izkrīt kopā ar liekajiem atdalītājiem un tukšajām mapēm."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pauze starp pieprasījumiem",
        "help": "Gaidīšanas laiks starp metadatu vaicājumiem (meklēšana, vērojamie avoti)."
      },
      "sleep_interval": {
        "label": "Lejupielādes pauze – minimums",
        "help": "Pēc katras lejupielādes seko nejauša pauze starp minimumu un maksimumu."
      },
      "max_sleep_interval": {
        "label": "Lejupielādes pauze – maksimums",
        "help": "Nejaušās pauzes augšējā robeža."
      },
      "limit_rate_mb": {
        "label": "Lejupielādes ātrums",
        "help": "Maksimālais joslas platums. 0 = neierobežots (nav ieteicams)."
      },
      "max_downloads_per_run": {
        "label": "Maks. lejupielāžu uz palaišanu",
        "help": "Atlikušie paliek rindā."
      },
      "max_downloads_per_day": {
        "label": "Maks. lejupielāžu dienā",
        "help": "Skaitītājs aptver manuālās un automātiskās lejupielādes kopā."
      },
      "max_searches_per_hour": {
        "label": "Maks. meklējumu stundā",
        "help": "Pasargā no nejaušas nepārtrauktas meklēšanas."
      },
      "backoff_initial_hours": {
        "label": "Pauze – sākuma vērtība",
        "help": "Bloķēšanas laiks pēc HTTP 429 vai “confirm you’re not a bot”."
      },
      "backoff_max_hours": {
        "label": "Pauze – maksimums",
        "help": "Bloķēšanas laiks dubultojas ar katru nākamo bloķēšanu līdz šai vērtībai."
      }
    },
    "backoff": {
      "none": "Pauze nav aktīva ({p})",
      "none_detail": "Meklēšana, vērojamie avoti un lejupielādes no {p} ir atļautas.",
      "active": "Pauze ir aktīva ({p})",
      "active_detail": "līdz {t} · atlicis {rest} · līmenis {level}",
      "blocked": "{p} signalizēja par bloķēšanu. Meklēšana, vērojamie avoti un lejupielādes no {p} ir bloķētas, līdz laiks beigsies.",
      "clear": "Atcelt manuāli",
      "sc_off": "SoundCloud ir izslēgts",
      "sc_off_detail": "Nav SoundCloud meklēšanas, vērojamo avotu pārbaužu un lejupielāžu no SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Izmantot SoundCloud",
        "help": "Izslēgts: nav SoundCloud meklēšanas, SoundCloud avotu pārbaužu un SoundCloud lejupielāžu. Jau lejupielādētie ieraksti paliek bibliotēkā."
      },
      "sleep_requests": {
        "label": "Pauze starp pieprasījumiem",
        "help": "Gaidīšanas laiks starp metadatu vaicājumiem uz SoundCloud (meklēšana, vērojamie avoti)."
      },
      "sleep_interval": {
        "label": "Lejupielādes pauze – minimums",
        "help": "Pēc katras SoundCloud lejupielādes seko nejauša pauze starp minimumu un maksimumu."
      },
      "max_sleep_interval": {
        "label": "Lejupielādes pauze – maksimums",
        "help": "Nejaušās pauzes augšējā robeža."
      },
      "limit_rate_mb": {
        "label": "Lejupielādes ātrums",
        "help": "Maksimālais joslas platums. 0 = neierobežots (nav ieteicams)."
      },
      "max_downloads_per_run": {
        "label": "Maks. lejupielāžu uz palaišanu",
        "help": "Atsevišķs SoundCloud skaitītājs. Atlikušie paliek rindā."
      },
      "max_downloads_per_day": {
        "label": "Maks. lejupielāžu dienā",
        "help": "Atsevišķs SoundCloud skaitītājs, manuālās un automātiskās lejupielādes kopā."
      },
      "max_searches_per_hour": {
        "label": "Maks. meklējumu stundā",
        "help": "Atsevišķs SoundCloud skaitītājs."
      },
      "backoff_initial_hours": {
        "label": "Pauze – sākuma vērtība",
        "help": "Bloķēšanas laiks pēc tam, kad SoundCloud ziņoja par pārāk daudziem pieprasījumiem (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Pauze – maksimums",
        "help": "Bloķēšanas laiks dubultojas ar katru nākamo bloķēšanu līdz šai vērtībai."
      }
    },
    "ladder": {
      "label": "Līmeņi",
      "help": "Kā bloķēšanas laiks pieaug ar pašreizējām vērtībām.",
      "reset": "Atiestatīt pēc veiksmīgas palaišanas",
      "invalid": "Nederīgas vērtības"
    },
    "network": {
      "po_token_mode": {
        "label": "Režīms",
        "help": "bgutil spraudnis yt-dlp. Skripts palaiž Deno pēc vajadzības, HTTP uztur darbojošos lokālu serveri."
      },
      "po_token_port": {
        "label": "HTTP ports",
        "help": "Tikai HTTP režīmā. Serveris klausās 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Tokena derīgums",
        "help": "Pēc šī laika tiek ģenerēts jauns tokens. Vērtība tiek noapaļota līdz pilnām stundām (vismaz 1 st.)."
      },
      "cookies_from_browser": {
        "label": "Sīkdatnes no pārlūkprogrammas",
        "help": "Pierakstās yt-dlp ar jūsu pārlūkprogrammas pieteikšanos. Ieslēdziet tikai tad, ja bez tā vairs nedarbojas."
      },
      "proxy": {
        "label": "Starpniekserveris",
        "help": "Neobligāts, piem., socks5://127.0.0.1:1080. Tukšs = tiešs savienojums.",
        "ph": "bez starpniekservera"
      }
    },
    "po": {
      "active": "PO-Token ir aktīvs",
      "inactive": "PO-Token nav aktīvs",
      "error": "PO-Token kļūda",
      "mode": "Režīms",
      "test": "Testēt",
      "testing": "Testē …",
      "test_ok": "Tests veiksmīgs.",
      "test_fail": "Tests neizdevās.",
      "unsaved": "Tests izmanto saglabātos iestatījumus. Vispirms saglabājiet izmaiņas."
    },
    "cookies": {
      "warn_off": "<b>Ieteicams: izslēgts.</b> PO-Token un pārlūkprogrammas sīkdatnes kopā var radīt problēmas.",
      "warn_on": "<b>Apvedceļš ir aktīvs.</b> PO-Token un pārlūkprogrammas sīkdatnes kopā var izraisīt kļūdas vai bloķēšanu, un pieprasījumiem tiek izmantots jūsu YouTube konts. Izslēdziet to, tiklīdz bez tā darbojas. Sīkdatnes nekad nenonāk žurnālā."
    },
    "schedule": {
      "in_app_check": {
        "label": "Pārbaudīt, kamēr lietotne darbojas",
        "help": "Vērojamie avoti tiek pārbaudīti iestatītajā intervālā, kamēr logs ir atvērts."
      },
      "watchlist_interval_hours": {
        "label": "Intervāls",
        "help": "Laiks starp divām pārbaudēm lietotnē."
      },
      "entries_per_source": {
        "label": "Ieraksti uz avotu",
        "help": "Cik jaunāko ierakstu tiek iegūti (flat) vienā pārbaudē (noklusējums jauniem avotiem)."
      },
      "task_scheduler_enabled": {
        "label": "Izmantot uzdevumu plānotāju",
        "help": "Vērojamie avoti tiek pārbaudīti arī tad, kad lietotne ir aizvērta (headless). Tiek ieslēgts ar “Izveidot uzdevumu”."
      },
      "task_time": {
        "label": "Laiks",
        "help": "Ieplānotā uzdevuma ikdienas sākuma laiks."
      }
    },
    "next": {
      "title": "Nākamā pārbaude",
      "off": "Nav automātiskas pārbaudes",
      "off_detail": "Nav aktīva ne pārbaude lietotnē, ne Windows uzdevums. Vērojamie avoti tiek pārbaudīti tikai manuāli.",
      "app_detail": "Lietotnē, ik pēc {h} st. – kamēr darbojas HCLoader.",
      "task_detail": "Ar Windows uzdevumu plānotāju, katru dienu plkst. {time} – arī tad, kad lietotne ir aizvērta.",
      "any_detail": "Agrākais no lietotnes intervāla un Windows uzdevuma.",
      "also_task": "Arī: Windows uzdevums katru dienu plkst. {time}.",
      "also_app": "Arī lietotnē ik pēc {h} st.",
      "pending": "Vēl nav ieplānots",
      "pending_detail": "Lietotne iestata nākamo datumu, tiklīdz pirmoreiz pārbauda vērojamos avotus.",
      "due": "Jāpārbauda – drīz sāksies",
      "backoff": "<b>Pauze ir aktīva.</b> Pārbaužu nav līdz {t}; pēc tam datums tiek nokavēts vai izlaists.",
      "unsaved": "Nesaglabātas grafika izmaiņas stājas spēkā tikai pēc saglabāšanas."
    },
    "task": {
      "loading": "Vaicā uzdevumu …",
      "registered": "Uzdevums reģistrēts",
      "registered_detail": "{name} · katru dienu {time} · nākamā palaišana {next}",
      "none": "Uzdevums nav reģistrēts",
      "none_detail": "Izveido ikdienas Windows uzdevumu plkst. {time} (schtasks).",
      "create": "Izveidot uzdevumu",
      "remove": "Noņemt uzdevumu",
      "moved": "Lietotne ir pārvietota – izveidojiet uzdevumu atkārtoti",
      "moved_detail": "Ieplānotais uzdevums joprojām palaiž {cmd}. Izveidojot to atkārtoti, tiks izmantota pašreizējā lietotnes mape.",
      "recreate": "Izveidot uzdevumu atkārtoti",
      "unknown": "Uzdevuma stāvoklis nav zināms",
      "unknown_detail": "Windows uzdevumu plānotājs neatbildēja. Iestatījums paliek nemainīts.",
      "recheck": "Pārbaudīt vēlreiz"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Samazināt efektus",
        "help": "Izslēdz skenēšanas līnijas, traucējumus un visas animācijas."
      },
      "scanlines": {
        "label": "Skenēšanas līnijas un troksnis",
        "help": "Smalks slānis pāri visai saskarnei."
      },
      "pulse_bpm": {
        "label": "Bungu pulss",
        "help": "Ritms, ar kādu pulsē progresa josla."
      }
    },
    "pulse_preview": {
      "label": "Priekšskatījums",
      "help": "Šādi pulsē notiekoša lejupielāde.",
      "off": "Efekti samazināti"
    },
    "versions": {
      "plugin": "PO-Token spraudnis",
      "was": "iepriekš {v}"
    },
    "update": {
      "label": "yt-dlp un spraudnis",
      "help": "YouTube pastāvīgi mainās. Kļūdu gadījumā vispirms atjauniniet (pip venv vidē).",
      "button": "Atjaunināt yt-dlp un spraudni",
      "running": "Atjaunina …",
      "last_check": "Pēdējā pārbaude",
      "restart": "<b>Nepieciešama restartēšana.</b> yt-dlp tika atjaunināts. Meklēšana un lejupielādes ir bloķētas, līdz HCLoader tiks restartēts; rinda tiek saglabāta.",
      "restart_title": "Nepieciešama restartēšana",
      "restart_text": "yt-dlp tika atjaunināts. Lūdzu, aizveriet un restartējiet HCLoader – līdz tam meklēšana un lejupielādes ir bloķētas, rinda tiek saglabāta.",
      "out_live": "Izvade · darbojas {t}",
      "out_done": "Izvade · pabeigts pēc {t}",
      "out_failed": "Izvade · neizdevās",
      "out_last": "Izvade",
      "waiting": "Palaiž pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Pārbaudīt atjauninājumus startējot",
        "help": "yt-dlp un PO-Token spraudnis, ne biežāk kā reizi dienā."
      },
      "check_app_updates_on_start": {
        "label": "Pārbaudīt HCLoader atjauninājumus startējot",
        "help": "Katrā startēšanas reizē vaicā GitHub par jaunu versiju. Nekas netiek lejupielādēts, līdz noklikšķināt."
      },
      "apply_update_on_exit": {
        "label": "Instalēt atjauninājumu izejot",
        "help": "Lejupielādētais atjauninājums tiek instalēts, aizverot HCLoader (“Vēlāk”). Izslēgts: tas tiek piedāvāts vēlreiz nākamajā startēšanas reizē."
      },
      "update_repo": {
        "label": "Atjauninājumu avots (GitHub)",
        "help": "Repozitorijs formātā “īpašnieks/repozitorijs”. Mainiet tikai forkiem."
      }
    },
    "db": {
      "label": "Datubāze",
      "help": "Visu video, avotu un palaišanu statuss. Dublējums nokopē failu mapē “backups”.",
      "backup": "Izveidot DB dublējumu",
      "backing_up": "Veido dublējumu …",
      "open": "Datu mape",
      "open_logs": "Žurnāla mape",
      "open_title": "Atvērt mapi ar datubāzi, konfigurāciju un dublējumiem",
      "open_logs_title": "Atvērt mapi ar žurnāla failiem",
      "info": {
        "zero": "{n} ierakstu · {mb} MB",
        "one": "{n} ieraksts · {mb} MB",
        "other": "{n} ieraksti · {mb} MB"
      },
      "last": "Pēdējais dublējums",
      "never": "vēl nav",
      "keep": "Tiek saglabāti 10 jaunākie dublējumi, vecākie tiek dzēsti nākamā dublējuma laikā.",
      "backups": "Dublējumi",
      "backups_more": "+ vēl {n} vecāku mapē “backups”",
      "fresh": "jauns"
    },
    "reset_all": {
      "label": "Visi iestatījumi",
      "help": "Atiestata visas cilnes uz noklusējuma vērtībām. Datubāze un mūzikas faili netiek skarti.",
      "button": "Atiestatīt visu"
    },
    "festivals": {
      "detect": {
        "label": "Atpazīt automātiski",
        "help": "Piešķir festivālu vai sēriju, gadu, skatuvi un seta veidu jauniem rezultātiem un lejupielādēm. Manuāli iestatītās vērtības nekad netiek pārrakstītas."
      },
      "min_confidence": {
        "label": "Atpazīšanas slieksnis",
        "help": "Drošība, no kuras atbilstība tiek piešķirta. Zem tās tā parādās tikai kā ieteikums, ko varat pieņemt."
      },
      "year_from_upload_date": {
        "label": "Gads no augšupielādes datuma",
        "help": "Ja nosaukumā nav gada, tiek izmantots augšupielādes gads (uzskatāms par mazāk drošu)."
      },
      "match_description": {
        "label": "Meklēt arī aprakstā",
        "help": "Festivālu nosaukumus meklē arī saglabātajā aprakstā."
      },
      "extra_stages": {
        "label": "Papildu skatuves",
        "help": "Skatuvju nosaukumi papildus iebūvētajiem (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ skatuve"
      }
    },
    "fest_types": {
      "label": "Savi setu veidu termini",
      "help": "Vārdi nosaukumā, kas norāda uz seta veidu. Tie tiek pārbaudīti pirms iebūvētajiem terminiem.",
      "ph": "Termins nosaukumā",
      "add": "Termins"
    },
    "fest_test": {
      "label": "Pārbaudīt nosaukumu",
      "help": "Parāda, ko atpazīšana atrod nosaukumā. Nekas netiek saglabāts; spēkā ir saglabātie iestatījumi.",
      "ph": "piem., Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Nekas nav atpazīts",
      "assigned": "tiktu piešķirts",
      "suggested": "tikai ieteikums"
    },
    "fest_status": {
      "title": "Piešķirti {assigned} no {total} miksiem",
      "last": "Pēdējā caurskate",
      "help": "Darbojas bezsaistē ar esošo bibliotēku. Manuālās vērtības paliek; faili netiek atkārtoti atzīmēti vai pārvietoti.",
      "button": "Piešķirt festivālus tagad",
      "running": "Piešķir … {done} / {total}"
    },
    "series": {
      "hint": "Zināmie festivāli, radio šovi un podkāsti. Izmaiņas šajā sarakstā tiek saglabātas uzreiz.",
      "add": "Sērija",
      "show_hidden": "Rādīt paslēptās",
      "reset_all": "Atiestatīt iebūvētās sērijas",
      "builtin": "iebūvēta",
      "own": "sava",
      "modified": "mainīta",
      "hidden": "paslēpta",
      "no_aliases": "nav aizstājvārdu",
      "enable": "Atpazīt šo sēriju",
      "hide": "Paslēpt",
      "restore": "Atjaunot",
      "new_title": "Jauna sērija",
      "edit_title": "Rediģēt sēriju",
      "name": "Nosaukums",
      "kind": "Veids",
      "default_genre": "Noklusējuma žanrs",
      "aliases": "Aizstājvārdi",
      "aliases_help": "Citi rakstības veidi. Pietiek ar vienu atbilstību nosaukumā.",
      "weak_aliases": "Vājie aizstājvārdi",
      "weak_help": "Ikdienas vārdi, kas skaitās tikai kopā ar gadu.",
      "variants": "Varianti",
      "variants_help": "Atsevišķi izdevumi, piem., Australia vai at Home.",
      "channels": "Rīkotāja kanāli",
      "channels_help": "Kanāla nosaukums, ID vai URL. Tikai palielina drošību."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Maks. ieraksti vienam avotam",
        "help": "“Ielasīt visu (vienreiz)” novērošanas sarakstā ielasa ne vairāk kā tik daudz kanāla vai atskaņošanas saraksta ierakstu."
      },
      "backfill_requests_per_hour": {
        "label": "Pieprasījumi stundā",
        "help": "“Ielasīt visu” lapu pieprasījumi tiek sadalīti vienmērīgi (120 = viens ik pēc 30 s); spēkā ir arī parastais intervāls un backoff. Ieplānota palaišana (Uzdevumu plānotājs) turpina ne vairāk kā ar tik daudz pieprasījumiem."
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
        "auto": "Automātiski (sistēmas valoda)"
      }
    },
    "player": {
      "mode": {
        "internal": "Iebūvētais atskaņotājs (ieteicams)",
        "external": "Windows noklusējuma atskaņotājs"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Oriģināls (Opus/M4A, bez konvertēšanas)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Izslēgts",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Bloķēt kanālu",
      "text": "Video no “{ch}” vairs netiks rādīti. Atcelt var sadaļā Iestatījumi › Filtri un atslēgvārdi.",
      "ok": "Bloķēt"
    },
    "ignore_all": {
      "title": "Ignorēt atradumus",
      "text": {
        "zero": "Atzīmēt {n} ienākošo atradumu kā ignorētus? Tie netiks lejupielādēti un vairs neparādīsies ienākošajos.",
        "one": "Atzīmēt {n} ienākošo atradumu kā ignorētus? Tie netiks lejupielādēti un vairs neparādīsies ienākošajos.",
        "other": "Atzīmēt {n} ienākošo atradumu kā ignorētus? Tie netiks lejupielādēti un vairs neparādīsies ienākošajos."
      },
      "ok": "Ignorēt"
    },
    "del_source": {
      "title": "Dzēst avotu",
      "text": "Noņemt “{name}” no vērojamajiem avotiem? Jau lejupielādētie miksi tiek saglabāti."
    },
    "del_mix": {
      "title": "Dzēst miksu",
      "text": "“{title}” tiek noņemts no bibliotēkas, un fails tiek dzēsts no diska:",
      "ok": "Dzēst failu",
      "warn": "<b>To nevar atsaukt.</b> Audio fails un saistītais .cue fails tiek dzēsti. Miks tiek atzīmēts kā “ignorēts” un <b>netiks lejupielādēts atkārtoti</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Noņemt tikai ierakstu",
      "text": "Fails “{title}” atrodas ārpus pašreizējās mērķa mapes, tāpēc netiks dzēsts:",
      "ok": "Noņemt tikai ierakstu",
      "warn": "Fails paliek neskarts savā vietā. Ieraksts pazūd no bibliotēkas, miks tiek atzīmēts kā “ignorēts” un <b>netiks lejupielādēts atkārtoti</b>."
    },
    "remove_mix": {
      "title": "Noņemt ierakstu",
      "text": "Fails “{title}” netika atrasts saglabātajā vietā:",
      "ok": "Noņemt ierakstu",
      "warn": "Ieraksts pazūd no bibliotēkas. Miks tiek atzīmēts kā “ignorēts” un <b>netiks lejupielādēts atkārtoti</b>. Ja fails atrodas citur, tas paliek neskarts."
    },
    "backoff": {
      "title": "Atcelt pauzi",
      "ok": "Tomēr atcelt",
      "text": "Bloķēšanas laiks jūs pasargā: {p} signalizēja, ka saņemts pārāk daudz pieprasījumu.",
      "warn": "<b>Atceliet tikai tad, ja esat pārliecināti, ka bloķēšana ir beigusies.</b> Ja lietotne atkal piekļūs pārāk agri, {p} var ierobežot jūsu IP ilgāk vai uz visiem laikiem."
    },
    "reset_all": {
      "title": "Atiestatīt visu",
      "text": "Visi iestatījumi visās cilnēs tiek nekavējoties iestatīti uz noklusējuma vērtībām un saglabāti.",
      "ok": "Atiestatīt"
    },
    "series_delete": {
      "title": "Dzēst sēriju?",
      "text": "“{name}” un tās izdevumi tiks dzēsti.",
      "warn": {
        "zero": "{n} miksu zaudēs piešķīrumu.",
        "one": "{n} miks zaudēs piešķīrumu.",
        "other": "{n} miksi zaudēs piešķīrumu."
      }
    },
    "series_hide": {
      "title": "Paslēpt sēriju?",
      "text": "“{name}” vairs netiks atpazīta. To var atgūt ar “Rādīt paslēptās”."
    },
    "series_reset": {
      "title": "Atiestatīt iebūvētās sērijas?",
      "text": "Visas iebūvētās sērijas atgriežas sākotnējā stāvoklī, paslēptās parādās atkal. Jūsu pašu sērijas paliek.",
      "ok": "Atiestatīt"
    }
  },
  "toast": {
    "enqueued": {
      "zero": "Rindai pievienoti {n} miksu",
      "one": "Rindai pievienots {n} miks",
      "other": "Rindai pievienoti {n} miksi"
    },
    "enqueued_none": "Nekas nav pievienots – jau rindā vai lejupielādēts",
    "enqueued_skipped": "Izlaisti: {n}",
    "queue_cancelled": "Atcelts: {title}",
    "queue_removed": "Noņemts: {title}",
    "queue_retry": "Atkal ielikts rindā: {title}",
    "queue_paused": "Rinda apturēta",
    "queue_resumed": "Rinda atsākta",
    "new_run": "Sākta jauna palaišana",
    "ignored": "Ignorēts: {title}",
    "unignored": "Atkal redzams: {title}",
    "ignored_n": {
      "zero": "Ignorēti {n} atradumu",
      "one": "Ignorēts {n} atradums",
      "other": "Ignorēti {n} atradumi"
    },
    "opening": "Atver {p} pārlūkprogrammā …",
    "watch_added": "Pievienots vērojamajiem: {ch}",
    "blocked": "Kanāls bloķēts: {ch}",
    "genre_set": "Žanrs iestatīts: {genre}",
    "done": "Lejupielādēts: {title}",
    "failed": "Neizdevās: {title} – {error}",
    "wl_started": {
      "zero": "Pārbauda vērojamos avotus (avotu: {n}, ar ierobežošanu) …",
      "one": "Pārbauda vērojamos avotus (avotu: {n}, ar ierobežošanu) …",
      "other": "Pārbauda vērojamos avotus (avotu: {n}, ar ierobežošanu) …"
    },
    "wl_started_one": "Pārbauda “{name}” …",
    "wl_none": "Nav aktīva avota – nav ko pārbaudīt",
    "wl_done": {
      "zero": "Vērojamie avoti pārbaudīti (avotu: {n}): nekā jauna",
      "one": "Vērojamie avoti pārbaudīti (avotu: {n}): nekā jauna",
      "other": "Vērojamie avoti pārbaudīti (avotu: {n}): nekā jauna"
    },
    "wl_done_found": {
      "zero": "Vērojamie avoti pārbaudīti – jauno atradumu: {n}",
      "one": "Vērojamie avoti pārbaudīti – jauno atradumu: {n}",
      "other": "Vērojamie avoti pārbaudīti – jauno atradumu: {n}"
    },
    "wl_errors": {
      "zero": "Avotu ar kļūdām: {n}",
      "one": "Avotu ar kļūdām: {n}",
      "other": "Avotu ar kļūdām: {n}"
    },
    "source_added": "Avots pievienots: {name}",
    "source_saved": "Avots saglabāts: {name}",
    "source_deleted": "Avots dzēsts: {name}",
    "retagged": "Atkārtoti atzīmēts: {title}",
    "retagged_moved": "Atkārtoti atzīmēts un pārvietots: {title} → {path}",
    "deleted": "Dzēsts: {title}",
    "removed": "Ieraksts noņemts: {title}",
    "folder_opening": "Atver mapi …",
    "copied": {
      "zero": "Nokopētas {n} rindu",
      "one": "Nokopēta {n} rinda",
      "other": "Nokopētas {n} rindas"
    },
    "copy_failed": "Kopēšana nav iespējama",
    "copy_none": "Nav redzamu rindu",
    "settings_saved": "Iestatījumi saglabāti",
    "settings_errors": {
      "zero": "{n} ievades ir nederīgas",
      "one": "{n} ievade ir nederīga",
      "other": "{n} ievades ir nederīgas"
    },
    "backoff_cleared": "Pauze ({p}) atcelta manuāli",
    "genre_moved": "Žanrs: {genre} – pārvietots uz {path}",
    "genre_retagged": "Žanrs: {genre} – tagi atjaunināti",
    "genre_entry_only": "Žanrs: {genre} – mainīts tikai ieraksts, fails nav pieejams",
    "genre_failed": "Žanru nevarēja iestatīt: {error}",
    "task_created": "Uzdevums izveidots Windows uzdevumu plānotājā",
    "task_removed": "Uzdevums noņemts",
    "updated": "Atjaunināts līdz yt-dlp {v}",
    "up_to_date": "Jau ir jaunākā versija (yt-dlp {v})",
    "update_failed": "Atjaunināšana neizdevās",
    "restart_required": "Atjaunināts – lūdzu, restartējiet HCLoader, lai meklēšana un lejupielādes atkal darbotos",
    "backup_done": "Dublējums izveidots: {path}",
    "reset_all": "Visi iestatījumi atiestatīti",
    "festival_entry_only": "“{name}” saglabāts tikai ierakstā – fails nav pieejams",
    "series_saved": "Sērija “{name}” saglabāta",
    "series_deleted": "Sērija “{name}” dzēsta",
    "series_hidden": "Sērija “{name}” paslēpta",
    "series_reset": "Iebūvētās sērijas atjaunotas",
    "assign_done": "Festivāli piešķirti: jauni {assigned}, ieteikumi {suggested}",
    "assign_cancelled": "Piešķiršana pārtraukta: jauni {assigned}, ieteikumi {suggested}"
  },
  "upd": {
    "available": "Pieejama versija {v}",
    "available_sub": "Instalēta: {cur}",
    "download": "Lejupielādēt",
    "notes": "Izmaiņas",
    "later": "Vēlāk",
    "close": "Aizvērt",
    "cancel": "Atcelt",
    "retry": "Mēģināt vēlreiz",
    "downloading": "Lejupielādē atjauninājumu {v}",
    "phase_download": "Lejupielāde",
    "phase_verify": "Pārbaude",
    "phase_prepare": "Sagatavošana",
    "ready": "Atjauninājums {v} gatavs",
    "ready_sub": "Lai instalētu, HCLoader uz brīdi tiek aizvērts un restartēts.",
    "restart_now": "Restartēt tagad",
    "on_exit": "Izejot",
    "applying": "Instalē atjauninājumu …",
    "applying_sub": "HCLoader drīz aizvērsies un restartēsies.",
    "error": "Lietotnes atjaunināšana neizdevās",
    "blocked": "Automātiska atjaunināšana nav iespējama",
    "notes_title": "Versijas {v} izmaiņas",
    "notes_empty": "Izlaides piezīmju nav.",
    "notes_link": "Izlaide vietnē GitHub",
    "notes_all": "Rādīt visas izmaiņas",
    "notes_less": "Rādīt tikai svarīgāko",
    "confirm_title": "Restartēt tagad?",
    "confirm_ok": "Restartēt",
    "confirm_text": "HCLoader tiek aizvērts, atjauninājums instalēts un lietotne restartēta. Notiekošā lejupielāde tiek pārtraukta un paliek rindā. Mūzika, iestatījumi un datubāze paliek nemainīti.",
    "on_exit_toast": "Atjauninājums tiks instalēts, kad HCLoader aizvērsies.",
    "later_toast": "Atjauninājums paliek gatavs un tiks piedāvāts vēlreiz nākamajā startēšanas reizē.",
    "section_label": "HCLoader versija",
    "section_help": "Jaunās versijas nāk no GitHub. Atjauninājumi neskar datus, iestatījumus un mūziku; pirms datubāzes migrācijas automātiski tiek izveidots dublējums.",
    "current": "Instalēta",
    "latest": "Jaunākā",
    "checked": "Pēdējā pārbaude",
    "check_now": "Pārbaudīt tagad",
    "checking": "Pārbauda …",
    "st_idle": "Ir jaunākā versija",
    "st_available": "Pieejama jauna versija",
    "st_checking": "Pārbauda …",
    "st_downloading": "Lejupielādē …",
    "st_ready": "Gatavs instalēšanai",
    "st_applying": "Instalē …",
    "st_error": "Kļūda",
    "st_unknown": "Vēl nav pārbaudīts",
    "up_to_date": "HCLoader ir jaunākajā versijā (v{v})",
    "portable": "Portatīvā versija",
    "installed": "Instalēta (setup)",
    "git": "Git izgūšana",
    "from_repo": "no {repo} (nav oficiālais avots)",
    "unverified": "bez kontrolsummas (pārbaudīta tikai ZIP integritāte)",
    "rn_label": "Laidiena piezīmes",
    "rn_help": "Kas mainījās katrā versijā – no līdzi piegādātajām piezīmēm (darbojas arī bezsaistē).",
    "rn_older": "Vecāka",
    "rn_newer": "Jaunāka",
    "rn_pos": "{i} no {n}",
    "rn_installed": "instalēta",
    "rn_empty": "Laidiena piezīmes nav atrastas.",
    "rn_version": "Versija"
  },
  "err": {
    "generic": "Nezināma kļūda",
    "bridge": "Kļūda “{name}”: {msg}",
    "boot": "Startēšana neizdevās: {msg}",
    "no_backend": "Nav savienojuma ar aizmugursistēmu"
  },
  "fatal": {
    "title": "Savienojums ar aizmugursistēmu neizdevās",
    "text": "Saskarne nesaņēma atbildi no HCLoader Python daļas. Netiek rādīts vai saglabāts nekas, kas nav īsts.",
    "waiting": "Joprojām gaida aizmugursistēmu …",
    "reload": "Pārlādēt"
  },
  "fest": {
    "all": "Visas sērijas",
    "other": "Citi / nepiešķirti",
    "other_hint": "Bez festivāla",
    "sets": {
      "zero": "{n} setu",
      "one": "{n} sets",
      "other": "{n} seti"
    },
    "editions": {
      "zero": "{n} izdevumu",
      "one": "{n} izdevums",
      "other": "{n} izdevumi"
    },
    "suggestions": {
      "zero": "{n} ieteikumu",
      "one": "{n} ieteikums",
      "other": "{n} ieteikumi"
    },
    "all_years": "Visi",
    "no_stage": "Bez skatuves",
    "kind": {
      "festival": "Festivāls",
      "radio": "Radio šovs",
      "podcast": "Podkāsts"
    },
    "set_type": {
      "live_set": "Dzīvais sets",
      "closing_ceremony": "Noslēguma ceremonija",
      "opening": "Atklāšana",
      "endshow": "Endshow",
      "full_show": "Pilns šovs",
      "warm_up": "Iesildīšanās",
      "anthem": "Himna",
      "episode": "Epizode"
    },
    "change": "mainīt festivālu",
    "change_manual": "iestatīts manuāli, noklikšķiniet, lai mainītu",
    "add": "Iestatīt festivālu vai sēriju",
    "suggested": "Nedrošs ieteikums: {name}",
    "accept": "Pieņemt ieteikumu",
    "p_title": "Festivāls / sērija",
    "p_search": "Meklēt sēriju …",
    "p_none": "Bez festivāla",
    "p_no_match": "Sērija nav atrasta",
    "p_year": "Gads",
    "p_variant": "Variants",
    "p_stage": "Skatuve",
    "p_type": "Seta veids",
    "p_apply": "Lietot",
    "p_auto": "Atpakaļ uz automātisko"
  },
  "backfill": {
    "action": "Ielasīt visu (vienreiz)",
    "action_title": "Vienreiz ielasīt visu šī avota sarakstu lapu pa lapai – jaunie trāpījumi nonāk iesūtnē",
    "again_title": "Ielasīt visu vēlreiz – tiek pievienoti tikai vēl nezināmie ieraksti",
    "search_title": "Nav saglabātajiem meklējumiem – meklēšana atgriež ne vairāk kā 100 rezultātus",
    "why_open": "Ielasīšana jau sākta – apturiet vai atceliet to zem nosaukuma",
    "st_pending": "Gaida",
    "st_running": "Ielasa …",
    "st_paused": "Apturēts",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / maks. {cap}",
    "added": "+{n} iesūtnē",
    "done_short": "Viss ielasīts {date}",
    "done_title": "Pilnībā ielasīts: {date} · ieraksti: {n}",
    "note_title": "Pēdējais pārtraukums",
    "pause": "Apturēt",
    "resume": "Turpināt",
    "cancel": "Atcelt",
    "keep": "Turpināt ielasīt",
    "dlg_title": "Ielasīt visu no “{name}”?",
    "dlg_text": "Vienreiz ielasa visu šī avota sarakstu lapu pa lapai – plakani un lēti, caur ierobežotāju; nekas netiek lejupielādēts. Trāpījumi, kas iztur jūsu filtrus, nonāk <b>iesūtnē</b>, arī avotiem ar automātisku lejupielādi. Jau zināmi video nekad netiek pievienoti divreiz.",
    "dlg_requests": "pieprasījumi",
    "dlg_time": "ilgums",
    "dlg_entries": "ieraksti",
    "dlg_known": "Zināms no pēdējās pārbaudes: ieraksti – <b>{n}</b>.",
    "dlg_unknown": "Izmērs nav zināms – piesardzīgs novērtējums maksimumam {cap} ierakstu.",
    "dlg_capped": "Tiek ielasīti tikai pirmie {cap} ieraksti (Iestatījumi › Grafiks).",
    "dlg_resume": "Turpina pēc {n} jau ielasītiem ierakstiem; to lapas vispirms tiek pieprasītas vēlreiz.",
    "dlg_pace": "Ne vairāk kā {n} pieprasījumi stundā, vienmērīgi sadalīti. Backoff (HTTP 429 / botu pārbaude), lietotnes aizvēršana vai kļūda tikai pārtrauc – vēlāk tiek turpināts automātiski. Apturēt vai atcelt varat jebkurā laikā.",
    "dlg_ok": "Sākt ielasīšanu",
    "dlg_ok_resume": "Turpināt ielasīt",
    "dlg_cancel_title": "Atcelt ielasīšanu?",
    "dlg_cancel_text": "“{name}” ielasīšana apstājas, un progress tiek atmests. Iesūtnē jau esošie trāpījumi paliek.",
    "toast_started": "“{name}” tiek ielasīts pilnībā – darbojas fonā",
    "toast_done": "“{name}” ielasīts pilnībā – +{n} iesūtnē",
    "toast_paused": "“{name}” apturēts – turpiniet ar “Turpināt”",
    "toast_cancelled": "“{name}” ielasīšana atcelta"
  }
});
