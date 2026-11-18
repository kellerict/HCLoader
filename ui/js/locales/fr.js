/* HCLoader UI texts – Français.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "fr", "name": "Français", "dir": "ltr", "intl": "fr-FR"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "ARCHIVE DE MUSIQUE DURE",
    "mock": "MODE SIMULATION"
  },
  "nav": {
    "discover": "Découvrir",
    "inbox": "Boîte de réception",
    "watchlist": "Liste de suivi",
    "downloads": "Téléchargements",
    "library": "Bibliothèque",
    "log": "Journal",
    "settings": "Paramètres"
  },
  "navfoot": {
    "today": "AUJOURD’HUI",
    "next": "PROCH. VÉRIF."
  },
  "common": {
    "ok": "OK",
    "cancel": "Annuler",
    "save": "Enregistrer",
    "delete": "Supprimer",
    "edit": "Modifier",
    "remove": "Retirer",
    "reset": "Réinitialiser",
    "on": "oui",
    "off": "non",
    "current": "actuel",
    "loading": "chargement …",
    "add_chip": "+ ajouter",
    "empty": "« vide »",
    "empty_list": "« aucun »"
  },
  "fmt": {
    "today": "aujourd’hui",
    "yesterday": "hier",
    "never": "jamais",
    "no_date": "Date inconnue",
    "just_now": "à l’instant",
    "today_at": "aujourd’hui à {t}",
    "tomorrow_at": "demain à {t}",
    "yesterday_at": "hier à {t}",
    "views": {
      "one": "{v} vue",
      "other": "{v} vues"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "minutes",
    "mbs": "Mo/s",
    "bpm": "BPM",
    "chars": "caractères",
    "results": "résultats",
    "entries": "entrées",
    "clock": "h",
    "req_h": "req./h"
  },
  "range": {
    "ge_sleep": "≥ minimum",
    "ge_initial": "≥ valeur initiale"
  },
  "status": {
    "new": "Nouveau",
    "inbox": "Dans la boîte",
    "queued": "En file",
    "downloading": "Téléchargement",
    "done": "Téléchargé",
    "ignored": "Ignoré",
    "failed": "Erreur"
  },
  "period": {
    "all": "Tout",
    "7d": "7 derniers jours",
    "30d": "30 derniers jours",
    "1y": "12 derniers mois",
    "year": "Année précise",
    "custom": "Personnalisé"
  },
  "source_type": {
    "channel": "Chaîne",
    "playlist": "Playlist",
    "search": "Recherche"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Plateforme",
    "sc_off": "SoundCloud est désactivé – activez-le dans Paramètres › SoundCloud."
  },
  "genre": {
    "change": "Changer le genre",
    "manual": "Genre défini manuellement",
    "change_manual": "Changer le genre (défini manuellement)"
  },
  "run_kind": {
    "watchlist": "Liste de suivi",
    "headless": "Planificateur de tâches",
    "manual": "Manuel"
  },
  "phase": {
    "waiting": "En attente",
    "sleep": "Pause avant le prochain téléchargement",
    "download": "Téléchargement",
    "convert": "Conversion",
    "tag": "Étiquetage",
    "failed": "Échec"
  },
  "po_mode": {
    "off": "Non",
    "script": "Script",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Non",
    "script": "Script (Deno)",
    "http": "Serveur HTTP (local)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "manquant",
    "po": "PO token",
    "po_active": "actif ({mode})",
    "po_inactive": "inactif",
    "po_error": "Erreur",
    "backoff": "Blocage temporaire",
    "backoff_none": "aucun",
    "backoff_until": "jusqu’à {t} · encore {rest}",
    "queue": "File",
    "queue_empty": "vide",
    "queue_active": "active",
    "queue_paused": "en pause",
    "today": "Aujourd’hui",
    "next": "Proch. vérif.",
    "next_off": "non",
    "backoff_until_short": "jusqu’à {t}",
    "sc_backoff": "Blocage jusqu’à {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · téléchargés aujourd’hui {day}/{day_max} · {s}/{s_max} recherches cette heure",
    "sc_tip": "SoundCloud · téléchargés aujourd’hui {day}/{day_max} · {s}/{s_max} recherches cette heure",
    "backoff_tip": "{p} : blocage temporaire jusqu’à {t} (encore {rest})"
  },
  "schedule": {
    "due": "dû",
    "kind_app": "App",
    "kind_task": "Tâche",
    "tip_app": "Prochaine vérification de la liste de suivi dans l’app : {t} (tant que HCLoader est ouvert).",
    "tip_task": "Prochaine vérification de la liste de suivi via le Planificateur de tâches Windows : {t}.",
    "tip_any": "Prochaine vérification de la liste de suivi : {t}.",
    "tip_off": "Aucune vérification automatique – ni dans l’app ni via le Planificateur de tâches Windows.",
    "tip_backoff": "Aucune vérification tant que le blocage temporaire est actif."
  },
  "card": {
    "source": "Trouvé via la source de suivi « {name} »",
    "select": "Sélectionner",
    "open": "Ouvrir sur {p}",
    "ignore": "Ignorer",
    "unignore": "Ne plus ignorer",
    "more": "Autres actions",
    "download": "Télécharger",
    "watch": "Ajouter la chaîne à la liste de suivi",
    "block": "Bloquer la chaîne",
    "set_genre": "Définir le genre",
    "date_approx": "Date approximative – la recherche YouTube n’indique que « il y a X ans »",
    "date_unknown": "Aucune date de mise en ligne",
    "duplicate": "Probablement déjà téléchargé ({p})",
    "duplicate_title": "Titre très proche et même durée que « {title} » de {p} – déjà téléchargé ou en file là-bas. Vous pouvez quand même le télécharger.",
    "preview": "Aperçu uniquement (Go+) – téléchargement impossible",
    "preview_title": "SoundCloud ne propose qu’un aperçu de 30 secondes (Go+) pour ce titre. Il ne peut pas être téléchargé."
  },
  "discover": {
    "placeholder": "Rechercher un mix, live set, DJ, événement …",
    "search": "Rechercher",
    "searching_btn": "Recherche …",
    "searching": "Recherche – requête légère, ménage YouTube …",
    "sort": "Tri",
    "sort_rel": "Pertinence",
    "sort_date": "Plus récents d’abord",
    "sort_dur": "Plus longs d’abord",
    "sort_views": "Plus vus",
    "quota": "Recherches cette heure : {n} / {max}",
    "quota_sc": "Recherches SoundCloud cette heure : {n} / {max}",
    "placeholder_sc": "Rechercher sur SoundCloud : mix, set, DJ, podcast …",
    "platform_title": "Où chercher",
    "searching_sc": "Recherche – requête légère, ménage SoundCloud …",
    "ready_text_sc": "Saisissez un terme et appuyez sur Entrée pour chercher sur SoundCloud.",
    "previews": "{n} aperçu uniquement (Go+)",
    "previews_title": "Les aperçus Go+ ne peuvent jamais être téléchargés. Visibles quand « Masquer téléchargés et ignorés » est désactivé.",
    "filters": "Filtres",
    "toggle_filters": "Afficher/masquer le panneau de filtres",
    "f_duration": "Durée (minutes)",
    "f_min": "Minimum",
    "f_max": "Maximum (vide = sans limite)",
    "f_max_ph": "max.",
    "f_period": "Période de mise en ligne",
    "f_year": "Année",
    "f_year_prev": "Un an en arrière",
    "f_year_next": "Un an en avant",
    "f_from": "Du",
    "f_to": "Au",
    "f_hint_year": "La recherche YouTube n’indique qu’une date approximative (« il y a 13 ans »). Une tolérance de ±1 an s’applique donc – tout comme pour chaque mix avec « {year} » dans le titre.",
    "f_hint_custom": "La recherche YouTube n’indique qu’une date approximative. Pour les dates approximatives, une tolérance de ±1 an s’applique aux deux bornes.",
    "chip_title": "Clic : afficher/masquer le genre · Double-clic : ce genre uniquement (ses termes sont ajoutés à la recherche)",
    "scope": "Recherche élargie par",
    "scope_title": "La prochaine recherche ajoute ces termes à votre texte.",
    "searched": "Recherché avec",
    "stale": "Filtres modifiés depuis",
    "re_search": "Relancer la recherche",
    "re_search_title": "Les résultats proviennent de la dernière recherche. Relancez-la pour inclure le genre et l’année dans le terme (compte comme une recherche).",
    "need_query": "Saisissez d’abord un terme de recherche.",
    "f_inc": "Mots-clés à inclure",
    "f_exc": "Mots-clés à exclure",
    "f_show": "Affichage",
    "f_hide": "Masquer téléchargés et ignorés",
    "f_blacklist": "Appliquer la liste noire de chaînes",
    "count": {
      "one": "{n} résultat · {hidden} filtrés",
      "other": "{n} résultats · {hidden} filtrés"
    },
    "selected": "{n} sélectionnés",
    "select_all": "Tout sélectionner",
    "download_sel": "Télécharger la sélection",
    "ready_title": "Prêt",
    "ready_text": "Saisissez un terme de recherche et appuyez sur Entrée.",
    "none_title": "Rien trouvé",
    "none_text": "Assouplissez les filtres ou essayez d’autres termes.",
    "none_year": "Aucun résultat de {year}. Relancez la recherche pour inclure l’année dans le terme – ou changez l’année."
  },
  "inbox": {
    "title": "Boîte de réception",
    "sub": "Nouveaux résultats de la liste de suivi qui passent tous les filtres",
    "sub_n": {
      "one": "{n} nouveau résultat de la liste de suivi qui passe tous les filtres",
      "other": "{n} nouveaux résultats de la liste de suivi qui passent tous les filtres"
    },
    "ignore_all": "Tout ignorer",
    "download_all": "Tout télécharger",
    "ignore_sel": "Ignorer la sélection",
    "download_sel": "Télécharger la sélection",
    "select_all": "Tout sélectionner",
    "select_none": "Désélectionner",
    "src_all": "Toutes les sources",
    "src_none": "Aucune source",
    "src_title": "Afficher uniquement les résultats de cette source",
    "count": {
      "one": "{n} résultat",
      "other": "{n} résultats"
    },
    "count_of": "{n} sur {total} résultats",
    "selected": "{n} sélectionnés",
    "empty_title": "Boîte vide",
    "empty_text": "La liste de suivi n’a trouvé aucun nouveau mix.",
    "empty_nosrc": "Aucune source dans la liste de suivi pour l’instant – ajoutez une chaîne, une playlist ou une recherche, et les nouveaux mixes arriveront ici.",
    "empty_next": "Prochaine vérification : {t}.",
    "to_watchlist": "Aller à la liste de suivi"
  },
  "watchlist": {
    "title": "Liste de suivi",
    "sub_n": {
      "one": "{n} source · {active} active",
      "other": "{n} sources · {active} actives"
    },
    "sub_next": "prochaine vérification {t}",
    "add": "Source",
    "check_all": "Tout vérifier maintenant",
    "check": "Vérifier",
    "checking": "vérification …",
    "queued": "en attente …",
    "running": "Vérification …",
    "running_n": "Vérification {i} / {n} …",
    "col_active": "Active",
    "col_name": "Nom",
    "col_type": "Type",
    "col_genre": "Genre",
    "col_auto": "Nouveaux résultats",
    "col_max": "Max.",
    "col_last": "Dernière vérification",
    "col_new": "Nouveaux",
    "genre_auto": "automatique",
    "genre_auto_long": "Automatique (selon les mots-clés)",
    "auto_on": "télécharger",
    "auto_off": "boîte",
    "auto_title_on": "Les nouveaux résultats sont téléchargés automatiquement",
    "auto_title_off": "Les nouveaux résultats vont uniquement dans la boîte de réception",
    "new_title": "Afficher dans la boîte de réception",
    "check_title": "Vérifier cette source maintenant",
    "why_off": "La source n’est pas active",
    "why_running": "Une vérification est déjà en cours",
    "why_backoff": "Blocage temporaire actif – vérification bloquée",
    "why_backoff_p": "Blocage temporaire ({p}) actif – vérification bloquée",
    "why_sc_off": "SoundCloud est désactivé",
    "error_title": "La dernière vérification a échoué",
    "backoff": "<b>Blocage temporaire actif jusqu’à {t}</b> (encore {rest}). La liste de suivi ne peut pas être vérifiée – les vérifications planifiées sont aussi suspendues.",
    "backoff_p": "<b>Blocage temporaire ({p}) actif jusqu’à {t}</b> (encore {rest}). Les sources {p} sont ignorées d’ici là – {other} continue de fonctionner.",
    "backoff_link_sc": "Ouvrir SoundCloud",
    "backoff_link": "Ouvrir Limitation",
    "none_active": "Aucune source active à vérifier",
    "empty_title": "Aucune source",
    "empty_text": "Ajoutez une chaîne, une playlist ou une recherche enregistrée.",
    "add_title": "Ajouter une source",
    "edit_title": "Modifier la source",
    "f_type": "Type",
    "f_name": "Nom",
    "f_url": "URL",
    "f_query": "Terme de recherche",
    "f_genre": "Genre par défaut",
    "f_max": "Entrées max.",
    "f_newest_last": "Les plus récentes sont à la fin (lire la playlist à l’envers)",
    "hint_newest_last": "Pour de nombreuses playlists, YouTube ajoute les nouvelles vidéos à la fin. Lit toute la playlist (environ 1 requête pour 100 vidéos, 2000 entrées max.).",
    "rev_title": "Les plus récentes sont à la fin – la playlist est lue depuis la fin",
    "rev_short": "à l’envers",
    "f_enabled": "Active – incluse dans « Tout vérifier » et dans la planification",
    "f_hits": "Nouveaux résultats",
    "hits_inbox": "Vers la boîte de réception",
    "hits_auto": "Télécharger automatiquement",
    "hint_inbox": "Les résultats attendent dans la boîte de réception jusqu’à ce que vous les téléchargiez ou les ignoriez.",
    "hint_auto": "Les résultats qui passent tous les filtres vont directement dans la file.",
    "hint_channel": "Chaîne YouTube (…/@nom ou …/channel/UC…, éventuellement /videos ou /streams) ou profil SoundCloud (soundcloud.com/nom).",
    "hint_playlist": "Playlist YouTube avec « list=… » ou set SoundCloud (soundcloud.com/nom/sets/set). Les entrées les plus récentes sont vérifiées.",
    "f_platform": "Rechercher sur",
    "detected": "détecté : {p} · {type}",
    "not_detected": "URL non reconnue",
    "suggested": "Suggestion",
    "suggested_title": "Suggéré d’après l’URL. Sans modification, la première vérification le remplace par le vrai nom – ou écrasez-le simplement.",
    "hint_name_auto": "Suggéré d’après l’URL – n’hésitez pas à le modifier. Sans modification, la première vérification définit le vrai nom.",
    "hint_name_later": "Le nom est défini par la première vérification – ou saisissez-le ici vous-même.",
    "name_auto_title": "Nom provisoire – la prochaine vérification définit le vrai",
    "hint_search": "Recherche enregistrée, comme sous « Découvrir » – compte comme une recherche par vérification.",
    "hint_max": "par vérification",
    "max_default": "(par défaut)",
    "max_default_title": "Pas de valeur propre : « Entrées par source » de Paramètres › Planification s’applique",
    "max_title": "Vide = valeur par défaut de Paramètres › Planification. Au maximum 200, 100 pour les sources de recherche.",
    "ph_name": "p. ex. Gabber Vault",
    "ph_name_later": "défini par la première vérification",
    "ph_channel": "https://www.youtube.com/@chaine  ou  https://soundcloud.com/nom",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  ou  https://soundcloud.com/nom/sets/…",
    "ph_search": "p. ex. frenchcore liveset",
    "form_error": "La source n’a pas pu être enregistrée."
  },
  "downloads": {
    "title": "Téléchargements",
    "sub": "Séquentiel, un téléchargement à la fois",
    "pause": "Pause",
    "resume": "Reprendre",
    "cancel": "Annuler",
    "retry": "Réessayer",
    "remove": "Retirer",
    "up": "Monter",
    "down": "Descendre",
    "eta": "Temps restant",
    "position": "Position {n}",
    "sleep_left": "reprend dans",
    "sleep_why": "Limitation : pause aléatoire de {min}–{max} s entre deux téléchargements",
    "next_up": "Prochain",
    "sleeping": "En pause",
    "sleep_range": "sur {min}–{max} s",
    "blocked_wait": "En attente – {why}",
    "why_backoff": "Blocage temporaire",
    "why_day": "Limite quotidienne",
    "why_run": "Limite par exécution",
    "why_paused": "en pause",
    "why_restart": "Redémarrage requis",
    "why_busy": "autre exécution active",
    "why_pot": "Serveur PO-Token pas prêt",
    "why_target": "Dossier cible inaccessible",
    "why_error": "Module de téléchargement manquant",
    "summary": "Aujourd’hui {day}/{day_max} · Exécution {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} continue de télécharger.",
    "steps": "Télécharger · Convertir · Étiqueter",
    "unlimited": "illimité",
    "l_run": "Cette exécution",
    "l_day": "Aujourd’hui",
    "l_rate": "Limite de débit",
    "l_sleep": "Pause entre les téléchargements",
    "sec_queue": "File",
    "sec_failed": "Échecs",
    "empty_title": "File vide",
    "empty_text": "Sélectionnez des mixes sous « Découvrir » ou dans la « Boîte de réception ».",
    "paused": "<b>File en pause.</b> Le téléchargement en cours est suspendu jusqu’à la reprise.",
    "backoff": "<b>Blocage temporaire actif jusqu’à {t}</b> (encore {rest}). Téléchargements, recherche et liste de suivi bloqués.",
    "backoff_rest": {
      "one": "<b>Blocage temporaire actif jusqu’à {t}</b> (encore {rest}). Téléchargements, recherche et liste de suivi bloqués – {n} reste dans la file.",
      "other": "<b>Blocage temporaire actif jusqu’à {t}</b> (encore {rest}). Téléchargements, recherche et liste de suivi bloqués – {n} restent dans la file."
    },
    "limit_day": "<b>Limite quotidienne atteinte ({n}/{max}).</b> Le reste demeure dans la file et reprend demain.",
    "limit_day_rest": {
      "one": "<b>Limite quotidienne atteinte ({n}/{max}).</b> {rest} reste dans la file et reprend demain.",
      "other": "<b>Limite quotidienne atteinte ({n}/{max}).</b> {rest} restent dans la file et reprennent demain."
    },
    "limit_run": "<b>Limite atteinte – {max}/{max} dans cette exécution.</b> Le reste demeure dans la file et reprend à la prochaine exécution.",
    "limit_run_rest": {
      "one": "<b>Limite atteinte – {max}/{max} dans cette exécution.</b> {rest} reste dans la file et reprend à la prochaine exécution.",
      "other": "<b>Limite atteinte – {max}/{max} dans cette exécution.</b> {rest} restent dans la file et reprennent à la prochaine exécution."
    },
    "limits_link": "Modifier les limites",
    "new_run": "Démarrer une nouvelle exécution",
    "need_restart": "<b>Redémarrage requis.</b> yt-dlp a été mis à jour – redémarrez HCLoader. La file est conservée.",
    "busy": "Une autre exécution de téléchargement est active (p. ex. la vérification planifiée). La file attend qu’elle se termine.",
    "local_pot": {
      "one": "<b>Serveur PO-Token pas prêt.</b> {rest} reste dans la file et reprend dès qu’il fonctionne.",
      "other": "<b>Serveur PO-Token pas prêt.</b> {rest} restent dans la file et reprennent dès qu’il fonctionne."
    },
    "local_target": {
      "one": "<b>Dossier cible inaccessible ou protégé en écriture.</b> {rest} reste dans la file et reprend dès qu’il est de nouveau disponible.",
      "other": "<b>Dossier cible inaccessible ou protégé en écriture.</b> {rest} restent dans la file et reprennent dès qu’il est de nouveau disponible."
    },
    "local_error": {
      "one": "<b>Le module de téléchargement (yt-dlp) n’a pas pu être chargé.</b> {rest} reste dans la file. Nouvel essai après « Reprendre », de nouvelles entrées ou l’enregistrement des paramètres.",
      "other": "<b>Le module de téléchargement (yt-dlp) n’a pas pu être chargé.</b> {rest} restent dans la file. Nouvel essai après « Reprendre », de nouvelles entrées ou l’enregistrement des paramètres."
    },
    "local_link_pot": "Paramètres réseau",
    "local_link_target": "Changer l’emplacement de stockage",
    "local_link_error": "Maintenance"
  },
  "library": {
    "title": "Bibliothèque",
    "sub": {
      "one": "{n} mix",
      "other": "{n} mixes"
    },
    "sub_shown": "{n} sur {total} affichés",
    "search": "Titre, chaîne ou chemin …",
    "all_genres": "Tous les genres",
    "all_channels": "Toutes les chaînes",
    "all_years": "Toutes les années",
    "f_genre": "Genre",
    "f_channel": "Chaîne",
    "f_year": "Année",
    "f_sort": "Tri",
    "sort_newest": "Plus récents d’abord",
    "sort_title": "Titre A–Z",
    "sort_channel": "Chaîne A–Z",
    "sort_duration": "Plus longs d’abord",
    "view_list": "Liste",
    "view_grid": "Mosaïque",
    "clear": "Réinitialiser les filtres",
    "col_title": "Titre",
    "col_channel": "Chaîne",
    "col_genre": "Genre",
    "col_year": "Année",
    "col_duration": "Durée",
    "col_size": "Taille",
    "col_loaded": "Téléchargé",
    "play": "Lire",
    "pause": "Pause",
    "play_external": "Ouvrir dans le lecteur par défaut",
    "play_internal": "Lire dans le lecteur de l’app",
    "play_missing": "Fichier manquant – lecture impossible",
    "more": "Afficher {n} de plus",
    "now_playing": "En cours de lecture",
    "retag_short": "Réétiqueter",
    "genre_working": "Définition du genre …",
    "open_folder": "Ouvrir le dossier",
    "retag": "Réétiqueter (étiquettes, pochette et emplacement selon les paramètres actuels)",
    "delete": "Supprimer le fichier",
    "remove": "Retirer l’entrée",
    "retagging": "Réétiquetage …",
    "cue_title": "Liste des pistes en fichier .cue à côté du MP3",
    "missing": "Fichier manquant",
    "missing_title": "Le fichier est introuvable à l’emplacement enregistré (déplacé ou supprimé ?)",
    "missing_chip": {
      "one": "{n} manquant",
      "other": "{n} manquants"
    },
    "missing_chip_title": "Afficher uniquement les entrées dont le fichier est manquant",
    "stat_count": "Mixes",
    "stat_duration": "Durée totale",
    "stat_size": "Taille",
    "stat_genres": "Par genre",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "Go",
    "unit_mb": "Mo",
    "unit_kb": "Ko",
    "group_meta": {
      "one": "{n} mix · {dur}",
      "other": "{n} mixes · {dur}"
    },
    "empty_title": "Rien n’a encore été téléchargé",
    "empty_text": "Chaque mix arrive ici dès qu’il est téléchargé et étiqueté – avec pochette, genre et emplacement.",
    "empty_discover": "Découvrir des mixes",
    "empty_watchlist": "Configurer la liste de suivi",
    "target_down": "Dossier cible inaccessible : {path}",
    "target_down_hint": "Vérifiez le disque ou le partage réseau. Tant qu’il est absent, l’état des fichiers est inconnu : « Réétiqueter » et « Retirer l’entrée » sont désactivés.",
    "unknown_title": "Dossier cible inaccessible – état du fichier inconnu",
    "none_title": "Aucun résultat",
    "none_text": "Aucune entrée ne correspond à la recherche et aux filtres.",
    "group_by": "Grouper par",
    "group_none": "Aucun",
    "group_genre": "Genre",
    "group_festival": "Festival",
    "group_artist": "Artiste",
    "group_year": "Année",
    "group_unknown": "Inconnu"
  },
  "player": {
    "label": "Mini-lecteur",
    "play": "Lire (Espace)",
    "pause": "Pause (Espace)",
    "back": "Reculer de 30 secondes",
    "fwd": "Avancer de 30 secondes",
    "prev": "Piste précédente",
    "next": "Piste suivante",
    "seek": "Position",
    "mute": "Couper le son",
    "unmute": "Rétablir le son",
    "volume": "Volume",
    "close": "Fermer le lecteur",
    "tracks": "Liste des pistes",
    "tracks_n": {
      "one": "{n} piste",
      "other": "{n} pistes"
    },
    "tracks_toggle": "Afficher/masquer la liste des pistes",
    "no_tracks": "Aucun chapitre dans ce fichier",
    "total": "Durée totale {t}",
    "keys": "Espace : lire/pause · ←/→ : 10 s",
    "err_load": "Lecture impossible",
    "err_src": "Lecture impossible : adresse de fichier non valide",
    "err_play": "Le fichier ne peut pas être lu : {title}",
    "external": "Ouverture dans le lecteur par défaut …"
  },
  "log": {
    "title": "Journal",
    "sub": "Journal en direct et historique des exécutions",
    "live": "Journal en direct",
    "history": "Historique des exécutions",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Alerte",
    "lvl_error": "Erreur",
    "lvl_title": "Afficher/masquer le niveau « {lvl} »",
    "search": "Rechercher dans le journal …",
    "following": "Direct",
    "paused": "En pause",
    "follow_title": "Défiler automatiquement jusqu’à la ligne la plus récente (se met en pause quand on remonte)",
    "jump": "Aller à la fin",
    "jump_new": {
      "one": "{n} nouvelle ligne",
      "other": "{n} nouvelles lignes"
    },
    "copy": "Copier",
    "copy_title": "Copier les lignes visibles dans le presse-papiers",
    "open_logs": "Dossier des journaux",
    "open_logs_title": "Ouvrir le dossier contenant les fichiers journaux complets",
    "lines": {
      "one": "{n} ligne",
      "other": "{n} lignes"
    },
    "lines_of": "{n} sur {total} lignes",
    "empty": "Aucune ligne pour ces niveaux.",
    "empty_search": "Aucune ligne ne contient « {q} ».",
    "no_runs": "Aucune exécution pour l’instant.",
    "no_runs_kind": "Aucune exécution de ce type.",
    "found": "trouvés",
    "downloaded": "téléchargés",
    "errors": "erreurs",
    "running": "en cours …",
    "kind_all": "Toutes",
    "timeline": "Chronologie",
    "table": "Tableau",
    "view_title": "Affichage de l’historique des exécutions",
    "col_kind": "Type",
    "col_start": "Début",
    "col_duration": "Durée",
    "col_found": "Trouvés",
    "col_downloaded": "Téléchargés",
    "col_errors": "Erreurs",
    "col_note": "Remarque",
    "backoff": "Blocage temporaire",
    "runs_sum": {
      "one": "{n} exécution · {dl} téléchargés · {err} erreurs",
      "other": "{n} exécutions · {dl} téléchargés · {err} erreurs"
    },
    "today": "Aujourd’hui",
    "yesterday": "Hier"
  },
  "settings": {
    "title": "Paramètres",
    "sub": "Tout ce que fait l’app se configure ici"
  },
  "tabs": {
    "general": "Général",
    "filters": "Filtres et mots-clés",
    "genres": "Genres",
    "download": "Téléchargement et qualité",
    "storage": "Stockage et étiquettes",
    "throttle": "Limitation",
    "soundcloud": "SoundCloud",
    "network": "Réseau et PO-Token",
    "schedule": "Planification",
    "appearance": "Apparence",
    "maintenance": "Maintenance",
    "festivals": "Festivals et séries"
  },
  "tabs_hint": {
    "general": "Comportement de base de l’app.",
    "filters": "Filtres par défaut pour la recherche et la liste de suivi. Peuvent être modifiés temporairement dans le panneau de filtres sous « Découvrir ».",
    "genres": "L’ordre correspond à la priorité. Le premier genre dont un mot-clé apparaît dans le titre l’emporte. Les genres définis manuellement et le genre par défaut d’une source sont prioritaires.",
    "download": "YouTube fournit généralement de l’Opus à environ 130–160 kbit/s. Le MP3 est une conversion et ne sonne pas mieux que la source – mais il se lit partout.",
    "storage": "Où vont les fichiers et comment ils sont nommés. La structure est pensée pour les serveurs multimédias comme Plex ou Jellyfin.",
    "throttle": "Limite la charge sur YouTube. Ces valeurs s’appliquent ensemble à la recherche, à la liste de suivi et aux téléchargements. SoundCloud a ses propres valeurs dans l’onglet « SoundCloud ».",
    "soundcloud": "SoundCloud comme seconde source pour la recherche, la liste de suivi et les téléchargements – avec ses propres limites, compteurs et blocage temporaire, indépendants de YouTube.",
    "network": "Le PO-Token identifie les requêtes comme provenant d’un vrai navigateur et réduit le risque de blocage anti-bot.",
    "schedule": "Quand la liste de suivi est vérifiée automatiquement – dans l’app et via le Planificateur de tâches Windows.",
    "appearance": "Aspect et ambiance. Les modifications sont prévisualisées immédiatement et ne deviennent définitives qu’après enregistrement.",
    "maintenance": "Versions, mises à jour, base de données.",
    "festivals": "Reconnaît le festival ou la série, l’année, la scène et le type de set à partir des titres enregistrés – hors ligne, sans la moindre requête supplémentaire."
  },
  "set": {
    "default": "Par défaut",
    "range": "Plage",
    "browse": "Parcourir",
    "not_set": "non défini",
    "saving": "Enregistrement …",
    "discard": "Annuler les modifications",
    "tab_reset": "Réinitialiser l’onglet",
    "tab_reset_title": "Remet tous les champs de cet onglet à leurs valeurs par défaut (effectif seulement après « Enregistrer »)",
    "state_clean": "Tout est enregistré",
    "state_dirty": {
      "one": "{n} modification non enregistrée",
      "other": "{n} modifications non enregistrées"
    },
    "state_errors": {
      "one": "{n} erreur – à corriger",
      "other": "{n} erreurs – à corriger"
    },
    "h": {
      "collector": "Collecteur de festivals",
      "search": "Recherche",
      "duration": "Durée et période",
      "keywords": "Mots-clés",
      "display": "Affichage",
      "cover": "Pochette",
      "chapters": "Chapitres et liste des pistes",
      "tags": "Étiquettes",
      "soundcloud": "SoundCloud",
      "playback": "Lecture",
      "pauses": "Pauses et bande passante",
      "limits": "Limites",
      "backoff": "Blocage temporaire en cas de blocage",
      "po": "Fournisseur de PO-Token",
      "fallback": "Solutions de contournement",
      "in_app": "Dans l’app",
      "task": "Planificateur de tâches Windows",
      "updates": "Mises à jour",
      "app_update": "Mise à jour de l’app",
      "release_notes": "Notes de version",
      "database": "Base de données",
      "reset": "Réinitialisation",
      "detection": "Détection",
      "series": "Séries",
      "backfill": "Tout lire (une fois)"
    },
    "general": {
      "language": {
        "label": "Langue",
        "help": "Langue de l’interface et des messages. « Automatique » suit la langue d’affichage de Windows (sinon l’anglais). La vue est reconstruite juste après l’enregistrement."
      },
      "start_view": {
        "label": "Vue de démarrage",
        "help": "Quelle vue s’ouvre au démarrage."
      },
      "log_level": {
        "label": "Niveau de journalisation",
        "help": "Niveau de détail du fichier journal et du journal en direct. DEBUG uniquement pour le dépannage."
      },
      "confirm_delete": {
        "label": "Confirmer la suppression",
        "help": "Demander avant de supprimer un mix de la bibliothèque (entrée + fichier)."
      }
    },
    "player": {
      "mode": {
        "label": "Lire avec",
        "help": "Ce qu’utilise ▶ dans la bibliothèque. Le lecteur intégré affiche les chapitres comme repères de saut et continue la lecture quand vous changez de vue. L’autre option est disponible par entrée dans le menu."
      }
    },
    "search": {
      "results_count": {
        "label": "Résultats par recherche",
        "help": "Nombre de résultats récupérés par une recherche (légère). Plus de résultats = plus de charge sur YouTube."
      },
      "append_year": {
        "label": "Ajouter l’année à la recherche",
        "help": "Avec la période « Année précise », l’année est ajoutée au terme de recherche (p. ex. « hardcore liveset 2013 »). YouTube trouve ainsi plus de mixes de cette année."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Durée minimale",
        "help": "Les vidéos plus courtes ne sont jamais considérées comme un mix."
      },
      "max_duration": {
        "label": "Durée maximale",
        "help": "0 = illimité."
      },
      "upload_period": {
        "label": "Période de mise en ligne",
        "help": "Quelles mises en ligne sont affichées par défaut. « Année précise » n’affiche que les mixes d’une année, « Personnalisé » une plage du/au."
      },
      "upload_year": {
        "label": "Année",
        "help": "Un mix est retenu si l’année de mise en ligne correspond ou si l’année figure dans le titre. La recherche YouTube n’indique qu’une date approximative – ±1 an s’applique alors."
      },
      "upload_from": {
        "label": "Du",
        "help": "Date de mise en ligne la plus ancienne. Vide = ouvert."
      },
      "upload_to": {
        "label": "Au",
        "help": "Date de mise en ligne la plus récente. Vide = ouvert. Pour les dates approximatives, une tolérance de ±1 an s’applique aux deux bornes."
      },
      "include_keywords": {
        "label": "Mots-clés à inclure",
        "help": "Au moins un doit apparaître dans le titre. Vide = tout autoriser. Entrée ou virgule pour ajouter."
      },
      "exclude_keywords": {
        "label": "Mots-clés à exclure",
        "help": "Si l’un d’eux apparaît dans le titre, la vidéo est écartée."
      },
      "match_description": {
        "label": "Chercher dans la description",
        "help": "Vérifie aussi les mots-clés dans la description de la vidéo. Les requêtes légères ne la fournissent souvent pas."
      },
      "hide_done_ignored": {
        "label": "Masquer téléchargés et ignorés",
        "help": "Masque dans les résultats les vidéos déjà téléchargées et ignorées."
      },
      "apply_channel_blacklist": {
        "label": "Appliquer la liste noire de chaînes",
        "help": "Ne jamais afficher les vidéos des chaînes bloquées."
      },
      "hide_cross_platform_duplicates": {
        "label": "Masquer les doublons entre plateformes",
        "help": "Masque les résultats probablement déjà téléchargés ou en file depuis l’autre plateforme (YouTube ou SoundCloud) – même durée (±5 s) et titre très proche. Désactivé : ils apparaissent avec la mention « Probablement déjà téléchargé »."
      }
    },
    "blacklist": {
      "label": "Chaînes bloquées",
      "help": "Vous bloquez des chaînes via le menu d’une carte. Ici, vous pouvez les débloquer.",
      "none": "Aucune chaîne bloquée",
      "unblock": "Débloquer"
    },
    "genres": {
      "add": "Genre",
      "up": "Priorité plus haute",
      "down": "Priorité plus basse",
      "delete": "Supprimer le genre",
      "color": "Choisir la couleur",
      "name_ph": "Nom",
      "kw_ph": "+ mot-clé",
      "fallback": "Repli – s’applique quand aucun mot-clé ne correspond. Toujours présent, toujours en dernier."
    },
    "download": {
      "audio_format": {
        "label": "Format de sortie",
        "help": "MP3, ou conserver l’original de YouTube sans conversion."
      },
      "mp3_quality": {
        "label": "Qualité MP3",
        "help": "320 kbit/s CBR est le plus compatible, V0 VBR économise un peu d’espace."
      },
      "embed_cover": {
        "label": "Intégrer la pochette",
        "help": "Écrit la miniature, recadrée en carré, dans le fichier comme pochette."
      },
      "write_cover_jpg": {
        "label": "Enregistrer aussi cover.jpg",
        "help": "Pour les serveurs multimédias qui lisent la pochette du dossier."
      },
      "write_cue": {
        "label": "Écrire un fichier .cue",
        "help": "Liste des pistes d’après les chapitres ou les horodatages de la description, à côté du fichier audio."
      },
      "write_id3_chapters": {
        "label": "Écrire les chapitres ID3",
        "help": "Intègre les repères de chapitre (CHAP/CTOC) directement dans le MP3."
      },
      "keep_original_soundcloud": {
        "label": "Conserver l’original SoundCloud",
        "help": "Enregistre l’audio SoundCloud tel quel (AAC 160 kbit/s en .m4a, MP3 128 kbit/s en .mp3) – pas de seconde conversion avec perte. Désactivé : comme « Format de sortie »."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Dossier cible",
        "help": "Racine du stockage musical. Les fichiers temporaires sont conservés dans « .tmp » en dessous. Dans la version portable, un chemin relatif comme « .\\Music » est résolu par rapport au dossier de l’app (p. ex. sur une clé USB)."
      },
      "path_template": {
        "label": "Modèle de chemin",
        "help": "Relatif au dossier cible, sans extension de fichier. « / » sépare les dossiers. {id} doit être inclus (pour SoundCloud « sc-<id> »). {platform} devient « YouTube » ou « SoundCloud » – p. ex. comme dossier racine pour séparer les sources."
      },
      "max_title_length": {
        "label": "Longueur max. du titre",
        "help": "Les titres plus longs sont raccourcis dans le nom du fichier."
      },
      "max_path_length": {
        "label": "Longueur max. du chemin",
        "help": "Chemin complet, dossier cible inclus. Sans configuration supplémentaire, Windows autorise 259 caractères."
      },
      "artist_from_title": {
        "label": "Lire l’artiste dans le titre",
        "help": "Reconnaît les motifs « ARTISTE @ ÉVÉNEMENT » et « ARTISTE - TITRE », sinon utilise le nom de la chaîne."
      },
      "title_cleanup_patterns": {
        "label": "Nettoyer le titre",
        "help": "Expressions régulières dont les correspondances sont retirées du titre. Entrée pour ajouter.",
        "ph": "+ regex"
      },
      "album_from_edition": {
        "label": "Album = édition",
        "help": "Écrit l’édition (p. ex. « Defqon.1 2024 ») comme tag d’album, pour que Plex et Jellyfin affichent tous les sets d’un festival comme un seul album. Désactivé : album = titre, comme avant."
      }
    },
    "path_preview": {
      "label": "Aperçu",
      "help": "Cliquez sur les espaces réservés pour les insérer dans le modèle de chemin.",
      "fest": "{festival}, {event_year} et {stage} ne sont remplis que si un festival est attribué. Sinon ils disparaissent, avec les séparateurs restants et les dossiers vides."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pause entre les requêtes",
        "help": "Temps d’attente entre les requêtes de métadonnées (recherche, liste de suivi)."
      },
      "sleep_interval": {
        "label": "Pause de téléchargement – minimum",
        "help": "Après chaque téléchargement suit une pause aléatoire entre le minimum et le maximum."
      },
      "max_sleep_interval": {
        "label": "Pause de téléchargement – maximum",
        "help": "Borne supérieure de la pause aléatoire."
      },
      "limit_rate_mb": {
        "label": "Débit de téléchargement",
        "help": "Bande passante maximale. 0 = illimité (déconseillé)."
      },
      "max_downloads_per_run": {
        "label": "Téléchargements max. par exécution",
        "help": "Le reste demeure dans la file."
      },
      "max_downloads_per_day": {
        "label": "Téléchargements max. par jour",
        "help": "Le compteur couvre ensemble les téléchargements manuels et automatiques."
      },
      "max_searches_per_hour": {
        "label": "Recherches max. par heure",
        "help": "Protège contre une recherche en continu par inadvertance."
      },
      "backoff_initial_hours": {
        "label": "Blocage temporaire – valeur initiale",
        "help": "Durée de blocage après un HTTP 429 ou « confirmez que vous n’êtes pas un robot »."
      },
      "backoff_max_hours": {
        "label": "Blocage temporaire – maximum",
        "help": "La durée de blocage double à chaque nouveau blocage jusqu’à cette valeur."
      }
    },
    "backoff": {
      "none": "Aucun blocage temporaire actif ({p})",
      "none_detail": "La recherche, la liste de suivi et les téléchargements depuis {p} sont autorisés.",
      "active": "Blocage temporaire actif ({p})",
      "active_detail": "jusqu’à {t} · encore {rest} · niveau {level}",
      "blocked": "{p} a signalé un blocage. La recherche, la liste de suivi et les téléchargements depuis {p} sont bloqués jusqu’à l’expiration du délai.",
      "clear": "Lever manuellement",
      "sc_off": "SoundCloud est désactivé",
      "sc_off_detail": "Pas de recherche SoundCloud, pas de vérification de la liste de suivi et pas de téléchargements depuis SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Utiliser SoundCloud",
        "help": "Désactivé : pas de recherche SoundCloud, pas de vérification des sources SoundCloud et pas de téléchargements SoundCloud. Ce qui est déjà téléchargé reste dans la bibliothèque."
      },
      "sleep_requests": {
        "label": "Pause entre les requêtes",
        "help": "Temps d’attente entre les requêtes de métadonnées vers SoundCloud (recherche, liste de suivi)."
      },
      "sleep_interval": {
        "label": "Pause de téléchargement – minimum",
        "help": "Après chaque téléchargement SoundCloud suit une pause aléatoire entre le minimum et le maximum."
      },
      "max_sleep_interval": {
        "label": "Pause de téléchargement – maximum",
        "help": "Borne supérieure de la pause aléatoire."
      },
      "limit_rate_mb": {
        "label": "Débit de téléchargement",
        "help": "Bande passante maximale. 0 = illimité (déconseillé)."
      },
      "max_downloads_per_run": {
        "label": "Téléchargements max. par exécution",
        "help": "Compteur distinct pour SoundCloud. Le reste demeure dans la file."
      },
      "max_downloads_per_day": {
        "label": "Téléchargements max. par jour",
        "help": "Compteur distinct pour SoundCloud, téléchargements manuels et automatiques confondus."
      },
      "max_searches_per_hour": {
        "label": "Recherches max. par heure",
        "help": "Compteur distinct pour SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Blocage temporaire – valeur initiale",
        "help": "Durée de blocage après que SoundCloud a signalé trop de requêtes (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Blocage temporaire – maximum",
        "help": "La durée de blocage double à chaque nouveau blocage jusqu’à cette valeur."
      }
    },
    "ladder": {
      "label": "Niveaux",
      "help": "Comment la durée de blocage augmente avec les valeurs actuelles.",
      "reset": "Réinitialisé après une exécution réussie",
      "invalid": "Valeurs non valides"
    },
    "network": {
      "po_token_mode": {
        "label": "Mode",
        "help": "Plugin bgutil pour yt-dlp. Script lance Deno au besoin, HTTP maintient un serveur local en fonctionnement."
      },
      "po_token_port": {
        "label": "Port HTTP",
        "help": "Mode HTTP uniquement. Le serveur écoute sur 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Validité du token",
        "help": "Passé ce délai, un nouveau token est généré. La valeur est arrondie à l’heure entière (au moins 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies du navigateur",
        "help": "Connecte yt-dlp avec la session de votre navigateur. À activer uniquement si cela ne fonctionne plus sans."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Facultatif, p. ex. socks5://127.0.0.1:1080. Vide = connexion directe.",
        "ph": "aucun proxy"
      }
    },
    "po": {
      "active": "PO-Token actif",
      "inactive": "PO-Token inactif",
      "error": "Erreur PO-Token",
      "mode": "Mode",
      "test": "Tester",
      "testing": "Test en cours …",
      "test_ok": "Test réussi.",
      "test_fail": "Échec du test.",
      "unsaved": "Le test utilise les paramètres enregistrés. Enregistrez d’abord vos modifications."
    },
    "cookies": {
      "warn_off": "<b>Recommandé : désactivé.</b> Combiner PO-Token et cookies du navigateur peut poser problème.",
      "warn_on": "<b>Contournement actif.</b> Combiner PO-Token et cookies du navigateur peut provoquer des erreurs ou des blocages, et votre compte YouTube est utilisé pour les requêtes. Désactivez-le dès que cela fonctionne sans. Les cookies n’atterrissent jamais dans le journal."
    },
    "schedule": {
      "in_app_check": {
        "label": "Vérifier pendant que l’app est ouverte",
        "help": "La liste de suivi est vérifiée à l’intervalle configuré tant que la fenêtre est ouverte."
      },
      "watchlist_interval_hours": {
        "label": "Intervalle",
        "help": "Délai entre deux vérifications dans l’app."
      },
      "entries_per_source": {
        "label": "Entrées par source",
        "help": "Combien des entrées les plus récentes sont récupérées (légèrement) à chaque vérification (valeur par défaut pour les nouvelles sources)."
      },
      "task_scheduler_enabled": {
        "label": "Utiliser le Planificateur de tâches",
        "help": "Vérifie aussi la liste de suivi quand l’app est fermée (headless). Activé par « Créer la tâche »."
      },
      "task_time": {
        "label": "Heure",
        "help": "Heure de démarrage quotidienne de la tâche planifiée."
      }
    },
    "next": {
      "title": "Prochaine vérification",
      "off": "Aucune vérification automatique",
      "off_detail": "Ni la vérification dans l’app ni la tâche Windows ne sont actives. La liste de suivi n’est vérifiée que manuellement.",
      "app_detail": "Dans l’app, toutes les {h} h – tant que HCLoader est ouvert.",
      "task_detail": "Via le Planificateur de tâches Windows, chaque jour à {time} – même quand l’app est fermée.",
      "any_detail": "La plus proche entre l’intervalle de l’app et la tâche Windows.",
      "also_task": "Aussi : tâche Windows chaque jour à {time}.",
      "also_app": "Aussi dans l’app toutes les {h} h.",
      "pending": "Pas encore planifié",
      "pending_detail": "L’app fixe la prochaine date dès qu’elle a vérifié la liste de suivi pour la première fois.",
      "due": "Dû – démarre sous peu",
      "backoff": "<b>Blocage temporaire actif.</b> Aucune vérification jusqu’à {t} ; la date est rattrapée ou sautée ensuite.",
      "unsaved": "Les modifications de planification non enregistrées ne prennent effet qu’après enregistrement."
    },
    "task": {
      "loading": "Interrogation de la tâche …",
      "registered": "Tâche enregistrée",
      "registered_detail": "{name} · chaque jour à {time} · prochaine exécution {next}",
      "none": "Aucune tâche enregistrée",
      "none_detail": "Crée une tâche Windows quotidienne à {time} (schtasks).",
      "create": "Créer la tâche",
      "remove": "Supprimer la tâche",
      "moved": "L’app a été déplacée – recréez la tâche",
      "moved_detail": "La tâche planifiée lance toujours {cmd}. La recréer utilise le dossier actuel de l’app.",
      "recreate": "Recréer la tâche",
      "unknown": "État de la tâche inconnu",
      "unknown_detail": "Le Planificateur de tâches Windows n’a pas répondu. Le réglage reste inchangé.",
      "recheck": "Vérifier à nouveau"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Réduire les effets",
        "help": "Désactive les lignes de balayage, le glitch et toutes les animations."
      },
      "scanlines": {
        "label": "Lignes de balayage et bruit",
        "help": "Fine surcouche sur toute l’interface."
      },
      "pulse_bpm": {
        "label": "Pulsation de grosse caisse",
        "help": "Le rythme auquel pulse la barre de progression."
      }
    },
    "pulse_preview": {
      "label": "Aperçu",
      "help": "Voici comment pulse un téléchargement en cours.",
      "off": "Effets réduits"
    },
    "versions": {
      "plugin": "Plugin PO-Token",
      "was": "auparavant {v}"
    },
    "update": {
      "label": "yt-dlp et plugin",
      "help": "YouTube change constamment. En cas d’erreur, mettez d’abord à jour (pip dans le venv).",
      "button": "Mettre à jour yt-dlp et le plugin",
      "running": "Mise à jour …",
      "last_check": "Dernière vérification",
      "restart": "<b>Redémarrage requis.</b> yt-dlp a été mis à jour. La recherche et les téléchargements sont bloqués jusqu’au redémarrage de HCLoader ; la file est conservée.",
      "restart_title": "Redémarrage requis",
      "restart_text": "yt-dlp a été mis à jour. Fermez et redémarrez HCLoader – d’ici là, la recherche et les téléchargements sont bloqués, la file est conservée.",
      "out_live": "Sortie · en cours depuis {t}",
      "out_done": "Sortie · terminé après {t}",
      "out_failed": "Sortie · échec",
      "out_last": "Sortie",
      "waiting": "Démarrage de pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Rechercher des mises à jour au démarrage",
        "help": "yt-dlp et plugin PO-Token, au plus une fois par jour."
      },
      "check_app_updates_on_start": {
        "label": "Rechercher des mises à jour de HCLoader au démarrage",
        "help": "Interroge GitHub une fois par démarrage pour une nouvelle version. Rien n’est téléchargé tant que vous ne cliquez pas."
      },
      "apply_update_on_exit": {
        "label": "Installer la mise à jour à la fermeture",
        "help": "Une mise à jour téléchargée est installée à la fermeture de HCLoader (« Plus tard »). Désactivé : elle est proposée à nouveau au prochain démarrage."
      },
      "update_repo": {
        "label": "Source des mises à jour (GitHub)",
        "help": "Dépôt au format « propriétaire/dépôt ». À modifier uniquement pour des forks."
      }
    },
    "db": {
      "label": "Base de données",
      "help": "État de toutes les vidéos, sources et exécutions. Une sauvegarde copie le fichier dans le dossier « backups ».",
      "backup": "Créer une sauvegarde de la BD",
      "backing_up": "Sauvegarde …",
      "open": "Dossier des données",
      "open_logs": "Dossier des journaux",
      "open_title": "Ouvrir le dossier contenant la base de données, la configuration et les sauvegardes",
      "open_logs_title": "Ouvrir le dossier contenant les fichiers journaux",
      "info": {
        "one": "{n} entrée · {mb} Mo",
        "other": "{n} entrées · {mb} Mo"
      },
      "last": "Dernière sauvegarde",
      "never": "aucune pour l’instant",
      "keep": "Les 10 sauvegardes les plus récentes sont conservées, les plus anciennes sont supprimées à la sauvegarde suivante.",
      "backups": "Sauvegardes",
      "backups_more": "+ {n} plus anciennes dans le dossier « backups »",
      "fresh": "nouvelle"
    },
    "reset_all": {
      "label": "Tous les paramètres",
      "help": "Remet tous les onglets à leurs valeurs par défaut. La base de données et les fichiers musicaux ne sont pas touchés.",
      "button": "Tout réinitialiser"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Recherches par heure",
        "help": "« Chercher les sets manquants » répartit ses recherches régulièrement (10 = une toutes les 6 min). La limite globale de recherches par heure s’applique aussi."
      },
      "collector_results_per_search": {
        "label": "Résultats par recherche",
        "help": "Combien de résultats une recherche d’un set manquant examine (une requête par recherche)."
      },
      "collector_auto_confirm": {
        "label": "Confirmer automatiquement à partir de",
        "help": "À partir de cette confiance, un résultat compte sans votre confirmation – uniquement avec le DJ, le festival et l’année dans le titre. Tout ce qui est en dessous attend un clic."
      },
      "detect": {
        "label": "Détecter automatiquement",
        "help": "Attribue festival ou série, année, scène et type de set aux nouveaux résultats et téléchargements. Les valeurs définies à la main ne sont jamais écrasées."
      },
      "min_confidence": {
        "label": "Seuil de détection",
        "help": "Certitude à partir de laquelle une correspondance est attribuée. En dessous, elle n’apparaît que comme suggestion à accepter."
      },
      "year_from_upload_date": {
        "label": "Année d’après la date de mise en ligne",
        "help": "Si le titre ne contient pas d’année, l’année de mise en ligne est utilisée (compte comme moins sûr)."
      },
      "match_description": {
        "label": "Chercher aussi dans la description",
        "help": "Cherche aussi les noms de festivals dans la description enregistrée."
      },
      "extra_stages": {
        "label": "Scènes supplémentaires",
        "help": "Noms de scène en plus de ceux intégrés (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ scène"
      }
    },
    "fest_types": {
      "label": "Termes personnels de type de set",
      "help": "Mots du titre qui indiquent un type de set. Ils sont vérifiés avant les termes intégrés.",
      "ph": "Terme dans le titre",
      "add": "Terme"
    },
    "fest_test": {
      "label": "Tester un titre",
      "help": "Montre ce que la détection trouve dans un titre. Rien n’est enregistré ; les paramètres enregistrés s’appliquent.",
      "ph": "p. ex. Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Rien détecté",
      "assigned": "serait attribué",
      "suggested": "suggestion seulement"
    },
    "fest_status": {
      "title": "{assigned} mixes attribués sur {total}",
      "last": "Dernier passage",
      "help": "S’exécute hors ligne sur la bibliothèque existante. Les valeurs manuelles restent ; les fichiers ne sont ni réétiquetés ni déplacés.",
      "button": "Attribuer les festivals maintenant",
      "running": "Attribution … {done} / {total}"
    },
    "series": {
      "hint": "Festivals, émissions de radio et podcasts connus. Les modifications de cette liste sont enregistrées immédiatement.",
      "add": "Série",
      "show_hidden": "Afficher les masquées",
      "reset_all": "Réinitialiser les séries intégrées",
      "builtin": "intégrée",
      "own": "perso",
      "modified": "modifiée",
      "hidden": "masquée",
      "no_aliases": "aucun alias",
      "enable": "Détecter cette série",
      "hide": "Masquer",
      "restore": "Restaurer",
      "new_title": "Nouvelle série",
      "edit_title": "Modifier la série",
      "name": "Nom",
      "kind": "Type",
      "default_genre": "Genre par défaut",
      "aliases": "Alias",
      "aliases_help": "Autres graphies. Une occurrence dans le titre suffit.",
      "weak_aliases": "Alias faibles",
      "weak_help": "Mots courants qui ne comptent qu’avec une année.",
      "variants": "Variantes",
      "variants_help": "Éditions à part, p. ex. Australia ou at Home.",
      "channels": "Chaînes de l’organisateur",
      "channels_help": "Nom, ID ou URL de la chaîne. Augmente seulement la certitude."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Entrées max. par source",
        "help": "« Tout lire (une fois) » dans la liste de suivi lit au plus ce nombre d’entrées d’une chaîne ou d’une playlist."
      },
      "backfill_requests_per_hour": {
        "label": "Requêtes par heure",
        "help": "Les requêtes de pages de « Tout lire » sont réparties régulièrement (120 = une toutes les 30 s) ; l’intervalle normal et le backoff s’appliquent aussi. Une exécution planifiée (Planificateur de tâches) continue pour au plus ce nombre de requêtes."
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
        "auto": "Automatique (langue du système)"
      }
    },
    "player": {
      "mode": {
        "internal": "Lecteur intégré (recommandé)",
        "external": "Lecteur par défaut de Windows"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Original (Opus/M4A, sans conversion)"
      },
      "mp3_quality": {
        "320": "320 kbit/s CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Non",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Bloquer la chaîne",
      "text": "Les vidéos de « {ch} » ne seront plus affichées. Annulable sous Paramètres › Filtres et mots-clés.",
      "ok": "Bloquer"
    },
    "ignore_all": {
      "title": "Ignorer les résultats",
      "text": {
        "one": "Marquer {n} résultat de la boîte de réception comme ignoré ? Il ne sera pas téléchargé et n’apparaîtra plus dans la boîte.",
        "other": "Marquer {n} résultats de la boîte de réception comme ignorés ? Ils ne seront pas téléchargés et n’apparaîtront plus dans la boîte."
      },
      "ok": "Ignorer"
    },
    "del_source": {
      "title": "Supprimer la source",
      "text": "Retirer « {name} » de la liste de suivi ? Les mixes déjà téléchargés sont conservés."
    },
    "del_mix": {
      "title": "Supprimer le mix",
      "text": "« {title} » est retiré de la bibliothèque et le fichier est supprimé du disque :",
      "ok": "Supprimer le fichier",
      "warn": "<b>Cette action est irréversible.</b> Le fichier audio et un éventuel fichier .cue associé sont supprimés. Le mix est marqué comme « ignoré » et <b>ne sera pas téléchargé à nouveau</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Retirer uniquement l’entrée",
      "text": "Le fichier de « {title} » se trouve en dehors du dossier cible actuel et ne sera donc pas supprimé :",
      "ok": "Retirer uniquement l’entrée",
      "warn": "Le fichier reste intact là où il est. L’entrée disparaît de la bibliothèque, le mix est marqué comme « ignoré » et <b>ne sera pas téléchargé à nouveau</b>."
    },
    "remove_mix": {
      "title": "Retirer l’entrée",
      "text": "Le fichier de « {title} » est introuvable à l’emplacement enregistré :",
      "ok": "Retirer l’entrée",
      "warn": "L’entrée disparaît de la bibliothèque. Le mix est marqué comme « ignoré » et <b>ne sera pas téléchargé à nouveau</b>. Si le fichier se trouve ailleurs, il reste intact."
    },
    "backoff": {
      "title": "Lever le blocage temporaire",
      "ok": "Lever quand même",
      "text": "La durée de blocage vous protège : {p} a signalé que trop de requêtes étaient arrivées.",
      "warn": "<b>Ne la levez que si vous êtes sûr que le blocage est terminé.</b> Si l’app y accède de nouveau trop tôt, {p} pourrait restreindre votre IP plus longtemps, voire définitivement."
    },
    "reset_all": {
      "title": "Tout réinitialiser",
      "text": "Tous les paramètres de tous les onglets sont immédiatement remis à leurs valeurs par défaut et enregistrés.",
      "ok": "Réinitialiser"
    },
    "series_delete": {
      "title": "Supprimer la série ?",
      "text": "« {name} » et ses éditions sont supprimées.",
      "warn": {
        "one": "{n} mix perd son attribution.",
        "other": "{n} mixes perdent leur attribution."
      }
    },
    "series_hide": {
      "title": "Masquer la série ?",
      "text": "« {name} » n’est plus détectée. Vous pouvez la récupérer avec « Afficher les masquées »."
    },
    "series_reset": {
      "title": "Réinitialiser les séries intégrées ?",
      "text": "Toutes les séries intégrées reviennent à leur état d’origine, les masquées réapparaissent. Vos propres séries restent.",
      "ok": "Réinitialiser"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mix ajouté à la file",
      "other": "{n} mixes ajoutés à la file"
    },
    "enqueued_none": "Rien ajouté – déjà en file ou téléchargé",
    "enqueued_skipped": "{n} ignorés",
    "queue_cancelled": "Annulé : {title}",
    "queue_removed": "Retiré : {title}",
    "queue_retry": "De nouveau en file : {title}",
    "queue_paused": "File en pause",
    "queue_resumed": "File reprise",
    "new_run": "Nouvelle exécution démarrée",
    "ignored": "Ignoré : {title}",
    "unignored": "De nouveau visible : {title}",
    "ignored_n": {
      "one": "{n} résultat ignoré",
      "other": "{n} résultats ignorés"
    },
    "opening": "Ouverture de {p} dans le navigateur …",
    "watch_added": "Ajouté à la liste de suivi : {ch}",
    "blocked": "Chaîne bloquée : {ch}",
    "genre_set": "Genre défini : {genre}",
    "done": "Téléchargé : {title}",
    "failed": "Échec : {title} – {error}",
    "wl_started": {
      "one": "Vérification de la liste de suivi ({n} source, avec limitation) …",
      "other": "Vérification de la liste de suivi ({n} sources, avec limitation) …"
    },
    "wl_started_one": "Vérification de « {name} » …",
    "wl_none": "Aucune source active – rien à vérifier",
    "wl_done": {
      "one": "Source vérifiée : rien de nouveau",
      "other": "Liste de suivi vérifiée : {n} sources, rien de nouveau"
    },
    "wl_done_found": {
      "one": "Liste de suivi vérifiée : {n} nouveau résultat",
      "other": "Liste de suivi vérifiée : {n} nouveaux résultats"
    },
    "wl_errors": {
      "one": "{n} source avec erreurs",
      "other": "{n} sources avec erreurs"
    },
    "source_added": "Source ajoutée : {name}",
    "source_saved": "Source enregistrée : {name}",
    "source_deleted": "Source supprimée : {name}",
    "retagged": "Réétiqueté : {title}",
    "retagged_moved": "Réétiqueté et déplacé : {title} → {path}",
    "deleted": "Supprimé : {title}",
    "removed": "Entrée retirée : {title}",
    "folder_opening": "Ouverture du dossier …",
    "copied": {
      "one": "{n} ligne copiée",
      "other": "{n} lignes copiées"
    },
    "copy_failed": "Copie impossible",
    "copy_none": "Aucune ligne visible",
    "settings_saved": "Paramètres enregistrés",
    "settings_errors": {
      "one": "{n} saisie non valide",
      "other": "{n} saisies non valides"
    },
    "backoff_cleared": "Blocage temporaire ({p}) levé manuellement",
    "genre_moved": "Genre : {genre} – déplacé vers {path}",
    "genre_retagged": "Genre : {genre} – étiquettes mises à jour",
    "genre_entry_only": "Genre : {genre} – seule l’entrée a été modifiée, le fichier est inaccessible",
    "genre_failed": "Le genre n’a pas pu être défini : {error}",
    "task_created": "Tâche créée dans le Planificateur de tâches Windows",
    "task_removed": "Tâche supprimée",
    "updated": "Mis à jour vers yt-dlp {v}",
    "up_to_date": "Déjà à jour (yt-dlp {v})",
    "update_failed": "Échec de la mise à jour",
    "restart_required": "Mis à jour – redémarrez HCLoader pour que la recherche et les téléchargements refonctionnent",
    "backup_done": "Sauvegarde créée : {path}",
    "reset_all": "Tous les paramètres réinitialisés",
    "festival_entry_only": "« {name} » enregistré dans l’entrée seulement – le fichier est inaccessible",
    "series_saved": "Série « {name} » enregistrée",
    "series_deleted": "Série « {name} » supprimée",
    "series_hidden": "Série « {name} » masquée",
    "series_reset": "Séries intégrées restaurées",
    "assign_done": "Festivals attribués : {assigned} nouveaux, {suggested} suggestions",
    "assign_cancelled": "Attribution annulée : {assigned} nouveaux, {suggested} suggestions"
  },
  "upd": {
    "available": "Version {v} disponible",
    "available_sub": "Installée : {cur}",
    "download": "Télécharger",
    "notes": "Nouveautés",
    "later": "Plus tard",
    "close": "Fermer",
    "cancel": "Annuler",
    "retry": "Réessayer",
    "downloading": "Téléchargement de la mise à jour {v}",
    "phase_download": "Téléchargement",
    "phase_verify": "Vérification",
    "phase_prepare": "Préparation",
    "ready": "Mise à jour {v} prête",
    "ready_sub": "Pour l’installer, HCLoader est brièvement fermé puis redémarré.",
    "restart_now": "Redémarrer maintenant",
    "on_exit": "À la fermeture",
    "applying": "Installation de la mise à jour …",
    "applying_sub": "HCLoader se ferme et redémarre dans un instant.",
    "error": "Échec de la mise à jour de l’app",
    "blocked": "Mise à jour automatique impossible",
    "notes_title": "Nouveautés de la version {v}",
    "notes_empty": "Aucune note de version disponible.",
    "notes_link": "Version sur GitHub",
    "notes_all": "Afficher tous les changements",
    "notes_less": "Afficher seulement l’essentiel",
    "confirm_title": "Redémarrer maintenant ?",
    "confirm_ok": "Redémarrer",
    "confirm_text": "HCLoader est fermé, la mise à jour installée et l’app redémarrée. Un téléchargement en cours est annulé et reste dans la file. La musique, les paramètres et la base de données restent inchangés.",
    "on_exit_toast": "La mise à jour sera installée à la fermeture de HCLoader.",
    "later_toast": "La mise à jour reste prête et sera proposée à nouveau au prochain démarrage.",
    "section_label": "Version de HCLoader",
    "section_help": "Les nouvelles versions viennent de GitHub. Les données, paramètres et la musique ne sont pas touchés par les mises à jour ; une sauvegarde est créée automatiquement avant une migration de la base de données.",
    "current": "Installée",
    "latest": "Dernière",
    "checked": "Dernière vérification",
    "check_now": "Vérifier maintenant",
    "checking": "Vérification …",
    "st_idle": "À jour",
    "st_available": "Nouvelle version disponible",
    "st_checking": "Vérification …",
    "st_downloading": "Téléchargement …",
    "st_ready": "Prête à installer",
    "st_applying": "Installation …",
    "st_error": "Erreur",
    "st_unknown": "Pas encore vérifié",
    "up_to_date": "HCLoader est à jour (v{v})",
    "portable": "Version portable",
    "installed": "Installée (setup)",
    "git": "Dépôt Git",
    "from_repo": "depuis {repo} (pas la source officielle)",
    "unverified": "sans somme de contrôle (seule l’intégrité du ZIP est vérifiée)",
    "rn_label": "Notes de version",
    "rn_help": "Ce qui a changé dans chaque version, d’après les notes fournies avec cette copie (fonctionne hors ligne).",
    "rn_older": "Plus ancienne",
    "rn_newer": "Plus récente",
    "rn_pos": "{i} sur {n}",
    "rn_installed": "installée",
    "rn_empty": "Aucune note de version trouvée.",
    "rn_version": "Version"
  },
  "err": {
    "generic": "Erreur inconnue",
    "bridge": "Erreur dans « {name} » : {msg}",
    "boot": "Échec du démarrage : {msg}",
    "no_backend": "Pas de connexion au backend"
  },
  "fatal": {
    "title": "Échec de la connexion au backend",
    "text": "L’interface n’a reçu aucune réponse de la partie Python de HCLoader. Rien d’irréel n’est affiché ni enregistré.",
    "waiting": "Toujours en attente du backend …",
    "reload": "Recharger"
  },
  "fest": {
    "all": "Toutes les séries",
    "other": "Autres / non attribués",
    "other_hint": "Aucun festival",
    "sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "editions": {
      "one": "{n} édition",
      "other": "{n} éditions"
    },
    "suggestions": {
      "one": "{n} suggestion",
      "other": "{n} suggestions"
    },
    "all_years": "Toutes",
    "no_stage": "Sans scène",
    "kind": {
      "festival": "Festival",
      "radio": "Émission de radio",
      "podcast": "Podcast"
    },
    "set_type": {
      "live_set": "Live set",
      "closing_ceremony": "Cérémonie de clôture",
      "opening": "Ouverture",
      "endshow": "Endshow",
      "full_show": "Show complet",
      "warm_up": "Warm-up",
      "anthem": "Hymne",
      "episode": "Épisode"
    },
    "change": "modifier le festival",
    "change_manual": "défini à la main, cliquer pour modifier",
    "add": "Définir un festival ou une série",
    "suggested": "Suggestion incertaine : {name}",
    "accept": "Accepter la suggestion",
    "p_title": "Festival / série",
    "p_search": "Chercher une série …",
    "p_none": "Aucun festival",
    "p_no_match": "Aucune série trouvée",
    "p_year": "Année",
    "p_variant": "Variante",
    "p_stage": "Scène",
    "p_type": "Type de set",
    "p_apply": "Appliquer",
    "p_auto": "Revenir à l’automatique"
  },
  "backfill": {
    "action": "Tout lire (une fois)",
    "action_title": "Lire une fois toute la liste de cette source, page par page – les nouveaux résultats vont dans la boîte de réception",
    "again_title": "Tout relire – seules les entrées encore inconnues sont ajoutées",
    "search_title": "Pas pour les recherches enregistrées – une recherche renvoie au plus 100 résultats",
    "why_open": "La lecture a déjà commencé – mettez-la en pause ou annulez-la sous le nom",
    "st_pending": "En attente",
    "st_running": "Lecture …",
    "st_paused": "En pause",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / max. {cap}",
    "added": "+{n} dans la boîte",
    "done_short": "Tout lu le {date}",
    "done_title": "Lu entièrement : {date} · {n} entrées",
    "note_title": "Dernière interruption",
    "pause": "Pause",
    "resume": "Reprendre",
    "cancel": "Annuler",
    "keep": "Continuer la lecture",
    "dlg_title": "Tout lire de « {name} » ?",
    "dlg_text": "Lit une fois toute la liste de cette source, page par page – requêtes plates et légères, via la limitation ; rien n’est téléchargé. Les résultats qui passent vos filtres vont dans la <b>boîte de réception</b>, même pour les sources en téléchargement automatique. Les vidéos déjà connues ne sont jamais ajoutées deux fois.",
    "dlg_requests": "requêtes",
    "dlg_time": "durée",
    "dlg_entries": "entrées",
    "dlg_known": "Connu depuis la dernière vérification : <b>{n}</b> entrées.",
    "dlg_unknown": "Taille inconnue – estimation prudente pour le maximum de {cap} entrées.",
    "dlg_capped": "Seules les {cap} premières entrées sont lues (Paramètres › Planification).",
    "dlg_resume": "Reprend après {n} entrées déjà lues ; leurs pages sont d’abord redemandées.",
    "dlg_headless": "Trop volumineux pour une exécution planifiée ({n} requêtes par heure) : si l’app est fermée avant la fin, la lecture ne reprend que dans l’app.",
    "dlg_pace": "Au plus {n} requêtes par heure, réparties régulièrement. Un backoff (HTTP 429 / contrôle anti-bot), la fermeture de l’app ou une erreur ne font qu’interrompre – la lecture reprend automatiquement plus tard. Vous pouvez la mettre en pause ou l’annuler à tout moment.",
    "dlg_ok": "Lancer la lecture",
    "dlg_ok_resume": "Continuer la lecture",
    "dlg_cancel_title": "Annuler la lecture ?",
    "dlg_cancel_text": "La lecture de « {name} » s’arrête et sa progression est perdue. Les résultats déjà dans la boîte restent.",
    "toast_started": "Lecture complète de « {name} » – en arrière-plan",
    "toast_done": "« {name} » lu entièrement – +{n} dans la boîte",
    "toast_paused": "« {name} » en pause – reprenez avec « Reprendre »",
    "toast_cancelled": "Lecture de « {name} » annulée"
  },
  "collector": {
    "nav": "Collecteur",
    "open_title": "Collecteur de festivals : rassembler tous les sets d’une édition avec une liste de contrôle",
    "title": "Collecteur de festivals",
    "sub": "Tous les sets d’une édition de festival – d’après son horaire, avec une liste de contrôle",
    "back_library": "Retour à la bibliothèque",
    "back_list": "Toutes les listes",
    "collect": "Rassembler cette édition",
    "collect_title": "Liste de tous les sets de {name} : trouver les sets manquants et les télécharger",
    "open_checklist": "Liste {n} / {total}",
    "sets": "Sets",
    "lists": "Listes de contrôle",
    "card_empty": "Pas encore de sets",
    "new_title": "Nouvelle liste de contrôle",
    "new_text": "Choisissez un festival et une année. Les sets viennent de la playlist de l’organisateur, d’un horaire collé ou d’un fichier fourni.",
    "new_ok": "Ouvrir la liste",
    "f_series": "Festival / série",
    "f_series_ph": "Choisir …",
    "f_series_other": "Émissions de radio et podcasts",
    "err_series": "Choisissez un festival ou une série.",
    "err_year": "Indiquez l’année de l’édition.",
    "empty_title": "Pas encore de liste",
    "empty_text": "Une liste de contrôle énumère chaque set d’une édition de festival et montre ce que vous avez déjà.",
    "step1": "Choisissez le festival et l’année ci-dessus.",
    "step2": "Importez la playlist de l’organisateur ou collez l’horaire.",
    "step3": "Décochez ce que vous ne voulez pas, cherchez les sets manquants et téléchargez.",
    "delete": "Supprimer la liste",
    "dlg_delete_title": "Supprimer la liste ?",
    "dlg_delete_text": "La liste de « {name} » est supprimée avec toutes ses lignes. Une recherche en cours s’arrête.",
    "dlg_delete_keep": "Les fichiers téléchargés, les entrées de la bibliothèque et les résultats enregistrés sont conservés.",
    "toast_deleted": "Liste « {name} » supprimée",
    "in_library": "{n} dans la bibliothèque",
    "show_library": "Afficher dans la bibliothèque ({n})",
    "more": "Plus",
    "st": {
      "found": "Trouvé",
      "queued": "En file",
      "downloaded": "Téléchargé",
      "missing": "Manquant",
      "ignored": "Ignoré"
    },
    "filter_status": "Afficher seulement : {name}",
    "sources": "Sources",
    "src_playlist": "Importer la playlist de l’organisateur",
    "src_paste": "Coller l’horaire",
    "files": "Horaires fournis",
    "src_add": "Ajouter une ligne",
    "all_stages": "Toutes les scènes",
    "all_days": "Tous les jours",
    "no_day": "Sans jour",
    "search": "Filtrer par DJ …",
    "col_dj": "DJ / set",
    "col_when": "Jour / heure",
    "col_status": "État",
    "col_match": "Vidéo trouvée",
    "source": {
      "playlist": "Playlist",
      "timetable": "Horaire",
      "file": "Fichier d’horaire",
      "manual": "Ajouté à la main"
    },
    "edited": "Modifié à la main – ces valeurs l’emportent sur les imports ultérieurs",
    "check_title": "Rassembler ce set",
    "all_title": "Tout / rien sélectionner (lignes affichées)",
    "m_none": "Pas encore recherché",
    "m_searched": "Rien trouvé ({date})",
    "confirm": "Confirmer",
    "confirm_title": "Résultat incertain – confirmez que c’est le bon set",
    "reject_title": "Pas cette vidéo – ne plus la proposer pour cette ligne",
    "reject": "Écarter le résultat",
    "candidates": "Autres résultats : {n}",
    "candidates_head": "Utiliser un autre résultat",
    "ignore": "Ignorer ce set",
    "unignore": "Ne plus ignorer",
    "delete_row": "Supprimer la ligne",
    "f_artist": "DJ / artiste",
    "f_day": "Jour",
    "f_start": "Début",
    "f_end": "Fin",
    "add_ok": "Ajouter",
    "err_artist": "Le DJ / l’artiste est obligatoire.",
    "none_title": "Aucune ligne",
    "none_text": "Aucune ligne ne correspond aux filtres actuels.",
    "rows_empty_title": "Cette liste est vide",
    "rows_empty_text": "Commencez par la playlist officielle de l’organisateur – une seule requête à plat couvre en général la plupart des sets. Ou collez l’horaire sous forme de texte.",
    "checked_of": "sur {total} cochés",
    "select_all": "Tout sélectionner",
    "select_none": "Aucun",
    "shown": "{n} lignes affichées sur {total}",
    "to_confirm": "À confirmer : {n}",
    "to_confirm_title": "Les résultats incertains attendent votre confirmation – cliquez pour n’afficher qu’eux",
    "find": "Chercher les sets manquants ({n})",
    "find_again": "Chercher à nouveau ({n})",
    "find_title": "Cherche les sets cochés sans résultat, un par un et à rythme limité – affiche d’abord une estimation",
    "find_again_title": "Tous les sets ont déjà été recherchés – chercher à nouveau ceux sans résultat",
    "find_none": "Rien à chercher – chaque set coché a un résultat",
    "find_running": "La recherche est en cours",
    "queue": "Télécharger les cochés ({n})",
    "queue_title": "Ajouter tous les sets cochés et confirmés à la file de téléchargement",
    "queue_none": "Rien à télécharger – aucun set coché avec un résultat confirmé pas encore téléchargé",
    "job_pending": "En attente",
    "job_running": "Recherche …",
    "job_paused": "En pause",
    "job_hits": "Trouvés : {n}",
    "job_cancel": "Arrêter",
    "job_resume": "Reprendre",
    "imp_running": "Lecture de la playlist …",
    "imp_entries": "Entrées : {n}",
    "imp_hint": "requête à plat, page par page",
    "imp_busy": "Une playlist est déjà en cours de lecture",
    "imp_added": "nouveaux : {n}",
    "imp_merged": "fusionnés : {n}",
    "imp_matched": "trouvés dans la bibliothèque : {n}",
    "imp_unchecked": "décochés (trop courts / aftermovie) : {n}",
    "imp_invalid": "invalides : {n}",
    "pl_title": "Importer la playlist de l’organisateur",
    "pl_text": "La playlist officielle des livesets de l’organisateur est la source la moins coûteuse : une requête à plat, rien n’est téléchargé. Chaque entrée devient une ligne confirmée ; le DJ, la scène et le type de set viennent du titre.",
    "pl_url": "Lien de la playlist",
    "pl_hint": "Playlist YouTube ou set SoundCloud. Les entrées trop courtes, les aftermovies et les bandes-annonces sont ajoutés décochés. Les lignes d’un horaire reçoivent la vidéo correspondante.",
    "pl_ok": "Importer",
    "pl_err_empty": "Collez le lien d’une playlist.",
    "toast_pl_started": "Lecture de la playlist – se poursuit en arrière-plan",
    "toast_pl_done": "Playlist lue –",
    "toast_pl_cancelled": "Import de la playlist arrêté –",
    "tt_title": "Coller l’horaire – {name}",
    "tt_text": "Collez l’horaire sous forme de texte ou de CSV. Les titres fixent le jour et la scène, chaque autre ligne est un set. Rien n’est enregistré avant l’import.",
    "tt_input": "Horaire",
    "tt_preview": "Aperçu",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Les sets reconnus apparaissent ici.",
    "tt_nothing": "Aucun set reconnu pour l’instant.",
    "tt_sum": "Sets : {n}",
    "tt_days": "Jours : {n}",
    "tt_stages": "Scènes : {n}",
    "tt_skipped": "Lignes non comprises : {n}",
    "tt_more": "… et {n} de plus",
    "tt_ok": "Importer ({n})",
    "tt_edit_hint": "Corrigez ou retirez des sets ici avant l’import. Modifier le texte à gauche le relit.",
    "toast_tt": "Horaire importé –",
    "files_text": "Horaires tenus à jour dans le dépôt HCLoader et livrés avec les mises à jour. En importer un crée la liste de son édition.",
    "files_empty_title": "Aucun horaire fourni pour l’instant",
    "files_empty": "Seuls des horaires vérifiés sont livrés – cette version n’en contient aucun. Collez plutôt l’horaire sous forme de texte.",
    "files_how_title": "Contribuer un horaire",
    "files_how": "Un fichier JSON par édition avec les sets (artiste, scène, jour, début, fin) et un lien vers l’horaire officiel comme source. Envoyez-le sous forme d’issue ou de pull request sur GitHub ; le README à côté des fichiers décrit le format.",
    "files_meta": "Sets : {n} · mis à jour le {date}",
    "files_source": "source officielle",
    "files_import": "Importer",
    "files_broken": "Fichier invalide : {error}",
    "files_unknown": "Série inconnue ou masquée ici",
    "est_title": "Chercher les sets manquants – {name}",
    "est_text": "Cherche chaque set coché sans résultat, un par un : <b>DJ + festival + année</b> en recherche à plat via le limiteur. Rien n’est téléchargé.",
    "est_requests": "recherches",
    "est_left": "libres cette heure",
    "est_again": "Tous les sets ont déjà été recherchés – ceux sans résultat sont recherchés à nouveau.",
    "est_offline": "Associés gratuitement à votre bibliothèque à l’instant : {n}.",
    "est_resume": "Reprend la recherche interrompue.",
    "est_wait": "La limite de recherches de cette heure est atteinte – la première recherche démarre {t}.",
    "est_backoff": "Backoff actif jusqu’à {t} – aucune recherche ne peut démarrer avant.",
    "est_pace": "Au plus {n} recherches par heure, réparties régulièrement (environ une toutes les {min} min). Les résultats incertains attendent votre confirmation. Un backoff, la fermeture de l’app ou une erreur ne font qu’interrompre la recherche – elle reprend automatiquement.",
    "est_ok": "Lancer la recherche",
    "est_ok_resume": "Poursuivre la recherche",
    "toast_find_started": "Recherche des sets manquants de « {name} » – se poursuit en arrière-plan",
    "toast_find_done": "Recherche terminée – {n} trouvés sur {total}",
    "toast_find_cancelled": "Recherche arrêtée – « Chercher les sets manquants » la reprend",
    "toast_offline": "Associés à votre bibliothèque : {n} – aucune recherche nécessaire",
    "toast_confirmed": "« {name} » confirmé",
    "toast_rejected": "Résultat de « {name} » écarté",
    "toast_ignored": "« {name} » ignoré",
    "toast_unignored": "« {name} » est de nouveau rassemblé",
    "toast_row_added": "« {name} » ajouté",
    "toast_row_added_hit": "« {name} » ajouté – trouvé dans la bibliothèque",
    "toast_row_saved": "« {name} » enregistré",
    "toast_row_retag": "« {name} » enregistré – le fichier est retagué",
    "toast_row_deleted": "Ligne « {name} » supprimée",
    "q_none": "Rien n’a été ajouté à la file",
    "q_unconfirmed": "non confirmés : {n}",
    "q_missing": "sans résultat : {n}",
    "q_other": "non téléchargeables : {n}",
    "q_retag": "retagués : {n}"
  }
});
