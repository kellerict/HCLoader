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
    "settings": "Asetukset"
  },
  "navfoot": {
    "today": "TÄNÄÄN",
    "next": "SEURAAVA TARKISTUS"
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
    "empty_list": "”ei mitään”"
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
    "clock": "24 h"
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
    "sc_off": "SoundCloud on pois päältä – ota se käyttöön kohdassa Asetukset › SoundCloud."
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
    "backoff_tip": "{p}: backoff asti {t} ({rest} jäljellä)"
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
    "select": "Valitse",
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
    "preview_title": "SoundCloud tarjoaa tälle kappaleelle vain 30 sekunnin esikuuntelun (Go+). Sitä ei voi ladata."
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
    "none_year": "Ei tuloksia vuodelta {year}. Hae uudelleen, jotta vuosi otetaan mukaan hakusanaan – tai vaihda vuosi."
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
    "hint_channel": "YouTube-kanava (…/@nimi tai …/channel/UC…, tarvittaessa /videos tai /streams) tai SoundCloud-profiili (soundcloud.com/nimi).",
    "hint_playlist": "YouTube-soittolista, jossa ”list=…”, tai SoundCloud-setti (soundcloud.com/nimi/sets/setti). Uusimmat merkinnät tarkistetaan.",
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
    "form_error": "Lähdettä ei voitu tallentaa."
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
    "local_link_error": "Ylläpito"
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
    "group": "Tyylilajin mukaan",
    "group_title": "Ryhmittele merkinnät tyylilajin mukaan",
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
    "none_text": "Mikään merkintä ei vastaa hakua ja suodattimia."
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
    "external": "Avataan oletussoittimessa …"
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
    "maintenance": "Ylläpito"
  },
  "tabs_hint": {
    "general": "Sovelluksen perustoiminta.",
    "filters": "Haun ja seurannan oletussuodattimet. Voidaan ohittaa väliaikaisesti kohdan ”Etsi” suodatinpaneelissa.",
    "genres": "Järjestys = tärkeysjärjestys. Ensimmäinen tyylilaji, jonka avainsana esiintyy nimessä, voittaa. Käsin asetetut tyylilajit ja lähteen oletustyylilaji ovat etusijalla.",
    "download": "YouTube toimittaa yleensä Opusta noin 130–160 kbit/s. MP3 on muunnos eikä kuulosta lähdettä paremmalta – mutta toimii kaikkialla.",
    "storage": "Minne tiedostot menevät ja miten ne nimetään. Rakenne on suunniteltu mediapalvelimille, kuten Plex tai Jellyfin.",
    "throttle": "Rajoittaa YouTubeen kohdistuvaa kuormitusta. Arvot koskevat hakua, seurantaa ja latauksia yhdessä. SoundCloudilla on omat arvot välilehdellä ”SoundCloud”.",
    "soundcloud": "SoundCloud toisena lähteenä haulle, seurannalle ja lataukselle – omilla rajoilla, laskureilla ja backoffilla, riippumatta YouTubesta.",
    "network": "PO-Token tunnistaa pyynnöt oikeaksi selaimeksi ja pienentää bottiestojen riskiä.",
    "schedule": "Milloin seuranta tarkistetaan automaattisesti – sovelluksessa ja Windowsin tehtävien ajoituksella.",
    "appearance": "Ulkoasu ja tuntuma. Muutokset esikatsellaan heti ja tulevat pysyviksi vasta tallennuksen jälkeen.",
    "maintenance": "Versiot, päivitykset, tietokanta."
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
      "reset": "Palautus"
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
      }
    },
    "path_preview": {
      "label": "Esikatselu",
      "help": "Napsauta paikkamerkkejä lisätäksesi ne polkumalliin."
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
      "sc_off_detail": "Ei SoundCloud-hakua, ei seurannan tarkistuksia eikä latauksia SoundCloudista."
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
    "reset_all": "Kaikki asetukset palautettu"
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
    "rn_version": "Versio"
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
  }
});
