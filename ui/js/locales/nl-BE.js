/* HCLoader UI texts – Flemish / Belgian Dutch (nl-BE). Variant of nl: contains ONLY the keys
   where Belgian usage differs (u-form, «enkel», «bewaren», «bv.» …); every other key falls back to nl,
   then en. Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "nl-BE", "name": "Vlaams (België)", "dir": "ltr", "intl": "nl-BE", "fallback": "nl"}, {
  "common": {
    "save": "Bewaren"
  },
  "card": {
    "date_approx": "Geschatte datum – de zoekfunctie van YouTube geeft enkel “X jaar geleden”",
    "duplicate_title": "Zeer gelijkaardige titel en dezelfde duur als “{title}” van {p} – daar al gedownload of in de wachtrij. U kunt het toch downloaden.",
    "preview": "Enkel preview (Go+) – kan niet worden gedownload",
    "preview_title": "SoundCloud levert voor deze track enkel een preview van 30 seconden (Go+). Hij kan niet worden gedownload."
  },
  "discover": {
    "previews": "{n} enkel preview (Go+)",
    "f_hint_year": "De zoekfunctie van YouTube geeft enkel een geschatte datum (“13 jaar geleden”). Daarom geldt ±1 jaar – en ook elke mix met “{year}” in de titel.",
    "f_hint_custom": "De zoekfunctie van YouTube geeft enkel een geschatte datum. Bij geschatte datums geldt aan beide kanten een marge van ±1 jaar.",
    "chip_title": "Klik: genre tonen/verbergen · Dubbelklik: enkel dit genre (de termen worden aan de zoekopdracht toegevoegd)",
    "scope_title": "De volgende zoekopdracht voegt deze termen toe aan uw zoektekst."
  },
  "inbox": {
    "src_title": "Enkel treffers van deze bron tonen"
  },
  "watchlist": {
    "auto_title_off": "Nieuwe treffers gaan enkel naar de inbox",
    "hint_inbox": "Treffers wachten in de inbox tot u ze downloadt of negeert.",
    "suggested_title": "Voorgesteld op basis van de URL. Als u het ongewijzigd laat, vervangt de eerste controle het door de echte naam – of overschrijf het gewoon.",
    "ph_name": "bv. Gabber Vault",
    "ph_search": "bv. frenchcore liveset",
    "form_error": "De bron kon niet worden bewaard."
  },
  "downloads": {
    "paused": "<b>Wachtrij gepauzeerd.</b> De huidige download ligt stil tot u hervat.",
    "busy": "Er is nog een downloadrun bezig (bv. de geplande controle). De wachtrij wacht tot die klaar is."
  },
  "library": {
    "missing_chip_title": "Enkel items tonen waarvan het bestand ontbreekt"
  },
  "tabs_hint": {
    "appearance": "Look-and-feel. Wijzigingen zijn direct te zien en worden pas permanent na het bewaren."
  },
  "set": {
    "saving": "Bewaren …",
    "tab_reset_title": "Alle velden van dit tabblad op de standaardwaarden zetten (pas van kracht na “Bewaren”)",
    "state_clean": "Alles bewaard",
    "state_dirty": {
      "one": "{n} niet-bewaarde wijziging",
      "other": "{n} niet-bewaarde wijzigingen"
    },
    "general": {
      "language": {
        "help": "Taal van de interface en meldingen. “Automatisch” volgt de weergavetaal van Windows (anders Engels). De weergave wordt direct na het bewaren opnieuw opgebouwd."
      },
      "log_level": {
        "help": "Hoe gedetailleerd het logbestand en het live logboek zijn. DEBUG enkel voor probleemoplossing."
      }
    },
    "player": {
      "mode": {
        "help": "Wat ▶ in de bibliotheek gebruikt. De ingebouwde speler toont hoofdstukken als sprongmarkeringen en speelt door als u van weergave wisselt. De andere optie is per item beschikbaar in het menu."
      }
    },
    "search": {
      "append_year": {
        "help": "Bij de uploadperiode “Specifiek jaar” wordt het jaar aan de zoekterm toegevoegd (bv. “hardcore liveset 2013”). Zo vindt YouTube meer mixes uit dat jaar."
      }
    },
    "filters": {
      "upload_period": {
        "help": "Welke uploads standaard worden getoond. “Specifiek jaar” toont enkel mixes uit één jaar, “Aangepast” een van/tot-bereik."
      },
      "upload_year": {
        "help": "Een mix telt mee als het uploadjaar overeenkomt of het jaar in de titel staat. De zoekfunctie van YouTube geeft enkel een geschatte datum – daar geldt ±1 jaar."
      }
    },
    "blacklist": {
      "help": "U blokkeert kanalen via het menu van een kaart. Hier kunt u ze weer deblokkeren."
    },
    "download": {
      "write_cover_jpg": {
        "label": "Ook cover.jpg bewaren"
      }
    },
    "storage": {
      "target_dir": {
        "help": "Hoofdmap van de muziekopslag. Tijdelijke bestanden staan in “.tmp” eronder. In de draagbare versie wordt een relatief pad zoals “.\\Music” opgelost ten opzichte van de app-map (bv. op een USB-stick)."
      },
      "path_template": {
        "help": "Relatief ten opzichte van de doelmap, zonder bestandsextensie. “/” scheidt mappen. {id} moet erin staan (bij SoundCloud “sc-<id>”). {platform} wordt “YouTube” of “SoundCloud” – bv. als bovenste map om de bronnen te scheiden."
      }
    },
    "network": {
      "po_token_port": {
        "help": "Enkel HTTP-modus. De server luistert op 127.0.0.1."
      },
      "cookies_from_browser": {
        "help": "Meldt yt-dlp aan met uw browserlogin. Enkel inschakelen als het zonder niet meer werkt."
      },
      "proxy": {
        "help": "Optioneel, bv. socks5://127.0.0.1:1080. Leeg = rechtstreekse verbinding."
      }
    },
    "po": {
      "unsaved": "De test gebruikt de bewaarde instellingen. Bewaar eerst uw wijzigingen."
    },
    "cookies": {
      "warn_on": "<b>Noodoplossing actief.</b> PO-Token en browsercookies samen kunnen tot fouten of blokkades leiden, en uw YouTube-account wordt voor de verzoeken gebruikt. Zet het weer uit zodra het zonder werkt. Cookies komen nooit in het logboek."
    },
    "next": {
      "off_detail": "Noch de controle in de app, noch de Windows-taak is actief. De volglijst wordt enkel manueel gecontroleerd.",
      "unsaved": "Niet-bewaarde schemawijzigingen werken pas na het bewaren."
    },
    "maintenance": {
      "check_app_updates_on_start": {
        "help": "Vraagt GitHub één keer per start om een nieuwe versie. Er wordt niets gedownload tot u klikt."
      },
      "update_repo": {
        "help": "Repo in het formaat “eigenaar/repo”. Enkel wijzigen voor forks."
      }
    }
  },
  "dlg": {
    "outside_mix": {
      "title": "Enkel item verwijderen",
      "ok": "Enkel item verwijderen"
    },
    "backoff": {
      "text": "De blokkeertijd beschermt u: {p} meldde dat er te veel verzoeken binnenkwamen.",
      "warn": "<b>Hef enkel op als u zeker weet dat de blokkade voorbij is.</b> Als de app te vroeg opnieuw toegang probeert, kan {p} uw IP langer of permanent beperken."
    }
  },
  "toast": {
    "source_saved": "Bron bewaard: {name}",
    "settings_saved": "Instellingen bewaard",
    "genre_entry_only": "Genre: {genre} – enkel het item is gewijzigd, het bestand is niet bereikbaar"
  },
  "upd": {
    "unverified": "zonder controlesom (enkel ZIP-integriteit gecontroleerd)",
    "ready_sub": "Om te installeren wordt HCLoader eventjes gesloten en opnieuw gestart.",
    "notes_less": "Enkel hoogtepunten tonen"
  }
});
