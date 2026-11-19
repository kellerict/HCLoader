/* HCLoader UI texts – Chinese, Simplified.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "zh-CN", "name": "简体中文", "dir": "ltr", "intl": "zh-CN"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "HARD MUSIC ARCHIVE",
    "mock": "模拟模式"
  },
  "nav": {
    "discover": "发现",
    "inbox": "收件箱",
    "watchlist": "关注列表",
    "downloads": "下载",
    "library": "媒体库",
    "log": "日志",
    "settings": "设置",
    "stats": "统计"
  },
  "navfoot": {
    "today": "今日",
    "next": "下次检查"
  },
  "common": {
    "ok": "确定",
    "cancel": "取消",
    "save": "保存",
    "delete": "删除",
    "edit": "编辑",
    "remove": "移除",
    "reset": "重置",
    "on": "开",
    "off": "关",
    "current": "当前",
    "loading": "加载中…",
    "add_chip": "+ 添加",
    "empty": "“空”",
    "empty_list": "“无”"
  },
  "fmt": {
    "today": "今天",
    "yesterday": "昨天",
    "never": "从未",
    "no_date": "日期未知",
    "just_now": "刚刚",
    "today_at": "今天 {t}",
    "tomorrow_at": "明天 {t}",
    "yesterday_at": "昨天 {t}",
    "views": {
      "other": "{v} 次观看"
    }
  },
  "unit": {
    "s": "秒",
    "h": "小时",
    "minutes": "分钟",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "个字符",
    "results": "条结果",
    "entries": "条",
    "clock": "点",
    "req_h": "次/时",
    "lufs": "LUFS",
    "db": "dB",
    "pct": "%"
  },
  "range": {
    "ge_sleep": "≥ 最小值",
    "ge_initial": "≥ 初始值"
  },
  "status": {
    "new": "新",
    "inbox": "在收件箱",
    "queued": "排队中",
    "downloading": "下载中",
    "done": "已下载",
    "ignored": "已忽略",
    "failed": "错误"
  },
  "period": {
    "all": "全部",
    "7d": "最近 7 天",
    "30d": "最近 30 天",
    "1y": "最近 12 个月",
    "year": "指定年份",
    "custom": "自定义"
  },
  "source_type": {
    "channel": "频道",
    "playlist": "播放列表",
    "search": "搜索"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "平台",
    "sc_off": "SoundCloud 已关闭 – 请在 设置 › SoundCloud 中开启。",
    "mixcloud": "Mixcloud",
    "hearthis": "hearthis.at",
    "p_off": "{p} 已关闭 – 可在 设置 › 更多来源 中开启。"
  },
  "genre": {
    "change": "更改流派",
    "manual": "流派为手动设置",
    "change_manual": "更改流派（手动设置）"
  },
  "run_kind": {
    "watchlist": "关注列表",
    "headless": "任务计划程序",
    "manual": "手动"
  },
  "phase": {
    "waiting": "等待中",
    "sleep": "下次下载前暂停",
    "download": "下载中",
    "convert": "转换中",
    "tag": "写入标签",
    "failed": "失败"
  },
  "po_mode": {
    "off": "关闭",
    "script": "脚本",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "关闭",
    "script": "脚本（Deno）",
    "http": "HTTP 服务器（本地）"
  },
  "statusbar": {
    "ok": "正常",
    "missing": "缺失",
    "po": "PO-Token",
    "po_active": "已启用（{mode}）",
    "po_inactive": "未启用",
    "po_error": "错误",
    "backoff": "退避",
    "backoff_none": "无",
    "backoff_until": "至 {t} · 剩余 {rest}",
    "queue": "队列",
    "queue_empty": "空",
    "queue_active": "运行中",
    "queue_paused": "已暂停",
    "today": "今日",
    "next": "下次检查",
    "next_off": "关闭",
    "backoff_until_short": "至 {t}",
    "sc_backoff": "退避至 {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · 今日已下载 {day}/{day_max} · 本小时已搜索 {s}/{s_max} 次",
    "sc_tip": "SoundCloud · 今日已下载 {day}/{day_max} · 本小时已搜索 {s}/{s_max} 次",
    "backoff_tip": "{p}：退避至 {t}（剩余 {rest}）",
    "p_tip": "{p} · 今日已下载 {day}/{day_max} · 本小时已搜索 {s}/{s_max} 次"
  },
  "schedule": {
    "due": "已到期",
    "kind_app": "应用",
    "kind_task": "任务",
    "tip_app": "应用内下次关注列表检查：{t}（HCLoader 运行期间）。",
    "tip_task": "通过 Windows 任务计划程序的下次关注列表检查：{t}。",
    "tip_any": "下次关注列表检查：{t}。",
    "tip_off": "无自动检查 – 应用内和 Windows 任务计划程序均未启用。",
    "tip_backoff": "退避期间不进行检查。"
  },
  "card": {
    "source": "来自关注列表来源“{name}”",
    "select": "仅限订阅者（Select）",
    "open": "在 {p} 上打开",
    "ignore": "忽略",
    "unignore": "取消忽略",
    "more": "更多操作",
    "download": "下载",
    "watch": "将频道加入关注列表",
    "block": "屏蔽频道",
    "set_genre": "设置流派",
    "date_approx": "日期为大致值 – YouTube 搜索只返回“X 年前”",
    "date_unknown": "未提供上传日期",
    "duplicate": "可能已下载（{p}）",
    "duplicate_title": "与 {p} 的“{title}”标题非常相似且时长相同 – 已在那边下载或排队。仍可继续下载。",
    "preview": "仅试听（Go+）– 无法下载",
    "preview_title": "SoundCloud 只为此曲目提供 30 秒试听（Go+），无法下载。",
    "select_title": "此 Mixcloud 上传仅对创作者的订阅者开放（Mixcloud Select），无法下载。"
  },
  "discover": {
    "placeholder": "搜索 mix、live set、DJ、活动…",
    "search": "搜索",
    "searching_btn": "搜索中…",
    "searching": "搜索中 – 轻量查询，减轻 YouTube 负担…",
    "sort": "排序",
    "sort_rel": "相关度",
    "sort_date": "最新优先",
    "sort_dur": "最长优先",
    "sort_views": "观看最多",
    "quota": "本小时搜索次数：{n} / {max}",
    "quota_sc": "本小时 SoundCloud 搜索次数：{n} / {max}",
    "placeholder_sc": "搜索 SoundCloud：mix、set、DJ、播客…",
    "platform_title": "搜索位置",
    "searching_sc": "搜索中 – 轻量查询，减轻 SoundCloud 负担…",
    "ready_text_sc": "输入搜索词并按 Enter 搜索 SoundCloud。",
    "previews": "{n} 条仅试听（Go+）",
    "previews_title": "Go+ 试听内容无法下载。关闭“隐藏已下载和已忽略”时可见。",
    "filters": "筛选",
    "toggle_filters": "显示/隐藏筛选面板",
    "f_duration": "时长（分钟）",
    "f_min": "最小",
    "f_max": "最大（留空 = 不限）",
    "f_max_ph": "最大",
    "f_period": "上传时间段",
    "f_year": "年份",
    "f_year_prev": "前一年",
    "f_year_next": "后一年",
    "f_from": "从",
    "f_to": "到",
    "f_hint_year": "YouTube 搜索只返回大致日期（“13 年前”）。因此 ±1 年都算 – 标题含“{year}”的 mix 也算。",
    "f_hint_custom": "YouTube 搜索只返回大致日期。对于大致日期，两端均允许 ±1 年的误差。",
    "chip_title": "单击：显示/隐藏流派 · 双击：仅此流派（其关键词会附加到搜索中）",
    "scope": "搜索已扩展为",
    "scope_title": "下次搜索会把这些词附加到你的搜索文本。",
    "searched": "搜索条件",
    "stale": "筛选已更改，自",
    "re_search": "重新搜索",
    "re_search_title": "结果来自上一次搜索。重新搜索，使流派和年份包含在搜索词中（计为一次搜索）。",
    "need_query": "请先输入搜索词。",
    "f_inc": "包含关键词",
    "f_exc": "排除关键词",
    "f_show": "显示",
    "f_hide": "隐藏已下载和已忽略",
    "f_blacklist": "应用频道黑名单",
    "count": {
      "other": "{n} 条结果 · 已过滤 {hidden} 条"
    },
    "selected": "已选 {n} 项",
    "select_all": "全选",
    "download_sel": "下载所选",
    "ready_title": "就绪",
    "ready_text": "输入搜索词并按 Enter。",
    "none_title": "未找到内容",
    "none_text": "请放宽筛选条件或换其他搜索词。",
    "none_year": "没有 {year} 年的结果。请重新搜索，使年份包含在搜索词中 – 或更改年份。",
    "quota_p": "本小时 {p} 搜索次数：{n} / {max}",
    "placeholder_p": "搜索 {p}：mix、set、DJ、播客…",
    "searching_p": "搜索中 – 轻量查询，减轻 {p} 负担…",
    "ready_text_p": "输入搜索词并按 Enter 搜索 {p}。",
    "previews_mc": "{n} 个仅限订阅者（Select）",
    "previews_mc_title": "Mixcloud Select 上传仅供付费订阅者，永远无法下载。关闭“隐藏已下载和已忽略”时可见。"
  },
  "inbox": {
    "title": "收件箱",
    "sub": "通过全部筛选的关注列表新发现",
    "sub_n": {
      "other": "{n} 条通过全部筛选的关注列表新发现"
    },
    "ignore_all": "全部忽略",
    "download_all": "全部下载",
    "ignore_sel": "忽略所选",
    "download_sel": "下载所选",
    "select_all": "全选",
    "select_none": "清除选择",
    "src_all": "全部来源",
    "src_none": "无来源",
    "src_title": "仅显示此来源的发现",
    "count": {
      "other": "{n} 条"
    },
    "count_of": "{n} / {total} 条",
    "selected": "已选 {n} 项",
    "empty_title": "收件箱为空",
    "empty_text": "关注列表尚未发现新 mix。",
    "empty_nosrc": "关注列表中还没有来源 – 添加频道、播放列表或搜索后，新 mix 会出现在这里。",
    "empty_next": "下次检查：{t}。",
    "to_watchlist": "前往关注列表"
  },
  "watchlist": {
    "title": "关注列表",
    "sub_n": {
      "other": "{n} 个来源 · {active} 个启用"
    },
    "sub_next": "下次检查 {t}",
    "add": "来源",
    "check_all": "立即检查全部",
    "check": "检查",
    "checking": "检查中…",
    "queued": "等待中…",
    "running": "检查中…",
    "running_n": "检查中 {i} / {n}…",
    "col_active": "启用",
    "col_name": "名称",
    "col_type": "类型",
    "col_genre": "流派",
    "col_auto": "新发现",
    "col_max": "最大",
    "col_last": "上次检查",
    "col_new": "新",
    "genre_auto": "自动",
    "genre_auto_long": "自动（按关键词）",
    "auto_on": "下载",
    "auto_off": "收件箱",
    "auto_title_on": "新发现会自动下载",
    "auto_title_off": "新发现只进入收件箱",
    "new_title": "在收件箱中显示",
    "check_title": "立即检查此来源",
    "why_off": "来源未启用",
    "why_running": "检查已在进行",
    "why_backoff": "退避中 – 检查被阻止",
    "why_backoff_p": "退避（{p}）中 – 检查被阻止",
    "why_sc_off": "SoundCloud 已关闭",
    "error_title": "上次检查失败",
    "backoff": "<b>退避中，至 {t}</b>（剩余 {rest}）。无法检查关注列表 – 计划检查也已暂停。",
    "backoff_p": "<b>退避（{p}）中，至 {t}</b>（剩余 {rest}）。在此之前会跳过 {p} 来源 – {other} 继续运行。",
    "backoff_link_sc": "打开 SoundCloud",
    "backoff_link": "打开限速设置",
    "none_active": "没有可检查的启用来源",
    "empty_title": "没有来源",
    "empty_text": "添加频道、播放列表或已保存的搜索。",
    "add_title": "添加来源",
    "edit_title": "编辑来源",
    "f_type": "类型",
    "f_name": "名称",
    "f_url": "URL",
    "f_query": "搜索词",
    "f_genre": "默认流派",
    "f_max": "最大条数",
    "f_newest_last": "最新的在末尾（倒序读取播放列表）",
    "hint_newest_last": "许多播放列表中 YouTube 会把新视频加在末尾。将读取整个播放列表（约每 100 个视频 1 次请求，最多 2000 条）。",
    "rev_title": "最新的在末尾 – 从末尾开始读取播放列表",
    "rev_short": "倒序",
    "f_enabled": "启用 – 纳入“全部检查”和计划",
    "f_hits": "新发现",
    "hits_inbox": "进入收件箱",
    "hits_auto": "自动下载",
    "hint_inbox": "发现的内容会留在收件箱，等你下载或忽略。",
    "hint_auto": "通过全部筛选的发现会直接进入队列。",
    "hint_channel": "YouTube 频道（…/@名称 或 …/channel/UC…，可加 /videos 或 /streams）、SoundCloud 主页（soundcloud.com/名称）、Mixcloud 用户（mixcloud.com/名称）或 hearthis.at 用户（hearthis.at/名称）。",
    "hint_playlist": "带“list=…”的 YouTube 播放列表、SoundCloud 合集（soundcloud.com/名称/sets/合集）、Mixcloud 播放列表（mixcloud.com/名称/playlists/列表）或 hearthis.at 合集（hearthis.at/名称/set/合集）。检查最新的条目。",
    "f_platform": "搜索平台",
    "detected": "已识别：{p} · {type}",
    "not_detected": "无法识别 URL",
    "suggested": "建议",
    "suggested_title": "根据 URL 生成的建议。若不修改，首次检查时会替换为真实名称 – 也可直接覆盖。",
    "hint_name_auto": "根据 URL 生成的建议 – 可随意修改。若不修改，首次检查会设置真实名称。",
    "hint_name_later": "名称由首次检查设置 – 也可在此自行输入。",
    "name_auto_title": "临时名称 – 下次检查会设置真实名称",
    "hint_search": "已保存的搜索，与“发现”中相同 – 每次检查计为一次搜索。",
    "hint_max": "每次检查",
    "max_default": "（默认）",
    "max_default_title": "无单独值：使用 设置 › 计划 中的“每个来源的条数”",
    "max_title": "留空 = 使用 设置 › 计划 中的默认值。最多 200，搜索来源最多 100。",
    "ph_name": "例如 Gabber Vault",
    "ph_name_later": "由首次检查设置",
    "ph_channel": "https://www.youtube.com/@channel  或  https://soundcloud.com/name",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  或  https://soundcloud.com/name/sets/…",
    "ph_search": "例如 frenchcore liveset",
    "form_error": "无法保存来源。",
    "backoff_link_p": "打开 {p}",
    "why_p_off": "{p} 已关闭"
  },
  "downloads": {
    "title": "下载",
    "sub": "按顺序逐个下载",
    "pause": "暂停",
    "resume": "继续",
    "cancel": "取消",
    "retry": "重试",
    "remove": "移除",
    "up": "上移",
    "down": "下移",
    "eta": "剩余时间",
    "position": "第 {n} 位",
    "sleep_left": "还需",
    "sleep_why": "限速：两次下载之间随机暂停 {min}–{max} 秒",
    "next_up": "下一个",
    "sleeping": "暂停中",
    "sleep_range": "共 {min}–{max} 秒",
    "blocked_wait": "等待中 – {why}",
    "why_backoff": "退避",
    "why_day": "每日上限",
    "why_run": "单次上限",
    "why_paused": "已暂停",
    "why_restart": "需要重启",
    "why_busy": "另一次运行进行中",
    "why_pot": "PO-Token 服务器未就绪",
    "why_target": "目标文件夹无法访问",
    "why_error": "缺少下载模块",
    "summary": "今日 {day}/{day_max} · 本次 {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} 继续下载。",
    "steps": "下载 · 转换 · 标签",
    "unlimited": "不限",
    "l_run": "本次运行",
    "l_day": "今日",
    "l_rate": "速率限制",
    "l_sleep": "下载间隔",
    "sec_queue": "队列",
    "sec_failed": "失败",
    "empty_title": "队列为空",
    "empty_text": "在“发现”或“收件箱”中选择 mix。",
    "paused": "<b>队列已暂停。</b>当前下载已停止，直到你点击继续。",
    "backoff": "<b>退避中，至 {t}</b>（剩余 {rest}）。下载、搜索和关注列表均被阻止。",
    "backoff_rest": {
      "other": "<b>退避中，至 {t}</b>（剩余 {rest}）。下载、搜索和关注列表均被阻止 – 队列中保留 {n} 项。"
    },
    "limit_day": "<b>已达每日上限（{n}/{max}）。</b>其余内容留在队列中，明天继续。",
    "limit_day_rest": {
      "other": "<b>已达每日上限（{n}/{max}）。</b>其余 {rest} 项留在队列中，明天继续。"
    },
    "limit_run": "<b>已达上限 – 本次运行 {max}/{max}。</b>其余内容留在队列中，下次运行时继续。",
    "limit_run_rest": {
      "other": "<b>已达上限 – 本次运行 {max}/{max}。</b>其余 {rest} 项留在队列中，下次运行时继续。"
    },
    "limits_link": "更改上限",
    "new_run": "开始新一轮运行",
    "need_restart": "<b>需要重启。</b>yt-dlp 已更新 – 请重启 HCLoader。队列会保留。",
    "busy": "另一次下载运行正在进行（例如计划检查）。队列将等待其完成。",
    "local_pot": {
      "other": "<b>PO-Token 服务器未就绪。</b>其余 {rest} 项留在队列中，服务器运行后即继续。"
    },
    "local_target": {
      "other": "<b>目标文件夹无法访问或不可写。</b>其余 {rest} 项留在队列中，恢复可用后即继续。"
    },
    "local_error": {
      "other": "<b>无法加载下载模块（yt-dlp）。</b>其余 {rest} 项留在队列中。点击“继续”、添加新条目或保存设置后会再次尝试。"
    },
    "local_link_pot": "网络设置",
    "local_link_target": "更改存储位置",
    "local_link_error": "维护",
    "summary_p": "{p} {day}/{day_max}"
  },
  "library": {
    "title": "媒体库",
    "sub": {
      "other": "{n} 个 mix"
    },
    "sub_shown": "显示 {n} / {total}",
    "search": "标题、频道或路径…",
    "all_genres": "全部流派",
    "all_channels": "全部频道",
    "all_years": "全部年份",
    "f_genre": "流派",
    "f_channel": "频道",
    "f_year": "年份",
    "f_sort": "排序",
    "sort_newest": "最新优先",
    "sort_title": "标题 A–Z",
    "sort_channel": "频道 A–Z",
    "sort_duration": "最长优先",
    "view_list": "列表",
    "view_grid": "平铺",
    "clear": "重置筛选",
    "col_title": "标题",
    "col_channel": "频道",
    "col_genre": "流派",
    "col_year": "年份",
    "col_duration": "时长",
    "col_size": "大小",
    "col_loaded": "下载时间",
    "play": "播放",
    "pause": "暂停",
    "play_external": "用默认播放器打开",
    "play_internal": "用应用内播放器播放",
    "play_missing": "文件缺失 – 无法播放",
    "more": "再显示 {n} 项",
    "now_playing": "正在播放",
    "retag_short": "重写标签",
    "genre_working": "正在设置流派…",
    "open_folder": "打开文件夹",
    "retag": "重写标签（按当前设置更新标签、封面和位置）",
    "delete": "删除文件",
    "remove": "移除条目",
    "retagging": "正在重写标签…",
    "cue_title": "曲目列表，.cue 文件位于 MP3 旁",
    "missing": "文件缺失",
    "missing_title": "在记录的位置找不到该文件（已移动或删除？）",
    "missing_chip": {
      "other": "{n} 项缺失"
    },
    "missing_chip_title": "仅显示文件缺失的条目",
    "stat_count": "Mix",
    "stat_duration": "总时长",
    "stat_size": "大小",
    "stat_genres": "按流派",
    "unit_h": "小时",
    "unit_min": "分钟",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "other": "{n} 个 mix · {dur}"
    },
    "empty_title": "尚未下载任何内容",
    "empty_text": "每个 mix 在下载并写入标签后都会出现在这里 – 包含封面、流派和位置。",
    "empty_discover": "发现 mix",
    "empty_watchlist": "设置关注列表",
    "target_down": "目标文件夹无法访问：{path}",
    "target_down_hint": "请检查驱动器或网络共享。在其缺失期间，文件状态未知：“重写标签”和“移除条目”不可用。",
    "unknown_title": "目标文件夹无法访问 – 文件状态未知",
    "none_title": "无结果",
    "none_text": "没有符合搜索和筛选条件的条目。",
    "group_by": "分组方式",
    "group_none": "无",
    "group_genre": "流派",
    "group_festival": "音乐节",
    "group_artist": "艺人",
    "group_year": "年份",
    "group_unknown": "未知",
    "continue": "继续收听",
    "continue_title": "从 {t} 继续「{title}」",
    "continue_left": "剩余 {t}",
    "continue_forget": "从「继续收听」中移除",
    "export": "M3U",
    "export_title": "将当前显示内容导出为 M3U8 播放列表",
    "export_continue": "将“继续收听”导出为播放列表"
  },
  "player": {
    "label": "迷你播放器",
    "play": "播放（空格）",
    "pause": "暂停（空格）",
    "back": "后退 30 秒",
    "fwd": "前进 30 秒",
    "prev": "上一曲目",
    "next": "下一曲目",
    "seek": "位置",
    "mute": "静音",
    "unmute": "取消静音",
    "volume": "音量",
    "close": "关闭播放器",
    "tracks": "曲目列表",
    "tracks_n": {
      "other": "{n} 首曲目"
    },
    "tracks_toggle": "显示/隐藏曲目列表",
    "no_tracks": "此文件没有章节",
    "total": "总时长 {t}",
    "keys": "空格：播放/暂停 · ←/→：10 秒",
    "err_load": "无法播放",
    "err_src": "无法播放：文件地址无效",
    "err_play": "无法播放该文件：{title}",
    "external": "正在用默认播放器打开…",
    "norm_title": "响度已均衡：{lufs} LUFS → 目标 {target} LUFS（{gain}）",
    "norm_capped": "仅降低 —— 提升需要音频引擎",
    "norm_fallback": "响度均衡：音频引擎在此无声 —— 改为不使用它播放（只降低音量，不提升）",
    "resume_q": "要从上次停下的地方继续吗？",
    "resume_at": "于 {t}",
    "resume": "继续",
    "restart": "从头开始",
    "resumed_at": "已从 {t} 继续",
    "sleep": "睡眠定时器",
    "sleep_min": "{n} 分钟",
    "sleep_end": "本场结束时",
    "sleep_end_short": "结束",
    "sleep_off": "关闭",
    "sleep_on": "睡眠定时器：{t} 后停止",
    "sleep_end_on": "睡眠定时器：本场结束时停止",
    "sleep_done": "睡眠定时器：已停止播放",
    "queue_pos": "{i}/{n}",
    "queue_title": "全部播放 · {label}：第 {i}/{n} 个 Set"
  },
  "log": {
    "title": "日志",
    "sub": "实时日志和运行历史",
    "live": "实时日志",
    "history": "运行历史",
    "lvl_debug": "调试",
    "lvl_info": "信息",
    "lvl_warn": "警告",
    "lvl_error": "错误",
    "lvl_title": "显示/隐藏“{lvl}”级别",
    "search": "搜索日志…",
    "following": "实时",
    "paused": "已暂停",
    "follow_title": "自动滚动到最新一行（向上滚动时暂停）",
    "jump": "跳到末尾",
    "jump_new": {
      "other": "{n} 行新内容"
    },
    "copy": "复制",
    "copy_title": "将可见行复制到剪贴板",
    "open_logs": "日志文件夹",
    "open_logs_title": "打开存放完整日志文件的文件夹",
    "lines": {
      "other": "{n} 行"
    },
    "lines_of": "{n} / {total} 行",
    "empty": "这些级别下没有内容。",
    "empty_search": "没有包含“{q}”的行。",
    "no_runs": "还没有运行记录。",
    "no_runs_kind": "没有此类运行记录。",
    "found": "发现",
    "downloaded": "已下载",
    "errors": "错误",
    "running": "运行中…",
    "kind_all": "全部",
    "timeline": "时间线",
    "table": "表格",
    "view_title": "运行历史显示方式",
    "col_kind": "类型",
    "col_start": "开始",
    "col_duration": "时长",
    "col_found": "发现",
    "col_downloaded": "已下载",
    "col_errors": "错误",
    "col_note": "备注",
    "backoff": "退避",
    "runs_sum": {
      "other": "{n} 次运行 · 已下载 {dl} · 错误 {err}"
    },
    "today": "今天",
    "yesterday": "昨天"
  },
  "settings": {
    "title": "设置",
    "sub": "应用的所有行为都可在此配置"
  },
  "tabs": {
    "general": "常规",
    "filters": "筛选与关键词",
    "genres": "流派",
    "download": "下载与音质",
    "storage": "存储与标签",
    "throttle": "限速",
    "soundcloud": "SoundCloud",
    "network": "网络与 PO-Token",
    "schedule": "计划",
    "appearance": "外观",
    "maintenance": "维护",
    "festivals": "音乐节与系列",
    "playback": "播放",
    "notifications": "通知",
    "mediaserver": "媒体服务器",
    "sources": "更多来源",
    "reupload": "重复上传"
  },
  "tabs_hint": {
    "general": "应用的基本行为。",
    "filters": "搜索和关注列表的默认筛选。可在“发现”的筛选面板中临时覆盖。",
    "genres": "顺序即优先级。标题中最先出现其关键词的流派胜出。手动设置的流派和来源的默认流派优先。",
    "download": "YouTube 通常提供约 130–160 kbps 的 Opus。MP3 是转换结果，音质不会比源文件更好 – 但到处都能播放。",
    "storage": "文件存放位置及命名方式。该结构适用于 Plex、Jellyfin 等媒体服务器。",
    "throttle": "限制对 YouTube 的负载。这些值同时适用于搜索、关注列表和下载。SoundCloud 在“SoundCloud”标签页中有自己的值。 Mixcloud 和 hearthis.at 的设置在“更多来源”中。",
    "soundcloud": "将 SoundCloud 作为搜索、关注列表和下载的第二来源 – 拥有独立的限制、计数器和退避，与 YouTube 互不影响。",
    "network": "PO-Token 可将请求标识为真实浏览器，降低被机器人拦截的风险。",
    "schedule": "关注列表何时自动检查 – 在应用内以及通过 Windows 任务计划程序。",
    "appearance": "外观与体验。更改会即时预览，保存后才会永久生效。",
    "maintenance": "版本、更新、数据库。",
    "festivals": "根据已保存的标题识别音乐节或系列、年份、舞台和 set 类型——离线进行，不产生任何额外请求。",
    "playback": "内置播放器、响度均衡、记住的位置以及文件的离线分析。",
    "notifications": "收件箱有新混音、下载完成或失败时显示 Windows 通知 – 合并为一条消息，绝不刷屏。点击即可打开应用的对应页面。",
    "mediaserver": "下载后请求你的 Plex 或 Jellyfin 服务器重新扫描媒体库 – 合并处理，仅限局域网。令牌保存在 Windows 凭据管理器中，绝不写入 config.yaml。",
    "sources": "Mixcloud 和 hearthis.at 作为搜索、关注列表和下载的更多来源 – 各有独立的限制、计数和退避，与 YouTube 和 SoundCloud 互不影响。",
    "reupload": "通过紧凑的音频指纹识别再次上传的同一混音（其他频道、其他平台、新 ID）– 离线根据你的文件计算，不联网。"
  },
  "set": {
    "default": "默认值",
    "range": "范围",
    "browse": "浏览",
    "not_set": "未设置",
    "saving": "保存中…",
    "discard": "放弃",
    "tab_reset": "重置此标签页",
    "tab_reset_title": "将此标签页所有字段恢复为默认值（点击“保存”后才生效）",
    "state_clean": "已全部保存",
    "state_dirty": {
      "other": "{n} 项未保存的更改"
    },
    "state_errors": {
      "other": "{n} 个错误 – 请更正"
    },
    "h": {
      "collector": "音乐节收集器",
      "search": "搜索",
      "duration": "时长与时间段",
      "keywords": "关键词",
      "display": "显示",
      "cover": "封面",
      "chapters": "章节与曲目列表",
      "tags": "标签",
      "soundcloud": "SoundCloud",
      "playback": "播放",
      "pauses": "暂停与带宽",
      "limits": "上限",
      "backoff": "被阻止时的退避",
      "po": "PO-Token 提供程序",
      "fallback": "应急方案",
      "in_app": "应用内",
      "task": "Windows 任务计划程序",
      "updates": "更新",
      "app_update": "应用更新",
      "release_notes": "版本说明",
      "database": "数据库",
      "reset": "重置",
      "detection": "识别",
      "series": "系列",
      "backfill": "全部读取（一次性）",
      "loudness": "响度",
      "memory": "记忆与波形",
      "analysis": "分析（离线，ffmpeg）",
      "playlists": "播放列表（M3U8）",
      "notify_events": "通知内容",
      "quiet": "免打扰时段",
      "ms_paths": "路径与时机",
      "more_sources": "Mixcloud & hearthis.at",
      "fingerprint": "指纹"
    },
    "general": {
      "language": {
        "label": "语言",
        "help": "界面和消息的语言。“自动”跟随 Windows 显示语言（否则使用英语）。保存后界面立即重建。"
      },
      "start_view": {
        "label": "启动视图",
        "help": "启动后打开哪个视图。"
      },
      "log_level": {
        "label": "日志级别",
        "help": "日志文件和实时日志的详细程度。DEBUG 仅用于排查问题。"
      },
      "confirm_delete": {
        "label": "删除前确认",
        "help": "从媒体库删除 mix（条目 + 文件）前先询问。"
      }
    },
    "player": {
      "mode": {
        "label": "播放方式",
        "help": "媒体库中 ▶ 使用的播放器。内置播放器会把章节显示为跳转标记，切换视图时继续播放。另一种方式可在每个条目的菜单中选用。"
      },
      "normalize": {
        "label": "均衡响度",
        "help": "以相同的感知响度播放每一场（来自离线分析或现有标签的 ReplayGain）。绝不削波：增益受测得的真峰值限制。"
      },
      "target_lufs": {
        "label": "目标响度",
        "help": "−18 LUFS 是 ReplayGain 2.0 的参考值。更高（如 −14）= 更响，但更多场次会触及峰值上限。"
      },
      "resume": {
        "label": "记住位置",
        "help": "按场记录，开头和结尾 30 秒除外。「询问」会提示继续，「自动」会直接继续。资料库显示最近五个未听完的场次。"
      },
      "waveform": {
        "label": "波形进度条",
        "help": "以波形显示整场并标出曲目列表。每个文件用 ffmpeg 计算一次（首次播放或分析时）；否则显示普通进度条。"
      }
    },
    "search": {
      "results_count": {
        "label": "每次搜索的结果数",
        "help": "每次搜索获取的结果数量（轻量）。结果越多，对 YouTube 的负载越大。"
      },
      "append_year": {
        "label": "将年份附加到搜索",
        "help": "上传时间段为“指定年份”时，会把年份附加到搜索词（例如“hardcore liveset 2013”）。这样 YouTube 能找到更多该年的 mix。"
      }
    },
    "filters": {
      "min_duration": {
        "label": "最短时长",
        "help": "更短的视频一律不视为 mix。"
      },
      "max_duration": {
        "label": "最长时长",
        "help": "0 = 不限。"
      },
      "upload_period": {
        "label": "上传时间段",
        "help": "默认显示哪些上传。“指定年份”只显示某一年的 mix，“自定义”为起止范围。"
      },
      "upload_year": {
        "label": "年份",
        "help": "上传年份相符或标题中含该年份即算匹配。YouTube 搜索只返回大致日期 – 此处允许 ±1 年。"
      },
      "upload_from": {
        "label": "从",
        "help": "最早上传日期。留空 = 不限。"
      },
      "upload_to": {
        "label": "到",
        "help": "最晚上传日期。留空 = 不限。对于大致日期，两端均允许 ±1 年的误差。"
      },
      "include_keywords": {
        "label": "包含关键词",
        "help": "标题中至少要出现一个。留空 = 全部允许。按 Enter 或逗号添加。"
      },
      "exclude_keywords": {
        "label": "排除关键词",
        "help": "标题中出现其中任何一个，该视频即被丢弃。"
      },
      "match_description": {
        "label": "搜索描述",
        "help": "同时检查视频描述中的关键词。轻量查询通常不提供描述。"
      },
      "hide_done_ignored": {
        "label": "隐藏已下载和已忽略",
        "help": "在结果中隐藏已下载和已忽略的视频。"
      },
      "apply_channel_blacklist": {
        "label": "应用频道黑名单",
        "help": "不显示被屏蔽频道的视频。"
      },
      "hide_cross_platform_duplicates": {
        "label": "隐藏跨平台重复项",
        "help": "隐藏可能已从另一平台（YouTube 或 SoundCloud）下载或排队的发现 – 时长相同（±5 秒）且标题非常相似。关闭：它们会带着“可能已下载”的提示显示。"
      }
    },
    "blacklist": {
      "label": "已屏蔽的频道",
      "help": "通过卡片菜单屏蔽频道。你可以在这里取消屏蔽。",
      "none": "没有被屏蔽的频道",
      "unblock": "取消屏蔽"
    },
    "genres": {
      "add": "流派",
      "up": "提高优先级",
      "down": "降低优先级",
      "delete": "删除流派",
      "color": "选择颜色",
      "name_ph": "名称",
      "kw_ph": "+ 关键词",
      "fallback": "兜底 – 没有关键词匹配时使用。始终存在，始终排在最后。"
    },
    "download": {
      "audio_format": {
        "label": "输出格式",
        "help": "MP3，或保留 YouTube 原始格式而不转换。"
      },
      "mp3_quality": {
        "label": "MP3 音质",
        "help": "320 kbps CBR 兼容性最好，V0 VBR 略省空间。"
      },
      "embed_cover": {
        "label": "嵌入封面",
        "help": "将缩略图裁剪为正方形后写入文件作为封面。"
      },
      "write_cover_jpg": {
        "label": "同时保存 cover.jpg",
        "help": "适用于读取文件夹封面的媒体服务器。"
      },
      "write_cue": {
        "label": "写入 .cue 文件",
        "help": "根据章节或描述中的时间戳生成曲目列表，放在音频文件旁。"
      },
      "write_id3_chapters": {
        "label": "写入 ID3 章节",
        "help": "将章节标记（CHAP/CTOC）直接嵌入 MP3。"
      },
      "keep_original_soundcloud": {
        "label": "保留 SoundCloud 原始音频",
        "help": "原样保存 SoundCloud 音频（AAC 160 kbps 存为 .m4a，MP3 128 kbps 存为 .mp3）– 避免二次有损转换。关闭：与“输出格式”一致。"
      },
      "keep_original_mixcloud": {
        "label": "保留 Mixcloud 原始音频",
        "help": "原样保存 Mixcloud 音频（AAC，通常 64–128 kbps，保存为 .m4a）– 不做第二次有损转换。关闭：按“输出格式”处理。"
      },
      "keep_original_hearthis": {
        "label": "保留 hearthis.at 原始音频",
        "help": "原样保存 hearthis.at 音频流（MP3）– 不做第二次有损转换。关闭：按“输出格式”处理。"
      }
    },
    "storage": {
      "target_dir": {
        "label": "目标文件夹",
        "help": "音乐存储的根目录。临时文件保存在其下的“.tmp”中。在便携版中，“.\\Music”这样的相对路径相对于应用文件夹解析（例如在 U 盘上）。"
      },
      "path_template": {
        "label": "路径模式",
        "help": "相对于目标文件夹，不含扩展名。“/”分隔文件夹。必须包含 {id}（SoundCloud 为“sc-<id>”）。{platform} 会变成“YouTube”或“SoundCloud”– 例如用作顶层文件夹以区分来源。"
      },
      "max_title_length": {
        "label": "标题最大长度",
        "help": "过长的标题在文件名中会被截短。"
      },
      "max_path_length": {
        "label": "路径最大长度",
        "help": "含目标文件夹的完整路径。未做额外配置时 Windows 允许 259 个字符。"
      },
      "artist_from_title": {
        "label": "从标题读取艺术家",
        "help": "识别“ARTIST @ EVENT”和“ARTIST - TITLE”格式，否则使用频道名称。"
      },
      "title_cleanup_patterns": {
        "label": "清理标题",
        "help": "正则表达式，匹配到的内容会从标题中移除。按 Enter 添加。",
        "ph": "+ 正则"
      },
      "album_from_edition": {
        "label": "专辑 = 届次",
        "help": "把届次（如“Defqon.1 2024”）写入专辑标签，让 Plex 和 Jellyfin 把同一音乐节的所有 set 显示为一张专辑。关闭：专辑 = 标题，与以前相同。"
      }
    },
    "path_preview": {
      "label": "预览",
      "help": "点击占位符可将其插入路径模式。",
      "fest": "{festival}、{event_year} 和 {stage} 仅在已归类音乐节时才有内容。否则它们会连同多余的分隔符和空文件夹一起省略。"
    },
    "throttle": {
      "sleep_requests": {
        "label": "请求间隔",
        "help": "元数据查询（搜索、关注列表）之间的等待时间。"
      },
      "sleep_interval": {
        "label": "下载间隔 – 最小",
        "help": "每次下载后，会随机暂停最小值与最大值之间的时间。"
      },
      "max_sleep_interval": {
        "label": "下载间隔 – 最大",
        "help": "随机暂停的上限。"
      },
      "limit_rate_mb": {
        "label": "下载速率",
        "help": "最大带宽。0 = 不限（不推荐）。"
      },
      "max_downloads_per_run": {
        "label": "每次运行最多下载数",
        "help": "其余内容留在队列中。"
      },
      "max_downloads_per_day": {
        "label": "每天最多下载数",
        "help": "计数器同时涵盖手动和自动下载。"
      },
      "max_searches_per_hour": {
        "label": "每小时最多搜索次数",
        "help": "防止意外地不停搜索。"
      },
      "backoff_initial_hours": {
        "label": "退避 – 初始值",
        "help": "出现 HTTP 429 或“确认你不是机器人”后的阻止时长。"
      },
      "backoff_max_hours": {
        "label": "退避 – 最大值",
        "help": "每次再被阻止，阻止时长翻倍，直至此值。"
      }
    },
    "backoff": {
      "none": "无退避（{p}）",
      "none_detail": "允许来自 {p} 的搜索、关注列表和下载。",
      "active": "退避中（{p}）",
      "active_detail": "至 {t} · 剩余 {rest} · 第 {level} 级",
      "blocked": "{p} 发出了阻止信号。在时间结束前，来自 {p} 的搜索、关注列表和下载均被阻止。",
      "clear": "手动解除",
      "sc_off": "SoundCloud 已关闭",
      "sc_off_detail": "不进行 SoundCloud 搜索、关注列表检查和 SoundCloud 下载。",
      "p_off": "{p} 已关闭",
      "p_off_detail": "不进行 {p} 搜索、关注列表检查和 {p} 下载。"
    },
    "soundcloud": {
      "enabled": {
        "label": "使用 SoundCloud",
        "help": "关闭：不搜索 SoundCloud、不检查 SoundCloud 来源、不下载 SoundCloud。已下载的内容仍保留在媒体库中。"
      },
      "sleep_requests": {
        "label": "请求间隔",
        "help": "向 SoundCloud 进行元数据查询（搜索、关注列表）之间的等待时间。"
      },
      "sleep_interval": {
        "label": "下载间隔 – 最小",
        "help": "每次 SoundCloud 下载后，会随机暂停最小值与最大值之间的时间。"
      },
      "max_sleep_interval": {
        "label": "下载间隔 – 最大",
        "help": "随机暂停的上限。"
      },
      "limit_rate_mb": {
        "label": "下载速率",
        "help": "最大带宽。0 = 不限（不推荐）。"
      },
      "max_downloads_per_run": {
        "label": "每次运行最多下载数",
        "help": "SoundCloud 的独立计数器。其余内容留在队列中。"
      },
      "max_downloads_per_day": {
        "label": "每天最多下载数",
        "help": "SoundCloud 的独立计数器，手动和自动下载合并计算。"
      },
      "max_searches_per_hour": {
        "label": "每小时最多搜索次数",
        "help": "SoundCloud 的独立计数器。"
      },
      "backoff_initial_hours": {
        "label": "退避 – 初始值",
        "help": "SoundCloud 报告请求过多（HTTP 429）后的阻止时长。"
      },
      "backoff_max_hours": {
        "label": "退避 – 最大值",
        "help": "每次再被阻止，阻止时长翻倍，直至此值。"
      }
    },
    "ladder": {
      "label": "级别",
      "help": "阻止时长如何按当前值增长。",
      "reset": "成功运行后重置",
      "invalid": "值无效"
    },
    "network": {
      "po_token_mode": {
        "label": "模式",
        "help": "yt-dlp 的 bgutil 插件。脚本模式在需要时启动 Deno，HTTP 模式保持本地服务器运行。"
      },
      "po_token_port": {
        "label": "HTTP 端口",
        "help": "仅 HTTP 模式。服务器监听 127.0.0.1。"
      },
      "po_token_ttl_hours": {
        "label": "Token 有效期",
        "help": "超过此时间后会生成新 Token。该值会四舍五入为整数小时（至少 1 小时）。"
      },
      "cookies_from_browser": {
        "label": "浏览器 Cookie",
        "help": "让 yt-dlp 使用你的浏览器登录状态。仅在不用它就无法工作时才开启。"
      },
      "proxy": {
        "label": "代理",
        "help": "可选，例如 socks5://127.0.0.1:1080。留空 = 直接连接。",
        "ph": "无代理"
      }
    },
    "po": {
      "active": "PO-Token 已启用",
      "inactive": "PO-Token 未启用",
      "error": "PO-Token 错误",
      "mode": "模式",
      "test": "测试",
      "testing": "测试中…",
      "test_ok": "测试成功。",
      "test_fail": "测试失败。",
      "unsaved": "测试使用已保存的设置。请先保存你的更改。"
    },
    "cookies": {
      "warn_off": "<b>建议：关闭。</b>同时使用 PO-Token 和浏览器 Cookie 可能引发问题。",
      "warn_on": "<b>应急方案已启用。</b>同时使用 PO-Token 和浏览器 Cookie 可能导致错误或被阻止，且请求会使用你的 YouTube 账号。不用也能正常工作时请尽快关闭。Cookie 绝不会写入日志。"
    },
    "schedule": {
      "in_app_check": {
        "label": "应用运行时检查",
        "help": "窗口打开期间，按配置的间隔检查关注列表。"
      },
      "watchlist_interval_hours": {
        "label": "间隔",
        "help": "应用内两次检查之间的时间。"
      },
      "entries_per_source": {
        "label": "每个来源的条数",
        "help": "每次检查获取多少条最新条目（轻量）（新来源的默认值）。"
      },
      "task_scheduler_enabled": {
        "label": "使用任务计划程序",
        "help": "应用关闭时也检查关注列表（无界面）。点击“创建任务”后开启。"
      },
      "task_time": {
        "label": "时间",
        "help": "计划任务每天的启动时间。"
      }
    },
    "next": {
      "title": "下次检查",
      "off": "无自动检查",
      "off_detail": "应用内检查和 Windows 任务均未启用。关注列表只能手动检查。",
      "app_detail": "在应用内每 {h} 小时 – HCLoader 运行期间。",
      "task_detail": "通过 Windows 任务计划程序，每天 {time} – 应用关闭时也会执行。",
      "any_detail": "取应用间隔与 Windows 任务中较早的一个。",
      "also_task": "另外：Windows 任务每天 {time}。",
      "also_app": "另外：应用内每 {h} 小时。",
      "pending": "尚未安排",
      "pending_detail": "应用首次检查关注列表后会设定下次日期。",
      "due": "已到期 – 即将开始",
      "backoff": "<b>退避中。</b>至 {t} 不进行检查；之后会补查或跳过该日期。",
      "unsaved": "未保存的计划更改需保存后才生效。"
    },
    "task": {
      "loading": "正在查询任务…",
      "registered": "任务已注册",
      "registered_detail": "{name} · 每天 {time} · 下次运行 {next}",
      "none": "未注册任务",
      "none_detail": "创建每天 {time} 的 Windows 任务（schtasks）。",
      "create": "创建任务",
      "remove": "删除任务",
      "moved": "应用已移动 – 请重新创建任务",
      "moved_detail": "计划任务仍会启动 {cmd}。重新创建后将使用当前应用文件夹。",
      "recreate": "重新创建任务",
      "unknown": "任务状态未知",
      "unknown_detail": "Windows 任务计划程序没有响应。设置保持不变。",
      "recheck": "再次检查"
    },
    "appearance": {
      "reduce_effects": {
        "label": "减少特效",
        "help": "关闭扫描线、故障效果和所有动画。"
      },
      "scanlines": {
        "label": "扫描线与噪点",
        "help": "覆盖整个界面的细腻叠加层。"
      },
      "pulse_bpm": {
        "label": "底鼓脉冲",
        "help": "进度条脉动所依据的节拍。"
      }
    },
    "pulse_preview": {
      "label": "预览",
      "help": "进行中的下载会这样脉动。",
      "off": "特效已减少"
    },
    "versions": {
      "plugin": "PO-Token 插件",
      "was": "之前为 {v}"
    },
    "update": {
      "label": "yt-dlp 与插件",
      "help": "YouTube 不断变化。出现错误时请先更新（venv 中的 pip）。",
      "button": "更新 yt-dlp 与插件",
      "running": "更新中…",
      "last_check": "上次检查",
      "restart": "<b>需要重启。</b>yt-dlp 已更新。在重启 HCLoader 之前，搜索和下载均被阻止；队列会保留。",
      "restart_title": "需要重启",
      "restart_text": "yt-dlp 已更新。请关闭并重启 HCLoader – 在此之前搜索和下载被阻止，队列会保留。",
      "out_live": "输出 · 已运行 {t}",
      "out_done": "输出 · {t} 后完成",
      "out_failed": "输出 · 失败",
      "out_last": "输出",
      "waiting": "正在启动 pip…"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "启动时检查更新",
        "help": "yt-dlp 和 PO-Token 插件，每天最多一次。"
      },
      "check_app_updates_on_start": {
        "label": "启动时检查 HCLoader 更新",
        "help": "每次启动向 GitHub 查询一次是否有新版本。点击之前不会下载任何内容。"
      },
      "apply_update_on_exit": {
        "label": "退出时安装更新",
        "help": "已下载的更新会在 HCLoader 关闭时安装（“稍后”）。关闭：下次启动时再次提示。"
      },
      "update_repo": {
        "label": "更新来源（GitHub）",
        "help": "格式为“owner/repo”的仓库。仅在使用 fork 时更改。"
      }
    },
    "db": {
      "label": "数据库",
      "help": "所有视频、来源和运行的状态。备份会把文件复制到“backups”文件夹。",
      "backup": "创建数据库备份",
      "backing_up": "备份中…",
      "open": "数据文件夹",
      "open_logs": "日志文件夹",
      "open_title": "打开存放数据库、配置和备份的文件夹",
      "open_logs_title": "打开存放日志文件的文件夹",
      "info": {
        "other": "{n} 条记录 · {mb} MB"
      },
      "last": "上次备份",
      "never": "尚无",
      "keep": "保留最新的 10 个备份，更早的会在下次备份时删除。",
      "backups": "备份",
      "backups_more": "+ “backups”文件夹中另有 {n} 个更早的",
      "fresh": "新"
    },
    "reset_all": {
      "label": "所有设置",
      "help": "将所有标签页重置为默认值。数据库和音乐文件不受影响。",
      "button": "全部重置"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "每小时搜索次数",
        "help": "“查找缺少的 set”会把搜索均匀分布（10 = 每 6 分钟一次）。全局的每小时搜索上限同样生效。"
      },
      "collector_results_per_search": {
        "label": "每次搜索的结果数",
        "help": "搜索一个缺少的 set 时查看多少条结果（每次搜索一个请求）。"
      },
      "collector_auto_confirm": {
        "label": "自动确认的起点",
        "help": "达到这个可信度的结果无需你确认即可生效 – 仅当标题中包含 DJ、音乐节和年份时。低于它的都要等你点一下。"
      },
      "detect": {
        "label": "自动识别",
        "help": "为新的搜索结果和下载归类音乐节或系列、年份、舞台和 set 类型。手动设置的值绝不会被覆盖。"
      },
      "min_confidence": {
        "label": "识别阈值",
        "help": "达到此置信度才会归类。低于它时只作为建议显示，可由你采纳。"
      },
      "year_from_upload_date": {
        "label": "年份取自上传日期",
        "help": "标题中没有年份时，使用上传年份（可信度较低）。"
      },
      "match_description": {
        "label": "同时搜索简介",
        "help": "也在已保存的简介中查找音乐节名称。"
      },
      "extra_stages": {
        "label": "额外舞台",
        "help": "内置舞台（RED、BLUE、BLACK、UV、Mainstage …）之外的舞台名称。",
        "ph": "+ 舞台"
      }
    },
    "fest_types": {
      "label": "自定义 set 类型词",
      "help": "标题中表示 set 类型的词语。会先于内置词语检查。",
      "ph": "标题中的词语",
      "add": "词语"
    },
    "fest_test": {
      "label": "测试标题",
      "help": "显示识别功能在标题中找到的内容。不会保存任何内容；以已保存的设置为准。",
      "ph": "例如 Defqon.1 2024 | RED | Closing Ceremony",
      "none": "未识别到任何内容",
      "assigned": "将被归类",
      "suggested": "仅作建议"
    },
    "fest_status": {
      "title": "{total} 个 mix 中已归类 {assigned} 个",
      "last": "上次运行",
      "help": "离线处理现有资料库。手动设置的值保留；文件不会被重写标签或移动。",
      "button": "立即归类音乐节",
      "running": "正在归类 … {done} / {total}"
    },
    "series": {
      "hint": "已知的音乐节、电台节目和播客。对此列表的更改会立即保存。",
      "add": "系列",
      "show_hidden": "显示已隐藏",
      "reset_all": "重置内置系列",
      "builtin": "内置",
      "own": "自定义",
      "modified": "已修改",
      "hidden": "已隐藏",
      "no_aliases": "无别名",
      "enable": "识别此系列",
      "hide": "隐藏",
      "restore": "恢复",
      "new_title": "新建系列",
      "edit_title": "编辑系列",
      "name": "名称",
      "kind": "类型",
      "default_genre": "默认流派",
      "aliases": "别名",
      "aliases_help": "其他写法。标题中出现一次即可。",
      "weak_aliases": "弱别名",
      "weak_help": "常见词语，只有和年份一起出现才算数。",
      "variants": "分支",
      "variants_help": "独立的届次，例如 Australia 或 at Home。",
      "channels": "主办方频道",
      "channels_help": "频道名称、ID 或网址。只会提高置信度。"
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "每个来源最多条目数",
        "help": "关注列表中的“全部读取（一次性）”最多读取频道或播放列表的这么多条目。"
      },
      "backfill_requests_per_hour": {
        "label": "每小时请求数",
        "help": "“全部读取”的分页请求会均匀分布（120 = 每 30 秒一次）；常规间隔和退避同样适用。计划运行（任务计划程序）最多继续这么多次请求。"
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "每次下载后分析",
        "help": "下载后立即测量响度（EBU R128）并计算波形 —— 离线、低优先级、逐个文件。"
      },
      "write_tags": {
        "label": "写入 ReplayGain 标签",
        "help": "将 REPLAYGAIN_TRACK_GAIN/PEAK（MP3、M4A）或 R128_TRACK_GAIN（Opus）写入文件，方便其他播放器使用。音频绝不重新编码。"
      },
      "waveforms": {
        "label": "预先计算波形",
        "help": "在分析时也计算波形。关闭：仅在首次播放某场时计算。"
      }
    },
    "analysis": {
      "title": "已分析 {done} / {total} 个文件",
      "counts": "{tagged} 个已写标签 · {waves} 个波形 · {failed} 个失败",
      "help": "离线遍历资料库，以低优先级逐个处理 —— 不联网，音频保持不变。随时可以取消。",
      "button": "分析新文件",
      "button_n": "分析 {n} 个新文件",
      "all": "全部重新分析",
      "all_title": "重新测量每个文件（例如在应用外替换了文件之后）",
      "running": "正在分析 … {done} / {total}",
      "no_ffmpeg_title": "缺少 ffmpeg",
      "no_ffmpeg": "响度和波形需要 ffmpeg（bin\\ffmpeg.exe，由 setup.ps1 安装）。设置 › 维护中可查看状态。"
    },
    "playlists": {
      "folder": {
        "label": "播放列表文件夹",
        "help": "导出的播放列表保存位置。留空 = 目标文件夹中的“Playlists”。",
        "ph": "目标文件夹中的“Playlists”"
      },
      "relative_paths": {
        "label": "相对路径",
        "help": "条目相对于播放列表，音乐文件夹移动（如到 U 盘）后仍可使用。其他驱动器上的文件始终使用完整路径。"
      },
      "sync_after_download": {
        "label": "下载后更新已保存的播放列表",
        "help": "以“保持更新”导出的播放列表会在每次下载后重写——仅本地，不联网。"
      }
    },
    "playlists_saved": {
      "label": "已保存的播放列表",
      "help": "每次导出都会记录在这里。“保持更新”会在下载后重写它。",
      "none": "还没有导出过播放列表——可在媒体库、DJ 页面或清单中使用“M3U”。",
      "gone": "文件缺失",
      "sync": "保持更新",
      "sync_title": "下载后重写此播放列表",
      "forget": "从列表中移除（文件保留）",
      "now": "立即更新"
    },
    "notifications": {
      "enabled": {
        "label": "Windows 通知",
        "help": "在 Windows 通知中心显示通知 – 应用关闭时的计划检查之后也会显示。"
      },
      "new_sets": {
        "label": "收件箱有新混音",
        "help": "监视列表检查（应用内或计划任务）找到了新混音。"
      },
      "downloads_done": {
        "label": "下载完成",
        "help": "每轮下载一条消息，包含混音数量和标题。"
      },
      "downloads_failed": {
        "label": "下载失败",
        "help": "某轮下载有失败时发一条消息。详情见“下载”。"
      },
      "quiet_hours": {
        "label": "免打扰时段",
        "help": "此时段内不显示通知。期间发生的事情之后会合并为一条摘要。"
      },
      "quiet_from": {
        "label": "开始",
        "help": "免打扰开始时间（24 小时制）。"
      },
      "quiet_to": {
        "label": "结束",
        "help": "免打扰结束时间。早于开始时间 = 跨越午夜（例如 22:00–07:00）。"
      }
    },
    "notify": {
      "on": "通知已开启",
      "off": "通知已关闭",
      "detail": "通过{backend}显示。短时间内的多个事件会合并为一条通知。",
      "backend_powershell": "Windows PowerShell（Windows 自带）",
      "backend_winrt": "Windows 通知 API（pywinrt）",
      "test": "发送测试",
      "testing": "正在发送 …",
      "test_sent": "测试通知已发送 – 请查看屏幕右下角。",
      "unavailable": "Windows 通知不可用",
      "unavailable_detail": "此系统无法显示通知（缺少 Windows PowerShell 或已被阻止）。事件只会写入日志。"
    },
    "media_server": {
      "type": {
        "label": "媒体服务器",
        "help": "下载后由哪个服务器重新扫描媒体库。关闭 = HCLoader 不联系任何媒体服务器。"
      },
      "url": {
        "label": "服务器地址",
        "help": "局域网中的地址，例如 http://192.168.1.10:32400（Plex）或 http://nas:8096（Jellyfin）。只会联系此地址。",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "服务器上的文件夹",
        "help": "服务器看到的目标文件夹路径（NAS、Docker），例如 /data/music/HCLoader。留空 = 与本机路径相同。用于只扫描新文件夹。",
        "ph": "与目标文件夹路径相同"
      },
      "delay_seconds": {
        "label": "扫描前等待",
        "help": "最后一次下载后等待这么久 – 多次下载会合并为一次扫描。"
      },
      "verify_tls": {
        "label": "验证证书",
        "help": "用于 https:// 地址。仅当局域网中使用自签名证书时才关闭。"
      }
    },
    "ms": {
      "off": "未设置媒体服务器",
      "off_detail": "在下方选择 Plex 或 Jellyfin，下载后即可重新扫描其媒体库。",
      "unsaved": "有未保存的更改 – 扫描使用已保存的设置。",
      "on": "下载后更新 {server}",
      "last_ok": "上次扫描 {t}（{n} 个新文件）",
      "last_fail": "上次扫描 {t} 失败",
      "never": "尚未扫描",
      "all_libraries": "全部媒体库",
      "no_secret": "尚未保存令牌 / API 密钥 – 请在下方输入并测试连接。",
      "scan_now": "立即扫描",
      "scanning": "正在请求 …",
      "scan_sent": "已请求扫描 – 服务器在后台读取媒体库。",
      "secret_plex": {
        "label": "Plex 令牌",
        "help": "你的 X-Plex-Token（Plex Web › 任意项目 › 获取信息 › 查看 XML：地址中的“X-Plex-Token=”）。测试成功后保存在 Windows 凭据管理器中 – 绝不写入 config.yaml 或日志。"
      },
      "secret_jellyfin": {
        "label": "Jellyfin API 密钥",
        "help": "控制台 › API 密钥 › “+”。测试成功后保存在 Windows 凭据管理器中 – 绝不写入 config.yaml 或日志。"
      },
      "secret_ph": "粘贴到这里",
      "secret_kept": "已保存 – 留空则保留",
      "stored_short": "已保存",
      "stored_title": "已保存在 Windows 凭据管理器中",
      "forget": "移除",
      "forgotten": "已从 Windows 凭据管理器移除令牌",
      "connect": {
        "label": "连接",
        "help": "检查地址和令牌并加载媒体库列表。只向你的服务器发送两个简短请求。"
      },
      "test": "测试连接",
      "testing": "正在测试 …",
      "test_ok": "已连接到 {name}（版本 {v}）。",
      "test_libs": "找到 {n} 个媒体库。",
      "stored": "令牌已保存。",
      "library": {
        "label": "媒体库",
        "help": "要扫描的媒体库。“全部媒体库”会扫描所有内容（大型服务器上较慢）。"
      },
      "lib_paths": "服务器上的文件夹：{p}"
    },
    "platform": {
      "enabled": {
        "label": "使用 {p}",
        "help": "关闭：不搜索 {p}、不检查 {p} 来源、不下载 {p}。已下载的内容仍保留在媒体库中。"
      },
      "sleep_requests": {
        "label": "请求间隔",
        "help": "向 {p} 进行元数据查询（搜索、关注列表）之间的等待时间。"
      },
      "sleep_interval": {
        "label": "下载间隔 – 最小",
        "help": "每次 {p} 下载后，会随机暂停最小值与最大值之间的时间。"
      },
      "max_sleep_interval": {
        "label": "下载间隔 – 最大",
        "help": "随机暂停的上限。"
      },
      "limit_rate_mb": {
        "label": "下载速率",
        "help": "最大带宽。0 = 不限（不推荐）。"
      },
      "max_downloads_per_run": {
        "label": "每次运行最多下载数",
        "help": "{p} 的独立计数器。其余内容留在队列中。"
      },
      "max_downloads_per_day": {
        "label": "每天最多下载数",
        "help": "{p} 的独立计数器，手动和自动下载合并计算。"
      },
      "max_searches_per_hour": {
        "label": "每小时最多搜索次数",
        "help": "{p} 的独立计数器。"
      },
      "backoff_initial_hours": {
        "label": "退避 – 初始值",
        "help": "{p} 报告请求过多（HTTP 429）后的阻止时长。"
      },
      "backoff_max_hours": {
        "label": "退避 – 最大值",
        "help": "每次再被阻止，阻止时长翻倍，直至此值。"
      }
    },
    "reupload": {
      "enabled": {
        "label": "识别重复上传",
        "help": "离线用 ffmpeg 为每个 Set 计算紧凑的音频指纹，并将新下载与你的媒体库比较。匹配会标记为“可能是 … 的重复上传” – 不会自动删除任何内容。"
      },
      "fingerprint_after_download": {
        "label": "每次下载后生成指纹",
        "help": "逐个文件、低优先级，在响度分析之后进行。关闭：仅使用下方的媒体库比对。"
      },
      "precheck": {
        "label": "下载前检查",
        "help": "下载前也在同一平台上将时长（±5 秒）和标题与媒体库比较 – 不产生额外请求。匹配项会进入收件箱而不是队列，并显示“可能已下载”。"
      },
      "head_minutes": {
        "label": "从开头计算的分钟数",
        "help": "指纹包含开头多长的部分。越多 = 对开头很长且相同的 Set 越可靠，但稍慢。"
      },
      "windows": {
        "label": "额外窗口",
        "help": "在固定时间点取 30 秒窗口：一半从开头算起（5、10、15 … 分钟），一半从结尾倒数（2、6、12 … 分钟），这样前奏或尾声更长的副本也能对齐。借此区分以同一首曲目开场的两个不同 Set。0 = 仅开头。"
      },
      "min_score": {
        "label": "匹配阈值",
        "help": "指纹哈希匹配的比例达到此值时，Set 被视为重复上传。越低 = 找到越多，但误判也越多。"
      },
      "title": "已为 {total} 个文件中的 {done} 个生成指纹",
      "marks": "{open} 个待定 · {linked} 个已关联 · {kept} 个已保留",
      "help": "离线遍历媒体库，逐个文件、低优先级 – 不联网，音频保持不变。可随时取消。",
      "button": "比对新文件",
      "button_n": "比对 {n} 个新文件",
      "all": "全部重新比对",
      "all_title": "重新计算所有指纹（例如更改窗口之后）– 你的决定会保留",
      "running": "比对中 … {done} / {total} · 找到 {found} 个",
      "show": "在媒体库中显示 {n} 个",
      "no_ffmpeg": "指纹需要 ffmpeg（bin\\ffmpeg.exe，由 setup.ps1 安装）。设置 › 维护 中可查看其状态。"
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
        "auto": "自动（系统语言）"
      }
    },
    "player": {
      "mode": {
        "internal": "内置播放器（推荐）",
        "external": "Windows 默认播放器"
      },
      "resume": {
        "ask": "询问",
        "auto": "自动",
        "off": "关闭"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "原始格式（Opus/M4A，不转换）"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "关闭",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    },
    "media_server": {
      "type": {
        "off": "关闭",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "屏蔽频道",
      "text": "将不再显示“{ch}”的视频。可在 设置 › 筛选与关键词 中撤销。",
      "ok": "屏蔽"
    },
    "ignore_all": {
      "title": "忽略发现",
      "text": {
        "other": "将收件箱中的 {n} 条发现标记为已忽略？它们不会被下载，也不再出现在收件箱中。"
      },
      "ok": "忽略"
    },
    "del_source": {
      "title": "删除来源",
      "text": "从关注列表中移除“{name}”？已下载的 mix 会保留。"
    },
    "del_mix": {
      "title": "删除 mix",
      "text": "“{title}”将从媒体库移除，且文件会从磁盘删除：",
      "ok": "删除文件",
      "warn": "<b>此操作无法撤销。</b>音频文件及相关的 .cue 文件会被删除。该 mix 会被标记为“已忽略”，<b>不会再次下载</b>。",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "仅移除条目",
      "text": "“{title}”的文件位于当前目标文件夹之外，因此不会被删除：",
      "ok": "仅移除条目",
      "warn": "文件保持原位不动。条目将从媒体库消失，该 mix 会被标记为“已忽略”，<b>不会再次下载</b>。"
    },
    "remove_mix": {
      "title": "移除条目",
      "text": "在记录的位置找不到“{title}”的文件：",
      "ok": "移除条目",
      "warn": "条目将从媒体库消失。该 mix 会被标记为“已忽略”，<b>不会再次下载</b>。如果文件在别处，则保持不动。"
    },
    "backoff": {
      "title": "解除退避",
      "ok": "仍然解除",
      "text": "阻止时长是为了保护你：{p} 发出了请求过多的信号。",
      "warn": "<b>仅在确定阻止已结束时才解除。</b>如果应用过早再次访问，{p} 可能会更长时间甚至永久限制你的 IP。"
    },
    "reset_all": {
      "title": "全部重置",
      "text": "所有标签页的全部设置将立即恢复为默认值并保存。",
      "ok": "重置"
    },
    "series_delete": {
      "title": "删除系列？",
      "text": "“{name}”及其届次将被删除。",
      "warn": {
        "other": "{n} 个 mix 将失去归类。"
      }
    },
    "series_hide": {
      "title": "隐藏系列？",
      "text": "“{name}”将不再被识别。可通过“显示已隐藏”找回。"
    },
    "series_reset": {
      "title": "重置内置系列？",
      "text": "所有内置系列恢复到初始状态，已隐藏的会重新出现。你自己的系列保持不变。",
      "ok": "重置"
    },
    "reupload_del": {
      "title": "删除重复上传？",
      "ok": "删除文件",
      "text": "“{title}”可能与“{of}”是同一混音。要删除这个较新的文件吗？",
      "note": "原始文件保留。该条目会设为“已忽略”，不会再次下载。"
    }
  },
  "toast": {
    "enqueued": {
      "other": "已将 {n} 个 mix 加入队列"
    },
    "enqueued_none": "未添加任何内容 – 已在队列中或已下载",
    "enqueued_skipped": "已跳过 {n} 项",
    "queue_cancelled": "已取消：{title}",
    "queue_removed": "已移除：{title}",
    "queue_retry": "已重新排队：{title}",
    "queue_paused": "队列已暂停",
    "queue_resumed": "队列已继续",
    "new_run": "已开始新一轮运行",
    "ignored": "已忽略：{title}",
    "unignored": "已重新显示：{title}",
    "ignored_n": {
      "other": "已忽略 {n} 条发现"
    },
    "opening": "正在浏览器中打开 {p}…",
    "watch_added": "已加入关注列表：{ch}",
    "blocked": "已屏蔽频道：{ch}",
    "genre_set": "已设置流派：{genre}",
    "done": "已下载：{title}",
    "failed": "失败：{title} – {error}",
    "wl_started": {
      "other": "正在检查关注列表（{n} 个来源，已限速）…"
    },
    "wl_started_one": "正在检查“{name}”…",
    "wl_none": "没有启用的来源 – 无需检查",
    "wl_done": {
      "other": "关注列表已检查：{n} 个来源，没有新内容"
    },
    "wl_done_found": {
      "other": "关注列表已检查：{n} 条新发现"
    },
    "wl_errors": {
      "other": "{n} 个来源出错"
    },
    "source_added": "已添加来源：{name}",
    "source_saved": "已保存来源：{name}",
    "source_deleted": "已删除来源：{name}",
    "retagged": "已重写标签：{title}",
    "retagged_moved": "已重写标签并移动：{title} → {path}",
    "deleted": "已删除：{title}",
    "removed": "已移除条目：{title}",
    "folder_opening": "正在打开文件夹…",
    "copied": {
      "other": "已复制 {n} 行"
    },
    "copy_failed": "无法复制",
    "copy_none": "没有可见的行",
    "settings_saved": "设置已保存",
    "settings_errors": {
      "other": "{n} 处输入无效"
    },
    "backoff_cleared": "已手动解除退避（{p}）",
    "genre_moved": "流派：{genre} – 已移动到 {path}",
    "genre_retagged": "流派：{genre} – 标签已更新",
    "genre_entry_only": "流派：{genre} – 仅更改了条目，无法访问文件",
    "genre_failed": "无法设置流派：{error}",
    "task_created": "已在 Windows 任务计划程序中创建任务",
    "task_removed": "任务已删除",
    "updated": "已更新到 yt-dlp {v}",
    "up_to_date": "已是最新（yt-dlp {v}）",
    "update_failed": "更新失败",
    "restart_required": "已更新 – 请重启 HCLoader，搜索和下载才能恢复正常",
    "backup_done": "已创建备份：{path}",
    "reset_all": "所有设置已重置",
    "festival_entry_only": "“{name}”仅保存在条目中——无法访问文件",
    "series_saved": "系列“{name}”已保存",
    "series_deleted": "系列“{name}”已删除",
    "series_hidden": "系列“{name}”已隐藏",
    "series_reset": "内置系列已恢复",
    "assign_done": "音乐节已归类：新增 {assigned} 个，建议 {suggested} 条",
    "assign_cancelled": "归类已取消：新增 {assigned} 个，建议 {suggested} 条",
    "analysis_done": "响度已分析：{n} 个文件（{failed} 个失败）",
    "analysis_cancelled": "已在 {n} 个文件后取消分析",
    "fp_done": "媒体库已比对：{n} 个文件，{found} 个可能的重复上传",
    "fp_cancelled": "比对在 {n} 个文件后取消"
  },
  "upd": {
    "available": "有新版本 {v}",
    "available_sub": "已安装：{cur}",
    "download": "下载",
    "notes": "更新内容",
    "later": "稍后",
    "close": "关闭",
    "cancel": "取消",
    "retry": "重试",
    "downloading": "正在下载更新 {v}",
    "phase_download": "下载",
    "phase_verify": "校验",
    "phase_prepare": "准备",
    "ready": "更新 {v} 已就绪",
    "ready_sub": "安装时，HCLoader 会短暂关闭并重新启动。",
    "restart_now": "立即重启",
    "on_exit": "退出时",
    "applying": "正在安装更新…",
    "applying_sub": "HCLoader 即将关闭并重新启动。",
    "error": "应用更新失败",
    "blocked": "无法自动更新",
    "notes_title": "版本 {v} 的更新内容",
    "notes_empty": "暂无发行说明。",
    "notes_link": "GitHub 上的发行版",
    "notes_all": "显示全部更改",
    "notes_less": "仅显示亮点",
    "confirm_title": "立即重启？",
    "confirm_ok": "重启",
    "confirm_text": "HCLoader 将关闭，安装更新后重新启动。正在进行的下载会被取消并保留在队列中。音乐、设置和数据库保持不变。",
    "on_exit_toast": "更新将在 HCLoader 退出时安装。",
    "later_toast": "更新保持就绪，下次启动时会再次提示。",
    "section_label": "HCLoader 版本",
    "section_help": "新版本来自 GitHub。更新不会影响数据、设置和音乐；数据库迁移前会自动创建备份。",
    "current": "已安装",
    "latest": "最新",
    "checked": "上次检查",
    "check_now": "立即检查",
    "checking": "检查中…",
    "st_idle": "已是最新",
    "st_available": "有新版本",
    "st_checking": "检查中…",
    "st_downloading": "下载中…",
    "st_ready": "可安装",
    "st_applying": "安装中…",
    "st_error": "错误",
    "st_unknown": "尚未检查",
    "up_to_date": "HCLoader 已是最新（v{v}）",
    "portable": "便携版",
    "installed": "已安装（安装程序）",
    "git": "Git 检出",
    "from_repo": "来自 {repo}（非官方来源）",
    "unverified": "无校验和（仅校验了 ZIP 完整性）",
    "rn_label": "版本说明",
    "rn_help": "每个版本的变更，来自随附的说明（离线可用）。",
    "rn_older": "较旧",
    "rn_newer": "较新",
    "rn_pos": "第 {i} / {n} 个",
    "rn_installed": "已安装",
    "rn_empty": "未找到版本说明。",
    "rn_version": "版本",
    "notes_more": "更多"
  },
  "err": {
    "generic": "未知错误",
    "bridge": "“{name}”出错：{msg}",
    "boot": "启动失败：{msg}",
    "no_backend": "无法连接后端"
  },
  "fatal": {
    "title": "与后端的连接失败",
    "text": "界面没有收到 HCLoader Python 部分的响应。不会显示或保存任何不真实的内容。",
    "waiting": "仍在等待后端…",
    "reload": "重新加载"
  },
  "fest": {
    "all": "全部系列",
    "other": "其他 / 未归类",
    "other_hint": "无音乐节",
    "sets": {
      "other": "{n} 个 set"
    },
    "editions": {
      "other": "{n} 届"
    },
    "suggestions": {
      "other": "{n} 条建议"
    },
    "all_years": "全部",
    "no_stage": "无舞台",
    "kind": {
      "festival": "音乐节",
      "radio": "电台节目",
      "podcast": "播客"
    },
    "set_type": {
      "live_set": "现场 set",
      "closing_ceremony": "闭幕式",
      "opening": "开幕",
      "endshow": "Endshow",
      "full_show": "完整演出",
      "warm_up": "暖场",
      "anthem": "主题曲",
      "episode": "单集"
    },
    "change": "更改音乐节",
    "change_manual": "手动设置，点击更改",
    "add": "设置音乐节或系列",
    "suggested": "不确定的建议：{name}",
    "accept": "采纳建议",
    "p_title": "音乐节 / 系列",
    "p_search": "搜索系列 …",
    "p_none": "无音乐节",
    "p_no_match": "未找到系列",
    "p_year": "年份",
    "p_variant": "分支",
    "p_stage": "舞台",
    "p_type": "Set 类型",
    "p_apply": "应用",
    "p_auto": "恢复自动识别"
  },
  "backfill": {
    "action": "全部读取（一次性）",
    "action_title": "逐页读取此来源的完整列表一次 – 新结果进入收件箱",
    "again_title": "再次全部读取 – 只添加尚未知道的条目",
    "search_title": "不适用于已保存的搜索 – 搜索最多返回 100 个结果",
    "why_open": "读取已开始 – 可在名称下方暂停或取消",
    "st_pending": "等待中",
    "st_running": "读取中 …",
    "st_paused": "已暂停",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / 最多 {cap}",
    "added": "收件箱 +{n}",
    "done_short": "已全部读取 {date}",
    "done_title": "已完整读取：{date} · {n} 个条目",
    "note_title": "上次中断",
    "pause": "暂停",
    "resume": "继续",
    "cancel": "取消",
    "keep": "继续读取",
    "dlg_title": "读取“{name}”的全部内容？",
    "dlg_text": "逐页读取此来源的完整列表一次 – 扁平且低成本，经由限速器；不下载任何内容。通过筛选的结果进入<b>收件箱</b>，即使来源设置了自动下载。已知的视频绝不会重复添加。",
    "dlg_requests": "次请求",
    "dlg_time": "时长",
    "dlg_entries": "个条目",
    "dlg_known": "上次检查得知：<b>{n}</b> 个条目。",
    "dlg_unknown": "大小未知 – 按最多 {cap} 个条目保守估计。",
    "dlg_capped": "只读取前 {cap} 个条目（设置 › 计划）。",
    "dlg_resume": "从已读的 {n} 个条目之后继续；这些页面会先重新请求一次。",
    "dlg_headless": "对计划运行来说太大（每小时 {n} 次请求）：如果应用在完成前关闭，只会在应用中继续。",
    "dlg_pace": "每小时最多 {n} 次请求，均匀分布。退避（HTTP 429 / 机器人检查）、关闭应用或出错只会中断 – 之后会自动继续。可随时暂停或取消。",
    "dlg_ok": "开始读取",
    "dlg_ok_resume": "继续读取",
    "dlg_cancel_title": "取消读取？",
    "dlg_cancel_text": "“{name}”的读取将停止，进度会被丢弃。已在收件箱中的结果保留。",
    "toast_started": "正在完整读取“{name}” – 在后台运行",
    "toast_done": "“{name}”已完整读取 – 收件箱 +{n}",
    "toast_paused": "“{name}”已暂停 – 用“继续”恢复",
    "toast_cancelled": "已取消读取“{name}”"
  },
  "collector": {
    "nav": "收集器",
    "open_title": "音乐节收集器：用清单集齐某一届音乐节的全部 set",
    "title": "音乐节收集器",
    "sub": "某一届音乐节的全部 set – 按时间表整理，附带清单",
    "back_library": "返回媒体库",
    "back_list": "全部清单",
    "collect": "收集这一届",
    "collect_title": "{name} 全部 set 的清单：查找缺少的 set 并下载",
    "open_checklist": "清单 {n} / {total}",
    "sets": "Set",
    "lists": "清单",
    "card_empty": "还没有 set",
    "new_title": "新建清单",
    "new_text": "选择音乐节和年份。Set 来自主办方的播放列表、粘贴的时间表或随附的文件。",
    "new_ok": "打开清单",
    "f_series": "音乐节 / 系列",
    "f_series_ph": "请选择 …",
    "f_series_other": "电台节目与播客",
    "err_series": "请选择音乐节或系列。",
    "err_year": "请输入这一届的年份。",
    "empty_title": "还没有清单",
    "empty_text": "清单会列出某一届音乐节的每个 set，并显示你已经拥有哪些。",
    "step1": "在上方选择音乐节和年份。",
    "step2": "导入主办方的播放列表，或粘贴时间表。",
    "step3": "取消勾选不想要的，查找缺少的 set 并下载。",
    "delete": "删除清单",
    "dlg_delete_title": "删除清单？",
    "dlg_delete_text": "“{name}”的清单及其所有行将被移除。正在进行的搜索会停止。",
    "dlg_delete_keep": "已下载的文件、媒体库条目和已保存的结果都会保留。",
    "toast_deleted": "已删除清单“{name}”",
    "in_library": "媒体库中有 {n} 个",
    "show_library": "在媒体库中显示（{n}）",
    "more": "更多",
    "st": {
      "found": "已找到",
      "queued": "排队中",
      "downloaded": "已下载",
      "missing": "缺少",
      "ignored": "已忽略"
    },
    "filter_status": "仅显示：{name}",
    "sources": "来源",
    "src_playlist": "导入主办方播放列表",
    "src_paste": "粘贴时间表 (Beta)",
    "files": "随附的时间表",
    "src_add": "添加一行",
    "all_stages": "全部舞台",
    "all_days": "全部日期",
    "no_day": "无日期",
    "search": "按 DJ 筛选 …",
    "col_dj": "DJ / set",
    "col_when": "日期 / 时间",
    "col_status": "状态",
    "col_match": "匹配的视频",
    "source": {
      "playlist": "播放列表",
      "timetable": "时间表",
      "file": "时间表文件",
      "manual": "手动添加"
    },
    "edited": "已手动修改 – 这些值优先于之后的导入",
    "check_title": "收集这个 set",
    "all_title": "全选 / 全不选（当前显示的行）",
    "m_none": "尚未搜索",
    "m_searched": "未找到（{date}）",
    "confirm": "确认",
    "confirm_title": "不确定的结果 – 请确认这是正确的 set",
    "reject_title": "不是这个视频 – 不再为这一行推荐它",
    "reject": "放弃该结果",
    "candidates": "其他结果：{n}",
    "candidates_head": "改用其他结果",
    "ignore": "忽略这个 set",
    "unignore": "取消忽略",
    "delete_row": "删除这一行",
    "f_artist": "DJ / 艺人",
    "f_day": "日期",
    "f_start": "开始",
    "f_end": "结束",
    "add_ok": "添加",
    "err_artist": "必须填写 DJ / 艺人。",
    "none_title": "没有匹配的行",
    "none_text": "没有符合当前筛选条件的行。",
    "rows_empty_title": "这份清单是空的",
    "rows_empty_text": "先从主办方的官方播放列表开始 – 一次简单的列表请求通常就能覆盖大部分 set。也可以把时间表作为文本粘贴进来。",
    "checked_of": "/ 共 {total} 个已勾选",
    "select_all": "全选",
    "select_none": "全不选",
    "shown": "显示 {n} / {total} 行",
    "to_confirm": "待确认：{n}",
    "to_confirm_title": "不确定的结果等待你确认 – 点击后只显示这些",
    "find": "查找缺少的 set（{n}）",
    "find_again": "重新搜索（{n}）",
    "find_title": "逐个、限速地搜索已勾选但没有结果的 set – 会先显示预估",
    "find_again_title": "所有 set 都已搜索过 – 重新搜索没有结果的那些",
    "find_none": "没有需要搜索的 – 每个已勾选的 set 都有结果",
    "find_running": "搜索正在进行",
    "queue": "下载已勾选（{n}）",
    "queue_title": "把所有已勾选且已确认的 set 加入下载队列",
    "queue_none": "没有可下载的 – 没有已勾选、结果已确认且尚未下载的 set",
    "job_pending": "等待中",
    "job_running": "搜索中 …",
    "job_paused": "已暂停",
    "job_hits": "已找到：{n}",
    "job_cancel": "停止",
    "job_resume": "继续",
    "imp_running": "正在读取播放列表 …",
    "imp_entries": "条目：{n}",
    "imp_hint": "简单列表请求，逐页读取",
    "imp_busy": "已有一个播放列表正在读取",
    "imp_added": "新增：{n}",
    "imp_merged": "合并：{n}",
    "imp_matched": "在媒体库中找到：{n}",
    "imp_unchecked": "未勾选（太短 / aftermovie）：{n}",
    "imp_invalid": "无效：{n}",
    "pl_title": "导入主办方播放列表",
    "pl_text": "主办方的官方 liveset 播放列表是成本最低的来源：只需一次简单的列表请求，不会下载任何内容。每个条目都会成为一行已确认的记录；DJ、舞台和 set 类型取自标题。",
    "pl_url": "播放列表链接",
    "pl_hint": "YouTube 播放列表或 SoundCloud set。太短的条目、aftermovie 和预告片会以未勾选状态加入。来自时间表的行会得到对应的视频。",
    "pl_ok": "导入",
    "pl_err_empty": "请粘贴播放列表的链接。",
    "toast_pl_started": "正在读取播放列表 – 在后台运行",
    "toast_pl_done": "播放列表已读取 –",
    "toast_pl_cancelled": "播放列表导入已停止 –",
    "tt_title": "粘贴时间表 – {name} (Beta)",
    "tt_text": "把时间表作为文本或 CSV 粘贴进来。标题行决定日期和舞台，其余每一行是一个 set。导入之前不会保存任何内容。",
    "tt_input": "时间表",
    "tt_preview": "预览",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "识别出的 set 会显示在这里。",
    "tt_nothing": "还没有识别出任何 set。",
    "tt_sum": "Set：{n}",
    "tt_days": "天数：{n}",
    "tt_stages": "舞台：{n}",
    "tt_skipped": "无法理解的行：{n}",
    "tt_more": "… 还有 {n} 个",
    "tt_ok": "导入（{n}）",
    "tt_edit_hint": "导入前可在此修改或删除条目。修改左侧文本会重新读取。",
    "toast_tt": "时间表已导入 –",
    "files_text": "在 HCLoader 仓库中维护并随更新发布的时间表。导入其中一个会创建对应那一届的清单。",
    "files_empty_title": "尚未随附任何时间表",
    "files_empty": "只发布经过核实的时间表 – 这个版本还没有。请改为把时间表作为文本粘贴。",
    "files_how_title": "贡献时间表",
    "files_how": "每一届一个 JSON 文件，包含各个 set（艺人、舞台、日期、开始、结束）以及作为来源的官方时间表链接。请在 GitHub 上以 issue 或 pull request 提交；文件旁边的 README 说明了格式。",
    "files_meta": "Set：{n} · 更新于 {date}",
    "files_source": "官方来源",
    "files_import": "导入",
    "files_broken": "文件无效：{error}",
    "files_unknown": "此处未知或已隐藏该系列",
    "est_title": "查找缺少的 set – {name}",
    "est_text": "逐个搜索每个已勾选但没有结果的 set：以 <b>DJ + 音乐节 + 年份</b> 通过限速器进行简单搜索。不会下载任何内容。",
    "est_requests": "次搜索",
    "est_left": "本小时剩余",
    "est_again": "所有 set 都已搜索过 – 这次会重新搜索没有结果的那些。",
    "est_offline": "刚刚已免费与你的媒体库匹配：{n}。",
    "est_resume": "继续被中断的搜索。",
    "est_wait": "本小时的搜索额度已用完 – 第一次搜索将于{t}开始。",
    "est_backoff": "退避生效至{t} – 在此之前无法开始搜索。",
    "est_pace": "每小时最多 {n} 次搜索，均匀分布（大约每 {min} 分钟一次）。不确定的结果等待你确认。退避、关闭应用或出错只会中断搜索 – 之后会自动继续。",
    "est_ok": "开始搜索",
    "est_ok_resume": "继续搜索",
    "toast_find_started": "正在搜索“{name}”缺少的 set – 在后台运行",
    "toast_find_done": "搜索完成 – 找到 {n} / {total}",
    "toast_find_cancelled": "搜索已停止 –“查找缺少的 set”可继续",
    "toast_offline": "已与你的媒体库匹配：{n} – 无需搜索",
    "toast_confirmed": "已确认“{name}”",
    "toast_rejected": "已放弃“{name}”的结果",
    "toast_ignored": "已忽略“{name}”",
    "toast_unignored": "重新收集“{name}”",
    "toast_row_added": "已添加“{name}”",
    "toast_row_added_hit": "已添加“{name}” – 在媒体库中找到",
    "toast_row_saved": "已保存“{name}”",
    "toast_row_retag": "已保存“{name}” – 正在重新写入文件标签",
    "toast_row_deleted": "已删除行“{name}”",
    "q_none": "没有内容加入队列",
    "q_unconfirmed": "未确认：{n}",
    "q_missing": "没有结果：{n}",
    "q_other": "无法下载：{n}",
    "q_retag": "已重写标签：{n}",
    "export": "播放列表",
    "export_title": "将此清单中已下载的 Set 导出为 M3U8 播放列表"
  },
  "tracks": {
    "nav": "曲目",
    "open_title": "哪些混音播放了某首曲目？搜索媒体库的曲目表",
    "title": "曲目",
    "sub": "哪些混音播放了这首曲目？",
    "back": "返回媒体库",
    "search": "艺人或曲名，例如 Dragonborn",
    "n_tracks": {
      "other": "{n} 首曲目"
    },
    "n_sets": {
      "other": "{n} 个混音"
    },
    "status": "{sets}中的 {tracks}",
    "status_last": "已读取：",
    "scan": "读取曲目表",
    "scan_title": "读取所有混音的曲目表（离线：章节、简介、CUE 文件）",
    "rescan": "全部重新读取",
    "rescan_title": "重新读取所有混音集的曲目列表",
    "scan_new": "读取新的",
    "scan_new_title": "只读取新的或自上次以来有更改的混音集",
    "running": "正在读取曲目表 … {done} / {total}",
    "engine_like": "简单搜索：此 SQLite 没有全文索引",
    "top_title": "播放最多的曲目",
    "top_sub": "出现在最多混音中",
    "top_sets": {
      "other": "{n} 个混音"
    },
    "top_find": "显示包含此曲目的混音",
    "top_empty": "还没有曲目出现在多个混音中。",
    "results": {
      "other": "{n} 个混音包含“{q}”"
    },
    "truncated": "前 {n} 个 – 请细化搜索",
    "more_hits": {
      "other": "+ 另外 {n} 条结果"
    },
    "no_results_title": "没有混音播放“{q}”",
    "no_results_text": "请尝试艺人或曲名的一部分。只能找到带曲目表（章节、简介、CUE 文件）的混音。",
    "empty_title": "还没有曲目表",
    "empty_text": "HCLoader 从混音的章节、简介和 CUE 文件读取曲目表 – 离线进行，不访问 YouTube。",
    "empty_none_title": "你的混音都没有曲目表",
    "empty_none_text": "曲目表来自章节、带时间戳的简介和 CUE 文件。没有这些的混音无法搜索。",
    "library_empty": "请先下载一些混音 – 它们的曲目表会显示在这里。",
    "jump": "从 {time} 开始播放",
    "jump_external": "已在默认播放器中打开 – 请在那里跳到 {time}",
    "no_time": "曲目表中没有时间戳",
    "tracklist": "曲目表",
    "tracklist_title": "显示此混音的完整曲目表",
    "panel_source": "来源：{source}",
    "source_chapters": "章节",
    "source_description": "简介",
    "source_id3": "ID3 章节",
    "source_cue": "CUE 文件",
    "source_none": "无",
    "panel_empty": "此混音没有曲目表",
    "panel_empty_hint": "未找到章节、带曲目表的简介或 CUE 文件。",
    "close": "关闭",
    "id_track": "未发行或未识别的曲目（ID）",
    "play_set": "从头播放混音",
    "toast_done": "曲目表已读取：{sets}，{tracks}",
    "toast_cancelled": "读取曲目表已取消"
  },
  "pl": {
    "title": "导出播放列表",
    "export": "导出",
    "overwrite": "覆盖",
    "exists": "此文件夹中已有同名播放列表。点击“覆盖”将其替换。",
    "nothing": "没有可导出的内容——这里没有已下载的 Set。",
    "missing": "缺少 {n} 个文件——将跳过",
    "name": "文件名",
    "folder": "文件夹",
    "browse": "浏览 …",
    "paths": "播放列表中的路径",
    "relative": "相对",
    "absolute": "绝对",
    "relative_help": "相对于播放列表——整个音乐文件夹移动后仍可使用。其他驱动器上的文件会写入完整路径。",
    "absolute_help": "完整路径——播放列表可放在任何位置，但音乐移动后会失效。",
    "sync": "下载后保持更新",
    "sync_help": "每次下载后自动重写。",
    "sync_off": "已记住——开启“下载后更新已保存的播放列表”后生效（设置 › 存储）。",
    "done": "播放列表已保存（{sets}）：{path}",
    "skipped": "已跳过 {n} 个缺失",
    "fallback": "{n} 个位于其他驱动器，使用完整路径",
    "synced": "已更新 {n} 个播放列表",
    "sync_failed": "{n} 个播放列表未更新（见日志）"
  },
  "djs": {
    "nav": "DJ",
    "open_title": "DJ 页面：媒体库中的所有艺人，含别名和 b2b Set",
    "title": "DJ",
    "sub": "媒体库中的艺人",
    "back_library": "返回媒体库",
    "back": "全部 DJ",
    "add": "添加 DJ / 组合",
    "search": "搜索 DJ 或别名",
    "sort": "排序",
    "sort_sets": "Set 数",
    "sort_recent": "最近",
    "sort_name": "名称",
    "hidden_chip": "已隐藏：{n}",
    "n_festivals": "音乐节：{n}",
    "n_b2b": "b2b：{n}",
    "aka": "又名 {names}",
    "unhide": "重新在列表中显示",
    "none_title": "未找到 DJ",
    "none_text": "试试其他名称或别名。",
    "empty_title": "还没有 DJ",
    "empty_text": "DJ 会根据已下载 Set 的标题、音乐节清单和艺人频道离线识别。",
    "b2b_title": "合作演出（b2b）——该 Set 计入每位艺人",
    "b2b_with": "与 {names} b2b",
    "aliases": "别名",
    "no_aliases": "没有别名",
    "split_title": "拆分“{alias}”——作为独立 DJ 计算",
    "play_all": "全部播放",
    "export": "导出 M3U",
    "export_title": "导出播放列表：{name}",
    "watch": "添加到关注列表",
    "discover": "在“发现”中搜索",
    "stat_sets": "Set",
    "stat_hours": "小时",
    "stat_festivals": "音乐节",
    "stat_years": "年份",
    "stat_b2b": "b2b",
    "other_sets": "其他 Set · {year}",
    "tracks": "其 Set 中最常播放",
    "track_sets": "{n}×",
    "tracks_none": "这些 Set 还没有曲目列表——“媒体库 › 曲目”会离线读取。",
    "play_all_external": "“全部播放”需要内置播放器（设置 › 播放）。",
    "watch_exists": "已在关注列表中：{name}",
    "watch_title": "关注 {name}",
    "watch_ok": "添加到关注列表",
    "watch_channel": "{name} 自己频道的新 Set 将出现在收件箱中：",
    "watch_search": "未知自有频道——关注列表将定期在 YouTube 上搜索：",
    "watch_note": "不会自动下载任何内容。你可以随时在关注列表中修改或删除该来源。",
    "watch_added": "已添加到关注列表：{name}",
    "split_q_title": "拆分别名",
    "split_q": "将署名为“{alias}”的 Set 作为独立 DJ 计算，而不是 {name}？",
    "split_ok": "拆分",
    "split_done": "“{alias}”重新成为独立 DJ",
    "edit": "编辑名称和别名",
    "edit_title": "编辑 {name}",
    "add_title": "添加 DJ 或组合",
    "f_name": "名称",
    "f_aliases": "别名",
    "f_aliases_help": "其他写法和简称（如“HH”）。署名为别名的 Set 计入此 DJ。",
    "f_act_help": "可选。名称中带“&”的组合（如“D-Block & S-te-Fan”）将计为一个组合，而不是 b2b。",
    "f_alias_add": "+ 别名",
    "f_channel": "自有频道（可选）",
    "f_channel_help": "YouTube 或 SoundCloud 频道网址——用于“添加到关注列表”。",
    "saved": "已保存",
    "merge": "与其他 DJ 合并 …",
    "merge_title": "合并 {name}",
    "merge_text": "{name} 的所有 Set 和写法将计入所选 DJ。之后可以再拆分。",
    "merge_into": "合并到",
    "merge_ok": "合并",
    "merge_none": "没有可合并的其他 DJ。",
    "merged": "已合并 {name}",
    "hide": "不是 DJ——隐藏",
    "hidden_done": "已从 DJ 列表中隐藏",
    "unhidden_done": "已重新显示在 DJ 列表中",
    "sub_n": {
      "other": "{n} 位 DJ"
    }
  },
  "stats": {
    "title": "统计",
    "sub": "用数字看你的媒体库 – 离线，来自数据库",
    "range": "时间范围",
    "p_all": "全部",
    "p_12m": "12 个月",
    "p_30d": "30 天",
    "p_year": "今年",
    "p_custom": "自定义",
    "from": "从",
    "to": "到",
    "n_sets": {
      "other": "{n} 个混音"
    },
    "sets_word": {
      "other": "个混音"
    },
    "k_sets": "混音",
    "k_hours": "总时长",
    "k_size": "磁盘占用",
    "k_avg": "平均时长",
    "of_library": "媒体库共 {n} 个",
    "since": "自 {d} 起",
    "days_nonstop": "连续播放 {n} 天",
    "last_dl": "最近下载 {d}",
    "avg_size": "每个 {s}",
    "sizes_missing": {
      "other": "{n} 个文件尚未测量"
    },
    "measuring": "正在测量文件大小 … {done} / {total}",
    "h_months": "每月下载",
    "h_years_dl": "每年下载",
    "best_month": "最佳：{m}（{n}）",
    "h_genres": "按风格",
    "h_sources": "来源",
    "h_festivals": "热门音乐节",
    "editions": {
      "other": "{n} 届"
    },
    "festivals_other": "+ 另外 {f} 个音乐节的 {n} 个混音",
    "no_festivals": "此时间段没有音乐节混音 – 由 设置 › 音乐节与系列 进行归类。",
    "h_djs": "热门 DJ",
    "open_dj": "打开 {name} 的 DJ 页面",
    "no_djs": "此时间段未识别到 DJ。",
    "h_years": "按混音年份",
    "year_unknown": "{n} 个年份未知",
    "h_tracks": "最常播放的曲目",
    "no_tracks": "还没有曲目出现在两个混音中 – 曲目列表来自章节和描述（媒体库 › 曲目）。",
    "h_watchlist": "监视列表活动",
    "w_checks": "检查",
    "w_scheduled": "其中计划任务",
    "w_found": "找到",
    "w_inbox": "收件箱中",
    "w_library": "媒体库中",
    "w_source": "来源",
    "w_found_n": "找到 {n} 个",
    "w_checks_n": "{n} 次检查",
    "w_last": "最近检查 {t}",
    "w_none_range": "此时间段没有来源找到内容。",
    "w_no_sources": "监视列表中还没有来源。",
    "none": "此时间段没有内容。",
    "range_empty": "此时间段没有下载任何内容 – 请选择更长的范围。",
    "error": "统计不可用",
    "empty_title": "还没有混音",
    "empty_text": "媒体库中一有混音，你就能在这里看到收藏的内容 – 风格、音乐节、DJ、时长。",
    "empty_go": "发现混音"
  },
  "reupload": {
    "tag": "重复上传？",
    "tag_title": "可能是“{title}”的重复上传（{p}，{score}% 匹配）– 点击做决定",
    "linked": "同一混音",
    "linked_title": "已关联为与“{title}”（{p}）相同的混音",
    "chip": "重复上传（{n}）",
    "chip_title": "只显示标记为可能重复上传的 Set",
    "menu_head": "可能是“{title}”的重复上传 · {score}%",
    "menu_head_linked": "与“{title}”是同一混音",
    "keep": "两个都保留",
    "link": "关联为同一混音",
    "undo": "撤销决定",
    "show_original": "显示原始文件",
    "delete_new": "删除这个较新的文件",
    "toast_keep": "两个都已保留 – 标记已移除",
    "toast_link": "已关联为同一混音",
    "toast_open": "决定已撤销",
    "toast_found": "可能是重复上传：“{title}”与“{of}”匹配 – 请查看媒体库",
    "dl_notice": "最近的下载中可能是你已有 Set 的重复上传（{n}）：",
    "review": "在媒体库中查看",
    "adopt": "原文件缺失 – 保留此副本",
    "toast_adopt": "此副本现已替代缺失的原文件",
    "original_missing_head": "原文件缺失 – 这是最后一个副本，无法在此删除",
    "original_unknown_head": "目标文件夹无法访问 – 无法检查原文件"
  },
  "catchup": {
    "cancel": "停止后台补全",
    "tip": "媒体库中的旧条目会在后台离线处理。停止后，下次启动时继续。",
    "step": {
      "festivals": "正在分配音乐节",
      "tracklists": "正在读取曲目列表",
      "analysis": "正在分析响度",
      "fingerprints": "音频指纹"
    }
  }
});
