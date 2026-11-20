/* HCLoader UI texts – Suomi.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "fi", "name": "Suomi", "dir": "ltr", "intl": "fi-FI"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "KOVAN MUSIIKIN ARKISTO",
    "mock": "ESITTELYTILA"
  },
  "nav": {
    "discover": "Etsi",
    "inbox": "Saapuneet",
    "watchlist": "Seuranta",
    "downloads": "Lataukset",
    "library": "Kirjasto",
    "log": "Loki",
    "settings": "Asetukset",
    "stats": "Tilastot"
  },
  "common": {
    "ok": "OK",
    "cancel": "Peruuta",
    "save": "Tallenna",
    "delete": "Poista",
    "edit": "Muokkaa",
    "remove": "Poista",
    "reset": "Palauta",
    "on": "päällä",
    "off": "pois",
    "current": "nykyinen",
    "loading": "ladataan …",
    "add_chip": "+ lisää",
    "empty": "”tyhjä”",
    "empty_list": "”ei mitään”",
    "undo": "Kumoa"
  },
  "fmt": {
    "today": "tänään",
    "yesterday": "eilen",
    "never": "ei koskaan",
    "no_date": "Päivämäärä tuntematon",
    "just_now": "juuri nyt",
    "today_at": "tänään {t}",
    "tomorrow_at": "huomenna {t}",
    "yesterday_at": "eilen {t}",
    "views": {
      "one": "{v} katselukerta",
      "other": "{v} katselukertaa"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "minuuttia",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "merkkiä",
    "results": "tulosta",
    "entries": "merkintää",
    "clock": "24 h",
    "req_h": "pyynt./h",
    "lufs": "LUFS",
    "db": "dB",
    "pct": "%"
  },
  "range": {
    "ge_sleep": "≥ vähimmäisarvo",
    "ge_initial": "≥ alkuarvo"
  },
  "status": {
    "new": "Uusi",
    "inbox": "Saapuneissa",
    "queued": "Jonossa",
    "downloading": "Ladataan",
    "done": "Ladattu",
    "ignored": "Ohitettu",
    "failed": "Virhe"
  },
  "period": {
    "all": "Kaikki",
    "7d": "Viimeiset 7 päivää",
    "30d": "Viimeiset 30 päivää",
    "1y": "Viimeiset 12 kuukautta",
    "year": "Tietty vuosi",
    "custom": "Mukautettu"
  },
  "source_type": {
    "channel": "Kanava",
    "playlist": "Soittolista",
    "search": "Haku"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Alusta",
    "sc_off": "SoundCloud on pois päältä – ota se käyttöön kohdassa Asetukset › SoundCloud.",
    "mixcloud": "Mixcloud",
    "hearthis": "hearthis.at",
    "p_off": "{p} on pois päältä – ota käyttöön kohdassa Asetukset › Lisää lähteitä.",
    "all": "Kaikki"
  },
  "genre": {
    "change": "Vaihda tyylilaji",
    "manual": "Tyylilaji asetettu käsin",
    "change_manual": "Vaihda tyylilaji (asetettu käsin)"
  },
  "run_kind": {
    "watchlist": "Seuranta",
    "headless": "Tehtävien ajoitus",
    "manual": "Käsin"
  },
  "phase": {
    "waiting": "Odottaa",
    "sleep": "Tauko seuraavaan lataukseen",
    "download": "Ladataan",
    "convert": "Muunnetaan",
    "tag": "Merkitään",
    "failed": "Epäonnistui"
  },
  "po_mode": {
    "off": "Pois",
    "script": "Skripti",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Pois",
    "script": "Skripti (Deno)",
    "http": "HTTP-palvelin (paikallinen)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "puuttuu",
    "po": "PO token",
    "po_active": "aktiivinen ({mode})",
    "po_inactive": "ei aktiivinen",
    "po_error": "Virhe",
    "backoff": "Backoff",
    "backoff_none": "ei",
    "backoff_until": "asti {t} · {rest} jäljellä",
    "queue": "Jono",
    "queue_empty": "tyhjä",
    "queue_active": "aktiivinen",
    "queue_paused": "tauolla",
    "today": "Tänään",
    "next": "Seuraava tarkistus",
    "next_off": "pois",
    "backoff_until_short": "asti {t}",
    "sc_backoff": "Backoff asti {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · ladattu tänään {day}/{day_max} · {s}/{s_max} hakua tällä tunnilla",
    "sc_tip": "SoundCloud · ladattu tänään {day}/{day_max} · {s}/{s_max} hakua tällä tunnilla",
    "backoff_tip": "{p}: backoff asti {t} ({rest} jäljellä)",
    "p_tip": "{p} · ladattu tänään {day}/{day_max} · {s}/{s_max} hakua tällä tunnilla",
    "system": "Järjestelmä",
    "system_title": "Järjestelmän tila"
  },
  "schedule": {
    "due": "erääntynyt",
    "kind_app": "Sovellus",
    "kind_task": "Tehtävä",
    "tip_app": "Seuraava seurannan tarkistus sovelluksessa: {t} (kun HCLoader on käynnissä).",
    "tip_task": "Seuraava seurannan tarkistus Windowsin tehtävien ajoituksella: {t}.",
    "tip_any": "Seuraava seurannan tarkistus: {t}.",
    "tip_off": "Ei automaattista tarkistusta – ei sovelluksessa eikä Windowsin tehtävien ajoituksella.",
    "tip_backoff": "Ei tarkistuksia, kun backoff on aktiivinen."
  },
  "card": {
    "source": "Löytyi seurantalähteestä ”{name}”",
    "select": "Vain tilaajille (Select)",
    "open": "Avaa palvelussa {p}",
    "ignore": "Ohita",
    "unignore": "Älä enää ohita",
    "more": "Lisää toimintoja",
    "download": "Lataa",
    "watch": "Lisää kanava seurantaan",
    "block": "Estä kanava",
    "set_genre": "Aseta tyylilaji",
    "date_approx": "Likimääräinen päivämäärä – YouTube-haku kertoo vain ”X vuotta sitten”",
    "date_unknown": "Lisäyspäivää ei ole annettu",
    "duplicate": "Luultavasti jo ladattu ({p})",
    "duplicate_title": "Hyvin samankaltainen nimi ja sama kesto kuin kohteella ”{title}” palvelusta {p} – jo ladattu tai jonossa siellä. Voit silti ladata sen.",
    "preview": "Vain esikuuntelu (Go+) – ei ladattavissa",
    "preview_title": "SoundCloud tarjoaa tälle kappaleelle vain 30 sekunnin esikuuntelun (Go+). Sitä ei voi ladata.",
    "select_title": "Tämä Mixcloud-lataus on vain tekijän tilaajien saatavilla (Mixcloud Select). Sitä ei voi ladata."
  },
  "discover": {
    "placeholder": "Hae mixiä, live-settiä, DJ:tä, tapahtumaa …",
    "search": "Hae",
    "searching_btn": "Haetaan …",
    "searching": "Haetaan – kevyt kysely, hellä YouTubea kohtaan …",
    "sort": "Lajittelu",
    "sort_rel": "Osuvuus",
    "sort_date": "Uusimmat ensin",
    "sort_dur": "Pisimmät ensin",
    "sort_views": "Eniten katsotut",
    "quota": "Hakuja tällä tunnilla: {n} / {max}",
    "quota_sc": "SoundCloud-hakuja tällä tunnilla: {n} / {max}",
    "placeholder_sc": "Hae SoundCloudista: mix, setti, DJ, podcast …",
    "platform_title": "Mistä haetaan",
    "searching_sc": "Haetaan – kevyt kysely, hellä SoundCloudia kohtaan …",
    "ready_text_sc": "Kirjoita hakusana ja paina Enter hakeaksesi SoundCloudista.",
    "previews": "{n} vain esikuuntelu (Go+)",
    "previews_title": "Esikuunteluja (Go+) ei voi koskaan ladata. Näkyvät, kun ”Piilota ladatut ja ohitetut” on pois päältä.",
    "filters": "Suodattimet",
    "toggle_filters": "Näytä/piilota suodatinpaneeli",
    "f_duration": "Kesto (minuuttia)",
    "f_min": "Vähimmäis",
    "f_max": "Enimmäis (tyhjä = ei rajaa)",
    "f_max_ph": "enint.",
    "f_period": "Lisäysajanjakso",
    "f_year": "Vuosi",
    "f_year_prev": "Yksi vuosi taaksepäin",
    "f_year_next": "Yksi vuosi eteenpäin",
    "f_from": "Alkaen",
    "f_to": "Päättyen",
    "f_hint_year": "YouTube-haku antaa vain likimääräisen päivämäärän (”13 vuotta sitten”). Siksi ±1 vuoden poikkeama sallitaan – samoin jokainen mix, jonka nimessä on ”{year}”.",
    "f_hint_custom": "YouTube-haku antaa vain likimääräisen päivämäärän. Likimääräisissä päivämäärissä sallitaan ±1 vuoden poikkeama molemmissa päissä.",
    "chip_title": "Napsautus: näytä/piilota tyylilaji · Kaksoisnapsautus: vain tämä tyylilaji (sen hakusanat lisätään hakuun)",
    "scope": "Hakua laajennettu sanoilla",
    "scope_title": "Seuraava haku lisää nämä sanat hakutekstiisi.",
    "searched": "Haettu sanoilla",
    "stale": "Suodattimia muutettu sen jälkeen",
    "re_search": "Hae uudelleen",
    "re_search_title": "Tulokset ovat edellisestä hausta. Hae uudelleen, jotta tyylilaji ja vuosi otetaan mukaan hakusanaan (lasketaan yhdeksi hauksi).",
    "need_query": "Kirjoita ensin hakusana.",
    "f_inc": "Sisällytettävät avainsanat",
    "f_exc": "Pois suljettavat avainsanat",
    "f_show": "Näyttö",
    "f_hide": "Piilota ladatut ja ohitetut",
    "f_blacklist": "Käytä kanavien estolistaa",
    "count": {
      "one": "{n} tulos · {hidden} suodatettu pois",
      "other": "{n} tulosta · {hidden} suodatettu pois"
    },
    "selected": "{n} valittu",
    "select_all": "Valitse kaikki",
    "download_sel": "Lataa valitut",
    "ready_title": "Valmis",
    "ready_text": "Kirjoita hakusana ja paina Enter.",
    "none_title": "Ei löytynyt mitään",
    "none_text": "Höllennä suodattimia tai kokeile muita hakusanoja.",
    "none_year": "Ei tuloksia vuodelta {year}. Hae uudelleen, jotta vuosi otetaan mukaan hakusanaan – tai vaihda vuosi.",
    "quota_p": "{p}-hakuja tällä tunnilla: {n} / {max}",
    "placeholder_p": "Hae palvelusta {p}: mix, setti, DJ, podcast …",
    "searching_p": "Haetaan – kevyt kysely, hellä palvelua {p} kohtaan …",
    "ready_text_p": "Kirjoita hakusana ja paina Enter hakeaksesi palvelusta {p}.",
    "previews_mc": "vain tilaajille (Select): {n}",
    "previews_mc_title": "Mixcloud Select -lataukset ovat vain maksaville tilaajille, eikä niitä voi koskaan ladata. Näkyvät, kun ”Piilota ladatut ja ohitetut” on pois päältä.",
    "placeholder_all": "Hae kaikista palveluista: miksaus, live-setti, DJ, tapahtuma …",
    "searching_all": "Haetaan palvelusta {p} ({i}/{n}) – yksi palvelu kerrallaan …",
    "ready_text_all": "Kirjoita hakusana ja paina Enter – kaikki käytössä olevat palvelut käydään läpi yksi kerrallaan.",
    "quota_all": "Hakuja tällä tunnilla: {list}",
    "platform_current": "Palvelu: {p}",
    "platform_all_title": "Hakee kaikista käytössä olevista palveluista yksi kerrallaan. Jokaisella palvelulla on omat taukonsa ja oma ”hakuja tunnissa” -rajansa.",
    "platform_backoff": "{p}: tauko klo {t} asti – ”Kaikki” ohittaa sen",
    "platform_backoff_short": "tauko",
    "skipped": "Ohitettu: {list}",
    "skipped_title": "Näistä palveluista ei haettu tällä kertaa.",
    "skip_backoff": "tauko klo {t} asti",
    "skip_error": "ei vastausta",
    "all_none": "Mistään palvelusta ei voitu hakea.",
    "kw_clear": "Poista kaikki",
    "kw_cleared_inc": "Sisällytettävät avainsanat poistettu",
    "kw_cleared_exc": "Pois suljettavat avainsanat poistettu",
    "kw_sugg_title": "Lisää takaisin (tallennetuista asetuksista)",
    "kw_sugg_label": "Ehdotuksia tallennetuista asetuksista",
    "kw_session_hint": "Koskee vain tätä istuntoa – tässä ei tallenneta mitään. Lähtöarvot: Asetukset › Suodattimet ja avainsanat.",
    "kw_group": "Avainsanat",
    "kw_count": "{inc} mukana · {exc} pois",
    "kw_sum_inc": "+ {list}",
    "kw_sum_exc": "− {list}",
    "kw_sum_more": "{list} …",
    "kw_sum_line": "{label}: {list}"
  },
  "inbox": {
    "title": "Saapuneet",
    "sub": "Uudet seurannan osumat, jotka läpäisevät kaikki suodattimet",
    "sub_n": {
      "one": "{n} uusi seurannan osuma, joka läpäisee kaikki suodattimet",
      "other": "{n} uutta seurannan osumaa, jotka läpäisevät kaikki suodattimet"
    },
    "ignore_all": "Ohita kaikki",
    "download_all": "Lataa kaikki",
    "ignore_sel": "Ohita valitut",
    "download_sel": "Lataa valitut",
    "select_all": "Valitse kaikki",
    "select_none": "Poista valinta",
    "src_all": "Kaikki lähteet",
    "src_none": "Ei lähdettä",
    "src_title": "Näytä vain tämän lähteen osumat",
    "count": {
      "one": "{n} osuma",
      "other": "{n} osumaa"
    },
    "count_of": "{n} / {total} osumaa",
    "selected": "{n} valittu",
    "empty_title": "Saapuneet on tyhjä",
    "empty_text": "Seuranta ei ole löytänyt uusia mixejä.",
    "empty_nosrc": "Seurannassa ei ole vielä lähteitä – lisää kanava, soittolista tai haku, niin uudet mixit ilmestyvät tänne.",
    "empty_next": "Seuraava tarkistus: {t}.",
    "to_watchlist": "Seurantaan"
  },
  "watchlist": {
    "title": "Seuranta",
    "sub_n": {
      "one": "{n} lähde · {active} aktiivinen",
      "other": "{n} lähdettä · {active} aktiivista"
    },
    "sub_next": "seuraava tarkistus {t}",
    "add": "Lähde",
    "check_all": "Tarkista kaikki nyt",
    "check": "Tarkista",
    "checking": "tarkistetaan …",
    "queued": "odottaa …",
    "running": "Tarkistetaan …",
    "running_n": "Tarkistetaan {i} / {n} …",
    "col_active": "Aktiivinen",
    "col_name": "Nimi",
    "col_type": "Tyyppi",
    "col_genre": "Tyylilaji",
    "col_auto": "Uudet osumat",
    "col_max": "Enint.",
    "col_last": "Viimeksi tarkistettu",
    "col_new": "Uudet",
    "genre_auto": "automaattinen",
    "genre_auto_long": "Automaattinen (avainsanoista)",
    "auto_on": "lataa",
    "auto_off": "saapuneet",
    "auto_title_on": "Uudet osumat ladataan automaattisesti",
    "auto_title_off": "Uudet osumat menevät vain Saapuneisiin",
    "new_title": "Näytä Saapuneissa",
    "check_title": "Tarkista tämä lähde nyt",
    "why_off": "Lähde ei ole aktiivinen",
    "why_running": "Tarkistus on jo käynnissä",
    "why_backoff": "Backoff aktiivinen – tarkistus estetty",
    "why_backoff_p": "Backoff ({p}) aktiivinen – tarkistus estetty",
    "why_sc_off": "SoundCloud on pois päältä",
    "error_title": "Viimeisin tarkistus epäonnistui",
    "backoff": "<b>Backoff aktiivinen asti {t}</b> ({rest} jäljellä). Seurantaa ei voi tarkistaa – myös ajastetut tarkistukset ovat tauolla.",
    "backoff_p": "<b>Backoff ({p}) aktiivinen asti {t}</b> ({rest} jäljellä). Palvelun {p} lähteet ohitetaan siihen asti – {other} jatkaa toimintaa.",
    "backoff_link_sc": "Avaa SoundCloud",
    "backoff_link": "Avaa Rajoitus",
    "none_active": "Ei aktiivista lähdettä tarkistettavaksi",
    "empty_title": "Ei lähteitä",
    "empty_text": "Lisää kanava, soittolista tai tallennettu haku.",
    "add_title": "Lisää lähde",
    "edit_title": "Muokkaa lähdettä",
    "f_type": "Tyyppi",
    "f_name": "Nimi",
    "f_url": "URL",
    "f_query": "Hakusana",
    "f_genre": "Oletustyylilaji",
    "f_max": "Merkintöjä enintään",
    "f_newest_last": "Uusimmat ovat lopussa (lue soittolista takaperin)",
    "hint_newest_last": "Monissa soittolistoissa YouTube lisää uudet videot loppuun. Lukee koko soittolistan (noin 1 pyyntö 100 videota kohti, enintään 2000 merkintää).",
    "rev_title": "Uusimmat ovat lopussa – soittolista luetaan lopusta",
    "rev_short": "takaperin",
    "f_enabled": "Aktiivinen – mukana kohdassa ”Tarkista kaikki” ja aikataulussa",
    "f_hits": "Uudet osumat",
    "hits_inbox": "Saapuneisiin",
    "hits_auto": "Lataa automaattisesti",
    "hint_inbox": "Osumat odottavat Saapuneissa, kunnes lataat tai ohitat ne.",
    "hint_auto": "Osumat, jotka läpäisevät kaikki suodattimet, menevät suoraan jonoon.",
    "hint_channel": "YouTube-kanava (…/@nimi tai …/channel/UC…, valinnaisesti /videos tai /streams), SoundCloud-profiili (soundcloud.com/nimi), Mixcloud-käyttäjä (mixcloud.com/nimi) tai hearthis.at-käyttäjä (hearthis.at/nimi).",
    "hint_playlist": "YouTube-soittolista, jossa ”list=…”, SoundCloud-setti (soundcloud.com/nimi/sets/setti), Mixcloud-soittolista (mixcloud.com/nimi/playlists/lista) tai hearthis.at-setti (hearthis.at/nimi/set/setti). Uusimmat kohteet tarkistetaan.",
    "f_platform": "Hae palvelusta",
    "detected": "tunnistettu: {p} · {type}",
    "not_detected": "URL-osoitetta ei tunnistettu",
    "suggested": "Ehdotus",
    "suggested_title": "Ehdotettu URL-osoitteesta. Jos jätät sen ennalleen, ensimmäinen tarkistus korvaa sen oikealla nimellä – tai kirjoita se itse.",
    "hint_name_auto": "Ehdotettu URL-osoitteesta – muokkaa vapaasti. Jos jätät ennalleen, ensimmäinen tarkistus asettaa oikean nimen.",
    "hint_name_later": "Nimi asetetaan ensimmäisellä tarkistuksella – tai kirjoita se tähän itse.",
    "name_auto_title": "Väliaikainen nimi – seuraava tarkistus asettaa oikean",
    "hint_search": "Tallennettu haku, kuten kohdassa ”Etsi” – lasketaan yhdeksi hauksi tarkistusta kohti.",
    "hint_max": "tarkistusta kohti",
    "max_default": "(oletus)",
    "max_default_title": "Ei omaa arvoa: käytössä on ”Merkintöjä lähdettä kohti” kohdasta Asetukset › Aikataulu",
    "max_title": "Tyhjä = oletus kohdasta Asetukset › Aikataulu. Enintään 200, hakulähteillä 100.",
    "ph_name": "esim. Gabber Vault",
    "ph_name_later": "asetetaan ensimmäisellä tarkistuksella",
    "ph_channel": "https://www.youtube.com/@kanava  tai  https://soundcloud.com/nimi",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  tai  https://soundcloud.com/nimi/sets/…",
    "ph_search": "esim. frenchcore liveset",
    "form_error": "Lähdettä ei voitu tallentaa.",
    "backoff_link_p": "Avaa {p}",
    "why_p_off": "{p} on pois päältä"
  },
  "downloads": {
    "title": "Lataukset",
    "sub": "Peräkkäin, yksi lataus kerrallaan",
    "pause": "Tauko",
    "resume": "Jatka",
    "cancel": "Peruuta",
    "retry": "Yritä uudelleen",
    "remove": "Poista",
    "up": "Siirrä ylös",
    "down": "Siirrä alas",
    "eta": "Jäljellä",
    "position": "Sija {n}",
    "sleep_left": "jatkuu",
    "sleep_why": "Rajoitus: satunnainen {min}–{max} s tauko kahden latauksen välillä",
    "next_up": "Seuraavana",
    "sleeping": "Tauolla",
    "sleep_range": "väliltä {min}–{max} s",
    "blocked_wait": "Odottaa – {why}",
    "why_backoff": "Backoff",
    "why_day": "Päiväraja",
    "why_run": "Ajokerran raja",
    "why_paused": "tauolla",
    "why_restart": "Uudelleenkäynnistys tarvitaan",
    "why_busy": "toinen ajo käynnissä",
    "why_pot": "PO-Token-palvelin ei ole valmis",
    "why_target": "Kohdekansio ei ole tavoitettavissa",
    "why_error": "Latausmoduuli puuttuu",
    "summary": "Tänään {day}/{day_max} · Ajo {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} jatkaa latausta.",
    "steps": "Lataus · Muunnos · Merkintä",
    "unlimited": "rajaton",
    "l_run": "Tämä ajo",
    "l_day": "Tänään",
    "l_rate": "Nopeusraja",
    "l_sleep": "Tauko latausten välillä",
    "sec_queue": "Jono",
    "sec_failed": "Epäonnistuneet",
    "empty_title": "Jono on tyhjä",
    "empty_text": "Valitse mixejä kohdasta ”Etsi” tai ”Saapuneet”.",
    "paused": "<b>Jono on tauolla.</b> Käynnissä oleva lataus pysähtyy, kunnes jatkat.",
    "backoff": "<b>Backoff aktiivinen asti {t}</b> ({rest} jäljellä). Lataukset, haku ja seuranta on estetty.",
    "backoff_rest": {
      "one": "<b>Backoff aktiivinen asti {t}</b> ({rest} jäljellä). Lataukset, haku ja seuranta on estetty – {n} jää jonoon.",
      "other": "<b>Backoff aktiivinen asti {t}</b> ({rest} jäljellä). Lataukset, haku ja seuranta on estetty – {n} jää jonoon."
    },
    "limit_day": "<b>Päiväraja saavutettu ({n}/{max}).</b> Loput jäävät jonoon ja jatkuvat huomenna.",
    "limit_day_rest": {
      "one": "<b>Päiväraja saavutettu ({n}/{max}).</b> {rest} jää jonoon ja jatkuu huomenna.",
      "other": "<b>Päiväraja saavutettu ({n}/{max}).</b> {rest} jää jonoon ja jatkuu huomenna."
    },
    "limit_run": "<b>Raja saavutettu – {max}/{max} tässä ajossa.</b> Loput jäävät jonoon ja jatkuvat seuraavassa ajossa.",
    "limit_run_rest": {
      "one": "<b>Raja saavutettu – {max}/{max} tässä ajossa.</b> {rest} jää jonoon ja jatkuu seuraavassa ajossa.",
      "other": "<b>Raja saavutettu – {max}/{max} tässä ajossa.</b> {rest} jää jonoon ja jatkuu seuraavassa ajossa."
    },
    "limits_link": "Muuta rajoja",
    "new_run": "Aloita uusi ajo",
    "need_restart": "<b>Uudelleenkäynnistys tarvitaan.</b> yt-dlp päivitettiin – käynnistä HCLoader uudelleen. Jono säilyy.",
    "busy": "Toinen latausajo on käynnissä (esim. ajastettu tarkistus). Jono odottaa, kunnes se on valmis.",
    "local_pot": {
      "one": "<b>PO-Token-palvelin ei ole valmis.</b> {rest} jää jonoon ja jatkuu heti, kun palvelin on käynnissä.",
      "other": "<b>PO-Token-palvelin ei ole valmis.</b> {rest} jää jonoon ja jatkuu heti, kun palvelin on käynnissä."
    },
    "local_target": {
      "one": "<b>Kohdekansio ei ole tavoitettavissa tai siihen ei voi kirjoittaa.</b> {rest} jää jonoon ja jatkuu heti, kun kansio on taas käytettävissä.",
      "other": "<b>Kohdekansio ei ole tavoitettavissa tai siihen ei voi kirjoittaa.</b> {rest} jää jonoon ja jatkuu heti, kun kansio on taas käytettävissä."
    },
    "local_error": {
      "one": "<b>Latausmoduulia (yt-dlp) ei voitu ladata.</b> {rest} jää jonoon. Seuraava yritys kohdan ”Jatka”, uusien merkintöjen tai asetusten tallennuksen jälkeen.",
      "other": "<b>Latausmoduulia (yt-dlp) ei voitu ladata.</b> {rest} jää jonoon. Seuraava yritys kohdan ”Jatka”, uusien merkintöjen tai asetusten tallennuksen jälkeen."
    },
    "local_link_pot": "Verkkoasetukset",
    "local_link_target": "Muuta tallennuspaikkaa",
    "local_link_error": "Ylläpito",
    "summary_p": "{p} {day}/{day_max}"
  },
  "library": {
    "title": "Kirjasto",
    "sub": {
      "one": "{n} mixi",
      "other": "{n} mixiä"
    },
    "sub_shown": "{n} / {total} näkyvissä",
    "search": "Nimi, kanava tai polku …",
    "all_genres": "Kaikki tyylilajit",
    "all_channels": "Kaikki kanavat",
    "all_years": "Kaikki vuodet",
    "f_genre": "Tyylilaji",
    "f_channel": "Kanava",
    "f_year": "Vuosi",
    "f_sort": "Lajittelu",
    "sort_newest": "Uusimmat ensin",
    "sort_title": "Nimi A–Ö",
    "sort_channel": "Kanava A–Ö",
    "sort_duration": "Pisimmät ensin",
    "view_list": "Luettelo",
    "view_grid": "Ruudukko",
    "clear": "Palauta suodattimet",
    "col_title": "Nimi",
    "col_channel": "Kanava",
    "col_genre": "Tyylilaji",
    "col_year": "Vuosi",
    "col_duration": "Kesto",
    "col_size": "Koko",
    "col_loaded": "Ladattu",
    "play": "Toista",
    "pause": "Tauko",
    "play_external": "Avaa oletussoittimessa",
    "play_internal": "Toista sovelluksen soittimella",
    "play_missing": "Tiedosto puuttuu – ei voi toistaa",
    "more": "Näytä {n} lisää",
    "now_playing": "Nyt soi",
    "retag_short": "Merkitse uudelleen",
    "genre_working": "Asetetaan tyylilajia …",
    "open_folder": "Avaa kansio",
    "retag": "Merkitse uudelleen (tunnisteet, kansikuva ja sijainti nykyisten asetusten mukaan)",
    "delete": "Poista tiedosto",
    "remove": "Poista merkintä",
    "retagging": "Merkitään uudelleen …",
    "cue_title": "Kappalelista .cue-tiedostona MP3:n vieressä",
    "missing": "Tiedosto puuttuu",
    "missing_title": "Tiedostoa ei löytynyt tallennetusta paikasta (siirretty tai poistettu?)",
    "missing_chip": {
      "one": "{n} puuttuu",
      "other": "{n} puuttuu"
    },
    "missing_chip_title": "Näytä vain merkinnät, joiden tiedosto puuttuu",
    "stat_count": "Mixit",
    "stat_duration": "Kokonaiskesto",
    "stat_size": "Koko",
    "stat_genres": "Tyylilajin mukaan",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} mixi · {dur}",
      "other": "{n} mixiä · {dur}"
    },
    "empty_title": "Mitään ei ole vielä ladattu",
    "empty_text": "Jokainen mixi päätyy tänne heti, kun se on ladattu ja merkitty – kansikuvan, tyylilajin ja sijainnin kera.",
    "empty_discover": "Etsi mixejä",
    "empty_watchlist": "Ota seuranta käyttöön",
    "target_down": "Kohdekansio ei ole tavoitettavissa: {path}",
    "target_down_hint": "Tarkista asema tai verkkolevy. Kun se puuttuu, tiedostojen tila on tuntematon: ”Merkitse uudelleen” ja ”Poista merkintä” on poistettu käytöstä.",
    "unknown_title": "Kohdekansio ei ole tavoitettavissa – tiedoston tila on tuntematon",
    "none_title": "Ei tuloksia",
    "none_text": "Mikään merkintä ei vastaa hakua ja suodattimia.",
    "group_by": "Ryhmittele",
    "group_none": "Ei",
    "group_genre": "Tyylilaji",
    "group_festival": "Festivaali",
    "group_artist": "Artisti",
    "group_year": "Vuosi",
    "group_unknown": "Tuntematon",
    "continue": "Jatka kuuntelua",
    "continue_title": "Jatka setistä ”{title}” kohdasta {t}",
    "continue_left": "{t} jäljellä",
    "continue_forget": "Poista listalta ”Jatka kuuntelua”",
    "export": "M3U",
    "export_title": "Vie näkyvät M3U8-soittolistaksi",
    "export_continue": "Vie ”Jatka kuuntelua” soittolistaksi",
    "sections": "Kirjaston osiot"
  },
  "player": {
    "label": "Minisoitin",
    "play": "Toista (välilyönti)",
    "pause": "Tauko (välilyönti)",
    "back": "30 sekuntia taaksepäin",
    "fwd": "30 sekuntia eteenpäin",
    "prev": "Edellinen kappale",
    "next": "Seuraava kappale",
    "seek": "Kohta",
    "mute": "Mykistä",
    "unmute": "Poista mykistys",
    "volume": "Äänenvoimakkuus",
    "close": "Sulje soitin",
    "tracks": "Kappalelista",
    "tracks_n": {
      "one": "{n} kappale",
      "other": "{n} kappaletta"
    },
    "tracks_toggle": "Näytä/piilota kappalelista",
    "no_tracks": "Tässä tiedostossa ei ole lukuja",
    "total": "Kokonaiskesto {t}",
    "keys": "Välilyönti: toista/tauko · ←/→: 10 s",
    "err_load": "Ei voi toistaa",
    "err_src": "Ei voi toistaa: virheellinen tiedoston osoite",
    "err_play": "Tiedostoa ei voi toistaa: {title}",
    "external": "Avataan oletussoittimessa …",
    "norm_title": "Äänenvoimakkuus tasattu: {lufs} LUFS → tavoite {target} LUFS ({gain})",
    "norm_capped": "vain hiljennetty – vahvistus vaatii äänimoottorin",
    "norm_fallback": "Normalisointi: äänimoottori on tässä mykkä – toistetaan ilman sitä (vain hiljennys, ei vahvistusta)",
    "resume_q": "Jatketaanko siitä, mihin jäit?",
    "resume_at": "kohdassa {t}",
    "resume": "Jatka",
    "restart": "Alusta",
    "resumed_at": "Jatkettu kohdasta {t}",
    "sleep": "Uniajastin",
    "sleep_min": "{n} min",
    "sleep_end": "Tämän setin loppu",
    "sleep_end_short": "loppu",
    "sleep_off": "Poista käytöstä",
    "sleep_on": "Uniajastin: pysähtyy {t} kuluttua",
    "sleep_end_on": "Uniajastin: pysähtyy tämän setin lopussa",
    "sleep_done": "Uniajastin: toisto pysäytetty",
    "queue_pos": "{i}/{n}",
    "queue_title": "Toista kaikki · {label}: setti {i}/{n}"
  },
  "log": {
    "title": "Loki",
    "sub": "Reaaliaikainen loki ja ajohistoria",
    "live": "Reaaliaikainen loki",
    "history": "Ajohistoria",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Varoitus",
    "lvl_error": "Virhe",
    "lvl_title": "Näytä/piilota taso ”{lvl}”",
    "search": "Hae lokista …",
    "following": "Live",
    "paused": "Tauolla",
    "follow_title": "Vieritä automaattisesti uusimmalle riville (keskeytyy, kun vierität ylös)",
    "jump": "Siirry loppuun",
    "jump_new": {
      "one": "{n} uusi rivi",
      "other": "{n} uutta riviä"
    },
    "copy": "Kopioi",
    "copy_title": "Kopioi näkyvät rivit leikepöydälle",
    "open_logs": "Lokikansio",
    "open_logs_title": "Avaa kansio, jossa ovat täydelliset lokitiedostot",
    "lines": {
      "one": "{n} rivi",
      "other": "{n} riviä"
    },
    "lines_of": "{n} / {total} riviä",
    "empty": "Ei rivejä näille tasoille.",
    "empty_search": "Yksikään rivi ei sisällä ”{q}”.",
    "no_runs": "Ei vielä ajoja.",
    "no_runs_kind": "Ei tämän tyyppisiä ajoja.",
    "found": "löydetty",
    "downloaded": "ladattu",
    "errors": "virheitä",
    "running": "käynnissä …",
    "kind_all": "Kaikki",
    "timeline": "Aikajana",
    "table": "Taulukko",
    "view_title": "Ajohistorian näkymä",
    "col_kind": "Tyyppi",
    "col_start": "Alku",
    "col_duration": "Kesto",
    "col_found": "Löydetty",
    "col_downloaded": "Ladattu",
    "col_errors": "Virheet",
    "col_note": "Huomautus",
    "backoff": "Backoff",
    "runs_sum": {
      "one": "{n} ajo · {dl} ladattu · {err} virhettä",
      "other": "{n} ajoa · {dl} ladattu · {err} virhettä"
    },
    "today": "Tänään",
    "yesterday": "Eilen"
  },
  "settings": {
    "title": "Asetukset",
    "sub": "Kaikkea, mitä sovellus tekee, voi säätää täällä"
  },
  "tabs": {
    "general": "Yleiset",
    "filters": "Suodattimet ja avainsanat",
    "genres": "Tyylilajit",
    "download": "Lataus ja laatu",
    "storage": "Tallennus ja tunnisteet",
    "throttle": "Rajoitus",
    "soundcloud": "SoundCloud",
    "network": "Verkko ja PO-Token",
    "schedule": "Aikataulu",
    "appearance": "Ulkoasu",
    "maintenance": "Ylläpito",
    "festivals": "Festivaalit ja sarjat",
    "playback": "Toisto",
    "notifications": "Ilmoitukset",
    "mediaserver": "Mediapalvelin",
    "sources": "Lisää lähteitä",
    "reupload": "Uudelleenlataukset"
  },
  "tab_groups": {
    "app": "Sovellus",
    "find": "Haku ja järjestely",
    "download": "Lataus",
    "sources": "Lähteet ja palvelimet",
    "system": "Järjestelmä"
  },
  "tabs_hint": {
    "general": "Sovelluksen perustoiminta.",
    "filters": "Haun ja seurannan oletussuodattimet. Voidaan ohittaa väliaikaisesti kohdan ”Etsi” suodatinpaneelissa.",
    "genres": "Järjestys = tärkeysjärjestys. Ensimmäinen tyylilaji, jonka avainsana esiintyy nimessä, voittaa. Käsin asetetut tyylilajit ja lähteen oletustyylilaji ovat etusijalla.",
    "download": "YouTube toimittaa yleensä Opusta noin 130–160 kbit/s. MP3 on muunnos eikä kuulosta lähdettä paremmalta – mutta toimii kaikkialla.",
    "storage": "Minne tiedostot menevät ja miten ne nimetään. Rakenne on suunniteltu mediapalvelimille, kuten Plex tai Jellyfin.",
    "throttle": "Rajoittaa YouTubeen kohdistuvaa kuormitusta. Arvot koskevat hakua, seurantaa ja latauksia yhdessä. SoundCloudilla on omat arvot välilehdellä ”SoundCloud”. Mixcloudilla ja hearthis.atilla on omat arvonsa kohdassa ”Lisää lähteitä”.",
    "soundcloud": "SoundCloud toisena lähteenä haulle, seurannalle ja lataukselle – omilla rajoilla, laskureilla ja backoffilla, riippumatta YouTubesta.",
    "network": "PO-Token tunnistaa pyynnöt oikeaksi selaimeksi ja pienentää bottiestojen riskiä.",
    "schedule": "Milloin seuranta tarkistetaan automaattisesti – sovelluksessa ja Windowsin tehtävien ajoituksella.",
    "appearance": "Ulkoasu ja tuntuma. Muutokset esikatsellaan heti ja tulevat pysyviksi vasta tallennuksen jälkeen.",
    "maintenance": "Versiot, päivitykset, tietokanta.",
    "festivals": "Tunnistaa festivaalin tai sarjan, vuoden, lavan ja setin tyypin tallennetuista otsikoista – ilman verkkoa, ilman yhtäkään lisäpyyntöä.",
    "playback": "Sisäänrakennettu soitin, äänenvoimakkuuden tasaus, muistetut kohdat ja tiedostojesi offline-analyysi.",
    "notifications": "Windows-ilmoitukset uusista seteistä saapuneissa sekä valmiista tai epäonnistuneista latauksista – koottuna yhdeksi viestiksi, ei koskaan tulvana. Napsautus avaa sovelluksen oikeaan kohtaan.",
    "mediaserver": "Pyydä latausten jälkeen Plex- tai Jellyfin-palvelintasi skannaamaan kirjastonsa uudelleen – koottuna, vain kotiverkossa. Tunnus tallennetaan Windowsin tunnistetietojen hallintaan, ei koskaan config.yaml-tiedostoon.",
    "sources": "Mixcloud ja hearthis.at lisälähteinä hakuun, seurantalistaan ja latauksiin – kullakin omat rajat, laskurit ja tauko (backoff), YouTubesta ja SoundCloudista riippumatta.",
    "reupload": "Tunnistaa saman miksauksen, kun se on ladattu uudelleen (eri kanava, eri palvelu, uusi tunnus), tiiviin äänisormenjäljen avulla – lasketaan offline tiedostoistasi, ilman verkkoa."
  },
  "set": {
    "default": "Oletus",
    "range": "Vaihteluväli",
    "browse": "Selaa",
    "not_set": "ei asetettu",
    "saving": "Tallennetaan …",
    "discard": "Hylkää",
    "tab_reset": "Palauta välilehti",
    "tab_reset_title": "Palauta tämän välilehden kaikki kentät oletusarvoihin (tulee voimaan vasta ”Tallenna”-painalluksen jälkeen)",
    "state_clean": "Kaikki tallennettu",
    "state_dirty": {
      "one": "{n} tallentamaton muutos",
      "other": "{n} tallentamatonta muutosta"
    },
    "state_errors": {
      "one": "{n} virhe – korjaa",
      "other": "{n} virhettä – korjaa"
    },
    "h": {
      "collector": "Festivaalikeräilijä",
      "search": "Haku",
      "duration": "Kesto ja ajanjakso",
      "keywords": "Avainsanat",
      "display": "Näyttö",
      "cover": "Kansikuva",
      "chapters": "Luvut ja kappalelista",
      "tags": "Tunnisteet",
      "soundcloud": "SoundCloud",
      "playback": "Toisto",
      "pauses": "Tauot ja kaistanleveys",
      "limits": "Rajat",
      "backoff": "Backoff eston yhteydessä",
      "po": "PO-Token-toimittaja",
      "fallback": "Kiertotiet",
      "in_app": "Sovelluksessa",
      "task": "Windowsin tehtävien ajoitus",
      "updates": "Päivitykset",
      "app_update": "Sovelluksen päivitys",
      "release_notes": "Julkaisutiedot",
      "database": "Tietokanta",
      "reset": "Palautus",
      "detection": "Tunnistus",
      "series": "Sarjat",
      "backfill": "Lue kaikki (kerran)",
      "loudness": "Äänenvoimakkuus",
      "memory": "Muisti ja aaltomuoto",
      "analysis": "Analyysi (offline, ffmpeg)",
      "playlists": "Soittolistat (M3U8)",
      "notify_events": "Ilmoita",
      "quiet": "Hiljaiset tunnit",
      "ms_paths": "Polut ja ajoitus",
      "more_sources": "Mixcloud & hearthis.at",
      "fingerprint": "Sormenjälki"
    },
    "general": {
      "language": {
        "label": "Kieli",
        "help": "Käyttöliittymän ja ilmoitusten kieli. ”Automaattinen” seuraa Windowsin näyttökieltä (muuten englanti). Näkymä rakennetaan uudelleen heti tallennuksen jälkeen."
      },
      "start_view": {
        "label": "Aloitusnäkymä",
        "help": "Mikä näkymä avautuu käynnistyksen jälkeen."
      },
      "log_level": {
        "label": "Lokitaso",
        "help": "Kuinka yksityiskohtainen lokitiedosto ja reaaliaikainen loki ovat. DEBUG vain vianmääritykseen."
      },
      "confirm_delete": {
        "label": "Vahvista poisto",
        "help": "Kysy ennen kuin mixi poistetaan kirjastosta (merkintä + tiedosto)."
      }
    },
    "player": {
      "mode": {
        "label": "Toistotapa",
        "help": "Mitä kirjaston ▶ käyttää. Sisäänrakennettu soitin näyttää luvut hyppymerkkeinä ja jatkaa toistoa, kun vaihdat näkymää. Toinen vaihtoehto on valittavissa merkintäkohtaisesti valikosta."
      },
      "normalize": {
        "label": "Tasaa äänenvoimakkuus",
        "help": "Soittaa jokaisen setin samalla koetulla voimakkuudella (ReplayGain offline-analyysistä tai olemassa olevista tunnisteista). Ei koskaan säröydy: vahvistusta rajoittaa mitattu true peak."
      },
      "target_lufs": {
        "label": "Tavoitevoimakkuus",
        "help": "−18 LUFS on ReplayGain 2.0 -viitearvo. Korkeampi (esim. −14) = kovempi, mutta useampi setti osuu huippurajaansa."
      },
      "resume": {
        "label": "Muista kohta",
        "help": "Setti kerrallaan, ensimmäisten ja viimeisten 30 sekunnin ulkopuolella. ”Kysy” tarjoaa jatkamista, ”Automaattinen” jatkaa hiljaa. Kirjasto näyttää viisi viimeisintä keskeneräistä settiä."
      },
      "waveform": {
        "label": "Aaltomuoto aikajanana",
        "help": "Näyttää setin aaltomuotona tracklistin merkinnöillä. Lasketaan kerran tiedostoa kohden ffmpegillä (ensimmäisellä toistolla tai analyysissä); muuten tavallinen palkki."
      }
    },
    "search": {
      "results_count": {
        "label": "Tuloksia hakua kohti",
        "help": "Kuinka monta tulosta haku hakee (kevyt kysely). Enemmän tuloksia = enemmän kuormitusta YouTubelle."
      },
      "append_year": {
        "label": "Lisää vuosi hakuun",
        "help": "Lisäysajanjaksolla ”Tietty vuosi” vuosi lisätään hakusanaan (esim. ”hardcore liveset 2013”). Näin YouTube löytää enemmän kyseisen vuoden mixejä."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Vähimmäiskesto",
        "help": "Lyhyempiä videoita ei koskaan pidetä mixinä."
      },
      "max_duration": {
        "label": "Enimmäiskesto",
        "help": "0 = rajaton."
      },
      "upload_period": {
        "label": "Lisäysajanjakso",
        "help": "Mitkä lisäykset näytetään oletuksena. ”Tietty vuosi” näyttää vain yhden vuoden mixit, ”Mukautettu” alkamis–päättymisvälin."
      },
      "upload_year": {
        "label": "Vuosi",
        "help": "Mixi kelpaa, jos lisäysvuosi täsmää tai vuosi on nimessä. YouTube-haku antaa vain likimääräisen päivämäärän – siinä sallitaan ±1 vuosi."
      },
      "upload_from": {
        "label": "Alkaen",
        "help": "Aikaisin lisäyspäivä. Tyhjä = avoin."
      },
      "upload_to": {
        "label": "Päättyen",
        "help": "Myöhäisin lisäyspäivä. Tyhjä = avoin. Likimääräisissä päivämäärissä sallitaan ±1 vuoden poikkeama molemmissa päissä."
      },
      "include_keywords": {
        "label": "Sisällytettävät avainsanat",
        "help": "Vähintään yhden on oltava nimessä. Tyhjä = kaikki sallittu. Enter tai pilkku lisää."
      },
      "exclude_keywords": {
        "label": "Pois suljettavat avainsanat",
        "help": "Jos jokin niistä on nimessä, video hylätään."
      },
      "match_description": {
        "label": "Hae kuvauksesta",
        "help": "Tarkista avainsanat myös videon kuvauksesta. Kevyet kyselyt eivät usein palauta sitä."
      },
      "hide_done_ignored": {
        "label": "Piilota ladatut ja ohitetut",
        "help": "Piilota jo ladatut ja ohitetut videot tuloksista."
      },
      "apply_channel_blacklist": {
        "label": "Käytä kanavien estolistaa",
        "help": "Älä koskaan näytä estettyjen kanavien videoita."
      },
      "hide_cross_platform_duplicates": {
        "label": "Piilota alustojen väliset kaksoiskappaleet",
        "help": "Piilota osumat, jotka on luultavasti jo ladattu tai laitettu jonoon toiselta alustalta (YouTube tai SoundCloud) – sama kesto (±5 s) ja hyvin samankaltainen nimi. Pois: ne näytetään huomautuksella ”Luultavasti jo ladattu”."
      }
    },
    "blacklist": {
      "label": "Estetyt kanavat",
      "help": "Estät kanavia kortin valikosta. Täällä voit poistaa eston.",
      "none": "Ei estettyjä kanavia",
      "unblock": "Poista esto"
    },
    "genres": {
      "add": "Tyylilaji",
      "up": "Korkeampi tärkeys",
      "down": "Matalampi tärkeys",
      "delete": "Poista tyylilaji",
      "color": "Valitse väri",
      "name_ph": "Nimi",
      "kw_ph": "+ avainsana",
      "fallback": "Varatyylilaji – käytössä, kun mikään avainsana ei täsmää. On aina olemassa, aina viimeisenä."
    },
    "download": {
      "audio_format": {
        "label": "Tulostusmuoto",
        "help": "MP3 tai YouTuben alkuperäinen ilman muunnosta."
      },
      "mp3_quality": {
        "label": "MP3-laatu",
        "help": "320 kbit/s CBR on yhteensopivin, V0 VBR säästää hieman tilaa."
      },
      "embed_cover": {
        "label": "Upota kansikuva",
        "help": "Kirjoita pikkukuva neliöksi rajattuna tiedostoon kansikuvaksi."
      },
      "write_cover_jpg": {
        "label": "Tallenna myös cover.jpg",
        "help": "Mediapalvelimille, jotka lukevat kansiokansikuvia."
      },
      "write_cue": {
        "label": "Kirjoita .cue-tiedosto",
        "help": "Kappalelista luvuista tai kuvauksen aikaleimoista äänitiedoston viereen."
      },
      "write_id3_chapters": {
        "label": "Kirjoita ID3-luvut",
        "help": "Upota lukumerkit (CHAP/CTOC) suoraan MP3-tiedostoon."
      },
      "keep_original_soundcloud": {
        "label": "Säilytä SoundCloud-alkuperäinen",
        "help": "Tallenna SoundCloud-ääni muuttamattomana (AAC 160 kbit/s .m4a-tiedostona, MP3 128 kbit/s .mp3-tiedostona) – ei toista häviöllistä muunnosta. Pois: kuten ”Tulostusmuoto”."
      },
      "keep_original_mixcloud": {
        "label": "Säilytä Mixcloud-alkuperäinen",
        "help": "Tallenna Mixcloud-ääni muuttamattomana (AAC, yleensä 64–128 kbps, .m4a-tiedostona) – ei toista häviöllistä muunnosta. Pois: kuten ”Tulostemuoto”."
      },
      "keep_original_hearthis": {
        "label": "Säilytä hearthis.at-alkuperäinen",
        "help": "Tallenna hearthis.at-virta muuttamattomana (MP3) – ei toista häviöllistä muunnosta. Pois: kuten ”Tulostemuoto”."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Kohdekansio",
        "help": "Musiikkivaraston juuri. Väliaikaiset tiedostot säilytetään sen alla kansiossa ”.tmp”. Kannettavassa versiossa suhteellinen polku, kuten ”.\\Music”, tulkitaan suhteessa sovelluskansioon (esim. USB-tikulla)."
      },
      "path_template": {
        "label": "Polkumalli",
        "help": "Suhteessa kohdekansioon, ilman tiedostopäätettä. ”/” erottaa kansiot. {id} on pakollinen (SoundCloudilla ”sc-<id>”). {platform} muuttuu muotoon ”YouTube” tai ”SoundCloud” – esim. ylimmäksi kansioksi lähteiden erottamiseksi."
      },
      "max_title_length": {
        "label": "Nimen enimmäispituus",
        "help": "Pidemmät nimet lyhennetään tiedostonimessä."
      },
      "max_path_length": {
        "label": "Polun enimmäispituus",
        "help": "Koko polku kohdekansio mukaan lukien. Ilman lisäasetuksia Windows sallii 259 merkkiä."
      },
      "artist_from_title": {
        "label": "Lue esittäjä nimestä",
        "help": "Tunnista mallit ”ESITTÄJÄ @ TAPAHTUMA” ja ”ESITTÄJÄ - NIMI”, muuten käytetään kanavan nimeä."
      },
      "title_cleanup_patterns": {
        "label": "Siivoa nimi",
        "help": "Säännölliset lausekkeet, joiden osumat poistetaan nimestä. Enter lisää.",
        "ph": "+ regex"
      },
      "album_from_edition": {
        "label": "Albumi = tapahtuma",
        "help": "Kirjoittaa tapahtuman (esim. ”Defqon.1 2024”) albumitunnisteeksi, jolloin Plex ja Jellyfin näyttävät festivaalin kaikki setit yhtenä albumina. Pois: albumi = otsikko, kuten ennen."
      }
    },
    "path_preview": {
      "label": "Esikatselu",
      "help": "Napsauta paikkamerkkejä lisätäksesi ne polkumalliin.",
      "fest": "{festival}, {event_year} ja {stage} täytetään vain, kun festivaali on kohdistettu. Muuten ne jäävät pois ylimääräisten erottimien ja tyhjien kansioiden kanssa."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Tauko pyyntöjen välillä",
        "help": "Odotusaika metatietokyselyiden välillä (haku, seuranta)."
      },
      "sleep_interval": {
        "label": "Latauksen tauko – vähintään",
        "help": "Jokaisen latauksen jälkeen tulee satunnainen tauko vähimmäis- ja enimmäisarvon väliltä."
      },
      "max_sleep_interval": {
        "label": "Latauksen tauko – enintään",
        "help": "Satunnaisen tauon yläraja."
      },
      "limit_rate_mb": {
        "label": "Latausnopeus",
        "help": "Suurin kaistanleveys. 0 = rajaton (ei suositella)."
      },
      "max_downloads_per_run": {
        "label": "Latauksia enintään ajoa kohti",
        "help": "Loput jäävät jonoon."
      },
      "max_downloads_per_day": {
        "label": "Latauksia enintään päivässä",
        "help": "Laskuri kattaa käsin ja automaattisesti tehdyt lataukset yhdessä."
      },
      "max_searches_per_hour": {
        "label": "Hakuja enintään tunnissa",
        "help": "Suojaa vahingossa tapahtuvalta taukoamattomalta haulta."
      },
      "backoff_initial_hours": {
        "label": "Backoff – alkuarvo",
        "help": "Eston kesto HTTP 429:n tai ”vahvista, ettet ole robotti” -ilmoituksen jälkeen."
      },
      "backoff_max_hours": {
        "label": "Backoff – enimmäisarvo",
        "help": "Eston kesto kaksinkertaistuu jokaisen uuden eston jälkeen tähän arvoon asti."
      }
    },
    "backoff": {
      "none": "Ei aktiivista backoffia ({p})",
      "none_detail": "Haku, seuranta ja lataukset palvelusta {p} ovat sallittuja.",
      "active": "Backoff aktiivinen ({p})",
      "active_detail": "asti {t} · {rest} jäljellä · taso {level}",
      "blocked": "{p} ilmoitti eston. Haku, seuranta ja lataukset palvelusta {p} on estetty, kunnes aika on kulunut.",
      "clear": "Poista käsin",
      "sc_off": "SoundCloud on pois päältä",
      "sc_off_detail": "Ei SoundCloud-hakua, ei seurannan tarkistuksia eikä latauksia SoundCloudista.",
      "p_off": "{p} on pois päältä",
      "p_off_detail": "Ei {p}-hakua, ei seurannan tarkistuksia eikä latauksia palvelusta {p}."
    },
    "soundcloud": {
      "enabled": {
        "label": "Käytä SoundCloudia",
        "help": "Pois: ei SoundCloud-hakua, ei SoundCloud-lähteiden tarkistuksia eikä SoundCloud-latauksia. Jo ladatut merkinnät pysyvät kirjastossa."
      },
      "sleep_requests": {
        "label": "Tauko pyyntöjen välillä",
        "help": "Odotusaika SoundCloudiin kohdistuvien metatietokyselyiden välillä (haku, seuranta)."
      },
      "sleep_interval": {
        "label": "Latauksen tauko – vähintään",
        "help": "Jokaisen SoundCloud-latauksen jälkeen tulee satunnainen tauko vähimmäis- ja enimmäisarvon väliltä."
      },
      "max_sleep_interval": {
        "label": "Latauksen tauko – enintään",
        "help": "Satunnaisen tauon yläraja."
      },
      "limit_rate_mb": {
        "label": "Latausnopeus",
        "help": "Suurin kaistanleveys. 0 = rajaton (ei suositella)."
      },
      "max_downloads_per_run": {
        "label": "Latauksia enintään ajoa kohti",
        "help": "SoundCloudin oma laskuri. Loput jäävät jonoon."
      },
      "max_downloads_per_day": {
        "label": "Latauksia enintään päivässä",
        "help": "SoundCloudin oma laskuri, käsin ja automaattisesti tehdyt lataukset yhdessä."
      },
      "max_searches_per_hour": {
        "label": "Hakuja enintään tunnissa",
        "help": "SoundCloudin oma laskuri."
      },
      "backoff_initial_hours": {
        "label": "Backoff – alkuarvo",
        "help": "Eston kesto sen jälkeen, kun SoundCloud ilmoitti liian monesta pyynnöstä (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – enimmäisarvo",
        "help": "Eston kesto kaksinkertaistuu jokaisen uuden eston jälkeen tähän arvoon asti."
      }
    },
    "ladder": {
      "label": "Tasot",
      "help": "Miten eston kesto kasvaa nykyisillä arvoilla.",
      "reset": "Nollautuu onnistuneen ajon jälkeen",
      "invalid": "Virheelliset arvot"
    },
    "network": {
      "po_token_mode": {
        "label": "Tila",
        "help": "bgutil-lisäosa yt-dlp:lle. Skripti käynnistää Denon tarvittaessa, HTTP pitää paikallista palvelinta käynnissä."
      },
      "po_token_port": {
        "label": "HTTP-portti",
        "help": "Vain HTTP-tilassa. Palvelin kuuntelee osoitteessa 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Tokenin voimassaoloaika",
        "help": "Tämän ajan jälkeen luodaan uusi token. Arvo pyöristetään täysiin tunteihin (vähintään 1 h)."
      },
      "cookies_from_browser": {
        "label": "Evästeet selaimesta",
        "help": "Kirjaa yt-dlp:n sisään selaimesi kirjautumisella. Ota käyttöön vain, jos se ei enää toimi ilman."
      },
      "proxy": {
        "label": "Välityspalvelin",
        "help": "Valinnainen, esim. socks5://127.0.0.1:1080. Tyhjä = suora yhteys.",
        "ph": "ei välityspalvelinta"
      }
    },
    "po": {
      "active": "PO-Token aktiivinen",
      "inactive": "PO-Token ei aktiivinen",
      "error": "PO-Token-virhe",
      "mode": "Tila",
      "test": "Testaa",
      "testing": "Testataan …",
      "test_ok": "Testi onnistui.",
      "test_fail": "Testi epäonnistui.",
      "unsaved": "Testi käyttää tallennettuja asetuksia. Tallenna ensin muutoksesi."
    },
    "cookies": {
      "warn_off": "<b>Suositus: pois.</b> PO-Token ja selaimen evästeet yhdessä voivat aiheuttaa ongelmia.",
      "warn_on": "<b>Kiertotie käytössä.</b> PO-Token ja selaimen evästeet yhdessä voivat johtaa virheisiin tai estoihin, ja pyynnöissä käytetään YouTube-tiliäsi. Poista se käytöstä heti, kun kaikki toimii ilman. Evästeet eivät koskaan päädy lokiin."
    },
    "schedule": {
      "in_app_check": {
        "label": "Tarkista, kun sovellus on käynnissä",
        "help": "Seuranta tarkistetaan asetetulla välillä, kun ikkuna on auki."
      },
      "watchlist_interval_hours": {
        "label": "Väli",
        "help": "Aika kahden tarkistuksen välillä sovelluksessa."
      },
      "entries_per_source": {
        "label": "Merkintöjä lähdettä kohti",
        "help": "Kuinka monta uusinta merkintää haetaan (kevyt kysely) tarkistusta kohti (uusien lähteiden oletus)."
      },
      "task_scheduler_enabled": {
        "label": "Käytä tehtävien ajoitusta",
        "help": "Tarkistaa seurannan myös silloin, kun sovellus on suljettu (headless). Otetaan käyttöön toiminnolla ”Luo tehtävä”."
      },
      "task_time": {
        "label": "Aika",
        "help": "Ajastetun tehtävän päivittäinen aloitusaika."
      }
    },
    "next": {
      "title": "Seuraava tarkistus",
      "off": "Ei automaattista tarkistusta",
      "off_detail": "Sekä sovelluksen tarkistus että Windows-tehtävä ovat pois käytöstä. Seuranta tarkistetaan vain käsin.",
      "app_detail": "Sovelluksessa {h} h välein – kun HCLoader on käynnissä.",
      "task_detail": "Windowsin tehtävien ajoituksella päivittäin klo {time} – myös kun sovellus on suljettu.",
      "any_detail": "Aikaisempi sovelluksen välistä ja Windows-tehtävästä.",
      "also_task": "Lisäksi: Windows-tehtävä päivittäin klo {time}.",
      "also_app": "Lisäksi sovelluksessa {h} h välein.",
      "pending": "Ei vielä ajastettu",
      "pending_detail": "Sovellus asettaa seuraavan ajankohdan heti, kun se on tarkistanut seurannan ensimmäisen kerran.",
      "due": "Erääntynyt – alkaa pian",
      "backoff": "<b>Backoff aktiivinen.</b> Ei tarkistuksia ennen {t}; ajankohta korvataan tai ohitetaan sen jälkeen.",
      "unsaved": "Tallentamattomat aikataulumuutokset tulevat voimaan vasta tallennuksen jälkeen."
    },
    "task": {
      "loading": "Kysytään tehtävää …",
      "registered": "Tehtävä rekisteröity",
      "registered_detail": "{name} · päivittäin {time} · seuraava ajo {next}",
      "none": "Tehtävää ei ole rekisteröity",
      "none_detail": "Luo päivittäisen Windows-tehtävän klo {time} (schtasks).",
      "create": "Luo tehtävä",
      "remove": "Poista tehtävä",
      "moved": "Sovellus on siirretty – luo tehtävä uudelleen",
      "moved_detail": "Ajastettu tehtävä käynnistää edelleen {cmd}. Uudelleen luotaessa käytetään nykyistä sovelluskansiota.",
      "recreate": "Luo tehtävä uudelleen",
      "unknown": "Tehtävän tila on tuntematon",
      "unknown_detail": "Windowsin tehtävien ajoitus ei vastannut. Asetus pysyy ennallaan.",
      "recheck": "Tarkista uudelleen"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Vähennä tehosteita",
        "help": "Poistaa käytöstä skannausviivat, glitchin ja kaikki animaatiot."
      },
      "scanlines": {
        "label": "Skannausviivat ja kohina",
        "help": "Hieno kerros koko käyttöliittymän päällä."
      },
      "pulse_bpm": {
        "label": "Bassorumpupulssi",
        "help": "Tahti, jolla edistymispalkki sykkii."
      }
    },
    "pulse_preview": {
      "label": "Esikatselu",
      "help": "Näin käynnissä oleva lataus sykkii.",
      "off": "Tehosteita vähennetty"
    },
    "versions": {
      "plugin": "PO-Token-lisäosa",
      "was": "aiemmin {v}"
    },
    "update": {
      "label": "yt-dlp ja lisäosa",
      "help": "YouTube muuttuu jatkuvasti. Jos ilmenee virheitä, päivitä ensin (pip venvissä).",
      "button": "Päivitä yt-dlp ja lisäosa",
      "running": "Päivitetään …",
      "last_check": "Viimeisin tarkistus",
      "restart": "<b>Uudelleenkäynnistys tarvitaan.</b> yt-dlp päivitettiin. Haku ja lataukset on estetty, kunnes HCLoader käynnistetään uudelleen; jono säilyy.",
      "restart_title": "Uudelleenkäynnistys tarvitaan",
      "restart_text": "yt-dlp päivitettiin. Sulje ja käynnistä HCLoader uudelleen – siihen asti haku ja lataukset on estetty, jono säilyy.",
      "out_live": "Tuloste · käynnissä {t}",
      "out_done": "Tuloste · valmis {t} jälkeen",
      "out_failed": "Tuloste · epäonnistui",
      "out_last": "Tuloste",
      "waiting": "Käynnistetään pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Tarkista päivitykset käynnistyksessä",
        "help": "yt-dlp ja PO-Token-lisäosa, enintään kerran päivässä."
      },
      "check_app_updates_on_start": {
        "label": "Tarkista HCLoader-päivitykset käynnistyksessä",
        "help": "Kysyy GitHubilta kerran käynnistystä kohti uutta versiota. Mitään ei ladata, ennen kuin napsautat."
      },
      "apply_update_on_exit": {
        "label": "Asenna päivitys suljettaessa",
        "help": "Ladattu päivitys asennetaan, kun HCLoader suljetaan (”Myöhemmin”). Pois: se tarjotaan uudelleen seuraavassa käynnistyksessä."
      },
      "update_repo": {
        "label": "Päivityslähde (GitHub)",
        "help": "Repo muodossa ”omistaja/repo”. Muuta vain forkeille."
      }
    },
    "db": {
      "label": "Tietokanta",
      "help": "Kaikkien videoiden, lähteiden ja ajojen tila. Varmuuskopio kopioi tiedoston kansioon ”backups”.",
      "backup": "Luo tietokannan varmuuskopio",
      "backing_up": "Varmuuskopioidaan …",
      "open": "Tietokansio",
      "open_logs": "Lokikansio",
      "open_title": "Avaa kansio, jossa ovat tietokanta, asetukset ja varmuuskopiot",
      "open_logs_title": "Avaa kansio, jossa ovat lokitiedostot",
      "info": {
        "one": "{n} merkintä · {mb} MB",
        "other": "{n} merkintää · {mb} MB"
      },
      "last": "Viimeisin varmuuskopio",
      "never": "ei vielä",
      "keep": "10 uusinta varmuuskopiota säilytetään, vanhemmat poistetaan seuraavan varmuuskopion yhteydessä.",
      "backups": "Varmuuskopiot",
      "backups_more": "+ {n} vanhempaa kansiossa ”backups”",
      "fresh": "uusi"
    },
    "reset_all": {
      "label": "Kaikki asetukset",
      "help": "Palauttaa kaikki välilehdet oletusarvoihin. Tietokantaan ja musiikkitiedostoihin ei kosketa.",
      "button": "Palauta kaikki"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Hakuja tunnissa",
        "help": "”Etsi puuttuvat setit” jakaa haut tasaisesti (10 = yksi 6 min välein). Lisäksi voimassa on yleinen tuntikohtainen hakuraja."
      },
      "collector_results_per_search": {
        "label": "Tuloksia hakua kohden",
        "help": "Kuinka monta tulosta yksi puuttuvan setin haku käy läpi (yksi pyyntö hakua kohden)."
      },
      "collector_auto_confirm": {
        "label": "Vahvista automaattisesti alkaen",
        "help": "Tästä varmuudesta alkaen osuma kelpaa ilman vahvistustasi – vain jos otsikossa ovat DJ, festivaali ja vuosi. Kaikki sen alle jäävä odottaa napsautusta."
      },
      "detect": {
        "label": "Tunnista automaattisesti",
        "help": "Kohdistaa festivaalin tai sarjan, vuoden, lavan ja setin tyypin uusiin osumiin ja latauksiin. Käsin asetettuja arvoja ei koskaan korvata."
      },
      "min_confidence": {
        "label": "Tunnistuskynnys",
        "help": "Varmuus, josta alkaen osuma kohdistetaan. Sen alapuolella osuma näkyy vain ehdotuksena, jonka voit hyväksyä."
      },
      "year_from_upload_date": {
        "label": "Vuosi latauspäivästä",
        "help": "Jos otsikossa ei ole vuosilukua, käytetään julkaisuvuotta (lasketaan epävarmemmaksi)."
      },
      "match_description": {
        "label": "Hae myös kuvauksesta",
        "help": "Etsii festivaalien nimiä myös tallennetusta kuvauksesta."
      },
      "extra_stages": {
        "label": "Lisälavat",
        "help": "Lavojen nimet sisäänrakennettujen lisäksi (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ lava"
      }
    },
    "fest_types": {
      "label": "Omat termit settityypeille",
      "help": "Otsikon sanat, jotka viittaavat setin tyyppiin. Ne tarkistetaan ennen sisäänrakennettuja termejä.",
      "ph": "Termi otsikossa",
      "add": "Termi"
    },
    "fest_test": {
      "label": "Testaa otsikko",
      "help": "Näyttää, mitä tunnistus löytää otsikosta. Mitään ei tallenneta; tallennetut asetukset ovat voimassa.",
      "ph": "esim. Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Mitään ei tunnistettu",
      "assigned": "kohdistettaisiin",
      "suggested": "vain ehdotus"
    },
    "fest_status": {
      "title": "{assigned} / {total} mixiä kohdistettu",
      "last": "Viimeisin ajo",
      "help": "Ajetaan ilman verkkoa nykyiselle kirjastolle. Käsin asetetut arvot säilyvät; tiedostoja ei merkitä uudelleen eikä siirretä.",
      "button": "Kohdista festivaalit nyt",
      "running": "Kohdistetaan … {done} / {total}"
    },
    "series": {
      "hint": "Tunnetut festivaalit, radio-ohjelmat ja podcastit. Luettelon muutokset tallennetaan heti.",
      "add": "Sarja",
      "show_hidden": "Näytä piilotetut",
      "reset_all": "Palauta sisäänrakennetut sarjat",
      "builtin": "sisäänrakennettu",
      "own": "oma",
      "modified": "muokattu",
      "hidden": "piilotettu",
      "no_aliases": "ei aliaksia",
      "enable": "Tunnista tämä sarja",
      "hide": "Piilota",
      "restore": "Palauta",
      "new_title": "Uusi sarja",
      "edit_title": "Muokkaa sarjaa",
      "name": "Nimi",
      "kind": "Laji",
      "default_genre": "Oletustyylilaji",
      "aliases": "Aliakset",
      "aliases_help": "Muut kirjoitusasut. Yksi osuma otsikossa riittää.",
      "weak_aliases": "Heikot aliakset",
      "weak_help": "Arkiset sanat, jotka lasketaan vain vuosiluvun kanssa.",
      "variants": "Versiot",
      "variants_help": "Omat tapahtumansa, esim. Australia tai at Home.",
      "channels": "Järjestäjän kanavat",
      "channels_help": "Kanavan nimi, tunnus tai URL. Lisää vain varmuutta."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Kohteita enintään lähdettä kohden",
        "help": "”Lue kaikki (kerran)” seurantalistassa lukee kanavasta tai soittolistasta enintään näin monta kohdetta."
      },
      "backfill_requests_per_hour": {
        "label": "Pyyntöjä tunnissa",
        "help": "”Lue kaikki” -toiminnon sivupyynnöt jaetaan tasaisesti (120 = yksi 30 s välein); tavallinen väli ja backoff pätevät myös. Ajastettu ajo (Tehtävien ajoitus) jatkaa enintään näin monella pyynnöllä."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Analysoi jokaisen latauksen jälkeen",
        "help": "Mittaa äänenvoimakkuuden (EBU R128) ja laskee aaltomuodon heti latauksen jälkeen – offline, matalalla prioriteetilla, tiedosto kerrallaan."
      },
      "write_tags": {
        "label": "Kirjoita ReplayGain-tunnisteet",
        "help": "Kirjoittaa REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) tai R128_TRACK_GAIN (Opus) tiedostoon, jotta muutkin soittimet voivat käyttää sitä. Ääntä ei koskaan koodata uudelleen."
      },
      "waveforms": {
        "label": "Laske aaltomuodot etukäteen",
        "help": "Laskee aaltomuodot myös analyysin aikana. Pois: vasta kun setti soitetaan ensimmäistä kertaa."
      }
    },
    "analysis": {
      "title": "{done}/{total} tiedostoa analysoitu",
      "counts": "{tagged} tunnisteella · {waves} aaltomuotoa · {failed} epäonnistui",
      "help": "Toimii offline koko kirjastolle, tiedosto kerrallaan matalalla prioriteetilla – ei verkkoa, ääni pysyy koskemattomana. Voidaan keskeyttää milloin tahansa.",
      "button": "Analysoi uudet tiedostot",
      "button_n": "Analysoi {n} uutta",
      "all": "Analysoi kaikki uudelleen",
      "all_title": "Mittaa jokainen tiedosto uudelleen (esim. kun tiedostoja on vaihdettu sovelluksen ulkopuolella)",
      "running": "Analysoidaan … {done} / {total}",
      "no_ffmpeg_title": "ffmpeg puuttuu",
      "no_ffmpeg": "Äänenvoimakkuus ja aaltomuodot tarvitsevat ffmpegin (bin\\ffmpeg.exe, asennetaan setup.ps1:llä). Asetukset › Ylläpito näyttää tilan."
    },
    "playlists": {
      "folder": {
        "label": "Soittolistakansio",
        "help": "Tänne tallennetaan viedyt soittolistat. Tyhjä = ”Playlists” kohdekansiossa.",
        "ph": "”Playlists” kohdekansiossa"
      },
      "relative_paths": {
        "label": "Suhteelliset polut",
        "help": "Merkinnät suhteessa soittolistaan, jotta se toimii, vaikka musiikkikansio siirtyisi (esim. USB-tikulle). Toisen aseman tiedostot saavat aina täyden polun."
      },
      "sync_after_download": {
        "label": "Päivitä tallennetut soittolistat latausten jälkeen",
        "help": "”Pidä ajan tasalla” -valinnalla viedyt soittolistat kirjoitetaan uudelleen jokaisen latauksen jälkeen – vain paikallisesti, ei verkkoa."
      }
    },
    "playlists_saved": {
      "label": "Tallennetut soittolistat",
      "help": "Jokainen vienti muistetaan tässä. ”Pidä ajan tasalla” kirjoittaa sen uudelleen latausten jälkeen.",
      "none": "Soittolistoja ei ole vielä viety – käytä ”M3U”-painiketta kirjastossa, DJ-sivulla tai tarkistuslistassa.",
      "gone": "tiedosto puuttuu",
      "sync": "Pidä ajan tasalla",
      "sync_title": "Kirjoita tämä soittolista uudelleen latausten jälkeen",
      "forget": "Poista listasta (tiedosto jää)",
      "now": "Päivitä nyt"
    },
    "notifications": {
      "enabled": {
        "label": "Windows-ilmoitukset",
        "help": "Näytä ilmoitus Windowsin ilmoituskeskuksessa – myös ajastetun tarkistuksen jälkeen, kun sovellus on suljettu."
      },
      "new_sets": {
        "label": "Uudet setit saapuneissa",
        "help": "Seurantalistan tarkistus (sovelluksessa tai ajastettu) löysi uusia settejä."
      },
      "downloads_done": {
        "label": "Lataukset valmiit",
        "help": "Yksi viesti latauskierrosta kohden settien määrän ja nimien kera."
      },
      "downloads_failed": {
        "label": "Lataukset epäonnistuivat",
        "help": "Yksi viesti kierrosta kohden, jos lataus epäonnistui. Tiedot löytyvät kohdasta Lataukset."
      },
      "quiet_hours": {
        "label": "Hiljaiset tunnit",
        "help": "Ei ilmoituksia tänä aikana. Tapahtumat näytetään sen jälkeen yhtenä yhteenvetona."
      },
      "quiet_from": {
        "label": "Alkaen",
        "help": "Hiljaisten tuntien alku (24 h)."
      },
      "quiet_to": {
        "label": "Asti",
        "help": "Hiljaisten tuntien loppu. Aiemmin kuin alku = yli keskiyön (esim. 22:00–07:00)."
      }
    },
    "notify": {
      "on": "Ilmoitukset päällä",
      "off": "Ilmoitukset pois",
      "detail": "Näytetään {backend} kautta. Useat peräkkäiset tapahtumat yhdistetään yhdeksi ilmoitukseksi.",
      "backend_powershell": "Windows PowerShellin (sisältyy Windowsiin)",
      "backend_winrt": "Windowsin ilmoitusrajapinnan (pywinrt)",
      "test": "Lähetä testi",
      "testing": "Lähetetään …",
      "test_sent": "Testi-ilmoitus lähetetty – katso näytön oikeaa alakulmaa.",
      "unavailable": "Windows-ilmoitukset eivät ole käytettävissä",
      "unavailable_detail": "Tämä järjestelmä ei voi näyttää niitä (Windows PowerShell puuttuu tai on estetty). Tapahtumat kirjataan vain lokiin."
    },
    "media_server": {
      "type": {
        "label": "Mediapalvelin",
        "help": "Mikä palvelin skannaa kirjastonsa uudelleen latausten jälkeen. Pois = HCLoader ei ota yhteyttä mihinkään mediapalvelimeen."
      },
      "url": {
        "label": "Palvelimen osoite",
        "help": "Osoite kotiverkossa, esim. http://192.168.1.10:32400 (Plex) tai http://nas:8096 (Jellyfin). Vain tähän osoitteeseen otetaan yhteyttä.",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "Kansio palvelimella",
        "help": "Missä palvelin näkee kohdekansiosi (NAS, Docker), esim. /data/music/HCLoader. Tyhjä = sama polku kuin täällä. Tarvitaan, jotta vain uudet kansiot skannataan.",
        "ph": "sama polku kuin kohdekansio"
      },
      "delay_seconds": {
        "label": "Odota ennen skannausta",
        "help": "Odota viimeisimmän latauksen jälkeen näin kauan – useasta latauksesta tulee silloin yksi skannaus."
      },
      "verify_tls": {
        "label": "Tarkista varmenne",
        "help": "https://-osoitteille. Poista käytöstä vain itse allekirjoitetulla varmenteella kotiverkossa."
      }
    },
    "ms": {
      "off": "Ei mediapalvelinta",
      "off_detail": "Valitse alta Plex tai Jellyfin, niin sen kirjasto skannataan uudelleen latausten jälkeen.",
      "unsaved": "Tallentamattomia muutoksia – skannaus käyttää tallennettuja asetuksia.",
      "on": "{server} päivitetään latausten jälkeen",
      "last_ok": "Viimeisin skannaus {t} ({n} uutta tiedostoa)",
      "last_fail": "Viimeisin skannaus {t} epäonnistui",
      "never": "Ei vielä skannausta",
      "all_libraries": "Kaikki kirjastot",
      "no_secret": "Tunnusta / API-avainta ei ole vielä tallennettu – anna se alla ja testaa yhteys.",
      "scan_now": "Skannaa nyt",
      "scanning": "Pyydetään …",
      "scan_sent": "Skannausta pyydetty – palvelin lukee kirjaston taustalla.",
      "secret_plex": {
        "label": "Plex-tunnus",
        "help": "X-Plex-Token (Plex Web › mikä tahansa kohde › Tiedot › Näytä XML: ”X-Plex-Token=” osoitteessa). Tallennetaan Windowsin tunnistetietojen hallintaan onnistuneen testin jälkeen – ei koskaan config.yaml-tiedostoon tai lokiin."
      },
      "secret_jellyfin": {
        "label": "Jellyfin-API-avain",
        "help": "Hallintapaneeli › API-avaimet › ”+”. Tallennetaan Windowsin tunnistetietojen hallintaan onnistuneen testin jälkeen – ei koskaan config.yaml-tiedostoon tai lokiin."
      },
      "secret_ph": "liitä tähän",
      "secret_kept": "tallennettu – jätä tyhjäksi säilyttääksesi",
      "stored_short": "tallennettu",
      "stored_title": "Tallennettu Windowsin tunnistetietojen hallintaan",
      "forget": "Poista",
      "forgotten": "Tunnus poistettu Windowsin tunnistetietojen hallinnasta",
      "connect": {
        "label": "Yhteys",
        "help": "Tarkistaa osoitteen ja tunnuksen ja hakee kirjastoluettelon. Kaksi lyhyttä pyyntöä palvelimellesi, ei muuta."
      },
      "test": "Testaa yhteys",
      "testing": "Testataan …",
      "test_ok": "Yhdistetty: {name} (versio {v}).",
      "test_libs": "{n} kirjastoa löytyi.",
      "stored": "Tunnus tallennettu.",
      "library": {
        "label": "Kirjasto",
        "help": "Mikä kirjasto skannataan. ”Kaikki kirjastot” skannaa kaiken (hitaampaa suurilla palvelimilla)."
      },
      "lib_paths": "Kansiot palvelimella: {p}"
    },
    "platform": {
      "enabled": {
        "label": "Käytä palvelua {p}",
        "help": "Pois: ei {p}-hakua, ei {p}-lähteiden tarkistuksia eikä {p}-latauksia. Jo ladatut merkinnät pysyvät kirjastossa."
      },
      "sleep_requests": {
        "label": "Tauko pyyntöjen välillä",
        "help": "Odotusaika palveluun {p} kohdistuvien metatietokyselyiden välillä (haku, seuranta)."
      },
      "sleep_interval": {
        "label": "Latauksen tauko – vähintään",
        "help": "Jokaisen {p}-latauksen jälkeen tulee satunnainen tauko vähimmäis- ja enimmäisarvon väliltä."
      },
      "max_sleep_interval": {
        "label": "Latauksen tauko – enintään",
        "help": "Satunnaisen tauon yläraja."
      },
      "limit_rate_mb": {
        "label": "Latausnopeus",
        "help": "Suurin kaistanleveys. 0 = rajaton (ei suositella)."
      },
      "max_downloads_per_run": {
        "label": "Latauksia enintään ajoa kohti",
        "help": "Palvelun {p} oma laskuri. Loput jäävät jonoon."
      },
      "max_downloads_per_day": {
        "label": "Latauksia enintään päivässä",
        "help": "Palvelun {p} oma laskuri, käsin ja automaattisesti tehdyt lataukset yhdessä."
      },
      "max_searches_per_hour": {
        "label": "Hakuja enintään tunnissa",
        "help": "Palvelun {p} oma laskuri."
      },
      "backoff_initial_hours": {
        "label": "Backoff – alkuarvo",
        "help": "Eston kesto sen jälkeen, kun {p} ilmoitti liian monesta pyynnöstä (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – enimmäisarvo",
        "help": "Eston kesto kaksinkertaistuu jokaisen uuden eston jälkeen tähän arvoon asti."
      }
    },
    "reupload": {
      "enabled": {
        "label": "Tunnista uudelleenlataukset",
        "help": "Laskee offline ffmpegillä tiiviin äänisormenjäljen jokaisesta setistä ja vertaa uusia latauksia kirjastoosi. Osuma merkitään ”Todennäköinen uudelleenlataus: …” – mitään ei poisteta automaattisesti."
      },
      "fingerprint_after_download": {
        "label": "Sormenjälki jokaisen latauksen jälkeen",
        "help": "Yksi tiedosto kerrallaan matalalla prioriteetilla, äänenvoimakkuusanalyysin jälkeen. Pois: vain alla oleva kirjaston vertailu."
      },
      "precheck": {
        "label": "Tarkista ennen latausta",
        "help": "Vertaa ennen latausta myös kestoa (±5 s) ja nimeä kirjastoon samassa palvelussa – ilman lisäpyyntöä. Osumat menevät saapuneisiin jonon sijaan ja näyttävät ”Todennäköisesti jo ladattu”."
      },
      "head_minutes": {
        "label": "Minuuttia alusta",
        "help": "Kuinka paljon alusta tulee sormenjälkeen. Enemmän = varmempi seteille, joilla on pitkä samanlainen intro, hieman hitaampi."
      },
      "windows": {
        "label": "Lisäikkunat",
        "help": "30 sekunnin ikkunat kiinteissä kohdissa: puolet alusta (5, 10, 15 … min), puolet ennen loppua (2, 6, 12 … min), jotta kopio pidemmällä introlla tai outrolla osuu silti kohdalleen. Niillä erotetaan kaksi eri settiä, jotka alkavat samalla kappaleella. 0 = vain alku."
      },
      "min_score": {
        "label": "Osumakynnys",
        "help": "Täsmäävien sormenjälkitiivisteiden osuus, josta alkaen setti katsotaan uudelleenlataukseksi. Matalampi = löytää enemmän, mutta enemmän vääriä osumia."
      },
      "title": "Sormenjälki {done}/{total} tiedostolla",
      "marks": "{open} avoinna · {linked} linkitetty · {kept} säilytetty",
      "help": "Käy kirjaston läpi offline, yksi tiedosto kerrallaan matalalla prioriteetilla – ilman verkkoa, ääni pysyy ennallaan. Voidaan keskeyttää milloin tahansa.",
      "button": "Vertaa uudet tiedostot",
      "button_n": "Vertaa uudet ({n})",
      "all": "Vertaa kaikki uudelleen",
      "all_title": "Laske jokainen sormenjälki uudelleen (esim. ikkunoiden muuttamisen jälkeen) – päätöksesi säilyvät",
      "running": "Verrataan … {done} / {total} · {found} löydetty",
      "show": "Näytä kirjastossa ({n})",
      "no_ffmpeg": "Sormenjäljet tarvitsevat ffmpegin (bin\\ffmpeg.exe, asentaa setup.ps1). Asetukset › Ylläpito näyttää tilan."
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
        "auto": "Automaattinen (järjestelmän kieli)"
      }
    },
    "player": {
      "mode": {
        "internal": "Sisäänrakennettu soitin (suositus)",
        "external": "Windowsin oletussoitin"
      },
      "resume": {
        "ask": "Kysy",
        "auto": "Automaattinen",
        "off": "Pois"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Alkuperäinen (Opus/M4A, ei muunnosta)"
      },
      "mp3_quality": {
        "320": "320 kbit/s CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Pois",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    },
    "media_server": {
      "type": {
        "off": "Pois",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Estä kanava",
      "text": "Kanavan ”{ch}” videoita ei enää näytetä. Kumoa kohdassa Asetukset › Suodattimet ja avainsanat.",
      "ok": "Estä"
    },
    "ignore_all": {
      "title": "Ohita osumat",
      "text": {
        "one": "Merkitäänkö {n} osuma Saapuneissa ohitetuksi? Sitä ei ladata, eikä se enää näy Saapuneissa.",
        "other": "Merkitäänkö {n} osumaa Saapuneissa ohitetuiksi? Niitä ei ladata, eivätkä ne enää näy Saapuneissa."
      },
      "ok": "Ohita"
    },
    "del_source": {
      "title": "Poista lähde",
      "text": "Poistetaanko ”{name}” seurannasta? Jo ladatut mixit säilyvät."
    },
    "del_mix": {
      "title": "Poista mixi",
      "text": "”{title}” poistetaan kirjastosta ja tiedosto poistetaan levyltä:",
      "ok": "Poista tiedosto",
      "warn": "<b>Tätä ei voi kumota.</b> Äänitiedosto ja siihen liittyvä .cue-tiedosto poistetaan. Mixi merkitään ”ohitetuksi”, eikä sitä <b>ladata uudelleen</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Poista vain merkintä",
      "text": "Kohteen ”{title}” tiedosto on nykyisen kohdekansion ulkopuolella, joten sitä ei poisteta:",
      "ok": "Poista vain merkintä",
      "warn": "Tiedosto jää koskemattomana paikalleen. Merkintä poistuu kirjastosta, mixi merkitään ”ohitetuksi”, eikä sitä <b>ladata uudelleen</b>."
    },
    "remove_mix": {
      "title": "Poista merkintä",
      "text": "Kohteen ”{title}” tiedostoa ei löytynyt tallennetusta paikasta:",
      "ok": "Poista merkintä",
      "warn": "Merkintä poistuu kirjastosta. Mixi merkitään ”ohitetuksi”, eikä sitä <b>ladata uudelleen</b>. Jos tiedosto on jossain muualla, se jää koskemattomana."
    },
    "backoff": {
      "title": "Poista backoff",
      "ok": "Poista silti",
      "text": "Eston kesto suojaa sinua: {p} ilmoitti, että pyyntöjä tuli liikaa.",
      "warn": "<b>Poista se vain, jos olet varma, että esto on ohi.</b> Jos sovellus käyttää palvelua liian aikaisin uudelleen, {p} voi rajoittaa IP-osoitettasi pidempään tai pysyvästi."
    },
    "reset_all": {
      "title": "Palauta kaikki",
      "text": "Kaikki asetukset kaikilla välilehdillä palautetaan heti oletusarvoihin ja tallennetaan.",
      "ok": "Palauta"
    },
    "series_delete": {
      "title": "Poistetaanko sarja?",
      "text": "”{name}” ja sen tapahtumat poistetaan.",
      "warn": {
        "one": "{n} mixi menettää kohdistuksensa.",
        "other": "{n} mixiä menettää kohdistuksensa."
      }
    },
    "series_hide": {
      "title": "Piilotetaanko sarja?",
      "text": "Sarjaa ”{name}” ei enää tunnisteta. Saat sen takaisin valinnalla ”Näytä piilotetut”."
    },
    "series_reset": {
      "title": "Palautetaanko sisäänrakennetut sarjat?",
      "text": "Kaikki sisäänrakennetut sarjat palaavat alkutilaan ja piilotetut tulevat takaisin. Omat sarjasi säilyvät.",
      "ok": "Palauta"
    },
    "reupload_del": {
      "title": "Poistetaanko uudelleenlataus?",
      "ok": "Poista tiedosto",
      "text": "”{title}” on todennäköisesti sama miksaus kuin ”{of}”. Poistetaanko tämä uudempi tiedosto?",
      "note": "Alkuperäinen säilyy. Kohde merkitään ”ohitetuksi” eikä sitä ladata uudelleen."
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mixi lisätty jonoon",
      "other": "{n} mixiä lisätty jonoon"
    },
    "enqueued_none": "Mitään ei lisätty – jo jonossa tai ladattu",
    "enqueued_skipped": "{n} ohitettu",
    "queue_cancelled": "Peruttu: {title}",
    "queue_removed": "Poistettu: {title}",
    "queue_retry": "Taas jonossa: {title}",
    "queue_paused": "Jono tauolla",
    "queue_resumed": "Jono jatkuu",
    "new_run": "Uusi ajo aloitettu",
    "ignored": "Ohitettu: {title}",
    "unignored": "Taas näkyvissä: {title}",
    "ignored_n": {
      "one": "{n} osuma ohitettu",
      "other": "{n} osumaa ohitettu"
    },
    "opening": "Avataan {p} selaimessa …",
    "watch_added": "Lisätty seurantaan: {ch}",
    "blocked": "Kanava estetty: {ch}",
    "genre_set": "Tyylilaji asetettu: {genre}",
    "done": "Ladattu: {title}",
    "failed": "Epäonnistui: {title} – {error}",
    "wl_started": {
      "one": "Tarkistetaan seurantaa ({n} lähde, rajoitettu) …",
      "other": "Tarkistetaan seurantaa ({n} lähdettä, rajoitettu) …"
    },
    "wl_started_one": "Tarkistetaan ”{name}” …",
    "wl_none": "Ei aktiivista lähdettä – ei mitään tarkistettavaa",
    "wl_done": {
      "one": "Lähde tarkistettu: ei mitään uutta",
      "other": "Seuranta tarkistettu: {n} lähdettä, ei mitään uutta"
    },
    "wl_done_found": {
      "one": "Seuranta tarkistettu: {n} uusi osuma",
      "other": "Seuranta tarkistettu: {n} uutta osumaa"
    },
    "wl_errors": {
      "one": "{n} lähde, jossa virheitä",
      "other": "{n} lähdettä, joissa virheitä"
    },
    "source_added": "Lähde lisätty: {name}",
    "source_saved": "Lähde tallennettu: {name}",
    "source_deleted": "Lähde poistettu: {name}",
    "retagged": "Merkitty uudelleen: {title}",
    "retagged_moved": "Merkitty uudelleen ja siirretty: {title} → {path}",
    "deleted": "Poistettu: {title}",
    "removed": "Merkintä poistettu: {title}",
    "folder_opening": "Avataan kansiota …",
    "copied": {
      "one": "{n} rivi kopioitu",
      "other": "{n} riviä kopioitu"
    },
    "copy_failed": "Kopiointi ei onnistu",
    "copy_none": "Ei näkyviä rivejä",
    "settings_saved": "Asetukset tallennettu",
    "settings_errors": {
      "one": "{n} syöte on virheellinen",
      "other": "{n} syötettä on virheellistä"
    },
    "backoff_cleared": "Backoff ({p}) poistettu käsin",
    "genre_moved": "Tyylilaji: {genre} – siirretty kohteeseen {path}",
    "genre_retagged": "Tyylilaji: {genre} – tunnisteet päivitetty",
    "genre_entry_only": "Tyylilaji: {genre} – vain merkintää muutettiin, tiedosto ei ole tavoitettavissa",
    "genre_failed": "Tyylilajia ei voitu asettaa: {error}",
    "task_created": "Tehtävä luotu Windowsin tehtävien ajoitukseen",
    "task_removed": "Tehtävä poistettu",
    "updated": "Päivitetty versioon yt-dlp {v}",
    "up_to_date": "Jo ajan tasalla (yt-dlp {v})",
    "update_failed": "Päivitys epäonnistui",
    "restart_required": "Päivitetty – käynnistä HCLoader uudelleen, jotta haku ja lataukset toimivat taas",
    "backup_done": "Varmuuskopio luotu: {path}",
    "reset_all": "Kaikki asetukset palautettu",
    "festival_entry_only": "”{name}” tallennettiin vain merkintään – tiedostoon ei päästä käsiksi",
    "series_saved": "Sarja ”{name}” tallennettu",
    "series_deleted": "Sarja ”{name}” poistettu",
    "series_hidden": "Sarja ”{name}” piilotettu",
    "series_reset": "Sisäänrakennetut sarjat palautettu",
    "assign_done": "Festivaalit kohdistettu: {assigned} uutta, {suggested} ehdotusta",
    "assign_cancelled": "Kohdistus keskeytetty: {assigned} uutta, {suggested} ehdotusta",
    "analysis_done": "Äänenvoimakkuus analysoitu: {n} tiedostoa ({failed} epäonnistui)",
    "analysis_cancelled": "Analyysi keskeytettiin {n} tiedoston jälkeen",
    "fp_done": "Kirjasto verrattu: {n} tiedostoa, {found} todennäköistä uudelleenlatausta",
    "fp_cancelled": "Vertailu keskeytetty {n} tiedoston jälkeen"
  },
  "upd": {
    "available": "Versio {v} saatavilla",
    "available_sub": "Asennettu: {cur}",
    "download": "Lataa",
    "notes": "Muutokset",
    "later": "Myöhemmin",
    "close": "Sulje",
    "cancel": "Peruuta",
    "retry": "Yritä uudelleen",
    "downloading": "Ladataan päivitystä {v}",
    "phase_download": "Lataus",
    "phase_verify": "Tarkistus",
    "phase_prepare": "Valmistelu",
    "ready": "Päivitys {v} valmis",
    "ready_sub": "Asentaaksesi sen HCLoader suljetaan hetkeksi ja käynnistetään uudelleen.",
    "restart_now": "Käynnistä uudelleen nyt",
    "on_exit": "Suljettaessa",
    "applying": "Asennetaan päivitystä …",
    "applying_sub": "HCLoader suljetaan ja käynnistetään uudelleen hetken kuluttua.",
    "error": "Sovelluksen päivitys epäonnistui",
    "blocked": "Automaattinen päivitys ei ole mahdollinen",
    "notes_title": "Muutokset versiossa {v}",
    "notes_empty": "Julkaisutietoja ei ole saatavilla.",
    "notes_link": "Julkaisu GitHubissa",
    "notes_all": "Näytä kaikki muutokset",
    "notes_less": "Näytä vain kohokohdat",
    "confirm_title": "Käynnistetäänkö uudelleen nyt?",
    "confirm_ok": "Käynnistä uudelleen",
    "confirm_text": "HCLoader suljetaan, päivitys asennetaan ja sovellus käynnistetään uudelleen. Käynnissä oleva lataus keskeytetään ja se jää jonoon. Musiikki, asetukset ja tietokanta pysyvät ennallaan.",
    "on_exit_toast": "Päivitys asennetaan, kun HCLoader suljetaan.",
    "later_toast": "Päivitys pysyy valmiina ja tarjotaan uudelleen seuraavassa käynnistyksessä.",
    "section_label": "HCLoader-versio",
    "section_help": "Uudet versiot tulevat GitHubista. Päivitykset eivät koske tietoihin, asetuksiin eivätkä musiikkiin; varmuuskopio luodaan automaattisesti ennen tietokannan migraatiota.",
    "current": "Asennettu",
    "latest": "Uusin",
    "checked": "Viimeisin tarkistus",
    "check_now": "Tarkista nyt",
    "checking": "Tarkistetaan …",
    "st_idle": "Ajan tasalla",
    "st_available": "Uusi versio saatavilla",
    "st_checking": "Tarkistetaan …",
    "st_downloading": "Ladataan …",
    "st_ready": "Valmis asennettavaksi",
    "st_applying": "Asennetaan …",
    "st_error": "Virhe",
    "st_unknown": "Ei vielä tarkistettu",
    "up_to_date": "HCLoader on ajan tasalla (v{v})",
    "portable": "Kannettava versio",
    "installed": "Asennettu (setup)",
    "git": "Git-checkout",
    "from_repo": "lähteestä {repo} (ei virallinen lähde)",
    "unverified": "ilman tarkistussummaa (vain ZIP:n eheys tarkistettu)",
    "rn_label": "Julkaisutiedot",
    "rn_help": "Mitä kussakin versiossa muuttui – mukana tulleista tiedoista (toimii myös offline).",
    "rn_older": "Vanhempi",
    "rn_newer": "Uudempi",
    "rn_pos": "{i}/{n}",
    "rn_installed": "asennettu",
    "rn_empty": "Julkaisutietoja ei löytynyt.",
    "rn_version": "Versio",
    "notes_more": "lisää"
  },
  "err": {
    "generic": "Tuntematon virhe",
    "bridge": "Virhe kohdassa ”{name}”: {msg}",
    "boot": "Käynnistys epäonnistui: {msg}",
    "no_backend": "Ei yhteyttä taustajärjestelmään"
  },
  "fatal": {
    "title": "Yhteys taustajärjestelmään epäonnistui",
    "text": "Käyttöliittymä ei saanut vastausta HCLoaderin Python-osalta. Mitään epätodellista ei näytetä eikä tallenneta.",
    "waiting": "Odotetaan edelleen taustajärjestelmää …",
    "reload": "Lataa uudelleen"
  },
  "fest": {
    "all": "Kaikki sarjat",
    "other": "Muut / kohdistamatta",
    "other_hint": "Ei festivaalia",
    "sets": {
      "one": "{n} setti",
      "other": "{n} settiä"
    },
    "editions": {
      "one": "{n} tapahtuma",
      "other": "{n} tapahtumaa"
    },
    "suggestions": {
      "one": "{n} ehdotus",
      "other": "{n} ehdotusta"
    },
    "all_years": "Kaikki",
    "no_stage": "Ei lavaa",
    "kind": {
      "festival": "Festivaali",
      "radio": "Radio-ohjelma",
      "podcast": "Podcast"
    },
    "set_type": {
      "live_set": "Livesetti",
      "closing_ceremony": "Päätösseremonia",
      "opening": "Avaus",
      "endshow": "Endshow",
      "full_show": "Koko show",
      "warm_up": "Warm-up",
      "anthem": "Anthem",
      "episode": "Jakso"
    },
    "change": "vaihda festivaali",
    "change_manual": "asetettu käsin, vaihda napsauttamalla",
    "add": "Aseta festivaali tai sarja",
    "suggested": "Epävarma ehdotus: {name}",
    "accept": "Hyväksy ehdotus",
    "p_title": "Festivaali / sarja",
    "p_search": "Hae sarjaa …",
    "p_none": "Ei festivaalia",
    "p_no_match": "Sarjaa ei löytynyt",
    "p_year": "Vuosi",
    "p_variant": "Versio",
    "p_stage": "Lava",
    "p_type": "Setin tyyppi",
    "p_apply": "Käytä",
    "p_auto": "Palauta automaattiseksi"
  },
  "backfill": {
    "action": "Lue kaikki (kerran)",
    "action_title": "Lue tämän lähteen koko lista kerran sivu kerrallaan – uudet osumat menevät saapuneisiin",
    "again_title": "Lue kaikki uudelleen – vain vielä tuntemattomat lisätään",
    "search_title": "Ei tallennetuille hauille – haku palauttaa enintään 100 tulosta",
    "why_open": "Lukeminen on jo käynnissä – keskeytä tai peru se nimen alta",
    "st_pending": "Odottaa",
    "st_running": "Luetaan …",
    "st_paused": "Tauolla",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / enint. {cap}",
    "added": "+{n} saapuneissa",
    "done_short": "Kaikki luettu {date}",
    "done_title": "Luettu kokonaan: {date} · {n} kohdetta",
    "note_title": "Viimeisin keskeytys",
    "pause": "Tauko",
    "resume": "Jatka",
    "cancel": "Peru",
    "keep": "Jatka lukemista",
    "dlg_title": "Luetaanko kaikki lähteestä ”{name}”?",
    "dlg_text": "Lukee tämän lähteen koko listan kerran sivu kerrallaan – kevyesti ja edullisesti, rajoittimen kautta; mitään ei ladata. Suodattimesi läpäisevät osumat menevät <b>saapuneisiin</b>, myös automaattisen latauksen lähteissä. Jo tuttuja videoita ei koskaan lisätä kahdesti.",
    "dlg_requests": "pyyntöä",
    "dlg_time": "kesto",
    "dlg_entries": "kohdetta",
    "dlg_known": "Tiedossa viime tarkistuksesta: <b>{n}</b> kohdetta.",
    "dlg_unknown": "Kokoa ei tiedetä – varovainen arvio enimmäismäärälle {cap} kohdetta.",
    "dlg_capped": "Vain ensimmäiset {cap} kohdetta luetaan (Asetukset › Ajastus).",
    "dlg_resume": "Jatkaa {n} jo luetun kohteen jälkeen; niiden sivut haetaan ensin uudelleen.",
    "dlg_headless": "Liian suuri ajastetulle ajolle ({n} pyyntöä tunnissa): jos sovellus suljetaan ennen loppua, se jatkuu vain sovelluksessa.",
    "dlg_pace": "Enintään {n} pyyntöä tunnissa tasaisesti jaettuna. Backoff (HTTP 429 / bottitarkistus), sovelluksen sulkeminen tai virhe vain keskeyttää – lukeminen jatkuu myöhemmin automaattisesti. Voit keskeyttää tai perua milloin tahansa.",
    "dlg_ok": "Aloita lukeminen",
    "dlg_ok_resume": "Jatka lukemista",
    "dlg_cancel_title": "Perutaanko lukeminen?",
    "dlg_cancel_text": "Lähteen ”{name}” lukeminen pysähtyy ja edistyminen hylätään. Saapuneissa jo olevat osumat säilyvät.",
    "toast_started": "”{name}” luetaan kokonaan – taustalla",
    "toast_done": "”{name}” luettu kokonaan – +{n} saapuneissa",
    "toast_paused": "”{name}” tauolla – jatka valinnalla ”Jatka”",
    "toast_cancelled": "Lähteen ”{name}” lukeminen peruttu"
  },
  "collector": {
    "nav": "Keräilijä",
    "open_title": "Festivaalikeräilijä: kokoa festivaalin yhden vuoden kaikki setit tarkistuslistalla",
    "title": "Festivaalikeräilijä",
    "sub": "Yhden festivaalivuoden kaikki setit – aikataulun mukaan, tarkistuslistalla",
    "back_library": "Takaisin kirjastoon",
    "back_list": "Kaikki tarkistuslistat",
    "collect": "Kerää tämä vuosi",
    "collect_title": "Tarkistuslista kaikista seteistä: {name} – etsi puuttuvat setit ja lataa ne",
    "open_checklist": "Tarkistuslista {n} / {total}",
    "sets": "Setit",
    "lists": "Tarkistuslistat",
    "card_empty": "Ei vielä settejä",
    "new_title": "Uusi tarkistuslista",
    "new_text": "Valitse festivaali ja vuosi. Setit tulevat järjestäjän soittolistasta, liitetystä aikataulusta tai mukana toimitetusta tiedostosta.",
    "new_ok": "Avaa tarkistuslista",
    "f_series": "Festivaali / sarja",
    "f_series_ph": "Valitse …",
    "f_series_other": "Radio-ohjelmat ja podcastit",
    "err_series": "Valitse festivaali tai sarja.",
    "err_year": "Anna festivaalin vuosi.",
    "empty_title": "Ei vielä tarkistuslistaa",
    "empty_text": "Tarkistuslista luettelee yhden festivaalivuoden jokaisen setin ja näyttää, mitä sinulla jo on.",
    "step1": "Valitse yltä festivaali ja vuosi.",
    "step2": "Tuo järjestäjän soittolista tai liitä aikataulu.",
    "step3": "Poista valinta siitä, mitä et halua, etsi puuttuvat setit ja lataa.",
    "delete": "Poista tarkistuslista",
    "dlg_delete_title": "Poistetaanko tarkistuslista?",
    "dlg_delete_text": "Tarkistuslista ”{name}” poistetaan kaikkine riveineen. Käynnissä oleva haku pysähtyy.",
    "dlg_delete_keep": "Ladatut tiedostot, kirjaston merkinnät ja tallennetut osumat säilyvät.",
    "toast_deleted": "Tarkistuslista ”{name}” poistettu",
    "in_library": "{n} kirjastossa",
    "show_library": "Näytä kirjastossa ({n})",
    "more": "Lisää",
    "st": {
      "found": "Löytyi",
      "queued": "Jonossa",
      "downloaded": "Ladattu",
      "missing": "Puuttuu",
      "ignored": "Ohitettu"
    },
    "filter_status": "Näytä vain: {name}",
    "sources": "Lähteet",
    "src_playlist": "Tuo järjestäjän soittolista",
    "src_paste": "Liitä aikataulu (Beta)",
    "files": "Mukana tulevat aikataulut",
    "src_add": "Lisää rivi",
    "all_stages": "Kaikki lavat",
    "all_days": "Kaikki päivät",
    "no_day": "Ei päivää",
    "search": "Suodata DJ:n mukaan …",
    "col_dj": "DJ / setti",
    "col_when": "Päivä / aika",
    "col_status": "Tila",
    "col_match": "Löytynyt video",
    "source": {
      "playlist": "Soittolista",
      "timetable": "Aikataulu",
      "file": "Aikataulutiedosto",
      "manual": "Lisätty käsin"
    },
    "edited": "Muokattu käsin – nämä arvot voittavat myöhemmät tuonnit",
    "check_title": "Kerää tämä setti",
    "all_title": "Valitse kaikki / ei mitään (näkyvät rivit)",
    "m_none": "Ei vielä haettu",
    "m_searched": "Ei löytynyt ({date})",
    "confirm": "Vahvista",
    "confirm_title": "Epävarma osuma – vahvista, että tämä on oikea setti",
    "reject_title": "Ei tämä video – älä ehdota sitä tälle riville enää",
    "reject": "Hylkää osuma",
    "candidates": "Muita osumia: {n}",
    "candidates_head": "Käytä toista osumaa",
    "ignore": "Ohita tämä setti",
    "unignore": "Lopeta ohittaminen",
    "delete_row": "Poista rivi",
    "f_artist": "DJ / artisti",
    "f_day": "Päivä",
    "f_start": "Alku",
    "f_end": "Loppu",
    "add_ok": "Lisää",
    "err_artist": "DJ / artisti on pakollinen.",
    "none_title": "Ei rivejä",
    "none_text": "Mikään rivi ei vastaa nykyisiä suodattimia.",
    "rows_empty_title": "Tämä tarkistuslista on tyhjä",
    "rows_empty_text": "Aloita järjestäjän virallisesta soittolistasta – yksi kevyt listaus kattaa yleensä useimmat setit. Tai liitä aikataulu tekstinä.",
    "checked_of": "/ {total} valittu",
    "select_all": "Valitse kaikki",
    "select_none": "Ei mitään",
    "shown": "Näytetään {n} / {total} riviä",
    "to_confirm": "Vahvistettavia: {n}",
    "to_confirm_title": "Epävarmat osumat odottavat vahvistustasi – napsauta nähdäksesi vain ne",
    "find": "Etsi puuttuvat setit ({n})",
    "find_again": "Hae uudelleen ({n})",
    "find_title": "Hakee valitut setit, joilla ei ole osumaa, yksi kerrallaan ja rauhallisesti – näyttää ensin arvion",
    "find_again_title": "Kaikki setit on jo haettu – hae uudelleen ne, joilla ei ole osumaa",
    "find_none": "Ei haettavaa – jokaisella valitulla setillä on osuma",
    "find_running": "Haku on käynnissä",
    "queue": "Lataa valitut ({n})",
    "queue_title": "Lisää kaikki valitut, vahvistetut setit latausjonoon",
    "queue_none": "Ei ladattavaa – ei valittua settiä, jolla olisi vahvistettu ja vielä lataamaton osuma",
    "job_pending": "Odottaa",
    "job_running": "Haetaan …",
    "job_paused": "Tauolla",
    "job_hits": "Löytyi: {n}",
    "job_cancel": "Pysäytä",
    "job_resume": "Jatka",
    "imp_running": "Luetaan soittolistaa …",
    "imp_entries": "Kohteita: {n}",
    "imp_hint": "kevyt listaus, sivu kerrallaan",
    "imp_busy": "Soittolistaa luetaan jo",
    "imp_added": "uusia: {n}",
    "imp_merged": "yhdistetty: {n}",
    "imp_matched": "löytyi kirjastosta: {n}",
    "imp_unchecked": "ilman valintaa (liian lyhyt / aftermovie): {n}",
    "imp_invalid": "virheellisiä: {n}",
    "pl_title": "Tuo järjestäjän soittolista",
    "pl_text": "Järjestäjän virallinen liveset-soittolista on edullisin lähde: yksi kevyt listaus, mitään ei ladata. Jokaisesta kohteesta tulee vahvistettu rivi; DJ, lava ja setin tyyppi poimitaan otsikosta.",
    "pl_url": "Soittolistan linkki",
    "pl_hint": "YouTube-soittolista tai SoundCloud-setti. Liian lyhyet kohteet, aftermoviet ja trailerit lisätään ilman valintaa. Aikataulun rivit saavat niihin sopivan videon.",
    "pl_ok": "Tuo",
    "pl_err_empty": "Liitä soittolistan linkki.",
    "toast_pl_started": "Luetaan soittolistaa – jatkuu taustalla",
    "toast_pl_done": "Soittolista luettu –",
    "toast_pl_cancelled": "Soittolistan tuonti pysäytetty –",
    "tt_title": "Liitä aikataulu – {name} (Beta)",
    "tt_text": "Liitä aikataulu tekstinä tai CSV:nä. Otsikot asettavat päivän ja lavan, jokainen muu rivi on setti. Mitään ei tallenneta ennen tuontia.",
    "tt_input": "Aikataulu",
    "tt_preview": "Esikatselu",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Tunnistetut setit näkyvät tässä.",
    "tt_nothing": "Yhtään settiä ei ole vielä tunnistettu.",
    "tt_sum": "Settejä: {n}",
    "tt_days": "Päiviä: {n}",
    "tt_stages": "Lavoja: {n}",
    "tt_skipped": "Rivejä, joita ei ymmärretty: {n}",
    "tt_more": "… ja {n} muuta",
    "tt_ok": "Tuo ({n})",
    "tt_edit_hint": "Korjaa tai poista settejä tässä ennen tuontia. Vasemman tekstin muokkaus lukee sen uudelleen.",
    "toast_tt": "Aikataulu tuotu –",
    "files_text": "Aikatauluja, joita ylläpidetään HCLoaderin repositoriossa ja jotka toimitetaan päivitysten mukana. Tuonti luo kyseisen vuoden tarkistuslistan.",
    "files_empty_title": "Aikatauluja ei vielä toimiteta mukana",
    "files_empty": "Mukana toimitetaan vain todistetusti oikeita aikatauluja – tässä versiossa niitä ei vielä ole. Liitä aikataulu sen sijaan tekstinä.",
    "files_how_title": "Lisää oma aikataulu",
    "files_how": "Yksi JSON-tiedosto vuotta kohden: setit (artisti, lava, päivä, alku, loppu) ja lähteeksi linkki viralliseen aikatauluun. Lähetä se issuena tai pull requestina GitHubissa; tiedostojen vieressä oleva README kuvaa muodon.",
    "files_meta": "Settejä: {n} · päivitetty {date}",
    "files_source": "virallinen lähde",
    "files_import": "Tuo",
    "files_broken": "Virheellinen tiedosto: {error}",
    "files_unknown": "Sarja on täällä tuntematon tai piilotettu",
    "est_title": "Etsi puuttuvat setit – {name}",
    "est_text": "Hakee jokaisen valitun setin, jolla ei ole osumaa, yksi kerrallaan: <b>DJ + festivaali + vuosi</b> kevyenä hakuna rajoittimen kautta. Mitään ei ladata.",
    "est_requests": "hakua",
    "est_left": "vapaana tällä tunnilla",
    "est_again": "Kaikki setit on jo haettu – nyt haetaan uudelleen ne, joilla ei ole osumaa.",
    "est_offline": "Juuri yhdistetty kirjastoosi ilmaiseksi: {n}.",
    "est_resume": "Jatkaa keskeytynyttä hakua.",
    "est_wait": "Tämän tunnin hakuraja on käytetty – ensimmäinen haku alkaa {t}.",
    "est_backoff": "Backoff voimassa {t} asti – hakua ei voi aloittaa sitä ennen.",
    "est_pace": "Enintään {n} hakua tunnissa, tasaisesti jaettuna (noin yksi {min} min välein). Epävarmat osumat odottavat vahvistustasi. Backoff, sovelluksen sulkeminen tai virhe vain keskeyttää haun – se jatkuu automaattisesti.",
    "est_ok": "Aloita haku",
    "est_ok_resume": "Jatka hakua",
    "toast_find_started": "Haetaan puuttuvia settejä: ”{name}” – jatkuu taustalla",
    "toast_find_done": "Haku valmis – löytyi {n} / {total}",
    "toast_find_cancelled": "Haku pysäytetty – ”Etsi puuttuvat setit” jatkaa sitä",
    "toast_offline": "Yhdistetty kirjastoosi: {n} – hakua ei tarvita",
    "toast_confirmed": "”{name}” vahvistettu",
    "toast_rejected": "Osuma hylätty: ”{name}”",
    "toast_ignored": "”{name}” ohitetaan",
    "toast_unignored": "”{name}” kerätään taas",
    "toast_row_added": "”{name}” lisätty",
    "toast_row_added_hit": "”{name}” lisätty – löytyi kirjastosta",
    "toast_row_saved": "”{name}” tallennettu",
    "toast_row_retag": "”{name}” tallennettu – tiedoston tagit päivitetään",
    "toast_row_deleted": "Rivi ”{name}” poistettu",
    "q_none": "Jonoon ei lisätty mitään",
    "q_unconfirmed": "vahvistamatta: {n}",
    "q_missing": "ilman osumaa: {n}",
    "q_other": "ei ladattavissa: {n}",
    "q_retag": "tagit päivitetty: {n}",
    "export": "Soittolista",
    "export_title": "Vie tämän tarkistuslistan ladatut setit M3U8-soittolistaksi"
  },
  "tracks": {
    "nav": "Kappaleet",
    "open_title": "Missä seteissä kappale soi? Hae kirjaston kappalelistoista",
    "title": "Kappaleet",
    "sub": "Missä seteissä tämä kappale soi?",
    "back": "Takaisin kirjastoon",
    "search": "Artisti tai nimi, esim. Dragonborn",
    "n_tracks": {
      "one": "{n} kappale",
      "other": "{n} kappaletta"
    },
    "n_sets": {
      "one": "{n} setti",
      "other": "{n} settiä"
    },
    "status": "{tracks}, {sets}",
    "status_last": "Luettu:",
    "scan": "Lue kappalelistat",
    "scan_title": "Lue kaikkien settien kappalelistat (offline: kappalemerkit, kuvaukset, CUE-tiedostot)",
    "rescan": "Lue kaikki uudelleen",
    "rescan_title": "Lue kaikkien settien kappalelistat uudelleen",
    "scan_new": "Lue uudet",
    "scan_new_title": "Lue vain uudet tai edellisen läpikäynnin jälkeen muuttuneet setit",
    "running": "Luetaan kappalelistoja … {done} / {total}",
    "engine_like": "Yksinkertainen haku: tässä SQLitessä ei ole kokotekstihakemistoa",
    "top_title": "Soitetuimmat kappaleet",
    "top_sub": "useimmissa seteissä",
    "top_sets": {
      "one": "{n} setti",
      "other": "{n} settiä"
    },
    "top_find": "Näytä setit, joissa tämä kappale on",
    "top_empty": "Mikään kappale ei vielä esiinny useammassa kuin yhdessä setissä.",
    "results": {
      "one": "{n} setti: ”{q}”",
      "other": "{n} settiä: ”{q}”"
    },
    "truncated": "ensimmäiset {n} – tarkenna hakua",
    "more_hits": {
      "one": "+ {n} osuma lisää",
      "other": "+ {n} osumaa lisää"
    },
    "no_results_title": "Mikään setti ei soita ”{q}”",
    "no_results_text": "Kokeile osaa artistista tai nimestä. Vain setit, joilla on kappalelista (kappalemerkit, kuvaus, CUE-tiedosto), löytyvät.",
    "empty_title": "Ei vielä kappalelistoja",
    "empty_text": "HCLoader lukee kappalelistat settiesi kappalemerkeistä, kuvauksista ja CUE-tiedostoista – offline, kysymättä YouTubelta.",
    "empty_none_title": "Yhdelläkään setilläsi ei ole kappalelistaa",
    "empty_none_text": "Kappalelistat tulevat kappalemerkeistä, aikaleimallisista kuvauksista ja CUE-tiedostoista. Ilman niitä settejä ei voi hakea.",
    "library_empty": "Lataa ensin muutama setti – niiden kappalelistat näkyvät täällä.",
    "jump": "Toista kohdasta {time}",
    "jump_external": "Avattu oletussoittimessa – siirry siellä kohtaan {time}",
    "no_time": "Kappalelistassa ei ole aikaleimaa",
    "tracklist": "Kappalelista",
    "tracklist_title": "Näytä tämän setin koko kappalelista",
    "panel_source": "Lähde: {source}",
    "source_chapters": "kappalemerkit",
    "source_description": "kuvaus",
    "source_id3": "ID3-kappalemerkit",
    "source_cue": "CUE-tiedosto",
    "source_none": "ei mitään",
    "panel_empty": "Tällä setillä ei ole kappalelistaa",
    "panel_empty_hint": "Kappalemerkkejä, kappalelistallista kuvausta tai CUE-tiedostoa ei löytynyt.",
    "close": "Sulje",
    "id_track": "Julkaisematon tai tunnistamaton kappale (ID)",
    "play_set": "Toista setti alusta",
    "toast_done": "Kappalelistat luettu: {sets}, {tracks}",
    "toast_cancelled": "Kappalelistojen luku peruttu"
  },
  "pl": {
    "title": "Vie soittolista",
    "export": "Vie",
    "overwrite": "Korvaa",
    "exists": "Kansiossa on jo tämänniminen soittolista. ”Korvaa” kirjoittaa sen yli.",
    "nothing": "Ei vietävää – täällä ei ole ladattuja settejä.",
    "missing": "{n} tiedostoa puuttuu – ne ohitetaan",
    "name": "Tiedostonimi",
    "folder": "Kansio",
    "browse": "Selaa …",
    "paths": "Polut soittolistassa",
    "relative": "Suhteelliset",
    "absolute": "Absoluuttiset",
    "relative_help": "Suhteessa soittolistaan – toimii, vaikka siirtäisit koko musiikkikansion. Toisen aseman tiedostot kirjoitetaan täydellä polulla.",
    "absolute_help": "Täydet polut – soittolista voi olla missä tahansa, mutta lakkaa toimimasta, jos musiikki siirtyy.",
    "sync": "Pidä ajan tasalla latausten jälkeen",
    "sync_help": "Kirjoitetaan automaattisesti uudelleen jokaisen latauksen jälkeen.",
    "sync_off": "Muistettu – toimii, kun ”Päivitä tallennetut soittolistat latausten jälkeen” on päällä (Asetukset › Tallennus).",
    "done": "Soittolista tallennettu ({sets}): {path}",
    "skipped": "{n} puuttuvaa ohitettu",
    "fallback": "{n} toisella asemalla täydellä polulla",
    "synced": "Soittolistoja päivitetty: {n}",
    "sync_failed": "Soittolistoja ei päivitetty: {n} (katso loki)"
  },
  "djs": {
    "nav": "DJ:t",
    "open_title": "DJ-sivut: kaikki kirjastosi artistit, aliakset ja b2b-setit",
    "title": "DJ:t",
    "sub": "Kirjastosi artistit",
    "back_library": "Takaisin kirjastoon",
    "back": "Kaikki DJ:t",
    "add": "Lisää DJ / akti",
    "search": "Hae DJ:tä tai aliasta",
    "sort": "Lajittele",
    "sort_sets": "Setit",
    "sort_recent": "Viimeisimmät",
    "sort_name": "Nimi",
    "hidden_chip": "Piilotettu: {n}",
    "n_festivals": "Festivaalit: {n}",
    "n_b2b": "b2b: {n}",
    "aka": "alias {names}",
    "unhide": "Näytä taas listassa",
    "none_title": "DJ:tä ei löytynyt",
    "none_text": "Kokeile toista nimeä tai aliasta.",
    "empty_title": "Ei vielä DJ:tä",
    "empty_text": "DJ:t tunnistetaan offline ladattujen settien nimistä, festivaalien tarkistuslistoista ja artistikanavista.",
    "b2b_title": "Soitettu yhdessä (b2b) – setti lasketaan jokaiselle artistille",
    "b2b_with": "b2b: {names}",
    "aliases": "Aliakset",
    "no_aliases": "Ei aliaksia",
    "split_title": "Erota ”{alias}” – laske omaksi DJ:ksi",
    "play_all": "Toista kaikki",
    "export": "Vie M3U",
    "export_title": "Vie soittolista: {name}",
    "watch": "Lisää seurantaan",
    "discover": "Hae Etsi-näkymässä",
    "stat_sets": "Setit",
    "stat_hours": "Tunnit",
    "stat_festivals": "Festivaalit",
    "stat_years": "Vuodet",
    "stat_b2b": "b2b",
    "other_sets": "Muut setit · {year}",
    "tracks": "Eniten soitetut seteissä",
    "track_sets": "{n}×",
    "tracks_none": "Näille seteille ei ole vielä kappalelistoja – Kirjasto › Kappaleet lukee ne offline.",
    "play_all_external": "”Toista kaikki” vaatii sisäänrakennetun soittimen (Asetukset › Toisto).",
    "watch_exists": "On jo seurannassa: {name}",
    "watch_title": "Seuraa: {name}",
    "watch_ok": "Lisää seurantaan",
    "watch_channel": "Uudet setit artistin {name} omalta kanavalta tulevat saapuneisiin:",
    "watch_search": "Omaa kanavaa ei tunneta – seuranta hakee YouTubesta säännöllisesti:",
    "watch_note": "Mitään ei ladata automaattisesti. Voit muuttaa tai poistaa lähteen seurannassa milloin tahansa.",
    "watch_added": "Lisätty seurantaan: {name}",
    "split_q_title": "Erota alias",
    "split_q": "Lasketaanko setit nimellä ”{alias}” erilliseksi DJ:ksi eikä artistille {name}?",
    "split_ok": "Erota",
    "split_done": "”{alias}” on taas oma DJ",
    "edit": "Muokkaa nimeä ja aliaksia",
    "edit_title": "Muokkaa: {name}",
    "add_title": "Lisää DJ tai akti",
    "f_name": "Nimi",
    "f_aliases": "Aliakset",
    "f_aliases_help": "Muut kirjoitusasut ja lyhyet nimet (esim. ”HH”). Aliaksella merkityt setit lasketaan tälle DJ:lle.",
    "f_act_help": "Valinnainen. Duo, jonka nimessä on ”&” (esim. ”D-Block & S-te-Fan”), lasketaan silloin yhdeksi aktiksi eikä b2b:ksi.",
    "f_alias_add": "+ alias",
    "f_channel": "Oma kanava (valinnainen)",
    "f_channel_help": "YouTube- tai SoundCloud-kanavan URL – käytetään toiminnossa ”Lisää seurantaan”.",
    "saved": "Tallennettu",
    "merge": "Yhdistä toiseen DJ:hin …",
    "merge_title": "Yhdistä: {name}",
    "merge_text": "Kaikki artistin {name} setit ja kirjoitusasut lasketaan valitulle DJ:lle. Voit erottaa sen myöhemmin.",
    "merge_into": "Yhdistä kohteeseen",
    "merge_ok": "Yhdistä",
    "merge_none": "Ei toista DJ:tä yhdistettäväksi.",
    "merged": "{name} yhdistetty",
    "hide": "Ei DJ – piilota",
    "hidden_done": "Piilotettu DJ-listasta",
    "unhidden_done": "Taas DJ-listassa",
    "sub_n": {
      "one": "{n} DJ",
      "other": "{n} DJ:tä"
    }
  },
  "stats": {
    "title": "Tilastot",
    "sub": "Kirjastosi lukuina – offline, tietokannasta",
    "range": "Aikaväli",
    "p_all": "Kaikki",
    "p_12m": "12 kk",
    "p_30d": "30 päivää",
    "p_year": "Tämä vuosi",
    "p_custom": "Mukautettu",
    "from": "Alkaen",
    "to": "Asti",
    "n_sets": {
      "one": "{n} setti",
      "other": "{n} settiä"
    },
    "sets_word": {
      "one": "setti",
      "other": "settiä"
    },
    "k_sets": "Setit",
    "k_hours": "Kesto",
    "k_size": "Levyllä",
    "k_avg": "Keskimääräinen setti",
    "of_library": "kirjaston {n} setistä",
    "since": "alkaen {d}",
    "days_nonstop": "{n} päivää nonstop",
    "last_dl": "viimeisin lataus {d}",
    "avg_size": "{s} / setti",
    "sizes_missing": {
      "one": "{n} tiedosto vielä mittaamatta",
      "other": "{n} tiedostoa vielä mittaamatta"
    },
    "measuring": "Mitataan tiedostokokoja … {done} / {total}",
    "h_months": "Lataukset kuukausittain",
    "h_years_dl": "Lataukset vuosittain",
    "best_month": "Paras: {m} ({n})",
    "h_genres": "Tyylilajeittain",
    "h_sources": "Lähteet",
    "h_festivals": "Kärkifestivaalit",
    "editions": {
      "one": "{n} kerta",
      "other": "{n} kertaa"
    },
    "festivals_other": "+ {n} settiä {f} muulta festivaalilta",
    "no_festivals": "Ei festivaalisettejä tällä aikavälillä – Asetukset › Festivaalit & sarjat liittää ne.",
    "h_djs": "Kärki-DJ:t",
    "open_dj": "Avaa DJ:n {name} sivu",
    "no_djs": "Ei tunnistettuja DJ:itä tällä aikavälillä.",
    "h_years": "Setin vuoden mukaan",
    "year_unknown": "{n} ilman tunnettua vuotta",
    "h_tracks": "Soitetuimmat kappaleet",
    "no_tracks": "Mikään kappale ei vielä esiinny kahdessa setissä – kappalelistat tulevat luvuista ja kuvauksista (Kirjasto › Kappaleet).",
    "h_watchlist": "Seurantalistan toiminta",
    "w_checks": "Tarkistukset",
    "w_scheduled": "joista ajastettuja",
    "w_found": "Löydetyt",
    "w_inbox": "Saapuneissa",
    "w_library": "Kirjastossa",
    "w_source": "Lähde",
    "w_found_n": "{n} löydetty",
    "w_checks_n": "{n} tarkistusta",
    "w_last": "viimeisin tarkistus {t}",
    "w_none_range": "Mikään lähde ei löytänyt mitään tällä aikavälillä.",
    "w_no_sources": "Seurantalistalla ei ole vielä lähteitä.",
    "none": "Ei mitään tällä aikavälillä.",
    "range_empty": "Tällä aikavälillä ei ladattu mitään – valitse pidempi.",
    "error": "Tilastot eivät ole käytettävissä",
    "empty_title": "Ei vielä settejä",
    "empty_text": "Kun ensimmäiset setit ovat kirjastossa, näet täältä mitä keräät – tyylilajit, festivaalit, DJ:t, tunnit.",
    "empty_go": "Löydä settejä"
  },
  "reupload": {
    "tag": "Uudelleenlataus?",
    "tag_title": "Todennäköisesti setin ”{title}” uudelleenlataus ({p}, {score} % vastaavuus) – päätä napsauttamalla",
    "linked": "Sama miksaus",
    "linked_title": "Linkitetty samaksi miksaukseksi kuin ”{title}” ({p})",
    "chip": "Uudelleenlataukset ({n})",
    "chip_title": "Näytä vain todennäköisiksi uudelleenlatauksiksi merkityt setit",
    "menu_head": "Todennäköinen uudelleenlataus: ”{title}” · {score} %",
    "menu_head_linked": "Sama miksaus kuin ”{title}”",
    "keep": "Säilytä molemmat",
    "link": "Linkitä samaksi miksaukseksi",
    "undo": "Peru päätös",
    "show_original": "Näytä alkuperäinen",
    "delete_new": "Poista tämä uudempi tiedosto",
    "toast_keep": "Molemmat säilytetty – merkintä poistettu",
    "toast_link": "Linkitetty samaksi miksaukseksi",
    "toast_open": "Päätös peruttu",
    "toast_found": "Todennäköinen uudelleenlataus: ”{title}” vastaa settiä ”{of}” – katso kirjasto",
    "dl_notice": "Viimeaikaiset lataukset, jotka ovat todennäköisesti uudelleenlatauksia jo omistamistasi seteistä ({n}):",
    "review": "Tarkista kirjastossa",
    "adopt": "Alkuperäinen puuttuu – säilytä tämä kopio",
    "toast_adopt": "Tämä kopio korvaa nyt puuttuvan alkuperäisen",
    "original_missing_head": "Alkuperäinen tiedosto puuttuu – tämä kopio on viimeinen eikä sitä voi poistaa täällä",
    "original_unknown_head": "Kohdekansio ei ole saatavilla – alkuperäistä ei voi tarkistaa"
  },
  "catchup": {
    "cancel": "Pysäytä taustalla kiinniotto",
    "tip": "Kirjaston vanhemmat kohteet käsitellään offline-tilassa taustalla. Pysäytettynä se jatkuu seuraavalla käynnistyksellä.",
    "step": {
      "festivals": "Festivaalien määritys",
      "tracklists": "Kappalelistojen luku",
      "analysis": "Äänenvoimakkuuden analyysi",
      "fingerprints": "Sormenjäljet"
    }
  }
});
