/* HCLoader UI texts – Español.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "es", "name": "Español", "dir": "ltr", "intl": "es"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "ARCHIVO DE MÚSICA DURA",
    "mock": "MODO SIMULADO"
  },
  "nav": {
    "discover": "Descubrir",
    "inbox": "Bandeja de entrada",
    "watchlist": "Lista de seguimiento",
    "downloads": "Descargas",
    "library": "Biblioteca",
    "log": "Registro",
    "settings": "Ajustes"
  },
  "navfoot": {
    "today": "HOY",
    "next": "PRÓX. REVISIÓN"
  },
  "common": {
    "ok": "OK",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "remove": "Quitar",
    "reset": "Restablecer",
    "on": "sí",
    "off": "no",
    "current": "actual",
    "loading": "cargando …",
    "add_chip": "+ añadir",
    "empty": "«vacío»",
    "empty_list": "«ninguno»"
  },
  "fmt": {
    "today": "hoy",
    "yesterday": "ayer",
    "never": "nunca",
    "no_date": "Fecha desconocida",
    "just_now": "ahora mismo",
    "today_at": "hoy a las {t}",
    "tomorrow_at": "mañana a las {t}",
    "yesterday_at": "ayer a las {t}",
    "views": {
      "one": "{v} visualización",
      "other": "{v} visualizaciones"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "minutos",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "caracteres",
    "results": "resultados",
    "entries": "entradas",
    "clock": "h"
  },
  "range": {
    "ge_sleep": "≥ mínimo",
    "ge_initial": "≥ valor inicial"
  },
  "status": {
    "new": "Nuevo",
    "inbox": "En la bandeja",
    "queued": "En cola",
    "downloading": "Descargando",
    "done": "Descargado",
    "ignored": "Ignorado",
    "failed": "Error"
  },
  "period": {
    "all": "Todo",
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    "1y": "Últimos 12 meses",
    "year": "Año concreto",
    "custom": "Personalizado"
  },
  "source_type": {
    "channel": "Canal",
    "playlist": "Lista de reproducción",
    "search": "Búsqueda"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Plataforma",
    "sc_off": "SoundCloud está desactivado: actívalo en Ajustes › SoundCloud."
  },
  "genre": {
    "change": "Cambiar género",
    "manual": "Género definido manualmente",
    "change_manual": "Cambiar género (definido manualmente)"
  },
  "run_kind": {
    "watchlist": "Lista de seguimiento",
    "headless": "Programador de tareas",
    "manual": "Manual"
  },
  "phase": {
    "waiting": "En espera",
    "sleep": "Pausa hasta la siguiente descarga",
    "download": "Descargando",
    "convert": "Convirtiendo",
    "tag": "Etiquetando",
    "failed": "Fallido"
  },
  "po_mode": {
    "off": "No",
    "script": "Script",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "No",
    "script": "Script (Deno)",
    "http": "Servidor HTTP (local)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "falta",
    "po": "PO token",
    "po_active": "activo ({mode})",
    "po_inactive": "inactivo",
    "po_error": "Error",
    "backoff": "Bloqueo temporal",
    "backoff_none": "ninguno",
    "backoff_until": "hasta las {t} · quedan {rest}",
    "queue": "Cola",
    "queue_empty": "vacía",
    "queue_active": "activa",
    "queue_paused": "en pausa",
    "today": "Hoy",
    "next": "Próx. revisión",
    "next_off": "no",
    "backoff_until_short": "hasta las {t}",
    "sc_backoff": "Bloqueo hasta las {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · descargado hoy {day}/{day_max} · {s}/{s_max} búsquedas esta hora",
    "sc_tip": "SoundCloud · descargado hoy {day}/{day_max} · {s}/{s_max} búsquedas esta hora",
    "backoff_tip": "{p}: bloqueo temporal hasta las {t} (quedan {rest})"
  },
  "schedule": {
    "due": "pendiente",
    "kind_app": "App",
    "kind_task": "Tarea",
    "tip_app": "Próxima revisión de la lista de seguimiento en la app: {t} (mientras HCLoader esté abierto).",
    "tip_task": "Próxima revisión de la lista de seguimiento con el Programador de tareas de Windows: {t}.",
    "tip_any": "Próxima revisión de la lista de seguimiento: {t}.",
    "tip_off": "Sin revisión automática: ni en la app ni con el Programador de tareas de Windows.",
    "tip_backoff": "No hay revisiones mientras el bloqueo temporal esté activo."
  },
  "card": {
    "source": "Encontrado en la fuente de seguimiento «{name}»",
    "select": "Seleccionar",
    "open": "Abrir en {p}",
    "ignore": "Ignorar",
    "unignore": "Dejar de ignorar",
    "more": "Más acciones",
    "download": "Descargar",
    "watch": "Añadir canal a la lista de seguimiento",
    "block": "Bloquear canal",
    "set_genre": "Definir género",
    "date_approx": "Fecha aproximada: la búsqueda de YouTube solo indica «hace X años»",
    "date_unknown": "Sin fecha de subida",
    "duplicate": "Probablemente ya descargado ({p})",
    "duplicate_title": "Título muy parecido y misma duración que «{title}» de {p}: ya descargado o en cola allí. Aun así puedes descargarlo.",
    "preview": "Solo vista previa (Go+): no se puede descargar",
    "preview_title": "SoundCloud solo ofrece una vista previa de 30 segundos (Go+) de esta pista. No se puede descargar."
  },
  "discover": {
    "placeholder": "Buscar mix, live set, DJ, evento …",
    "search": "Buscar",
    "searching_btn": "Buscando …",
    "searching": "Buscando: consulta ligera, sin cargar YouTube …",
    "sort": "Orden",
    "sort_rel": "Relevancia",
    "sort_date": "Más recientes primero",
    "sort_dur": "Más largos primero",
    "sort_views": "Más vistos",
    "quota": "Búsquedas esta hora: {n} / {max}",
    "quota_sc": "Búsquedas en SoundCloud esta hora: {n} / {max}",
    "placeholder_sc": "Buscar en SoundCloud: mix, set, DJ, podcast …",
    "platform_title": "Dónde buscar",
    "searching_sc": "Buscando: consulta ligera, sin cargar SoundCloud …",
    "ready_text_sc": "Escribe un término y pulsa Intro para buscar en SoundCloud.",
    "previews": "{n} solo vista previa (Go+)",
    "previews_title": "Las vistas previas de Go+ nunca se pueden descargar. Visibles si «Ocultar descargados e ignorados» está desactivado.",
    "filters": "Filtros",
    "toggle_filters": "Mostrar/ocultar panel de filtros",
    "f_duration": "Duración (minutos)",
    "f_min": "Mínimo",
    "f_max": "Máximo (vacío = sin límite)",
    "f_max_ph": "máx.",
    "f_period": "Periodo de subida",
    "f_year": "Año",
    "f_year_prev": "Un año atrás",
    "f_year_next": "Un año adelante",
    "f_from": "Desde",
    "f_to": "Hasta",
    "f_hint_year": "La búsqueda de YouTube solo indica una fecha aproximada («hace 13 años»). Por eso cuenta ±1 año, y también cada mix con «{year}» en el título.",
    "f_hint_custom": "La búsqueda de YouTube solo indica una fecha aproximada. Con fechas aproximadas se aplica una tolerancia de ±1 año en ambos extremos.",
    "chip_title": "Clic: mostrar/ocultar género · Doble clic: solo este género (sus términos se añaden a la búsqueda)",
    "scope": "Búsqueda ampliada con",
    "scope_title": "La próxima búsqueda añade estos términos a tu texto.",
    "searched": "Buscado con",
    "stale": "Filtros cambiados desde",
    "re_search": "Buscar de nuevo",
    "re_search_title": "Los resultados son de la última búsqueda. Busca de nuevo para incluir género y año en el término (cuenta como una búsqueda).",
    "need_query": "Escribe primero un término de búsqueda.",
    "f_inc": "Palabras clave a incluir",
    "f_exc": "Palabras clave a excluir",
    "f_show": "Mostrar",
    "f_hide": "Ocultar descargados e ignorados",
    "f_blacklist": "Aplicar lista negra de canales",
    "count": {
      "one": "{n} resultado · {hidden} filtrados",
      "other": "{n} resultados · {hidden} filtrados"
    },
    "selected": "{n} seleccionados",
    "select_all": "Seleccionar todo",
    "download_sel": "Descargar selección",
    "ready_title": "Listo",
    "ready_text": "Escribe un término de búsqueda y pulsa Intro.",
    "none_title": "No se encontró nada",
    "none_text": "Afloja los filtros o prueba otros términos.",
    "none_year": "Ningún resultado de {year}. Busca de nuevo para incluir el año en el término, o cambia el año."
  },
  "inbox": {
    "title": "Bandeja de entrada",
    "sub": "Nuevos resultados de la lista de seguimiento que pasan todos los filtros",
    "sub_n": {
      "one": "{n} nuevo resultado de la lista de seguimiento que pasa todos los filtros",
      "other": "{n} nuevos resultados de la lista de seguimiento que pasan todos los filtros"
    },
    "ignore_all": "Ignorar todo",
    "download_all": "Descargar todo",
    "ignore_sel": "Ignorar selección",
    "download_sel": "Descargar selección",
    "select_all": "Seleccionar todo",
    "select_none": "Quitar selección",
    "src_all": "Todas las fuentes",
    "src_none": "Sin fuente",
    "src_title": "Mostrar solo resultados de esta fuente",
    "count": {
      "one": "{n} resultado",
      "other": "{n} resultados"
    },
    "count_of": "{n} de {total} resultados",
    "selected": "{n} seleccionados",
    "empty_title": "Bandeja vacía",
    "empty_text": "La lista de seguimiento no ha encontrado mixes nuevos.",
    "empty_nosrc": "Aún no hay fuentes en la lista de seguimiento: añade un canal, una lista o una búsqueda y los mixes nuevos aparecerán aquí.",
    "empty_next": "Próxima revisión: {t}.",
    "to_watchlist": "Ir a la lista de seguimiento"
  },
  "watchlist": {
    "title": "Lista de seguimiento",
    "sub_n": {
      "one": "{n} fuente · {active} activa",
      "other": "{n} fuentes · {active} activas"
    },
    "sub_next": "próxima revisión {t}",
    "add": "Fuente",
    "check_all": "Revisar todo ahora",
    "check": "Revisar",
    "checking": "revisando …",
    "queued": "en espera …",
    "running": "Revisando …",
    "running_n": "Revisando {i} / {n} …",
    "col_active": "Activa",
    "col_name": "Nombre",
    "col_type": "Tipo",
    "col_genre": "Género",
    "col_auto": "Nuevos resultados",
    "col_max": "Máx.",
    "col_last": "Última revisión",
    "col_new": "Nuevos",
    "genre_auto": "automático",
    "genre_auto_long": "Automático (según palabras clave)",
    "auto_on": "descargar",
    "auto_off": "bandeja",
    "auto_title_on": "Los resultados nuevos se descargan automáticamente",
    "auto_title_off": "Los resultados nuevos solo van a la bandeja de entrada",
    "new_title": "Mostrar en la bandeja de entrada",
    "check_title": "Revisar esta fuente ahora",
    "why_off": "La fuente no está activa",
    "why_running": "Ya hay una revisión en curso",
    "why_backoff": "Bloqueo temporal activo: la revisión está bloqueada",
    "why_backoff_p": "Bloqueo temporal ({p}) activo: la revisión está bloqueada",
    "why_sc_off": "SoundCloud está desactivado",
    "error_title": "Falló la última revisión",
    "backoff": "<b>Bloqueo temporal activo hasta las {t}</b> (quedan {rest}). No se puede revisar la lista de seguimiento; las revisiones programadas también se pausan.",
    "backoff_p": "<b>Bloqueo temporal ({p}) activo hasta las {t}</b> (quedan {rest}). Hasta entonces se omiten las fuentes de {p}; {other} sigue funcionando.",
    "backoff_link_sc": "Abrir SoundCloud",
    "backoff_link": "Abrir Limitación",
    "none_active": "No hay ninguna fuente activa que revisar",
    "empty_title": "Sin fuentes",
    "empty_text": "Añade un canal, una lista de reproducción o una búsqueda guardada.",
    "add_title": "Añadir fuente",
    "edit_title": "Editar fuente",
    "f_type": "Tipo",
    "f_name": "Nombre",
    "f_url": "URL",
    "f_query": "Término de búsqueda",
    "f_genre": "Género predeterminado",
    "f_max": "Máx. entradas",
    "f_newest_last": "Lo más reciente está al final (leer la lista al revés)",
    "hint_newest_last": "En muchas listas YouTube añade los vídeos nuevos al final. Lee la lista completa (unas 1 petición por cada 100 vídeos, máx. 2000 entradas).",
    "rev_title": "Lo más reciente está al final: la lista se lee desde el final",
    "rev_short": "al revés",
    "f_enabled": "Activa: incluir en «Revisar todo» y en la programación",
    "f_hits": "Nuevos resultados",
    "hits_inbox": "A la bandeja de entrada",
    "hits_auto": "Descargar automáticamente",
    "hint_inbox": "Los resultados esperan en la bandeja hasta que los descargues o ignores.",
    "hint_auto": "Los resultados que pasan todos los filtros van directamente a la cola.",
    "hint_channel": "Canal de YouTube (…/@nombre o …/channel/UC…, opcionalmente /videos o /streams) o perfil de SoundCloud (soundcloud.com/nombre).",
    "hint_playlist": "Lista de YouTube con «list=…» o set de SoundCloud (soundcloud.com/nombre/sets/set). Se revisan las entradas más recientes.",
    "f_platform": "Buscar en",
    "detected": "detectado: {p} · {type}",
    "not_detected": "URL no reconocida",
    "suggested": "Sugerencia",
    "suggested_title": "Sugerido a partir de la URL. Si no lo cambias, la primera revisión lo sustituye por el nombre real; o simplemente sobrescríbelo.",
    "hint_name_auto": "Sugerido a partir de la URL; puedes cambiarlo. Si no lo cambias, la primera revisión pone el nombre real.",
    "hint_name_later": "El nombre lo pone la primera revisión, o escríbelo tú aquí.",
    "name_auto_title": "Nombre provisional: la próxima revisión pone el real",
    "hint_search": "Búsqueda guardada, como en «Descubrir»; cuenta como una búsqueda por revisión.",
    "hint_max": "por revisión",
    "max_default": "(predeterminado)",
    "max_default_title": "Sin valor propio: se aplica «Entradas por fuente» de Ajustes › Programación",
    "max_title": "Vacío = valor predeterminado de Ajustes › Programación. Como máximo 200, 100 en fuentes de búsqueda.",
    "ph_name": "p. ej. Gabber Vault",
    "ph_name_later": "lo pone la primera revisión",
    "ph_channel": "https://www.youtube.com/@canal  o  https://soundcloud.com/nombre",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  o  https://soundcloud.com/nombre/sets/…",
    "ph_search": "p. ej. frenchcore liveset",
    "form_error": "No se pudo guardar la fuente."
  },
  "downloads": {
    "title": "Descargas",
    "sub": "Secuencial, una descarga a la vez",
    "pause": "Pausar",
    "resume": "Reanudar",
    "cancel": "Cancelar",
    "retry": "Reintentar",
    "remove": "Quitar",
    "up": "Subir",
    "down": "Bajar",
    "eta": "Tiempo restante",
    "position": "Posición {n}",
    "sleep_left": "continúa en",
    "sleep_why": "Limitación: pausa aleatoria de {min}–{max} s entre dos descargas",
    "next_up": "A continuación",
    "sleeping": "En pausa",
    "sleep_range": "de {min}–{max} s",
    "blocked_wait": "En espera: {why}",
    "why_backoff": "Bloqueo temporal",
    "why_day": "Límite diario",
    "why_run": "Límite por ejecución",
    "why_paused": "en pausa",
    "why_restart": "Reinicio necesario",
    "why_busy": "otra ejecución activa",
    "why_pot": "Servidor PO-Token no listo",
    "why_target": "Carpeta de destino inaccesible",
    "why_error": "Falta el módulo de descarga",
    "summary": "Hoy {day}/{day_max} · Ejecución {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} sigue descargando.",
    "steps": "Descargar · Convertir · Etiquetar",
    "unlimited": "sin límite",
    "l_run": "Esta ejecución",
    "l_day": "Hoy",
    "l_rate": "Límite de velocidad",
    "l_sleep": "Pausa entre descargas",
    "sec_queue": "Cola",
    "sec_failed": "Fallidos",
    "empty_title": "Cola vacía",
    "empty_text": "Selecciona mixes en «Descubrir» o en la «Bandeja de entrada».",
    "paused": "<b>Cola en pausa.</b> La descarga actual se detiene hasta que reanudes.",
    "backoff": "<b>Bloqueo temporal activo hasta las {t}</b> (quedan {rest}). Descargas, búsqueda y lista de seguimiento bloqueadas.",
    "backoff_rest": {
      "one": "<b>Bloqueo temporal activo hasta las {t}</b> (quedan {rest}). Descargas, búsqueda y lista de seguimiento bloqueadas; {n} sigue en la cola.",
      "other": "<b>Bloqueo temporal activo hasta las {t}</b> (quedan {rest}). Descargas, búsqueda y lista de seguimiento bloqueadas; {n} siguen en la cola."
    },
    "limit_day": "<b>Límite diario alcanzado ({n}/{max}).</b> El resto sigue en la cola y continúa mañana.",
    "limit_day_rest": {
      "one": "<b>Límite diario alcanzado ({n}/{max}).</b> {rest} sigue en la cola y continúa mañana.",
      "other": "<b>Límite diario alcanzado ({n}/{max}).</b> {rest} siguen en la cola y continúan mañana."
    },
    "limit_run": "<b>Límite alcanzado: {max}/{max} en esta ejecución.</b> El resto sigue en la cola y continúa en la próxima ejecución.",
    "limit_run_rest": {
      "one": "<b>Límite alcanzado: {max}/{max} en esta ejecución.</b> {rest} sigue en la cola y continúa en la próxima ejecución.",
      "other": "<b>Límite alcanzado: {max}/{max} en esta ejecución.</b> {rest} siguen en la cola y continúan en la próxima ejecución."
    },
    "limits_link": "Cambiar límites",
    "new_run": "Iniciar nueva ejecución",
    "need_restart": "<b>Reinicio necesario.</b> yt-dlp se ha actualizado: reinicia HCLoader. La cola se conserva.",
    "busy": "Hay otra ejecución de descarga activa (p. ej. la revisión programada). La cola espera a que termine.",
    "local_pot": {
      "one": "<b>Servidor PO-Token no listo.</b> {rest} sigue en la cola y continúa en cuanto esté en marcha.",
      "other": "<b>Servidor PO-Token no listo.</b> {rest} siguen en la cola y continúan en cuanto esté en marcha."
    },
    "local_target": {
      "one": "<b>Carpeta de destino inaccesible o sin permiso de escritura.</b> {rest} sigue en la cola y continúa en cuanto vuelva a estar disponible.",
      "other": "<b>Carpeta de destino inaccesible o sin permiso de escritura.</b> {rest} siguen en la cola y continúan en cuanto vuelva a estar disponible."
    },
    "local_error": {
      "one": "<b>No se pudo cargar el módulo de descarga (yt-dlp).</b> {rest} sigue en la cola. Nuevo intento tras «Reanudar», nuevas entradas o al guardar los ajustes.",
      "other": "<b>No se pudo cargar el módulo de descarga (yt-dlp).</b> {rest} siguen en la cola. Nuevo intento tras «Reanudar», nuevas entradas o al guardar los ajustes."
    },
    "local_link_pot": "Ajustes de red",
    "local_link_target": "Cambiar ubicación de almacenamiento",
    "local_link_error": "Mantenimiento"
  },
  "library": {
    "title": "Biblioteca",
    "sub": {
      "one": "{n} mix",
      "other": "{n} mixes"
    },
    "sub_shown": "{n} de {total} mostrados",
    "search": "Título, canal o ruta …",
    "all_genres": "Todos los géneros",
    "all_channels": "Todos los canales",
    "all_years": "Todos los años",
    "f_genre": "Género",
    "f_channel": "Canal",
    "f_year": "Año",
    "f_sort": "Orden",
    "sort_newest": "Más recientes primero",
    "sort_title": "Título A–Z",
    "sort_channel": "Canal A–Z",
    "sort_duration": "Más largos primero",
    "group": "Por género",
    "group_title": "Agrupar entradas por género",
    "view_list": "Lista",
    "view_grid": "Mosaico",
    "clear": "Restablecer filtros",
    "col_title": "Título",
    "col_channel": "Canal",
    "col_genre": "Género",
    "col_year": "Año",
    "col_duration": "Duración",
    "col_size": "Tamaño",
    "col_loaded": "Descargado",
    "play": "Reproducir",
    "pause": "Pausar",
    "play_external": "Abrir en el reproductor predeterminado",
    "play_internal": "Reproducir en el reproductor de la app",
    "play_missing": "Falta el archivo: no se puede reproducir",
    "more": "Mostrar {n} más",
    "now_playing": "En reproducción",
    "retag_short": "Re-etiquetar",
    "genre_working": "Definiendo género …",
    "open_folder": "Abrir carpeta",
    "retag": "Re-etiquetar (etiquetas, carátula y ubicación según los ajustes actuales)",
    "delete": "Eliminar archivo",
    "remove": "Quitar entrada",
    "retagging": "Re-etiquetando …",
    "cue_title": "Lista de pistas como archivo .cue junto al MP3",
    "missing": "Falta el archivo",
    "missing_title": "No se encontró el archivo en la ubicación guardada (¿movido o eliminado?)",
    "missing_chip": {
      "one": "{n} falta",
      "other": "{n} faltan"
    },
    "missing_chip_title": "Mostrar solo entradas cuyo archivo falta",
    "stat_count": "Mixes",
    "stat_duration": "Duración total",
    "stat_size": "Tamaño",
    "stat_genres": "Por género",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} mix · {dur}",
      "other": "{n} mixes · {dur}"
    },
    "empty_title": "Aún no se ha descargado nada",
    "empty_text": "Cada mix aparece aquí en cuanto se descarga y etiqueta, con carátula, género y ubicación.",
    "empty_discover": "Descubrir mixes",
    "empty_watchlist": "Configurar lista de seguimiento",
    "target_down": "Carpeta de destino inaccesible: {path}",
    "target_down_hint": "Revisa la unidad o el recurso de red. Mientras falte, se desconoce el estado de los archivos: «Re-etiquetar» y «Quitar entrada» están desactivados.",
    "unknown_title": "Carpeta de destino inaccesible: estado del archivo desconocido",
    "none_title": "Sin resultados",
    "none_text": "Ninguna entrada coincide con la búsqueda y los filtros."
  },
  "player": {
    "label": "Minirreproductor",
    "play": "Reproducir (Espacio)",
    "pause": "Pausar (Espacio)",
    "back": "Retroceder 30 segundos",
    "fwd": "Avanzar 30 segundos",
    "prev": "Pista anterior",
    "next": "Pista siguiente",
    "seek": "Posición",
    "mute": "Silenciar",
    "unmute": "Activar sonido",
    "volume": "Volumen",
    "close": "Cerrar reproductor",
    "tracks": "Lista de pistas",
    "tracks_n": {
      "one": "{n} pista",
      "other": "{n} pistas"
    },
    "tracks_toggle": "Mostrar/ocultar lista de pistas",
    "no_tracks": "Este archivo no tiene capítulos",
    "total": "Duración total {t}",
    "keys": "Espacio: reproducir/pausar · ←/→: 10 s",
    "err_load": "No se puede reproducir",
    "err_src": "No se puede reproducir: dirección de archivo no válida",
    "err_play": "No se puede reproducir el archivo: {title}",
    "external": "Abriendo en el reproductor predeterminado …"
  },
  "log": {
    "title": "Registro",
    "sub": "Registro en vivo e historial de ejecuciones",
    "live": "Registro en vivo",
    "history": "Historial de ejecuciones",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Aviso",
    "lvl_error": "Error",
    "lvl_title": "Mostrar/ocultar nivel «{lvl}»",
    "search": "Buscar en el registro …",
    "following": "En vivo",
    "paused": "En pausa",
    "follow_title": "Desplazarse automáticamente a la línea más reciente (se pausa al subir)",
    "jump": "Ir al final",
    "jump_new": {
      "one": "{n} línea nueva",
      "other": "{n} líneas nuevas"
    },
    "copy": "Copiar",
    "copy_title": "Copiar las líneas visibles al portapapeles",
    "open_logs": "Carpeta de registros",
    "open_logs_title": "Abrir la carpeta con los archivos de registro completos",
    "lines": {
      "one": "{n} línea",
      "other": "{n} líneas"
    },
    "lines_of": "{n} de {total} líneas",
    "empty": "No hay líneas para estos niveles.",
    "empty_search": "Ninguna línea contiene «{q}».",
    "no_runs": "Aún no hay ejecuciones.",
    "no_runs_kind": "No hay ejecuciones de este tipo.",
    "found": "encontrados",
    "downloaded": "descargados",
    "errors": "errores",
    "running": "en curso …",
    "kind_all": "Todas",
    "timeline": "Cronología",
    "table": "Tabla",
    "view_title": "Vista del historial de ejecuciones",
    "col_kind": "Tipo",
    "col_start": "Inicio",
    "col_duration": "Duración",
    "col_found": "Encontrados",
    "col_downloaded": "Descargados",
    "col_errors": "Errores",
    "col_note": "Nota",
    "backoff": "Bloqueo temporal",
    "runs_sum": {
      "one": "{n} ejecución · {dl} descargados · {err} errores",
      "other": "{n} ejecuciones · {dl} descargados · {err} errores"
    },
    "today": "Hoy",
    "yesterday": "Ayer"
  },
  "settings": {
    "title": "Ajustes",
    "sub": "Todo lo que hace la app se puede configurar aquí"
  },
  "tabs": {
    "general": "General",
    "filters": "Filtros y palabras clave",
    "genres": "Géneros",
    "download": "Descarga y calidad",
    "storage": "Almacenamiento y etiquetas",
    "throttle": "Limitación",
    "soundcloud": "SoundCloud",
    "network": "Red y PO-Token",
    "schedule": "Programación",
    "appearance": "Apariencia",
    "maintenance": "Mantenimiento"
  },
  "tabs_hint": {
    "general": "Comportamiento básico de la app.",
    "filters": "Filtros predeterminados para la búsqueda y la lista de seguimiento. Se pueden cambiar temporalmente en el panel de filtros de «Descubrir».",
    "genres": "El orden es la prioridad. Gana el primer género cuya palabra clave aparece en el título. Los géneros definidos manualmente y el género predeterminado de una fuente tienen preferencia.",
    "download": "YouTube suele entregar Opus a unos 130–160 kbps. El MP3 es una conversión y no suena mejor que el original, pero se reproduce en todas partes.",
    "storage": "Dónde se guardan los archivos y cómo se nombran. La estructura está pensada para servidores multimedia como Plex o Jellyfin.",
    "throttle": "Limita la carga sobre YouTube. Estos valores se aplican en conjunto a la búsqueda, la lista de seguimiento y las descargas. SoundCloud tiene sus propios valores en la pestaña «SoundCloud».",
    "soundcloud": "SoundCloud como segunda fuente para búsqueda, lista de seguimiento y descargas, con límites, contadores y bloqueo temporal propios, independientes de YouTube.",
    "network": "El PO-Token identifica las peticiones como de un navegador real y reduce el riesgo de bloqueos por bots.",
    "schedule": "Cuándo se revisa la lista de seguimiento automáticamente: en la app y con el Programador de tareas de Windows.",
    "appearance": "Aspecto y comportamiento. Los cambios se ven al instante y solo son permanentes tras guardar.",
    "maintenance": "Versiones, actualizaciones, base de datos."
  },
  "set": {
    "default": "Predeterminado",
    "range": "Rango",
    "browse": "Examinar",
    "not_set": "sin definir",
    "saving": "Guardando …",
    "discard": "Descartar",
    "tab_reset": "Restablecer pestaña",
    "tab_reset_title": "Restablece todos los campos de esta pestaña a sus valores predeterminados (solo se aplica tras «Guardar»)",
    "state_clean": "Todo guardado",
    "state_dirty": {
      "one": "{n} cambio sin guardar",
      "other": "{n} cambios sin guardar"
    },
    "state_errors": {
      "one": "{n} error: corrígelo",
      "other": "{n} errores: corrígelos"
    },
    "h": {
      "search": "Búsqueda",
      "duration": "Duración y periodo",
      "keywords": "Palabras clave",
      "display": "Visualización",
      "cover": "Carátula",
      "chapters": "Capítulos y lista de pistas",
      "tags": "Etiquetas",
      "soundcloud": "SoundCloud",
      "playback": "Reproducción",
      "pauses": "Pausas y ancho de banda",
      "limits": "Límites",
      "backoff": "Bloqueo temporal al ser bloqueado",
      "po": "Proveedor de PO-Token",
      "fallback": "Soluciones alternativas",
      "in_app": "En la app",
      "task": "Programador de tareas de Windows",
      "updates": "Actualizaciones",
      "app_update": "Actualización de la app",
      "database": "Base de datos",
      "reset": "Restablecer"
    },
    "general": {
      "language": {
        "label": "Idioma",
        "help": "Idioma de la interfaz y de los mensajes. «Automático» sigue el idioma de Windows (si no, inglés). La vista se reconstruye justo después de guardar."
      },
      "start_view": {
        "label": "Vista inicial",
        "help": "Qué vista se abre al iniciar."
      },
      "log_level": {
        "label": "Nivel de registro",
        "help": "Nivel de detalle del archivo de registro y del registro en vivo. DEBUG solo para depurar."
      },
      "confirm_delete": {
        "label": "Confirmar eliminación",
        "help": "Preguntar antes de eliminar un mix de la biblioteca (entrada + archivo)."
      }
    },
    "player": {
      "mode": {
        "label": "Reproducir con",
        "help": "Lo que usa ▶ en la biblioteca. El reproductor integrado muestra los capítulos como marcas de salto y sigue sonando al cambiar de vista. La otra opción está disponible por entrada en el menú."
      }
    },
    "search": {
      "results_count": {
        "label": "Resultados por búsqueda",
        "help": "Número de resultados que obtiene una búsqueda (ligera). Más resultados = más carga sobre YouTube."
      },
      "append_year": {
        "label": "Añadir el año a la búsqueda",
        "help": "Con el periodo de subida «Año concreto», el año se añade al término de búsqueda (p. ej. «hardcore liveset 2013»). Así YouTube encuentra más mixes de ese año."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Duración mínima",
        "help": "Los vídeos más cortos nunca se consideran un mix."
      },
      "max_duration": {
        "label": "Duración máxima",
        "help": "0 = sin límite."
      },
      "upload_period": {
        "label": "Periodo de subida",
        "help": "Qué subidas se muestran por defecto. «Año concreto» solo muestra mixes de un año, «Personalizado» un intervalo desde/hasta."
      },
      "upload_year": {
        "label": "Año",
        "help": "Un mix cuenta si el año de subida coincide o el año aparece en el título. La búsqueda de YouTube solo indica una fecha aproximada: allí se aplica ±1 año."
      },
      "upload_from": {
        "label": "Desde",
        "help": "Fecha de subida más antigua. Vacío = sin límite."
      },
      "upload_to": {
        "label": "Hasta",
        "help": "Fecha de subida más reciente. Vacío = sin límite. Con fechas aproximadas se aplica una tolerancia de ±1 año en ambos extremos."
      },
      "include_keywords": {
        "label": "Palabras clave a incluir",
        "help": "Al menos una debe aparecer en el título. Vacío = permitir todo. Intro o coma la añade."
      },
      "exclude_keywords": {
        "label": "Palabras clave a excluir",
        "help": "Si alguna aparece en el título, el vídeo se descarta."
      },
      "match_description": {
        "label": "Buscar en la descripción",
        "help": "Comprobar también las palabras clave en la descripción del vídeo. Las consultas ligeras a menudo no la incluyen."
      },
      "hide_done_ignored": {
        "label": "Ocultar descargados e ignorados",
        "help": "Ocultar en los resultados los vídeos ya descargados e ignorados."
      },
      "apply_channel_blacklist": {
        "label": "Aplicar lista negra de canales",
        "help": "No mostrar nunca vídeos de canales bloqueados."
      },
      "hide_cross_platform_duplicates": {
        "label": "Ocultar duplicados entre plataformas",
        "help": "Oculta los resultados que probablemente ya se descargaron o están en cola desde la otra plataforma (YouTube o SoundCloud): misma duración (±5 s) y título muy parecido. Desactivado: aparecen con la nota «Probablemente ya descargado»."
      }
    },
    "blacklist": {
      "label": "Canales bloqueados",
      "help": "Los canales se bloquean desde el menú de una tarjeta. Aquí puedes desbloquearlos.",
      "none": "Ningún canal bloqueado",
      "unblock": "Desbloquear"
    },
    "genres": {
      "add": "Género",
      "up": "Mayor prioridad",
      "down": "Menor prioridad",
      "delete": "Eliminar género",
      "color": "Elegir color",
      "name_ph": "Nombre",
      "kw_ph": "+ palabra clave",
      "fallback": "Género de reserva: se aplica cuando ninguna palabra clave coincide. Siempre presente, siempre al final."
    },
    "download": {
      "audio_format": {
        "label": "Formato de salida",
        "help": "MP3, o conservar el original de YouTube sin conversión."
      },
      "mp3_quality": {
        "label": "Calidad MP3",
        "help": "320 kbps CBR es lo más compatible; V0 VBR ahorra un poco de espacio."
      },
      "embed_cover": {
        "label": "Incrustar carátula",
        "help": "Escribe la miniatura, recortada en cuadrado, en el archivo como carátula."
      },
      "write_cover_jpg": {
        "label": "Guardar también cover.jpg",
        "help": "Para servidores multimedia que leen la carátula de la carpeta."
      },
      "write_cue": {
        "label": "Escribir archivo .cue",
        "help": "Lista de pistas a partir de capítulos o marcas de tiempo de la descripción, junto al archivo de audio."
      },
      "write_id3_chapters": {
        "label": "Escribir capítulos ID3",
        "help": "Incrusta marcas de capítulo (CHAP/CTOC) directamente en el MP3."
      },
      "keep_original_soundcloud": {
        "label": "Conservar original de SoundCloud",
        "help": "Guarda el audio de SoundCloud sin cambios (AAC 160 kbps como .m4a, MP3 128 kbps como .mp3), sin una segunda conversión con pérdida. Desactivado: como «Formato de salida»."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Carpeta de destino",
        "help": "Raíz del almacén de música. Los archivos temporales se guardan en «.tmp» dentro de ella. En la versión portátil, una ruta relativa como «.\\Music» se resuelve respecto a la carpeta de la app (p. ej. en una memoria USB)."
      },
      "path_template": {
        "label": "Patrón de ruta",
        "help": "Relativo a la carpeta de destino, sin extensión de archivo. «/» separa carpetas. Debe incluir {id} (en SoundCloud «sc-<id>»). {platform} se convierte en «YouTube» o «SoundCloud», p. ej. como carpeta superior para separar las fuentes."
      },
      "max_title_length": {
        "label": "Longitud máx. del título",
        "help": "Los títulos más largos se acortan en el nombre de archivo."
      },
      "max_path_length": {
        "label": "Longitud máx. de la ruta",
        "help": "Ruta completa incluida la carpeta de destino. Sin configuración adicional, Windows permite 259 caracteres."
      },
      "artist_from_title": {
        "label": "Leer artista del título",
        "help": "Reconoce los patrones «ARTISTA @ EVENTO» y «ARTISTA - TÍTULO»; si no, usa el nombre del canal."
      },
      "title_cleanup_patterns": {
        "label": "Limpiar título",
        "help": "Expresiones regulares cuyas coincidencias se eliminan del título. Intro añade.",
        "ph": "+ regex"
      }
    },
    "path_preview": {
      "label": "Vista previa",
      "help": "Haz clic en los marcadores para insertarlos en el patrón de ruta."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pausa entre peticiones",
        "help": "Tiempo de espera entre consultas de metadatos (búsqueda, lista de seguimiento)."
      },
      "sleep_interval": {
        "label": "Pausa de descarga: mínimo",
        "help": "Tras cada descarga sigue una pausa aleatoria entre el mínimo y el máximo."
      },
      "max_sleep_interval": {
        "label": "Pausa de descarga: máximo",
        "help": "Límite superior de la pausa aleatoria."
      },
      "limit_rate_mb": {
        "label": "Velocidad de descarga",
        "help": "Ancho de banda máximo. 0 = sin límite (no recomendado)."
      },
      "max_downloads_per_run": {
        "label": "Máx. descargas por ejecución",
        "help": "El resto sigue en la cola."
      },
      "max_downloads_per_day": {
        "label": "Máx. descargas por día",
        "help": "El contador incluye las descargas manuales y automáticas."
      },
      "max_searches_per_hour": {
        "label": "Máx. búsquedas por hora",
        "help": "Protege contra búsquedas continuas accidentales."
      },
      "backoff_initial_hours": {
        "label": "Bloqueo temporal: valor inicial",
        "help": "Tiempo de bloqueo tras un HTTP 429 o «confirma que no eres un bot»."
      },
      "backoff_max_hours": {
        "label": "Bloqueo temporal: máximo",
        "help": "El tiempo de bloqueo se duplica con cada nuevo bloqueo hasta este valor."
      }
    },
    "backoff": {
      "none": "Sin bloqueo temporal activo ({p})",
      "none_detail": "Se permiten búsqueda, lista de seguimiento y descargas de {p}.",
      "active": "Bloqueo temporal activo ({p})",
      "active_detail": "hasta las {t} · quedan {rest} · nivel {level}",
      "blocked": "{p} ha indicado un bloqueo. La búsqueda, la lista de seguimiento y las descargas de {p} quedan bloqueadas hasta que expire el plazo.",
      "clear": "Levantar manualmente",
      "sc_off": "SoundCloud está desactivado",
      "sc_off_detail": "Sin búsqueda en SoundCloud, sin revisiones de la lista de seguimiento y sin descargas de SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Usar SoundCloud",
        "help": "Desactivado: sin búsqueda en SoundCloud, sin revisión de fuentes de SoundCloud y sin descargas de SoundCloud. Lo ya descargado permanece en la biblioteca."
      },
      "sleep_requests": {
        "label": "Pausa entre peticiones",
        "help": "Tiempo de espera entre consultas de metadatos a SoundCloud (búsqueda, lista de seguimiento)."
      },
      "sleep_interval": {
        "label": "Pausa de descarga: mínimo",
        "help": "Tras cada descarga de SoundCloud sigue una pausa aleatoria entre el mínimo y el máximo."
      },
      "max_sleep_interval": {
        "label": "Pausa de descarga: máximo",
        "help": "Límite superior de la pausa aleatoria."
      },
      "limit_rate_mb": {
        "label": "Velocidad de descarga",
        "help": "Ancho de banda máximo. 0 = sin límite (no recomendado)."
      },
      "max_downloads_per_run": {
        "label": "Máx. descargas por ejecución",
        "help": "Contador independiente para SoundCloud. El resto sigue en la cola."
      },
      "max_downloads_per_day": {
        "label": "Máx. descargas por día",
        "help": "Contador independiente para SoundCloud, descargas manuales y automáticas en conjunto."
      },
      "max_searches_per_hour": {
        "label": "Máx. búsquedas por hora",
        "help": "Contador independiente para SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Bloqueo temporal: valor inicial",
        "help": "Tiempo de bloqueo tras avisar SoundCloud de demasiadas peticiones (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Bloqueo temporal: máximo",
        "help": "El tiempo de bloqueo se duplica con cada nuevo bloqueo hasta este valor."
      }
    },
    "ladder": {
      "label": "Niveles",
      "help": "Cómo crece el tiempo de bloqueo con los valores actuales.",
      "reset": "Se restablece tras una ejecución correcta",
      "invalid": "Valores no válidos"
    },
    "network": {
      "po_token_mode": {
        "label": "Modo",
        "help": "Plugin bgutil para yt-dlp. Script inicia Deno cuando hace falta; HTTP mantiene un servidor local en marcha."
      },
      "po_token_port": {
        "label": "Puerto HTTP",
        "help": "Solo en modo HTTP. El servidor escucha en 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Validez del token",
        "help": "Pasado este tiempo se genera un token nuevo. El valor se redondea a horas enteras (mínimo 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies del navegador",
        "help": "Inicia sesión en yt-dlp con la sesión de tu navegador. Actívalo solo si ya no funciona sin ello."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Opcional, p. ej. socks5://127.0.0.1:1080. Vacío = conexión directa.",
        "ph": "sin proxy"
      }
    },
    "po": {
      "active": "PO-Token activo",
      "inactive": "PO-Token inactivo",
      "error": "Error de PO-Token",
      "mode": "Modo",
      "test": "Probar",
      "testing": "Probando …",
      "test_ok": "Prueba superada.",
      "test_fail": "Prueba fallida.",
      "unsaved": "La prueba usa los ajustes guardados. Guarda antes tus cambios."
    },
    "cookies": {
      "warn_off": "<b>Recomendado: desactivado.</b> Combinar PO-Token y cookies del navegador puede causar problemas.",
      "warn_on": "<b>Solución alternativa activa.</b> Combinar PO-Token y cookies del navegador puede provocar errores o bloqueos, y para las peticiones se usa tu cuenta de YouTube. Desactívalo en cuanto funcione sin ellas. Las cookies nunca llegan al registro."
    },
    "schedule": {
      "in_app_check": {
        "label": "Revisar mientras la app esté abierta",
        "help": "La lista de seguimiento se revisa en el intervalo configurado mientras la ventana está abierta."
      },
      "watchlist_interval_hours": {
        "label": "Intervalo",
        "help": "Tiempo entre dos revisiones en la app."
      },
      "entries_per_source": {
        "label": "Entradas por fuente",
        "help": "Cuántas de las entradas más recientes se obtienen (ligero) en cada revisión (valor predeterminado para fuentes nuevas)."
      },
      "task_scheduler_enabled": {
        "label": "Usar el Programador de tareas",
        "help": "También revisa la lista de seguimiento con la app cerrada (headless). Se activa con «Crear tarea»."
      },
      "task_time": {
        "label": "Hora",
        "help": "Hora diaria de inicio de la tarea programada."
      }
    },
    "next": {
      "title": "Próxima revisión",
      "off": "Sin revisión automática",
      "off_detail": "Ni la revisión en la app ni la tarea de Windows están activas. La lista de seguimiento solo se revisa manualmente.",
      "app_detail": "En la app, cada {h} h, mientras HCLoader esté abierto.",
      "task_detail": "Con el Programador de tareas de Windows, a diario a las {time}, incluso con la app cerrada.",
      "any_detail": "La más próxima entre el intervalo de la app y la tarea de Windows.",
      "also_task": "Además: tarea de Windows a diario a las {time}.",
      "also_app": "Además, en la app cada {h} h.",
      "pending": "Aún sin programar",
      "pending_detail": "La app fija la próxima fecha en cuanto haya revisado la lista de seguimiento por primera vez.",
      "due": "Pendiente: empieza en breve",
      "backoff": "<b>Bloqueo temporal activo.</b> No hay revisiones hasta las {t}; después la fecha se recupera o se omite.",
      "unsaved": "Los cambios de programación sin guardar solo se aplican tras guardar."
    },
    "task": {
      "loading": "Consultando tarea …",
      "registered": "Tarea registrada",
      "registered_detail": "{name} · a diario a las {time} · próxima ejecución {next}",
      "none": "Ninguna tarea registrada",
      "none_detail": "Crea una tarea diaria de Windows a las {time} (schtasks).",
      "create": "Crear tarea",
      "remove": "Eliminar tarea",
      "moved": "Se movió la app: recrea la tarea",
      "moved_detail": "La tarea programada sigue iniciando {cmd}. Al recrearla se usa la carpeta actual de la app.",
      "recreate": "Recrear tarea",
      "unknown": "Estado de la tarea desconocido",
      "unknown_detail": "El Programador de tareas de Windows no respondió. El ajuste permanece sin cambios.",
      "recheck": "Comprobar de nuevo"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Reducir efectos",
        "help": "Desactiva líneas de barrido, glitch y todas las animaciones."
      },
      "scanlines": {
        "label": "Líneas de barrido y ruido",
        "help": "Capa fina sobre toda la interfaz."
      },
      "pulse_bpm": {
        "label": "Pulso de bombo",
        "help": "El ritmo al que late la barra de progreso."
      }
    },
    "pulse_preview": {
      "label": "Vista previa",
      "help": "Así late una descarga en curso.",
      "off": "Efectos reducidos"
    },
    "versions": {
      "plugin": "Plugin de PO-Token",
      "was": "antes {v}"
    },
    "update": {
      "label": "yt-dlp y plugin",
      "help": "YouTube cambia constantemente. Si hay errores, actualiza primero (pip en el venv).",
      "button": "Actualizar yt-dlp y plugin",
      "running": "Actualizando …",
      "last_check": "Última comprobación",
      "restart": "<b>Reinicio necesario.</b> yt-dlp se ha actualizado. La búsqueda y las descargas quedan bloqueadas hasta reiniciar HCLoader; la cola se conserva.",
      "restart_title": "Reinicio necesario",
      "restart_text": "yt-dlp se ha actualizado. Cierra y reinicia HCLoader; hasta entonces la búsqueda y las descargas están bloqueadas, la cola se conserva.",
      "out_live": "Salida · en curso desde hace {t}",
      "out_done": "Salida · terminado tras {t}",
      "out_failed": "Salida · fallido",
      "out_last": "Salida",
      "waiting": "Iniciando pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Buscar actualizaciones al iniciar",
        "help": "yt-dlp y plugin de PO-Token, como máximo una vez al día."
      },
      "check_app_updates_on_start": {
        "label": "Buscar actualizaciones de HCLoader al iniciar",
        "help": "Consulta GitHub una vez por inicio si hay una versión nueva. No se descarga nada hasta que hagas clic."
      },
      "apply_update_on_exit": {
        "label": "Instalar actualización al salir",
        "help": "Una actualización descargada se instala al cerrar HCLoader («Más tarde»). Desactivado: se ofrece de nuevo en el próximo inicio."
      },
      "update_repo": {
        "label": "Origen de actualizaciones (GitHub)",
        "help": "Repositorio con el formato «propietario/repo». Cámbialo solo para forks."
      }
    },
    "db": {
      "label": "Base de datos",
      "help": "Estado de todos los vídeos, fuentes y ejecuciones. Una copia de seguridad copia el archivo a la carpeta «backups».",
      "backup": "Crear copia de la BD",
      "backing_up": "Copiando …",
      "open": "Carpeta de datos",
      "open_logs": "Carpeta de registros",
      "open_title": "Abrir la carpeta con la base de datos, la configuración y las copias de seguridad",
      "open_logs_title": "Abrir la carpeta con los archivos de registro",
      "info": {
        "one": "{n} entrada · {mb} MB",
        "other": "{n} entradas · {mb} MB"
      },
      "last": "Última copia",
      "never": "ninguna aún",
      "keep": "Se conservan las 10 copias más recientes; las más antiguas se eliminan con la siguiente copia.",
      "backups": "Copias de seguridad",
      "backups_more": "+ {n} más antiguas en la carpeta «backups»",
      "fresh": "nueva"
    },
    "reset_all": {
      "label": "Todos los ajustes",
      "help": "Restablece todas las pestañas a sus valores predeterminados. La base de datos y los archivos de música no se tocan.",
      "button": "Restablecer todo"
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
        "auto": "Automático (idioma del sistema)"
      }
    },
    "player": {
      "mode": {
        "internal": "Reproductor integrado (recomendado)",
        "external": "Reproductor predeterminado de Windows"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Original (Opus/M4A, sin conversión)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "No",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Bloquear canal",
      "text": "Ya no se mostrarán vídeos de «{ch}». Se deshace en Ajustes › Filtros y palabras clave.",
      "ok": "Bloquear"
    },
    "ignore_all": {
      "title": "Ignorar resultados",
      "text": {
        "one": "¿Marcar {n} resultado de la bandeja como ignorado? No se descargará y dejará de aparecer en la bandeja.",
        "other": "¿Marcar {n} resultados de la bandeja como ignorados? No se descargarán y dejarán de aparecer en la bandeja."
      },
      "ok": "Ignorar"
    },
    "del_source": {
      "title": "Eliminar fuente",
      "text": "¿Quitar «{name}» de la lista de seguimiento? Los mixes ya descargados se conservan."
    },
    "del_mix": {
      "title": "Eliminar mix",
      "text": "«{title}» se quita de la biblioteca y el archivo se elimina del disco:",
      "ok": "Eliminar archivo",
      "warn": "<b>Esto no se puede deshacer.</b> Se eliminan el archivo de audio y el archivo .cue asociado. El mix se marca como «ignorado» y <b>no se volverá a descargar</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Quitar solo la entrada",
      "text": "El archivo de «{title}» está fuera de la carpeta de destino actual y por eso no se eliminará:",
      "ok": "Quitar solo la entrada",
      "warn": "El archivo permanece intacto donde está. La entrada desaparece de la biblioteca, el mix se marca como «ignorado» y <b>no se volverá a descargar</b>."
    },
    "remove_mix": {
      "title": "Quitar entrada",
      "text": "No se encontró el archivo de «{title}» en la ubicación guardada:",
      "ok": "Quitar entrada",
      "warn": "La entrada desaparece de la biblioteca. El mix se marca como «ignorado» y <b>no se volverá a descargar</b>. Si el archivo está en otro sitio, permanece intacto."
    },
    "backoff": {
      "title": "Levantar bloqueo temporal",
      "ok": "Levantar igualmente",
      "text": "El tiempo de bloqueo te protege: {p} ha indicado que llegaron demasiadas peticiones.",
      "warn": "<b>Levántalo solo si estás seguro de que el bloqueo ha terminado.</b> Si la app vuelve a acceder demasiado pronto, {p} podría restringir tu IP durante más tiempo o de forma permanente."
    },
    "reset_all": {
      "title": "Restablecer todo",
      "text": "Todos los ajustes de todas las pestañas se restablecen de inmediato a sus valores predeterminados y se guardan.",
      "ok": "Restablecer"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mix añadido a la cola",
      "other": "{n} mixes añadidos a la cola"
    },
    "enqueued_none": "No se añadió nada: ya está en cola o descargado",
    "enqueued_skipped": "{n} omitidos",
    "queue_cancelled": "Cancelado: {title}",
    "queue_removed": "Quitado: {title}",
    "queue_retry": "De nuevo en cola: {title}",
    "queue_paused": "Cola en pausa",
    "queue_resumed": "Cola reanudada",
    "new_run": "Nueva ejecución iniciada",
    "ignored": "Ignorado: {title}",
    "unignored": "Visible de nuevo: {title}",
    "ignored_n": {
      "one": "{n} resultado ignorado",
      "other": "{n} resultados ignorados"
    },
    "opening": "Abriendo {p} en el navegador …",
    "watch_added": "Añadido a la lista de seguimiento: {ch}",
    "blocked": "Canal bloqueado: {ch}",
    "genre_set": "Género definido: {genre}",
    "done": "Descargado: {title}",
    "failed": "Fallido: {title} – {error}",
    "wl_started": {
      "one": "Revisando lista de seguimiento ({n} fuente, con limitación) …",
      "other": "Revisando lista de seguimiento ({n} fuentes, con limitación) …"
    },
    "wl_started_one": "Revisando «{name}» …",
    "wl_none": "Ninguna fuente activa: nada que revisar",
    "wl_done": {
      "one": "Fuente revisada: nada nuevo",
      "other": "Lista de seguimiento revisada: {n} fuentes, nada nuevo"
    },
    "wl_done_found": {
      "one": "Lista de seguimiento revisada: {n} nuevo resultado",
      "other": "Lista de seguimiento revisada: {n} nuevos resultados"
    },
    "wl_errors": {
      "one": "{n} fuente con errores",
      "other": "{n} fuentes con errores"
    },
    "source_added": "Fuente añadida: {name}",
    "source_saved": "Fuente guardada: {name}",
    "source_deleted": "Fuente eliminada: {name}",
    "retagged": "Re-etiquetado: {title}",
    "retagged_moved": "Re-etiquetado y movido: {title} → {path}",
    "deleted": "Eliminado: {title}",
    "removed": "Entrada quitada: {title}",
    "folder_opening": "Abriendo carpeta …",
    "copied": {
      "one": "{n} línea copiada",
      "other": "{n} líneas copiadas"
    },
    "copy_failed": "No se puede copiar",
    "copy_none": "No hay líneas visibles",
    "settings_saved": "Ajustes guardados",
    "settings_errors": {
      "one": "{n} entrada no es válida",
      "other": "{n} entradas no son válidas"
    },
    "backoff_cleared": "Bloqueo temporal ({p}) levantado manualmente",
    "genre_moved": "Género: {genre} – movido a {path}",
    "genre_retagged": "Género: {genre} – etiquetas actualizadas",
    "genre_entry_only": "Género: {genre} – solo se cambió la entrada, el archivo no está accesible",
    "genre_failed": "No se pudo definir el género: {error}",
    "task_created": "Tarea creada en el Programador de tareas de Windows",
    "task_removed": "Tarea eliminada",
    "updated": "Actualizado a yt-dlp {v}",
    "up_to_date": "Ya está al día (yt-dlp {v})",
    "update_failed": "Falló la actualización",
    "restart_required": "Actualizado: reinicia HCLoader para que la búsqueda y las descargas vuelvan a funcionar",
    "backup_done": "Copia de seguridad creada: {path}",
    "reset_all": "Todos los ajustes restablecidos"
  },
  "upd": {
    "available": "Versión {v} disponible",
    "available_sub": "Instalada: {cur}",
    "download": "Descargar",
    "notes": "Cambios",
    "later": "Más tarde",
    "close": "Cerrar",
    "cancel": "Cancelar",
    "retry": "Reintentar",
    "downloading": "Descargando la actualización {v}",
    "phase_download": "Descarga",
    "phase_verify": "Verificación",
    "phase_prepare": "Preparación",
    "ready": "Actualización {v} lista",
    "ready_sub": "Para instalarla, HCLoader se cierra un momento y se reinicia.",
    "restart_now": "Reiniciar ahora",
    "on_exit": "Al salir",
    "applying": "Instalando actualización …",
    "applying_sub": "HCLoader se cierra y se reinicia enseguida.",
    "error": "Falló la actualización de la app",
    "blocked": "Actualización automática no posible",
    "notes_title": "Cambios de la versión {v}",
    "notes_empty": "No hay notas de la versión.",
    "notes_link": "Versión en GitHub",
    "notes_all": "Mostrar todos los cambios",
    "notes_less": "Mostrar solo lo destacado",
    "confirm_title": "¿Reiniciar ahora?",
    "confirm_ok": "Reiniciar",
    "confirm_text": "HCLoader se cierra, se instala la actualización y la app se reinicia. Una descarga en curso se cancela y permanece en la cola. La música, los ajustes y la base de datos no cambian.",
    "on_exit_toast": "La actualización se instalará al salir de HCLoader.",
    "later_toast": "La actualización queda lista y se ofrecerá de nuevo en el próximo inicio.",
    "section_label": "Versión de HCLoader",
    "section_help": "Las versiones nuevas vienen de GitHub. Los datos, ajustes y música no se tocan con las actualizaciones; antes de una migración de la base de datos se crea una copia de seguridad automáticamente.",
    "current": "Instalada",
    "latest": "Última",
    "checked": "Última comprobación",
    "check_now": "Comprobar ahora",
    "checking": "Comprobando …",
    "st_idle": "Al día",
    "st_available": "Nueva versión disponible",
    "st_checking": "Comprobando …",
    "st_downloading": "Descargando …",
    "st_ready": "Lista para instalar",
    "st_applying": "Instalando …",
    "st_error": "Error",
    "st_unknown": "Aún sin comprobar",
    "up_to_date": "HCLoader está al día (v{v})",
    "portable": "Versión portátil",
    "installed": "Instalada (setup)",
    "git": "Checkout de Git",
    "from_repo": "de {repo} (no es la fuente oficial)",
    "unverified": "sin suma de comprobación (solo se verificó la integridad del ZIP)"
  },
  "err": {
    "generic": "Error desconocido",
    "bridge": "Error en «{name}»: {msg}",
    "boot": "Falló el inicio: {msg}",
    "no_backend": "Sin conexión con el backend"
  },
  "fatal": {
    "title": "Falló la conexión con el backend",
    "text": "La interfaz no recibió respuesta de la parte Python de HCLoader. No se muestra ni se guarda nada que no sea real.",
    "waiting": "Esperando todavía al backend …",
    "reload": "Recargar"
  }
});
