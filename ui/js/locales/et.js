/* HCLoader UI texts – Eesti.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "et", "name": "Eesti", "dir": "ltr", "intl": "et-EE"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "RASKE MUUSIKA ARHIIV",
    "mock": "DEMOREŽIIM"
  },
  "nav": {
    "discover": "Avastamine",
    "inbox": "Saabunud",
    "watchlist": "Jälgitavad",
    "downloads": "Allalaadimised",
    "library": "Kogu",
    "log": "Logi",
    "settings": "Seaded",
    "stats": "Statistika"
  },
  "navfoot": {
    "today": "TÄNA",
    "next": "JÄRGMINE KONTROLL"
  },
  "common": {
    "ok": "OK",
    "cancel": "Tühista",
    "save": "Salvesta",
    "delete": "Kustuta",
    "edit": "Muuda",
    "remove": "Eemalda",
    "reset": "Lähtesta",
    "on": "sees",
    "off": "väljas",
    "current": "praegune",
    "loading": "laadimine …",
    "add_chip": "+ lisa",
    "empty": "„tühi“",
    "empty_list": "„puudub“"
  },
  "fmt": {
    "today": "täna",
    "yesterday": "eile",
    "never": "mitte kunagi",
    "no_date": "Kuupäev teadmata",
    "just_now": "just praegu",
    "today_at": "täna {t}",
    "tomorrow_at": "homme {t}",
    "yesterday_at": "eile {t}",
    "views": {
      "one": "{v} vaatamine",
      "other": "{v} vaatamist"
    }
  },
  "unit": {
    "s": "s",
    "h": "t",
    "minutes": "minutit",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "märki",
    "results": "tulemust",
    "entries": "kirjet",
    "clock": "kell",
    "req_h": "päring./h",
    "lufs": "LUFS",
    "db": "dB",
    "pct": "%"
  },
  "range": {
    "ge_sleep": "≥ miinimum",
    "ge_initial": "≥ algväärtus"
  },
  "status": {
    "new": "Uus",
    "inbox": "Saabunutes",
    "queued": "Järjekorras",
    "downloading": "Allalaadimine",
    "done": "Allalaaditud",
    "ignored": "Eiratud",
    "failed": "Viga"
  },
  "period": {
    "all": "Kõik",
    "7d": "Viimased 7 päeva",
    "30d": "Viimased 30 päeva",
    "1y": "Viimased 12 kuud",
    "year": "Kindel aasta",
    "custom": "Kohandatud"
  },
  "source_type": {
    "channel": "Kanal",
    "playlist": "Esitusloend",
    "search": "Otsing"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Platvorm",
    "sc_off": "SoundCloud on välja lülitatud – lülita sisse jaotises Seaded › SoundCloud.",
    "mixcloud": "Mixcloud",
    "hearthis": "hearthis.at",
    "p_off": "{p} on välja lülitatud – lülita sisse jaotises Seaded › Rohkem allikaid."
  },
  "genre": {
    "change": "Muuda žanrit",
    "manual": "Žanr määratud käsitsi",
    "change_manual": "Muuda žanrit (määratud käsitsi)"
  },
  "run_kind": {
    "watchlist": "Jälgitavad allikad",
    "headless": "Tegumiplaanija",
    "manual": "Käsitsi"
  },
  "phase": {
    "waiting": "Ootel",
    "sleep": "Paus järgmise allalaadimiseni",
    "download": "Allalaadimine",
    "convert": "Teisendamine",
    "tag": "Sildistamine",
    "failed": "Ebaõnnestus"
  },
  "po_mode": {
    "off": "Väljas",
    "script": "Skript",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Väljas",
    "script": "Skript (Deno)",
    "http": "HTTP-server (kohalik)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "puudub",
    "po": "PO-Token",
    "po_active": "aktiivne ({mode})",
    "po_inactive": "mitteaktiivne",
    "po_error": "Viga",
    "backoff": "Paus",
    "backoff_none": "puudub",
    "backoff_until": "kuni {t} · jäänud {rest}",
    "queue": "Järjekord",
    "queue_empty": "tühi",
    "queue_active": "aktiivne",
    "queue_paused": "peatatud",
    "today": "Täna",
    "next": "Järgmine kontroll",
    "next_off": "väljas",
    "backoff_until_short": "kuni {t}",
    "sc_backoff": "Paus kuni {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · täna allalaaditud {day}/{day_max} · selle tunni otsinguid {s}/{s_max}",
    "sc_tip": "SoundCloud · täna allalaaditud {day}/{day_max} · selle tunni otsinguid {s}/{s_max}",
    "backoff_tip": "{p}: paus kuni {t} (jäänud {rest})",
    "p_tip": "{p} · täna allalaaditud {day}/{day_max} · selle tunni otsinguid {s}/{s_max}"
  },
  "schedule": {
    "due": "on aeg",
    "kind_app": "Rakendus",
    "kind_task": "Ülesanne",
    "tip_app": "Järgmine jälgitavate allikate kontroll rakenduses: {t} (kuni HCLoader töötab).",
    "tip_task": "Järgmine jälgitavate allikate kontroll Windowsi tegumiplaanija kaudu: {t}.",
    "tip_any": "Järgmine jälgitavate allikate kontroll: {t}.",
    "tip_off": "Automaatset kontrolli pole – ei rakenduses ega Windowsi tegumiplaanija kaudu.",
    "tip_backoff": "Kuni paus kestab, kontrolle ei tehta."
  },
  "card": {
    "source": "Leitud jälgitavast allikast „{name}“",
    "select": "Ainult tellijatele (Select)",
    "open": "Ava platvormil {p}",
    "ignore": "Eira",
    "unignore": "Ära eira enam",
    "more": "Veel toiminguid",
    "download": "Laadi alla",
    "watch": "Lisa kanal jälgitavatesse",
    "block": "Blokeeri kanal",
    "set_genre": "Määra žanr",
    "date_approx": "Ligikaudne kuupäev – YouTube'i otsing annab ainult „X aastat tagasi“",
    "date_unknown": "Üleslaadimise kuupäev puudub",
    "duplicate": "Tõenäoliselt juba alla laaditud ({p})",
    "duplicate_title": "Väga sarnane pealkiri ja sama kestus nagu „{title}” ({p}) – seal juba allalaaditud või järjekorras. Saad selle siiski alla laadida.",
    "preview": "Ainult eelvaade (Go+) – allalaadimine pole võimalik",
    "preview_title": "SoundCloud pakub sellele loole ainult 30-sekundilist eelvaadet (Go+). Seda ei saa alla laadida.",
    "select_title": "See Mixcloudi üleslaadimine on saadaval ainult looja tellijatele (Mixcloud Select). Seda ei saa alla laadida."
  },
  "discover": {
    "placeholder": "Otsi miksi, live-sette, DJ-sid, üritusi …",
    "search": "Otsi",
    "searching_btn": "Otsimine …",
    "searching": "Otsimine – lihtne päring, YouTube'i säästev …",
    "sort": "Sorteeri",
    "sort_rel": "Asjakohasus",
    "sort_date": "Uusimad enne",
    "sort_dur": "Pikimad enne",
    "sort_views": "Enim vaatamisi",
    "quota": "Otsinguid selle tunni jooksul: {n} / {max}",
    "quota_sc": "SoundCloudi otsinguid selle tunni jooksul: {n} / {max}",
    "placeholder_sc": "Otsi SoundCloudist: miksid, setid, DJ-d, podcastid …",
    "platform_title": "Kust otsida",
    "searching_sc": "Otsimine – lihtne päring, SoundCloudi säästev …",
    "ready_text_sc": "Sisesta otsingufraas ja vajuta Enter, et SoundCloudist otsida.",
    "previews": "{n} ainult eelvaade (Go+)",
    "previews_title": "Go+ eelvaateid ei saa kunagi alla laadida. Nähtavad, kui „Peida allalaaditud ja eiratud” on väljas.",
    "filters": "Filtrid",
    "toggle_filters": "Näita/peida filtripaneel",
    "f_duration": "Kestus (minutites)",
    "f_min": "Miinimum",
    "f_max": "Maksimum (tühi = piirangut pole)",
    "f_max_ph": "maks.",
    "f_period": "Üleslaadimise periood",
    "f_year": "Aasta",
    "f_year_prev": "Aasta tagasi",
    "f_year_next": "Aasta edasi",
    "f_from": "Alates",
    "f_to": "Kuni",
    "f_hint_year": "YouTube'i otsing annab ainult ligikaudse kuupäeva („13 aastat tagasi”). Seetõttu arvestatakse ±1 aasta tolerantsi – samuti iga miksi, mille pealkirjas on „{year}”.",
    "f_hint_custom": "YouTube'i otsing annab ainult ligikaudse kuupäeva. Ligikaudsete kuupäevade puhul kehtib mõlemas otsas ±1 aasta tolerants.",
    "chip_title": "Klõps: näita/peida žanr · Topeltklõps: ainult see žanr (selle terminid lisatakse otsingule)",
    "scope": "Otsingut laiendatud",
    "scope_title": "Järgmisel otsingul lisatakse need terminid sinu otsinguteksti lõppu.",
    "searched": "Otsiti fraasiga",
    "stale": "Filtreid on muudetud alates",
    "re_search": "Otsi uuesti",
    "re_search_title": "Tulemused pärinevad viimasest otsingust. Otsi uuesti, et žanr ja aasta oleksid otsinguterminis sees (loetakse üheks otsinguks).",
    "need_query": "Palun sisesta esmalt otsingufraas.",
    "f_inc": "Kaasatavad märksõnad",
    "f_exc": "Välistatavad märksõnad",
    "f_show": "Kuvamine",
    "f_hide": "Peida allalaaditud ja eiratud",
    "f_blacklist": "Rakenda kanalite musta nimekirja",
    "count": {
      "one": "{n} tulemus · {hidden} filtreeritud välja",
      "other": "{n} tulemust · {hidden} filtreeritud välja"
    },
    "selected": "Valitud: {n}",
    "select_all": "Vali kõik",
    "download_sel": "Laadi valitud alla",
    "ready_title": "Valmis",
    "ready_text": "Sisesta otsingufraas ja vajuta Enter.",
    "none_title": "Midagi ei leitud",
    "none_text": "Lõdvenda filtreid või proovi muid otsingufraase.",
    "none_year": "{year}. aasta tulemusi pole. Otsi uuesti, et aasta oleks otsinguterminis sees, või muuda aastat.",
    "quota_p": "Otsinguid teenuses {p} selle tunni jooksul: {n} / {max}",
    "placeholder_p": "Otsi teenusest {p}: miksid, setid, DJ-d, podcastid …",
    "searching_p": "Otsimine – lihtne päring, teenust {p} säästev …",
    "ready_text_p": "Sisesta otsingufraas ja vajuta Enter, et teenusest {p} otsida.",
    "previews_mc": "ainult tellijatele (Select): {n}",
    "previews_mc_title": "Mixcloud Selecti üleslaadimised on ainult maksvatele tellijatele ja neid ei saa kunagi alla laadida. Nähtavad, kui „Peida allalaaditud ja eiratud“ on väljas."
  },
  "inbox": {
    "title": "Saabunud",
    "sub": "Jälgitavate allikate uued leiud, mis läbivad kõik filtrid",
    "sub_n": {
      "one": "{n} jälgitavate allikate uus leid, mis läbib kõik filtrid",
      "other": "{n} jälgitavate allikate uut leidu, mis läbivad kõik filtrid"
    },
    "ignore_all": "Eira kõiki",
    "download_all": "Laadi kõik alla",
    "ignore_sel": "Eira valitud",
    "download_sel": "Laadi valitud alla",
    "select_all": "Vali kõik",
    "select_none": "Tühista valik",
    "src_all": "Kõik allikad",
    "src_none": "Allikata",
    "src_title": "Näita ainult selle allika leide",
    "count": {
      "one": "{n} leid",
      "other": "{n} leidu"
    },
    "count_of": "{n} / {total} leidu",
    "selected": "Valitud: {n}",
    "empty_title": "Saabunud on tühi",
    "empty_text": "Jälgitavad allikad pole uusi miksi leidnud.",
    "empty_nosrc": "Jälgitavaid allikaid pole veel – lisa kanal, esitusloend või otsing ning uued miksid ilmuvad siia.",
    "empty_next": "Järgmine kontroll: {t}.",
    "to_watchlist": "Mine jälgitavate juurde"
  },
  "watchlist": {
    "title": "Jälgitavad allikad",
    "sub_n": {
      "one": "{n} allikas · {active} aktiivset",
      "other": "{n} allikat · {active} aktiivset"
    },
    "sub_next": "järgmine kontroll {t}",
    "add": "Allikas",
    "check_all": "Kontrolli kõiki kohe",
    "check": "Kontrolli",
    "checking": "kontrollimine …",
    "queued": "ootel …",
    "running": "Kontrollimine …",
    "running_n": "Kontrollimine {i} / {n} …",
    "col_active": "Aktiivne",
    "col_name": "Nimi",
    "col_type": "Tüüp",
    "col_genre": "Žanr",
    "col_auto": "Uued leiud",
    "col_max": "Maks.",
    "col_last": "Viimane kontroll",
    "col_new": "Uued",
    "genre_auto": "automaatne",
    "genre_auto_long": "Automaatne (märksõnade järgi)",
    "auto_on": "laadi alla",
    "auto_off": "saabunud",
    "auto_title_on": "Uued leiud laaditakse automaatselt alla",
    "auto_title_off": "Uued leiud lähevad ainult saabunute alla",
    "new_title": "Näita saabunutes",
    "check_title": "Kontrolli seda allikat kohe",
    "why_off": "Allikas pole aktiivne",
    "why_running": "Kontroll juba käib",
    "why_backoff": "Paus on aktiivne – kontrollimine on blokeeritud",
    "why_backoff_p": "Paus ({p}) on aktiivne – kontrollimine on blokeeritud",
    "why_sc_off": "SoundCloud on välja lülitatud",
    "error_title": "Viimane kontroll ebaõnnestus",
    "backoff": "<b>Paus on aktiivne kuni {t}</b> (jäänud {rest}). Jälgitavaid allikaid ei saa kontrollida – ka planeeritud kontrollid jäävad ootele.",
    "backoff_p": "<b>Paus ({p}) on aktiivne kuni {t}</b> (jäänud {rest}). {p} allikad jäetakse selle ajani vahele – {other} töötab edasi.",
    "backoff_link_sc": "Ava SoundCloud",
    "backoff_link": "Ava aeglustamine",
    "none_active": "Kontrollimiseks pole aktiivset allikat",
    "empty_title": "Allikaid pole",
    "empty_text": "Lisa kanal, esitusloend või salvestatud otsing.",
    "add_title": "Lisa allikas",
    "edit_title": "Muuda allikat",
    "f_type": "Tüüp",
    "f_name": "Nimi",
    "f_url": "URL",
    "f_query": "Otsingufraas",
    "f_genre": "Vaikimisi žanr",
    "f_max": "Maks. kirjeid",
    "f_newest_last": "Uusimad on lõpus (loe esitusloendit tagurpidi)",
    "hint_newest_last": "Paljudes esitusloendites lisab YouTube uued videod lõppu. Loetakse kogu esitusloend (umbes 1 päring 100 video kohta, maks. 2000 kirjet).",
    "rev_title": "Uusimad on lõpus – esitusloendit loetakse tagant poolt",
    "rev_short": "tagurpidi",
    "f_enabled": "Aktiivne – arvesta valikus „Kontrolli kõiki” ja ajakava",
    "f_hits": "Uued leiud",
    "hits_inbox": "Saabunutesse",
    "hits_auto": "Laadi automaatselt alla",
    "hint_inbox": "Leiud ootavad saabunutes, kuni need alla laed või eirad.",
    "hint_auto": "Kõik filtrid läbivad leiud lähevad otse järjekorda.",
    "hint_channel": "YouTube’i kanal (…/@nimi või …/channel/UC…, soovi korral /videos või /streams), SoundCloudi profiil (soundcloud.com/nimi), Mixcloudi kasutaja (mixcloud.com/nimi) või hearthis.at kasutaja (hearthis.at/nimi).",
    "hint_playlist": "YouTube’i esitusloend „list=…“-ga, SoundCloudi komplekt (soundcloud.com/nimi/sets/komplekt), Mixcloudi esitusloend (mixcloud.com/nimi/playlists/loend) või hearthis.at komplekt (hearthis.at/nimi/set/komplekt). Kontrollitakse uusimaid kirjeid.",
    "f_platform": "Otsi platvormilt",
    "detected": "tuvastatud: {p} · {type}",
    "not_detected": "URL-i ei tuvastatud",
    "suggested": "Soovitus",
    "suggested_title": "Soovitatud URL-i põhjal. Kui jätad muutmata, asendab esimene kontroll selle tegeliku nimega – või kirjuta lihtsalt üle.",
    "hint_name_auto": "Soovitatud URL-i põhjal – vabalt muudetav. Kui jätad muutmata, määrab esimene kontroll tegeliku nime.",
    "hint_name_later": "Nimi määratakse esimesel kontrollil – või sisesta see ise.",
    "name_auto_title": "Ajutine nimi – järgmine kontroll määrab tegeliku",
    "hint_search": "Salvestatud otsing nagu jaotises „Avastamine” – iga kontroll loetakse üheks otsinguks.",
    "hint_max": "kontrolli kohta",
    "max_default": "(vaikimisi)",
    "max_default_title": "Oma väärtust pole: kehtib „Kirjeid allika kohta” jaotisest Seaded › Ajakava",
    "max_title": "Tühi = vaikimisi väärtus jaotisest Seaded › Ajakava. Maksimaalselt 200, otsinguallikatel 100.",
    "ph_name": "nt Gabber Vault",
    "ph_name_later": "määratakse esimesel kontrollil",
    "ph_channel": "https://www.youtube.com/@kanal  või  https://soundcloud.com/nimi",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  või  https://soundcloud.com/nimi/sets/…",
    "ph_search": "nt frenchcore liveset",
    "form_error": "Allikat ei õnnestunud salvestada.",
    "backoff_link_p": "Ava {p}",
    "why_p_off": "{p} on välja lülitatud"
  },
  "downloads": {
    "title": "Allalaadimised",
    "sub": "Järjest, üks allalaadimine korraga",
    "pause": "Peata",
    "resume": "Jätka",
    "cancel": "Tühista",
    "retry": "Proovi uuesti",
    "remove": "Eemalda",
    "up": "Liiguta ülespoole",
    "down": "Liiguta allapoole",
    "eta": "Jäänud aeg",
    "position": "Positsioon {n}",
    "sleep_left": "jätkub",
    "sleep_why": "Aeglustamine: juhuslik paus {min}–{max} s kahe allalaadimise vahel",
    "next_up": "Järgmisena",
    "sleeping": "Paus",
    "sleep_range": "{min}–{max} s hulgast",
    "blocked_wait": "Ootel – {why}",
    "why_backoff": "Paus",
    "why_day": "Päevalimiit",
    "why_run": "Käivituse limiit",
    "why_paused": "peatatud",
    "why_restart": "Vajalik taaskäivitus",
    "why_busy": "töötab teine käivitus",
    "why_pot": "PO-Token-server pole valmis",
    "why_target": "Sihtkaust pole kättesaadav",
    "why_error": "Allalaadimismoodul puudub",
    "summary": "Täna {day}/{day_max} · Käivitus {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} laeb edasi.",
    "steps": "Allalaadimine · Teisendamine · Sildistamine",
    "unlimited": "piiranguta",
    "l_run": "See käivitus",
    "l_day": "Täna",
    "l_rate": "Kiiruspiirang",
    "l_sleep": "Paus allalaadimiste vahel",
    "sec_queue": "Järjekord",
    "sec_failed": "Ebaõnnestunud",
    "empty_title": "Järjekord on tühi",
    "empty_text": "Vali miksid jaotises „Avastamine” või „Saabunud”.",
    "paused": "<b>Järjekord on peatatud.</b> Käimasolev allalaadimine on peatatud, kuni jätkad.",
    "backoff": "<b>Paus on aktiivne kuni {t}</b> (jäänud {rest}). Allalaadimised, otsing ja jälgitavad allikad on blokeeritud.",
    "backoff_rest": {
      "one": "<b>Paus on aktiivne kuni {t}</b> (jäänud {rest}). Allalaadimised, otsing ja jälgitavad allikad on blokeeritud – järjekorda jääb {n}.",
      "other": "<b>Paus on aktiivne kuni {t}</b> (jäänud {rest}). Allalaadimised, otsing ja jälgitavad allikad on blokeeritud – järjekorda jääb {n}."
    },
    "limit_day": "<b>Päevalimiit täis ({n}/{max}).</b> Ülejäänud jäävad järjekorda ja jätkuvad homme.",
    "limit_day_rest": {
      "one": "<b>Päevalimiit täis ({n}/{max}).</b> Järjekorda jääb {rest}, need jätkuvad homme.",
      "other": "<b>Päevalimiit täis ({n}/{max}).</b> Järjekorda jääb {rest}, need jätkuvad homme."
    },
    "limit_run": "<b>Limiit täis – {max}/{max} selles käivituses.</b> Ülejäänud jäävad järjekorda ja jätkuvad järgmises käivituses.",
    "limit_run_rest": {
      "one": "<b>Limiit täis – {max}/{max} selles käivituses.</b> Järjekorda jääb {rest}, need jätkuvad järgmises käivituses.",
      "other": "<b>Limiit täis – {max}/{max} selles käivituses.</b> Järjekorda jääb {rest}, need jätkuvad järgmises käivituses."
    },
    "limits_link": "Muuda limiite",
    "new_run": "Alusta uut käivitust",
    "need_restart": "<b>Vajalik taaskäivitus.</b> yt-dlp uuendati – palun käivita HCLoader uuesti. Järjekord säilib.",
    "busy": "Töötab teine allalaadimise käivitus (nt planeeritud kontroll). Järjekord ootab, kuni see lõpeb.",
    "local_pot": {
      "one": "<b>PO-Token-server pole valmis.</b> Järjekorda jääb {rest}; jätkub niipea, kui server töötab.",
      "other": "<b>PO-Token-server pole valmis.</b> Järjekorda jääb {rest}; jätkub niipea, kui server töötab."
    },
    "local_target": {
      "one": "<b>Sihtkaust pole kättesaadav või sinna ei saa kirjutada.</b> Järjekorda jääb {rest}; jätkub niipea, kui kaust on taas saadaval.",
      "other": "<b>Sihtkaust pole kättesaadav või sinna ei saa kirjutada.</b> Järjekorda jääb {rest}; jätkub niipea, kui kaust on taas saadaval."
    },
    "local_error": {
      "one": "<b>Allalaadimismoodulit (yt-dlp) ei õnnestunud laadida.</b> Järjekorda jääb {rest}. Uus katse pärast „Jätka”, uusi kirjeid või seadete salvestamist.",
      "other": "<b>Allalaadimismoodulit (yt-dlp) ei õnnestunud laadida.</b> Järjekorda jääb {rest}. Uus katse pärast „Jätka”, uusi kirjeid või seadete salvestamist."
    },
    "local_link_pot": "Võrguseaded",
    "local_link_target": "Muuda salvestuskohta",
    "local_link_error": "Hooldus",
    "summary_p": "{p} {day}/{day_max}"
  },
  "library": {
    "title": "Kogu",
    "sub": {
      "one": "{n} miks",
      "other": "{n} miksi"
    },
    "sub_shown": "Kuvatud {n} / {total}",
    "search": "Pealkiri, kanal või tee …",
    "all_genres": "Kõik žanrid",
    "all_channels": "Kõik kanalid",
    "all_years": "Kõik aastad",
    "f_genre": "Žanr",
    "f_channel": "Kanal",
    "f_year": "Aasta",
    "f_sort": "Sorteerimine",
    "sort_newest": "Uusimad enne",
    "sort_title": "Pealkiri A–Ü",
    "sort_channel": "Kanal A–Ü",
    "sort_duration": "Pikimad enne",
    "view_list": "Loend",
    "view_grid": "Paanid",
    "clear": "Lähtesta filtrid",
    "col_title": "Pealkiri",
    "col_channel": "Kanal",
    "col_genre": "Žanr",
    "col_year": "Aasta",
    "col_duration": "Kestus",
    "col_size": "Suurus",
    "col_loaded": "Allalaaditud",
    "play": "Esita",
    "pause": "Paus",
    "play_external": "Ava vaikimisi esitajas",
    "play_internal": "Esita rakenduse esitajas",
    "play_missing": "Faili pole – esitamine pole võimalik",
    "more": "Näita veel {n}",
    "now_playing": "Praegu mängib",
    "retag_short": "Sildista uuesti",
    "genre_working": "Žanri määramine …",
    "open_folder": "Ava kaust",
    "retag": "Sildista uuesti (sildid, kaas ja asukoht praeguste seadete järgi)",
    "delete": "Kustuta fail",
    "remove": "Eemalda kirje",
    "retagging": "Uuesti sildistamine …",
    "cue_title": "Lugude loend .cue-failina MP3 kõrval",
    "missing": "Faili pole",
    "missing_title": "Faili ei leitud salvestatud asukohast (teisaldatud või kustutatud?)",
    "missing_chip": {
      "one": "{n} puudub",
      "other": "{n} puudub"
    },
    "missing_chip_title": "Näita ainult kirjeid, mille fail puudub",
    "stat_count": "Miksid",
    "stat_duration": "Kogukestus",
    "stat_size": "Suurus",
    "stat_genres": "Žanri järgi",
    "unit_h": "t",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} miks · {dur}",
      "other": "{n} miksi · {dur}"
    },
    "empty_title": "Midagi pole veel alla laaditud",
    "empty_text": "Iga miks ilmub siia niipea, kui see on alla laaditud ja sildistatud – koos kaane, žanri ja asukohaga.",
    "empty_discover": "Avasta miksi",
    "empty_watchlist": "Seadista jälgitavad allikad",
    "target_down": "Sihtkaust pole kättesaadav: {path}",
    "target_down_hint": "Kontrolli draivi või võrgujagamist. Kuni see puudub, on failide olek teadmata: „Sildista uuesti” ja „Eemalda kirje” on keelatud.",
    "unknown_title": "Sihtkaust pole kättesaadav – faili olek on teadmata",
    "none_title": "Tulemusi pole",
    "none_text": "Ükski kirje ei vasta otsingule ja filtritele.",
    "group_by": "Rühmita",
    "group_none": "Puudub",
    "group_genre": "Žanr",
    "group_festival": "Festival",
    "group_artist": "Artist",
    "group_year": "Aasta",
    "group_unknown": "Teadmata",
    "continue": "Jätka kuulamist",
    "continue_title": "Jätka „{title}“ kohalt {t}",
    "continue_left": "jäänud {t}",
    "continue_forget": "Eemalda loendist „Jätka kuulamist“",
    "export": "M3U",
    "export_title": "Ekspordi kuvatu M3U8-esitusloendina",
    "export_continue": "Ekspordi „Jätka kuulamist“ esitusloendina"
  },
  "player": {
    "label": "Minipleier",
    "play": "Esita (tühik)",
    "pause": "Paus (tühik)",
    "back": "30 sekundit tagasi",
    "fwd": "30 sekundit edasi",
    "prev": "Eelmine lugu",
    "next": "Järgmine lugu",
    "seek": "Asukoht",
    "mute": "Vaigista",
    "unmute": "Lülita heli sisse",
    "volume": "Helitugevus",
    "close": "Sulge pleier",
    "tracks": "Lugude loend",
    "tracks_n": {
      "one": "{n} lugu",
      "other": "{n} lugu"
    },
    "tracks_toggle": "Näita/peida lugude loend",
    "no_tracks": "Selles failis pole peatükke",
    "total": "Kogukestus {t}",
    "keys": "Tühik: esita/paus · ←/→: 10 s",
    "err_load": "Esitamine ebaõnnestus",
    "err_src": "Esitamine ebaõnnestus: vigane faili aadress",
    "err_play": "Faili ei saa esitada: {title}",
    "external": "Avamine vaikimisi esitajas …",
    "norm_title": "Valjus ühtlustatud: {lufs} LUFS → siht {target} LUFS ({gain})",
    "norm_capped": "ainult vaigistatud – võimendamiseks on vaja helimootorit",
    "norm_fallback": "Normaliseerimine: helimootor on siin vaikne – mängitakse ilma selleta (ainult vaiksemaks, mitte valjemaks)",
    "resume_q": "Kas jätkata sealt, kus pooleli jäi?",
    "resume_at": "kohal {t}",
    "resume": "Jätka",
    "restart": "Algusest",
    "resumed_at": "Jätkatud kohalt {t}",
    "sleep": "Unetaimer",
    "sleep_min": "{n} min",
    "sleep_end": "Selle seti lõpp",
    "sleep_end_short": "lõpp",
    "sleep_off": "Lülita välja",
    "sleep_on": "Taimer: peatub {t} pärast",
    "sleep_end_on": "Taimer: peatub selle seti lõpus",
    "sleep_done": "Taimer: taasesitus peatatud",
    "queue_pos": "{i}/{n}",
    "queue_title": "Esita kõik · {label}: sett {i}/{n}"
  },
  "log": {
    "title": "Logi",
    "sub": "Reaalajas logi ja käivituste ajalugu",
    "live": "Reaalajas logi",
    "history": "Käivituste ajalugu",
    "lvl_debug": "Silumine",
    "lvl_info": "Info",
    "lvl_warn": "Hoiatus",
    "lvl_error": "Viga",
    "lvl_title": "Näita/peida tase „{lvl}”",
    "search": "Otsi logist …",
    "following": "Reaalajas",
    "paused": "Peatatud",
    "follow_title": "Keri automaatselt uusima reani (peatub ülespoole kerides)",
    "jump": "Lõppu",
    "jump_new": {
      "one": "{n} uus rida",
      "other": "{n} uut rida"
    },
    "copy": "Kopeeri",
    "copy_title": "Kopeeri nähtavad read lõikelauale",
    "open_logs": "Logikaust",
    "open_logs_title": "Ava kaust täielike logifailidega",
    "lines": {
      "one": "{n} rida",
      "other": "{n} rida"
    },
    "lines_of": "{n} / {total} rida",
    "empty": "Nende tasemete jaoks ridu pole.",
    "empty_search": "Ükski rida ei sisalda „{q}”.",
    "no_runs": "Käivitusi pole veel.",
    "no_runs_kind": "Seda tüüpi käivitusi pole.",
    "found": "leitud",
    "downloaded": "allalaaditud",
    "errors": "vigu",
    "running": "töötab …",
    "kind_all": "Kõik",
    "timeline": "Ajatelg",
    "table": "Tabel",
    "view_title": "Käivituste ajaloo vaade",
    "col_kind": "Tüüp",
    "col_start": "Algus",
    "col_duration": "Kestus",
    "col_found": "Leitud",
    "col_downloaded": "Allalaaditud",
    "col_errors": "Vead",
    "col_note": "Märkus",
    "backoff": "Paus",
    "runs_sum": {
      "one": "{n} käivitus · {dl} allalaaditud · {err} viga",
      "other": "{n} käivitust · {dl} allalaaditud · {err} viga"
    },
    "today": "Täna",
    "yesterday": "Eile"
  },
  "settings": {
    "title": "Seaded",
    "sub": "Siin saab seadistada kõike, mida rakendus teeb"
  },
  "tabs": {
    "general": "Üldine",
    "filters": "Filtrid ja märksõnad",
    "genres": "Žanrid",
    "download": "Allalaadimine ja kvaliteet",
    "storage": "Salvestus ja sildid",
    "throttle": "Aeglustamine",
    "soundcloud": "SoundCloud",
    "network": "Võrk ja PO-Token",
    "schedule": "Ajakava",
    "appearance": "Välimus",
    "maintenance": "Hooldus",
    "festivals": "Festivalid ja sarjad",
    "playback": "Taasesitus",
    "notifications": "Teavitused",
    "mediaserver": "Meediaserver",
    "sources": "Rohkem allikaid",
    "reupload": "Uuesti üleslaadimised"
  },
  "tabs_hint": {
    "general": "Rakenduse põhikäitumine.",
    "filters": "Otsingu ja jälgitavate allikate vaikimisi filtrid. Neid saab ajutiselt üle kirjutada jaotise „Avastamine” filtripaneelis.",
    "genres": "Järjekord = prioriteet. Võidab esimene žanr, mille märksõna pealkirjas esineb. Käsitsi määratud žanrid ja allika vaikimisi žanr on eelisjärjekorras.",
    "download": "YouTube pakub tavaliselt Opust umbes 130–160 kbps. MP3 on teisendus ega kõla allikast paremini – kuid mängib igal pool.",
    "storage": "Kuhu failid lähevad ja kuidas neid nimetatakse. Struktuur on mõeldud meediaserveritele nagu Plex või Jellyfin.",
    "throttle": "Piirab YouTube'i koormust. Need väärtused kehtivad otsingule, jälgitavatele allikatele ja allalaadimistele koos. SoundCloudil on oma väärtused vahekaardil „SoundCloud”. Mixcloudil ja hearthis.at-il on oma väärtused jaotises „Rohkem allikaid“.",
    "soundcloud": "SoundCloud teise allikana otsingu, jälgitavate allikate ja allalaadimiste jaoks – oma limiitide, loendurite ja pausiga, YouTube'ist sõltumatult.",
    "network": "PO-Token tuvastab päringud päris brauseri omadena ja vähendab robotiblokeeringu riski.",
    "schedule": "Millal jälgitavaid allikaid automaatselt kontrollitakse – rakenduses ja Windowsi tegumiplaanija kaudu.",
    "appearance": "Välimus ja tunnetus. Muudatused on kohe eelvaates ja jäävad püsima alles pärast salvestamist.",
    "maintenance": "Versioonid, uuendused, andmebaas.",
    "festivals": "Tuvastab salvestatud pealkirjadest festivali või sarja, aasta, lava ja seti liigi – võrguühenduseta, ilma ühegi lisapäringuta.",
    "playback": "Sisseehitatud mängija, valjuse ühtlustamine, meelde jäetud asukohad ja failide võrguta analüüs.",
    "notifications": "Windowsi teavitused uute settide kohta postkastis ning lõpetatud või ebaõnnestunud allalaadimiste kohta – koondatud üheks sõnumiks, mitte kunagi tulvana. Klõps avab rakenduse õiges kohas.",
    "mediaserver": "Palu pärast allalaadimisi oma Plex- või Jellyfin-serveril teek uuesti skannida – koondatult, ainult koduvõrgus. Luba hoitakse Windowsi mandaadihalduris, mitte kunagi config.yaml-is.",
    "sources": "Mixcloud ja hearthis.at lisaallikatena otsingu, jälgimisloendi ja allalaadimiste jaoks – igaühel oma piirangud, loendurid ja paus (backoff), YouTube’ist ja SoundCloudist sõltumatult.",
    "reupload": "Tunneb ära sama miksi, mis on uuesti üles laaditud (teine kanal, teine platvorm, uus id), kompaktse helisõrmejälje järgi – arvutatakse võrguühenduseta sinu failidest, ilma võrguta."
  },
  "set": {
    "default": "Vaikimisi",
    "range": "Vahemik",
    "browse": "Sirvi",
    "not_set": "määramata",
    "saving": "Salvestamine …",
    "discard": "Loobu",
    "tab_reset": "Lähtesta vahekaart",
    "tab_reset_title": "Määra kõik selle vahekaardi väljad vaikeväärtustele (jõustub alles pärast „Salvesta”)",
    "state_clean": "Kõik salvestatud",
    "state_dirty": {
      "one": "{n} salvestamata muudatus",
      "other": "{n} salvestamata muudatust"
    },
    "state_errors": {
      "one": "{n} viga – palun paranda",
      "other": "{n} viga – palun paranda"
    },
    "h": {
      "collector": "Festivalikoguja",
      "search": "Otsing",
      "duration": "Kestus ja periood",
      "keywords": "Märksõnad",
      "display": "Kuvamine",
      "cover": "Kaanepilt",
      "chapters": "Peatükid ja lugude loend",
      "tags": "Sildid",
      "soundcloud": "SoundCloud",
      "playback": "Esitamine",
      "pauses": "Pausid ja ribalaius",
      "limits": "Limiidid",
      "backoff": "Paus blokeerimise korral",
      "po": "PO-Tokeni pakkuja",
      "fallback": "Ajutised lahendused",
      "in_app": "Rakenduses",
      "task": "Windowsi tegumiplaanija",
      "updates": "Uuendused",
      "app_update": "Rakenduse uuendus",
      "release_notes": "Väljalaskemärkmed",
      "database": "Andmebaas",
      "reset": "Lähtestamine",
      "detection": "Tuvastamine",
      "series": "Sarjad",
      "backfill": "Loe kõik sisse (üks kord)",
      "loudness": "Valjus",
      "memory": "Mälu ja lainekuju",
      "analysis": "Analüüs (võrguta, ffmpeg)",
      "playlists": "Esitusloendid (M3U8)",
      "notify_events": "Teavita, kui",
      "quiet": "Vaiksed tunnid",
      "ms_paths": "Teed ja ajastus",
      "more_sources": "Mixcloud & hearthis.at",
      "fingerprint": "Sõrmejälg"
    },
    "general": {
      "language": {
        "label": "Keel",
        "help": "Liidese ja teadete keel. „Automaatne” järgib Windowsi kuvakeelt (muidu inglise keel). Vaade ehitatakse pärast salvestamist kohe uuesti üles."
      },
      "start_view": {
        "label": "Algvaade",
        "help": "Milline vaade avatakse käivitamisel."
      },
      "log_level": {
        "label": "Logi tase",
        "help": "Kui üksikasjalikud on logifail ja reaalajas logi. DEBUG ainult tõrkeotsinguks."
      },
      "confirm_delete": {
        "label": "Kinnita kustutamine",
        "help": "Küsi enne miksi kustutamist kogust (kirje + fail)."
      }
    },
    "player": {
      "mode": {
        "label": "Esita rakendusega",
        "help": "Mida kasutab ▶ kogus. Sisseehitatud pleier näitab peatükke hüppemärkidena ja jätkab mängimist vaadete vahetamisel. Teine valik on iga kirje menüüs."
      },
      "normalize": {
        "label": "Ühtlusta valjust",
        "help": "Mängib iga seti sama tajutava valjusega (ReplayGain võrguta analüüsist või olemasolevatest siltidest). Ei moonuta kunagi: võimendust piirab mõõdetud true peak."
      },
      "target_lufs": {
        "label": "Sihtvaljus",
        "help": "−18 LUFS on ReplayGain 2.0 võrdlustase. Kõrgem (nt −14) = valjem, kuid rohkem sette jõuab oma tipupiirini."
      },
      "resume": {
        "label": "Jäta asukoht meelde",
        "help": "Iga seti kohta, väljaspool esimest ja viimast 30 sekundit. „Küsi“ pakub jätkamist, „Automaatne“ jätkab vaikselt. Kogu näitab viit viimast lõpetamata setti."
      },
      "waveform": {
        "label": "Lainekuju ajaribana",
        "help": "Näitab setti lainekujuna koos lugude loendi märkidega. Arvutatakse ffmpegiga üks kord faili kohta (esimesel esitusel või analüüsis); muidu lihtne riba."
      }
    },
    "search": {
      "results_count": {
        "label": "Tulemusi otsingu kohta",
        "help": "Tulemuste arv, mille otsing toob (flat). Rohkem tulemusi = suurem koormus YouTube'ile."
      },
      "append_year": {
        "label": "Lisa otsingule aasta",
        "help": "Üleslaadimisperioodi „Kindel aasta” korral lisatakse aasta otsingufraasile (nt „hardcore liveset 2013”). Nii leiab YouTube selle aasta miksi rohkem."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Minimaalne kestus",
        "help": "Lühemaid videoid ei käsitleta kunagi miksina."
      },
      "max_duration": {
        "label": "Maksimaalne kestus",
        "help": "0 = piiranguta."
      },
      "upload_period": {
        "label": "Üleslaadimise periood",
        "help": "Millised üleslaadimised vaikimisi kuvatakse. „Kindel aasta” näitab ainult ühe aasta miksi, „Kohandatud” alates/kuni vahemikku."
      },
      "upload_year": {
        "label": "Aasta",
        "help": "Miks loetakse, kui üleslaadimisaasta ühtib või aasta on pealkirjas. YouTube'i otsing annab ainult ligikaudse kuupäeva – seal kehtib ±1 aasta tolerants."
      },
      "upload_from": {
        "label": "Alates",
        "help": "Varaseim üleslaadimiskuupäev. Tühi = piiranguta."
      },
      "upload_to": {
        "label": "Kuni",
        "help": "Hiliseim üleslaadimiskuupäev. Tühi = piiranguta. Ligikaudsete kuupäevade puhul kehtib mõlemas otsas ±1 aasta tolerants."
      },
      "include_keywords": {
        "label": "Kaasatavad märksõnad",
        "help": "Vähemalt üks peab pealkirjas olema. Tühi = luba kõik. Enter või koma lisab."
      },
      "exclude_keywords": {
        "label": "Välistatavad märksõnad",
        "help": "Kui üks neist on pealkirjas, visatakse video kõrvale."
      },
      "match_description": {
        "label": "Otsi kirjeldusest",
        "help": "Märksõnu kontrollitakse ka video kirjelduses. Flat-päringud seda sageli ei anna."
      },
      "hide_done_ignored": {
        "label": "Peida allalaaditud ja eiratud",
        "help": "Peida tulemustes juba allalaaditud ja eiratud videod."
      },
      "apply_channel_blacklist": {
        "label": "Rakenda kanalite musta nimekirja",
        "help": "Ära kunagi näita blokeeritud kanalite videoid."
      },
      "hide_cross_platform_duplicates": {
        "label": "Peida platvormidevahelised duplikaadid",
        "help": "Peida leiud, mis on tõenäoliselt juba teiselt platvormilt (YouTube või SoundCloud) alla laaditud või järjekorda pandud – sama kestus (±5 s) ja väga sarnane pealkiri. Väljas: need kuvatakse märkusega „Tõenäoliselt juba alla laaditud”."
      }
    },
    "blacklist": {
      "label": "Blokeeritud kanalid",
      "help": "Kanaleid blokeerid kaardi menüüst. Siin saad need uuesti deblokeerida.",
      "none": "Blokeeritud kanaleid pole",
      "unblock": "Deblokeeri"
    },
    "genres": {
      "add": "Žanr",
      "up": "Kõrgem prioriteet",
      "down": "Madalam prioriteet",
      "delete": "Kustuta žanr",
      "color": "Vali värv",
      "name_ph": "Nimi",
      "kw_ph": "+ märksõna",
      "fallback": "Varuvariant – kehtib, kui ükski märksõna ei sobi. Alati olemas, alati viimane."
    },
    "download": {
      "audio_format": {
        "label": "Väljundvorming",
        "help": "MP3 või YouTube'i originaal ilma teisendamata."
      },
      "mp3_quality": {
        "label": "MP3 kvaliteet",
        "help": "320 kbps CBR on kõige ühilduvam, V0 VBR säästab veidi ruumi."
      },
      "embed_cover": {
        "label": "Põimi kaanepilt",
        "help": "Kirjuta pisipilt, ruuduks kärbitult, faili kaanepildina."
      },
      "write_cover_jpg": {
        "label": "Salvesta ka cover.jpg",
        "help": "Meediaserveritele, mis loevad kaustade kaanepilte."
      },
      "write_cue": {
        "label": "Kirjuta .cue-fail",
        "help": "Lugude loend peatükkidest või kirjelduse ajatemplitest, helifaili kõrvale."
      },
      "write_id3_chapters": {
        "label": "Kirjuta ID3 peatükid",
        "help": "Põimi peatükimärgid (CHAP/CTOC) otse MP3-sse."
      },
      "keep_original_soundcloud": {
        "label": "Säilita SoundCloudi originaal",
        "help": "Salvesta SoundCloudi heli muutmata kujul (AAC 160 kbps .m4a-na, MP3 128 kbps .mp3-na) – ilma teise kadudega teisenduseta. Väljas: nagu „Väljundvorming”."
      },
      "keep_original_mixcloud": {
        "label": "Hoia Mixcloudi originaal",
        "help": "Salvesta Mixcloudi heli muutmata kujul (AAC, tavaliselt 64–128 kbps, .m4a-na) – ilma teise kadudega teisenduseta. Väljas: nagu „Väljundvorming“."
      },
      "keep_original_hearthis": {
        "label": "Hoia hearthis.at originaal",
        "help": "Salvesta hearthis.at voog muutmata kujul (MP3) – ilma teise kadudega teisenduseta. Väljas: nagu „Väljundvorming“."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Sihtkaust",
        "help": "Muusikasalvestuse juurkaust. Ajutisi faile hoitakse selle all kaustas „.tmp”. Portatiivses versioonis lahendatakse suhteline tee, nt „.\\Music”, rakenduse kausta suhtes (nt USB-pulgal)."
      },
      "path_template": {
        "label": "Tee muster",
        "help": "Sihtkausta suhtes, ilma faililaiendita. „/” eraldab kaustu. {id} peab sisalduma (SoundCloudi puhul „sc-<id>”). {platform} muutub väärtuseks „YouTube” või „SoundCloud” – nt ülemise kaustana allikate eraldamiseks."
      },
      "max_title_length": {
        "label": "Pealkirja maks. pikkus",
        "help": "Pikemad pealkirjad lühendatakse failinimes."
      },
      "max_path_length": {
        "label": "Tee maks. pikkus",
        "help": "Täielik tee koos sihtkaustaga. Ilma lisaseadistuseta lubab Windows 259 märki."
      },
      "artist_from_title": {
        "label": "Loe esitaja pealkirjast",
        "help": "Tuvasta mustrid „ESITAJA @ ÜRITUS” ja „ESITAJA - PEALKIRI”, muidu kasuta kanali nime."
      },
      "title_cleanup_patterns": {
        "label": "Puhasta pealkiri",
        "help": "Regulaaravaldised, mille vasted pealkirjast eemaldatakse. Enter lisab.",
        "ph": "+ regex"
      },
      "album_from_edition": {
        "label": "Album = väljaanne",
        "help": "Kirjutab väljaande (nt „Defqon.1 2024“) albumi sildiks, nii et Plex ja Jellyfin näitavad festivali kõiki sette ühe albumina. Väljas: album = pealkiri, nagu varem."
      }
    },
    "path_preview": {
      "label": "Eelvaade",
      "help": "Klõpsa kohatäitjatel, et neid tee mustrisse lisada.",
      "fest": "{festival}, {event_year} ja {stage} täidetakse ainult siis, kui festival on määratud. Muidu jäävad need ära koos üleliigsete eraldajate ja tühjade kaustadega."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Paus päringute vahel",
        "help": "Ooteaeg metaandmete päringute vahel (otsing, jälgitavad allikad)."
      },
      "sleep_interval": {
        "label": "Allalaadimise paus – miinimum",
        "help": "Pärast iga allalaadimist järgneb juhuslik paus miinimumi ja maksimumi vahel."
      },
      "max_sleep_interval": {
        "label": "Allalaadimise paus – maksimum",
        "help": "Juhusliku pausi ülempiir."
      },
      "limit_rate_mb": {
        "label": "Allalaadimiskiirus",
        "help": "Maksimaalne ribalaius. 0 = piiranguta (ei soovitata)."
      },
      "max_downloads_per_run": {
        "label": "Maks. allalaadimisi käivituse kohta",
        "help": "Ülejäänud jäävad järjekorda."
      },
      "max_downloads_per_day": {
        "label": "Maks. allalaadimisi päevas",
        "help": "Loendur hõlmab käsitsi ja automaatseid allalaadimisi koos."
      },
      "max_searches_per_hour": {
        "label": "Maks. otsinguid tunnis",
        "help": "Kaitseb juhusliku lõputu otsimise eest."
      },
      "backoff_initial_hours": {
        "label": "Paus – algväärtus",
        "help": "Blokeerimise aeg pärast HTTP 429 või teadet „confirm you’re not a bot”."
      },
      "backoff_max_hours": {
        "label": "Paus – maksimum",
        "help": "Blokeerimisaeg kahekordistub iga järgmise blokeeringuga kuni selle väärtuseni."
      }
    },
    "backoff": {
      "none": "Pausi pole ({p})",
      "none_detail": "Otsing, jälgitavad allikad ja allalaadimised platvormilt {p} on lubatud.",
      "active": "Paus on aktiivne ({p})",
      "active_detail": "kuni {t} · jäänud {rest} · tase {level}",
      "blocked": "{p} andis märku blokeeringust. Otsing, jälgitavad allikad ja allalaadimised platvormilt {p} on blokeeritud, kuni aeg lõpeb.",
      "clear": "Tühista käsitsi",
      "sc_off": "SoundCloud on välja lülitatud",
      "sc_off_detail": "SoundCloudi otsingut, jälgitavate allikate kontrolle ega SoundCloudi allalaadimisi pole.",
      "p_off": "{p} on välja lülitatud",
      "p_off_detail": "Teenuse {p} otsingut, jälgitavate allikate kontrolle ega allalaadimisi teenusest {p} pole."
    },
    "soundcloud": {
      "enabled": {
        "label": "Kasuta SoundCloudi",
        "help": "Väljas: SoundCloudi otsingut, SoundCloudi allikate kontrolli ega SoundCloudi allalaadimisi pole. Juba allalaaditud kirjed jäävad kogusse."
      },
      "sleep_requests": {
        "label": "Paus päringute vahel",
        "help": "Ooteaeg metaandmete päringute vahel SoundCloudi poole (otsing, jälgitavad allikad)."
      },
      "sleep_interval": {
        "label": "Allalaadimise paus – miinimum",
        "help": "Pärast iga SoundCloudi allalaadimist järgneb juhuslik paus miinimumi ja maksimumi vahel."
      },
      "max_sleep_interval": {
        "label": "Allalaadimise paus – maksimum",
        "help": "Juhusliku pausi ülempiir."
      },
      "limit_rate_mb": {
        "label": "Allalaadimiskiirus",
        "help": "Maksimaalne ribalaius. 0 = piiranguta (ei soovitata)."
      },
      "max_downloads_per_run": {
        "label": "Maks. allalaadimisi käivituse kohta",
        "help": "SoundCloudi eraldi loendur. Ülejäänud jäävad järjekorda."
      },
      "max_downloads_per_day": {
        "label": "Maks. allalaadimisi päevas",
        "help": "SoundCloudi eraldi loendur, käsitsi ja automaatsed allalaadimised koos."
      },
      "max_searches_per_hour": {
        "label": "Maks. otsinguid tunnis",
        "help": "SoundCloudi eraldi loendur."
      },
      "backoff_initial_hours": {
        "label": "Paus – algväärtus",
        "help": "Blokeerimise aeg pärast seda, kui SoundCloud teatas liiga paljudest päringutest (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Paus – maksimum",
        "help": "Blokeerimisaeg kahekordistub iga järgmise blokeeringuga kuni selle väärtuseni."
      }
    },
    "ladder": {
      "label": "Tasemed",
      "help": "Kuidas blokeerimisaeg praeguste väärtustega kasvab.",
      "reset": "Lähtesta pärast edukat käivitust",
      "invalid": "Kehtetud väärtused"
    },
    "network": {
      "po_token_mode": {
        "label": "Režiim",
        "help": "yt-dlp bgutil-plugin. Skript käivitab Deno vajaduse korral, HTTP hoiab kohalikku serverit pidevalt töös."
      },
      "po_token_port": {
        "label": "HTTP-port",
        "help": "Ainult HTTP-režiimis. Server kuulab aadressil 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Tokeni kehtivus",
        "help": "Pärast seda aega genereeritakse uus token. Väärtus ümardatakse täistundideks (vähemalt 1 t)."
      },
      "cookies_from_browser": {
        "label": "Küpsised brauserist",
        "help": "Logib yt-dlp sisse sinu brauseri sisselogimisega. Lülita sisse ainult siis, kui ilma ei tööta enam."
      },
      "proxy": {
        "label": "Proksi",
        "help": "Valikuline, nt socks5://127.0.0.1:1080. Tühi = otseühendus.",
        "ph": "proksit pole"
      }
    },
    "po": {
      "active": "PO-Token on aktiivne",
      "inactive": "PO-Token pole aktiivne",
      "error": "PO-Tokeni viga",
      "mode": "Režiim",
      "test": "Testi",
      "testing": "Testimine …",
      "test_ok": "Test õnnestus.",
      "test_fail": "Test ebaõnnestus.",
      "unsaved": "Test kasutab salvestatud seadeid. Salvesta esmalt muudatused."
    },
    "cookies": {
      "warn_off": "<b>Soovitatav: väljas.</b> PO-Token ja brauseri küpsised koos võivad probleeme tekitada.",
      "warn_on": "<b>Ajutine lahendus on aktiivne.</b> PO-Token ja brauseri küpsised koos võivad põhjustada vigu või blokeeringuid ning päringutes kasutatakse sinu YouTube'i kontot. Lülita see välja niipea, kui ilma töötab. Küpsised ei jõua kunagi logisse."
    },
    "schedule": {
      "in_app_check": {
        "label": "Kontrolli, kuni rakendus töötab",
        "help": "Jälgitavaid allikaid kontrollitakse seadistatud intervalliga, kuni aken on avatud."
      },
      "watchlist_interval_hours": {
        "label": "Intervall",
        "help": "Aeg kahe kontrolli vahel rakenduses."
      },
      "entries_per_source": {
        "label": "Kirjeid allika kohta",
        "help": "Mitu uusimat kirjet kontrolli kohta tuuakse (flat) (vaikeväärtus uutele allikatele)."
      },
      "task_scheduler_enabled": {
        "label": "Kasuta tegumiplaanijat",
        "help": "Kontrollib jälgitavaid allikaid ka siis, kui rakendus on suletud (headless). Lülitub sisse nupust „Loo ülesanne”."
      },
      "task_time": {
        "label": "Kellaaeg",
        "help": "Planeeritud ülesande iga-päevane algusaeg."
      }
    },
    "next": {
      "title": "Järgmine kontroll",
      "off": "Automaatset kontrolli pole",
      "off_detail": "Ei rakenduse kontroll ega Windowsi ülesanne pole aktiivne. Jälgitavaid allikaid kontrollitakse ainult käsitsi.",
      "app_detail": "Rakenduses iga {h} t järel – kuni HCLoader töötab.",
      "task_detail": "Windowsi tegumiplaanija kaudu iga päev kell {time} – ka siis, kui rakendus on suletud.",
      "any_detail": "Varasem rakenduse intervallist ja Windowsi ülesandest.",
      "also_task": "Lisaks: Windowsi ülesanne iga päev kell {time}.",
      "also_app": "Lisaks rakenduses iga {h} t järel.",
      "pending": "Pole veel planeeritud",
      "pending_detail": "Rakendus määrab järgmise kuupäeva niipea, kui on jälgitavaid allikaid esimest korda kontrollinud.",
      "due": "On aeg – algab peagi",
      "backoff": "<b>Paus on aktiivne.</b> Kuni {t} kontrolle ei tehta; pärast seda tehakse kuupäev järele või jäetakse vahele.",
      "unsaved": "Salvestamata ajakava muudatused jõustuvad alles pärast salvestamist."
    },
    "task": {
      "loading": "Ülesande päring …",
      "registered": "Ülesanne registreeritud",
      "registered_detail": "{name} · iga päev {time} · järgmine käivitus {next}",
      "none": "Ülesannet pole registreeritud",
      "none_detail": "Loob igapäevase Windowsi ülesande kell {time} (schtasks).",
      "create": "Loo ülesanne",
      "remove": "Eemalda ülesanne",
      "moved": "Rakendus teisaldati – loo ülesanne uuesti",
      "moved_detail": "Planeeritud ülesanne käivitab endiselt {cmd}. Uuesti loomisel kasutatakse rakenduse praegust kausta.",
      "recreate": "Loo ülesanne uuesti",
      "unknown": "Ülesande olek teadmata",
      "unknown_detail": "Windowsi tegumiplaanija ei vastanud. Säte jääb muutmata.",
      "recheck": "Kontrolli uuesti"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Vähenda efekte",
        "help": "Lülitab välja skaneerimisjooned, tõrked ja kõik animatsioonid."
      },
      "scanlines": {
        "label": "Skaneerimisjooned ja müra",
        "help": "Peen kiht üle kogu liidese."
      },
      "pulse_bpm": {
        "label": "Kicki puls",
        "help": "Rütm, millega edenemisriba pulseerib."
      }
    },
    "pulse_preview": {
      "label": "Eelvaade",
      "help": "Nii pulseerib käimasolev allalaadimine.",
      "off": "Efektid vähendatud"
    },
    "versions": {
      "plugin": "PO-Tokeni plugin",
      "was": "varem {v}"
    },
    "update": {
      "label": "yt-dlp ja plugin",
      "help": "YouTube muutub pidevalt. Vigade korral uuenda esmalt (pip venv-keskkonnas).",
      "button": "Uuenda yt-dlp ja plugin",
      "running": "Uuendamine …",
      "last_check": "Viimane kontroll",
      "restart": "<b>Vajalik taaskäivitus.</b> yt-dlp uuendati. Otsing ja allalaadimised on blokeeritud, kuni HCLoader taaskäivitatakse; järjekord säilib.",
      "restart_title": "Vajalik taaskäivitus",
      "restart_text": "yt-dlp uuendati. Sulge HCLoader ja käivita see uuesti – seni on otsing ja allalaadimised blokeeritud, järjekord säilib.",
      "out_live": "Väljund · töötab {t}",
      "out_done": "Väljund · lõpetatud {t} pärast",
      "out_failed": "Väljund · ebaõnnestus",
      "out_last": "Väljund",
      "waiting": "Pip käivitub …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Kontrolli uuendusi käivitamisel",
        "help": "yt-dlp ja PO-Tokeni plugin, kõige rohkem kord päevas."
      },
      "check_app_updates_on_start": {
        "label": "Kontrolli HCLoaderi uuendusi käivitamisel",
        "help": "Küsib GitHubilt iga käivitamisel uut versiooni. Midagi ei laadita alla, kuni sa ei klõpsa."
      },
      "apply_update_on_exit": {
        "label": "Installi uuendus väljumisel",
        "help": "Allalaaditud uuendus installitakse HCLoaderi sulgemisel („Hiljem”). Väljas: seda pakutakse uuesti järgmisel käivitamisel."
      },
      "update_repo": {
        "label": "Uuenduste allikas (GitHub)",
        "help": "Hoidla kujul „omanik/hoidla”. Muuda ainult hargnemiste (fork) puhul."
      }
    },
    "db": {
      "label": "Andmebaas",
      "help": "Kõigi videote, allikate ja käivituste olek. Varukoopia kopeerib faili kausta „backups”.",
      "backup": "Loo andmebaasi varukoopia",
      "backing_up": "Varundamine …",
      "open": "Andmekaust",
      "open_logs": "Logikaust",
      "open_title": "Ava kaust andmebaasi, konfiguratsiooni ja varukoopiatega",
      "open_logs_title": "Ava kaust logifailidega",
      "info": {
        "one": "{n} kirje · {mb} MB",
        "other": "{n} kirjet · {mb} MB"
      },
      "last": "Viimane varukoopia",
      "never": "veel pole",
      "keep": "Säilitatakse 10 uusimat varukoopiat, vanemad kustutatakse järgmise varundamise ajal.",
      "backups": "Varukoopiad",
      "backups_more": "+ {n} vanemat kaustas „backups”",
      "fresh": "uus"
    },
    "reset_all": {
      "label": "Kõik seaded",
      "help": "Lähtestab kõik vahekaardid vaikeväärtustele. Andmebaas ja muusikafailid jäävad puutumata.",
      "button": "Lähtesta kõik"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Otsinguid tunnis",
        "help": "„Otsi puuduvaid sette” jaotab otsingud ühtlaselt (10 = üks iga 6 min järel). Lisaks kehtib üldine otsingute tunnilimiit."
      },
      "collector_results_per_search": {
        "label": "Tulemusi otsingu kohta",
        "help": "Mitu tulemust üks puuduva seti otsing läbi vaatab (üks päring otsingu kohta)."
      },
      "collector_auto_confirm": {
        "label": "Kinnita automaatselt alates",
        "help": "Sellest kindlusest alates loeb vaste ilma sinu kinnituseta – ainult siis, kui pealkirjas on DJ, festival ja aasta. Kõik allapoole jääv ootab klõpsu."
      },
      "detect": {
        "label": "Tuvasta automaatselt",
        "help": "Määrab uutele tulemustele ja allalaadimistele festivali või sarja, aasta, lava ja seti liigi. Käsitsi määratud väärtusi ei kirjutata kunagi üle."
      },
      "min_confidence": {
        "label": "Tuvastuslävi",
        "help": "Kindlus, millest alates vaste määratakse. Sellest allpool kuvatakse see vaid soovitusena, mille saad vastu võtta."
      },
      "year_from_upload_date": {
        "label": "Aasta üleslaadimise kuupäevast",
        "help": "Kui pealkirjas aastaarvu pole, kehtib üleslaadimise aasta (loetakse vähem kindlaks)."
      },
      "match_description": {
        "label": "Otsi ka kirjeldusest",
        "help": "Otsib festivalide nimesid ka salvestatud kirjeldusest."
      },
      "extra_stages": {
        "label": "Lisalavad",
        "help": "Lavade nimed lisaks sisseehitatutele (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ lava"
      }
    },
    "fest_types": {
      "label": "Oma terminid setiliikidele",
      "help": "Sõnad pealkirjas, mis viitavad seti liigile. Neid kontrollitakse enne sisseehitatud termineid.",
      "ph": "Termin pealkirjas",
      "add": "Termin"
    },
    "fest_test": {
      "label": "Testi pealkirja",
      "help": "Näitab, mida tuvastus pealkirjast leiab. Midagi ei salvestata; kehtivad salvestatud seaded.",
      "ph": "nt Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Midagi ei tuvastatud",
      "assigned": "määrataks",
      "suggested": "ainult soovitus"
    },
    "fest_status": {
      "title": "{assigned} miksi {total}-st määratud",
      "last": "Viimane läbikäik",
      "help": "Töötab võrguühenduseta olemasoleva kogu peal. Käsitsi määratud väärtused jäävad; faile ei sildistata uuesti ega teisaldata.",
      "button": "Määra festivalid kohe",
      "running": "Määramine … {done} / {total}"
    },
    "series": {
      "hint": "Tuntud festivalid, raadiosaated ja taskuhäälingud. Selle loendi muudatused salvestatakse kohe.",
      "add": "Sari",
      "show_hidden": "Näita peidetuid",
      "reset_all": "Lähtesta sisseehitatud sarjad",
      "builtin": "sisseehitatud",
      "own": "oma",
      "modified": "muudetud",
      "hidden": "peidetud",
      "no_aliases": "aliased puuduvad",
      "enable": "Tuvasta see sari",
      "hide": "Peida",
      "restore": "Taasta",
      "new_title": "Uus sari",
      "edit_title": "Muuda sarja",
      "name": "Nimi",
      "kind": "Liik",
      "default_genre": "Vaikežanr",
      "aliases": "Aliased",
      "aliases_help": "Muud kirjapildid. Piisab ühest vastest pealkirjas.",
      "weak_aliases": "Nõrgad aliased",
      "weak_help": "Tavasõnad, mis loevad ainult koos aastaarvuga.",
      "variants": "Variandid",
      "variants_help": "Omaette väljaanded, nt Australia või at Home.",
      "channels": "Korraldaja kanalid",
      "channels_help": "Kanali nimi, ID või URL. Suurendab ainult kindlust."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Kirjeid kuni allika kohta",
        "help": "„Loe kõik sisse (üks kord)” jälgimisloendis loeb kanalist või esitusloendist kuni nii palju kirjeid."
      },
      "backfill_requests_per_hour": {
        "label": "Päringuid tunnis",
        "help": "„Loe kõik sisse” lehekülje päringud jaotatakse ühtlaselt (120 = üks iga 30 s järel); kehtivad ka tavaline vahe ja backoff. Ajastatud käivitus (Tööplaanur) jätkab kuni nii mitme päringuga."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Analüüsi pärast igat allalaadimist",
        "help": "Mõõdab valjuse (EBU R128) ja arvutab lainekuju kohe pärast allalaadimist – võrguta, madala prioriteediga, üks fail korraga."
      },
      "write_tags": {
        "label": "Kirjuta ReplayGaini sildid",
        "help": "Kirjutab faili REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) või R128_TRACK_GAIN (Opus), et ka teised mängijad saaksid seda kasutada. Heli ei kodeerita kunagi ümber."
      },
      "waveforms": {
        "label": "Arvuta lainekujud ette",
        "help": "Arvutab lainekujud ka analüüsi ajal. Väljas: alles siis, kui setti esimest korda mängitakse."
      }
    },
    "analysis": {
      "title": "Analüüsitud {done} faili {total}-st",
      "counts": "{tagged} sildiga · {waves} lainekuju · {failed} ebaõnnestus",
      "help": "Töötab võrguta kogu kogu peal, üks fail korraga madala prioriteediga – ilma võrguta, heli jääb puutumata. Saab igal ajal katkestada.",
      "button": "Analüüsi uued failid",
      "button_n": "Analüüsi {n} uut",
      "all": "Analüüsi kõik uuesti",
      "all_title": "Mõõda iga fail uuesti (nt pärast failide asendamist väljaspool rakendust)",
      "running": "Analüüsin … {done} / {total}",
      "no_ffmpeg_title": "ffmpeg puudub",
      "no_ffmpeg": "Valjus ja lainekujud vajavad ffmpegi (bin\\ffmpeg.exe, paigaldab setup.ps1). Seaded › Hooldus näitab olekut."
    },
    "playlists": {
      "folder": {
        "label": "Esitusloendite kaust",
        "help": "Siia salvestatakse eksporditud esitusloendid. Tühi = „Playlists“ sihtkaustas.",
        "ph": "„Playlists“ sihtkaustas"
      },
      "relative_paths": {
        "label": "Suhtelised teed",
        "help": "Kirjed esitusloendi suhtes, et see töötaks ka siis, kui muusikakaust liigub (nt mälupulgale). Teisel kettal olevad failid saavad alati täieliku tee."
      },
      "sync_after_download": {
        "label": "Uuenda salvestatud esitusloendeid pärast allalaadimisi",
        "help": "„Hoia ajakohasena“ abil eksporditud esitusloendid kirjutatakse pärast iga allalaadimist uuesti – ainult kohalikult, ilma võrguta."
      }
    },
    "playlists_saved": {
      "label": "Salvestatud esitusloendid",
      "help": "Iga eksport jäetakse siia meelde. „Hoia ajakohasena“ kirjutab selle pärast allalaadimisi uuesti.",
      "none": "Esitusloendeid pole veel eksporditud – kasuta nuppu „M3U“ kogus, DJ-lehel või kontrollnimekirjas.",
      "gone": "fail puudub",
      "sync": "Hoia ajakohasena",
      "sync_title": "Kirjuta see esitusloend pärast allalaadimisi uuesti",
      "forget": "Eemalda loendist (fail jääb alles)",
      "now": "Uuenda kohe"
    },
    "notifications": {
      "enabled": {
        "label": "Windowsi teavitused",
        "help": "Näita teavitust Windowsi teavituskeskuses – ka pärast ajastatud kontrolli, kui rakendus on suletud."
      },
      "new_sets": {
        "label": "Uued setid postkastis",
        "help": "Jälgimisloendi kontroll (rakenduses või ajastatud) leidis uusi sette."
      },
      "downloads_done": {
        "label": "Allalaadimised valmis",
        "help": "Üks sõnum allalaadimisringi kohta settide arvu ja pealkirjadega."
      },
      "downloads_failed": {
        "label": "Allalaadimised ebaõnnestusid",
        "help": "Üks sõnum ringi kohta, kui allalaadimine ebaõnnestus. Üksikasjad jäävad jaotisse Allalaadimised."
      },
      "quiet_hours": {
        "label": "Vaiksed tunnid",
        "help": "Sel ajal teavitusi pole. Toimunu näidatakse hiljem ühe kokkuvõttena."
      },
      "quiet_from": {
        "label": "Alates",
        "help": "Vaiksete tundide algus (24 h)."
      },
      "quiet_to": {
        "label": "Kuni",
        "help": "Vaiksete tundide lõpp. Varasem kui algus = üle kesköö (nt 22:00–07:00)."
      }
    },
    "notify": {
      "on": "Teavitused sees",
      "off": "Teavitused väljas",
      "detail": "Näidatakse {backend} kaudu. Mitu järjestikust sündmust liidetakse üheks teavituseks.",
      "backend_powershell": "Windows PowerShelli (Windowsi osa)",
      "backend_winrt": "Windowsi teavituste API (pywinrt)",
      "test": "Saada test",
      "testing": "Saadan …",
      "test_sent": "Testteavitus saadetud – vaata ekraani paremat alanurka.",
      "unavailable": "Windowsi teavitused pole saadaval",
      "unavailable_detail": "See süsteem ei saa neid näidata (Windows PowerShell puudub või on blokeeritud). Sündmused kirjutatakse ainult logisse."
    },
    "media_server": {
      "type": {
        "label": "Meediaserver",
        "help": "Milline server pärast allalaadimisi oma teegi uuesti skannib. Väljas = HCLoader ei võta ühegi meediaserveriga ühendust."
      },
      "url": {
        "label": "Serveri aadress",
        "help": "Aadress koduvõrgus, nt http://192.168.1.10:32400 (Plex) või http://nas:8096 (Jellyfin). Ühendust võetakse ainult selle aadressiga.",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "Kaust serveris",
        "help": "Kus server sinu sihtkausta näeb (NAS, Docker), nt /data/music/HCLoader. Tühi = sama tee kui siin. Vajalik, et skannida ainult uusi kaustu.",
        "ph": "sama tee kui sihtkaustal"
      },
      "delay_seconds": {
        "label": "Oota enne skannimist",
        "help": "Pärast viimast allalaadimist oota nii kaua – mitmest allalaadimisest saab üks skannimine."
      },
      "verify_tls": {
        "label": "Kontrolli sertifikaati",
        "help": "https://-aadresside jaoks. Lülita välja ainult iseallkirjastatud sertifikaadi korral koduvõrgus."
      }
    },
    "ms": {
      "off": "Meediaserverit pole",
      "off_detail": "Vali allpool Plex või Jellyfin, et selle teek pärast allalaadimisi uuesti skannitaks.",
      "unsaved": "Salvestamata muudatused – skannimine kasutab salvestatud seadeid.",
      "on": "{server} uuendatakse pärast allalaadimisi",
      "last_ok": "Viimane skannimine {t} (uusi faile: {n})",
      "last_fail": "Viimane skannimine {t} ebaõnnestus",
      "never": "Skannimist pole veel olnud",
      "all_libraries": "Kõik teegid",
      "no_secret": "Luba / API-võtit pole veel salvestatud – sisesta see allpool ja testi ühendust.",
      "scan_now": "Skanni kohe",
      "scanning": "Taotlen …",
      "scan_sent": "Skannimine taotletud – server loeb teeki taustal.",
      "secret_plex": {
        "label": "Plexi luba",
        "help": "Sinu X-Plex-Token (Plex Web › mis tahes üksus › Teave › Kuva XML: „X-Plex-Token=“ aadressis). Salvestatakse pärast edukat testi Windowsi mandaadihaldurisse – mitte kunagi config.yaml-i ega logisse."
      },
      "secret_jellyfin": {
        "label": "Jellyfini API-võti",
        "help": "Juhtpaneel › API-võtmed › „+“. Salvestatakse pärast edukat testi Windowsi mandaadihaldurisse – mitte kunagi config.yaml-i ega logisse."
      },
      "secret_ph": "kleebi siia",
      "secret_kept": "salvestatud – jäta tühjaks, et alles hoida",
      "stored_short": "salvestatud",
      "stored_title": "Salvestatud Windowsi mandaadihaldurisse",
      "forget": "Eemalda",
      "forgotten": "Luba eemaldati Windowsi mandaadihaldurist",
      "connect": {
        "label": "Ühendus",
        "help": "Kontrollib aadressi ja luba ning laadib teekide loendi. Kaks lühikest päringut sinu serverisse, muud mitte midagi."
      },
      "test": "Testi ühendust",
      "testing": "Testin …",
      "test_ok": "Ühendatud: {name} (versioon {v}).",
      "test_libs": "Leitud teeke: {n}.",
      "stored": "Luba salvestatud.",
      "library": {
        "label": "Teek",
        "help": "Millist teeki skannida. „Kõik teegid“ skannib kõike (suurtes serverites aeglasem)."
      },
      "lib_paths": "Kaustad serveris: {p}"
    },
    "platform": {
      "enabled": {
        "label": "Kasuta teenust {p}",
        "help": "Väljas: teenuse {p} otsingut, allikate kontrolli ega allalaadimisi pole. Juba allalaaditud kirjed jäävad kogusse."
      },
      "sleep_requests": {
        "label": "Paus päringute vahel",
        "help": "Ooteaeg metaandmete päringute vahel teenusele {p} (otsing, jälgitavad allikad)."
      },
      "sleep_interval": {
        "label": "Allalaadimise paus – miinimum",
        "help": "Pärast iga allalaadimist teenusest {p} järgneb juhuslik paus miinimumi ja maksimumi vahel."
      },
      "max_sleep_interval": {
        "label": "Allalaadimise paus – maksimum",
        "help": "Juhusliku pausi ülempiir."
      },
      "limit_rate_mb": {
        "label": "Allalaadimiskiirus",
        "help": "Maksimaalne ribalaius. 0 = piiranguta (ei soovitata)."
      },
      "max_downloads_per_run": {
        "label": "Maks. allalaadimisi käivituse kohta",
        "help": "Teenuse {p} eraldi loendur. Ülejäänud jäävad järjekorda."
      },
      "max_downloads_per_day": {
        "label": "Maks. allalaadimisi päevas",
        "help": "Teenuse {p} eraldi loendur, käsitsi ja automaatsed allalaadimised koos."
      },
      "max_searches_per_hour": {
        "label": "Maks. otsinguid tunnis",
        "help": "Teenuse {p} eraldi loendur."
      },
      "backoff_initial_hours": {
        "label": "Paus – algväärtus",
        "help": "Blokeerimise aeg pärast seda, kui {p} teatas liiga paljudest päringutest (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Paus – maksimum",
        "help": "Blokeerimisaeg kahekordistub iga järgmise blokeeringuga kuni selle väärtuseni."
      }
    },
    "reupload": {
      "enabled": {
        "label": "Tuvasta uuesti üleslaadimised",
        "help": "Arvutab võrguühenduseta ffmpegiga iga seti kompaktse helisõrmejälje ja võrdleb uusi allalaadimisi sinu koguga. Vaste märgitakse „Tõenäoliselt uuesti üles laaditud: …“ – midagi ei kustutata automaatselt."
      },
      "fingerprint_after_download": {
        "label": "Sõrmejälg pärast iga allalaadimist",
        "help": "Üks fail korraga madala prioriteediga, pärast valjususe analüüsi. Väljas: ainult allpool olev kogu võrdlus."
      },
      "precheck": {
        "label": "Kontrolli enne allalaadimist",
        "help": "Võrdleb enne allalaadimist ka kestust (±5 s) ja pealkirja koguga samal platvormil – ilma lisapäringuta. Vasted lähevad postkasti, mitte järjekorda, ja näitavad „Tõenäoliselt juba alla laaditud“."
      },
      "head_minutes": {
        "label": "Minutit algusest",
        "help": "Kui suur osa algusest läheb sõrmejälje sisse. Rohkem = kindlam pika ühesuguse sissejuhatusega settide puhul, veidi aeglasem."
      },
      "windows": {
        "label": "Lisaaknad",
        "help": "30-sekundilised aknad, mis on jaotatud seti ülejäänud osale. Nendega eristatakse kaht eri setti, mis algavad sama looga. 0 = ainult algus."
      },
      "min_score": {
        "label": "Vaste lävi",
        "help": "Kattuvate sõrmejälje räsiväärtuste osa, millest alates loetakse sett uuesti üleslaadimiseks. Madalam = leiab rohkem, kuid rohkem valevasteid."
      },
      "title": "Sõrmejälg on {done} failil {total}-st",
      "marks": "avatud: {open} · seotud: {linked} · hoitud: {kept}",
      "help": "Töötab võrguühenduseta üle kogu, üks fail korraga madala prioriteediga – ilma võrguta, heli jääb muutmata. Saab igal ajal katkestada.",
      "button": "Võrdle uusi faile",
      "button_n": "Võrdle uusi ({n})",
      "all": "Võrdle kõik uuesti",
      "all_title": "Arvuta iga sõrmejälg uuesti (nt pärast akende muutmist) – sinu otsused jäävad",
      "running": "Võrdlemine … {done} / {total} · leitud: {found}",
      "show": "Näita kogus ({n})",
      "no_ffmpeg": "Sõrmejäljed vajavad ffmpegi (bin\\ffmpeg.exe, paigaldab setup.ps1). Olekut näitab Seaded › Hooldus."
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
        "auto": "Automaatne (süsteemi keel)"
      }
    },
    "player": {
      "mode": {
        "internal": "Sisseehitatud pleier (soovitatav)",
        "external": "Windowsi vaikimisi pleier"
      },
      "resume": {
        "ask": "Küsi",
        "auto": "Automaatne",
        "off": "Väljas"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Originaal (Opus/M4A, ilma teisendamata)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Väljas",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    },
    "media_server": {
      "type": {
        "off": "Väljas",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Blokeeri kanal",
      "text": "Kanali „{ch}” videoid enam ei kuvata. Tühistada saab jaotises Seaded › Filtrid ja märksõnad.",
      "ok": "Blokeeri"
    },
    "ignore_all": {
      "title": "Eira leide",
      "text": {
        "one": "Kas märkida {n} saabunud leidu eiratuks? Neid ei laeta alla ja need ei ilmu enam saabunute hulka.",
        "other": "Kas märkida {n} saabunud leidu eiratuks? Neid ei laeta alla ja need ei ilmu enam saabunute hulka."
      },
      "ok": "Eira"
    },
    "del_source": {
      "title": "Kustuta allikas",
      "text": "Kas eemaldada „{name}” jälgitavate allikate hulgast? Juba allalaaditud miksid säilivad."
    },
    "del_mix": {
      "title": "Kustuta miks",
      "text": "„{title}” eemaldatakse kogust ja fail kustutatakse kettalt:",
      "ok": "Kustuta fail",
      "warn": "<b>Seda ei saa tagasi võtta.</b> Helifail ja sellega seotud .cue-fail kustutatakse. Miks märgitakse „eiratuks” ja seda <b>ei laeta uuesti alla</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Eemalda ainult kirje",
      "text": "Faili „{title}” asub väljaspool praegust sihtkausta ega kustutata seetõttu:",
      "ok": "Eemalda ainult kirje",
      "warn": "Fail jääb puutumata sinna, kus ta on. Kirje kaob kogust, miks märgitakse „eiratuks” ja seda <b>ei laeta uuesti alla</b>."
    },
    "remove_mix": {
      "title": "Eemalda kirje",
      "text": "Faili „{title}” ei leitud salvestatud asukohast:",
      "ok": "Eemalda kirje",
      "warn": "Kirje kaob kogust. Miks märgitakse „eiratuks” ja seda <b>ei laeta uuesti alla</b>. Kui fail asub mujal, jääb see puutumata."
    },
    "backoff": {
      "title": "Tühista paus",
      "ok": "Tühista siiski",
      "text": "Blokeerimisaeg kaitseb sind: {p} andis märku, et päringuid tuli liiga palju.",
      "warn": "<b>Tühista ainult siis, kui oled kindel, et blokeering on lõppenud.</b> Kui rakendus pöördub liiga vara uuesti, võib {p} sinu IP-aadressi pikemaks ajaks või püsivalt piirata."
    },
    "reset_all": {
      "title": "Lähtesta kõik",
      "text": "Kõik seaded kõigil vahekaartidel määratakse kohe vaikeväärtustele ja salvestatakse.",
      "ok": "Lähtesta"
    },
    "series_delete": {
      "title": "Kas kustutada sari?",
      "text": "„{name}“ ja selle väljaanded kustutatakse.",
      "warn": {
        "one": "{n} miks kaotab oma määrangu.",
        "other": "{n} miksi kaotavad oma määrangu."
      }
    },
    "series_hide": {
      "title": "Kas peita sari?",
      "text": "Sarja „{name}“ enam ei tuvastata. Tagasi saad selle valikuga „Näita peidetuid“."
    },
    "series_reset": {
      "title": "Kas lähtestada sisseehitatud sarjad?",
      "text": "Kõik sisseehitatud sarjad naasevad algseisu ja peidetud tulevad tagasi. Sinu enda sarjad jäävad alles.",
      "ok": "Lähtesta"
    },
    "reupload_del": {
      "title": "Kustutada uuesti üleslaadimine?",
      "ok": "Kustuta fail",
      "text": "„{title}“ on tõenäoliselt sama miks nagu „{of}“. Kas kustutada see uuem fail?",
      "note": "Originaal jääb alles. Kirje märgitakse „eiratud“ ja seda enam alla ei laadita."
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} miks lisati järjekorda",
      "other": "{n} miksi lisati järjekorda"
    },
    "enqueued_none": "Midagi ei lisatud – juba järjekorras või allalaaditud",
    "enqueued_skipped": "Vahele jäetud: {n}",
    "queue_cancelled": "Tühistatud: {title}",
    "queue_removed": "Eemaldatud: {title}",
    "queue_retry": "Pandud uuesti järjekorda: {title}",
    "queue_paused": "Järjekord peatatud",
    "queue_resumed": "Järjekord jätkub",
    "new_run": "Uus käivitus alustatud",
    "ignored": "Eiratud: {title}",
    "unignored": "Taas nähtav: {title}",
    "ignored_n": {
      "one": "{n} leid eiratud",
      "other": "{n} leidu eiratud"
    },
    "opening": "Avan {p} brauseris …",
    "watch_added": "Lisatud jälgitavatesse: {ch}",
    "blocked": "Kanal blokeeritud: {ch}",
    "genre_set": "Žanr määratud: {genre}",
    "done": "Allalaaditud: {title}",
    "failed": "Ebaõnnestus: {title} – {error}",
    "wl_started": {
      "one": "Jälgitavate allikate kontroll (allikaid: {n}, aeglustatud) …",
      "other": "Jälgitavate allikate kontroll (allikaid: {n}, aeglustatud) …"
    },
    "wl_started_one": "Kontrollin allikat „{name}” …",
    "wl_none": "Aktiivset allikat pole – pole midagi kontrollida",
    "wl_done": {
      "one": "Jälgitavad allikad kontrollitud (allikaid: {n}): midagi uut pole",
      "other": "Jälgitavad allikad kontrollitud (allikaid: {n}): midagi uut pole"
    },
    "wl_done_found": {
      "one": "Jälgitavad allikad kontrollitud – uusi leide: {n}",
      "other": "Jälgitavad allikad kontrollitud – uusi leide: {n}"
    },
    "wl_errors": {
      "one": "Vigadega allikaid: {n}",
      "other": "Vigadega allikaid: {n}"
    },
    "source_added": "Allikas lisatud: {name}",
    "source_saved": "Allikas salvestatud: {name}",
    "source_deleted": "Allikas kustutatud: {name}",
    "retagged": "Uuesti sildistatud: {title}",
    "retagged_moved": "Uuesti sildistatud ja teisaldatud: {title} → {path}",
    "deleted": "Kustutatud: {title}",
    "removed": "Kirje eemaldatud: {title}",
    "folder_opening": "Kausta avamine …",
    "copied": {
      "one": "{n} rida kopeeritud",
      "other": "{n} rida kopeeritud"
    },
    "copy_failed": "Kopeerimine ebaõnnestus",
    "copy_none": "Nähtavaid ridu pole",
    "settings_saved": "Seaded salvestatud",
    "settings_errors": {
      "one": "{n} sisend on kehtetu",
      "other": "{n} sisendit on kehtetud"
    },
    "backoff_cleared": "Paus ({p}) tühistati käsitsi",
    "genre_moved": "Žanr: {genre} – teisaldatud asukohta {path}",
    "genre_retagged": "Žanr: {genre} – sildid uuendatud",
    "genre_entry_only": "Žanr: {genre} – muudeti ainult kirjet, fail pole kättesaadav",
    "genre_failed": "Žanri määramine ebaõnnestus: {error}",
    "task_created": "Ülesanne loodud Windowsi tegumiplaanijas",
    "task_removed": "Ülesanne eemaldatud",
    "updated": "Uuendatud versioonile yt-dlp {v}",
    "up_to_date": "Juba uusim versioon (yt-dlp {v})",
    "update_failed": "Uuendamine ebaõnnestus",
    "restart_required": "Uuendatud – käivita HCLoader uuesti, et otsing ja allalaadimised taas töötaksid",
    "backup_done": "Varukoopia loodud: {path}",
    "reset_all": "Kõik seaded lähtestatud",
    "festival_entry_only": "„{name}“ salvestati ainult kirjesse – fail pole kättesaadav",
    "series_saved": "Sari „{name}“ salvestatud",
    "series_deleted": "Sari „{name}“ kustutatud",
    "series_hidden": "Sari „{name}“ peidetud",
    "series_reset": "Sisseehitatud sarjad taastatud",
    "assign_done": "Festivalid määratud: {assigned} uut, {suggested} soovitust",
    "assign_cancelled": "Määramine katkestati: {assigned} uut, {suggested} soovitust",
    "analysis_done": "Valjus analüüsitud: {n} faili ({failed} ebaõnnestus)",
    "analysis_cancelled": "Analüüs katkestati pärast {n} faili",
    "fp_done": "Kogu võrreldud: faile {n}, tõenäolisi uuesti üleslaadimisi {found}",
    "fp_cancelled": "Võrdlemine katkestatud, töödeldud faile: {n}"
  },
  "upd": {
    "available": "Saadaval on versioon {v}",
    "available_sub": "Installitud: {cur}",
    "download": "Laadi alla",
    "notes": "Muudatused",
    "later": "Hiljem",
    "close": "Sulge",
    "cancel": "Tühista",
    "retry": "Proovi uuesti",
    "downloading": "Uuenduse {v} allalaadimine",
    "phase_download": "Allalaadimine",
    "phase_verify": "Kontroll",
    "phase_prepare": "Ettevalmistus",
    "ready": "Uuendus {v} on valmis",
    "ready_sub": "Installimiseks suletakse HCLoader korraks ja käivitatakse uuesti.",
    "restart_now": "Taaskäivita kohe",
    "on_exit": "Väljumisel",
    "applying": "Uuenduse installimine …",
    "applying_sub": "HCLoader sulgub ja käivitub kohe uuesti.",
    "error": "Rakenduse uuendamine ebaõnnestus",
    "blocked": "Automaatne uuendamine pole võimalik",
    "notes_title": "Versiooni {v} muudatused",
    "notes_empty": "Väljalaskemärkmeid pole.",
    "notes_link": "Väljalase GitHubis",
    "notes_all": "Näita kõiki muudatusi",
    "notes_less": "Näita ainult olulisemat",
    "confirm_title": "Taaskäivita kohe?",
    "confirm_ok": "Taaskäivita",
    "confirm_text": "HCLoader suletakse, uuendus installitakse ja rakendus käivitatakse uuesti. Käimasolev allalaadimine katkestatakse ja jääb järjekorda. Muusika, seaded ja andmebaas jäävad muutmata.",
    "on_exit_toast": "Uuendus installitakse HCLoaderi sulgemisel.",
    "later_toast": "Uuendus jääb valmis ja seda pakutakse uuesti järgmisel käivitamisel.",
    "section_label": "HCLoaderi versioon",
    "section_help": "Uued versioonid tulevad GitHubist. Uuendused ei puuduta andmeid, seadeid ega muusikat; enne andmebaasi migreerimist luuakse automaatselt varukoopia.",
    "current": "Installitud",
    "latest": "Uusim",
    "checked": "Viimane kontroll",
    "check_now": "Kontrolli kohe",
    "checking": "Kontrollimine …",
    "st_idle": "Ajakohane",
    "st_available": "Uus versioon on saadaval",
    "st_checking": "Kontrollimine …",
    "st_downloading": "Allalaadimine …",
    "st_ready": "Valmis installimiseks",
    "st_applying": "Installimine …",
    "st_error": "Viga",
    "st_unknown": "Pole veel kontrollitud",
    "up_to_date": "HCLoader on ajakohane (v{v})",
    "portable": "Portatiivne versioon",
    "installed": "Installitud (setup)",
    "git": "Git-koopia",
    "from_repo": "allikast {repo} (pole ametlik allikas)",
    "unverified": "ilma kontrollsummata (kontrollitud ainult ZIP-i terviklikkust)",
    "rn_label": "Väljalaskemärkmed",
    "rn_help": "Mis igas versioonis muutus – kaasas olevatest märkmetest (töötab ka võrguta).",
    "rn_older": "Vanem",
    "rn_newer": "Uuem",
    "rn_pos": "{i}/{n}",
    "rn_installed": "paigaldatud",
    "rn_empty": "Väljalaskemärkmeid ei leitud.",
    "rn_version": "Versioon"
  },
  "err": {
    "generic": "Tundmatu viga",
    "bridge": "Viga „{name}” juures: {msg}",
    "boot": "Käivitamine ebaõnnestus: {msg}",
    "no_backend": "Taustaprogrammiga puudub ühendus"
  },
  "fatal": {
    "title": "Ühendus taustaprogrammiga ebaõnnestus",
    "text": "Liides ei saanud vastust HCLoaderi Pythoni osast. Mitteehtsaid andmeid ei kuvata ega salvestata.",
    "waiting": "Ootan endiselt taustaprogrammi …",
    "reload": "Laadi uuesti"
  },
  "fest": {
    "all": "Kõik sarjad",
    "other": "Muud / määramata",
    "other_hint": "Festival puudub",
    "sets": {
      "one": "{n} sett",
      "other": "{n} setti"
    },
    "editions": {
      "one": "{n} väljaanne",
      "other": "{n} väljaannet"
    },
    "suggestions": {
      "one": "{n} soovitus",
      "other": "{n} soovitust"
    },
    "all_years": "Kõik",
    "no_stage": "Lava puudub",
    "kind": {
      "festival": "Festival",
      "radio": "Raadiosaade",
      "podcast": "Taskuhääling"
    },
    "set_type": {
      "live_set": "Live-sett",
      "closing_ceremony": "Lõputseremoonia",
      "opening": "Avamine",
      "endshow": "Endshow",
      "full_show": "Kogu show",
      "warm_up": "Warm-up",
      "anthem": "Anthem",
      "episode": "Osa"
    },
    "change": "muuda festivali",
    "change_manual": "määratud käsitsi, muutmiseks klõpsa",
    "add": "Määra festival või sari",
    "suggested": "Ebakindel soovitus: {name}",
    "accept": "Võta soovitus vastu",
    "p_title": "Festival / sari",
    "p_search": "Otsi sarja …",
    "p_none": "Festival puudub",
    "p_no_match": "Sarja ei leitud",
    "p_year": "Aasta",
    "p_variant": "Variant",
    "p_stage": "Lava",
    "p_type": "Seti liik",
    "p_apply": "Rakenda",
    "p_auto": "Tagasi automaatsele"
  },
  "backfill": {
    "action": "Loe kõik sisse (üks kord)",
    "action_title": "Loe selle allika kogu nimekiri üks kord lehekülghaaval sisse – uued tabamused lähevad postkasti",
    "again_title": "Loe kõik uuesti – lisatakse ainult veel tundmatud kirjed",
    "search_title": "Mitte salvestatud otsingutele – otsing annab kuni 100 tulemust",
    "why_open": "Sisselugemine on juba alanud – peata või tühista see nime all",
    "st_pending": "Ootab",
    "st_running": "Loeb sisse …",
    "st_paused": "Peatatud",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / max {cap}",
    "added": "+{n} postkastis",
    "done_short": "Kõik loetud {date}",
    "done_title": "Täielikult sisse loetud: {date} · {n} kirjet",
    "note_title": "Viimane katkestus",
    "pause": "Peata",
    "resume": "Jätka",
    "cancel": "Tühista",
    "keep": "Loe edasi",
    "dlg_title": "Kas lugeda kõik allikast „{name}”?",
    "dlg_text": "Loeb selle allika kogu nimekirja üks kord lehekülghaaval sisse – lame ja odav, piiraja kaudu; midagi ei laadita alla. Tabamused, mis läbivad sinu filtrid, lähevad <b>postkasti</b>, ka automaatse allalaadimisega allikate puhul. Juba tuntud videoid ei lisata kunagi kaks korda.",
    "dlg_requests": "päringut",
    "dlg_time": "kestus",
    "dlg_entries": "kirjet",
    "dlg_known": "Teada viimasest kontrollist: <b>{n}</b> kirjet.",
    "dlg_unknown": "Suurus pole teada – ettevaatlik hinnang maksimumile {cap} kirjet.",
    "dlg_capped": "Sisse loetakse ainult esimesed {cap} kirjet (Seaded › Ajakava).",
    "dlg_resume": "Jätkab pärast {n} juba loetud kirjet; nende leheküljed küsitakse kõigepealt uuesti.",
    "dlg_headless": "Ajastatud käivituse jaoks liiga suur ({n} päringut tunnis): kui rakendus enne lõppu suletakse, jätkub see ainult rakenduses.",
    "dlg_pace": "Kuni {n} päringut tunnis, ühtlaselt jaotatud. Backoff (HTTP 429 / robotikontroll), rakenduse sulgemine või viga ainult katkestavad – hiljem jätkub automaatselt. Peatada või tühistada saad igal ajal.",
    "dlg_ok": "Alusta sisselugemist",
    "dlg_ok_resume": "Loe edasi",
    "dlg_cancel_title": "Kas tühistada sisselugemine?",
    "dlg_cancel_text": "Allika „{name}” sisselugemine peatub ja edenemine visatakse ära. Postkastis olevad tabamused jäävad alles.",
    "toast_started": "„{name}” loetakse täielikult sisse – töötab taustal",
    "toast_done": "„{name}” täielikult sisse loetud – +{n} postkastis",
    "toast_paused": "„{name}” peatatud – jätka nupuga „Jätka”",
    "toast_cancelled": "Allika „{name}” sisselugemine tühistati"
  },
  "collector": {
    "nav": "Koguja",
    "open_title": "Festivalikoguja: kogu ühe festivaliaasta kõik setid kontroll-loendi abil",
    "title": "Festivalikoguja",
    "sub": "Ühe festivaliaasta kõik setid – ajakava järgi, kontroll-loendiga",
    "back_library": "Tagasi kogusse",
    "back_list": "Kõik kontroll-loendid",
    "collect": "Kogu see aasta",
    "collect_title": "Kõigi settide kontroll-loend: {name} – leia puuduvad setid ja laadi need alla",
    "open_checklist": "Kontroll-loend {n} / {total}",
    "sets": "Setid",
    "lists": "Kontroll-loendid",
    "card_empty": "Sette veel pole",
    "new_title": "Uus kontroll-loend",
    "new_text": "Vali festival ja aasta. Setid tulevad korraldaja esitusloendist, kleebitud ajakavast või kaasasolevast failist.",
    "new_ok": "Ava kontroll-loend",
    "f_series": "Festival / sari",
    "f_series_ph": "Vali …",
    "f_series_other": "Raadiosaated ja taskuhäälingud",
    "err_series": "Vali festival või sari.",
    "err_year": "Sisesta festivali aasta.",
    "empty_title": "Kontroll-loendit veel pole",
    "empty_text": "Kontroll-loend loetleb ühe festivaliaasta iga seti ja näitab, mis sul juba olemas on.",
    "step1": "Vali ülal festival ja aasta.",
    "step2": "Impordi korraldaja esitusloend või kleebi ajakava.",
    "step3": "Eemalda linnuke sellelt, mida sa ei soovi, otsi puuduvad setid ja laadi alla.",
    "delete": "Kustuta kontroll-loend",
    "dlg_delete_title": "Kas kustutada kontroll-loend?",
    "dlg_delete_text": "Kontroll-loend „{name}” eemaldatakse koos kõigi ridadega. Käimasolev otsing peatub.",
    "dlg_delete_keep": "Allalaaditud failid, kogu kirjed ja salvestatud vasted jäävad alles.",
    "toast_deleted": "Kontroll-loend „{name}” kustutatud",
    "in_library": "{n} kogus",
    "show_library": "Näita kogus ({n})",
    "more": "Veel",
    "st": {
      "found": "Leitud",
      "queued": "Järjekorras",
      "downloaded": "Alla laaditud",
      "missing": "Puudub",
      "ignored": "Eiratud"
    },
    "filter_status": "Näita ainult: {name}",
    "sources": "Allikad",
    "src_playlist": "Impordi korraldaja esitusloend",
    "src_paste": "Kleebi ajakava (Beta)",
    "files": "Kaasasolevad ajakavad",
    "src_add": "Lisa rida",
    "all_stages": "Kõik lavad",
    "all_days": "Kõik päevad",
    "no_day": "Päev puudub",
    "search": "Filtreeri DJ järgi …",
    "col_dj": "DJ / sett",
    "col_when": "Päev / aeg",
    "col_status": "Olek",
    "col_match": "Leitud video",
    "source": {
      "playlist": "Esitusloend",
      "timetable": "Ajakava",
      "file": "Ajakavafail",
      "manual": "Lisatud käsitsi"
    },
    "edited": "Käsitsi muudetud – need väärtused kehtivad ka pärast hilisemaid importe",
    "check_title": "Kogu see sett",
    "all_title": "Vali kõik / mitte ühtegi (kuvatud read)",
    "m_none": "Pole veel otsitud",
    "m_searched": "Midagi ei leitud ({date})",
    "confirm": "Kinnita",
    "confirm_title": "Ebakindel vaste – kinnita, et see on õige sett",
    "reject_title": "Mitte see video – ära paku seda sellele reale enam",
    "reject": "Loobu vastest",
    "candidates": "Teisi vasteid: {n}",
    "candidates_head": "Kasuta teist vastet",
    "ignore": "Eira seda setti",
    "unignore": "Ära enam eira",
    "delete_row": "Kustuta rida",
    "f_artist": "DJ / artist",
    "f_day": "Päev",
    "f_start": "Algus",
    "f_end": "Lõpp",
    "add_ok": "Lisa",
    "err_artist": "DJ / artist on kohustuslik.",
    "none_title": "Ridu pole",
    "none_text": "Ükski rida ei vasta praegustele filtritele.",
    "rows_empty_title": "See kontroll-loend on tühi",
    "rows_empty_text": "Alusta korraldaja ametlikust esitusloendist – üks lihtne päring katab enamasti suurema osa settidest. Või kleebi ajakava tekstina.",
    "checked_of": "/ {total} märgitud",
    "select_all": "Vali kõik",
    "select_none": "Mitte ühtegi",
    "shown": "Kuvatud {n} / {total} rida",
    "to_confirm": "Kinnitada: {n}",
    "to_confirm_title": "Ebakindlad vasted ootavad sinu kinnitust – klõpsa, et näha ainult neid",
    "find": "Otsi puuduvaid sette ({n})",
    "find_again": "Otsi uuesti ({n})",
    "find_title": "Otsib märgitud sette, millel vastet pole, ükshaaval ja rahulikus tempos – näitab enne hinnangut",
    "find_again_title": "Kõiki sette on juba otsitud – otsi vasteta sette uuesti",
    "find_none": "Pole midagi otsida – igal märgitud setil on vaste",
    "find_running": "Otsing käib",
    "queue": "Laadi märgitud alla ({n})",
    "queue_title": "Lisa kõik märgitud ja kinnitatud setid allalaadimisjärjekorda",
    "queue_none": "Pole midagi alla laadida – ühtegi märgitud setti kinnitatud ja veel alla laadimata vastega pole",
    "job_pending": "Ootel",
    "job_running": "Otsin …",
    "job_paused": "Peatatud",
    "job_hits": "Leitud: {n}",
    "job_cancel": "Peata",
    "job_resume": "Jätka",
    "imp_running": "Loen esitusloendit …",
    "imp_entries": "Kirjeid: {n}",
    "imp_hint": "lihtne päring, leht lehe haaval",
    "imp_busy": "Üht esitusloendit juba loetakse",
    "imp_added": "uusi: {n}",
    "imp_merged": "ühendatud: {n}",
    "imp_matched": "leitud kogust: {n}",
    "imp_unchecked": "linnukeseta (liiga lühike / aftermovie): {n}",
    "imp_invalid": "vigaseid: {n}",
    "pl_title": "Impordi korraldaja esitusloend",
    "pl_text": "Korraldaja ametlik liveset’ide esitusloend on kõige odavam allikas: üks lihtne päring, midagi ei laadita alla. Igast kirjest saab kinnitatud rida; DJ, lava ja seti tüüp võetakse pealkirjast.",
    "pl_url": "Esitusloendi link",
    "pl_hint": "YouTube’i esitusloend või SoundCloudi sett. Liiga lühikesed kirjed, aftermovie’d ja treilerid lisatakse linnukeseta. Ajakava read saavad sobiva video.",
    "pl_ok": "Impordi",
    "pl_err_empty": "Kleebi esitusloendi link.",
    "toast_pl_started": "Loen esitusloendit – töötab taustal",
    "toast_pl_done": "Esitusloend loetud –",
    "toast_pl_cancelled": "Esitusloendi import peatatud –",
    "tt_title": "Kleebi ajakava – {name} (Beta)",
    "tt_text": "Kleebi ajakava tekstina või CSV-na. Pealkirjad määravad päeva ja lava, iga muu rida on sett. Enne importi ei salvestata midagi.",
    "tt_input": "Ajakava",
    "tt_preview": "Eelvaade",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Siia ilmuvad tuvastatud setid.",
    "tt_nothing": "Ühtegi setti pole veel tuvastatud.",
    "tt_sum": "Sette: {n}",
    "tt_days": "Päevi: {n}",
    "tt_stages": "Lavasid: {n}",
    "tt_skipped": "Arusaamatuid ridu: {n}",
    "tt_more": "… ja veel {n}",
    "tt_ok": "Impordi ({n})",
    "tt_edit_hint": "Paranda või eemalda sette siin enne importi. Vasakul teksti muutmine loeb selle uuesti sisse.",
    "toast_tt": "Ajakava imporditud –",
    "files_text": "Ajakavad, mida hoitakse HCLoaderi hoidlas ja mis tulevad kaasa uuendustega. Import loob vastava aasta kontroll-loendi.",
    "files_empty_title": "Ajakavasid veel kaasas pole",
    "files_empty": "Kaasa pannakse ainult tõendatult õiged ajakavad – selles versioonis neid veel pole. Kleebi ajakava selle asemel tekstina.",
    "files_how_title": "Lisa oma ajakava",
    "files_how": "Üks JSON-fail aasta kohta: setid (artist, lava, päev, algus, lõpp) ja allikaks link ametlikule ajakavale. Saada see issue või pull request’ina GitHubis; failide kõrval olev README kirjeldab vormingut.",
    "files_meta": "Sette: {n} · uuendatud {date}",
    "files_source": "ametlik allikas",
    "files_import": "Impordi",
    "files_broken": "Vigane fail: {error}",
    "files_unknown": "Sari on siin tundmatu või peidetud",
    "est_title": "Otsi puuduvaid sette – {name}",
    "est_text": "Otsib iga märgitud setti, millel vastet pole, ükshaaval: <b>DJ + festival + aasta</b> lihtsa otsinguna läbi piiraja. Midagi ei laadita alla.",
    "est_requests": "otsingut",
    "est_left": "vaba sel tunnil",
    "est_again": "Kõiki sette on juba otsitud – nüüd otsitakse vasteta sette uuesti.",
    "est_offline": "Äsja tasuta sinu koguga sobitatud: {n}.",
    "est_resume": "Jätkab katkenud otsingut.",
    "est_wait": "Selle tunni otsingulimiit on täis – esimene otsing algab {t}.",
    "est_backoff": "Backoff kehtib kuni {t} – enne seda otsingut alustada ei saa.",
    "est_pace": "Kuni {n} otsingut tunnis, ühtlaselt jaotatuna (umbes üks iga {min} min järel). Ebakindlad vasted ootavad sinu kinnitust. Backoff, rakenduse sulgemine või viga ainult katkestab otsingu – see jätkub automaatselt.",
    "est_ok": "Alusta otsingut",
    "est_ok_resume": "Jätka otsingut",
    "toast_find_started": "Otsin puuduvaid sette: „{name}” – töötab taustal",
    "toast_find_done": "Otsing lõppenud – leitud {n} / {total}",
    "toast_find_cancelled": "Otsing peatatud – „Otsi puuduvaid sette” jätkab seda",
    "toast_offline": "Sinu koguga sobitatud: {n} – otsingut pole vaja",
    "toast_confirmed": "„{name}” kinnitatud",
    "toast_rejected": "Vastest loobutud: „{name}”",
    "toast_ignored": "„{name}” eiratakse",
    "toast_unignored": "„{name}” kogutakse jälle",
    "toast_row_added": "„{name}” lisatud",
    "toast_row_added_hit": "„{name}” lisatud – leitud kogust",
    "toast_row_saved": "„{name}” salvestatud",
    "toast_row_retag": "„{name}” salvestatud – faili sildid uuendatakse",
    "toast_row_deleted": "Rida „{name}” kustutatud",
    "q_none": "Järjekorda ei lisatud midagi",
    "q_unconfirmed": "kinnitamata: {n}",
    "q_missing": "vasteta: {n}",
    "q_other": "ei saa laadida: {n}",
    "q_retag": "sildid uuendatud: {n}",
    "export": "Esitusloend",
    "export_title": "Ekspordi selle kontrollnimekirja allalaaditud setid M3U8-esitusloendina"
  },
  "tracks": {
    "nav": "Lood",
    "open_title": "Millistes settides lugu mängib? Otsi teegi lugude nimekirjadest",
    "title": "Lood",
    "sub": "Millistes settides see lugu mängib?",
    "back": "Tagasi teeki",
    "search": "Esitaja või pealkiri, nt Dragonborn",
    "n_tracks": {
      "one": "{n} lugu",
      "other": "{n} lugu"
    },
    "n_sets": {
      "one": "{n} sett",
      "other": "{n} setti"
    },
    "status": "{tracks}, {sets}",
    "status_last": "Loetud:",
    "scan": "Loe lugude nimekirjad",
    "scan_title": "Loe kõigi settide lugude nimekirjad (võrguühenduseta: peatükid, kirjeldused, CUE-failid)",
    "rescan": "Loe kõik uuesti",
    "rescan_title": "Loe kõigi settide lugude loendid uuesti",
    "scan_new": "Loe uued",
    "scan_new_title": "Loe ainult uued või pärast viimast läbimist muutunud setid",
    "running": "Lugude nimekirjade lugemine … {done} / {total}",
    "engine_like": "Lihtne otsing: selles SQLite'is pole täistekstiindeksit",
    "top_title": "Enim mängitud lood",
    "top_sub": "kõige rohkemates settides",
    "top_sets": {
      "one": "{n} setis",
      "other": "{n} setis"
    },
    "top_find": "Näita selle looga sette",
    "top_empty": "Ükski lugu ei esine veel rohkem kui ühes setis.",
    "results": {
      "one": "{n} sett: „{q}“",
      "other": "{n} setti: „{q}“"
    },
    "truncated": "esimesed {n} – täpsusta otsingut",
    "more_hits": {
      "one": "+ veel {n} vaste",
      "other": "+ veel {n} vastet"
    },
    "no_results_title": "Ükski sett ei mängi „{q}“",
    "no_results_text": "Proovi osa esitajast või pealkirjast. Leitakse ainult lugude nimekirjaga sette (peatükid, kirjeldus, CUE-fail).",
    "empty_title": "Lugude nimekirju veel pole",
    "empty_text": "HCLoader loeb lugude nimekirjad sinu settide peatükkidest, kirjeldustest ja CUE-failidest – võrguühenduseta, YouTube'ilt küsimata.",
    "empty_none_title": "Ühelgi sinu setil pole lugude nimekirja",
    "empty_none_text": "Lugude nimekirjad tulevad peatükkidest, ajatemplitega kirjeldustest ja CUE-failidest. Ilma nendeta sette otsida ei saa.",
    "library_empty": "Laadi kõigepealt mõni sett alla – nende lugude nimekirjad ilmuvad siia.",
    "jump": "Mängi alates {time}",
    "jump_external": "Avatud vaikemängijas – hüppa seal kohale {time}",
    "no_time": "Lugude nimekirjas pole ajatemplit",
    "tracklist": "Lugude nimekiri",
    "tracklist_title": "Näita selle seti kogu lugude nimekirja",
    "panel_source": "Allikas: {source}",
    "source_chapters": "peatükid",
    "source_description": "kirjeldus",
    "source_id3": "ID3 peatükid",
    "source_cue": "CUE-fail",
    "source_none": "puudub",
    "panel_empty": "Sellel setil pole lugude nimekirja",
    "panel_empty_hint": "Ei leitud peatükke, lugude nimekirjaga kirjeldust ega CUE-faili.",
    "close": "Sulge",
    "id_track": "Avaldamata või tuvastamata lugu (ID)",
    "play_set": "Mängi sett algusest",
    "toast_done": "Lugude nimekirjad loetud: {sets}, {tracks}",
    "toast_cancelled": "Lugude nimekirjade lugemine katkestatud"
  },
  "pl": {
    "title": "Ekspordi esitusloend",
    "export": "Ekspordi",
    "overwrite": "Kirjuta üle",
    "exists": "Selles kaustas on juba sama nimega esitusloend. „Kirjuta üle“ asendab selle.",
    "nothing": "Pole midagi eksportida – siin pole allalaaditud sette.",
    "missing": "{n} faili puudub – need jäetakse vahele",
    "name": "Failinimi",
    "folder": "Kaust",
    "browse": "Sirvi …",
    "paths": "Teed esitusloendis",
    "relative": "Suhtelised",
    "absolute": "Absoluutsed",
    "relative_help": "Esitusloendi suhtes – töötab edasi, kui kogu muusikakaust liigub. Teisel kettal olevad failid kirjutatakse täieliku teega.",
    "absolute_help": "Täielikud teed – esitusloendi võib panna kuhu tahes, kuid see lakkab töötamast, kui muusika liigub.",
    "sync": "Hoia allalaadimiste järel ajakohasena",
    "sync_help": "Kirjutatakse pärast iga allalaadimist automaatselt uuesti.",
    "sync_off": "Meelde jäetud – hakkab tööle, kui „Uuenda salvestatud esitusloendeid pärast allalaadimisi“ on sees (Seaded › Salvestus).",
    "done": "Esitusloend salvestatud ({sets}): {path}",
    "skipped": "{n} puuduvat vahele jäetud",
    "fallback": "{n} teisel kettal täieliku teega",
    "synced": "Esitusloendeid uuendatud: {n}",
    "sync_failed": "Esitusloendeid ei uuendatud: {n} (vt logi)"
  },
  "djs": {
    "nav": "DJ-d",
    "open_title": "DJ-lehed: kõik su kogu artistid, aliaste ja b2b-settidega",
    "title": "DJ-d",
    "sub": "Su kogu artistid",
    "back_library": "Tagasi kogusse",
    "back": "Kõik DJ-d",
    "add": "Lisa DJ / projekt",
    "search": "Otsi DJ-sid või aliaseid",
    "sort": "Sorteeri",
    "sort_sets": "Setid",
    "sort_recent": "Viimased",
    "sort_name": "Nimi",
    "hidden_chip": "Peidetud: {n}",
    "n_festivals": "Festivalid: {n}",
    "n_b2b": "b2b: {n}",
    "aka": "alias {names}",
    "unhide": "Näita jälle loendis",
    "none_title": "DJ-d ei leitud",
    "none_text": "Proovi teist nime või aliast.",
    "empty_title": "DJ-sid veel pole",
    "empty_text": "DJ-d tuvastatakse võrguühenduseta allalaaditud settide pealkirjadest, festivalide kontrollnimekirjadest ja artistide kanalitest.",
    "b2b_title": "Mängitud koos (b2b) – sett läheb arvesse igale artistile",
    "b2b_with": "b2b koos: {names}",
    "aliases": "Aliased",
    "no_aliases": "Aliaseid pole",
    "split_title": "Eralda „{alias}“ – loe eraldi DJ-ks",
    "play_all": "Esita kõik",
    "export": "Ekspordi M3U",
    "export_title": "Ekspordi esitusloend: {name}",
    "watch": "Lisa jälgitavatesse",
    "discover": "Otsi avastamises",
    "stat_sets": "Setid",
    "stat_hours": "Tunnid",
    "stat_festivals": "Festivalid",
    "stat_years": "Aastad",
    "stat_b2b": "b2b",
    "other_sets": "Muud setid · {year}",
    "tracks": "Enim mängitud settides",
    "track_sets": "{n}×",
    "tracks_none": "Nende settide lugude nimekirju veel pole – Kogu › Lood loeb need võrguühenduseta.",
    "play_all_external": "„Esita kõik“ vajab sisseehitatud mängijat (Seaded › Taasesitus).",
    "watch_exists": "Juba jälgitavates: {name}",
    "watch_title": "Jälgi: {name}",
    "watch_ok": "Lisa jälgitavatesse",
    "watch_channel": "Uued setid artisti {name} enda kanalist jõuavad saabunute hulka:",
    "watch_search": "Oma kanalit pole teada – jälgimine otsib YouTube’ist regulaarselt:",
    "watch_note": "Midagi ei laadita automaatselt alla. Allikat saab jälgitavates igal ajal muuta või eemaldada.",
    "watch_added": "Lisatud jälgitavatesse: {name}",
    "split_q_title": "Eralda alias",
    "split_q": "Kas lugeda „{alias}“ nimega setid eraldi DJ-ks, mitte artistile {name}?",
    "split_ok": "Eralda",
    "split_done": "„{alias}“ on jälle eraldi DJ",
    "edit": "Muuda nime ja aliaseid",
    "edit_title": "Muuda: {name}",
    "add_title": "Lisa DJ või projekt",
    "f_name": "Nimi",
    "f_aliases": "Aliased",
    "f_aliases_help": "Muud kirjapildid ja lühinimed (nt „HH“). Aliasega setid lähevad arvesse sellele DJ-le.",
    "f_act_help": "Valikuline. Duo, mille nimes on „&“ (nt „D-Block & S-te-Fan“), loetakse siis üheks projektiks, mitte b2b-ks.",
    "f_alias_add": "+ alias",
    "f_channel": "Oma kanal (valikuline)",
    "f_channel_help": "YouTube’i või SoundCloudi kanali URL – kasutab „Lisa jälgitavatesse“.",
    "saved": "Salvestatud",
    "merge": "Ühenda teise DJ-ga …",
    "merge_title": "Ühenda: {name}",
    "merge_text": "Kõik artisti {name} setid ja kirjapildid lähevad arvesse valitud DJ-le. Hiljem saab ta uuesti eraldada.",
    "merge_into": "Ühenda DJ-ga",
    "merge_ok": "Ühenda",
    "merge_none": "Teist DJ-d ühendamiseks pole.",
    "merged": "{name} ühendatud",
    "hide": "Pole DJ – peida",
    "hidden_done": "DJ-de loendist peidetud",
    "unhidden_done": "Jälle DJ-de loendis",
    "sub_n": {
      "one": "{n} DJ",
      "other": "{n} DJ-d"
    }
  },
  "stats": {
    "title": "Statistika",
    "sub": "Sinu teek arvudes – võrguühenduseta, andmebaasist",
    "range": "Periood",
    "p_all": "Kogu aeg",
    "p_12m": "12 kuud",
    "p_30d": "30 päeva",
    "p_year": "See aasta",
    "p_custom": "Kohandatud",
    "from": "Alates",
    "to": "Kuni",
    "n_sets": {
      "one": "{n} sett",
      "other": "{n} setti"
    },
    "sets_word": {
      "one": "sett",
      "other": "setti"
    },
    "k_sets": "Setid",
    "k_hours": "Kestus",
    "k_size": "Kettal",
    "k_avg": "Keskmine sett",
    "of_library": "teegi {n}-st",
    "since": "alates {d}",
    "days_nonstop": "{n} päeva vahetpidamata",
    "last_dl": "viimane allalaadimine {d}",
    "avg_size": "{s} seti kohta",
    "sizes_missing": {
      "one": "{n} fail veel mõõtmata",
      "other": "{n} faili veel mõõtmata"
    },
    "measuring": "Mõõdetakse failide suurusi … {done} / {total}",
    "h_months": "Allalaadimised kuude kaupa",
    "h_years_dl": "Allalaadimised aastate kaupa",
    "best_month": "Parim: {m} ({n})",
    "h_genres": "Žanri järgi",
    "h_sources": "Allikad",
    "h_festivals": "Tippfestivalid",
    "editions": {
      "one": "{n} väljaanne",
      "other": "{n} väljaannet"
    },
    "festivals_other": "+ {n} setti veel {f} festivalilt",
    "no_festivals": "Sel perioodil festivalisette pole – need määrab Seaded › Festivalid ja sarjad.",
    "h_djs": "Tipp-DJ-d",
    "open_dj": "Ava DJ {name} leht",
    "no_djs": "Sel perioodil DJ-sid ei tuvastatud.",
    "h_years": "Seti aasta järgi",
    "year_unknown": "{n} teadmata aastaga",
    "h_tracks": "Enim mängitud lood",
    "no_tracks": "Ükski lugu ei esine veel kahes setis – loonimekirjad tulevad peatükkidest ja kirjeldustest (Teek › Lood).",
    "h_watchlist": "Jälgimisloendi tegevus",
    "w_checks": "Kontrollid",
    "w_scheduled": "neist ajastatud",
    "w_found": "Leitud",
    "w_inbox": "Postkastis",
    "w_library": "Teegis",
    "w_source": "Allikas",
    "w_found_n": "leitud: {n}",
    "w_checks_n": "kontrolle: {n}",
    "w_last": "viimane kontroll {t}",
    "w_none_range": "Ükski allikas ei leidnud sel perioodil midagi.",
    "w_no_sources": "Jälgimisloendis pole veel allikaid.",
    "none": "Sel perioodil pole midagi.",
    "range_empty": "Sel perioodil ei laaditud midagi alla – vali pikem.",
    "error": "Statistika pole saadaval",
    "empty_title": "Sette veel pole",
    "empty_text": "Niipea kui teegis on esimesed setid, näed siin, mida kogud – žanrid, festivalid, DJ-d, tunnid.",
    "empty_go": "Avasta sette"
  },
  "reupload": {
    "tag": "Uuesti üles laaditud?",
    "tag_title": "Tõenäoliselt seti „{title}“ uuesti üleslaadimine ({p}, {score} % vastavus) – klõpsa, et otsustada",
    "linked": "Sama miks",
    "linked_title": "Seotud sama miksina nagu „{title}“ ({p})",
    "chip": "Uuesti üleslaadimised ({n})",
    "chip_title": "Näita ainult sette, mis on märgitud tõenäoliseks uuesti üleslaadimiseks",
    "menu_head": "Tõenäoliselt seti „{title}“ uuesti üleslaadimine · {score} %",
    "menu_head_linked": "Sama miks nagu „{title}“",
    "keep": "Hoia mõlemad",
    "link": "Seo sama miksina",
    "undo": "Võta otsus tagasi",
    "show_original": "Näita originaali",
    "delete_new": "Kustuta see uuem fail",
    "toast_keep": "Mõlemad hoitud – märge eemaldatud",
    "toast_link": "Seotud sama miksina",
    "toast_open": "Otsus võeti tagasi",
    "toast_found": "Tõenäoliselt uuesti üles laaditud: „{title}“ vastab setile „{of}“ – vaata kogu",
    "dl_notice": "Hiljutised allalaadimised, mis on tõenäoliselt juba olemasolevate settide uuesti üleslaadimised ({n}):",
    "review": "Vaata kogus üle"
  }
});
