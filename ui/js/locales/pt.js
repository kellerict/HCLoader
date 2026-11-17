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
    "settings": "Configurações"
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
    "clock": "h"
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
    "group": "Por gênero",
    "group_title": "Agrupar entradas por gênero",
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
    "none_text": "Nenhuma entrada corresponde à busca e aos filtros."
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
    "external": "Abrindo no player padrão …"
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
    "maintenance": "Manutenção"
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
    "maintenance": "Versões, atualizações, banco de dados."
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
      "database": "Banco de dados",
      "reset": "Redefinir"
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
      }
    },
    "path_preview": {
      "label": "Pré-visualização",
      "help": "Clique nos marcadores para inseri-los no padrão de caminho."
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
    "reset_all": "Todas as configurações redefinidas"
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
    "unverified": "sem checksum (só a integridade do ZIP foi verificada)"
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
  }
});
