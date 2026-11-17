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
    "settings": "设置"
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
    "clock": "点"
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
    "sc_off": "SoundCloud 已关闭 – 请在 设置 › SoundCloud 中开启。"
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
    "backoff_tip": "{p}：退避至 {t}（剩余 {rest}）"
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
    "select": "选择",
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
    "preview_title": "SoundCloud 只为此曲目提供 30 秒试听（Go+），无法下载。"
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
    "none_year": "没有 {year} 年的结果。请重新搜索，使年份包含在搜索词中 – 或更改年份。"
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
    "hint_channel": "YouTube 频道（…/@name 或 …/channel/UC…，可加 /videos 或 /streams）或 SoundCloud 个人主页（soundcloud.com/name）。",
    "hint_playlist": "带“list=…”的 YouTube 播放列表或 SoundCloud 合集（soundcloud.com/name/sets/set）。检查最新的条目。",
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
    "form_error": "无法保存来源。"
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
    "local_link_error": "维护"
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
    "group": "按流派",
    "group_title": "按流派分组",
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
    "none_text": "没有符合搜索和筛选条件的条目。"
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
    "external": "正在用默认播放器打开…"
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
    "maintenance": "维护"
  },
  "tabs_hint": {
    "general": "应用的基本行为。",
    "filters": "搜索和关注列表的默认筛选。可在“发现”的筛选面板中临时覆盖。",
    "genres": "顺序即优先级。标题中最先出现其关键词的流派胜出。手动设置的流派和来源的默认流派优先。",
    "download": "YouTube 通常提供约 130–160 kbps 的 Opus。MP3 是转换结果，音质不会比源文件更好 – 但到处都能播放。",
    "storage": "文件存放位置及命名方式。该结构适用于 Plex、Jellyfin 等媒体服务器。",
    "throttle": "限制对 YouTube 的负载。这些值同时适用于搜索、关注列表和下载。SoundCloud 在“SoundCloud”标签页中有自己的值。",
    "soundcloud": "将 SoundCloud 作为搜索、关注列表和下载的第二来源 – 拥有独立的限制、计数器和退避，与 YouTube 互不影响。",
    "network": "PO-Token 可将请求标识为真实浏览器，降低被机器人拦截的风险。",
    "schedule": "关注列表何时自动检查 – 在应用内以及通过 Windows 任务计划程序。",
    "appearance": "外观与体验。更改会即时预览，保存后才会永久生效。",
    "maintenance": "版本、更新、数据库。"
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
      "database": "数据库",
      "reset": "重置"
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
      }
    },
    "path_preview": {
      "label": "预览",
      "help": "点击占位符可将其插入路径模式。"
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
      "sc_off_detail": "不进行 SoundCloud 搜索、关注列表检查和 SoundCloud 下载。"
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
    "reset_all": "所有设置已重置"
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
    "unverified": "无校验和（仅校验了 ZIP 完整性）"
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
  }
});
