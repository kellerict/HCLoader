/* HCLoader UI texts – Lietuvių.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "lt", "name": "Lietuvių", "dir": "ltr", "intl": "lt-LT"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "SUNKIOSIOS MUZIKOS ARCHYVAS",
    "mock": "DEMONSTRACINIS REŽIMAS"
  },
  "nav": {
    "discover": "Paieška",
    "inbox": "Gauti",
    "watchlist": "Stebimi",
    "downloads": "Atsisiuntimai",
    "library": "Biblioteka",
    "log": "Žurnalas",
    "settings": "Nustatymai"
  },
  "navfoot": {
    "today": "ŠIANDIEN",
    "next": "KITA PATIKRA"
  },
  "common": {
    "ok": "Gerai",
    "cancel": "Atšaukti",
    "save": "Įrašyti",
    "delete": "Ištrinti",
    "edit": "Redaguoti",
    "remove": "Pašalinti",
    "reset": "Atstatyti",
    "on": "įjungta",
    "off": "išjungta",
    "current": "dabartinė",
    "loading": "įkeliama …",
    "add_chip": "+ pridėti",
    "empty": "„tuščia“",
    "empty_list": "„nėra“"
  },
  "fmt": {
    "today": "šiandien",
    "yesterday": "vakar",
    "never": "niekada",
    "no_date": "Data nežinoma",
    "just_now": "ką tik",
    "today_at": "šiandien {t}",
    "tomorrow_at": "rytoj {t}",
    "yesterday_at": "vakar {t}",
    "views": {
      "one": "{v} peržiūra",
      "few": "{v} peržiūros",
      "many": "{v} peržiūrų",
      "other": "{v} peržiūrų"
    }
  },
  "unit": {
    "s": "s",
    "h": "val.",
    "minutes": "min.",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "simbolių",
    "results": "rezultatų",
    "entries": "įrašų",
    "clock": "val.",
    "req_h": "užkl./val.",
    "lufs": "LUFS"
  },
  "range": {
    "ge_sleep": "≥ minimumas",
    "ge_initial": "≥ pradinė reikšmė"
  },
  "status": {
    "new": "Nauja",
    "inbox": "Gautuose",
    "queued": "Eilėje",
    "downloading": "Atsisiunčiama",
    "done": "Atsisiųsta",
    "ignored": "Ignoruojama",
    "failed": "Klaida"
  },
  "period": {
    "all": "Visi",
    "7d": "Paskutinės 7 dienos",
    "30d": "Paskutinės 30 dienų",
    "1y": "Paskutiniai 12 mėnesių",
    "year": "Konkretūs metai",
    "custom": "Pasirinktinis"
  },
  "source_type": {
    "channel": "Kanalas",
    "playlist": "Grojaraštis",
    "search": "Paieška"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Platforma",
    "sc_off": "„SoundCloud“ išjungta – įjunkite skiltyje Nustatymai › SoundCloud."
  },
  "genre": {
    "change": "Keisti žanrą",
    "manual": "Žanras nustatytas rankiniu būdu",
    "change_manual": "Keisti žanrą (nustatyta rankiniu būdu)"
  },
  "run_kind": {
    "watchlist": "Stebimi šaltiniai",
    "headless": "Užduočių planuoklis",
    "manual": "Rankinis"
  },
  "phase": {
    "waiting": "Laukiama",
    "sleep": "Pauzė iki kito atsisiuntimo",
    "download": "Atsisiunčiama",
    "convert": "Konvertuojama",
    "tag": "Žymima",
    "failed": "Nepavyko"
  },
  "po_mode": {
    "off": "Išjungta",
    "script": "Scenarijus",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Išjungta",
    "script": "Scenarijus (Deno)",
    "http": "HTTP serveris (vietinis)"
  },
  "statusbar": {
    "ok": "Gerai",
    "missing": "trūksta",
    "po": "PO-Token",
    "po_active": "aktyvus ({mode})",
    "po_inactive": "neaktyvus",
    "po_error": "Klaida",
    "backoff": "Pauzė",
    "backoff_none": "nėra",
    "backoff_until": "iki {t} · liko {rest}",
    "queue": "Eilė",
    "queue_empty": "tuščia",
    "queue_active": "aktyvi",
    "queue_paused": "pristabdyta",
    "today": "Šiandien",
    "next": "Kita patikra",
    "next_off": "išjungta",
    "backoff_until_short": "iki {t}",
    "sc_backoff": "Pauzė iki {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · šiandien atsisiųsta {day}/{day_max} · šią valandą paieškų {s}/{s_max}",
    "sc_tip": "SoundCloud · šiandien atsisiųsta {day}/{day_max} · šią valandą paieškų {s}/{s_max}",
    "backoff_tip": "{p}: pauzė iki {t} (liko {rest})"
  },
  "schedule": {
    "due": "laikas",
    "kind_app": "Programa",
    "kind_task": "Užduotis",
    "tip_app": "Kita stebimų šaltinių patikra programoje: {t} (kol veikia HCLoader).",
    "tip_task": "Kita stebimų šaltinių patikra per „Windows“ užduočių planuoklį: {t}.",
    "tip_any": "Kita stebimų šaltinių patikra: {t}.",
    "tip_off": "Automatinės patikros nėra – nei programoje, nei per „Windows“ užduočių planuoklį.",
    "tip_backoff": "Kol galioja pauzė, patikrų nėra."
  },
  "card": {
    "source": "Rasta per stebimą šaltinį „{name}“",
    "select": "Pasirinkti",
    "open": "Atidaryti platformoje {p}",
    "ignore": "Ignoruoti",
    "unignore": "Nebeignoruoti",
    "more": "Daugiau veiksmų",
    "download": "Atsisiųsti",
    "watch": "Pridėti kanalą į stebimus",
    "block": "Blokuoti kanalą",
    "set_genre": "Nustatyti žanrą",
    "date_approx": "Apytikslė data – „YouTube“ paieška pateikia tik „prieš X metų“",
    "date_unknown": "Įkėlimo data nepateikta",
    "duplicate": "Tikriausiai jau atsisiųsta ({p})",
    "duplicate_title": "Labai panašus pavadinimas ir ta pati trukmė kaip „{title}“ ({p}) – ten jau atsisiųsta arba įtraukta į eilę. Vis tiek galite atsisiųsti.",
    "preview": "Tik peržiūra (Go+) – atsisiųsti negalima",
    "preview_title": "„SoundCloud“ šiam kūriniui pateikia tik 30 sekundžių peržiūrą (Go+). Jo atsisiųsti negalima."
  },
  "discover": {
    "placeholder": "Ieškokite miksų, gyvų setų, DJ, renginių …",
    "search": "Ieškoti",
    "searching_btn": "Ieškoma …",
    "searching": "Ieškoma – paprastas užklausimas, švelnus „YouTube“ atžvilgiu …",
    "sort": "Rikiuoti",
    "sort_rel": "Aktualumas",
    "sort_date": "Naujausi pirmiausia",
    "sort_dur": "Ilgiausi pirmiausia",
    "sort_views": "Daugiausia peržiūrų",
    "quota": "Paieškų šią valandą: {n} / {max}",
    "quota_sc": "„SoundCloud“ paieškų šią valandą: {n} / {max}",
    "placeholder_sc": "Ieškoti „SoundCloud“: miksai, setai, DJ, podkastai …",
    "platform_title": "Kur ieškoti",
    "searching_sc": "Ieškoma – paprastas užklausimas, švelnus „SoundCloud“ atžvilgiu …",
    "ready_text_sc": "Įveskite paieškos frazę ir paspauskite Enter, kad ieškotumėte „SoundCloud“.",
    "previews": "{n} tik peržiūra (Go+)",
    "previews_title": "Go+ peržiūrų atsisiųsti negalima. Matomos, kai išjungta „Slėpti atsisiųstus ir ignoruojamus“.",
    "filters": "Filtrai",
    "toggle_filters": "Rodyti / slėpti filtrų skydelį",
    "f_duration": "Trukmė (minutėmis)",
    "f_min": "Minimumas",
    "f_max": "Maksimumas (tuščia = be ribos)",
    "f_max_ph": "maks.",
    "f_period": "Įkėlimo laikotarpis",
    "f_year": "Metai",
    "f_year_prev": "Metais atgal",
    "f_year_next": "Metais pirmyn",
    "f_from": "Nuo",
    "f_to": "Iki",
    "f_hint_year": "„YouTube“ paieška pateikia tik apytikslę datą („prieš 13 metų“). Todėl taikomas ±1 metų nuokrypis – ir kiekvienas miksas su „{year}“ pavadinime.",
    "f_hint_custom": "„YouTube“ paieška pateikia tik apytikslę datą. Apytikslėms datoms abiejuose galuose taikomas ±1 metų nuokrypis.",
    "chip_title": "Spustelėkite: rodyti / slėpti žanrą · Dukart spustelėkite: tik šis žanras (jo terminai pridedami prie paieškos)",
    "scope": "Paieška išplėsta",
    "scope_title": "Kitoje paieškoje šie terminai bus pridėti prie jūsų paieškos teksto.",
    "searched": "Ieškota su",
    "stale": "Filtrai pasikeitė nuo",
    "re_search": "Ieškoti dar kartą",
    "re_search_title": "Rezultatai gauti iš paskutinės paieškos. Ieškokite dar kartą, kad žanras ir metai būtų įtraukti į paieškos frazę (skaičiuojama kaip viena paieška).",
    "need_query": "Pirmiausia įveskite paieškos frazę.",
    "f_inc": "Įtraukti raktažodžiai",
    "f_exc": "Neįtraukti raktažodžiai",
    "f_show": "Rodymas",
    "f_hide": "Slėpti atsisiųstus ir ignoruojamus",
    "f_blacklist": "Taikyti kanalų juodąjį sąrašą",
    "count": {
      "one": "{n} rezultatas · {hidden} išfiltruota",
      "few": "{n} rezultatai · {hidden} išfiltruota",
      "many": "{n} rezultatų · {hidden} išfiltruota",
      "other": "{n} rezultatų · {hidden} išfiltruota"
    },
    "selected": "Pasirinkta: {n}",
    "select_all": "Pasirinkti viską",
    "download_sel": "Atsisiųsti pasirinktus",
    "ready_title": "Pasiruošę",
    "ready_text": "Įveskite paieškos frazę ir paspauskite Enter.",
    "none_title": "Nieko nerasta",
    "none_text": "Sušvelninkite filtrus arba išbandykite kitas paieškos frazes.",
    "none_year": "Nėra rezultatų iš {year} m. Ieškokite dar kartą, kad metai būtų įtraukti į paieškos frazę, arba pakeiskite metus."
  },
  "inbox": {
    "title": "Gauti",
    "sub": "Nauji stebimų šaltinių radiniai, atitinkantys visus filtrus",
    "sub_n": {
      "one": "{n} naujas stebimų šaltinių radinys, atitinkantis visus filtrus",
      "few": "{n} nauji stebimų šaltinių radiniai, atitinkantys visus filtrus",
      "many": "{n} naujų stebimų šaltinių radinių, atitinkančių visus filtrus",
      "other": "{n} naujų stebimų šaltinių radinių, atitinkančių visus filtrus"
    },
    "ignore_all": "Ignoruoti visus",
    "download_all": "Atsisiųsti visus",
    "ignore_sel": "Ignoruoti pasirinktus",
    "download_sel": "Atsisiųsti pasirinktus",
    "select_all": "Pasirinkti viską",
    "select_none": "Išvalyti pasirinkimą",
    "src_all": "Visi šaltiniai",
    "src_none": "Be šaltinio",
    "src_title": "Rodyti tik šio šaltinio radinius",
    "count": {
      "one": "{n} radinys",
      "few": "{n} radiniai",
      "many": "{n} radinių",
      "other": "{n} radinių"
    },
    "count_of": "{n} iš {total} radinių",
    "selected": "Pasirinkta: {n}",
    "empty_title": "Gautų nėra",
    "empty_text": "Stebimi šaltiniai naujų miksų nerado.",
    "empty_nosrc": "Stebimų šaltinių dar nėra – pridėkite kanalą, grojaraštį ar paiešką, ir nauji miksai atsidurs čia.",
    "empty_next": "Kita patikra: {t}.",
    "to_watchlist": "Eiti į stebimus"
  },
  "watchlist": {
    "title": "Stebimi šaltiniai",
    "sub_n": {
      "one": "{n} šaltinis · {active} aktyvūs",
      "few": "{n} šaltiniai · {active} aktyvūs",
      "many": "{n} šaltinių · {active} aktyvūs",
      "other": "{n} šaltinių · {active} aktyvūs"
    },
    "sub_next": "kita patikra {t}",
    "add": "Šaltinis",
    "check_all": "Patikrinti visus dabar",
    "check": "Tikrinti",
    "checking": "tikrinama …",
    "queued": "laukiama …",
    "running": "Tikrinama …",
    "running_n": "Tikrinama {i} / {n} …",
    "col_active": "Aktyvus",
    "col_name": "Pavadinimas",
    "col_type": "Tipas",
    "col_genre": "Žanras",
    "col_auto": "Nauji radiniai",
    "col_max": "Maks.",
    "col_last": "Paskutinė patikra",
    "col_new": "Nauji",
    "genre_auto": "automatinis",
    "genre_auto_long": "Automatinis (pagal raktažodžius)",
    "auto_on": "atsisiųsti",
    "auto_off": "gauti",
    "auto_title_on": "Nauji radiniai atsisiunčiami automatiškai",
    "auto_title_off": "Nauji radiniai patenka tik į gautus",
    "new_title": "Rodyti gautuose",
    "check_title": "Patikrinti šį šaltinį dabar",
    "why_off": "Šaltinis neaktyvus",
    "why_running": "Patikra jau vyksta",
    "why_backoff": "Pauzė aktyvi – tikrinti negalima",
    "why_backoff_p": "Pauzė ({p}) aktyvi – tikrinti negalima",
    "why_sc_off": "„SoundCloud“ išjungta",
    "error_title": "Paskutinė patikra nepavyko",
    "backoff": "<b>Pauzė aktyvi iki {t}</b> (liko {rest}). Stebimų šaltinių tikrinti negalima – suplanuotos patikros taip pat sustabdytos.",
    "backoff_p": "<b>Pauzė ({p}) aktyvi iki {t}</b> (liko {rest}). {p} šaltiniai iki tol praleidžiami – {other} veikia toliau.",
    "backoff_link_sc": "Atidaryti „SoundCloud“",
    "backoff_link": "Atidaryti spartos ribojimą",
    "none_active": "Nėra aktyvaus šaltinio tikrinti",
    "empty_title": "Šaltinių nėra",
    "empty_text": "Pridėkite kanalą, grojaraštį arba išsaugotą paiešką.",
    "add_title": "Pridėti šaltinį",
    "edit_title": "Redaguoti šaltinį",
    "f_type": "Tipas",
    "f_name": "Pavadinimas",
    "f_url": "URL",
    "f_query": "Paieškos frazė",
    "f_genre": "Numatytasis žanras",
    "f_max": "Maks. įrašų",
    "f_newest_last": "Naujausi yra gale (skaityti grojaraštį atvirkščiai)",
    "hint_newest_last": "Daugelyje grojaraščių „YouTube“ naujus vaizdo įrašus prideda gale. Perskaito visą grojaraštį (apie 1 užklausa per 100 vaizdo įrašų, maks. 2000 įrašų).",
    "rev_title": "Naujausi yra gale – grojaraštis skaitomas nuo galo",
    "rev_short": "atvirkščiai",
    "f_enabled": "Aktyvus – įtraukti į „Tikrinti visus“ ir tvarkaraštį",
    "f_hits": "Nauji radiniai",
    "hits_inbox": "Į gautus",
    "hits_auto": "Atsisiųsti automatiškai",
    "hint_inbox": "Radiniai laukia gautuose, kol juos atsisiųsite arba ignoruosite.",
    "hint_auto": "Radiniai, atitinkantys visus filtrus, iškart patenka į eilę.",
    "hint_channel": "„YouTube“ kanalas (…/@vardas arba …/channel/UC…, pasirinktinai /videos arba /streams) arba „SoundCloud“ profilis (soundcloud.com/vardas).",
    "hint_playlist": "„YouTube“ grojaraštis su „list=…“ arba „SoundCloud“ rinkinys (soundcloud.com/vardas/sets/rinkinys). Tikrinami naujausi įrašai.",
    "f_platform": "Ieškoti",
    "detected": "atpažinta: {p} · {type}",
    "not_detected": "URL neatpažintas",
    "suggested": "Pasiūlymas",
    "suggested_title": "Pasiūlyta pagal URL. Jei nepakeista, pirmoji patikra pakeis tikru pavadinimu – arba tiesiog perrašykite.",
    "hint_name_auto": "Pasiūlyta pagal URL – galite laisvai keisti. Jei nepakeista, pirmoji patikra nustatys tikrą pavadinimą.",
    "hint_name_later": "Pavadinimas nustatomas per pirmąją patikrą – arba įveskite patys.",
    "name_auto_title": "Laikinas pavadinimas – kita patikra nustatys tikrą",
    "hint_search": "Išsaugota paieška kaip skiltyje „Paieška“ – kiekviena patikra skaičiuojama kaip viena paieška.",
    "hint_max": "per patikrą",
    "max_default": "(numatyta)",
    "max_default_title": "Savos reikšmės nėra: galioja „Įrašų per šaltinį“ iš Nustatymai › Tvarkaraštis",
    "max_title": "Tuščia = numatytoji iš Nustatymai › Tvarkaraštis. Daugiausia 200, paieškos šaltiniams – 100.",
    "ph_name": "pvz., Gabber Vault",
    "ph_name_later": "nustatoma per pirmąją patikrą",
    "ph_channel": "https://www.youtube.com/@kanalas  arba  https://soundcloud.com/vardas",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  arba  https://soundcloud.com/vardas/sets/…",
    "ph_search": "pvz., frenchcore liveset",
    "form_error": "Šaltinio išsaugoti nepavyko."
  },
  "downloads": {
    "title": "Atsisiuntimai",
    "sub": "Paeiliui, vienas atsisiuntimas vienu metu",
    "pause": "Pristabdyti",
    "resume": "Tęsti",
    "cancel": "Atšaukti",
    "retry": "Bandyti dar kartą",
    "remove": "Pašalinti",
    "up": "Perkelti aukštyn",
    "down": "Perkelti žemyn",
    "eta": "Liko",
    "position": "Pozicija {n}",
    "sleep_left": "tęsiama po",
    "sleep_why": "Spartos ribojimas: atsitiktinė {min}–{max} s pauzė tarp dviejų atsisiuntimų",
    "next_up": "Toliau",
    "sleeping": "Pauzė",
    "sleep_range": "iš {min}–{max} s",
    "blocked_wait": "Laukiama – {why}",
    "why_backoff": "Pauzė",
    "why_day": "Dienos limitas",
    "why_run": "Paleidimo limitas",
    "why_paused": "pristabdyta",
    "why_restart": "Reikia paleisti iš naujo",
    "why_busy": "veikia kitas paleidimas",
    "why_pot": "PO-Token serveris nepasiruošęs",
    "why_target": "Paskirties aplankas nepasiekiamas",
    "why_error": "Trūksta atsisiuntimo modulio",
    "summary": "Šiandien {day}/{day_max} · Paleidimas {run}/{run_max}",
    "summary_sc": "„SoundCloud“ {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} atsisiunčia toliau.",
    "steps": "Atsisiuntimas · Konvertavimas · Žymėjimas",
    "unlimited": "neribota",
    "l_run": "Šis paleidimas",
    "l_day": "Šiandien",
    "l_rate": "Spartos riba",
    "l_sleep": "Pauzė tarp atsisiuntimų",
    "sec_queue": "Eilė",
    "sec_failed": "Nepavyko",
    "empty_title": "Eilė tuščia",
    "empty_text": "Pasirinkite miksus skiltyje „Paieška“ arba „Gauti“.",
    "paused": "<b>Eilė pristabdyta.</b> Vykstantis atsisiuntimas sustabdytas, kol tęsite.",
    "backoff": "<b>Pauzė aktyvi iki {t}</b> (liko {rest}). Atsisiuntimai, paieška ir stebimi šaltiniai užblokuoti.",
    "backoff_rest": {
      "one": "<b>Pauzė aktyvi iki {t}</b> (liko {rest}). Atsisiuntimai, paieška ir stebimi šaltiniai užblokuoti – eilėje lieka {n}.",
      "few": "<b>Pauzė aktyvi iki {t}</b> (liko {rest}). Atsisiuntimai, paieška ir stebimi šaltiniai užblokuoti – eilėje lieka {n}.",
      "many": "<b>Pauzė aktyvi iki {t}</b> (liko {rest}). Atsisiuntimai, paieška ir stebimi šaltiniai užblokuoti – eilėje lieka {n}.",
      "other": "<b>Pauzė aktyvi iki {t}</b> (liko {rest}). Atsisiuntimai, paieška ir stebimi šaltiniai užblokuoti – eilėje lieka {n}."
    },
    "limit_day": "<b>Pasiektas dienos limitas ({n}/{max}).</b> Likusieji lieka eilėje ir bus tęsiami rytoj.",
    "limit_day_rest": {
      "one": "<b>Pasiektas dienos limitas ({n}/{max}).</b> Eilėje lieka {rest}, jie bus tęsiami rytoj.",
      "few": "<b>Pasiektas dienos limitas ({n}/{max}).</b> Eilėje lieka {rest}, jie bus tęsiami rytoj.",
      "many": "<b>Pasiektas dienos limitas ({n}/{max}).</b> Eilėje lieka {rest}, jie bus tęsiami rytoj.",
      "other": "<b>Pasiektas dienos limitas ({n}/{max}).</b> Eilėje lieka {rest}, jie bus tęsiami rytoj."
    },
    "limit_run": "<b>Pasiektas limitas – {max}/{max} šiame paleidime.</b> Likusieji lieka eilėje ir bus tęsiami kitame paleidime.",
    "limit_run_rest": {
      "one": "<b>Pasiektas limitas – {max}/{max} šiame paleidime.</b> Eilėje lieka {rest}, jie bus tęsiami kitame paleidime.",
      "few": "<b>Pasiektas limitas – {max}/{max} šiame paleidime.</b> Eilėje lieka {rest}, jie bus tęsiami kitame paleidime.",
      "many": "<b>Pasiektas limitas – {max}/{max} šiame paleidime.</b> Eilėje lieka {rest}, jie bus tęsiami kitame paleidime.",
      "other": "<b>Pasiektas limitas – {max}/{max} šiame paleidime.</b> Eilėje lieka {rest}, jie bus tęsiami kitame paleidime."
    },
    "limits_link": "Keisti limitus",
    "new_run": "Pradėti naują paleidimą",
    "need_restart": "<b>Reikia paleisti iš naujo.</b> yt-dlp buvo atnaujintas – paleiskite HCLoader iš naujo. Eilė išsaugoma.",
    "busy": "Veikia kitas atsisiuntimo paleidimas (pvz., suplanuota patikra). Eilė laukia, kol jis baigsis.",
    "local_pot": {
      "one": "<b>PO-Token serveris nepasiruošęs.</b> Eilėje lieka {rest}; tęsis, kai tik serveris pradės veikti.",
      "few": "<b>PO-Token serveris nepasiruošęs.</b> Eilėje lieka {rest}; tęsis, kai tik serveris pradės veikti.",
      "many": "<b>PO-Token serveris nepasiruošęs.</b> Eilėje lieka {rest}; tęsis, kai tik serveris pradės veikti.",
      "other": "<b>PO-Token serveris nepasiruošęs.</b> Eilėje lieka {rest}; tęsis, kai tik serveris pradės veikti."
    },
    "local_target": {
      "one": "<b>Paskirties aplankas nepasiekiamas arba neįrašomas.</b> Eilėje lieka {rest}; tęsis, kai tik aplankas vėl bus prieinamas.",
      "few": "<b>Paskirties aplankas nepasiekiamas arba neįrašomas.</b> Eilėje lieka {rest}; tęsis, kai tik aplankas vėl bus prieinamas.",
      "many": "<b>Paskirties aplankas nepasiekiamas arba neįrašomas.</b> Eilėje lieka {rest}; tęsis, kai tik aplankas vėl bus prieinamas.",
      "other": "<b>Paskirties aplankas nepasiekiamas arba neįrašomas.</b> Eilėje lieka {rest}; tęsis, kai tik aplankas vėl bus prieinamas."
    },
    "local_error": {
      "one": "<b>Nepavyko įkelti atsisiuntimo modulio (yt-dlp).</b> Eilėje lieka {rest}. Kitas bandymas – paspaudus „Tęsti“, pridėjus naujų įrašų arba išsaugojus nustatymus.",
      "few": "<b>Nepavyko įkelti atsisiuntimo modulio (yt-dlp).</b> Eilėje lieka {rest}. Kitas bandymas – paspaudus „Tęsti“, pridėjus naujų įrašų arba išsaugojus nustatymus.",
      "many": "<b>Nepavyko įkelti atsisiuntimo modulio (yt-dlp).</b> Eilėje lieka {rest}. Kitas bandymas – paspaudus „Tęsti“, pridėjus naujų įrašų arba išsaugojus nustatymus.",
      "other": "<b>Nepavyko įkelti atsisiuntimo modulio (yt-dlp).</b> Eilėje lieka {rest}. Kitas bandymas – paspaudus „Tęsti“, pridėjus naujų įrašų arba išsaugojus nustatymus."
    },
    "local_link_pot": "Tinklo nustatymai",
    "local_link_target": "Keisti saugojimo vietą",
    "local_link_error": "Priežiūra"
  },
  "library": {
    "title": "Biblioteka",
    "sub": {
      "one": "{n} miksas",
      "few": "{n} miksai",
      "many": "{n} miksų",
      "other": "{n} miksų"
    },
    "sub_shown": "Rodoma {n} iš {total}",
    "search": "Pavadinimas, kanalas arba kelias …",
    "all_genres": "Visi žanrai",
    "all_channels": "Visi kanalai",
    "all_years": "Visi metai",
    "f_genre": "Žanras",
    "f_channel": "Kanalas",
    "f_year": "Metai",
    "f_sort": "Rikiavimas",
    "sort_newest": "Naujausi pirmiausia",
    "sort_title": "Pavadinimas A–Ž",
    "sort_channel": "Kanalas A–Ž",
    "sort_duration": "Ilgiausi pirmiausia",
    "view_list": "Sąrašas",
    "view_grid": "Plytelės",
    "clear": "Atstatyti filtrus",
    "col_title": "Pavadinimas",
    "col_channel": "Kanalas",
    "col_genre": "Žanras",
    "col_year": "Metai",
    "col_duration": "Trukmė",
    "col_size": "Dydis",
    "col_loaded": "Atsisiųsta",
    "play": "Groti",
    "pause": "Pauzė",
    "play_external": "Atidaryti numatytajame grotuve",
    "play_internal": "Groti programos grotuve",
    "play_missing": "Failo nėra – groti negalima",
    "more": "Rodyti dar {n}",
    "now_playing": "Dabar groja",
    "retag_short": "Pažymėti iš naujo",
    "genre_working": "Nustatomas žanras …",
    "open_folder": "Atidaryti aplanką",
    "retag": "Pažymėti iš naujo (žymos, viršelis ir vieta pagal dabartinius nustatymus)",
    "delete": "Ištrinti failą",
    "remove": "Pašalinti įrašą",
    "retagging": "Žymima iš naujo …",
    "cue_title": "Takelių sąrašas kaip .cue failas šalia MP3",
    "missing": "Failo nėra",
    "missing_title": "Failas nerastas išsaugotoje vietoje (perkeltas ar ištrintas?)",
    "missing_chip": {
      "one": "trūksta {n}",
      "few": "trūksta {n}",
      "many": "trūksta {n}",
      "other": "trūksta {n}"
    },
    "missing_chip_title": "Rodyti tik įrašus, kurių failo nėra",
    "stat_count": "Miksai",
    "stat_duration": "Bendra trukmė",
    "stat_size": "Dydis",
    "stat_genres": "Pagal žanrą",
    "unit_h": "val.",
    "unit_min": "min.",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} miksas · {dur}",
      "few": "{n} miksai · {dur}",
      "many": "{n} miksų · {dur}",
      "other": "{n} miksų · {dur}"
    },
    "empty_title": "Dar nieko neatsisiųsta",
    "empty_text": "Kiekvienas miksas čia atsiranda, kai tik jis atsisiunčiamas ir pažymimas – su viršeliu, žanru ir vieta.",
    "empty_discover": "Atraskite miksus",
    "empty_watchlist": "Sukurti stebimų šaltinių sąrašą",
    "target_down": "Paskirties aplankas nepasiekiamas: {path}",
    "target_down_hint": "Patikrinkite diską arba tinklo išteklių. Kol jo nėra, failų būsena nežinoma: „Pažymėti iš naujo“ ir „Pašalinti įrašą“ išjungti.",
    "unknown_title": "Paskirties aplankas nepasiekiamas – failo būsena nežinoma",
    "none_title": "Nieko nerasta",
    "none_text": "Nė vienas įrašas neatitinka paieškos ir filtrų.",
    "group_by": "Grupuoti pagal",
    "group_none": "Nėra",
    "group_genre": "Žanras",
    "group_festival": "Festivalis",
    "group_artist": "Atlikėjas",
    "group_year": "Metai",
    "group_unknown": "Nežinoma",
    "continue": "Klausyti toliau",
    "continue_title": "Tęsti „{title}“ nuo {t}",
    "continue_left": "liko {t}",
    "continue_forget": "Pašalinti iš „Klausyti toliau“"
  },
  "player": {
    "label": "Mini grotuvas",
    "play": "Groti (tarpas)",
    "pause": "Pauzė (tarpas)",
    "back": "30 sekundžių atgal",
    "fwd": "30 sekundžių pirmyn",
    "prev": "Ankstesnis takelis",
    "next": "Kitas takelis",
    "seek": "Pozicija",
    "mute": "Nutildyti",
    "unmute": "Įjungti garsą",
    "volume": "Garsumas",
    "close": "Uždaryti grotuvą",
    "tracks": "Takelių sąrašas",
    "tracks_n": {
      "one": "{n} takelis",
      "few": "{n} takeliai",
      "many": "{n} takelių",
      "other": "{n} takelių"
    },
    "tracks_toggle": "Rodyti / slėpti takelių sąrašą",
    "no_tracks": "Šiame faile skyrių nėra",
    "total": "Bendra trukmė {t}",
    "keys": "Tarpas: groti/pauzė · ←/→: 10 s",
    "err_load": "Groti nepavyksta",
    "err_src": "Groti nepavyksta: neteisingas failo adresas",
    "err_play": "Failo groti nepavyksta: {title}",
    "external": "Atidaroma numatytajame grotuve …",
    "norm_title": "Garsumas suvienodintas: {lufs} LUFS → tikslas {target} LUFS ({gain})",
    "norm_capped": "tik sumažinta – stiprinti reikia garso variklio",
    "resume_q": "Tęsti nuo ten, kur baigėte?",
    "resume_at": "ties {t}",
    "resume": "Tęsti",
    "restart": "Nuo pradžios",
    "resumed_at": "Tęsiama nuo {t}",
    "sleep": "Miego laikmatis",
    "sleep_min": "{n} min.",
    "sleep_end": "Šio seto pabaiga",
    "sleep_end_short": "pabaiga",
    "sleep_off": "Išjungti",
    "sleep_on": "Laikmatis: sustos po {t}",
    "sleep_end_on": "Laikmatis: sustos šio seto pabaigoje",
    "sleep_done": "Laikmatis: atkūrimas sustabdytas"
  },
  "log": {
    "title": "Žurnalas",
    "sub": "Tiesioginis žurnalas ir paleidimų istorija",
    "live": "Tiesioginis žurnalas",
    "history": "Paleidimų istorija",
    "lvl_debug": "Derinimas",
    "lvl_info": "Info",
    "lvl_warn": "Įspėjimas",
    "lvl_error": "Klaida",
    "lvl_title": "Rodyti / slėpti lygį „{lvl}“",
    "search": "Ieškoti žurnale …",
    "following": "Tiesiogiai",
    "paused": "Pristabdyta",
    "follow_title": "Automatiškai slinkti iki naujausios eilutės (pristabdoma slenkant aukštyn)",
    "jump": "Į pabaigą",
    "jump_new": {
      "one": "{n} nauja eilutė",
      "few": "{n} naujos eilutės",
      "many": "{n} naujų eilučių",
      "other": "{n} naujų eilučių"
    },
    "copy": "Kopijuoti",
    "copy_title": "Kopijuoti matomas eilutes į iškarpinę",
    "open_logs": "Žurnalo aplankas",
    "open_logs_title": "Atidaryti aplanką su pilnais žurnalo failais",
    "lines": {
      "one": "{n} eilutė",
      "few": "{n} eilutės",
      "many": "{n} eilučių",
      "other": "{n} eilučių"
    },
    "lines_of": "{n} iš {total} eilučių",
    "empty": "Šiems lygiams eilučių nėra.",
    "empty_search": "Nė viena eilutė neturi „{q}“.",
    "no_runs": "Paleidimų dar nėra.",
    "no_runs_kind": "Tokio tipo paleidimų nėra.",
    "found": "rasta",
    "downloaded": "atsisiųsta",
    "errors": "klaidų",
    "running": "vykdoma …",
    "kind_all": "Visi",
    "timeline": "Laiko juosta",
    "table": "Lentelė",
    "view_title": "Paleidimų istorijos rodinys",
    "col_kind": "Tipas",
    "col_start": "Pradžia",
    "col_duration": "Trukmė",
    "col_found": "Rasta",
    "col_downloaded": "Atsisiųsta",
    "col_errors": "Klaidos",
    "col_note": "Pastaba",
    "backoff": "Pauzė",
    "runs_sum": {
      "one": "{n} paleidimas · {dl} atsisiųsta · {err} klaidų",
      "few": "{n} paleidimai · {dl} atsisiųsta · {err} klaidų",
      "many": "{n} paleidimų · {dl} atsisiųsta · {err} klaidų",
      "other": "{n} paleidimų · {dl} atsisiųsta · {err} klaidų"
    },
    "today": "Šiandien",
    "yesterday": "Vakar"
  },
  "settings": {
    "title": "Nustatymai",
    "sub": "Čia galima sukonfigūruoti viską, ką programa daro"
  },
  "tabs": {
    "general": "Bendra",
    "filters": "Filtrai ir raktažodžiai",
    "genres": "Žanrai",
    "download": "Atsisiuntimas ir kokybė",
    "storage": "Saugykla ir žymos",
    "throttle": "Spartos ribojimas",
    "soundcloud": "SoundCloud",
    "network": "Tinklas ir PO-Token",
    "schedule": "Tvarkaraštis",
    "appearance": "Išvaizda",
    "maintenance": "Priežiūra",
    "festivals": "Festivaliai ir serijos",
    "playback": "Atkūrimas"
  },
  "tabs_hint": {
    "general": "Pagrindinis programos elgesys.",
    "filters": "Numatytieji paieškos ir stebimų šaltinių filtrai. Laikinai galima pakeisti filtrų skydelyje skiltyje „Paieška“.",
    "genres": "Tvarka = prioritetas. Laimi pirmasis žanras, kurio raktažodis yra pavadinime. Rankiniu būdu nustatyti žanrai ir šaltinio numatytasis žanras turi pirmenybę.",
    "download": "„YouTube“ paprastai pateikia „Opus“ apie 130–160 kbps greičiu. MP3 yra konvertavimas ir skamba ne geriau už šaltinį – bet groja visur.",
    "storage": "Kur patenka failai ir kaip jie pavadinami. Struktūra skirta medijų serveriams, pvz., Plex ar Jellyfin.",
    "throttle": "Riboja apkrovą „YouTube“. Šios reikšmės galioja paieškai, stebimiems šaltiniams ir atsisiuntimams kartu. „SoundCloud“ turi savas reikšmes skirtuke „SoundCloud“.",
    "soundcloud": "„SoundCloud“ kaip antrasis paieškos, stebimų šaltinių ir atsisiuntimų šaltinis – su savais limitais, skaitikliais ir pauze, nepriklausomai nuo „YouTube“.",
    "network": "PO-Token identifikuoja užklausas kaip tikro naršyklės ir sumažina botų blokavimo riziką.",
    "schedule": "Kada stebimi šaltiniai tikrinami automatiškai – programoje ir per „Windows“ užduočių planuoklį.",
    "appearance": "Išvaizda ir pojūtis. Pakeitimai matomi iškart ir tampa nuolatiniai tik po išsaugojimo.",
    "maintenance": "Versijos, naujinimai, duomenų bazė.",
    "festivals": "Atpažįsta festivalį ar seriją, metus, sceną ir seto tipą iš išsaugotų pavadinimų – neprisijungus, be nė vienos papildomos užklausos.",
    "playback": "Integruotas grotuvas, garsumo suvienodinimas, įsimintos pozicijos ir jūsų failų analizė neprisijungus."
  },
  "set": {
    "default": "Numatyta",
    "range": "Intervalas",
    "browse": "Naršyti",
    "not_set": "nenustatyta",
    "saving": "Įrašoma …",
    "discard": "Atmesti",
    "tab_reset": "Atstatyti skirtuką",
    "tab_reset_title": "Nustatyti visus šio skirtuko laukus į numatytuosius (įsigalioja tik po „Įrašyti“)",
    "state_clean": "Viskas įrašyta",
    "state_dirty": {
      "one": "{n} neįrašytas pakeitimas",
      "few": "{n} neįrašyti pakeitimai",
      "many": "{n} neįrašytų pakeitimų",
      "other": "{n} neįrašytų pakeitimų"
    },
    "state_errors": {
      "one": "{n} klaida – pataisykite",
      "few": "{n} klaidos – pataisykite",
      "many": "{n} klaidų – pataisykite",
      "other": "{n} klaidų – pataisykite"
    },
    "h": {
      "collector": "Festivalių rinkėjas",
      "search": "Paieška",
      "duration": "Trukmė ir laikotarpis",
      "keywords": "Raktažodžiai",
      "display": "Rodymas",
      "cover": "Viršelis",
      "chapters": "Skyriai ir takelių sąrašas",
      "tags": "Žymos",
      "soundcloud": "SoundCloud",
      "playback": "Grojimas",
      "pauses": "Pauzės ir pralaidumas",
      "limits": "Limitai",
      "backoff": "Pauzė po blokavimo",
      "po": "PO-Token tiekėjas",
      "fallback": "Apeinamieji sprendimai",
      "in_app": "Programoje",
      "task": "„Windows“ užduočių planuoklis",
      "updates": "Naujinimai",
      "app_update": "Programos naujinimas",
      "release_notes": "Leidimo pastabos",
      "database": "Duomenų bazė",
      "reset": "Atstatymas",
      "detection": "Atpažinimas",
      "series": "Serijos",
      "backfill": "Nuskaityti viską (vieną kartą)",
      "loudness": "Garsumas",
      "memory": "Atmintis ir bangos forma",
      "analysis": "Analizė (neprisijungus, ffmpeg)"
    },
    "general": {
      "language": {
        "label": "Kalba",
        "help": "Sąsajos ir pranešimų kalba. „Automatinė“ seka „Windows“ rodymo kalbą (kitaip – anglų). Rodinys perkuriamas iškart po įrašymo."
      },
      "start_view": {
        "label": "Pradžios rodinys",
        "help": "Kuris rodinys atidaromas paleidus."
      },
      "log_level": {
        "label": "Žurnalo lygis",
        "help": "Kiek išsamus žurnalo failas ir tiesioginis žurnalas. DEBUG tik trikčių šalinimui."
      },
      "confirm_delete": {
        "label": "Patvirtinti ištrynimą",
        "help": "Paklausti prieš ištrinant miksą iš bibliotekos (įrašas + failas)."
      }
    },
    "player": {
      "mode": {
        "label": "Groti naudojant",
        "help": "Ką naudoja ▶ bibliotekoje. Integruotas grotuvas rodo skyrius kaip šuolio žymes ir toliau groja keičiant rodinius. Kita parinktis pasiekiama kiekvieno įrašo meniu."
      },
      "normalize": {
        "label": "Suvienodinti garsumą",
        "help": "Kiekvieną setą groja vienodu suvokiamu garsumu (ReplayGain iš analizės neprisijungus arba esamų žymų). Niekada neiškraipo: stiprinimą riboja išmatuotas true peak."
      },
      "target_lufs": {
        "label": "Tikslinis garsumas",
        "help": "−18 LUFS – ReplayGain 2.0 etalonas. Didesnis (pvz., −14) = garsiau, bet daugiau setų pasiekia savo piko ribą."
      },
      "resume": {
        "label": "Įsiminti poziciją",
        "help": "Kiekvienam setui, už pirmų ir paskutinių 30 sekundžių ribų. „Klausti“ siūlo tęsti, „Automatiškai“ tęsia tyliai. Biblioteka rodo penkis paskutinius nebaigtus setus."
      },
      "waveform": {
        "label": "Bangos forma kaip laiko juosta",
        "help": "Rodo setą kaip bangos formą su grojaraščio žymomis. Apskaičiuojama vieną kartą kiekvienam failui su ffmpeg (pirmą kartą grojant arba analizės metu); kitaip – paprasta juosta."
      }
    },
    "search": {
      "results_count": {
        "label": "Rezultatų per paiešką",
        "help": "Rezultatų skaičius, kurį paieška gauna (flat). Daugiau rezultatų = didesnė apkrova „YouTube“."
      },
      "append_year": {
        "label": "Pridėti metus prie paieškos",
        "help": "Su įkėlimo laikotarpiu „Konkretūs metai“ metai pridedami prie paieškos frazės (pvz., „hardcore liveset 2013“). Taip „YouTube“ randa daugiau tų metų miksų."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Minimali trukmė",
        "help": "Trumpesni vaizdo įrašai niekada nelaikomi miksu."
      },
      "max_duration": {
        "label": "Maksimali trukmė",
        "help": "0 = neribota."
      },
      "upload_period": {
        "label": "Įkėlimo laikotarpis",
        "help": "Kokie įkėlimai rodomi pagal nutylėjimą. „Konkretūs metai“ rodo tik vienų metų miksus, „Pasirinktinis“ – nuo/iki intervalą."
      },
      "upload_year": {
        "label": "Metai",
        "help": "Miksas skaičiuojamas, jei įkėlimo metai sutampa arba metai yra pavadinime. „YouTube“ paieška pateikia tik apytikslę datą – ten taikomas ±1 metų nuokrypis."
      },
      "upload_from": {
        "label": "Nuo",
        "help": "Ankstyviausia įkėlimo data. Tuščia = atvira."
      },
      "upload_to": {
        "label": "Iki",
        "help": "Vėliausia įkėlimo data. Tuščia = atvira. Apytikslėms datoms abiejuose galuose taikomas ±1 metų nuokrypis."
      },
      "include_keywords": {
        "label": "Įtraukti raktažodžiai",
        "help": "Bent vienas turi būti pavadinime. Tuščia = leisti viską. Enter arba kablelis prideda."
      },
      "exclude_keywords": {
        "label": "Neįtraukti raktažodžiai",
        "help": "Jei vienas iš jų yra pavadinime, vaizdo įrašas atmetamas."
      },
      "match_description": {
        "label": "Ieškoti aprašyme",
        "help": "Raktažodžiai tikrinami ir vaizdo įrašo aprašyme. Flat užklausos jo dažnai nepateikia."
      },
      "hide_done_ignored": {
        "label": "Slėpti atsisiųstus ir ignoruojamus",
        "help": "Slėpti jau atsisiųstus ir ignoruojamus vaizdo įrašus rezultatuose."
      },
      "apply_channel_blacklist": {
        "label": "Taikyti kanalų juodąjį sąrašą",
        "help": "Niekada nerodyti užblokuotų kanalų vaizdo įrašų."
      },
      "hide_cross_platform_duplicates": {
        "label": "Slėpti platformų dublikatus",
        "help": "Slėpti radinius, kurie tikriausiai jau atsisiųsti arba įtraukti į eilę iš kitos platformos („YouTube“ ar „SoundCloud“) – ta pati trukmė (±5 s) ir labai panašus pavadinimas. Išjungta: jie rodomi su pastaba „Tikriausiai jau atsisiųsta“."
      }
    },
    "blacklist": {
      "label": "Užblokuoti kanalai",
      "help": "Kanalus blokuojate per kortelės meniu. Čia galite juos vėl atblokuoti.",
      "none": "Užblokuotų kanalų nėra",
      "unblock": "Atblokuoti"
    },
    "genres": {
      "add": "Žanras",
      "up": "Didesnis prioritetas",
      "down": "Mažesnis prioritetas",
      "delete": "Ištrinti žanrą",
      "color": "Pasirinkti spalvą",
      "name_ph": "Pavadinimas",
      "kw_ph": "+ raktažodis",
      "fallback": "Atsarginis – taikomas, kai joks raktažodis netinka. Visada yra, visada paskutinis."
    },
    "download": {
      "audio_format": {
        "label": "Išvesties formatas",
        "help": "MP3 arba palikti originalų „YouTube“ formatą be konvertavimo."
      },
      "mp3_quality": {
        "label": "MP3 kokybė",
        "help": "320 kbps CBR yra suderinamiausias, V0 VBR sutaupo šiek tiek vietos."
      },
      "embed_cover": {
        "label": "Įterpti viršelį",
        "help": "Įrašyti miniatiūrą, apkarpytą į kvadratą, į failą kaip viršelį."
      },
      "write_cover_jpg": {
        "label": "Taip pat įrašyti cover.jpg",
        "help": "Medijų serveriams, kurie skaito aplankų viršelius."
      },
      "write_cue": {
        "label": "Įrašyti .cue failą",
        "help": "Takelių sąrašas iš skyrių arba laiko žymų aprašyme, šalia garso failo."
      },
      "write_id3_chapters": {
        "label": "Įrašyti ID3 skyrius",
        "help": "Įterpti skyrių žymes (CHAP/CTOC) tiesiai į MP3."
      },
      "keep_original_soundcloud": {
        "label": "Palikti „SoundCloud“ originalą",
        "help": "Įrašyti „SoundCloud“ garsą nepakeistą (AAC 160 kbps kaip .m4a, MP3 128 kbps kaip .mp3) – be antro nuostolingo konvertavimo. Išjungta: kaip „Išvesties formatas“."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Paskirties aplankas",
        "help": "Muzikos saugyklos šaknis. Laikini failai laikomi „.tmp“ po ja. Nešiojamoje versijoje santykinis kelias, pvz., „.\\Music“, aiškinamas pagal programos aplanką (pvz., USB atmintinėje)."
      },
      "path_template": {
        "label": "Kelio šablonas",
        "help": "Santykinis paskirties aplanko atžvilgiu, be failo plėtinio. „/“ skiria aplankus. Privalo būti {id} („SoundCloud“ – „sc-<id>“). {platform} tampa „YouTube“ arba „SoundCloud“ – pvz., kaip viršutinis aplankas šaltiniams atskirti."
      },
      "max_title_length": {
        "label": "Maks. pavadinimo ilgis",
        "help": "Ilgesni pavadinimai failo varde sutrumpinami."
      },
      "max_path_length": {
        "label": "Maks. kelio ilgis",
        "help": "Pilnas kelias su paskirties aplanku. Be papildomos konfigūracijos „Windows“ leidžia 259 simbolius."
      },
      "artist_from_title": {
        "label": "Nuskaityti atlikėją iš pavadinimo",
        "help": "Atpažinti šablonus „ATLIKĖJAS @ RENGINYS“ ir „ATLIKĖJAS - PAVADINIMAS“, kitaip naudoti kanalo pavadinimą."
      },
      "title_cleanup_patterns": {
        "label": "Išvalyti pavadinimą",
        "help": "Reguliarieji reiškiniai, kurių atitikmenys pašalinami iš pavadinimo. Enter prideda.",
        "ph": "+ regex"
      },
      "album_from_edition": {
        "label": "Albumas = laida",
        "help": "Įrašo laidą (pvz., „Defqon.1 2024“) kaip albumo žymą, kad Plex ir Jellyfin visus festivalio setus rodytų kaip vieną albumą. Išjungta: albumas = pavadinimas, kaip anksčiau."
      }
    },
    "path_preview": {
      "label": "Peržiūra",
      "help": "Spustelėkite vietos žymes, kad įterptumėte jas į kelio šabloną.",
      "fest": "{festival}, {event_year} ir {stage} užpildomi tik tada, kai priskirtas festivalis. Kitu atveju jie išnyksta kartu su likusiais skyrikliais ir tuščiais aplankais."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pauzė tarp užklausų",
        "help": "Laukimo laikas tarp metaduomenų užklausų (paieška, stebimi šaltiniai)."
      },
      "sleep_interval": {
        "label": "Atsisiuntimo pauzė – minimumas",
        "help": "Po kiekvieno atsisiuntimo seka atsitiktinė pauzė tarp minimumo ir maksimumo."
      },
      "max_sleep_interval": {
        "label": "Atsisiuntimo pauzė – maksimumas",
        "help": "Atsitiktinės pauzės viršutinė riba."
      },
      "limit_rate_mb": {
        "label": "Atsisiuntimo sparta",
        "help": "Maksimalus pralaidumas. 0 = neribota (nerekomenduojama)."
      },
      "max_downloads_per_run": {
        "label": "Maks. atsisiuntimų per paleidimą",
        "help": "Likusieji lieka eilėje."
      },
      "max_downloads_per_day": {
        "label": "Maks. atsisiuntimų per dieną",
        "help": "Skaitiklis apima rankinius ir automatinius atsisiuntimus kartu."
      },
      "max_searches_per_hour": {
        "label": "Maks. paieškų per valandą",
        "help": "Apsaugo nuo atsitiktinės nesibaigiančios paieškos."
      },
      "backoff_initial_hours": {
        "label": "Pauzė – pradinė reikšmė",
        "help": "Blokavimo laikas po HTTP 429 arba „confirm you’re not a bot“."
      },
      "backoff_max_hours": {
        "label": "Pauzė – maksimumas",
        "help": "Blokavimo laikas padvigubėja po kiekvieno kito blokavimo iki šios reikšmės."
      }
    },
    "backoff": {
      "none": "Pauzė neaktyvi ({p})",
      "none_detail": "Paieška, stebimi šaltiniai ir atsisiuntimai iš {p} leidžiami.",
      "active": "Pauzė aktyvi ({p})",
      "active_detail": "iki {t} · liko {rest} · lygis {level}",
      "blocked": "{p} signalizavo apie blokavimą. Paieška, stebimi šaltiniai ir atsisiuntimai iš {p} užblokuoti, kol baigsis laikas.",
      "clear": "Panaikinti rankiniu būdu",
      "sc_off": "„SoundCloud“ išjungta",
      "sc_off_detail": "Jokios „SoundCloud“ paieškos, stebimų šaltinių patikrų ir atsisiuntimų iš „SoundCloud“."
    },
    "soundcloud": {
      "enabled": {
        "label": "Naudoti „SoundCloud“",
        "help": "Išjungta: jokios „SoundCloud“ paieškos, „SoundCloud“ šaltinių patikrų ir „SoundCloud“ atsisiuntimų. Jau atsisiųsti įrašai lieka bibliotekoje."
      },
      "sleep_requests": {
        "label": "Pauzė tarp užklausų",
        "help": "Laukimo laikas tarp metaduomenų užklausų „SoundCloud“ (paieška, stebimi šaltiniai)."
      },
      "sleep_interval": {
        "label": "Atsisiuntimo pauzė – minimumas",
        "help": "Po kiekvieno „SoundCloud“ atsisiuntimo seka atsitiktinė pauzė tarp minimumo ir maksimumo."
      },
      "max_sleep_interval": {
        "label": "Atsisiuntimo pauzė – maksimumas",
        "help": "Atsitiktinės pauzės viršutinė riba."
      },
      "limit_rate_mb": {
        "label": "Atsisiuntimo sparta",
        "help": "Maksimalus pralaidumas. 0 = neribota (nerekomenduojama)."
      },
      "max_downloads_per_run": {
        "label": "Maks. atsisiuntimų per paleidimą",
        "help": "Atskiras „SoundCloud“ skaitiklis. Likusieji lieka eilėje."
      },
      "max_downloads_per_day": {
        "label": "Maks. atsisiuntimų per dieną",
        "help": "Atskiras „SoundCloud“ skaitiklis, rankiniai ir automatiniai atsisiuntimai kartu."
      },
      "max_searches_per_hour": {
        "label": "Maks. paieškų per valandą",
        "help": "Atskiras „SoundCloud“ skaitiklis."
      },
      "backoff_initial_hours": {
        "label": "Pauzė – pradinė reikšmė",
        "help": "Blokavimo laikas, kai „SoundCloud“ pranešė apie per daug užklausų (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Pauzė – maksimumas",
        "help": "Blokavimo laikas padvigubėja po kiekvieno kito blokavimo iki šios reikšmės."
      }
    },
    "ladder": {
      "label": "Lygiai",
      "help": "Kaip blokavimo laikas auga su dabartinėmis reikšmėmis.",
      "reset": "Atstatyti po sėkmingo paleidimo",
      "invalid": "Neteisingos reikšmės"
    },
    "network": {
      "po_token_mode": {
        "label": "Režimas",
        "help": "bgutil įskiepis yt-dlp. Scenarijus paleidžia Deno prireikus, HTTP palaiko veikiantį vietinį serverį."
      },
      "po_token_port": {
        "label": "HTTP prievadas",
        "help": "Tik HTTP režimu. Serveris klauso 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Tokeno galiojimas",
        "help": "Praėjus šiam laikui generuojamas naujas tokenas. Reikšmė suapvalinama iki sveikų valandų (mažiausiai 1 val.)."
      },
      "cookies_from_browser": {
        "label": "Slapukai iš naršyklės",
        "help": "Prisijungia yt-dlp naudodamas jūsų naršyklės prisijungimą. Įjunkite tik jei be to nebeveikia."
      },
      "proxy": {
        "label": "Tarpinis serveris",
        "help": "Neprivaloma, pvz., socks5://127.0.0.1:1080. Tuščia = tiesioginis ryšys.",
        "ph": "be tarpinio serverio"
      }
    },
    "po": {
      "active": "PO-Token aktyvus",
      "inactive": "PO-Token neaktyvus",
      "error": "PO-Token klaida",
      "mode": "Režimas",
      "test": "Išbandyti",
      "testing": "Bandoma …",
      "test_ok": "Bandymas sėkmingas.",
      "test_fail": "Bandymas nepavyko.",
      "unsaved": "Bandymas naudoja įrašytus nustatymus. Pirmiausia įrašykite pakeitimus."
    },
    "cookies": {
      "warn_off": "<b>Rekomenduojama: išjungta.</b> PO-Token ir naršyklės slapukai kartu gali sukelti problemų.",
      "warn_on": "<b>Apeinamasis sprendimas aktyvus.</b> PO-Token ir naršyklės slapukai kartu gali sukelti klaidų ar blokavimų, o užklausoms naudojama jūsų „YouTube“ paskyra. Išjunkite iškart, kai be to veiks. Slapukai niekada nepatenka į žurnalą."
    },
    "schedule": {
      "in_app_check": {
        "label": "Tikrinti, kol programa veikia",
        "help": "Stebimi šaltiniai tikrinami nustatytu intervalu, kol langas atidarytas."
      },
      "watchlist_interval_hours": {
        "label": "Intervalas",
        "help": "Laikas tarp dviejų patikrų programoje."
      },
      "entries_per_source": {
        "label": "Įrašų per šaltinį",
        "help": "Kiek naujausių įrašų gaunama (flat) per patikrą (numatytoji naujiems šaltiniams)."
      },
      "task_scheduler_enabled": {
        "label": "Naudoti užduočių planuoklį",
        "help": "Stebimi šaltiniai tikrinami ir uždarius programą (headless). Įjungiama paspaudus „Sukurti užduotį“."
      },
      "task_time": {
        "label": "Laikas",
        "help": "Kasdieninis suplanuotos užduoties paleidimo laikas."
      }
    },
    "next": {
      "title": "Kita patikra",
      "off": "Automatinės patikros nėra",
      "off_detail": "Nei patikra programoje, nei „Windows“ užduotis neaktyvios. Stebimi šaltiniai tikrinami tik rankiniu būdu.",
      "app_detail": "Programoje, kas {h} val. – kol veikia HCLoader.",
      "task_detail": "Per „Windows“ užduočių planuoklį, kasdien {time} – net kai programa uždaryta.",
      "any_detail": "Ankstesnis iš programos intervalo ir „Windows“ užduoties.",
      "also_task": "Taip pat: „Windows“ užduotis kasdien {time}.",
      "also_app": "Taip pat programoje kas {h} val.",
      "pending": "Dar nesuplanuota",
      "pending_detail": "Programa nustato kitą datą, kai tik pirmą kartą patikrina stebimus šaltinius.",
      "due": "Laikas – netrukus prasidės",
      "backoff": "<b>Pauzė aktyvi.</b> Patikrų nebus iki {t}; po to data pavėluotai įvykdoma arba praleidžiama.",
      "unsaved": "Neįrašyti tvarkaraščio pakeitimai įsigalioja tik po įrašymo."
    },
    "task": {
      "loading": "Užklausiama užduotis …",
      "registered": "Užduotis užregistruota",
      "registered_detail": "{name} · kasdien {time} · kitas paleidimas {next}",
      "none": "Užduotis neužregistruota",
      "none_detail": "Sukuria kasdienę „Windows“ užduotį {time} (schtasks).",
      "create": "Sukurti užduotį",
      "remove": "Pašalinti užduotį",
      "moved": "Programa perkelta – sukurkite užduotį iš naujo",
      "moved_detail": "Suplanuota užduotis vis dar paleidžia {cmd}. Sukūrus iš naujo bus naudojamas dabartinis programos aplankas.",
      "recreate": "Sukurti užduotį iš naujo",
      "unknown": "Užduoties būsena nežinoma",
      "unknown_detail": "„Windows“ užduočių planuoklis neatsakė. Nustatymas lieka nepakeistas.",
      "recheck": "Patikrinti dar kartą"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Sumažinti efektus",
        "help": "Išjungia skenavimo linijas, trikdžius ir visas animacijas."
      },
      "scanlines": {
        "label": "Skenavimo linijos ir triukšmas",
        "help": "Smulkus sluoksnis per visą sąsają."
      },
      "pulse_bpm": {
        "label": "Būgno pulsas",
        "help": "Ritmas, kuriuo pulsuoja eigos juosta."
      }
    },
    "pulse_preview": {
      "label": "Peržiūra",
      "help": "Taip pulsuoja vykstantis atsisiuntimas.",
      "off": "Efektai sumažinti"
    },
    "versions": {
      "plugin": "PO-Token įskiepis",
      "was": "anksčiau {v}"
    },
    "update": {
      "label": "yt-dlp ir įskiepis",
      "help": "„YouTube“ nuolat keičiasi. Atsiradus klaidoms pirmiausia atnaujinkite (pip venv aplinkoje).",
      "button": "Atnaujinti yt-dlp ir įskiepį",
      "running": "Atnaujinama …",
      "last_check": "Paskutinė patikra",
      "restart": "<b>Reikia paleisti iš naujo.</b> yt-dlp buvo atnaujintas. Paieška ir atsisiuntimai užblokuoti, kol HCLoader bus paleistas iš naujo; eilė išsaugoma.",
      "restart_title": "Reikia paleisti iš naujo",
      "restart_text": "yt-dlp buvo atnaujintas. Uždarykite ir iš naujo paleiskite HCLoader – iki tol paieška ir atsisiuntimai užblokuoti, eilė išsaugoma.",
      "out_live": "Išvestis · vykdoma {t}",
      "out_done": "Išvestis · baigta po {t}",
      "out_failed": "Išvestis · nepavyko",
      "out_last": "Išvestis",
      "waiting": "Paleidžiamas pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Tikrinti naujinimus paleidžiant",
        "help": "yt-dlp ir PO-Token įskiepis, ne dažniau kaip kartą per dieną."
      },
      "check_app_updates_on_start": {
        "label": "Tikrinti HCLoader naujinimus paleidžiant",
        "help": "Kiekvieną kartą paleidus kreipiasi į GitHub dėl naujos versijos. Nieko neatsisiunčiama, kol nepaspausite."
      },
      "apply_update_on_exit": {
        "label": "Įdiegti naujinimą išeinant",
        "help": "Atsisiųstas naujinimas įdiegiamas uždarant HCLoader („Vėliau“). Išjungta: jis siūlomas dar kartą kitą kartą paleidus."
      },
      "update_repo": {
        "label": "Naujinimų šaltinis (GitHub)",
        "help": "Saugykla formatu „savininkas/saugykla“. Keiskite tik šakoms (fork)."
      }
    },
    "db": {
      "label": "Duomenų bazė",
      "help": "Visų vaizdo įrašų, šaltinių ir paleidimų būsena. Atsarginė kopija nukopijuoja failą į aplanką „backups“.",
      "backup": "Sukurti DB atsarginę kopiją",
      "backing_up": "Kuriama kopija …",
      "open": "Duomenų aplankas",
      "open_logs": "Žurnalo aplankas",
      "open_title": "Atidaryti aplanką su duomenų baze, konfigūracija ir atsarginėmis kopijomis",
      "open_logs_title": "Atidaryti aplanką su žurnalo failais",
      "info": {
        "one": "{n} įrašas · {mb} MB",
        "few": "{n} įrašai · {mb} MB",
        "many": "{n} įrašų · {mb} MB",
        "other": "{n} įrašų · {mb} MB"
      },
      "last": "Paskutinė kopija",
      "never": "dar nėra",
      "keep": "Išsaugomos 10 naujausių kopijų, senesnės ištrinamos kitos kopijos metu.",
      "backups": "Atsarginės kopijos",
      "backups_more": "+ {n} senesnių aplanke „backups“",
      "fresh": "nauja"
    },
    "reset_all": {
      "label": "Visi nustatymai",
      "help": "Atstato visus skirtukus į numatytuosius. Duomenų bazė ir muzikos failai nepaliečiami.",
      "button": "Atstatyti viską"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Paieškų per valandą",
        "help": "„Ieškoti trūkstamų setų“ paieškas paskirsto tolygiai (10 = viena kas 6 min.). Papildomai galioja bendras paieškų per valandą limitas."
      },
      "collector_results_per_search": {
        "label": "Rezultatų vienai paieškai",
        "help": "Kiek rezultatų peržiūri viena trūkstamo seto paieška (viena užklausa vienai paieškai)."
      },
      "collector_auto_confirm": {
        "label": "Tvirtinti automatiškai nuo",
        "help": "Nuo šio patikimumo atitikmuo įskaitomas be tavo patvirtinimo – tik jei pavadinime yra DJ, festivalis ir metai. Viskas, kas žemiau, laukia spustelėjimo."
      },
      "detect": {
        "label": "Atpažinti automatiškai",
        "help": "Naujiems rezultatams ir atsisiuntimams priskiria festivalį ar seriją, metus, sceną ir seto tipą. Rankiniu būdu nustatytos reikšmės niekada neperrašomos."
      },
      "min_confidence": {
        "label": "Atpažinimo slenkstis",
        "help": "Tikrumas, nuo kurio atitikmuo priskiriamas. Žemiau jis rodomas tik kaip pasiūlymas, kurį galite priimti."
      },
      "year_from_upload_date": {
        "label": "Metai iš įkėlimo datos",
        "help": "Jei pavadinime nėra metų, imami įkėlimo metai (laikoma mažiau patikima)."
      },
      "match_description": {
        "label": "Ieškoti ir aprašyme",
        "help": "Festivalių pavadinimų ieško ir išsaugotame aprašyme."
      },
      "extra_stages": {
        "label": "Papildomos scenos",
        "help": "Scenų pavadinimai be integruotų (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ scena"
      }
    },
    "fest_types": {
      "label": "Savi setų tipų terminai",
      "help": "Žodžiai pavadinime, nurodantys seto tipą. Jie tikrinami prieš integruotus terminus.",
      "ph": "Terminas pavadinime",
      "add": "Terminas"
    },
    "fest_test": {
      "label": "Išbandyti pavadinimą",
      "help": "Parodo, ką atpažinimas randa pavadinime. Niekas neišsaugoma; galioja išsaugoti nustatymai.",
      "ph": "pvz., Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Nieko neatpažinta",
      "assigned": "būtų priskirta",
      "suggested": "tik pasiūlymas"
    },
    "fest_status": {
      "title": "Priskirta {assigned} iš {total} miksų",
      "last": "Paskutinis perėjimas",
      "help": "Veikia neprisijungus su esama biblioteka. Rankinės reikšmės lieka; failai nežymimi iš naujo ir neperkeliami.",
      "button": "Priskirti festivalius dabar",
      "running": "Priskiriama … {done} / {total}"
    },
    "series": {
      "hint": "Žinomi festivaliai, radijo laidos ir tinklalaidės. Šio sąrašo pakeitimai išsaugomi iškart.",
      "add": "Serija",
      "show_hidden": "Rodyti paslėptas",
      "reset_all": "Atstatyti integruotas serijas",
      "builtin": "integruota",
      "own": "sava",
      "modified": "pakeista",
      "hidden": "paslėpta",
      "no_aliases": "nėra pseudonimų",
      "enable": "Atpažinti šią seriją",
      "hide": "Slėpti",
      "restore": "Atkurti",
      "new_title": "Nauja serija",
      "edit_title": "Redaguoti seriją",
      "name": "Pavadinimas",
      "kind": "Rūšis",
      "default_genre": "Numatytasis žanras",
      "aliases": "Pseudonimai",
      "aliases_help": "Kitos rašybos. Pakanka vieno atitikmens pavadinime.",
      "weak_aliases": "Silpni pseudonimai",
      "weak_help": "Kasdieniai žodžiai, kurie skaičiuojami tik kartu su metais.",
      "variants": "Variantai",
      "variants_help": "Atskiros laidos, pvz., Australia arba at Home.",
      "channels": "Organizatoriaus kanalai",
      "channels_help": "Kanalo pavadinimas, ID arba URL. Tik padidina tikrumą."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Daugiausia įrašų vienam šaltiniui",
        "help": "„Nuskaityti viską (vieną kartą)“ stebimų sąraše nuskaito daugiausia tiek kanalo ar grojaraščio įrašų."
      },
      "backfill_requests_per_hour": {
        "label": "Užklausų per valandą",
        "help": "„Nuskaityti viską“ puslapių užklausos paskirstomos tolygiai (120 = viena kas 30 s); taip pat galioja įprastas intervalas ir backoff. Suplanuotas paleidimas (Užduočių planuoklis) tęsia daugiausia tiek užklausų."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Analizuoti po kiekvieno atsisiuntimo",
        "help": "Išmatuoja garsumą (EBU R128) ir apskaičiuoja bangos formą iškart po atsisiuntimo – neprisijungus, žemu prioritetu, po vieną failą."
      },
      "write_tags": {
        "label": "Rašyti ReplayGain žymas",
        "help": "Įrašo REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) arba R128_TRACK_GAIN (Opus) į failą, kad ir kiti grotuvai galėtų jas naudoti. Garsas niekada neperkoduojamas."
      },
      "waveforms": {
        "label": "Iš anksto skaičiuoti bangos formas",
        "help": "Bangos formas skaičiuoja ir analizės metu. Išjungta: tik kai setas grojamas pirmą kartą."
      }
    },
    "analysis": {
      "title": "Išanalizuota failų: {done} iš {total}",
      "counts": "su žymomis {tagged} · bangos formų {waves} · nepavyko {failed}",
      "help": "Veikia neprisijungus visai bibliotekai, po vieną failą žemu prioritetu – be tinklo, garsas lieka nepakitęs. Galima bet kada atšaukti.",
      "button": "Analizuoti naujus failus",
      "button_n": "Analizuoti naujų: {n}",
      "all": "Analizuoti viską iš naujo",
      "all_title": "Iš naujo išmatuoti kiekvieną failą (pvz., pakeitus failus ne programoje)",
      "running": "Analizuojama … {done} / {total}",
      "no_ffmpeg_title": "Trūksta ffmpeg",
      "no_ffmpeg": "Garsumui ir bangos formoms reikia ffmpeg (bin\\ffmpeg.exe, įdiegia setup.ps1). Nustatymai › Priežiūra rodo būseną."
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
        "auto": "Automatinė (sistemos kalba)"
      }
    },
    "player": {
      "mode": {
        "internal": "Integruotas grotuvas (rekomenduojama)",
        "external": "Numatytasis „Windows“ grotuvas"
      },
      "resume": {
        "ask": "Klausti",
        "auto": "Automatiškai",
        "off": "Išjungta"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Originalas (Opus/M4A, be konvertavimo)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Išjungta",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Blokuoti kanalą",
      "text": "Vaizdo įrašai iš „{ch}“ nebebus rodomi. Atšaukti galima skiltyje Nustatymai › Filtrai ir raktažodžiai.",
      "ok": "Blokuoti"
    },
    "ignore_all": {
      "title": "Ignoruoti radinius",
      "text": {
        "one": "Pažymėti {n} gautų radinių kaip ignoruojamus? Jie nebus atsisiunčiami ir nebebus rodomi gautuose.",
        "few": "Pažymėti {n} gautų radinių kaip ignoruojamus? Jie nebus atsisiunčiami ir nebebus rodomi gautuose.",
        "many": "Pažymėti {n} gautų radinių kaip ignoruojamus? Jie nebus atsisiunčiami ir nebebus rodomi gautuose.",
        "other": "Pažymėti {n} gautų radinių kaip ignoruojamus? Jie nebus atsisiunčiami ir nebebus rodomi gautuose."
      },
      "ok": "Ignoruoti"
    },
    "del_source": {
      "title": "Ištrinti šaltinį",
      "text": "Pašalinti „{name}“ iš stebimų šaltinių? Jau atsisiųsti miksai išsaugomi."
    },
    "del_mix": {
      "title": "Ištrinti miksą",
      "text": "„{title}“ pašalinamas iš bibliotekos, o failas ištrinamas iš disko:",
      "ok": "Ištrinti failą",
      "warn": "<b>To atšaukti negalima.</b> Garso failas ir susijęs .cue failas ištrinami. Miksas pažymimas kaip „ignoruojamas“ ir <b>nebus atsisiunčiamas dar kartą</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Pašalinti tik įrašą",
      "text": "Failas „{title}“ yra už dabartinio paskirties aplanko ribų, todėl nebus ištrintas:",
      "ok": "Pašalinti tik įrašą",
      "warn": "Failas lieka nepaliestas ten, kur yra. Įrašas dingsta iš bibliotekos, miksas pažymimas kaip „ignoruojamas“ ir <b>nebus atsisiunčiamas dar kartą</b>."
    },
    "remove_mix": {
      "title": "Pašalinti įrašą",
      "text": "Failas „{title}“ nerastas išsaugotoje vietoje:",
      "ok": "Pašalinti įrašą",
      "warn": "Įrašas dingsta iš bibliotekos. Miksas pažymimas kaip „ignoruojamas“ ir <b>nebus atsisiunčiamas dar kartą</b>. Jei failas yra kitur, jis lieka nepaliestas."
    },
    "backoff": {
      "title": "Panaikinti pauzę",
      "ok": "Vis tiek panaikinti",
      "text": "Blokavimo laikas jus saugo: {p} signalizavo, kad gauta per daug užklausų.",
      "warn": "<b>Panaikinkite tik jei tikrai žinote, kad blokavimas baigėsi.</b> Jei programa vėl kreipsis per anksti, {p} gali apriboti jūsų IP ilgesniam laikui arba visam laikui."
    },
    "reset_all": {
      "title": "Atstatyti viską",
      "text": "Visi nustatymai visuose skirtukuose nedelsiant nustatomi į numatytuosius ir įrašomi.",
      "ok": "Atstatyti"
    },
    "series_delete": {
      "title": "Ištrinti seriją?",
      "text": "„{name}“ ir jos laidos bus ištrintos.",
      "warn": {
        "one": "{n} miksas praras priskyrimą.",
        "few": "{n} miksai praras priskyrimą.",
        "many": "{n} mikso praras priskyrimą.",
        "other": "{n} miksų praras priskyrimą."
      }
    },
    "series_hide": {
      "title": "Slėpti seriją?",
      "text": "„{name}“ nebebus atpažįstama. Ją grąžinsite pasirinkę „Rodyti paslėptas“."
    },
    "series_reset": {
      "title": "Atstatyti integruotas serijas?",
      "text": "Visos integruotos serijos grįš į pradinę būseną, paslėptos vėl atsiras. Jūsų serijos liks.",
      "ok": "Atstatyti"
    }
  },
  "toast": {
    "enqueued": {
      "one": "Į eilę pridėtas {n} miksas",
      "few": "Į eilę pridėti {n} miksai",
      "many": "Į eilę pridėta {n} miksų",
      "other": "Į eilę pridėta {n} miksų"
    },
    "enqueued_none": "Nieko nepridėta – jau eilėje arba atsisiųsta",
    "enqueued_skipped": "Praleista: {n}",
    "queue_cancelled": "Atšaukta: {title}",
    "queue_removed": "Pašalinta: {title}",
    "queue_retry": "Vėl įtraukta į eilę: {title}",
    "queue_paused": "Eilė pristabdyta",
    "queue_resumed": "Eilė tęsiama",
    "new_run": "Pradėtas naujas paleidimas",
    "ignored": "Ignoruojama: {title}",
    "unignored": "Vėl matoma: {title}",
    "ignored_n": {
      "one": "Ignoruotas {n} radinys",
      "few": "Ignoruoti {n} radiniai",
      "many": "Ignoruota {n} radinių",
      "other": "Ignoruota {n} radinių"
    },
    "opening": "Atidaroma {p} naršyklėje …",
    "watch_added": "Pridėta prie stebimų: {ch}",
    "blocked": "Kanalas užblokuotas: {ch}",
    "genre_set": "Žanras nustatytas: {genre}",
    "done": "Atsisiųsta: {title}",
    "failed": "Nepavyko: {title} – {error}",
    "wl_started": {
      "one": "Tikrinami stebimi šaltiniai (šaltinių: {n}, ribojant spartą) …",
      "few": "Tikrinami stebimi šaltiniai (šaltinių: {n}, ribojant spartą) …",
      "many": "Tikrinami stebimi šaltiniai (šaltinių: {n}, ribojant spartą) …",
      "other": "Tikrinami stebimi šaltiniai (šaltinių: {n}, ribojant spartą) …"
    },
    "wl_started_one": "Tikrinama „{name}“ …",
    "wl_none": "Nėra aktyvaus šaltinio – nėra ką tikrinti",
    "wl_done": {
      "one": "Stebimi šaltiniai patikrinti (šaltinių: {n}): nieko naujo",
      "few": "Stebimi šaltiniai patikrinti (šaltinių: {n}): nieko naujo",
      "many": "Stebimi šaltiniai patikrinti (šaltinių: {n}): nieko naujo",
      "other": "Stebimi šaltiniai patikrinti (šaltinių: {n}): nieko naujo"
    },
    "wl_done_found": {
      "one": "Stebimi šaltiniai patikrinti – naujų radinių: {n}",
      "few": "Stebimi šaltiniai patikrinti – naujų radinių: {n}",
      "many": "Stebimi šaltiniai patikrinti – naujų radinių: {n}",
      "other": "Stebimi šaltiniai patikrinti – naujų radinių: {n}"
    },
    "wl_errors": {
      "one": "Šaltinių su klaidomis: {n}",
      "few": "Šaltinių su klaidomis: {n}",
      "many": "Šaltinių su klaidomis: {n}",
      "other": "Šaltinių su klaidomis: {n}"
    },
    "source_added": "Šaltinis pridėtas: {name}",
    "source_saved": "Šaltinis įrašytas: {name}",
    "source_deleted": "Šaltinis ištrintas: {name}",
    "retagged": "Pažymėta iš naujo: {title}",
    "retagged_moved": "Pažymėta iš naujo ir perkelta: {title} → {path}",
    "deleted": "Ištrinta: {title}",
    "removed": "Įrašas pašalintas: {title}",
    "folder_opening": "Atidaromas aplankas …",
    "copied": {
      "one": "Nukopijuota {n} eilutė",
      "few": "Nukopijuotos {n} eilutės",
      "many": "Nukopijuota {n} eilučių",
      "other": "Nukopijuota {n} eilučių"
    },
    "copy_failed": "Nukopijuoti nepavyko",
    "copy_none": "Nėra matomų eilučių",
    "settings_saved": "Nustatymai įrašyti",
    "settings_errors": {
      "one": "{n} įvestis neteisinga",
      "few": "{n} įvestys neteisingos",
      "many": "{n} įvesčių neteisingos",
      "other": "{n} įvesčių neteisingos"
    },
    "backoff_cleared": "Pauzė ({p}) panaikinta rankiniu būdu",
    "genre_moved": "Žanras: {genre} – perkelta į {path}",
    "genre_retagged": "Žanras: {genre} – žymos atnaujintos",
    "genre_entry_only": "Žanras: {genre} – pakeistas tik įrašas, failas nepasiekiamas",
    "genre_failed": "Žanro nustatyti nepavyko: {error}",
    "task_created": "Užduotis sukurta „Windows“ užduočių planuoklyje",
    "task_removed": "Užduotis pašalinta",
    "updated": "Atnaujinta iki yt-dlp {v}",
    "up_to_date": "Jau naujausia versija (yt-dlp {v})",
    "update_failed": "Atnaujinti nepavyko",
    "restart_required": "Atnaujinta – paleiskite HCLoader iš naujo, kad paieška ir atsisiuntimai vėl veiktų",
    "backup_done": "Atsarginė kopija sukurta: {path}",
    "reset_all": "Visi nustatymai atstatyti",
    "festival_entry_only": "„{name}“ išsaugota tik įraše – failas nepasiekiamas",
    "series_saved": "Serija „{name}“ išsaugota",
    "series_deleted": "Serija „{name}“ ištrinta",
    "series_hidden": "Serija „{name}“ paslėpta",
    "series_reset": "Integruotos serijos atkurtos",
    "assign_done": "Festivaliai priskirti: naujų {assigned}, pasiūlymų {suggested}",
    "assign_cancelled": "Priskyrimas nutrauktas: naujų {assigned}, pasiūlymų {suggested}",
    "analysis_done": "Garsumas išanalizuotas: failų {n} (nepavyko {failed})",
    "analysis_cancelled": "Analizė atšaukta po {n} failų"
  },
  "upd": {
    "available": "Yra versija {v}",
    "available_sub": "Įdiegta: {cur}",
    "download": "Atsisiųsti",
    "notes": "Pakeitimai",
    "later": "Vėliau",
    "close": "Uždaryti",
    "cancel": "Atšaukti",
    "retry": "Bandyti dar kartą",
    "downloading": "Atsisiunčiamas naujinimas {v}",
    "phase_download": "Atsisiuntimas",
    "phase_verify": "Patikra",
    "phase_prepare": "Paruošimas",
    "ready": "Naujinimas {v} paruoštas",
    "ready_sub": "Norint įdiegti, HCLoader trumpam uždaromas ir paleidžiamas iš naujo.",
    "restart_now": "Paleisti iš naujo dabar",
    "on_exit": "Išeinant",
    "applying": "Diegiamas naujinimas …",
    "applying_sub": "HCLoader tuoj užsidarys ir bus paleistas iš naujo.",
    "error": "Programos naujinimas nepavyko",
    "blocked": "Automatinis naujinimas neįmanomas",
    "notes_title": "Versijos {v} pakeitimai",
    "notes_empty": "Laidimo pastabų nėra.",
    "notes_link": "Laida GitHub",
    "notes_all": "Rodyti visus pakeitimus",
    "notes_less": "Rodyti tik svarbiausius",
    "confirm_title": "Paleisti iš naujo dabar?",
    "confirm_ok": "Paleisti iš naujo",
    "confirm_text": "HCLoader uždaromas, naujinimas įdiegiamas ir programa paleidžiama iš naujo. Vykstantis atsisiuntimas nutraukiamas ir lieka eilėje. Muzika, nustatymai ir duomenų bazė nesikeičia.",
    "on_exit_toast": "Naujinimas bus įdiegtas HCLoader užsidarant.",
    "later_toast": "Naujinimas lieka paruoštas ir bus pasiūlytas dar kartą kitą kartą paleidus.",
    "section_label": "HCLoader versija",
    "section_help": "Naujos versijos gaunamos iš GitHub. Naujinimai nepaliečia duomenų, nustatymų ir muzikos; prieš duomenų bazės migraciją automatiškai sukuriama atsarginė kopija.",
    "current": "Įdiegta",
    "latest": "Naujausia",
    "checked": "Paskutinė patikra",
    "check_now": "Patikrinti dabar",
    "checking": "Tikrinama …",
    "st_idle": "Naujausia versija",
    "st_available": "Yra nauja versija",
    "st_checking": "Tikrinama …",
    "st_downloading": "Atsisiunčiama …",
    "st_ready": "Paruošta diegti",
    "st_applying": "Diegiama …",
    "st_error": "Klaida",
    "st_unknown": "Dar netikrinta",
    "up_to_date": "HCLoader naujausios versijos (v{v})",
    "portable": "Nešiojamoji versija",
    "installed": "Įdiegta (setup)",
    "git": "Git kopija",
    "from_repo": "iš {repo} (ne oficialus šaltinis)",
    "unverified": "be kontrolinės sumos (patikrintas tik ZIP vientisumas)",
    "rn_label": "Leidimo pastabos",
    "rn_help": "Kas pasikeitė kiekvienoje versijoje – iš kartu pateiktų pastabų (veikia ir be ryšio).",
    "rn_older": "Senesnė",
    "rn_newer": "Naujesnė",
    "rn_pos": "{i} iš {n}",
    "rn_installed": "įdiegta",
    "rn_empty": "Leidimo pastabų nerasta.",
    "rn_version": "Versija"
  },
  "err": {
    "generic": "Nežinoma klaida",
    "bridge": "Klaida „{name}“: {msg}",
    "boot": "Paleisti nepavyko: {msg}",
    "no_backend": "Nėra ryšio su serverio dalimi"
  },
  "fatal": {
    "title": "Ryšys su serverio dalimi nutrūko",
    "text": "Sąsaja negavo atsakymo iš Python HCLoader dalies. Nerodoma ir neišsaugoma nieko, kas nėra tikra.",
    "waiting": "Vis dar laukiama serverio dalies …",
    "reload": "Įkelti iš naujo"
  },
  "fest": {
    "all": "Visos serijos",
    "other": "Kita / nepriskirta",
    "other_hint": "Be festivalio",
    "sets": {
      "one": "{n} setas",
      "few": "{n} setai",
      "many": "{n} seto",
      "other": "{n} setų"
    },
    "editions": {
      "one": "{n} laida",
      "few": "{n} laidos",
      "many": "{n} laidos",
      "other": "{n} laidų"
    },
    "suggestions": {
      "one": "{n} pasiūlymas",
      "few": "{n} pasiūlymai",
      "many": "{n} pasiūlymo",
      "other": "{n} pasiūlymų"
    },
    "all_years": "Visi",
    "no_stage": "Be scenos",
    "kind": {
      "festival": "Festivalis",
      "radio": "Radijo laida",
      "podcast": "Tinklalaidė"
    },
    "set_type": {
      "live_set": "Gyvas setas",
      "closing_ceremony": "Uždarymo ceremonija",
      "opening": "Atidarymas",
      "endshow": "Endshow",
      "full_show": "Visas šou",
      "warm_up": "Apšilimas",
      "anthem": "Himnas",
      "episode": "Epizodas"
    },
    "change": "keisti festivalį",
    "change_manual": "nustatyta rankiniu būdu, spustelėkite, kad pakeistumėte",
    "add": "Nustatyti festivalį ar seriją",
    "suggested": "Neužtikrintas pasiūlymas: {name}",
    "accept": "Priimti pasiūlymą",
    "p_title": "Festivalis / serija",
    "p_search": "Ieškoti serijos …",
    "p_none": "Be festivalio",
    "p_no_match": "Serijų nerasta",
    "p_year": "Metai",
    "p_variant": "Variantas",
    "p_stage": "Scena",
    "p_type": "Seto tipas",
    "p_apply": "Taikyti",
    "p_auto": "Grąžinti automatinį"
  },
  "backfill": {
    "action": "Nuskaityti viską (vieną kartą)",
    "action_title": "Vieną kartą nuskaityti visą šio šaltinio sąrašą puslapis po puslapio – nauji radiniai keliauja į gautuosius",
    "again_title": "Nuskaityti viską dar kartą – pridedami tik dar nežinomi įrašai",
    "search_title": "Ne išsaugotoms paieškoms – paieška grąžina daugiausia 100 rezultatų",
    "why_open": "Nuskaitymas jau pradėtas – pristabdykite arba atšaukite jį po pavadinimu",
    "st_pending": "Laukia",
    "st_running": "Nuskaitoma …",
    "st_paused": "Pristabdyta",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / daug. {cap}",
    "added": "+{n} gautuosiuose",
    "done_short": "Viskas nuskaityta {date}",
    "done_title": "Visiškai nuskaityta: {date} · įrašų: {n}",
    "note_title": "Paskutinis pertraukimas",
    "pause": "Pristabdyti",
    "resume": "Tęsti",
    "cancel": "Atšaukti",
    "keep": "Toliau skaityti",
    "dlg_title": "Nuskaityti viską iš „{name}“?",
    "dlg_text": "Vieną kartą nuskaito visą šio šaltinio sąrašą puslapis po puslapio – plokščiai ir pigiai, per ribotuvą; nieko neatsisiunčiama. Radiniai, praeinantys jūsų filtrus, keliauja į <b>gautuosius</b>, net šaltiniuose su automatiniu atsisiuntimu. Jau žinomi vaizdo įrašai niekada nepridedami du kartus.",
    "dlg_requests": "užklausų",
    "dlg_time": "trukmė",
    "dlg_entries": "įrašų",
    "dlg_known": "Žinoma iš paskutinio patikrinimo: įrašų – <b>{n}</b>.",
    "dlg_unknown": "Dydis nežinomas – atsargiai įvertinta maksimaliam {cap} įrašų skaičiui.",
    "dlg_capped": "Nuskaitomi tik pirmieji {cap} įrašų (Nustatymai › Tvarkaraštis).",
    "dlg_resume": "Tęsia po {n} jau nuskaitytų įrašų; jų puslapiai pirmiausia užklausiami iš naujo.",
    "dlg_headless": "Per didelis suplanuotam paleidimui ({n} užklausų per valandą): jei programa uždaroma anksčiau, tęsiama tik programoje.",
    "dlg_pace": "Daugiausia {n} užklausų per valandą, tolygiai paskirstytų. Backoff (HTTP 429 / botų patikra), programos uždarymas ar klaida tik pertraukia – vėliau tęsiama automatiškai. Pristabdyti ar atšaukti galite bet kada.",
    "dlg_ok": "Pradėti nuskaitymą",
    "dlg_ok_resume": "Toliau skaityti",
    "dlg_cancel_title": "Atšaukti nuskaitymą?",
    "dlg_cancel_text": "„{name}“ nuskaitymas sustoja, o pažanga atmetama. Gautuosiuose jau esantys radiniai lieka.",
    "toast_started": "„{name}“ nuskaitoma visa – vyksta fone",
    "toast_done": "„{name}“ nuskaityta visa – +{n} gautuosiuose",
    "toast_paused": "„{name}“ pristabdyta – tęskite mygtuku „Tęsti“",
    "toast_cancelled": "„{name}“ nuskaitymas atšauktas"
  },
  "collector": {
    "nav": "Rinkėjas",
    "open_title": "Festivalių rinkėjas: surink visus vienų festivalio metų setus pagal kontrolinį sąrašą",
    "title": "Festivalių rinkėjas",
    "sub": "Visi vienų festivalio metų setai – pagal tvarkaraštį, su kontroliniu sąrašu",
    "back_library": "Atgal į biblioteką",
    "back_list": "Visi kontroliniai sąrašai",
    "collect": "Rinkti šiuos metus",
    "collect_title": "Visų setų kontrolinis sąrašas: {name} – rask trūkstamus setus ir atsisiųsk juos",
    "open_checklist": "Sąrašas {n} / {total}",
    "sets": "Setai",
    "lists": "Kontroliniai sąrašai",
    "card_empty": "Setų dar nėra",
    "new_title": "Naujas kontrolinis sąrašas",
    "new_text": "Pasirink festivalį ir metus. Setai imami iš organizatoriaus grojaraščio, įklijuoto tvarkaraščio arba pridėto failo.",
    "new_ok": "Atverti sąrašą",
    "f_series": "Festivalis / serija",
    "f_series_ph": "Pasirinkti …",
    "f_series_other": "Radijo laidos ir tinklalaidės",
    "err_series": "Pasirink festivalį arba seriją.",
    "err_year": "Įvesk festivalio metus.",
    "empty_title": "Kontrolinio sąrašo dar nėra",
    "empty_text": "Kontrolinis sąrašas išvardija kiekvieną vienų festivalio metų setą ir parodo, ką jau turi.",
    "step1": "Viršuje pasirink festivalį ir metus.",
    "step2": "Importuok organizatoriaus grojaraštį arba įklijuok tvarkaraštį.",
    "step3": "Nuimk varneles nuo to, ko nenori, surask trūkstamus setus ir atsisiųsk.",
    "delete": "Ištrinti sąrašą",
    "dlg_delete_title": "Ištrinti kontrolinį sąrašą?",
    "dlg_delete_text": "Kontrolinis sąrašas „{name}“ pašalinamas su visomis eilutėmis. Vykstanti paieška sustoja.",
    "dlg_delete_keep": "Atsisiųsti failai, bibliotekos įrašai ir išsaugoti atitikmenys lieka.",
    "toast_deleted": "Kontrolinis sąrašas „{name}“ ištrintas",
    "in_library": "Bibliotekoje: {n}",
    "show_library": "Rodyti bibliotekoje ({n})",
    "more": "Daugiau",
    "st": {
      "found": "Rasta",
      "queued": "Eilėje",
      "downloaded": "Atsisiųsta",
      "missing": "Trūksta",
      "ignored": "Ignoruojama"
    },
    "filter_status": "Rodyti tik: {name}",
    "sources": "Šaltiniai",
    "src_playlist": "Importuoti organizatoriaus grojaraštį",
    "src_paste": "Įklijuoti tvarkaraštį (Beta)",
    "files": "Pridėti tvarkaraščiai",
    "src_add": "Pridėti eilutę",
    "all_stages": "Visos scenos",
    "all_days": "Visos dienos",
    "no_day": "Be dienos",
    "search": "Filtruoti pagal DJ …",
    "col_dj": "DJ / setas",
    "col_when": "Diena / laikas",
    "col_status": "Būsena",
    "col_match": "Rastas vaizdo įrašas",
    "source": {
      "playlist": "Grojaraštis",
      "timetable": "Tvarkaraštis",
      "file": "Tvarkaraščio failas",
      "manual": "Pridėta ranka"
    },
    "edited": "Pakeista ranka – šios reikšmės galioja ir po vėlesnių importų",
    "check_title": "Rinkti šį setą",
    "all_title": "Žymėti visus / nė vieno (rodomos eilutės)",
    "m_none": "Dar neieškota",
    "m_searched": "Nieko nerasta ({date})",
    "confirm": "Patvirtinti",
    "confirm_title": "Neaiškus atitikmuo – patvirtink, kad tai tinkamas setas",
    "reject_title": "Ne šis vaizdo įrašas – šiai eilutei jo daugiau nesiūlyti",
    "reject": "Atmesti atitikmenį",
    "candidates": "Kiti atitikmenys: {n}",
    "candidates_head": "Naudoti kitą atitikmenį",
    "ignore": "Ignoruoti šį setą",
    "unignore": "Nebeignoruoti",
    "delete_row": "Ištrinti eilutę",
    "f_artist": "DJ / atlikėjas",
    "f_day": "Diena",
    "f_start": "Pradžia",
    "f_end": "Pabaiga",
    "add_ok": "Pridėti",
    "err_artist": "DJ / atlikėjas privalomas.",
    "none_title": "Eilučių nėra",
    "none_text": "Nė viena eilutė neatitinka dabartinių filtrų.",
    "rows_empty_title": "Šis kontrolinis sąrašas tuščias",
    "rows_empty_text": "Pradėk nuo oficialaus organizatoriaus grojaraščio – viena paprasta užklausa dažniausiai apima daugumą setų. Arba įklijuok tvarkaraštį kaip tekstą.",
    "checked_of": "iš {total} pažymėta",
    "select_all": "Žymėti visus",
    "select_none": "Nė vieno",
    "shown": "Rodoma eilučių: {n} iš {total}",
    "to_confirm": "Patvirtinti: {n}",
    "to_confirm_title": "Neaiškūs atitikmenys laukia tavo patvirtinimo – spustelėk, kad matytum tik juos",
    "find": "Ieškoti trūkstamų setų ({n})",
    "find_again": "Ieškoti iš naujo ({n})",
    "find_title": "Ieško pažymėtų setų be atitikmens po vieną ir ramiu tempu – pirmiausia parodo įvertinimą",
    "find_again_title": "Visų setų jau ieškota – iš naujo ieškoti tų, kurie be atitikmens",
    "find_none": "Nėra ko ieškoti – kiekvienas pažymėtas setas turi atitikmenį",
    "find_running": "Paieška vyksta",
    "queue": "Atsisiųsti pažymėtus ({n})",
    "queue_title": "Įtraukti visus pažymėtus patvirtintus setus į atsisiuntimų eilę",
    "queue_none": "Nėra ko atsisiųsti – nėra pažymėto seto su patvirtintu, dar neatsisiųstu atitikmeniu",
    "job_pending": "Laukiama",
    "job_running": "Ieškoma …",
    "job_paused": "Pristabdyta",
    "job_hits": "Rasta: {n}",
    "job_cancel": "Stabdyti",
    "job_resume": "Tęsti",
    "imp_running": "Skaitomas grojaraštis …",
    "imp_entries": "Įrašų: {n}",
    "imp_hint": "paprasta užklausa, puslapis po puslapio",
    "imp_busy": "Vienas grojaraštis jau skaitomas",
    "imp_added": "naujų: {n}",
    "imp_merged": "sujungta: {n}",
    "imp_matched": "rasta bibliotekoje: {n}",
    "imp_unchecked": "be varnelės (per trumpi / aftermovie): {n}",
    "imp_invalid": "netinkamų: {n}",
    "pl_title": "Importuoti organizatoriaus grojaraštį",
    "pl_text": "Oficialus organizatoriaus livesetų grojaraštis yra pigiausias šaltinis: viena paprasta užklausa, niekas neatsisiunčiama. Kiekvienas įrašas tampa patvirtinta eilute; DJ, scena ir seto tipas imami iš pavadinimo.",
    "pl_url": "Grojaraščio nuoroda",
    "pl_hint": "„YouTube“ grojaraštis arba „SoundCloud“ setas. Per trumpi įrašai, aftermovie ir anonsai pridedami be varnelės. Tvarkaraščio eilutės gauna atitinkamą vaizdo įrašą.",
    "pl_ok": "Importuoti",
    "pl_err_empty": "Įklijuok grojaraščio nuorodą.",
    "toast_pl_started": "Skaitomas grojaraštis – vyksta fone",
    "toast_pl_done": "Grojaraštis perskaitytas –",
    "toast_pl_cancelled": "Grojaraščio importas sustabdytas –",
    "tt_title": "Įklijuoti tvarkaraštį – {name} (Beta)",
    "tt_text": "Įklijuok tvarkaraštį kaip tekstą arba CSV. Antraštės nustato dieną ir sceną, kiekviena kita eilutė yra setas. Kol neimportuosi, niekas neišsaugoma.",
    "tt_input": "Tvarkaraštis",
    "tt_preview": "Peržiūra",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Čia atsiras atpažinti setai.",
    "tt_nothing": "Dar neatpažintas nė vienas setas.",
    "tt_sum": "Setų: {n}",
    "tt_days": "Dienų: {n}",
    "tt_stages": "Scenų: {n}",
    "tt_skipped": "Nesuprastų eilučių: {n}",
    "tt_more": "… ir dar {n}",
    "tt_ok": "Importuoti ({n})",
    "tt_edit_hint": "Prieš importuodami pataisykite arba pašalinkite setus čia. Pakeitus tekstą kairėje, jis nuskaitomas iš naujo.",
    "toast_tt": "Tvarkaraštis importuotas –",
    "files_text": "Tvarkaraščiai, prižiūrimi „HCLoader“ saugykloje ir pateikiami su atnaujinimais. Importas sukuria atitinkamų metų kontrolinį sąrašą.",
    "files_empty_title": "Tvarkaraščių dar nepridėta",
    "files_empty": "Pridedami tik įrodomai teisingi tvarkaraščiai – šioje versijoje jų dar nėra. Verčiau įklijuok tvarkaraštį kaip tekstą.",
    "files_how_title": "Prisidėk tvarkaraščiu",
    "files_how": "Vienas JSON failas vieniems metams: setai (atlikėjas, scena, diena, pradžia, pabaiga) ir nuoroda į oficialų tvarkaraštį kaip šaltinis. Pateik jį kaip „issue“ arba „pull request“ svetainėje „GitHub“; formatą aprašo README šalia failų.",
    "files_meta": "Setų: {n} · atnaujinta {date}",
    "files_source": "oficialus šaltinis",
    "files_import": "Importuoti",
    "files_broken": "Netinkamas failas: {error}",
    "files_unknown": "Serija čia nežinoma arba paslėpta",
    "est_title": "Ieškoti trūkstamų setų – {name}",
    "est_text": "Ieško kiekvieno pažymėto seto be atitikmens po vieną: <b>DJ + festivalis + metai</b> paprasta paieška per ribotuvą. Niekas neatsisiunčiama.",
    "est_requests": "paieškų",
    "est_left": "laisva šią valandą",
    "est_again": "Visų setų jau ieškota – dabar iš naujo ieškoma tų, kurie be atitikmens.",
    "est_offline": "Ką tik nemokamai sugretinta su biblioteka: {n}.",
    "est_resume": "Tęsia nutrauktą paiešką.",
    "est_wait": "Šios valandos paieškų limitas išnaudotas – pirmoji paieška prasidės {t}.",
    "est_backoff": "„Backoff“ galioja iki {t} – anksčiau paieškos pradėti negalima.",
    "est_pace": "Ne daugiau kaip {n} paieškų per valandą, tolygiai paskirstytų (maždaug viena kas {min} min.). Neaiškūs atitikmenys laukia tavo patvirtinimo. „Backoff“, programos uždarymas ar klaida paiešką tik pertraukia – ji tęsiasi automatiškai.",
    "est_ok": "Pradėti paiešką",
    "est_ok_resume": "Tęsti paiešką",
    "toast_find_started": "Ieškoma trūkstamų setų: „{name}“ – vyksta fone",
    "toast_find_done": "Paieška baigta – rasta {n} iš {total}",
    "toast_find_cancelled": "Paieška sustabdyta – „Ieškoti trūkstamų setų“ ją pratęs",
    "toast_offline": "Sugretinta su biblioteka: {n} – paieškos nereikia",
    "toast_confirmed": "„{name}“ patvirtinta",
    "toast_rejected": "Atitikmuo atmestas: „{name}“",
    "toast_ignored": "„{name}“ ignoruojama",
    "toast_unignored": "„{name}“ vėl renkama",
    "toast_row_added": "„{name}“ pridėta",
    "toast_row_added_hit": "„{name}“ pridėta – rasta bibliotekoje",
    "toast_row_saved": "„{name}“ išsaugota",
    "toast_row_retag": "„{name}“ išsaugota – failo žymės atnaujinamos",
    "toast_row_deleted": "Eilutė „{name}“ ištrinta",
    "q_none": "Į eilę nieko nepridėta",
    "q_unconfirmed": "nepatvirtinta: {n}",
    "q_missing": "be atitikmens: {n}",
    "q_other": "negalima atsisiųsti: {n}",
    "q_retag": "žymės atnaujintos: {n}"
  },
  "tracks": {
    "nav": "Takeliai",
    "open_title": "Kuriuose setuose skamba takelis? Ieškoti bibliotekos takelių sąrašuose",
    "title": "Takeliai",
    "sub": "Kuriuose setuose skamba šis takelis?",
    "back": "Atgal į biblioteką",
    "search": "Atlikėjas arba pavadinimas, pvz., Dragonborn",
    "n_tracks": {
      "one": "{n} takelis",
      "few": "{n} takeliai",
      "many": "{n} takelio",
      "other": "{n} takelių"
    },
    "n_sets": {
      "one": "{n} setas",
      "few": "{n} setai",
      "many": "{n} seto",
      "other": "{n} setų"
    },
    "status": "{tracks}: {sets}",
    "status_last": "Nuskaityta:",
    "scan": "Nuskaityti takelių sąrašus",
    "scan_title": "Nuskaityti visų setų takelių sąrašus (neprisijungus: skyriai, aprašymai, CUE failai)",
    "rescan": "Nuskaityti viską iš naujo",
    "rescan_title": "Iš naujo nuskaityti visų setų takelių sąrašus",
    "scan_new": "Nuskaityti naujus",
    "scan_new_title": "Nuskaityti tik naujus arba po paskutinio nuskaitymo pakeistus setus",
    "running": "Nuskaitomi takelių sąrašai … {done} / {total}",
    "engine_like": "Paprasta paieška: šiame SQLite nėra viso teksto indekso",
    "top_title": "Dažniausiai grojami takeliai",
    "top_sub": "daugiausia setų",
    "top_sets": {
      "one": "{n} sete",
      "few": "{n} setuose",
      "many": "{n} seto",
      "other": "{n} setų"
    },
    "top_find": "Rodyti setus su šiuo takeliu",
    "top_empty": "Dar nė vienas takelis nepasitaiko daugiau nei viename sete.",
    "results": {
      "one": "{n} setas su „{q}“",
      "few": "{n} setai su „{q}“",
      "many": "{n} seto su „{q}“",
      "other": "{n} setų su „{q}“"
    },
    "truncated": "pirmieji {n} – patikslinkite paiešką",
    "more_hits": {
      "one": "+ dar {n} atitikmuo",
      "few": "+ dar {n} atitikmenys",
      "many": "+ dar {n} atitikmens",
      "other": "+ dar {n} atitikmenų"
    },
    "no_results_title": "Joks setas negroja „{q}“",
    "no_results_text": "Pabandykite dalį atlikėjo ar pavadinimo. Randami tik setai su takelių sąrašu (skyriai, aprašymas, CUE failas).",
    "empty_title": "Takelių sąrašų dar nėra",
    "empty_text": "HCLoader skaito takelių sąrašus iš jūsų setų skyrių, aprašymų ir CUE failų – neprisijungus, neklausdamas YouTube.",
    "empty_none_title": "Nė vienas jūsų setas neturi takelių sąrašo",
    "empty_none_text": "Takelių sąrašai gaunami iš skyrių, aprašymų su laiko žymomis ir CUE failų. Setų be jų ieškoti negalima.",
    "library_empty": "Pirmiausia atsisiųskite kelis setus – jų takelių sąrašai atsiras čia.",
    "jump": "Groti nuo {time}",
    "jump_external": "Atidaryta numatytajame grotuve – ten pereikite prie {time}",
    "no_time": "Takelių sąraše nėra laiko žymos",
    "tracklist": "Takelių sąrašas",
    "tracklist_title": "Rodyti visą šio seto takelių sąrašą",
    "panel_source": "Šaltinis: {source}",
    "source_chapters": "skyriai",
    "source_description": "aprašymas",
    "source_id3": "ID3 skyriai",
    "source_cue": "CUE failas",
    "source_none": "nėra",
    "panel_empty": "Šis setas neturi takelių sąrašo",
    "panel_empty_hint": "Nerasta nei skyrių, nei aprašymo su takelių sąrašu, nei CUE failo.",
    "close": "Uždaryti",
    "id_track": "Neišleistas arba neatpažintas takelis (ID)",
    "play_set": "Groti setą nuo pradžios",
    "toast_done": "Takelių sąrašai nuskaityti: {sets}, {tracks}",
    "toast_cancelled": "Takelių sąrašų nuskaitymas nutrauktas"
  }
});
