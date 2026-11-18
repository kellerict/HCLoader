/* HCLoader UI texts – Português (Brasil).
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "pt", "name": "Português (Brasil)", "dir": "ltr", "intl": "pt-BR"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "ARQUIVO DE MÚSICA PESADA",
    "mock": "MODO SIMULADO"
  },
  "nav": {
    "discover": "Descobrir",
    "inbox": "Caixa de entrada",
    "watchlist": "Lista de monitoramento",
    "downloads": "Downloads",
    "library": "Biblioteca",
    "log": "Registro",
    "settings": "Configurações",
    "stats": "Estatísticas"
  },
  "navfoot": {
    "today": "HOJE",
    "next": "PRÓX. VERIFICAÇÃO"
  },
  "common": {
    "ok": "OK",
    "cancel": "Cancelar",
    "save": "Salvar",
    "delete": "Excluir",
    "edit": "Editar",
    "remove": "Remover",
    "reset": "Redefinir",
    "on": "sim",
    "off": "não",
    "current": "atual",
    "loading": "carregando …",
    "add_chip": "+ adicionar",
    "empty": "“vazio”",
    "empty_list": "“nenhum”"
  },
  "fmt": {
    "today": "hoje",
    "yesterday": "ontem",
    "never": "nunca",
    "no_date": "Data desconhecida",
    "just_now": "agora mesmo",
    "today_at": "hoje às {t}",
    "tomorrow_at": "amanhã às {t}",
    "yesterday_at": "ontem às {t}",
    "views": {
      "one": "{v} visualização",
      "other": "{v} visualizações"
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
    "clock": "h",
    "req_h": "req./h",
    "lufs": "LUFS",
    "db": "dB"
  },
  "range": {
    "ge_sleep": "≥ mínimo",
    "ge_initial": "≥ valor inicial"
  },
  "status": {
    "new": "Novo",
    "inbox": "Na caixa de entrada",
    "queued": "Na fila",
    "downloading": "Baixando",
    "done": "Baixado",
    "ignored": "Ignorado",
    "failed": "Erro"
  },
  "period": {
    "all": "Tudo",
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    "1y": "Últimos 12 meses",
    "year": "Ano específico",
    "custom": "Personalizado"
  },
  "source_type": {
    "channel": "Canal",
    "playlist": "Playlist",
    "search": "Busca"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Plataforma",
    "sc_off": "O SoundCloud está desativado – ative em Configurações › SoundCloud."
  },
  "genre": {
    "change": "Alterar gênero",
    "manual": "Gênero definido manualmente",
    "change_manual": "Alterar gênero (definido manualmente)"
  },
  "run_kind": {
    "watchlist": "Lista de monitoramento",
    "headless": "Agendador de Tarefas",
    "manual": "Manual"
  },
  "phase": {
    "waiting": "Aguardando",
    "sleep": "Pausa até o próximo download",
    "download": "Baixando",
    "convert": "Convertendo",
    "tag": "Aplicando tags",
    "failed": "Falhou"
  },
  "po_mode": {
    "off": "Não",
    "script": "Script",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Não",
    "script": "Script (Deno)",
    "http": "Servidor HTTP (local)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "ausente",
    "po": "PO token",
    "po_active": "ativo ({mode})",
    "po_inactive": "inativo",
    "po_error": "Erro",
    "backoff": "Bloqueio temporário",
    "backoff_none": "nenhum",
    "backoff_until": "até {t} · faltam {rest}",
    "queue": "Fila",
    "queue_empty": "vazia",
    "queue_active": "ativa",
    "queue_paused": "pausada",
    "today": "Hoje",
    "next": "Próx. verificação",
    "next_off": "não",
    "backoff_until_short": "até {t}",
    "sc_backoff": "Bloqueio até {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · baixados hoje {day}/{day_max} · {s}/{s_max} buscas nesta hora",
    "sc_tip": "SoundCloud · baixados hoje {day}/{day_max} · {s}/{s_max} buscas nesta hora",
    "backoff_tip": "{p}: bloqueio temporário até {t} (faltam {rest})"
  },
  "schedule": {
    "due": "pendente",
    "kind_app": "App",
    "kind_task": "Tarefa",
    "tip_app": "Próxima verificação da lista de monitoramento no app: {t} (enquanto o HCLoader estiver aberto).",
    "tip_task": "Próxima verificação da lista de monitoramento pelo Agendador de Tarefas do Windows: {t}.",
    "tip_any": "Próxima verificação da lista de monitoramento: {t}.",
    "tip_off": "Sem verificação automática – nem no app nem pelo Agendador de Tarefas do Windows.",
    "tip_backoff": "Sem verificações enquanto o bloqueio temporário estiver ativo."
  },
  "card": {
    "source": "Encontrado pela fonte de monitoramento “{name}”",
    "select": "Selecionar",
    "open": "Abrir no {p}",
    "ignore": "Ignorar",
    "unignore": "Parar de ignorar",
    "more": "Mais ações",
    "download": "Baixar",
    "watch": "Adicionar canal à lista de monitoramento",
    "block": "Bloquear canal",
    "set_genre": "Definir gênero",
    "date_approx": "Data aproximada – a busca do YouTube só informa “há X anos”",
    "date_unknown": "Sem data de envio",
    "duplicate": "Provavelmente já baixado ({p})",
    "duplicate_title": "Título muito parecido e mesma duração de “{title}” em {p} – já baixado ou na fila lá. Você ainda pode baixá-lo.",
    "preview": "Somente prévia (Go+) – não pode ser baixado",
    "preview_title": "O SoundCloud só oferece uma prévia de 30 segundos (Go+) desta faixa. Ela não pode ser baixada."
  },
  "discover": {
    "placeholder": "Buscar mix, live set, DJ, evento …",
    "search": "Buscar",
    "searching_btn": "Buscando …",
    "searching": "Buscando – consulta leve, sem sobrecarregar o YouTube …",
    "sort": "Ordenar",
    "sort_rel": "Relevância",
    "sort_date": "Mais recentes primeiro",
    "sort_dur": "Mais longos primeiro",
    "sort_views": "Mais vistos",
    "quota": "Buscas nesta hora: {n} / {max}",
    "quota_sc": "Buscas no SoundCloud nesta hora: {n} / {max}",
    "placeholder_sc": "Buscar no SoundCloud: mix, set, DJ, podcast …",
    "platform_title": "Onde buscar",
    "searching_sc": "Buscando – consulta leve, sem sobrecarregar o SoundCloud …",
    "ready_text_sc": "Digite um termo e pressione Enter para buscar no SoundCloud.",
    "previews": "{n} somente prévia (Go+)",
    "previews_title": "Prévias do Go+ nunca podem ser baixadas. Visíveis quando “Ocultar baixados e ignorados” está desativado.",
    "filters": "Filtros",
    "toggle_filters": "Mostrar/ocultar painel de filtros",
    "f_duration": "Duração (minutos)",
    "f_min": "Mínimo",
    "f_max": "Máximo (vazio = sem limite)",
    "f_max_ph": "máx.",
    "f_period": "Período de envio",
    "f_year": "Ano",
    "f_year_prev": "Um ano atrás",
    "f_year_next": "Um ano à frente",
    "f_from": "De",
    "f_to": "Até",
    "f_hint_year": "A busca do YouTube só informa uma data aproximada (“há 13 anos”). Por isso vale ±1 ano – e também todo mix com “{year}” no título.",
    "f_hint_custom": "A busca do YouTube só informa uma data aproximada. Para datas aproximadas, vale uma tolerância de ±1 ano nas duas pontas.",
    "chip_title": "Clique: mostrar/ocultar gênero · Clique duplo: só este gênero (seus termos são acrescentados à busca)",
    "scope": "Busca ampliada com",
    "scope_title": "A próxima busca acrescenta estes termos ao seu texto.",
    "searched": "Buscado com",
    "stale": "Filtros alterados desde",
    "re_search": "Buscar de novo",
    "re_search_title": "Os resultados vêm da última busca. Busque de novo para incluir gênero e ano no termo (conta como uma busca).",
    "need_query": "Digite primeiro um termo de busca.",
    "f_inc": "Palavras-chave a incluir",
    "f_exc": "Palavras-chave a excluir",
    "f_show": "Exibição",
    "f_hide": "Ocultar baixados e ignorados",
    "f_blacklist": "Aplicar lista negra de canais",
    "count": {
      "one": "{n} resultado · {hidden} filtrados",
      "other": "{n} resultados · {hidden} filtrados"
    },
    "selected": "{n} selecionados",
    "select_all": "Selecionar tudo",
    "download_sel": "Baixar seleção",
    "ready_title": "Pronto",
    "ready_text": "Digite um termo de busca e pressione Enter.",
    "none_title": "Nada encontrado",
    "none_text": "Afrouxe os filtros ou tente outros termos.",
    "none_year": "Nenhum resultado de {year}. Busque de novo para incluir o ano no termo – ou mude o ano."
  },
  "inbox": {
    "title": "Caixa de entrada",
    "sub": "Novos resultados da lista de monitoramento que passam por todos os filtros",
    "sub_n": {
      "one": "{n} novo resultado da lista de monitoramento que passa por todos os filtros",
      "other": "{n} novos resultados da lista de monitoramento que passam por todos os filtros"
    },
    "ignore_all": "Ignorar tudo",
    "download_all": "Baixar tudo",
    "ignore_sel": "Ignorar seleção",
    "download_sel": "Baixar seleção",
    "select_all": "Selecionar tudo",
    "select_none": "Limpar seleção",
    "src_all": "Todas as fontes",
    "src_none": "Nenhuma fonte",
    "src_title": "Mostrar só resultados desta fonte",
    "count": {
      "one": "{n} resultado",
      "other": "{n} resultados"
    },
    "count_of": "{n} de {total} resultados",
    "selected": "{n} selecionados",
    "empty_title": "Caixa de entrada vazia",
    "empty_text": "A lista de monitoramento não encontrou nenhum mix novo.",
    "empty_nosrc": "Ainda não há fontes na lista de monitoramento – adicione um canal, uma playlist ou uma busca e os novos mixes aparecerão aqui.",
    "empty_next": "Próxima verificação: {t}.",
    "to_watchlist": "Ir para a lista de monitoramento"
  },
  "watchlist": {
    "title": "Lista de monitoramento",
    "sub_n": {
      "one": "{n} fonte · {active} ativa",
      "other": "{n} fontes · {active} ativas"
    },
    "sub_next": "próxima verificação {t}",
    "add": "Fonte",
    "check_all": "Verificar tudo agora",
    "check": "Verificar",
    "checking": "verificando …",
    "queued": "aguardando …",
    "running": "Verificando …",
    "running_n": "Verificando {i} / {n} …",
    "col_active": "Ativa",
    "col_name": "Nome",
    "col_type": "Tipo",
    "col_genre": "Gênero",
    "col_auto": "Novos resultados",
    "col_max": "Máx.",
    "col_last": "Última verificação",
    "col_new": "Novos",
    "genre_auto": "automático",
    "genre_auto_long": "Automático (por palavras-chave)",
    "auto_on": "baixar",
    "auto_off": "caixa de entrada",
    "auto_title_on": "Novos resultados são baixados automaticamente",
    "auto_title_off": "Novos resultados vão apenas para a caixa de entrada",
    "new_title": "Mostrar na caixa de entrada",
    "check_title": "Verificar esta fonte agora",
    "why_off": "A fonte não está ativa",
    "why_running": "Já há uma verificação em andamento",
    "why_backoff": "Bloqueio temporário ativo – verificação bloqueada",
    "why_backoff_p": "Bloqueio temporário ({p}) ativo – verificação bloqueada",
    "why_sc_off": "O SoundCloud está desativado",
    "error_title": "A última verificação falhou",
    "backoff": "<b>Bloqueio temporário ativo até {t}</b> (faltam {rest}). A lista de monitoramento não pode ser verificada – as verificações agendadas também ficam em pausa.",
    "backoff_p": "<b>Bloqueio temporário ({p}) ativo até {t}</b> (faltam {rest}). As fontes do {p} são ignoradas até lá – {other} continua funcionando.",
    "backoff_link_sc": "Abrir SoundCloud",
    "backoff_link": "Abrir Limitação",
    "none_active": "Nenhuma fonte ativa para verificar",
    "empty_title": "Nenhuma fonte",
    "empty_text": "Adicione um canal, uma playlist ou uma busca salva.",
    "add_title": "Adicionar fonte",
    "edit_title": "Editar fonte",
    "f_type": "Tipo",
    "f_name": "Nome",
    "f_url": "URL",
    "f_query": "Termo de busca",
    "f_genre": "Gênero padrão",
    "f_max": "Máx. de entradas",
    "f_newest_last": "Os mais recentes ficam no fim (ler a playlist de trás para frente)",
    "hint_newest_last": "Em muitas playlists o YouTube acrescenta os vídeos novos no fim. Lê a playlist inteira (cerca de 1 requisição a cada 100 vídeos, máx. 2000 entradas).",
    "rev_title": "Os mais recentes ficam no fim – a playlist é lida a partir do fim",
    "rev_short": "de trás para frente",
    "f_enabled": "Ativa – incluir em “Verificar tudo” e no agendamento",
    "f_hits": "Novos resultados",
    "hits_inbox": "Para a caixa de entrada",
    "hits_auto": "Baixar automaticamente",
    "hint_inbox": "Os resultados aguardam na caixa de entrada até você baixá-los ou ignorá-los.",
    "hint_auto": "Resultados que passam por todos os filtros vão direto para a fila.",
    "hint_channel": "Canal do YouTube (…/@nome ou …/channel/UC…, opcionalmente /videos ou /streams) ou perfil do SoundCloud (soundcloud.com/nome).",
    "hint_playlist": "Playlist do YouTube com “list=…” ou set do SoundCloud (soundcloud.com/nome/sets/set). As entradas mais recentes são verificadas.",
    "f_platform": "Buscar em",
    "detected": "detectado: {p} · {type}",
    "not_detected": "URL não reconhecida",
    "suggested": "Sugestão",
    "suggested_title": "Sugerido a partir da URL. Se não for alterado, a primeira verificação o substitui pelo nome real – ou simplesmente sobrescreva.",
    "hint_name_auto": "Sugerido a partir da URL – fique à vontade para alterar. Se não for alterado, a primeira verificação define o nome real.",
    "hint_name_later": "O nome é definido pela primeira verificação – ou digite você mesmo aqui.",
    "name_auto_title": "Nome provisório – a próxima verificação define o real",
    "hint_search": "Busca salva, como em “Descobrir” – conta como uma busca por verificação.",
    "hint_max": "por verificação",
    "max_default": "(padrão)",
    "max_default_title": "Sem valor próprio: vale “Entradas por fonte” de Configurações › Agendamento",
    "max_title": "Vazio = padrão de Configurações › Agendamento. No máximo 200, 100 para fontes de busca.",
    "ph_name": "ex.: Gabber Vault",
    "ph_name_later": "definido pela primeira verificação",
    "ph_channel": "https://www.youtube.com/@canal  ou  https://soundcloud.com/nome",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  ou  https://soundcloud.com/nome/sets/…",
    "ph_search": "ex.: frenchcore liveset",
    "form_error": "Não foi possível salvar a fonte."
  },
  "downloads": {
    "title": "Downloads",
    "sub": "Sequencial, um download por vez",
    "pause": "Pausar",
    "resume": "Retomar",
    "cancel": "Cancelar",
    "retry": "Tentar de novo",
    "remove": "Remover",
    "up": "Subir",
    "down": "Descer",
    "eta": "Tempo restante",
    "position": "Posição {n}",
    "sleep_left": "continua em",
    "sleep_why": "Limitação: pausa aleatória de {min}–{max} s entre dois downloads",
    "next_up": "A seguir",
    "sleeping": "Em pausa",
    "sleep_range": "de {min}–{max} s",
    "blocked_wait": "Aguardando – {why}",
    "why_backoff": "Bloqueio temporário",
    "why_day": "Limite diário",
    "why_run": "Limite por execução",
    "why_paused": "pausada",
    "why_restart": "Reinício necessário",
    "why_busy": "outra execução ativa",
    "why_pot": "Servidor de PO-Token não está pronto",
    "why_target": "Pasta de destino inacessível",
    "why_error": "Módulo de download ausente",
    "summary": "Hoje {day}/{day_max} · Execução {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} continua baixando.",
    "steps": "Baixar · Converter · Aplicar tags",
    "unlimited": "ilimitado",
    "l_run": "Esta execução",
    "l_day": "Hoje",
    "l_rate": "Limite de velocidade",
    "l_sleep": "Pausa entre downloads",
    "sec_queue": "Fila",
    "sec_failed": "Com falha",
    "empty_title": "Fila vazia",
    "empty_text": "Selecione mixes em “Descobrir” ou na “Caixa de entrada”.",
    "paused": "<b>Fila pausada.</b> O download atual fica parado até você retomar.",
    "backoff": "<b>Bloqueio temporário ativo até {t}</b> (faltam {rest}). Downloads, busca e lista de monitoramento bloqueados.",
    "backoff_rest": {
      "one": "<b>Bloqueio temporário ativo até {t}</b> (faltam {rest}). Downloads, busca e lista de monitoramento bloqueados – {n} permanece na fila.",
      "other": "<b>Bloqueio temporário ativo até {t}</b> (faltam {rest}). Downloads, busca e lista de monitoramento bloqueados – {n} permanecem na fila."
    },
    "limit_day": "<b>Limite diário atingido ({n}/{max}).</b> O restante permanece na fila e continua amanhã.",
    "limit_day_rest": {
      "one": "<b>Limite diário atingido ({n}/{max}).</b> {rest} permanece na fila e continua amanhã.",
      "other": "<b>Limite diário atingido ({n}/{max}).</b> {rest} permanecem na fila e continuam amanhã."
    },
    "limit_run": "<b>Limite atingido – {max}/{max} nesta execução.</b> O restante permanece na fila e continua na próxima execução.",
    "limit_run_rest": {
      "one": "<b>Limite atingido – {max}/{max} nesta execução.</b> {rest} permanece na fila e continua na próxima execução.",
      "other": "<b>Limite atingido – {max}/{max} nesta execução.</b> {rest} permanecem na fila e continuam na próxima execução."
    },
    "limits_link": "Alterar limites",
    "new_run": "Iniciar nova execução",
    "need_restart": "<b>Reinício necessário.</b> O yt-dlp foi atualizado – reinicie o HCLoader. A fila é mantida.",
    "busy": "Outra execução de download está ativa (ex.: a verificação agendada). A fila aguarda até ela terminar.",
    "local_pot": {
      "one": "<b>Servidor de PO-Token não está pronto.</b> {rest} permanece na fila e continua assim que ele estiver rodando.",
      "other": "<b>Servidor de PO-Token não está pronto.</b> {rest} permanecem na fila e continuam assim que ele estiver rodando."
    },
    "local_target": {
      "one": "<b>Pasta de destino inacessível ou protegida contra gravação.</b> {rest} permanece na fila e continua assim que estiver disponível de novo.",
      "other": "<b>Pasta de destino inacessível ou protegida contra gravação.</b> {rest} permanecem na fila e continuam assim que estiver disponível de novo."
    },
    "local_error": {
      "one": "<b>Não foi possível carregar o módulo de download (yt-dlp).</b> {rest} permanece na fila. Nova tentativa após “Retomar”, novas entradas ou ao salvar as configurações.",
      "other": "<b>Não foi possível carregar o módulo de download (yt-dlp).</b> {rest} permanecem na fila. Nova tentativa após “Retomar”, novas entradas ou ao salvar as configurações."
    },
    "local_link_pot": "Configurações de rede",
    "local_link_target": "Alterar local de armazenamento",
    "local_link_error": "Manutenção"
  },
  "library": {
    "title": "Biblioteca",
    "sub": {
      "one": "{n} mix",
      "other": "{n} mixes"
    },
    "sub_shown": "{n} de {total} exibidos",
    "search": "Título, canal ou caminho …",
    "all_genres": "Todos os gêneros",
    "all_channels": "Todos os canais",
    "all_years": "Todos os anos",
    "f_genre": "Gênero",
    "f_channel": "Canal",
    "f_year": "Ano",
    "f_sort": "Ordenar",
    "sort_newest": "Mais recentes primeiro",
    "sort_title": "Título A–Z",
    "sort_channel": "Canal A–Z",
    "sort_duration": "Mais longos primeiro",
    "view_list": "Lista",
    "view_grid": "Blocos",
    "clear": "Redefinir filtros",
    "col_title": "Título",
    "col_channel": "Canal",
    "col_genre": "Gênero",
    "col_year": "Ano",
    "col_duration": "Duração",
    "col_size": "Tamanho",
    "col_loaded": "Baixado",
    "play": "Reproduzir",
    "pause": "Pausar",
    "play_external": "Abrir no player padrão",
    "play_internal": "Reproduzir no player do app",
    "play_missing": "Arquivo ausente – não é possível reproduzir",
    "more": "Mostrar mais {n}",
    "now_playing": "Tocando agora",
    "retag_short": "Reaplicar tags",
    "genre_working": "Definindo gênero …",
    "open_folder": "Abrir pasta",
    "retag": "Reaplicar tags (tags, capa e local conforme as configurações atuais)",
    "delete": "Excluir arquivo",
    "remove": "Remover entrada",
    "retagging": "Reaplicando tags …",
    "cue_title": "Lista de faixas como arquivo .cue ao lado do MP3",
    "missing": "Arquivo ausente",
    "missing_title": "O arquivo não foi encontrado no local salvo (movido ou excluído?)",
    "missing_chip": {
      "one": "{n} ausente",
      "other": "{n} ausentes"
    },
    "missing_chip_title": "Mostrar só entradas cujo arquivo está ausente",
    "stat_count": "Mixes",
    "stat_duration": "Duração total",
    "stat_size": "Tamanho",
    "stat_genres": "Por gênero",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} mix · {dur}",
      "other": "{n} mixes · {dur}"
    },
    "empty_title": "Nada baixado ainda",
    "empty_text": "Cada mix aparece aqui assim que é baixado e recebe as tags – com capa, gênero e local.",
    "empty_discover": "Descobrir mixes",
    "empty_watchlist": "Configurar lista de monitoramento",
    "target_down": "Pasta de destino inacessível: {path}",
    "target_down_hint": "Verifique a unidade ou o compartilhamento de rede. Enquanto estiver ausente, o estado dos arquivos é desconhecido: “Reaplicar tags” e “Remover entrada” ficam desativados.",
    "unknown_title": "Pasta de destino inacessível – estado do arquivo desconhecido",
    "none_title": "Nenhum resultado",
    "none_text": "Nenhuma entrada corresponde à busca e aos filtros.",
    "group_by": "Agrupar por",
    "group_none": "Nenhum",
    "group_genre": "Gênero",
    "group_festival": "Festival",
    "group_artist": "Artista",
    "group_year": "Ano",
    "group_unknown": "Desconhecido",
    "continue": "Continuar ouvindo",
    "continue_title": "Continuar “{title}” em {t}",
    "continue_left": "faltam {t}",
    "continue_forget": "Remover de “Continuar ouvindo”",
    "export": "M3U",
    "export_title": "Exportar o que está sendo exibido como playlist M3U8",
    "export_continue": "Exportar «Continuar ouvindo» como playlist"
  },
  "player": {
    "label": "Minirreprodutor",
    "play": "Reproduzir (Espaço)",
    "pause": "Pausar (Espaço)",
    "back": "Voltar 30 segundos",
    "fwd": "Avançar 30 segundos",
    "prev": "Faixa anterior",
    "next": "Próxima faixa",
    "seek": "Posição",
    "mute": "Silenciar",
    "unmute": "Ativar som",
    "volume": "Volume",
    "close": "Fechar player",
    "tracks": "Lista de faixas",
    "tracks_n": {
      "one": "{n} faixa",
      "other": "{n} faixas"
    },
    "tracks_toggle": "Mostrar/ocultar lista de faixas",
    "no_tracks": "Sem capítulos neste arquivo",
    "total": "Duração total {t}",
    "keys": "Espaço: reproduzir/pausar · ←/→: 10 s",
    "err_load": "Não é possível reproduzir",
    "err_src": "Não é possível reproduzir: endereço de arquivo inválido",
    "err_play": "Não foi possível reproduzir o arquivo: {title}",
    "external": "Abrindo no player padrão …",
    "norm_title": "Volume normalizado: {lufs} LUFS → alvo {target} LUFS ({gain})",
    "norm_capped": "apenas reduzido – aumentar exige o motor de áudio",
    "norm_fallback": "Normalização: o motor de áudio fica mudo aqui – reprodução sem ele (só reduzir, sem amplificar)",
    "resume_q": "Continuar de onde você parou?",
    "resume_at": "em {t}",
    "resume": "Continuar",
    "restart": "Do início",
    "resumed_at": "Retomado em {t}",
    "sleep": "Timer de desligamento",
    "sleep_min": "{n} min",
    "sleep_end": "Fim deste set",
    "sleep_end_short": "fim",
    "sleep_off": "Desligar",
    "sleep_on": "Timer: para em {t}",
    "sleep_end_on": "Timer: para no fim deste set",
    "sleep_done": "Timer: reprodução parada",
    "queue_pos": "{i}/{n}",
    "queue_title": "Tocar tudo · {label}: set {i} de {n}"
  },
  "log": {
    "title": "Registro",
    "sub": "Registro ao vivo e histórico de execuções",
    "live": "Registro ao vivo",
    "history": "Histórico de execuções",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Aviso",
    "lvl_error": "Erro",
    "lvl_title": "Mostrar/ocultar nível “{lvl}”",
    "search": "Pesquisar no registro …",
    "following": "Ao vivo",
    "paused": "Pausado",
    "follow_title": "Rolar automaticamente até a linha mais recente (pausa ao rolar para cima)",
    "jump": "Ir para o fim",
    "jump_new": {
      "one": "{n} nova linha",
      "other": "{n} novas linhas"
    },
    "copy": "Copiar",
    "copy_title": "Copiar as linhas visíveis para a área de transferência",
    "open_logs": "Pasta de registros",
    "open_logs_title": "Abrir a pasta com os arquivos de registro completos",
    "lines": {
      "one": "{n} linha",
      "other": "{n} linhas"
    },
    "lines_of": "{n} de {total} linhas",
    "empty": "Nenhuma linha para estes níveis.",
    "empty_search": "Nenhuma linha contém “{q}”.",
    "no_runs": "Nenhuma execução ainda.",
    "no_runs_kind": "Nenhuma execução deste tipo.",
    "found": "encontrados",
    "downloaded": "baixados",
    "errors": "erros",
    "running": "em andamento …",
    "kind_all": "Todas",
    "timeline": "Linha do tempo",
    "table": "Tabela",
    "view_title": "Exibição do histórico de execuções",
    "col_kind": "Tipo",
    "col_start": "Início",
    "col_duration": "Duração",
    "col_found": "Encontrados",
    "col_downloaded": "Baixados",
    "col_errors": "Erros",
    "col_note": "Observação",
    "backoff": "Bloqueio temporário",
    "runs_sum": {
      "one": "{n} execução · {dl} baixados · {err} erros",
      "other": "{n} execuções · {dl} baixados · {err} erros"
    },
    "today": "Hoje",
    "yesterday": "Ontem"
  },
  "settings": {
    "title": "Configurações",
    "sub": "Tudo o que o app faz pode ser configurado aqui"
  },
  "tabs": {
    "general": "Geral",
    "filters": "Filtros e palavras-chave",
    "genres": "Gêneros",
    "download": "Download e qualidade",
    "storage": "Armazenamento e tags",
    "throttle": "Limitação",
    "soundcloud": "SoundCloud",
    "network": "Rede e PO-Token",
    "schedule": "Agendamento",
    "appearance": "Aparência",
    "maintenance": "Manutenção",
    "festivals": "Festivais e séries",
    "playback": "Reprodução",
    "notifications": "Notificações",
    "mediaserver": "Servidor de mídia"
  },
  "tabs_hint": {
    "general": "Comportamento básico do app.",
    "filters": "Filtros padrão para busca e lista de monitoramento. Podem ser substituídos temporariamente no painel de filtros em “Descobrir”.",
    "genres": "A ordem é a prioridade. Vence o primeiro gênero cuja palavra-chave aparece no título. Gêneros definidos manualmente e o gênero padrão de uma fonte têm precedência.",
    "download": "O YouTube geralmente entrega Opus a cerca de 130–160 kbps. O MP3 é uma conversão e não soa melhor que a fonte – mas toca em qualquer lugar.",
    "storage": "Para onde vão os arquivos e como são nomeados. A estrutura foi pensada para servidores de mídia como Plex ou Jellyfin.",
    "throttle": "Limita a carga sobre o YouTube. Estes valores valem em conjunto para busca, lista de monitoramento e downloads. O SoundCloud tem valores próprios na aba “SoundCloud”.",
    "soundcloud": "O SoundCloud como segunda fonte para busca, lista de monitoramento e downloads – com limites, contadores e bloqueio temporário próprios, independentes do YouTube.",
    "network": "O PO-Token identifica as requisições como de um navegador real e reduz o risco de bloqueios por bot.",
    "schedule": "Quando a lista de monitoramento é verificada automaticamente – no app e pelo Agendador de Tarefas do Windows.",
    "appearance": "Visual e sensação. As alterações aparecem na hora e só ficam permanentes após salvar.",
    "maintenance": "Versões, atualizações, banco de dados.",
    "festivals": "Reconhece festival ou série, ano, palco e tipo de set a partir dos títulos salvos – offline, sem nenhuma requisição extra.",
    "playback": "Player integrado, normalização de volume, posições lembradas e a análise offline dos seus arquivos.",
    "notifications": "Notificações do Windows para sets novos na caixa de entrada e downloads concluídos ou com falha – agrupadas numa só mensagem, nunca uma enxurrada. Um clique abre o app no lugar certo.",
    "mediaserver": "Depois dos downloads, pedir ao seu servidor Plex ou Jellyfin para reescanear a biblioteca – agrupado, só na rede local. O token fica no Gerenciador de Credenciais do Windows, nunca no config.yaml."
  },
  "set": {
    "default": "Padrão",
    "range": "Intervalo",
    "browse": "Procurar",
    "not_set": "não definido",
    "saving": "Salvando …",
    "discard": "Descartar",
    "tab_reset": "Redefinir aba",
    "tab_reset_title": "Define todos os campos desta aba para os valores padrão (só vale após “Salvar”)",
    "state_clean": "Tudo salvo",
    "state_dirty": {
      "one": "{n} alteração não salva",
      "other": "{n} alterações não salvas"
    },
    "state_errors": {
      "one": "{n} erro – corrija",
      "other": "{n} erros – corrija"
    },
    "h": {
      "collector": "Coletor de festivais",
      "search": "Busca",
      "duration": "Duração e período",
      "keywords": "Palavras-chave",
      "display": "Exibição",
      "cover": "Capa",
      "chapters": "Capítulos e lista de faixas",
      "tags": "Tags",
      "soundcloud": "SoundCloud",
      "playback": "Reprodução",
      "pauses": "Pausas e largura de banda",
      "limits": "Limites",
      "backoff": "Bloqueio temporário em caso de bloqueio",
      "po": "Provedor de PO-Token",
      "fallback": "Soluções alternativas",
      "in_app": "No app",
      "task": "Agendador de Tarefas do Windows",
      "updates": "Atualizações",
      "app_update": "Atualização do app",
      "release_notes": "Notas de versão",
      "database": "Banco de dados",
      "reset": "Redefinir",
      "detection": "Detecção",
      "series": "Séries",
      "backfill": "Ler tudo (uma vez)",
      "loudness": "Volume",
      "memory": "Memória e forma de onda",
      "analysis": "Análise (offline, ffmpeg)",
      "playlists": "Playlists (M3U8)",
      "notify_events": "Avisar sobre",
      "quiet": "Horário silencioso",
      "ms_paths": "Caminhos e momento"
    },
    "general": {
      "language": {
        "label": "Idioma",
        "help": "Idioma da interface e das mensagens. “Automático” segue o idioma de exibição do Windows (senão, inglês). A tela é refeita logo após salvar."
      },
      "start_view": {
        "label": "Tela inicial",
        "help": "Qual tela abre após iniciar."
      },
      "log_level": {
        "label": "Nível de registro",
        "help": "Quão detalhados são o arquivo de registro e o registro ao vivo. DEBUG só para diagnóstico."
      },
      "confirm_delete": {
        "label": "Confirmar exclusão",
        "help": "Perguntar antes de excluir um mix da biblioteca (entrada + arquivo)."
      }
    },
    "player": {
      "mode": {
        "label": "Reproduzir com",
        "help": "O que o ▶ da biblioteca usa. O player integrado mostra capítulos como marcas de salto e continua tocando ao trocar de tela. A outra opção está disponível por entrada no menu."
      },
      "normalize": {
        "label": "Normalizar volume",
        "help": "Toca cada set com o mesmo volume percebido (ReplayGain da análise offline ou de tags existentes). Nunca distorce: o ganho é limitado pelo true peak medido."
      },
      "target_lufs": {
        "label": "Volume alvo",
        "help": "−18 LUFS é a referência do ReplayGain 2.0. Mais alto (ex.: −14) = mais forte, mas mais sets atingem o limite de pico."
      },
      "resume": {
        "label": "Lembrar posição",
        "help": "Por set, fora dos primeiros e últimos 30 segundos. “Perguntar” oferece continuar, “Automático” continua sem perguntar. A biblioteca mostra os últimos cinco sets inacabados."
      },
      "waveform": {
        "label": "Forma de onda como barra de busca",
        "help": "Mostra o set como forma de onda com as marcas da tracklist. Calculada uma vez por arquivo com ffmpeg (na primeira reprodução ou na análise); senão, a barra simples."
      }
    },
    "search": {
      "results_count": {
        "label": "Resultados por busca",
        "help": "Quantidade de resultados que uma busca obtém (leve). Mais resultados = mais carga sobre o YouTube."
      },
      "append_year": {
        "label": "Acrescentar ano à busca",
        "help": "Com o período de envio “Ano específico”, o ano é acrescentado ao termo de busca (ex.: “hardcore liveset 2013”). Assim o YouTube encontra mais mixes daquele ano."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Duração mínima",
        "help": "Vídeos mais curtos nunca são tratados como mix."
      },
      "max_duration": {
        "label": "Duração máxima",
        "help": "0 = ilimitada."
      },
      "upload_period": {
        "label": "Período de envio",
        "help": "Quais envios são mostrados por padrão. “Ano específico” mostra só mixes de um ano, “Personalizado” um intervalo de/até."
      },
      "upload_year": {
        "label": "Ano",
        "help": "Um mix vale se o ano de envio coincidir ou o ano estiver no título. A busca do YouTube só informa uma data aproximada – ali vale ±1 ano."
      },
      "upload_from": {
        "label": "De",
        "help": "Data de envio mais antiga. Vazio = aberto."
      },
      "upload_to": {
        "label": "Até",
        "help": "Data de envio mais recente. Vazio = aberto. Para datas aproximadas, vale uma tolerância de ±1 ano nas duas pontas."
      },
      "include_keywords": {
        "label": "Palavras-chave a incluir",
        "help": "Pelo menos uma deve aparecer no título. Vazio = permitir tudo. Enter ou vírgula adiciona."
      },
      "exclude_keywords": {
        "label": "Palavras-chave a excluir",
        "help": "Se uma delas aparecer no título, o vídeo é descartado."
      },
      "match_description": {
        "label": "Pesquisar na descrição",
        "help": "Verifica também as palavras-chave na descrição do vídeo. Consultas leves muitas vezes não a fornecem."
      },
      "hide_done_ignored": {
        "label": "Ocultar baixados e ignorados",
        "help": "Oculta nos resultados os vídeos já baixados e ignorados."
      },
      "apply_channel_blacklist": {
        "label": "Aplicar lista negra de canais",
        "help": "Nunca mostrar vídeos de canais bloqueados."
      },
      "hide_cross_platform_duplicates": {
        "label": "Ocultar duplicatas entre plataformas",
        "help": "Oculta resultados provavelmente já baixados ou na fila da outra plataforma (YouTube ou SoundCloud) – mesma duração (±5 s) e título muito parecido. Desativado: aparecem com a observação “Provavelmente já baixado”."
      }
    },
    "blacklist": {
      "label": "Canais bloqueados",
      "help": "Você bloqueia canais pelo menu de um cartão. Aqui é possível desbloqueá-los.",
      "none": "Nenhum canal bloqueado",
      "unblock": "Desbloquear"
    },
    "genres": {
      "add": "Gênero",
      "up": "Prioridade maior",
      "down": "Prioridade menor",
      "delete": "Excluir gênero",
      "color": "Escolher cor",
      "name_ph": "Nome",
      "kw_ph": "+ palavra-chave",
      "fallback": "Reserva – vale quando nenhuma palavra-chave corresponde. Sempre presente, sempre por último."
    },
    "download": {
      "audio_format": {
        "label": "Formato de saída",
        "help": "MP3, ou manter o original do YouTube sem conversão."
      },
      "mp3_quality": {
        "label": "Qualidade do MP3",
        "help": "320 kbps CBR é o mais compatível, V0 VBR economiza um pouco de espaço."
      },
      "embed_cover": {
        "label": "Incorporar capa",
        "help": "Grava a miniatura, recortada em quadrado, no arquivo como capa."
      },
      "write_cover_jpg": {
        "label": "Salvar também cover.jpg",
        "help": "Para servidores de mídia que leem a capa da pasta."
      },
      "write_cue": {
        "label": "Gravar arquivo .cue",
        "help": "Lista de faixas a partir de capítulos ou marcações de tempo na descrição, ao lado do arquivo de áudio."
      },
      "write_id3_chapters": {
        "label": "Gravar capítulos ID3",
        "help": "Incorpora marcas de capítulo (CHAP/CTOC) diretamente no MP3."
      },
      "keep_original_soundcloud": {
        "label": "Manter original do SoundCloud",
        "help": "Salva o áudio do SoundCloud sem alterações (AAC 160 kbps como .m4a, MP3 128 kbps como .mp3) – sem uma segunda conversão com perdas. Desativado: como “Formato de saída”."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Pasta de destino",
        "help": "Raiz do armazenamento de música. Arquivos temporários ficam em “.tmp” dentro dela. Na versão portátil, um caminho relativo como “.\\Music” é resolvido a partir da pasta do app (ex.: em um pendrive)."
      },
      "path_template": {
        "label": "Padrão de caminho",
        "help": "Relativo à pasta de destino, sem extensão de arquivo. “/” separa pastas. {id} deve estar incluído (no SoundCloud “sc-<id>”). {platform} vira “YouTube” ou “SoundCloud” – ex.: como pasta superior para separar as fontes."
      },
      "max_title_length": {
        "label": "Tamanho máx. do título",
        "help": "Títulos mais longos são encurtados no nome do arquivo."
      },
      "max_path_length": {
        "label": "Tamanho máx. do caminho",
        "help": "Caminho completo, incluindo a pasta de destino. Sem configuração extra, o Windows permite 259 caracteres."
      },
      "artist_from_title": {
        "label": "Ler artista do título",
        "help": "Reconhece os padrões “ARTISTA @ EVENTO” e “ARTISTA - TÍTULO”; caso contrário usa o nome do canal."
      },
      "title_cleanup_patterns": {
        "label": "Limpar título",
        "help": "Expressões regulares cujas ocorrências são removidas do título. Enter adiciona.",
        "ph": "+ regex"
      },
      "album_from_edition": {
        "label": "Álbum = edição",
        "help": "Grava a edição (ex.: “Defqon.1 2024”) como tag de álbum, para que Plex e Jellyfin mostrem todos os sets de um festival como um álbum. Desligado: álbum = título, como antes."
      }
    },
    "path_preview": {
      "label": "Pré-visualização",
      "help": "Clique nos marcadores para inseri-los no padrão de caminho.",
      "fest": "{festival}, {event_year} e {stage} só são preenchidos quando há um festival atribuído. Caso contrário, somem junto com separadores restantes e pastas vazias."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pausa entre requisições",
        "help": "Tempo de espera entre consultas de metadados (busca, lista de monitoramento)."
      },
      "sleep_interval": {
        "label": "Pausa de download – mínimo",
        "help": "Após cada download segue uma pausa aleatória entre o mínimo e o máximo."
      },
      "max_sleep_interval": {
        "label": "Pausa de download – máximo",
        "help": "Limite superior da pausa aleatória."
      },
      "limit_rate_mb": {
        "label": "Velocidade de download",
        "help": "Largura de banda máxima. 0 = ilimitada (não recomendado)."
      },
      "max_downloads_per_run": {
        "label": "Máx. de downloads por execução",
        "help": "O restante permanece na fila."
      },
      "max_downloads_per_day": {
        "label": "Máx. de downloads por dia",
        "help": "O contador abrange downloads manuais e automáticos juntos."
      },
      "max_searches_per_hour": {
        "label": "Máx. de buscas por hora",
        "help": "Protege contra buscas contínuas acidentais."
      },
      "backoff_initial_hours": {
        "label": "Bloqueio temporário – valor inicial",
        "help": "Tempo de bloqueio após HTTP 429 ou “confirme que você não é um robô”."
      },
      "backoff_max_hours": {
        "label": "Bloqueio temporário – máximo",
        "help": "O tempo de bloqueio dobra a cada novo bloqueio até este valor."
      }
    },
    "backoff": {
      "none": "Nenhum bloqueio temporário ativo ({p})",
      "none_detail": "Busca, lista de monitoramento e downloads do {p} estão permitidos.",
      "active": "Bloqueio temporário ativo ({p})",
      "active_detail": "até {t} · faltam {rest} · nível {level}",
      "blocked": "O {p} sinalizou um bloqueio. Busca, lista de monitoramento e downloads do {p} ficam bloqueados até o tempo expirar.",
      "clear": "Liberar manualmente",
      "sc_off": "O SoundCloud está desativado",
      "sc_off_detail": "Sem busca no SoundCloud, sem verificações da lista de monitoramento e sem downloads do SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Usar SoundCloud",
        "help": "Desativado: sem busca no SoundCloud, sem verificação de fontes do SoundCloud e sem downloads do SoundCloud. O que já foi baixado permanece na biblioteca."
      },
      "sleep_requests": {
        "label": "Pausa entre requisições",
        "help": "Tempo de espera entre consultas de metadados ao SoundCloud (busca, lista de monitoramento)."
      },
      "sleep_interval": {
        "label": "Pausa de download – mínimo",
        "help": "Após cada download do SoundCloud segue uma pausa aleatória entre o mínimo e o máximo."
      },
      "max_sleep_interval": {
        "label": "Pausa de download – máximo",
        "help": "Limite superior da pausa aleatória."
      },
      "limit_rate_mb": {
        "label": "Velocidade de download",
        "help": "Largura de banda máxima. 0 = ilimitada (não recomendado)."
      },
      "max_downloads_per_run": {
        "label": "Máx. de downloads por execução",
        "help": "Contador separado para o SoundCloud. O restante permanece na fila."
      },
      "max_downloads_per_day": {
        "label": "Máx. de downloads por dia",
        "help": "Contador separado para o SoundCloud, downloads manuais e automáticos juntos."
      },
      "max_searches_per_hour": {
        "label": "Máx. de buscas por hora",
        "help": "Contador separado para o SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Bloqueio temporário – valor inicial",
        "help": "Tempo de bloqueio após o SoundCloud informar excesso de requisições (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Bloqueio temporário – máximo",
        "help": "O tempo de bloqueio dobra a cada novo bloqueio até este valor."
      }
    },
    "ladder": {
      "label": "Níveis",
      "help": "Como o tempo de bloqueio cresce com os valores atuais.",
      "reset": "Redefinido após uma execução bem-sucedida",
      "invalid": "Valores inválidos"
    },
    "network": {
      "po_token_mode": {
        "label": "Modo",
        "help": "Plugin bgutil para o yt-dlp. Script inicia o Deno quando necessário, HTTP mantém um servidor local rodando."
      },
      "po_token_port": {
        "label": "Porta HTTP",
        "help": "Somente no modo HTTP. O servidor escuta em 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Validade do token",
        "help": "Após esse tempo, um novo token é gerado. O valor é arredondado para horas inteiras (no mínimo 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies do navegador",
        "help": "Autentica o yt-dlp com o login do seu navegador. Só ative se não funcionar mais sem isso."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Opcional, ex.: socks5://127.0.0.1:1080. Vazio = conexão direta.",
        "ph": "sem proxy"
      }
    },
    "po": {
      "active": "PO-Token ativo",
      "inactive": "PO-Token inativo",
      "error": "Erro de PO-Token",
      "mode": "Modo",
      "test": "Testar",
      "testing": "Testando …",
      "test_ok": "Teste bem-sucedido.",
      "test_fail": "Teste falhou.",
      "unsaved": "O teste usa as configurações salvas. Salve suas alterações primeiro."
    },
    "cookies": {
      "warn_off": "<b>Recomendado: desativado.</b> PO-Token e cookies do navegador combinados podem causar problemas.",
      "warn_on": "<b>Solução alternativa ativa.</b> PO-Token e cookies do navegador combinados podem causar erros ou bloqueios, e sua conta do YouTube é usada nas requisições. Desative de novo assim que funcionar sem eles. Os cookies nunca vão para o registro."
    },
    "schedule": {
      "in_app_check": {
        "label": "Verificar enquanto o app estiver aberto",
        "help": "A lista de monitoramento é verificada no intervalo configurado enquanto a janela estiver aberta."
      },
      "watchlist_interval_hours": {
        "label": "Intervalo",
        "help": "Tempo entre duas verificações no app."
      },
      "entries_per_source": {
        "label": "Entradas por fonte",
        "help": "Quantas das entradas mais recentes são obtidas (leve) a cada verificação (padrão para novas fontes)."
      },
      "task_scheduler_enabled": {
        "label": "Usar o Agendador de Tarefas",
        "help": "Verifica a lista de monitoramento também com o app fechado (headless). Ativado por “Criar tarefa”."
      },
      "task_time": {
        "label": "Horário",
        "help": "Horário diário de início da tarefa agendada."
      }
    },
    "next": {
      "title": "Próxima verificação",
      "off": "Sem verificação automática",
      "off_detail": "Nem a verificação no app nem a tarefa do Windows estão ativas. A lista de monitoramento só é verificada manualmente.",
      "app_detail": "No app, a cada {h} h – enquanto o HCLoader estiver aberto.",
      "task_detail": "Pelo Agendador de Tarefas do Windows, diariamente às {time} – mesmo com o app fechado.",
      "any_detail": "A mais próxima entre o intervalo do app e a tarefa do Windows.",
      "also_task": "Também: tarefa do Windows diariamente às {time}.",
      "also_app": "Também no app a cada {h} h.",
      "pending": "Ainda não agendado",
      "pending_detail": "O app define a próxima data assim que verificar a lista de monitoramento pela primeira vez.",
      "due": "Pendente – começa em breve",
      "backoff": "<b>Bloqueio temporário ativo.</b> Sem verificações até {t}; depois a data é recuperada ou pulada.",
      "unsaved": "Alterações de agendamento não salvas só valem após salvar."
    },
    "task": {
      "loading": "Consultando tarefa …",
      "registered": "Tarefa registrada",
      "registered_detail": "{name} · diariamente às {time} · próxima execução {next}",
      "none": "Nenhuma tarefa registrada",
      "none_detail": "Cria uma tarefa diária do Windows às {time} (schtasks).",
      "create": "Criar tarefa",
      "remove": "Remover tarefa",
      "moved": "O app foi movido – recrie a tarefa",
      "moved_detail": "A tarefa agendada ainda inicia {cmd}. Recriá-la usa a pasta atual do app.",
      "recreate": "Recriar tarefa",
      "unknown": "Estado da tarefa desconhecido",
      "unknown_detail": "O Agendador de Tarefas do Windows não respondeu. A configuração permanece inalterada.",
      "recheck": "Verificar de novo"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Reduzir efeitos",
        "help": "Desativa linhas de varredura, glitch e todas as animações."
      },
      "scanlines": {
        "label": "Linhas de varredura e ruído",
        "help": "Sobreposição fina sobre toda a interface."
      },
      "pulse_bpm": {
        "label": "Pulso do bumbo",
        "help": "A batida em que a barra de progresso pulsa."
      }
    },
    "pulse_preview": {
      "label": "Pré-visualização",
      "help": "Assim pulsa um download em andamento.",
      "off": "Efeitos reduzidos"
    },
    "versions": {
      "plugin": "Plugin de PO-Token",
      "was": "antes {v}"
    },
    "update": {
      "label": "yt-dlp e plugin",
      "help": "O YouTube muda constantemente. Em caso de erros, atualize primeiro (pip no venv).",
      "button": "Atualizar yt-dlp e plugin",
      "running": "Atualizando …",
      "last_check": "Última verificação",
      "restart": "<b>Reinício necessário.</b> O yt-dlp foi atualizado. Busca e downloads ficam bloqueados até o HCLoader ser reiniciado; a fila é mantida.",
      "restart_title": "Reinício necessário",
      "restart_text": "O yt-dlp foi atualizado. Feche e reinicie o HCLoader – até lá, busca e downloads ficam bloqueados; a fila é mantida.",
      "out_live": "Saída · em execução há {t}",
      "out_done": "Saída · concluído após {t}",
      "out_failed": "Saída · falhou",
      "out_last": "Saída",
      "waiting": "Iniciando o pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Verificar atualizações ao iniciar",
        "help": "yt-dlp e plugin de PO-Token, no máximo uma vez por dia."
      },
      "check_app_updates_on_start": {
        "label": "Verificar atualizações do HCLoader ao iniciar",
        "help": "Consulta o GitHub uma vez por início por uma nova versão. Nada é baixado até você clicar."
      },
      "apply_update_on_exit": {
        "label": "Instalar atualização ao sair",
        "help": "Uma atualização baixada é instalada ao fechar o HCLoader (“Depois”). Desativado: é oferecida de novo na próxima inicialização."
      },
      "update_repo": {
        "label": "Fonte de atualização (GitHub)",
        "help": "Repositório no formato “dono/repo”. Altere apenas para forks."
      }
    },
    "db": {
      "label": "Banco de dados",
      "help": "Estado de todos os vídeos, fontes e execuções. Um backup copia o arquivo para a pasta “backups”.",
      "backup": "Criar backup do BD",
      "backing_up": "Fazendo backup …",
      "open": "Pasta de dados",
      "open_logs": "Pasta de registros",
      "open_title": "Abrir a pasta com banco de dados, configuração e backups",
      "open_logs_title": "Abrir a pasta com os arquivos de registro",
      "info": {
        "one": "{n} entrada · {mb} MB",
        "other": "{n} entradas · {mb} MB"
      },
      "last": "Último backup",
      "never": "nenhum ainda",
      "keep": "Os 10 backups mais recentes são mantidos; os mais antigos são excluídos no próximo backup.",
      "backups": "Backups",
      "backups_more": "+ {n} mais antigos na pasta “backups”",
      "fresh": "novo"
    },
    "reset_all": {
      "label": "Todas as configurações",
      "help": "Redefine todas as abas para os valores padrão. Banco de dados e arquivos de música não são tocados.",
      "button": "Redefinir tudo"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Buscas por hora",
        "help": "“Buscar sets que faltam” distribui as buscas por igual (10 = uma a cada 6 min). O limite global de buscas por hora também vale."
      },
      "collector_results_per_search": {
        "label": "Resultados por busca",
        "help": "Quantos resultados uma busca por um set que falta examina (uma requisição por busca)."
      },
      "collector_auto_confirm": {
        "label": "Confirmar automaticamente a partir de",
        "help": "A partir desta confiança um resultado vale sem a sua confirmação – só com DJ, festival e ano no título. Tudo abaixo disso aguarda um clique."
      },
      "detect": {
        "label": "Detectar automaticamente",
        "help": "Atribui festival ou série, ano, palco e tipo de set a novos resultados e downloads. Valores definidos manualmente nunca são sobrescritos."
      },
      "min_confidence": {
        "label": "Limite de detecção",
        "help": "Confiança a partir da qual uma correspondência é atribuída. Abaixo disso, ela aparece apenas como sugestão que você pode aceitar."
      },
      "year_from_upload_date": {
        "label": "Ano pela data de envio",
        "help": "Se o título não tiver ano, vale o ano de envio (conta como menos seguro)."
      },
      "match_description": {
        "label": "Buscar também na descrição",
        "help": "Procura nomes de festivais também na descrição salva."
      },
      "extra_stages": {
        "label": "Palcos adicionais",
        "help": "Nomes de palco além dos embutidos (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ palco"
      }
    },
    "fest_types": {
      "label": "Termos próprios de tipo de set",
      "help": "Palavras no título que indicam um tipo de set. São verificadas antes dos termos embutidos.",
      "ph": "Termo no título",
      "add": "Termo"
    },
    "fest_test": {
      "label": "Testar um título",
      "help": "Mostra o que a detecção encontra em um título. Nada é salvo; valem as configurações salvas.",
      "ph": "ex.: Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Nada detectado",
      "assigned": "seria atribuído",
      "suggested": "apenas sugestão"
    },
    "fest_status": {
      "title": "{assigned} de {total} mixes atribuídos",
      "last": "Última passagem",
      "help": "Roda offline sobre a biblioteca existente. Valores manuais permanecem; os arquivos não são reetiquetados nem movidos.",
      "button": "Atribuir festivais agora",
      "running": "Atribuindo … {done} / {total}"
    },
    "series": {
      "hint": "Festivais, programas de rádio e podcasts conhecidos. As alterações nesta lista são salvas na hora.",
      "add": "Série",
      "show_hidden": "Mostrar ocultas",
      "reset_all": "Redefinir séries embutidas",
      "builtin": "embutida",
      "own": "própria",
      "modified": "alterada",
      "hidden": "oculta",
      "no_aliases": "sem aliases",
      "enable": "Detectar esta série",
      "hide": "Ocultar",
      "restore": "Restaurar",
      "new_title": "Nova série",
      "edit_title": "Editar série",
      "name": "Nome",
      "kind": "Tipo",
      "default_genre": "Gênero padrão",
      "aliases": "Aliases",
      "aliases_help": "Outras grafias. Uma ocorrência no título basta.",
      "weak_aliases": "Aliases fracos",
      "weak_help": "Palavras comuns que só contam junto com um ano.",
      "variants": "Variantes",
      "variants_help": "Edições próprias, ex.: Australia ou at Home.",
      "channels": "Canais do organizador",
      "channels_help": "Nome, ID ou URL do canal. Apenas aumenta a confiança."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Máx. de itens por fonte",
        "help": "“Ler tudo (uma vez)” na lista de acompanhamento lê no máximo esta quantidade de itens de um canal ou playlist."
      },
      "backfill_requests_per_hour": {
        "label": "Requisições por hora",
        "help": "As requisições de páginas de “Ler tudo” são distribuídas por igual (120 = uma a cada 30 s); o intervalo normal e o backoff também valem. Uma execução agendada (Agendador de Tarefas) continua por no máximo esta quantidade de requisições."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Analisar após cada download",
        "help": "Mede o volume (EBU R128) e calcula a forma de onda logo após um download – offline, com baixa prioridade, um arquivo por vez."
      },
      "write_tags": {
        "label": "Gravar tags ReplayGain",
        "help": "Grava REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) ou R128_TRACK_GAIN (Opus) no arquivo para que outros players também usem. O áudio nunca é recodificado."
      },
      "waveforms": {
        "label": "Pré-calcular formas de onda",
        "help": "Calcula as formas de onda também durante a análise. Desligado: só quando um set é tocado pela primeira vez."
      }
    },
    "analysis": {
      "title": "{done} de {total} arquivos analisados",
      "counts": "{tagged} com tags · {waves} formas de onda · {failed} com falha",
      "help": "Roda offline sobre a biblioteca, um arquivo por vez com baixa prioridade – sem rede, o áudio fica intacto. Pode ser cancelado a qualquer momento.",
      "button": "Analisar arquivos novos",
      "button_n": "Analisar {n} novos",
      "all": "Analisar tudo de novo",
      "all_title": "Medir cada arquivo novamente (ex.: após substituir arquivos fora do app)",
      "running": "Analisando … {done} / {total}",
      "no_ffmpeg_title": "ffmpeg ausente",
      "no_ffmpeg": "Volume e formas de onda precisam do ffmpeg (bin\\ffmpeg.exe, instalado pelo setup.ps1). Configurações › Manutenção mostra o status."
    },
    "playlists": {
      "folder": {
        "label": "Pasta de playlists",
        "help": "Onde as playlists exportadas são salvas. Vazio = «Playlists» dentro da pasta de destino.",
        "ph": "«Playlists» na pasta de destino"
      },
      "relative_paths": {
        "label": "Caminhos relativos",
        "help": "Entradas relativas à playlist, para que continue funcionando se a pasta de música mudar de lugar (ex.: para um pendrive). Arquivos em outra unidade sempre recebem o caminho completo."
      },
      "sync_after_download": {
        "label": "Atualizar playlists salvas após downloads",
        "help": "Playlists exportadas com «Manter atualizada» são regravadas após cada download – só local, sem rede."
      }
    },
    "playlists_saved": {
      "label": "Playlists salvas",
      "help": "Cada exportação fica registrada aqui. «Manter atualizada» a regrava após downloads.",
      "none": "Nenhuma playlist exportada ainda – use «M3U» na biblioteca, numa página de DJ ou numa checklist.",
      "gone": "arquivo ausente",
      "sync": "Manter atualizada",
      "sync_title": "Regravar esta playlist após downloads",
      "forget": "Tirar da lista (o arquivo fica)",
      "now": "Atualizar agora"
    },
    "notifications": {
      "enabled": {
        "label": "Notificações do Windows",
        "help": "Mostrar uma notificação na central de notificações do Windows – também após uma verificação agendada com o app fechado."
      },
      "new_sets": {
        "label": "Sets novos na caixa de entrada",
        "help": "Uma verificação da watchlist (no app ou agendada) encontrou sets novos."
      },
      "downloads_done": {
        "label": "Downloads concluídos",
        "help": "Uma mensagem por rodada de downloads com o número de sets e seus títulos."
      },
      "downloads_failed": {
        "label": "Downloads com falha",
        "help": "Uma mensagem por rodada se um download falhou. Os detalhes ficam em Downloads."
      },
      "quiet_hours": {
        "label": "Horário silencioso",
        "help": "Nenhuma notificação nesse horário. O que aconteceu aparece depois como um único resumo."
      },
      "quiet_from": {
        "label": "De",
        "help": "Início do horário silencioso (24 h)."
      },
      "quiet_to": {
        "label": "Até",
        "help": "Fim do horário silencioso. Antes do início = passa da meia-noite (ex. 22:00–07:00)."
      }
    },
    "notify": {
      "on": "Notificações ativadas",
      "off": "Notificações desativadas",
      "detail": "Exibidas via {backend}. Vários eventos em pouco tempo viram uma só notificação.",
      "backend_powershell": "Windows PowerShell (incluído no Windows)",
      "backend_winrt": "a API de notificações do Windows (pywinrt)",
      "test": "Enviar teste",
      "testing": "Enviando …",
      "test_sent": "Notificação de teste enviada – olhe no canto inferior direito da tela.",
      "unavailable": "Notificações do Windows indisponíveis",
      "unavailable_detail": "Este sistema não consegue exibi-las (Windows PowerShell ausente ou bloqueado). Os eventos só vão para o registro."
    },
    "media_server": {
      "type": {
        "label": "Servidor de mídia",
        "help": "Qual servidor deve reescanear a biblioteca após os downloads. Desativado = o HCLoader não contata nenhum servidor de mídia."
      },
      "url": {
        "label": "Endereço do servidor",
        "help": "Endereço na sua rede local, ex. http://192.168.1.10:32400 (Plex) ou http://nas:8096 (Jellyfin). Só este endereço é contatado.",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "Pasta no servidor",
        "help": "Onde o servidor vê sua pasta de destino (NAS, Docker), ex. /data/music/HCLoader. Vazio = o mesmo caminho daqui. Necessário para escanear só as pastas novas.",
        "ph": "mesmo caminho da pasta de destino"
      },
      "delay_seconds": {
        "label": "Esperar antes de escanear",
        "help": "Após o último download, esperar este tempo – vários downloads viram então uma só varredura."
      },
      "verify_tls": {
        "label": "Verificar certificado",
        "help": "Para endereços https://. Desative só para um certificado autoassinado na sua rede local."
      }
    },
    "ms": {
      "off": "Nenhum servidor de mídia",
      "off_detail": "Escolha Plex ou Jellyfin abaixo para que a biblioteca seja reescaneada após os downloads.",
      "unsaved": "Alterações não salvas – a varredura usa as configurações salvas.",
      "on": "{server} é atualizado após os downloads",
      "last_ok": "Última varredura {t} ({n} arquivos novos)",
      "last_fail": "Última varredura {t} falhou",
      "never": "Nenhuma varredura ainda",
      "all_libraries": "Todas as bibliotecas",
      "no_secret": "Nenhum token / chave de API salvo ainda – digite-o abaixo e teste a conexão.",
      "scan_now": "Escanear agora",
      "scanning": "Solicitando …",
      "scan_sent": "Varredura solicitada – o servidor lê a biblioteca em segundo plano.",
      "secret_plex": {
        "label": "Token do Plex",
        "help": "Seu X-Plex-Token (Plex Web › qualquer item › Obter informações › Ver XML: “X-Plex-Token=” no endereço). Salvo no Gerenciador de Credenciais do Windows após um teste bem-sucedido – nunca no config.yaml nem no registro."
      },
      "secret_jellyfin": {
        "label": "Chave de API do Jellyfin",
        "help": "Painel › Chaves de API › “+”. Salva no Gerenciador de Credenciais do Windows após um teste bem-sucedido – nunca no config.yaml nem no registro."
      },
      "secret_ph": "cole aqui",
      "secret_kept": "salvo – deixe vazio para manter",
      "stored_short": "salvo",
      "stored_title": "Salvo no Gerenciador de Credenciais do Windows",
      "forget": "Remover",
      "forgotten": "Token removido do Gerenciador de Credenciais do Windows",
      "connect": {
        "label": "Conexão",
        "help": "Verifica o endereço e o token e carrega a lista de bibliotecas. Duas solicitações curtas ao seu servidor, nada mais."
      },
      "test": "Testar conexão",
      "testing": "Testando …",
      "test_ok": "Conectado a {name} (versão {v}).",
      "test_libs": "{n} bibliotecas encontradas.",
      "stored": "Token salvo.",
      "library": {
        "label": "Biblioteca",
        "help": "Qual biblioteca escanear. “Todas as bibliotecas” escaneia tudo (mais lento em servidores grandes)."
      },
      "lib_paths": "Pastas no servidor: {p}"
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
        "auto": "Automático (idioma do sistema)"
      }
    },
    "player": {
      "mode": {
        "internal": "Player integrado (recomendado)",
        "external": "Player padrão do Windows"
      },
      "resume": {
        "ask": "Perguntar",
        "auto": "Automático",
        "off": "Desligado"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Original (Opus/M4A, sem conversão)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Não",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    },
    "media_server": {
      "type": {
        "off": "Desativado",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Bloquear canal",
      "text": "Vídeos de “{ch}” não serão mais mostrados. Desfaça em Configurações › Filtros e palavras-chave.",
      "ok": "Bloquear"
    },
    "ignore_all": {
      "title": "Ignorar resultados",
      "text": {
        "one": "Marcar {n} resultado da caixa de entrada como ignorado? Ele não será baixado e deixará de aparecer na caixa de entrada.",
        "other": "Marcar {n} resultados da caixa de entrada como ignorados? Eles não serão baixados e deixarão de aparecer na caixa de entrada."
      },
      "ok": "Ignorar"
    },
    "del_source": {
      "title": "Excluir fonte",
      "text": "Remover “{name}” da lista de monitoramento? Mixes já baixados são mantidos."
    },
    "del_mix": {
      "title": "Excluir mix",
      "text": "“{title}” é removido da biblioteca e o arquivo é excluído do disco:",
      "ok": "Excluir arquivo",
      "warn": "<b>Isto não pode ser desfeito.</b> O arquivo de áudio e um arquivo .cue relacionado são excluídos. O mix é marcado como “ignorado” e <b>não será baixado de novo</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Remover só a entrada",
      "text": "O arquivo de “{title}” está fora da pasta de destino atual e por isso não será excluído:",
      "ok": "Remover só a entrada",
      "warn": "O arquivo permanece intocado onde está. A entrada some da biblioteca, o mix é marcado como “ignorado” e <b>não será baixado de novo</b>."
    },
    "remove_mix": {
      "title": "Remover entrada",
      "text": "O arquivo de “{title}” não foi encontrado no local salvo:",
      "ok": "Remover entrada",
      "warn": "A entrada some da biblioteca. O mix é marcado como “ignorado” e <b>não será baixado de novo</b>. Se o arquivo estiver em outro lugar, ele permanece intocado."
    },
    "backoff": {
      "title": "Liberar bloqueio temporário",
      "ok": "Liberar mesmo assim",
      "text": "O tempo de bloqueio protege você: o {p} sinalizou que chegaram requisições demais.",
      "warn": "<b>Só libere se tiver certeza de que o bloqueio acabou.</b> Se o app acessar de novo cedo demais, o {p} pode restringir seu IP por mais tempo ou permanentemente."
    },
    "reset_all": {
      "title": "Redefinir tudo",
      "text": "Todas as configurações de todas as abas são imediatamente redefinidas para os valores padrão e salvas.",
      "ok": "Redefinir"
    },
    "series_delete": {
      "title": "Excluir série?",
      "text": "“{name}” e suas edições serão excluídas.",
      "warn": {
        "one": "{n} mix perde a atribuição.",
        "other": "{n} mixes perdem a atribuição."
      }
    },
    "series_hide": {
      "title": "Ocultar série?",
      "text": "“{name}” deixa de ser detectada. Você pode trazê-la de volta com “Mostrar ocultas”."
    },
    "series_reset": {
      "title": "Redefinir as séries embutidas?",
      "text": "Todas as séries embutidas voltam ao estado original e as ocultas reaparecem. Suas próprias séries permanecem.",
      "ok": "Redefinir"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mix adicionado à fila",
      "other": "{n} mixes adicionados à fila"
    },
    "enqueued_none": "Nada adicionado – já está na fila ou baixado",
    "enqueued_skipped": "{n} ignorados",
    "queue_cancelled": "Cancelado: {title}",
    "queue_removed": "Removido: {title}",
    "queue_retry": "De volta à fila: {title}",
    "queue_paused": "Fila pausada",
    "queue_resumed": "Fila retomada",
    "new_run": "Nova execução iniciada",
    "ignored": "Ignorado: {title}",
    "unignored": "Visível de novo: {title}",
    "ignored_n": {
      "one": "{n} resultado ignorado",
      "other": "{n} resultados ignorados"
    },
    "opening": "Abrindo {p} no navegador …",
    "watch_added": "Adicionado à lista de monitoramento: {ch}",
    "blocked": "Canal bloqueado: {ch}",
    "genre_set": "Gênero definido: {genre}",
    "done": "Baixado: {title}",
    "failed": "Falhou: {title} – {error}",
    "wl_started": {
      "one": "Verificando lista de monitoramento ({n} fonte, com limitação) …",
      "other": "Verificando lista de monitoramento ({n} fontes, com limitação) …"
    },
    "wl_started_one": "Verificando “{name}” …",
    "wl_none": "Nenhuma fonte ativa – nada a verificar",
    "wl_done": {
      "one": "Fonte verificada: nada de novo",
      "other": "Lista de monitoramento verificada: {n} fontes, nada de novo"
    },
    "wl_done_found": {
      "one": "Lista de monitoramento verificada: {n} novo resultado",
      "other": "Lista de monitoramento verificada: {n} novos resultados"
    },
    "wl_errors": {
      "one": "{n} fonte com erros",
      "other": "{n} fontes com erros"
    },
    "source_added": "Fonte adicionada: {name}",
    "source_saved": "Fonte salva: {name}",
    "source_deleted": "Fonte excluída: {name}",
    "retagged": "Tags reaplicadas: {title}",
    "retagged_moved": "Tags reaplicadas e movido: {title} → {path}",
    "deleted": "Excluído: {title}",
    "removed": "Entrada removida: {title}",
    "folder_opening": "Abrindo pasta …",
    "copied": {
      "one": "{n} linha copiada",
      "other": "{n} linhas copiadas"
    },
    "copy_failed": "Não foi possível copiar",
    "copy_none": "Nenhuma linha visível",
    "settings_saved": "Configurações salvas",
    "settings_errors": {
      "one": "{n} entrada é inválida",
      "other": "{n} entradas são inválidas"
    },
    "backoff_cleared": "Bloqueio temporário ({p}) liberado manualmente",
    "genre_moved": "Gênero: {genre} – movido para {path}",
    "genre_retagged": "Gênero: {genre} – tags atualizadas",
    "genre_entry_only": "Gênero: {genre} – só a entrada foi alterada, o arquivo não está acessível",
    "genre_failed": "Não foi possível definir o gênero: {error}",
    "task_created": "Tarefa criada no Agendador de Tarefas do Windows",
    "task_removed": "Tarefa removida",
    "updated": "Atualizado para yt-dlp {v}",
    "up_to_date": "Já está atualizado (yt-dlp {v})",
    "update_failed": "A atualização falhou",
    "restart_required": "Atualizado – reinicie o HCLoader para que busca e downloads voltem a funcionar",
    "backup_done": "Backup criado: {path}",
    "reset_all": "Todas as configurações redefinidas",
    "festival_entry_only": "“{name}” salvo apenas na entrada – o arquivo está inacessível",
    "series_saved": "Série “{name}” salva",
    "series_deleted": "Série “{name}” excluída",
    "series_hidden": "Série “{name}” ocultada",
    "series_reset": "Séries embutidas restauradas",
    "assign_done": "Festivais atribuídos: {assigned} novos, {suggested} sugestões",
    "assign_cancelled": "Atribuição cancelada: {assigned} novos, {suggested} sugestões",
    "analysis_done": "Volume analisado: {n} arquivos ({failed} com falha)",
    "analysis_cancelled": "Análise cancelada após {n} arquivos"
  },
  "upd": {
    "available": "Versão {v} disponível",
    "available_sub": "Instalada: {cur}",
    "download": "Baixar",
    "notes": "Alterações",
    "later": "Depois",
    "close": "Fechar",
    "cancel": "Cancelar",
    "retry": "Tentar de novo",
    "downloading": "Baixando a atualização {v}",
    "phase_download": "Download",
    "phase_verify": "Verificação",
    "phase_prepare": "Preparação",
    "ready": "Atualização {v} pronta",
    "ready_sub": "Para instalá-la, o HCLoader é fechado por um instante e reiniciado.",
    "restart_now": "Reiniciar agora",
    "on_exit": "Ao sair",
    "applying": "Instalando atualização …",
    "applying_sub": "O HCLoader fecha e reinicia em instantes.",
    "error": "A atualização do app falhou",
    "blocked": "Atualização automática não é possível",
    "notes_title": "Alterações na versão {v}",
    "notes_empty": "Nenhuma nota de versão disponível.",
    "notes_link": "Versão no GitHub",
    "notes_all": "Mostrar todas as alterações",
    "notes_less": "Mostrar só os destaques",
    "confirm_title": "Reiniciar agora?",
    "confirm_ok": "Reiniciar",
    "confirm_text": "O HCLoader é fechado, a atualização instalada e o app reiniciado. Um download em andamento é cancelado e permanece na fila. Música, configurações e banco de dados permanecem inalterados.",
    "on_exit_toast": "A atualização será instalada quando o HCLoader for fechado.",
    "later_toast": "A atualização permanece pronta e será oferecida de novo na próxima inicialização.",
    "section_label": "Versão do HCLoader",
    "section_help": "As novas versões vêm do GitHub. Dados, configurações e música não são tocados pelas atualizações; um backup é criado automaticamente antes de uma migração do banco de dados.",
    "current": "Instalada",
    "latest": "Mais recente",
    "checked": "Última verificação",
    "check_now": "Verificar agora",
    "checking": "Verificando …",
    "st_idle": "Atualizado",
    "st_available": "Nova versão disponível",
    "st_checking": "Verificando …",
    "st_downloading": "Baixando …",
    "st_ready": "Pronta para instalar",
    "st_applying": "Instalando …",
    "st_error": "Erro",
    "st_unknown": "Ainda não verificado",
    "up_to_date": "O HCLoader está atualizado (v{v})",
    "portable": "Versão portátil",
    "installed": "Instalada (setup)",
    "git": "Checkout do Git",
    "from_repo": "de {repo} (não é a fonte oficial)",
    "unverified": "sem checksum (só a integridade do ZIP foi verificada)",
    "rn_label": "Notas de versão",
    "rn_help": "O que mudou em cada versão, a partir das notas incluídas nesta cópia (funciona offline).",
    "rn_older": "Anterior",
    "rn_newer": "Mais recente",
    "rn_pos": "{i} de {n}",
    "rn_installed": "instalada",
    "rn_empty": "Nenhuma nota de versão encontrada.",
    "rn_version": "Versão"
  },
  "err": {
    "generic": "Erro desconhecido",
    "bridge": "Erro em “{name}”: {msg}",
    "boot": "Falha ao iniciar: {msg}",
    "no_backend": "Sem conexão com o backend"
  },
  "fatal": {
    "title": "A conexão com o backend falhou",
    "text": "A interface não recebeu resposta da parte Python do HCLoader. Nada que não seja real é exibido ou salvo.",
    "waiting": "Ainda aguardando o backend …",
    "reload": "Recarregar"
  },
  "fest": {
    "all": "Todas as séries",
    "other": "Outros / sem atribuição",
    "other_hint": "Sem festival",
    "sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "editions": {
      "one": "{n} edição",
      "other": "{n} edições"
    },
    "suggestions": {
      "one": "{n} sugestão",
      "other": "{n} sugestões"
    },
    "all_years": "Todos",
    "no_stage": "Sem palco",
    "kind": {
      "festival": "Festival",
      "radio": "Programa de rádio",
      "podcast": "Podcast"
    },
    "set_type": {
      "live_set": "Set ao vivo",
      "closing_ceremony": "Cerimônia de encerramento",
      "opening": "Abertura",
      "endshow": "Endshow",
      "full_show": "Show completo",
      "warm_up": "Warm-up",
      "anthem": "Hino",
      "episode": "Episódio"
    },
    "change": "alterar festival",
    "change_manual": "definido manualmente, clique para alterar",
    "add": "Definir festival ou série",
    "suggested": "Sugestão incerta: {name}",
    "accept": "Aceitar sugestão",
    "p_title": "Festival / série",
    "p_search": "Buscar série …",
    "p_none": "Sem festival",
    "p_no_match": "Nenhuma série encontrada",
    "p_year": "Ano",
    "p_variant": "Variante",
    "p_stage": "Palco",
    "p_type": "Tipo de set",
    "p_apply": "Aplicar",
    "p_auto": "Voltar ao automático"
  },
  "backfill": {
    "action": "Ler tudo (uma vez)",
    "action_title": "Ler uma vez a lista completa desta fonte, página por página – novos resultados vão para a caixa de entrada",
    "again_title": "Ler tudo de novo – só entram itens ainda desconhecidos",
    "search_title": "Não para buscas salvas – uma busca retorna no máximo 100 resultados",
    "why_open": "A leitura já começou – pause ou cancele abaixo do nome",
    "st_pending": "Aguardando",
    "st_running": "Lendo …",
    "st_paused": "Pausado",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / máx. {cap}",
    "added": "+{n} na caixa de entrada",
    "done_short": "Tudo lido {date}",
    "done_title": "Lido por completo: {date} · {n} itens",
    "note_title": "Última interrupção",
    "pause": "Pausar",
    "resume": "Retomar",
    "cancel": "Cancelar",
    "keep": "Continuar lendo",
    "dlg_title": "Ler tudo de “{name}”?",
    "dlg_text": "Lê uma vez a lista completa desta fonte, página por página – requisições leves e baratas, pelo limitador; nada é baixado. Resultados que passam pelos seus filtros vão para a <b>caixa de entrada</b>, também em fontes com download automático. Vídeos que você já conhece nunca entram duas vezes.",
    "dlg_requests": "requisições",
    "dlg_time": "duração",
    "dlg_entries": "itens",
    "dlg_known": "Conhecido pela última verificação: <b>{n}</b> itens.",
    "dlg_unknown": "Tamanho desconhecido – estimativa cautelosa para o máximo de {cap} itens.",
    "dlg_capped": "Só os primeiros {cap} itens são lidos (Configurações › Agendamento).",
    "dlg_resume": "Continua após {n} itens já lidos; as páginas deles são pedidas de novo primeiro.",
    "dlg_headless": "Grande demais para uma execução agendada ({n} pedidos por hora): se a app for fechada antes do fim, só continua na app.",
    "dlg_pace": "No máximo {n} requisições por hora, distribuídas por igual. Um backoff (HTTP 429 / verificação anti-bot), fechar o app ou um erro só interrompem – continua automaticamente depois. Você pode pausar ou cancelar a qualquer momento.",
    "dlg_ok": "Começar a ler",
    "dlg_ok_resume": "Continuar lendo",
    "dlg_cancel_title": "Cancelar a leitura?",
    "dlg_cancel_text": "A leitura de “{name}” para e o progresso é descartado. Resultados já na caixa de entrada ficam.",
    "toast_started": "Lendo “{name}” por completo – em segundo plano",
    "toast_done": "“{name}” lido por completo – +{n} na caixa de entrada",
    "toast_paused": "“{name}” pausado – continue com “Retomar”",
    "toast_cancelled": "Leitura de “{name}” cancelada"
  },
  "collector": {
    "nav": "Coletor",
    "open_title": "Coletor de festivais: reúna todos os sets de uma edição com uma lista de verificação",
    "title": "Coletor de festivais",
    "sub": "Todos os sets de uma edição de festival – pela programação, com lista de verificação",
    "back_library": "Voltar à biblioteca",
    "back_list": "Todas as listas",
    "collect": "Reunir esta edição",
    "collect_title": "Lista de todos os sets de {name}: encontrar os que faltam e baixá-los",
    "open_checklist": "Lista {n} / {total}",
    "sets": "Sets",
    "lists": "Listas de verificação",
    "card_empty": "Ainda sem sets",
    "new_title": "Nova lista de verificação",
    "new_text": "Escolha um festival e um ano. Os sets vêm da playlist do organizador, de uma programação colada ou de um arquivo incluído.",
    "new_ok": "Abrir lista",
    "f_series": "Festival / série",
    "f_series_ph": "Escolher …",
    "f_series_other": "Programas de rádio e podcasts",
    "err_series": "Escolha um festival ou uma série.",
    "err_year": "Informe o ano da edição.",
    "empty_title": "Ainda não há listas",
    "empty_text": "Uma lista de verificação mostra cada set de uma edição de festival e o que você já tem.",
    "step1": "Escolha acima o festival e o ano.",
    "step2": "Importe a playlist do organizador ou cole a programação.",
    "step3": "Desmarque o que não quiser, procure os sets que faltam e baixe.",
    "delete": "Excluir lista",
    "dlg_delete_title": "Excluir a lista?",
    "dlg_delete_text": "A lista de “{name}” é removida com todas as linhas. Uma busca em andamento para.",
    "dlg_delete_keep": "Arquivos baixados, entradas da biblioteca e resultados salvos permanecem.",
    "toast_deleted": "Lista “{name}” excluída",
    "in_library": "{n} na biblioteca",
    "show_library": "Mostrar na biblioteca ({n})",
    "more": "Mais",
    "st": {
      "found": "Encontrado",
      "queued": "Na fila",
      "downloaded": "Baixado",
      "missing": "Faltando",
      "ignored": "Ignorado"
    },
    "filter_status": "Mostrar apenas: {name}",
    "sources": "Fontes",
    "src_playlist": "Importar playlist do organizador",
    "src_paste": "Colar programação (Beta)",
    "files": "Programações incluídas",
    "src_add": "Adicionar linha",
    "all_stages": "Todos os palcos",
    "all_days": "Todos os dias",
    "no_day": "Sem dia",
    "search": "Filtrar por DJ …",
    "col_dj": "DJ / set",
    "col_when": "Dia / hora",
    "col_status": "Status",
    "col_match": "Vídeo encontrado",
    "source": {
      "playlist": "Playlist",
      "timetable": "Programação",
      "file": "Arquivo de programação",
      "manual": "Adicionado à mão"
    },
    "edited": "Editado à mão – estes valores prevalecem sobre importações posteriores",
    "check_title": "Reunir este set",
    "all_title": "Selecionar tudo / nada (linhas exibidas)",
    "m_none": "Ainda não buscado",
    "m_searched": "Nada encontrado ({date})",
    "confirm": "Confirmar",
    "confirm_title": "Resultado incerto – confirme que é o set certo",
    "reject_title": "Não é este vídeo – nunca mais sugerir para esta linha",
    "reject": "Descartar resultado",
    "candidates": "Outros resultados: {n}",
    "candidates_head": "Usar outro resultado",
    "ignore": "Ignorar este set",
    "unignore": "Deixar de ignorar",
    "delete_row": "Excluir linha",
    "f_artist": "DJ / artista",
    "f_day": "Dia",
    "f_start": "Início",
    "f_end": "Fim",
    "add_ok": "Adicionar",
    "err_artist": "DJ / artista é obrigatório.",
    "none_title": "Nenhuma linha",
    "none_text": "Nenhuma linha corresponde aos filtros atuais.",
    "rows_empty_title": "Esta lista está vazia",
    "rows_empty_text": "Comece pela playlist oficial do organizador – uma única listagem simples costuma cobrir a maioria dos sets. Ou cole a programação como texto.",
    "checked_of": "de {total} marcados",
    "select_all": "Selecionar tudo",
    "select_none": "Nenhum",
    "shown": "{n} de {total} linhas exibidas",
    "to_confirm": "A confirmar: {n}",
    "to_confirm_title": "Resultados incertos aguardam sua confirmação – clique para mostrar só eles",
    "find": "Buscar sets que faltam ({n})",
    "find_again": "Buscar de novo ({n})",
    "find_title": "Busca os sets marcados sem resultado, um a um e com intervalo – mostra antes uma estimativa",
    "find_again_title": "Todos os sets já foram buscados – buscar de novo os que estão sem resultado",
    "find_none": "Nada a buscar – cada set marcado tem um resultado",
    "find_running": "A busca está em andamento",
    "queue": "Baixar marcados ({n})",
    "queue_title": "Adicionar todos os sets marcados e confirmados à fila de downloads",
    "queue_none": "Nada a baixar – nenhum set marcado com resultado confirmado ainda não baixado",
    "job_pending": "Aguardando",
    "job_running": "Buscando …",
    "job_paused": "Pausado",
    "job_hits": "Encontrados: {n}",
    "job_cancel": "Parar",
    "job_resume": "Retomar",
    "imp_running": "Lendo a playlist …",
    "imp_entries": "Entradas: {n}",
    "imp_hint": "listagem simples, página por página",
    "imp_busy": "Uma playlist já está sendo lida",
    "imp_added": "novos: {n}",
    "imp_merged": "mesclados: {n}",
    "imp_matched": "encontrados na biblioteca: {n}",
    "imp_unchecked": "desmarcados (curtos demais / aftermovie): {n}",
    "imp_invalid": "inválidos: {n}",
    "pl_title": "Importar playlist do organizador",
    "pl_text": "A playlist oficial de livesets do organizador é a fonte mais barata: uma listagem simples, nada é baixado. Cada entrada vira uma linha confirmada; DJ, palco e tipo de set vêm do título.",
    "pl_url": "Link da playlist",
    "pl_hint": "Playlist do YouTube ou set do SoundCloud. Entradas curtas demais, aftermovies e trailers entram desmarcados. Linhas de uma programação recebem o vídeo correspondente.",
    "pl_ok": "Importar",
    "pl_err_empty": "Cole o link de uma playlist.",
    "toast_pl_started": "Lendo a playlist – continua em segundo plano",
    "toast_pl_done": "Playlist lida –",
    "toast_pl_cancelled": "Importação da playlist interrompida –",
    "tt_title": "Colar programação – {name} (Beta)",
    "tt_text": "Cole a programação como texto ou CSV. Títulos definem o dia e o palco; cada outra linha é um set. Nada é salvo até você importar.",
    "tt_input": "Programação",
    "tt_preview": "Prévia",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Os sets reconhecidos aparecem aqui.",
    "tt_nothing": "Nenhum set reconhecido ainda.",
    "tt_sum": "Sets: {n}",
    "tt_days": "Dias: {n}",
    "tt_stages": "Palcos: {n}",
    "tt_skipped": "Linhas não entendidas: {n}",
    "tt_more": "… e mais {n}",
    "tt_ok": "Importar ({n})",
    "tt_edit_hint": "Corrija ou remova sets aqui antes de importar. Alterar o texto à esquerda faz uma nova leitura.",
    "toast_tt": "Programação importada –",
    "files_text": "Programações mantidas no repositório do HCLoader e distribuídas com as atualizações. Importar uma cria a lista da respectiva edição.",
    "files_empty_title": "Nenhuma programação incluída ainda",
    "files_empty": "Só são distribuídas programações comprovadamente corretas – esta versão vem sem nenhuma. Cole a programação como texto.",
    "files_how_title": "Contribuir com uma programação",
    "files_how": "Um arquivo JSON por edição com os sets (artista, palco, dia, início, fim) e um link para a programação oficial como fonte. Envie como issue ou pull request no GitHub; o README ao lado dos arquivos descreve o formato.",
    "files_meta": "Sets: {n} · atualizado em {date}",
    "files_source": "fonte oficial",
    "files_import": "Importar",
    "files_broken": "Arquivo inválido: {error}",
    "files_unknown": "Série desconhecida ou oculta aqui",
    "est_title": "Buscar sets que faltam – {name}",
    "est_text": "Busca cada set marcado sem resultado, um a um: <b>DJ + festival + ano</b> como busca simples pelo limitador. Nada é baixado.",
    "est_requests": "buscas",
    "est_left": "livres nesta hora",
    "est_again": "Todos os sets já foram buscados – agora os que estão sem resultado são buscados de novo.",
    "est_offline": "Recém-associados à sua biblioteca, sem custo: {n}.",
    "est_resume": "Continua a busca interrompida.",
    "est_wait": "O limite de buscas desta hora acabou – a primeira busca começa {t}.",
    "est_backoff": "Backoff ativo até {t} – nenhuma busca pode começar antes.",
    "est_pace": "No máximo {n} buscas por hora, distribuídas por igual (cerca de uma a cada {min} min). Resultados incertos aguardam sua confirmação. Um backoff, fechar o app ou um erro apenas interrompem a busca – ela continua automaticamente.",
    "est_ok": "Iniciar busca",
    "est_ok_resume": "Continuar busca",
    "toast_find_started": "Buscando os sets que faltam de “{name}” – continua em segundo plano",
    "toast_find_done": "Busca concluída – {n} de {total} encontrados",
    "toast_find_cancelled": "Busca interrompida – “Buscar sets que faltam” a continua",
    "toast_offline": "Associados à sua biblioteca: {n} – nenhuma busca necessária",
    "toast_confirmed": "“{name}” confirmado",
    "toast_rejected": "Resultado de “{name}” descartado",
    "toast_ignored": "“{name}” ignorado",
    "toast_unignored": "“{name}” volta a ser reunido",
    "toast_row_added": "“{name}” adicionado",
    "toast_row_added_hit": "“{name}” adicionado – encontrado na biblioteca",
    "toast_row_saved": "“{name}” salvo",
    "toast_row_retag": "“{name}” salvo – o arquivo está sendo retagueado",
    "toast_row_deleted": "Linha “{name}” excluída",
    "q_none": "Nada foi adicionado à fila",
    "q_unconfirmed": "não confirmados: {n}",
    "q_missing": "sem resultado: {n}",
    "q_other": "não baixáveis: {n}",
    "q_retag": "retagueados: {n}",
    "export": "Playlist",
    "export_title": "Exportar os sets baixados desta checklist como playlist M3U8"
  },
  "tracks": {
    "nav": "Faixas",
    "open_title": "Quais sets tocam uma faixa? Buscar nas tracklists da biblioteca",
    "title": "Faixas",
    "sub": "Quais sets tocam esta faixa?",
    "back": "Voltar à biblioteca",
    "search": "Artista ou título, ex.: Dragonborn",
    "n_tracks": {
      "one": "{n} faixa",
      "other": "{n} faixas"
    },
    "n_sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "status": "{tracks} em {sets}",
    "status_last": "Lido:",
    "scan": "Ler tracklists",
    "scan_title": "Ler as tracklists de todos os sets (offline: capítulos, descrições, arquivos CUE)",
    "rescan": "Reler tudo",
    "rescan_title": "Ler de novo as tracklists de todos os sets",
    "scan_new": "Ler novos",
    "scan_new_title": "Ler só os sets novos ou alterados desde a última passagem",
    "running": "Lendo tracklists … {done} / {total}",
    "engine_like": "Busca simples: este SQLite não tem índice de texto completo",
    "top_title": "Faixas mais tocadas",
    "top_sub": "em mais sets",
    "top_sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "top_find": "Mostrar os sets com esta faixa",
    "top_empty": "Nenhuma faixa aparece ainda em mais de um set.",
    "results": {
      "one": "{n} set com “{q}”",
      "other": "{n} sets com “{q}”"
    },
    "truncated": "os primeiros {n} – refine a busca",
    "more_hits": {
      "one": "+ {n} resultado",
      "other": "+ {n} resultados"
    },
    "no_results_title": "Nenhum set toca “{q}”",
    "no_results_text": "Tente parte do artista ou do título. Só são encontrados sets com tracklist (capítulos, descrição, arquivo CUE).",
    "empty_title": "Ainda sem tracklists",
    "empty_text": "O HCLoader lê tracklists dos capítulos, descrições e arquivos CUE dos seus sets – offline, sem consultar o YouTube.",
    "empty_none_title": "Nenhum dos seus sets tem tracklist",
    "empty_none_text": "As tracklists vêm de capítulos, descrições com marcação de tempo e arquivos CUE. Sets sem elas não podem ser buscados.",
    "library_empty": "Baixe alguns sets primeiro – as tracklists aparecem aqui.",
    "jump": "Tocar a partir de {time}",
    "jump_external": "Aberto no player padrão – vá até {time} lá",
    "no_time": "Sem marcação de tempo na tracklist",
    "tracklist": "Tracklist",
    "tracklist_title": "Mostrar a tracklist inteira deste set",
    "panel_source": "Fonte: {source}",
    "source_chapters": "capítulos",
    "source_description": "descrição",
    "source_id3": "capítulos ID3",
    "source_cue": "arquivo CUE",
    "source_none": "nenhuma",
    "panel_empty": "Este set não tem tracklist",
    "panel_empty_hint": "Não foram encontrados capítulos, descrição com tracklist nem arquivo CUE.",
    "close": "Fechar",
    "id_track": "Faixa inédita ou não identificada (ID)",
    "play_set": "Tocar o set desde o início",
    "toast_done": "Tracklists lidas: {sets}, {tracks}",
    "toast_cancelled": "Leitura de tracklists cancelada"
  },
  "pl": {
    "title": "Exportar playlist",
    "export": "Exportar",
    "overwrite": "Substituir",
    "exists": "Já existe uma playlist com este nome nesta pasta. «Substituir» a sobrescreve.",
    "nothing": "Nada para exportar – não há sets baixados aqui.",
    "missing": "{n} arquivos ausentes – serão ignorados",
    "name": "Nome do arquivo",
    "folder": "Pasta",
    "browse": "Procurar …",
    "paths": "Caminhos na playlist",
    "relative": "Relativos",
    "absolute": "Absolutos",
    "relative_help": "Relativos à playlist – continua funcionando se você mover toda a pasta de música. Arquivos em outra unidade são gravados com o caminho completo.",
    "absolute_help": "Caminhos completos – a playlist pode ficar em qualquer lugar, mas para de funcionar se a música mudar de lugar.",
    "sync": "Manter atualizada após downloads",
    "sync_help": "Regravada automaticamente após cada download.",
    "sync_off": "Anotado – vale quando «Atualizar playlists salvas após downloads» estiver ligado (Configurações › Armazenamento).",
    "done": "Playlist salva ({sets}): {path}",
    "skipped": "{n} ausentes ignorados",
    "fallback": "{n} em outra unidade com caminho completo",
    "synced": "Playlists atualizadas: {n}",
    "sync_failed": "Playlists não atualizadas: {n} (veja o log)"
  },
  "djs": {
    "nav": "DJs",
    "open_title": "Páginas de DJ: todos os artistas da sua biblioteca, com apelidos e sets b2b",
    "title": "DJs",
    "sub": "Artistas da sua biblioteca",
    "back_library": "Voltar à biblioteca",
    "back": "Todos os DJs",
    "add": "Adicionar DJ / projeto",
    "search": "Buscar DJs ou apelidos",
    "sort": "Ordenar",
    "sort_sets": "Sets",
    "sort_recent": "Recentes",
    "sort_name": "Nome",
    "hidden_chip": "Ocultos: {n}",
    "n_festivals": "Festivais: {n}",
    "n_b2b": "b2b: {n}",
    "aka": "também {names}",
    "unhide": "Mostrar na lista de novo",
    "none_title": "Nenhum DJ encontrado",
    "none_text": "Tente outro nome ou apelido.",
    "empty_title": "Ainda não há DJs",
    "empty_text": "Os DJs são reconhecidos offline pelos títulos dos seus sets, pelas checklists de festival e pelos canais de artistas.",
    "b2b_title": "Tocado junto (b2b) – o set conta para cada artista",
    "b2b_with": "b2b com {names}",
    "aliases": "Apelidos",
    "no_aliases": "Sem apelidos",
    "split_title": "Separar «{alias}» – contar como DJ próprio",
    "play_all": "Tocar tudo",
    "export": "Exportar M3U",
    "export_title": "Exportar playlist: {name}",
    "watch": "Adicionar à lista de monitoramento",
    "discover": "Buscar em Descobrir",
    "stat_sets": "Sets",
    "stat_hours": "Horas",
    "stat_festivals": "Festivais",
    "stat_years": "Anos",
    "stat_b2b": "b2b",
    "other_sets": "Outros sets · {year}",
    "tracks": "Mais tocadas nos sets",
    "track_sets": "{n}×",
    "tracks_none": "Ainda não há tracklists para estes sets – Biblioteca › Faixas as lê offline.",
    "play_all_external": "«Tocar tudo» precisa do player integrado (Configurações › Reprodução).",
    "watch_exists": "Já está na lista de monitoramento: {name}",
    "watch_title": "Acompanhar {name}",
    "watch_ok": "Adicionar à lista de monitoramento",
    "watch_channel": "Novos sets do canal próprio de {name} vão aparecer na sua caixa de entrada:",
    "watch_search": "Nenhum canal próprio conhecido – a lista de monitoramento vai buscar regularmente no YouTube:",
    "watch_note": "Nada é baixado automaticamente. Você pode alterar ou remover a fonte na lista de monitoramento a qualquer momento.",
    "watch_added": "Adicionado à lista de monitoramento: {name}",
    "split_q_title": "Separar apelido",
    "split_q": "Contar os sets creditados como «{alias}» como um DJ separado em vez de {name}?",
    "split_ok": "Separar",
    "split_done": "«{alias}» é de novo um DJ próprio",
    "edit": "Editar nome e apelidos",
    "edit_title": "Editar {name}",
    "add_title": "Adicionar DJ ou projeto",
    "f_name": "Nome",
    "f_aliases": "Apelidos",
    "f_aliases_help": "Outras grafias e nomes curtos (ex.: «HH»). Sets creditados com um apelido contam para este DJ.",
    "f_act_help": "Opcional. Uma dupla com «&» no nome (ex.: «D-Block & S-te-Fan») passa a contar como um só projeto, não como b2b.",
    "f_alias_add": "+ apelido",
    "f_channel": "Canal próprio (opcional)",
    "f_channel_help": "URL do canal do YouTube ou SoundCloud – usada por «Adicionar à lista de monitoramento».",
    "saved": "Salvo",
    "merge": "Mesclar com outro DJ …",
    "merge_title": "Mesclar {name}",
    "merge_text": "Todos os sets e grafias de {name} vão contar para o DJ escolhido. Você pode separar depois.",
    "merge_into": "Mesclar com",
    "merge_ok": "Mesclar",
    "merge_none": "Não há outro DJ para mesclar.",
    "merged": "{name} mesclado",
    "hide": "Não é DJ – ocultar",
    "hidden_done": "Oculto da lista de DJs",
    "unhidden_done": "De volta à lista de DJs",
    "sub_n": {
      "one": "{n} DJ",
      "other": "{n} DJs"
    }
  },
  "stats": {
    "title": "Estatísticas",
    "sub": "Sua biblioteca em números – offline, a partir do banco de dados",
    "range": "Período",
    "p_all": "Tudo",
    "p_12m": "12 meses",
    "p_30d": "30 dias",
    "p_year": "Este ano",
    "p_custom": "Personalizado",
    "from": "De",
    "to": "Até",
    "n_sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "sets_word": {
      "one": "set",
      "other": "sets"
    },
    "k_sets": "Sets",
    "k_hours": "Tempo total",
    "k_size": "No disco",
    "k_avg": "Set médio",
    "of_library": "de {n} na biblioteca",
    "since": "desde {d}",
    "days_nonstop": "{n} dias sem parar",
    "last_dl": "último download {d}",
    "avg_size": "{s} por set",
    "sizes_missing": {
      "one": "{n} arquivo ainda não medido",
      "other": "{n} arquivos ainda não medidos"
    },
    "measuring": "Medindo tamanhos de arquivo … {done} / {total}",
    "h_months": "Downloads por mês",
    "h_years_dl": "Downloads por ano",
    "best_month": "Melhor: {m} ({n})",
    "h_genres": "Por gênero",
    "h_sources": "Fontes",
    "h_festivals": "Principais festivais",
    "editions": {
      "one": "{n} edição",
      "other": "{n} edições"
    },
    "festivals_other": "+ {n} sets de {f} outros festivais",
    "no_festivals": "Nenhum set de festival neste período – Configurações › Festivais e séries os atribui.",
    "h_djs": "Principais DJs",
    "open_dj": "Abrir a página de DJ de {name}",
    "no_djs": "Nenhum DJ reconhecido neste período.",
    "h_years": "Por ano do set",
    "year_unknown": "{n} sem ano conhecido",
    "h_tracks": "Faixas mais tocadas",
    "no_tracks": "Nenhuma faixa aparece ainda em dois sets – as tracklists vêm de capítulos e descrições (Biblioteca › Faixas).",
    "h_watchlist": "Atividade da watchlist",
    "w_checks": "Verificações",
    "w_scheduled": "delas agendadas",
    "w_found": "Encontrados",
    "w_inbox": "Na caixa de entrada",
    "w_library": "Na biblioteca",
    "w_source": "Fonte",
    "w_found_n": "{n} encontrados",
    "w_checks_n": "{n} verificações",
    "w_last": "última verificação {t}",
    "w_none_range": "Nenhuma fonte encontrou algo neste período.",
    "w_no_sources": "Ainda não há fontes na watchlist.",
    "none": "Nada neste período.",
    "range_empty": "Nada foi baixado neste período – escolha um mais longo.",
    "error": "Estatísticas indisponíveis",
    "empty_title": "Ainda não há sets",
    "empty_text": "Assim que os primeiros sets estiverem na sua biblioteca, você verá aqui o que coleciona – gêneros, festivais, DJs, horas.",
    "empty_go": "Descobrir sets"
  }
});
