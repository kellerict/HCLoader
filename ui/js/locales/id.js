/* HCLoader UI texts – Indonesian.
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "id", "name": "Bahasa Indonesia", "dir": "ltr", "intl": "id-ID"}, {
 "app": {
  "title": "HCLoader",
  "tagline": "ARSIP MUSIK KERAS",
  "mock": "MODE UJI COBA"
 },
 "nav": {
  "discover": "Temukan",
  "inbox": "Kotak masuk",
  "watchlist": "Daftar pantau",
  "downloads": "Unduhan",
  "library": "Pustaka",
  "log": "Log",
  "settings": "Pengaturan"
 },
 "navfoot": {
  "today": "HARI INI",
  "next": "PEMERIKSAAN BERIKUTNYA"
 },
 "common": {
  "ok": "OK",
  "cancel": "Batal",
  "save": "Simpan",
  "delete": "Hapus",
  "edit": "Ubah",
  "remove": "Buang",
  "reset": "Setel ulang",
  "on": "aktif",
  "off": "nonaktif",
  "current": "saat ini",
  "loading": "memuat …",
  "add_chip": "+ tambah",
  "empty": "“kosong”",
  "empty_list": "“tidak ada”"
 },
 "fmt": {
  "today": "hari ini",
  "yesterday": "kemarin",
  "never": "belum pernah",
  "no_date": "Tanggal tidak diketahui",
  "just_now": "baru saja",
  "today_at": "hari ini {t}",
  "tomorrow_at": "besok {t}",
  "yesterday_at": "kemarin {t}",
  "views": {
   "other": "{v} tayangan"
  }
 },
 "unit": {
  "s": "dtk",
  "h": "j",
  "minutes": "menit",
  "mbs": "MB/dtk",
  "bpm": "BPM",
  "chars": "karakter",
  "results": "hasil",
  "entries": "entri",
  "clock": "pukul",
  "req_h": "perm./jam"
 },
 "range": {
  "ge_sleep": "≥ minimum",
  "ge_initial": "≥ nilai awal"
 },
 "status": {
  "new": "Baru",
  "inbox": "Di kotak masuk",
  "queued": "Antre",
  "downloading": "Mengunduh",
  "done": "Terunduh",
  "ignored": "Diabaikan",
  "failed": "Galat"
 },
 "period": {
  "all": "Semua",
  "7d": "7 hari terakhir",
  "30d": "30 hari terakhir",
  "1y": "12 bulan terakhir",
  "year": "Tahun tertentu",
  "custom": "Kustom"
 },
 "source_type": {
  "channel": "Kanal",
  "playlist": "Playlist",
  "search": "Pencarian"
 },
 "platform": {
  "youtube": "YouTube",
  "soundcloud": "SoundCloud",
  "label": "Platform",
  "sc_off": "SoundCloud dinonaktifkan – aktifkan di Pengaturan › SoundCloud."
 },
 "genre": {
  "change": "Ubah genre",
  "manual": "Genre diatur manual",
  "change_manual": "Ubah genre (diatur manual)"
 },
 "run_kind": {
  "watchlist": "Daftar pantau",
  "headless": "Penjadwal Tugas",
  "manual": "Manual"
 },
 "phase": {
  "waiting": "Menunggu",
  "sleep": "Jeda hingga unduhan berikutnya",
  "download": "Mengunduh",
  "convert": "Mengonversi",
  "tag": "Menandai",
  "failed": "Gagal"
 },
 "po_mode": {
  "off": "Nonaktif",
  "script": "Skrip",
  "http": "HTTP"
 },
 "po_mode_long": {
  "off": "Nonaktif",
  "script": "Skrip (Deno)",
  "http": "Server HTTP (lokal)"
 },
 "statusbar": {
  "ok": "OK",
  "missing": "tidak ada",
  "po": "PO-Token",
  "po_active": "aktif ({mode})",
  "po_inactive": "nonaktif",
  "po_error": "Galat",
  "backoff": "Backoff",
  "backoff_none": "tidak ada",
  "backoff_until": "hingga {t} · sisa {rest}",
  "queue": "Antrean",
  "queue_empty": "kosong",
  "queue_active": "aktif",
  "queue_paused": "dijeda",
  "today": "Hari ini",
  "next": "Pemeriksaan berikutnya",
  "next_off": "nonaktif",
  "backoff_until_short": "hingga {t}",
  "sc_backoff": "Backoff hingga {t}",
  "sc_today": "{n} / {max}",
  "yt_tip": "YouTube · terunduh hari ini {day}/{day_max} · {s}/{s_max} pencarian jam ini",
  "sc_tip": "SoundCloud · terunduh hari ini {day}/{day_max} · {s}/{s_max} pencarian jam ini",
  "backoff_tip": "{p}: backoff hingga {t} (sisa {rest})"
 },
 "schedule": {
  "due": "jatuh tempo",
  "kind_app": "Aplikasi",
  "kind_task": "Tugas",
  "tip_app": "Pemeriksaan daftar pantau berikutnya di aplikasi: {t} (selama HCLoader berjalan).",
  "tip_task": "Pemeriksaan daftar pantau berikutnya lewat Penjadwal Tugas Windows: {t}.",
  "tip_any": "Pemeriksaan daftar pantau berikutnya: {t}.",
  "tip_off": "Tidak ada pemeriksaan otomatis – baik di aplikasi maupun lewat Penjadwal Tugas Windows.",
  "tip_backoff": "Tidak ada pemeriksaan selama backoff aktif."
 },
 "card": {
  "source": "Ditemukan lewat sumber daftar pantau “{name}”",
  "select": "Pilih",
  "open": "Buka di {p}",
  "ignore": "Abaikan",
  "unignore": "Berhenti mengabaikan",
  "more": "Tindakan lainnya",
  "download": "Unduh",
  "watch": "Tambahkan kanal ke daftar pantau",
  "block": "Blokir kanal",
  "set_genre": "Atur genre",
  "date_approx": "Tanggal perkiraan – pencarian YouTube hanya memberi “X tahun lalu”",
  "date_unknown": "Tanggal unggah tidak tersedia",
  "duplicate": "Kemungkinan sudah diunduh ({p})",
  "duplicate_title": "Judul sangat mirip dan durasi sama dengan “{title}” dari {p} – sudah diunduh atau diantrekan di sana. Anda tetap bisa mengunduhnya.",
  "preview": "Hanya pratinjau (Go+) – tidak dapat diunduh",
  "preview_title": "SoundCloud hanya menyediakan pratinjau 30 detik (Go+) untuk trek ini. Trek ini tidak dapat diunduh."
 },
 "discover": {
  "placeholder": "Cari mix, live set, DJ, acara …",
  "search": "Cari",
  "searching_btn": "Mencari …",
  "searching": "Mencari – kueri ringan, hemat beban YouTube …",
  "sort": "Urutkan",
  "sort_rel": "Relevansi",
  "sort_date": "Terbaru dulu",
  "sort_dur": "Terpanjang dulu",
  "sort_views": "Tayangan terbanyak",
  "quota": "Pencarian jam ini: {n} / {max}",
  "quota_sc": "Pencarian SoundCloud jam ini: {n} / {max}",
  "placeholder_sc": "Cari di SoundCloud: mix, set, DJ, podcast …",
  "platform_title": "Tempat mencari",
  "searching_sc": "Mencari – kueri ringan, hemat beban SoundCloud …",
  "ready_text_sc": "Masukkan kata kunci lalu tekan Enter untuk mencari di SoundCloud.",
  "previews": "{n} hanya pratinjau (Go+)",
  "previews_title": "Pratinjau Go+ tidak pernah bisa diunduh. Terlihat saat “Sembunyikan yang terunduh & diabaikan” nonaktif.",
  "filters": "Filter",
  "toggle_filters": "Tampilkan/sembunyikan panel filter",
  "f_duration": "Durasi (menit)",
  "f_min": "Minimum",
  "f_max": "Maksimum (kosong = tanpa batas)",
  "f_max_ph": "maks",
  "f_period": "Periode unggah",
  "f_year": "Tahun",
  "f_year_prev": "Mundur satu tahun",
  "f_year_next": "Maju satu tahun",
  "f_from": "Dari",
  "f_to": "Sampai",
  "f_hint_year": "Pencarian YouTube hanya memberi tanggal perkiraan (“13 tahun lalu”). Karena itu toleransi ±1 tahun berlaku – begitu juga setiap mix dengan “{year}” di judulnya.",
  "f_hint_custom": "Pencarian YouTube hanya memberi tanggal perkiraan. Untuk tanggal perkiraan, toleransi ±1 tahun berlaku di kedua ujung.",
  "chip_title": "Klik: tampilkan/sembunyikan genre · Klik dua kali: hanya genre ini (istilahnya ditambahkan ke pencarian)",
  "scope": "Pencarian diperluas dengan",
  "scope_title": "Pencarian berikutnya menambahkan istilah ini ke teks pencarian Anda.",
  "searched": "Dicari dengan",
  "stale": "Filter berubah sejak",
  "re_search": "Cari lagi",
  "re_search_title": "Hasil berasal dari pencarian terakhir. Cari lagi agar genre dan tahun ikut dalam kata kunci (dihitung sebagai satu pencarian).",
  "need_query": "Masukkan kata kunci terlebih dahulu.",
  "f_inc": "Kata kunci wajib",
  "f_exc": "Kata kunci pengecualian",
  "f_show": "Tampilan",
  "f_hide": "Sembunyikan yang terunduh & diabaikan",
  "f_blacklist": "Terapkan daftar hitam kanal",
  "count": {
   "other": "{n} hasil · {hidden} disaring"
  },
  "selected": "{n} dipilih",
  "select_all": "Pilih semua",
  "download_sel": "Unduh pilihan",
  "ready_title": "Siap",
  "ready_text": "Masukkan kata kunci lalu tekan Enter.",
  "none_title": "Tidak ada hasil",
  "none_text": "Longgarkan filter atau coba kata kunci lain.",
  "none_year": "Tidak ada hasil dari {year}. Cari lagi agar tahun ikut dalam kata kunci – atau ubah tahunnya."
 },
 "inbox": {
  "title": "Kotak masuk",
  "sub": "Temuan baru dari daftar pantau yang lolos semua filter",
  "sub_n": {
   "other": "{n} temuan baru dari daftar pantau yang lolos semua filter"
  },
  "ignore_all": "Abaikan semua",
  "download_all": "Unduh semua",
  "ignore_sel": "Abaikan pilihan",
  "download_sel": "Unduh pilihan",
  "select_all": "Pilih semua",
  "select_none": "Hapus pilihan",
  "src_all": "Semua sumber",
  "src_none": "Tanpa sumber",
  "src_title": "Hanya tampilkan temuan dari sumber ini",
  "count": {
   "other": "{n} temuan"
  },
  "count_of": "{n} dari {total} temuan",
  "selected": "{n} dipilih",
  "empty_title": "Kotak masuk kosong",
  "empty_text": "Daftar pantau belum menemukan mix baru.",
  "empty_nosrc": "Belum ada sumber di daftar pantau – tambahkan kanal, playlist, atau pencarian dan mix baru akan masuk ke sini.",
  "empty_next": "Pemeriksaan berikutnya: {t}.",
  "to_watchlist": "Ke daftar pantau"
 },
 "watchlist": {
  "title": "Daftar pantau",
  "sub_n": {
   "other": "{n} sumber · {active} aktif"
  },
  "sub_next": "pemeriksaan berikutnya {t}",
  "add": "Sumber",
  "check_all": "Periksa semua sekarang",
  "check": "Periksa",
  "checking": "memeriksa …",
  "queued": "menunggu …",
  "running": "Memeriksa …",
  "running_n": "Memeriksa {i} / {n} …",
  "col_active": "Aktif",
  "col_name": "Nama",
  "col_type": "Jenis",
  "col_genre": "Genre",
  "col_auto": "Temuan baru",
  "col_max": "Maks.",
  "col_last": "Terakhir diperiksa",
  "col_new": "Baru",
  "genre_auto": "otomatis",
  "genre_auto_long": "Otomatis (dari kata kunci)",
  "auto_on": "unduh",
  "auto_off": "kotak masuk",
  "auto_title_on": "Temuan baru diunduh otomatis",
  "auto_title_off": "Temuan baru hanya masuk ke kotak masuk",
  "new_title": "Tampilkan di kotak masuk",
  "check_title": "Periksa sumber ini sekarang",
  "why_off": "Sumber tidak aktif",
  "why_running": "Pemeriksaan sedang berjalan",
  "why_backoff": "Backoff aktif – pemeriksaan diblokir",
  "why_backoff_p": "Backoff ({p}) aktif – pemeriksaan diblokir",
  "why_sc_off": "SoundCloud dinonaktifkan",
  "error_title": "Pemeriksaan terakhir gagal",
  "backoff": "<b>Backoff aktif hingga {t}</b> (sisa {rest}). Daftar pantau tidak dapat diperiksa – pemeriksaan terjadwal juga dijeda.",
  "backoff_p": "<b>Backoff ({p}) aktif hingga {t}</b> (sisa {rest}). Sumber {p} dilewati hingga saat itu – {other} tetap berjalan.",
  "backoff_link_sc": "Buka SoundCloud",
  "backoff_link": "Buka Pembatasan",
  "none_active": "Tidak ada sumber aktif untuk diperiksa",
  "empty_title": "Tidak ada sumber",
  "empty_text": "Tambahkan kanal, playlist, atau pencarian tersimpan.",
  "add_title": "Tambah sumber",
  "edit_title": "Ubah sumber",
  "f_type": "Jenis",
  "f_name": "Nama",
  "f_url": "URL",
  "f_query": "Kata kunci",
  "f_genre": "Genre bawaan",
  "f_max": "Maks. entri",
  "f_newest_last": "Yang terbaru di bagian akhir (baca playlist dari belakang)",
  "hint_newest_last": "Pada banyak playlist, YouTube menambahkan video baru di bagian akhir. Membaca seluruh playlist (sekitar 1 permintaan per 100 video, maks. 2000 entri).",
  "rev_title": "Yang terbaru di bagian akhir – playlist dibaca dari belakang",
  "rev_short": "dari belakang",
  "f_enabled": "Aktif – ikutkan di “Periksa semua” dan di jadwal",
  "f_hits": "Temuan baru",
  "hits_inbox": "Ke kotak masuk",
  "hits_auto": "Unduh otomatis",
  "hint_inbox": "Temuan menunggu di kotak masuk hingga Anda mengunduh atau mengabaikannya.",
  "hint_auto": "Temuan yang lolos semua filter langsung masuk ke antrean.",
  "hint_channel": "Kanal YouTube (…/@nama atau …/channel/UC…, opsional /videos atau /streams) atau profil SoundCloud (soundcloud.com/nama).",
  "hint_playlist": "Playlist YouTube dengan “list=…” atau set SoundCloud (soundcloud.com/nama/sets/set). Entri terbaru yang diperiksa.",
  "f_platform": "Cari di",
  "detected": "terdeteksi: {p} · {type}",
  "not_detected": "URL tidak dikenali",
  "suggested": "Saran",
  "suggested_title": "Disarankan dari URL. Jika dibiarkan, pemeriksaan pertama menggantinya dengan nama asli – atau timpa saja.",
  "hint_name_auto": "Disarankan dari URL – silakan ubah. Jika tidak diubah, pemeriksaan pertama menetapkan nama asli.",
  "hint_name_later": "Nama ditetapkan oleh pemeriksaan pertama – atau isi sendiri di sini.",
  "name_auto_title": "Nama sementara – pemeriksaan berikutnya menetapkan nama asli",
  "hint_search": "Pencarian tersimpan, seperti di “Temukan” – dihitung sebagai satu pencarian per pemeriksaan.",
  "hint_max": "per pemeriksaan",
  "max_default": "(bawaan)",
  "max_default_title": "Tanpa nilai sendiri: berlaku “Entri per sumber” dari Pengaturan › Jadwal",
  "max_title": "Kosong = bawaan dari Pengaturan › Jadwal. Paling banyak 200, 100 untuk sumber pencarian.",
  "ph_name": "mis. Gabber Vault",
  "ph_name_later": "ditetapkan oleh pemeriksaan pertama",
  "ph_channel": "https://www.youtube.com/@kanal  atau  https://soundcloud.com/nama",
  "ph_playlist": "https://www.youtube.com/playlist?list=…  atau  https://soundcloud.com/nama/sets/…",
  "ph_search": "mis. frenchcore liveset",
  "form_error": "Sumber tidak dapat disimpan."
 },
 "downloads": {
  "title": "Unduhan",
  "sub": "Berurutan, satu unduhan pada satu waktu",
  "pause": "Jeda",
  "resume": "Lanjutkan",
  "cancel": "Batalkan",
  "retry": "Coba lagi",
  "remove": "Buang",
  "up": "Naikkan",
  "down": "Turunkan",
  "eta": "Perkiraan",
  "position": "Posisi {n}",
  "sleep_left": "lanjut dalam",
  "sleep_why": "Pembatasan: jeda acak {min}–{max} dtk antara dua unduhan",
  "next_up": "Berikutnya",
  "sleeping": "Jeda",
  "sleep_range": "dari {min}–{max} dtk",
  "blocked_wait": "Menunggu – {why}",
  "why_backoff": "Backoff",
  "why_day": "Batas harian",
  "why_run": "Batas sesi",
  "why_paused": "dijeda",
  "why_restart": "Perlu mulai ulang",
  "why_busy": "sesi lain sedang aktif",
  "why_pot": "Server PO-Token belum siap",
  "why_target": "Folder tujuan tidak terjangkau",
  "why_error": "Modul unduhan tidak ada",
  "summary": "Hari ini {day}/{day_max} · Sesi {run}/{run_max}",
  "summary_sc": "SoundCloud {day}/{day_max}",
  "platform_blocked": "{reason}",
  "platform_other": "{p} tetap mengunduh.",
  "steps": "Unduh · Konversi · Tandai",
  "unlimited": "tanpa batas",
  "l_run": "Sesi ini",
  "l_day": "Hari ini",
  "l_rate": "Batas kecepatan",
  "l_sleep": "Jeda antar unduhan",
  "sec_queue": "Antrean",
  "sec_failed": "Gagal",
  "empty_title": "Antrean kosong",
  "empty_text": "Pilih mix di “Temukan” atau di “Kotak masuk”.",
  "paused": "<b>Antrean dijeda.</b> Unduhan saat ini dihentikan hingga Anda melanjutkan.",
  "backoff": "<b>Backoff aktif hingga {t}</b> (sisa {rest}). Unduhan, pencarian, dan daftar pantau diblokir.",
  "backoff_rest": {
   "other": "<b>Backoff aktif hingga {t}</b> (sisa {rest}). Unduhan, pencarian, dan daftar pantau diblokir – {n} tetap di antrean."
  },
  "limit_day": "<b>Batas harian tercapai ({n}/{max}).</b> Sisanya tetap di antrean dan berlanjut besok.",
  "limit_day_rest": {
   "other": "<b>Batas harian tercapai ({n}/{max}).</b> {rest} tetap di antrean dan berlanjut besok."
  },
  "limit_run": "<b>Batas tercapai – {max}/{max} dalam sesi ini.</b> Sisanya tetap di antrean dan berlanjut di sesi berikutnya.",
  "limit_run_rest": {
   "other": "<b>Batas tercapai – {max}/{max} dalam sesi ini.</b> {rest} tetap di antrean dan berlanjut di sesi berikutnya."
  },
  "limits_link": "Ubah batas",
  "new_run": "Mulai sesi baru",
  "need_restart": "<b>Perlu mulai ulang.</b> yt-dlp telah diperbarui – mulai ulang HCLoader. Antrean tetap tersimpan.",
  "busy": "Sesi unduhan lain sedang aktif (mis. pemeriksaan terjadwal). Antrean menunggu hingga selesai.",
  "local_pot": {
   "other": "<b>Server PO-Token belum siap.</b> {rest} tetap di antrean dan berlanjut begitu server berjalan."
  },
  "local_target": {
   "other": "<b>Folder tujuan tidak terjangkau atau tidak dapat ditulis.</b> {rest} tetap di antrean dan berlanjut begitu tersedia lagi."
  },
  "local_error": {
   "other": "<b>Modul unduhan (yt-dlp) tidak dapat dimuat.</b> {rest} tetap di antrean. Percobaan berikutnya setelah “Lanjutkan”, entri baru, atau menyimpan pengaturan."
  },
  "local_link_pot": "Pengaturan jaringan",
  "local_link_target": "Ubah lokasi penyimpanan",
  "local_link_error": "Pemeliharaan"
 },
 "library": {
  "title": "Pustaka",
  "sub": {
   "other": "{n} mix"
  },
  "sub_shown": "{n} dari {total} ditampilkan",
  "search": "Judul, kanal, atau jalur …",
  "all_genres": "Semua genre",
  "all_channels": "Semua kanal",
  "all_years": "Semua tahun",
  "f_genre": "Genre",
  "f_channel": "Kanal",
  "f_year": "Tahun",
  "f_sort": "Urutkan",
  "sort_newest": "Terbaru dulu",
  "sort_title": "Judul A–Z",
  "sort_channel": "Kanal A–Z",
  "sort_duration": "Terpanjang dulu",
  "view_list": "Daftar",
  "view_grid": "Kotak",
  "clear": "Setel ulang filter",
  "col_title": "Judul",
  "col_channel": "Kanal",
  "col_genre": "Genre",
  "col_year": "Tahun",
  "col_duration": "Durasi",
  "col_size": "Ukuran",
  "col_loaded": "Diunduh",
  "play": "Putar",
  "pause": "Jeda",
  "play_external": "Buka di pemutar bawaan",
  "play_internal": "Putar di pemutar aplikasi",
  "play_missing": "File tidak ada – tidak dapat diputar",
  "more": "Tampilkan {n} lagi",
  "now_playing": "Sedang diputar",
  "retag_short": "Tandai ulang",
  "genre_working": "Mengatur genre …",
  "open_folder": "Buka folder",
  "retag": "Tandai ulang (tag, sampul, dan lokasi sesuai pengaturan saat ini)",
  "delete": "Hapus file",
  "remove": "Buang entri",
  "retagging": "Menandai ulang …",
  "cue_title": "Daftar trek sebagai file .cue di samping MP3",
  "missing": "File tidak ada",
  "missing_title": "File tidak ditemukan di lokasi tersimpan (dipindah atau dihapus?)",
  "missing_chip": {
   "other": "{n} hilang"
  },
  "missing_chip_title": "Hanya tampilkan entri yang filenya hilang",
  "stat_count": "Mix",
  "stat_duration": "Total durasi",
  "stat_size": "Ukuran",
  "stat_genres": "Per genre",
  "unit_h": "j",
  "unit_min": "mnt",
  "unit_gb": "GB",
  "unit_mb": "MB",
  "unit_kb": "KB",
  "group_meta": {
   "other": "{n} mix · {dur}"
  },
  "empty_title": "Belum ada yang diunduh",
  "empty_text": "Setiap mix masuk ke sini begitu diunduh dan ditandai – lengkap dengan sampul, genre, dan lokasi.",
  "empty_discover": "Temukan mix",
  "empty_watchlist": "Atur daftar pantau",
  "target_down": "Folder tujuan tidak terjangkau: {path}",
  "target_down_hint": "Periksa drive atau folder jaringan. Selama tidak tersedia, kondisi file tidak diketahui: “Tandai ulang” dan “Buang entri” dinonaktifkan.",
  "unknown_title": "Folder tujuan tidak terjangkau – kondisi file tidak diketahui",
  "none_title": "Tidak ada hasil",
  "none_text": "Tidak ada entri yang cocok dengan pencarian dan filter.",
  "group_by": "Kelompokkan",
  "group_none": "Tidak",
  "group_genre": "Genre",
  "group_festival": "Festival",
  "group_artist": "Artis",
  "group_year": "Tahun",
  "group_unknown": "Tidak diketahui"
 },
 "player": {
  "label": "Pemutar mini",
  "play": "Putar (Spasi)",
  "pause": "Jeda (Spasi)",
  "back": "Mundur 30 detik",
  "fwd": "Maju 30 detik",
  "prev": "Trek sebelumnya",
  "next": "Trek berikutnya",
  "seek": "Posisi",
  "mute": "Bisukan",
  "unmute": "Bunyikan",
  "volume": "Volume",
  "close": "Tutup pemutar",
  "tracks": "Daftar trek",
  "tracks_n": {
   "other": "{n} trek"
  },
  "tracks_toggle": "Tampilkan/sembunyikan daftar trek",
  "no_tracks": "Tidak ada bab di file ini",
  "total": "Total durasi {t}",
  "keys": "Spasi: putar/jeda · ←/→: 10 dtk",
  "err_load": "Tidak dapat diputar",
  "err_src": "Tidak dapat diputar: alamat file tidak valid",
  "err_play": "File tidak dapat diputar: {title}",
  "external": "Membuka di pemutar bawaan …"
 },
 "log": {
  "title": "Log",
  "sub": "Log langsung dan riwayat sesi",
  "live": "Log langsung",
  "history": "Riwayat sesi",
  "lvl_debug": "Debug",
  "lvl_info": "Info",
  "lvl_warn": "Peringatan",
  "lvl_error": "Galat",
  "lvl_title": "Tampilkan/sembunyikan level “{lvl}”",
  "search": "Cari di log …",
  "following": "Langsung",
  "paused": "Dijeda",
  "follow_title": "Gulir otomatis ke baris terbaru (berhenti saat menggulir ke atas)",
  "jump": "Ke akhir",
  "jump_new": {
   "other": "{n} baris baru"
  },
  "copy": "Salin",
  "copy_title": "Salin baris yang terlihat ke papan klip",
  "open_logs": "Folder log",
  "open_logs_title": "Buka folder berisi file log lengkap",
  "lines": {
   "other": "{n} baris"
  },
  "lines_of": "{n} dari {total} baris",
  "empty": "Tidak ada baris untuk level ini.",
  "empty_search": "Tidak ada baris yang memuat “{q}”.",
  "no_runs": "Belum ada sesi.",
  "no_runs_kind": "Tidak ada sesi jenis ini.",
  "found": "ditemukan",
  "downloaded": "terunduh",
  "errors": "galat",
  "running": "berjalan …",
  "kind_all": "Semua",
  "timeline": "Linimasa",
  "table": "Tabel",
  "view_title": "Tampilan riwayat sesi",
  "col_kind": "Jenis",
  "col_start": "Mulai",
  "col_duration": "Durasi",
  "col_found": "Ditemukan",
  "col_downloaded": "Terunduh",
  "col_errors": "Galat",
  "col_note": "Catatan",
  "backoff": "Backoff",
  "runs_sum": {
   "other": "{n} sesi · {dl} terunduh · {err} galat"
  },
  "today": "Hari ini",
  "yesterday": "Kemarin"
 },
 "settings": {
  "title": "Pengaturan",
  "sub": "Semua yang dilakukan aplikasi dapat diatur di sini"
 },
 "tabs": {
  "general": "Umum",
  "filters": "Filter & kata kunci",
  "genres": "Genre",
  "download": "Unduhan & kualitas",
  "storage": "Penyimpanan & tag",
  "throttle": "Pembatasan",
  "soundcloud": "SoundCloud",
  "network": "Jaringan & PO-Token",
  "schedule": "Jadwal",
  "appearance": "Tampilan",
  "maintenance": "Pemeliharaan",
  "festivals": "Festival & seri"
 },
 "tabs_hint": {
  "general": "Perilaku dasar aplikasi.",
  "filters": "Filter bawaan untuk pencarian dan daftar pantau. Dapat diganti sementara di panel filter pada “Temukan”.",
  "genres": "Urutan = prioritas. Genre pertama yang kata kuncinya muncul di judul menang. Genre yang diatur manual dan genre bawaan sumber didahulukan.",
  "download": "YouTube biasanya menyajikan Opus sekitar 130–160 kbps. MP3 adalah hasil konversi dan tidak terdengar lebih baik dari sumbernya – tetapi bisa diputar di mana saja.",
  "storage": "Ke mana file disimpan dan bagaimana penamaannya. Strukturnya dirancang untuk server media seperti Plex atau Jellyfin.",
  "throttle": "Membatasi beban pada YouTube. Nilai ini berlaku untuk pencarian, daftar pantau, dan unduhan sekaligus. SoundCloud punya nilai sendiri di tab “SoundCloud”.",
  "soundcloud": "SoundCloud sebagai sumber kedua untuk pencarian, daftar pantau, dan unduhan – dengan batas, penghitung, dan backoff sendiri, terpisah dari YouTube.",
  "network": "PO-Token menandai permintaan sebagai browser sungguhan dan menurunkan risiko pemblokiran bot.",
  "schedule": "Kapan daftar pantau diperiksa otomatis – di aplikasi dan lewat Penjadwal Tugas Windows.",
  "appearance": "Tampilan & nuansa. Perubahan langsung dipratinjau dan baru permanen setelah disimpan.",
  "maintenance": "Versi, pembaruan, basis data.",
  "festivals": "Mengenali festival atau seri, tahun, panggung, dan jenis set dari judul yang tersimpan – luring, tanpa satu pun permintaan tambahan."
 },
 "set": {
  "default": "Bawaan",
  "range": "Rentang",
  "browse": "Telusuri",
  "not_set": "belum diatur",
  "saving": "Menyimpan …",
  "discard": "Buang",
  "tab_reset": "Setel ulang tab",
  "tab_reset_title": "Kembalikan semua kolom tab ini ke bawaan (berlaku setelah “Simpan”)",
  "state_clean": "Semua tersimpan",
  "state_dirty": {
   "other": "{n} perubahan belum disimpan"
  },
  "state_errors": {
   "other": "{n} galat – mohon perbaiki"
  },
  "h": {
   "collector": "Kolektor festival",
   "search": "Pencarian",
   "duration": "Durasi & periode",
   "keywords": "Kata kunci",
   "display": "Tampilan",
   "cover": "Sampul",
   "chapters": "Bab & daftar trek",
   "tags": "Tag",
   "soundcloud": "SoundCloud",
   "playback": "Pemutaran",
   "pauses": "Jeda & bandwidth",
   "limits": "Batas",
   "backoff": "Backoff saat diblokir",
   "po": "Penyedia PO-Token",
   "fallback": "Solusi sementara",
   "in_app": "Di aplikasi",
   "task": "Penjadwal Tugas Windows",
   "updates": "Pembaruan",
   "app_update": "Pembaruan aplikasi",
   "release_notes": "Catatan rilis",
   "database": "Basis data",
   "reset": "Setel ulang",
   "detection": "Deteksi",
   "series": "Seri",
   "backfill": "Baca semua (sekali)"
  },
  "general": {
   "language": {
    "label": "Bahasa",
    "help": "Bahasa antarmuka dan pesan. “Otomatis” mengikuti bahasa tampilan Windows (jika tidak, Inggris). Tampilan dibangun ulang tepat setelah disimpan."
   },
   "start_view": {
    "label": "Tampilan awal",
    "help": "Tampilan yang dibuka setelah aplikasi dimulai."
   },
   "log_level": {
    "label": "Level log",
    "help": "Seberapa rinci file log dan log langsung. DEBUG hanya untuk pemecahan masalah."
   },
   "confirm_delete": {
    "label": "Konfirmasi penghapusan",
    "help": "Tanya dulu sebelum menghapus mix dari pustaka (entri + file)."
   }
  },
  "player": {
   "mode": {
    "label": "Putar dengan",
    "help": "Yang dipakai oleh ▶ di pustaka. Pemutar bawaan aplikasi menampilkan bab sebagai penanda lompat dan terus memutar saat Anda berpindah tampilan. Opsi lainnya tersedia per entri di menu."
   }
  },
  "search": {
   "results_count": {
    "label": "Hasil per pencarian",
    "help": "Jumlah hasil yang diambil satu pencarian (ringan). Lebih banyak hasil = lebih banyak beban pada YouTube."
   },
   "append_year": {
    "label": "Tambahkan tahun ke pencarian",
    "help": "Dengan periode unggah “Tahun tertentu”, tahun ditambahkan ke kata kunci (mis. “hardcore liveset 2013”). Dengan cara ini YouTube menemukan lebih banyak mix dari tahun itu."
   }
  },
  "filters": {
   "min_duration": {
    "label": "Panjang minimum",
    "help": "Video yang lebih pendek tidak pernah dianggap sebagai mix."
   },
   "max_duration": {
    "label": "Panjang maksimum",
    "help": "0 = tanpa batas."
   },
   "upload_period": {
    "label": "Periode unggah",
    "help": "Unggahan mana yang ditampilkan secara bawaan. “Tahun tertentu” hanya menampilkan mix dari satu tahun, “Kustom” rentang dari/sampai."
   },
   "upload_year": {
    "label": "Tahun",
    "help": "Mix dihitung jika tahun unggah cocok atau tahun ada di judul. Pencarian YouTube hanya memberi tanggal perkiraan – di sana berlaku ±1 tahun."
   },
   "upload_from": {
    "label": "Dari",
    "help": "Tanggal unggah paling awal. Kosong = terbuka."
   },
   "upload_to": {
    "label": "Sampai",
    "help": "Tanggal unggah paling akhir. Kosong = terbuka. Untuk tanggal perkiraan, toleransi ±1 tahun berlaku di kedua ujung."
   },
   "include_keywords": {
    "label": "Kata kunci wajib",
    "help": "Minimal satu harus ada di judul. Kosong = izinkan semuanya. Enter atau koma untuk menambah."
   },
   "exclude_keywords": {
    "label": "Kata kunci pengecualian",
    "help": "Jika salah satunya muncul di judul, video dibuang."
   },
   "match_description": {
    "label": "Cari di deskripsi",
    "help": "Periksa juga kata kunci di deskripsi video. Kueri ringan sering tidak menyediakannya."
   },
   "hide_done_ignored": {
    "label": "Sembunyikan yang terunduh & diabaikan",
    "help": "Sembunyikan video yang sudah diunduh dan diabaikan dari hasil."
   },
   "apply_channel_blacklist": {
    "label": "Terapkan daftar hitam kanal",
    "help": "Jangan pernah tampilkan video dari kanal yang diblokir."
   },
   "hide_cross_platform_duplicates": {
    "label": "Sembunyikan duplikat antarplatform",
    "help": "Sembunyikan temuan yang kemungkinan sudah diunduh atau diantrekan dari platform lain (YouTube atau SoundCloud) – durasi sama (±5 dtk) dan judul sangat mirip. Nonaktif: ditampilkan dengan catatan “Kemungkinan sudah diunduh”."
   }
  },
  "blacklist": {
   "label": "Kanal yang diblokir",
   "help": "Anda memblokir kanal lewat menu kartu. Di sini Anda dapat membuka blokirnya lagi.",
   "none": "Tidak ada kanal yang diblokir",
   "unblock": "Buka blokir"
  },
  "genres": {
   "add": "Genre",
   "up": "Prioritas lebih tinggi",
   "down": "Prioritas lebih rendah",
   "delete": "Hapus genre",
   "color": "Pilih warna",
   "name_ph": "Nama",
   "kw_ph": "+ kata kunci",
   "fallback": "Cadangan – berlaku saat tidak ada kata kunci yang cocok. Selalu ada, selalu terakhir."
  },
  "download": {
   "audio_format": {
    "label": "Format keluaran",
    "help": "MP3, atau pertahankan aslinya dari YouTube tanpa konversi."
   },
   "mp3_quality": {
    "label": "Kualitas MP3",
    "help": "320 kbps CBR paling kompatibel, V0 VBR menghemat sedikit ruang."
   },
   "embed_cover": {
    "label": "Sematkan sampul",
    "help": "Tulis thumbnail, dipotong persegi, ke dalam file sebagai sampul."
   },
   "write_cover_jpg": {
    "label": "Simpan juga cover.jpg",
    "help": "Untuk server media yang membaca sampul folder."
   },
   "write_cue": {
    "label": "Tulis file .cue",
    "help": "Daftar trek dari bab atau stempel waktu di deskripsi, di samping file audio."
   },
   "write_id3_chapters": {
    "label": "Tulis bab ID3",
    "help": "Sematkan penanda bab (CHAP/CTOC) langsung di MP3."
   },
   "keep_original_soundcloud": {
    "label": "Pertahankan asli SoundCloud",
    "help": "Simpan audio SoundCloud tanpa perubahan (AAC 160 kbps sebagai .m4a, MP3 128 kbps sebagai .mp3) – tanpa konversi lossy kedua. Nonaktif: seperti “Format keluaran”."
   }
  },
  "storage": {
   "target_dir": {
    "label": "Folder tujuan",
    "help": "Akar penyimpanan musik. File sementara disimpan di “.tmp” di bawahnya. Pada versi portabel, jalur relatif seperti “.\\Music” diselesaikan relatif terhadap folder aplikasi (mis. di flashdisk)."
   },
   "path_template": {
    "label": "Pola jalur",
    "help": "Relatif terhadap folder tujuan, tanpa ekstensi file. “/” memisahkan folder. {id} wajib disertakan (untuk SoundCloud “sc-<id>”). {platform} menjadi “YouTube” atau “SoundCloud” – mis. sebagai folder teratas untuk memisahkan sumber."
   },
   "max_title_length": {
    "label": "Maks. panjang judul",
    "help": "Judul yang lebih panjang dipendekkan pada nama file."
   },
   "max_path_length": {
    "label": "Maks. panjang jalur",
    "help": "Jalur lengkap termasuk folder tujuan. Tanpa konfigurasi tambahan, Windows mengizinkan 259 karakter."
   },
   "artist_from_title": {
    "label": "Baca artis dari judul",
    "help": "Kenali pola “ARTIS @ ACARA” dan “ARTIS - JUDUL”, jika tidak gunakan nama kanal."
   },
   "title_cleanup_patterns": {
    "label": "Bersihkan judul",
    "help": "Ekspresi reguler yang kecocokannya dihapus dari judul. Enter untuk menambah.",
    "ph": "+ regex"
   },
   "album_from_edition": {
    "label": "Album = edisi",
    "help": "Menulis edisi (mis. “Defqon.1 2024”) sebagai tag album, sehingga Plex dan Jellyfin menampilkan semua set satu festival sebagai satu album. Mati: album = judul, seperti sebelumnya."
   }
  },
  "path_preview": {
   "label": "Pratinjau",
   "help": "Klik penampung untuk menyisipkannya ke pola jalur.",
   "fest": "{festival}, {event_year}, dan {stage} hanya terisi bila festival sudah ditetapkan. Jika tidak, semuanya hilang bersama pemisah yang tersisa dan folder kosong."
  },
  "throttle": {
   "sleep_requests": {
    "label": "Jeda antar permintaan",
    "help": "Waktu tunggu antar kueri metadata (pencarian, daftar pantau)."
   },
   "sleep_interval": {
    "label": "Jeda unduhan – minimum",
    "help": "Setelah tiap unduhan, jeda acak antara minimum dan maksimum menyusul."
   },
   "max_sleep_interval": {
    "label": "Jeda unduhan – maksimum",
    "help": "Batas atas jeda acak."
   },
   "limit_rate_mb": {
    "label": "Kecepatan unduh",
    "help": "Bandwidth maksimum. 0 = tanpa batas (tidak disarankan)."
   },
   "max_downloads_per_run": {
    "label": "Maks. unduhan per sesi",
    "help": "Sisanya tetap di antrean."
   },
   "max_downloads_per_day": {
    "label": "Maks. unduhan per hari",
    "help": "Penghitung mencakup unduhan manual dan otomatis sekaligus."
   },
   "max_searches_per_hour": {
    "label": "Maks. pencarian per jam",
    "help": "Melindungi dari pencarian tanpa henti yang tidak disengaja."
   },
   "backoff_initial_hours": {
    "label": "Backoff – nilai awal",
    "help": "Lama blokir setelah HTTP 429 atau “konfirmasi bahwa Anda bukan bot”."
   },
   "backoff_max_hours": {
    "label": "Backoff – maksimum",
    "help": "Lama blokir berlipat ganda pada setiap blokir berikutnya hingga nilai ini."
   }
  },
  "backoff": {
   "none": "Tidak ada backoff aktif ({p})",
   "none_detail": "Pencarian, daftar pantau, dan unduhan dari {p} diizinkan.",
   "active": "Backoff aktif ({p})",
   "active_detail": "hingga {t} · sisa {rest} · level {level}",
   "blocked": "{p} memberi sinyal blokir. Pencarian, daftar pantau, dan unduhan dari {p} diblokir hingga waktunya habis.",
   "clear": "Cabut manual",
   "sc_off": "SoundCloud dinonaktifkan",
   "sc_off_detail": "Tidak ada pencarian SoundCloud, pemeriksaan daftar pantau, maupun unduhan dari SoundCloud."
  },
  "soundcloud": {
   "enabled": {
    "label": "Gunakan SoundCloud",
    "help": "Nonaktif: tidak ada pencarian SoundCloud, tidak ada pemeriksaan sumber SoundCloud, dan tidak ada unduhan SoundCloud. Yang sudah diunduh tetap ada di pustaka."
   },
   "sleep_requests": {
    "label": "Jeda antar permintaan",
    "help": "Waktu tunggu antar kueri metadata ke SoundCloud (pencarian, daftar pantau)."
   },
   "sleep_interval": {
    "label": "Jeda unduhan – minimum",
    "help": "Setelah tiap unduhan SoundCloud, jeda acak antara minimum dan maksimum menyusul."
   },
   "max_sleep_interval": {
    "label": "Jeda unduhan – maksimum",
    "help": "Batas atas jeda acak."
   },
   "limit_rate_mb": {
    "label": "Kecepatan unduh",
    "help": "Bandwidth maksimum. 0 = tanpa batas (tidak disarankan)."
   },
   "max_downloads_per_run": {
    "label": "Maks. unduhan per sesi",
    "help": "Penghitung terpisah untuk SoundCloud. Sisanya tetap di antrean."
   },
   "max_downloads_per_day": {
    "label": "Maks. unduhan per hari",
    "help": "Penghitung terpisah untuk SoundCloud, unduhan manual dan otomatis sekaligus."
   },
   "max_searches_per_hour": {
    "label": "Maks. pencarian per jam",
    "help": "Penghitung terpisah untuk SoundCloud."
   },
   "backoff_initial_hours": {
    "label": "Backoff – nilai awal",
    "help": "Lama blokir setelah SoundCloud melaporkan terlalu banyak permintaan (HTTP 429)."
   },
   "backoff_max_hours": {
    "label": "Backoff – maksimum",
    "help": "Lama blokir berlipat ganda pada setiap blokir berikutnya hingga nilai ini."
   }
  },
  "ladder": {
   "label": "Level",
   "help": "Bagaimana lama blokir bertambah dengan nilai saat ini.",
   "reset": "Setel ulang setelah sesi berhasil",
   "invalid": "Nilai tidak valid"
  },
  "network": {
   "po_token_mode": {
    "label": "Mode",
    "help": "Plugin bgutil untuk yt-dlp. Skrip menjalankan Deno saat diperlukan, HTTP menjaga server lokal tetap berjalan."
   },
   "po_token_port": {
    "label": "Port HTTP",
    "help": "Hanya mode HTTP. Server mendengarkan di 127.0.0.1."
   },
   "po_token_ttl_hours": {
    "label": "Masa berlaku token",
    "help": "Setelah waktu ini token baru dibuat. Nilai dibulatkan ke jam penuh (minimal 1 j)."
   },
   "cookies_from_browser": {
    "label": "Cookie dari browser",
    "help": "Memasukkan yt-dlp dengan login browser Anda. Aktifkan hanya jika tidak lagi berfungsi tanpanya."
   },
   "proxy": {
    "label": "Proxy",
    "help": "Opsional, mis. socks5://127.0.0.1:1080. Kosong = koneksi langsung.",
    "ph": "tanpa proxy"
   }
  },
  "po": {
   "active": "PO-Token aktif",
   "inactive": "PO-Token nonaktif",
   "error": "Galat PO-Token",
   "mode": "Mode",
   "test": "Uji",
   "testing": "Menguji …",
   "test_ok": "Pengujian berhasil.",
   "test_fail": "Pengujian gagal.",
   "unsaved": "Pengujian memakai pengaturan yang tersimpan. Simpan perubahan Anda dulu."
  },
  "cookies": {
   "warn_off": "<b>Disarankan: nonaktif.</b> PO-Token dan cookie browser sekaligus dapat menimbulkan masalah.",
   "warn_on": "<b>Solusi sementara aktif.</b> PO-Token dan cookie browser sekaligus dapat menyebabkan galat atau pemblokiran, dan akun YouTube Anda dipakai untuk permintaan. Nonaktifkan lagi begitu berfungsi tanpanya. Cookie tidak pernah masuk ke log."
  },
  "schedule": {
   "in_app_check": {
    "label": "Periksa saat aplikasi berjalan",
    "help": "Daftar pantau diperiksa pada interval yang diatur selama jendela terbuka."
   },
   "watchlist_interval_hours": {
    "label": "Interval",
    "help": "Jarak waktu antara dua pemeriksaan di aplikasi."
   },
   "entries_per_source": {
    "label": "Entri per sumber",
    "help": "Berapa entri terbaru yang diambil (ringan) per pemeriksaan (bawaan untuk sumber baru)."
   },
   "task_scheduler_enabled": {
    "label": "Gunakan Penjadwal Tugas",
    "help": "Juga memeriksa daftar pantau saat aplikasi tertutup (headless). Diaktifkan oleh “Buat tugas”."
   },
   "task_time": {
    "label": "Waktu",
    "help": "Waktu mulai harian tugas terjadwal."
   }
  },
  "next": {
   "title": "Pemeriksaan berikutnya",
   "off": "Tidak ada pemeriksaan otomatis",
   "off_detail": "Baik pemeriksaan di aplikasi maupun tugas Windows tidak aktif. Daftar pantau hanya diperiksa secara manual.",
   "app_detail": "Di aplikasi, setiap {h} j – selama HCLoader berjalan.",
   "task_detail": "Lewat Penjadwal Tugas Windows, setiap hari pukul {time} – bahkan saat aplikasi tertutup.",
   "any_detail": "Yang lebih awal antara interval aplikasi dan tugas Windows.",
   "also_task": "Juga: tugas Windows setiap hari pukul {time}.",
   "also_app": "Juga di aplikasi setiap {h} j.",
   "pending": "Belum dijadwalkan",
   "pending_detail": "Aplikasi menetapkan tanggal berikutnya begitu pertama kali memeriksa daftar pantau.",
   "due": "Jatuh tempo – segera dimulai",
   "backoff": "<b>Backoff aktif.</b> Tidak ada pemeriksaan hingga {t}; jadwalnya dikejar atau dilewati setelahnya.",
   "unsaved": "Perubahan jadwal yang belum disimpan baru berlaku setelah disimpan."
  },
  "task": {
   "loading": "Menanyakan tugas …",
   "registered": "Tugas terdaftar",
   "registered_detail": "{name} · setiap hari {time} · jalan berikutnya {next}",
   "none": "Tidak ada tugas terdaftar",
   "none_detail": "Membuat tugas Windows harian pukul {time} (schtasks).",
   "create": "Buat tugas",
   "remove": "Hapus tugas",
   "moved": "Aplikasi dipindahkan – buat ulang tugas",
   "moved_detail": "Tugas terjadwal masih memulai {cmd}. Membuat ulang akan memakai folder aplikasi saat ini.",
   "recreate": "Buat ulang tugas",
   "unknown": "Status tugas tidak diketahui",
   "unknown_detail": "Penjadwal Tugas Windows tidak merespons. Pengaturan tetap tidak berubah.",
   "recheck": "Periksa lagi"
  },
  "appearance": {
   "reduce_effects": {
    "label": "Kurangi efek",
    "help": "Menonaktifkan scanline, glitch, dan semua animasi."
   },
   "scanlines": {
    "label": "Scanline & noise",
    "help": "Lapisan halus di atas seluruh antarmuka."
   },
   "pulse_bpm": {
    "label": "Denyut kick",
    "help": "Ketukan tempat bilah kemajuan berdenyut."
   }
  },
  "pulse_preview": {
   "label": "Pratinjau",
   "help": "Begini unduhan yang sedang berjalan berdenyut.",
   "off": "Efek dikurangi"
  },
  "versions": {
   "plugin": "Plugin PO-Token",
   "was": "sebelumnya {v}"
  },
  "update": {
   "label": "yt-dlp & plugin",
   "help": "YouTube terus berubah. Jika terjadi galat, perbarui dulu (pip di venv).",
   "button": "Perbarui yt-dlp & plugin",
   "running": "Memperbarui …",
   "last_check": "Pemeriksaan terakhir",
   "restart": "<b>Perlu mulai ulang.</b> yt-dlp telah diperbarui. Pencarian dan unduhan diblokir hingga HCLoader dimulai ulang; antrean tetap tersimpan.",
   "restart_title": "Perlu mulai ulang",
   "restart_text": "yt-dlp telah diperbarui. Tutup dan mulai ulang HCLoader – hingga saat itu pencarian dan unduhan diblokir, antrean tetap tersimpan.",
   "out_live": "Keluaran · berjalan selama {t}",
   "out_done": "Keluaran · selesai setelah {t}",
   "out_failed": "Keluaran · gagal",
   "out_last": "Keluaran",
   "waiting": "Memulai pip …"
  },
  "maintenance": {
   "check_updates_on_start": {
    "label": "Periksa pembaruan saat mulai",
    "help": "yt-dlp dan plugin PO-Token, paling banyak sekali sehari."
   },
   "check_app_updates_on_start": {
    "label": "Periksa pembaruan HCLoader saat mulai",
    "help": "Menanyakan GitHub sekali per awal untuk versi baru. Tidak ada yang diunduh sampai Anda mengklik."
   },
   "apply_update_on_exit": {
    "label": "Pasang pembaruan saat keluar",
    "help": "Pembaruan yang sudah diunduh dipasang saat HCLoader ditutup (“Nanti”). Nonaktif: ditawarkan lagi saat mulai berikutnya."
   },
   "update_repo": {
    "label": "Sumber pembaruan (GitHub)",
    "help": "Repo dalam format “pemilik/repo”. Ubah hanya untuk fork."
   }
  },
  "db": {
   "label": "Basis data",
   "help": "Status semua video, sumber, dan sesi. Pencadangan menyalin file ke folder “backups”.",
   "backup": "Buat cadangan DB",
   "backing_up": "Mencadangkan …",
   "open": "Folder data",
   "open_logs": "Folder log",
   "open_title": "Buka folder berisi basis data, konfigurasi, dan cadangan",
   "open_logs_title": "Buka folder berisi file log",
   "info": {
    "other": "{n} entri · {mb} MB"
   },
   "last": "Cadangan terakhir",
   "never": "belum ada",
   "keep": "10 cadangan terbaru disimpan, yang lebih lama dihapus pada pencadangan berikutnya.",
   "backups": "Cadangan",
   "backups_more": "+ {n} lebih lama di folder “backups”",
   "fresh": "baru"
  },
  "reset_all": {
   "label": "Semua pengaturan",
   "help": "Mengembalikan semua tab ke bawaan. Basis data dan file musik tidak tersentuh.",
   "button": "Setel ulang semuanya"
  },
  "festivals": {
   "collector_searches_per_hour": {
    "label": "Pencarian per jam",
    "help": "“Cari set yang belum ada” menyebar pencariannya secara merata (10 = satu tiap 6 mnt). Batas global pencarian per jam juga berlaku."
   },
   "collector_results_per_search": {
    "label": "Hasil per pencarian",
    "help": "Berapa banyak hasil yang diperiksa satu pencarian set yang belum ada (satu permintaan per pencarian)."
   },
   "collector_auto_confirm": {
    "label": "Konfirmasi otomatis mulai",
    "help": "Mulai tingkat keyakinan ini, hasil dianggap sah tanpa konfirmasimu – hanya jika judul memuat DJ, festival, dan tahun. Semua yang di bawahnya menunggu satu klik."
   },
   "detect": {
    "label": "Deteksi otomatis",
    "help": "Menetapkan festival atau seri, tahun, panggung, dan jenis set pada hasil dan unduhan baru. Nilai yang diatur manual tidak pernah ditimpa."
   },
   "min_confidence": {
    "label": "Ambang deteksi",
    "help": "Tingkat keyakinan agar kecocokan ditetapkan. Di bawahnya, kecocokan hanya muncul sebagai saran yang bisa Anda terima."
   },
   "year_from_upload_date": {
    "label": "Tahun dari tanggal unggah",
    "help": "Jika judul tidak memuat tahun, tahun unggah dipakai (dianggap kurang pasti)."
   },
   "match_description": {
    "label": "Cari juga di deskripsi",
    "help": "Mencari nama festival juga di deskripsi yang tersimpan."
   },
   "extra_stages": {
    "label": "Panggung tambahan",
    "help": "Nama panggung selain yang bawaan (RED, BLUE, BLACK, UV, Mainstage …).",
    "ph": "+ panggung"
   }
  },
  "fest_types": {
   "label": "Istilah jenis set sendiri",
   "help": "Kata dalam judul yang menunjukkan jenis set. Diperiksa sebelum istilah bawaan.",
   "ph": "Istilah dalam judul",
   "add": "Istilah"
  },
  "fest_test": {
   "label": "Uji judul",
   "help": "Menampilkan apa yang ditemukan deteksi dalam sebuah judul. Tidak ada yang disimpan; pengaturan tersimpan yang berlaku.",
   "ph": "mis. Defqon.1 2024 | RED | Closing Ceremony",
   "none": "Tidak ada yang terdeteksi",
   "assigned": "akan ditetapkan",
   "suggested": "hanya saran"
  },
  "fest_status": {
   "title": "{assigned} dari {total} mix ditetapkan",
   "last": "Proses terakhir",
   "help": "Berjalan luring pada pustaka yang ada. Nilai manual tetap; berkas tidak ditandai ulang atau dipindahkan.",
   "button": "Tetapkan festival sekarang",
   "running": "Menetapkan … {done} / {total}"
  },
  "series": {
   "hint": "Festival, acara radio, dan podcast yang dikenal. Perubahan pada daftar ini langsung disimpan.",
   "add": "Seri",
   "show_hidden": "Tampilkan yang disembunyikan",
   "reset_all": "Setel ulang seri bawaan",
   "builtin": "bawaan",
   "own": "sendiri",
   "modified": "diubah",
   "hidden": "disembunyikan",
   "no_aliases": "tanpa alias",
   "enable": "Deteksi seri ini",
   "hide": "Sembunyikan",
   "restore": "Pulihkan",
   "new_title": "Seri baru",
   "edit_title": "Edit seri",
   "name": "Nama",
   "kind": "Jenis",
   "default_genre": "Genre bawaan",
   "aliases": "Alias",
   "aliases_help": "Ejaan lain. Satu kecocokan di judul sudah cukup.",
   "weak_aliases": "Alias lemah",
   "weak_help": "Kata umum yang hanya dihitung bila disertai tahun.",
   "variants": "Varian",
   "variants_help": "Edisi tersendiri, mis. Australia atau at Home.",
   "channels": "Kanal penyelenggara",
   "channels_help": "Nama, ID, atau URL kanal. Hanya menaikkan keyakinan."
  },
  "watchlist": {
   "backfill_max_entries": {
    "label": "Entri maks. per sumber",
    "help": "“Baca semua (sekali)” di daftar pantauan membaca paling banyak sejumlah ini entri dari kanal atau playlist."
   },
   "backfill_requests_per_hour": {
    "label": "Permintaan per jam",
    "help": "Permintaan halaman “Baca semua” disebar merata (120 = satu tiap 30 d); jeda normal dan backoff juga berlaku. Jalankan terjadwal (Task Scheduler) melanjutkan paling banyak sejumlah ini permintaan."
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
    "auto": "Otomatis (bahasa sistem)"
   }
  },
  "player": {
   "mode": {
    "internal": "Pemutar bawaan aplikasi (disarankan)",
    "external": "Pemutar bawaan Windows"
   }
  },
  "download": {
   "audio_format": {
    "mp3": "MP3",
    "original": "Asli (Opus/M4A, tanpa konversi)"
   },
   "mp3_quality": {
    "320": "320 kbps CBR",
    "v0": "V0 VBR"
   }
  },
  "network": {
   "cookies_from_browser": {
    "none": "Nonaktif",
    "edge": "Edge",
    "chrome": "Chrome",
    "firefox": "Firefox",
    "brave": "Brave"
   }
  }
 },
 "dlg": {
  "block": {
   "title": "Blokir kanal",
   "text": "Video dari “{ch}” tidak akan ditampilkan lagi. Batalkan di Pengaturan › Filter & kata kunci.",
   "ok": "Blokir"
  },
  "ignore_all": {
   "title": "Abaikan temuan",
   "text": {
    "other": "Tandai {n} temuan di kotak masuk sebagai diabaikan? Tidak akan diunduh dan tidak muncul lagi di kotak masuk."
   },
   "ok": "Abaikan"
  },
  "del_source": {
   "title": "Hapus sumber",
   "text": "Buang “{name}” dari daftar pantau? Mix yang sudah diunduh tetap disimpan."
  },
  "del_mix": {
   "title": "Hapus mix",
   "text": "“{title}” dibuang dari pustaka dan file dihapus dari disk:",
   "ok": "Hapus file",
   "warn": "<b>Tindakan ini tidak dapat dibatalkan.</b> File audio dan file .cue terkait dihapus. Mix ditandai “diabaikan” dan <b>tidak akan diunduh lagi</b>.",
   "meta": "{dur} · {size}"
  },
  "outside_mix": {
   "title": "Hanya buang entri",
   "text": "File untuk “{title}” berada di luar folder tujuan saat ini sehingga tidak akan dihapus:",
   "ok": "Hanya buang entri",
   "warn": "File dibiarkan di tempatnya. Entri hilang dari pustaka, mix ditandai “diabaikan” dan <b>tidak akan diunduh lagi</b>."
  },
  "remove_mix": {
   "title": "Buang entri",
   "text": "File untuk “{title}” tidak ditemukan di lokasi tersimpan:",
   "ok": "Buang entri",
   "warn": "Entri hilang dari pustaka. Mix ditandai “diabaikan” dan <b>tidak akan diunduh lagi</b>. Jika file ada di tempat lain, file itu tidak tersentuh."
  },
  "backoff": {
   "title": "Cabut backoff",
   "ok": "Tetap cabut",
   "text": "Waktu blokir melindungi Anda: {p} memberi sinyal bahwa terlalu banyak permintaan masuk.",
   "warn": "<b>Cabut hanya jika Anda yakin blokir sudah berakhir.</b> Jika aplikasi mengaksesnya lagi terlalu cepat, {p} dapat membatasi IP Anda lebih lama atau permanen."
  },
  "reset_all": {
   "title": "Setel ulang semuanya",
   "text": "Semua pengaturan di semua tab langsung dikembalikan ke bawaan dan disimpan.",
   "ok": "Setel ulang"
  },
  "series_delete": {
   "title": "Hapus seri?",
   "text": "“{name}” dan edisinya akan dihapus.",
   "warn": {
    "other": "{n} mix kehilangan penetapannya."
   }
  },
  "series_hide": {
   "title": "Sembunyikan seri?",
   "text": "“{name}” tidak lagi dideteksi. Anda bisa mengembalikannya lewat “Tampilkan yang disembunyikan”."
  },
  "series_reset": {
   "title": "Setel ulang seri bawaan?",
   "text": "Semua seri bawaan kembali ke keadaan semula dan yang disembunyikan muncul lagi. Seri Anda sendiri tetap ada.",
   "ok": "Setel ulang"
  }
 },
 "toast": {
  "enqueued": {
   "other": "{n} mix ditambahkan ke antrean"
  },
  "enqueued_none": "Tidak ada yang ditambahkan – sudah diantrekan atau diunduh",
  "enqueued_skipped": "{n} dilewati",
  "queue_cancelled": "Dibatalkan: {title}",
  "queue_removed": "Dibuang: {title}",
  "queue_retry": "Diantrekan lagi: {title}",
  "queue_paused": "Antrean dijeda",
  "queue_resumed": "Antrean dilanjutkan",
  "new_run": "Sesi baru dimulai",
  "ignored": "Diabaikan: {title}",
  "unignored": "Terlihat lagi: {title}",
  "ignored_n": {
   "other": "{n} temuan diabaikan"
  },
  "opening": "Membuka {p} di browser …",
  "watch_added": "Ditambahkan ke daftar pantau: {ch}",
  "blocked": "Kanal diblokir: {ch}",
  "genre_set": "Genre diatur: {genre}",
  "done": "Terunduh: {title}",
  "failed": "Gagal: {title} – {error}",
  "wl_started": {
   "other": "Memeriksa daftar pantau ({n} sumber, dibatasi) …"
  },
  "wl_started_one": "Memeriksa “{name}” …",
  "wl_none": "Tidak ada sumber aktif – tidak ada yang diperiksa",
  "wl_done": {
   "other": "Daftar pantau diperiksa: {n} sumber, tidak ada yang baru"
  },
  "wl_done_found": {
   "other": "Daftar pantau diperiksa: {n} temuan baru"
  },
  "wl_errors": {
   "other": "{n} sumber dengan galat"
  },
  "source_added": "Sumber ditambahkan: {name}",
  "source_saved": "Sumber disimpan: {name}",
  "source_deleted": "Sumber dihapus: {name}",
  "retagged": "Ditandai ulang: {title}",
  "retagged_moved": "Ditandai ulang dan dipindahkan: {title} → {path}",
  "deleted": "Dihapus: {title}",
  "removed": "Entri dibuang: {title}",
  "folder_opening": "Membuka folder …",
  "copied": {
   "other": "{n} baris disalin"
  },
  "copy_failed": "Tidak dapat menyalin",
  "copy_none": "Tidak ada baris yang terlihat",
  "settings_saved": "Pengaturan disimpan",
  "settings_errors": {
   "other": "{n} isian tidak valid"
  },
  "backoff_cleared": "Backoff ({p}) dicabut manual",
  "genre_moved": "Genre: {genre} – dipindahkan ke {path}",
  "genre_retagged": "Genre: {genre} – tag diperbarui",
  "genre_entry_only": "Genre: {genre} – hanya entri yang diubah, file tidak terjangkau",
  "genre_failed": "Genre tidak dapat diatur: {error}",
  "task_created": "Tugas dibuat di Penjadwal Tugas Windows",
  "task_removed": "Tugas dihapus",
  "updated": "Diperbarui ke yt-dlp {v}",
  "up_to_date": "Sudah terbaru (yt-dlp {v})",
  "update_failed": "Pembaruan gagal",
  "restart_required": "Diperbarui – mulai ulang HCLoader agar pencarian dan unduhan berfungsi lagi",
  "backup_done": "Cadangan dibuat: {path}",
  "reset_all": "Semua pengaturan disetel ulang",
  "festival_entry_only": "“{name}” hanya disimpan di entri – berkas tidak dapat dijangkau",
  "series_saved": "Seri “{name}” disimpan",
  "series_deleted": "Seri “{name}” dihapus",
  "series_hidden": "Seri “{name}” disembunyikan",
  "series_reset": "Seri bawaan dipulihkan",
  "assign_done": "Festival ditetapkan: {assigned} baru, {suggested} saran",
  "assign_cancelled": "Penetapan dibatalkan: {assigned} baru, {suggested} saran"
 },
 "upd": {
  "available": "Versi {v} tersedia",
  "available_sub": "Terpasang: {cur}",
  "download": "Unduh",
  "notes": "Perubahan",
  "later": "Nanti",
  "close": "Tutup",
  "cancel": "Batal",
  "retry": "Coba lagi",
  "downloading": "Mengunduh pembaruan {v}",
  "phase_download": "Unduh",
  "phase_verify": "Verifikasi",
  "phase_prepare": "Persiapan",
  "ready": "Pembaruan {v} siap",
  "ready_sub": "Untuk memasangnya, HCLoader ditutup sebentar lalu dimulai ulang.",
  "restart_now": "Mulai ulang sekarang",
  "on_exit": "Saat keluar",
  "applying": "Memasang pembaruan …",
  "applying_sub": "HCLoader akan segera ditutup dan dimulai ulang.",
  "error": "Pembaruan aplikasi gagal",
  "blocked": "Pembaruan otomatis tidak dapat dilakukan",
  "notes_title": "Perubahan di versi {v}",
  "notes_empty": "Tidak ada catatan rilis.",
  "notes_link": "Rilis di GitHub",
  "notes_all": "Tampilkan semua perubahan",
  "notes_less": "Tampilkan sorotan saja",
  "confirm_title": "Mulai ulang sekarang?",
  "confirm_ok": "Mulai ulang",
  "confirm_text": "HCLoader ditutup, pembaruan dipasang, dan aplikasi dimulai ulang. Unduhan yang sedang berjalan dibatalkan dan tetap di antrean. Musik, pengaturan, dan basis data tidak berubah.",
  "on_exit_toast": "Pembaruan akan dipasang saat HCLoader keluar.",
  "later_toast": "Pembaruan tetap siap dan akan ditawarkan lagi saat mulai berikutnya.",
  "section_label": "Versi HCLoader",
  "section_help": "Versi baru berasal dari GitHub. Data, pengaturan, dan musik tidak tersentuh oleh pembaruan; cadangan dibuat otomatis sebelum migrasi basis data.",
  "current": "Terpasang",
  "latest": "Terbaru",
  "checked": "Pemeriksaan terakhir",
  "check_now": "Periksa sekarang",
  "checking": "Memeriksa …",
  "st_idle": "Sudah terbaru",
  "st_available": "Versi baru tersedia",
  "st_checking": "Memeriksa …",
  "st_downloading": "Mengunduh …",
  "st_ready": "Siap dipasang",
  "st_applying": "Memasang …",
  "st_error": "Galat",
  "st_unknown": "Belum diperiksa",
  "up_to_date": "HCLoader sudah terbaru (v{v})",
  "portable": "Versi portabel",
  "installed": "Terpasang (setup)",
  "git": "Checkout Git",
  "from_repo": "dari {repo} (bukan sumber resmi)",
  "unverified": "tanpa checksum (hanya integritas ZIP yang diverifikasi)",
  "rn_label": "Catatan rilis",
  "rn_help": "Apa yang berubah di setiap versi, dari catatan yang disertakan (berfungsi offline).",
  "rn_older": "Lebih lama",
  "rn_newer": "Lebih baru",
  "rn_pos": "{i} dari {n}",
  "rn_installed": "terpasang",
  "rn_empty": "Catatan rilis tidak ditemukan.",
  "rn_version": "Versi"
 },
 "err": {
  "generic": "Galat tidak diketahui",
  "bridge": "Galat di “{name}”: {msg}",
  "boot": "Gagal memulai: {msg}",
  "no_backend": "Tidak ada koneksi ke backend"
 },
 "fatal": {
  "title": "Koneksi ke backend gagal",
  "text": "Antarmuka tidak menerima respons dari bagian Python HCLoader. Tidak ada yang tidak nyata yang ditampilkan atau disimpan.",
  "waiting": "Masih menunggu backend …",
  "reload": "Muat ulang"
 },
 "fest": {
  "all": "Semua seri",
  "other": "Lainnya / belum ditetapkan",
  "other_hint": "Tanpa festival",
  "sets": {
   "other": "{n} set"
  },
  "editions": {
   "other": "{n} edisi"
  },
  "suggestions": {
   "other": "{n} saran"
  },
  "all_years": "Semua",
  "no_stage": "Tanpa panggung",
  "kind": {
   "festival": "Festival",
   "radio": "Acara radio",
   "podcast": "Podcast"
  },
  "set_type": {
   "live_set": "Live set",
   "closing_ceremony": "Upacara penutupan",
   "opening": "Pembukaan",
   "endshow": "Endshow",
   "full_show": "Acara penuh",
   "warm_up": "Warm-up",
   "anthem": "Anthem",
   "episode": "Episode"
  },
  "change": "ubah festival",
  "change_manual": "diatur manual, klik untuk mengubah",
  "add": "Atur festival atau seri",
  "suggested": "Saran kurang pasti: {name}",
  "accept": "Terima saran",
  "p_title": "Festival / seri",
  "p_search": "Cari seri …",
  "p_none": "Tanpa festival",
  "p_no_match": "Seri tidak ditemukan",
  "p_year": "Tahun",
  "p_variant": "Varian",
  "p_stage": "Panggung",
  "p_type": "Jenis set",
  "p_apply": "Terapkan",
  "p_auto": "Kembali ke otomatis"
 },
 "backfill": {
  "action": "Baca semua (sekali)",
  "action_title": "Baca seluruh daftar sumber ini sekali, halaman demi halaman – temuan baru masuk ke kotak masuk",
  "again_title": "Baca semua lagi – hanya entri yang belum dikenal yang ditambahkan",
  "search_title": "Bukan untuk pencarian tersimpan – pencarian memberi paling banyak 100 hasil",
  "why_open": "Pembacaan sudah dimulai – jeda atau batalkan di bawah nama",
  "st_pending": "Menunggu",
  "st_running": "Membaca …",
  "st_paused": "Dijeda",
  "progress": "{n} / ~{total}",
  "progress_cap": "{n} / maks. {cap}",
  "added": "+{n} di kotak masuk",
  "done_short": "Semua dibaca {date}",
  "done_title": "Dibaca lengkap: {date} · {n} entri",
  "note_title": "Gangguan terakhir",
  "pause": "Jeda",
  "resume": "Lanjutkan",
  "cancel": "Batal",
  "keep": "Lanjut membaca",
  "dlg_title": "Baca semua dari “{name}”?",
  "dlg_text": "Membaca seluruh daftar sumber ini sekali, halaman demi halaman – datar dan murah, lewat pembatas; tidak ada yang diunduh. Temuan yang lolos filter Anda masuk ke <b>kotak masuk</b>, juga untuk sumber dengan unduhan otomatis. Video yang sudah dikenal tidak pernah ditambahkan dua kali.",
  "dlg_requests": "permintaan",
  "dlg_time": "durasi",
  "dlg_entries": "entri",
  "dlg_known": "Diketahui dari pemeriksaan terakhir: <b>{n}</b> entri.",
  "dlg_unknown": "Ukuran tidak diketahui – perkiraan hati-hati untuk maksimum {cap} entri.",
  "dlg_capped": "Hanya {cap} entri pertama yang dibaca (Pengaturan › Jadwal).",
  "dlg_resume": "Melanjutkan setelah {n} entri yang sudah dibaca; halamannya diminta ulang terlebih dahulu.",
  "dlg_headless": "Terlalu besar untuk proses terjadwal ({n} permintaan per jam): jika aplikasi ditutup sebelum selesai, hanya dilanjutkan di aplikasi.",
  "dlg_pace": "Paling banyak {n} permintaan per jam, tersebar merata. Backoff (HTTP 429 / pemeriksaan bot), menutup aplikasi, atau galat hanya menyela – nanti berlanjut otomatis. Anda bisa menjeda atau membatalkan kapan saja.",
  "dlg_ok": "Mulai membaca",
  "dlg_ok_resume": "Lanjut membaca",
  "dlg_cancel_title": "Batalkan pembacaan?",
  "dlg_cancel_text": "Pembacaan “{name}” berhenti dan kemajuannya dibuang. Temuan di kotak masuk tetap ada.",
  "toast_started": "“{name}” dibaca lengkap – berjalan di latar belakang",
  "toast_done": "“{name}” dibaca lengkap – +{n} di kotak masuk",
  "toast_paused": "“{name}” dijeda – lanjutkan dengan “Lanjutkan”",
  "toast_cancelled": "Pembacaan “{name}” dibatalkan"
 },
 "collector": {
  "nav": "Kolektor",
  "open_title": "Kolektor festival: kumpulkan semua set satu edisi festival dengan daftar periksa",
  "title": "Kolektor festival",
  "sub": "Semua set dari satu edisi festival – menurut jadwalnya, dengan daftar periksa",
  "back_library": "Kembali ke pustaka",
  "back_list": "Semua daftar periksa",
  "collect": "Kumpulkan edisi ini",
  "collect_title": "Daftar periksa semua set {name}: cari set yang belum ada lalu unduh",
  "open_checklist": "Daftar periksa {n} / {total}",
  "sets": "Set",
  "lists": "Daftar periksa",
  "card_empty": "Belum ada set",
  "new_title": "Daftar periksa baru",
  "new_text": "Pilih festival dan tahun. Set berasal dari playlist penyelenggara, jadwal yang ditempel, atau berkas bawaan.",
  "new_ok": "Buka daftar periksa",
  "f_series": "Festival / seri",
  "f_series_ph": "Pilih …",
  "f_series_other": "Acara radio & podcast",
  "err_series": "Pilih festival atau seri.",
  "err_year": "Masukkan tahun edisinya.",
  "empty_title": "Belum ada daftar periksa",
  "empty_text": "Daftar periksa memuat setiap set dari satu edisi festival dan menunjukkan apa yang sudah kamu miliki.",
  "step1": "Pilih festival dan tahun di atas.",
  "step2": "Impor playlist penyelenggara atau tempel jadwalnya.",
  "step3": "Hapus centang yang tidak kamu inginkan, cari set yang belum ada, lalu unduh.",
  "delete": "Hapus daftar periksa",
  "dlg_delete_title": "Hapus daftar periksa?",
  "dlg_delete_text": "Daftar periksa “{name}” dihapus beserta semua barisnya. Pencarian yang berjalan akan berhenti.",
  "dlg_delete_keep": "Berkas yang sudah diunduh, entri pustaka, dan hasil tersimpan tetap ada.",
  "toast_deleted": "Daftar periksa “{name}” dihapus",
  "in_library": "{n} di pustaka",
  "show_library": "Tampilkan di pustaka ({n})",
  "more": "Lainnya",
  "st": {
   "found": "Ditemukan",
   "queued": "Antre",
   "downloaded": "Diunduh",
   "missing": "Belum ada",
   "ignored": "Diabaikan"
  },
  "filter_status": "Hanya tampilkan: {name}",
  "sources": "Sumber",
  "src_playlist": "Impor playlist penyelenggara",
  "src_paste": "Tempel jadwal (Beta)",
  "files": "Jadwal bawaan",
  "src_add": "Tambah baris",
  "all_stages": "Semua panggung",
  "all_days": "Semua hari",
  "no_day": "Tanpa hari",
  "search": "Filter menurut DJ …",
  "col_dj": "DJ / set",
  "col_when": "Hari / waktu",
  "col_status": "Status",
  "col_match": "Video yang cocok",
  "source": {
   "playlist": "Playlist",
   "timetable": "Jadwal",
   "file": "Berkas jadwal",
   "manual": "Ditambahkan manual"
  },
  "edited": "Diubah manual – nilai ini tetap berlaku atas impor berikutnya",
  "check_title": "Kumpulkan set ini",
  "all_title": "Pilih semua / tidak ada (baris yang tampil)",
  "m_none": "Belum dicari",
  "m_searched": "Tidak ditemukan ({date})",
  "confirm": "Konfirmasi",
  "confirm_title": "Hasil belum pasti – konfirmasi bahwa ini set yang benar",
  "reject_title": "Bukan video ini – jangan sarankan lagi untuk baris ini",
  "reject": "Buang hasil",
  "candidates": "Hasil lain: {n}",
  "candidates_head": "Pakai hasil lain",
  "ignore": "Abaikan set ini",
  "unignore": "Berhenti mengabaikan",
  "delete_row": "Hapus baris",
  "f_artist": "DJ / artis",
  "f_day": "Hari",
  "f_start": "Mulai",
  "f_end": "Selesai",
  "add_ok": "Tambah",
  "err_artist": "DJ / artis wajib diisi.",
  "none_title": "Tidak ada baris",
  "none_text": "Tidak ada baris yang cocok dengan filter saat ini.",
  "rows_empty_title": "Daftar periksa ini kosong",
  "rows_empty_text": "Mulailah dengan playlist resmi penyelenggara – satu daftar datar biasanya mencakup sebagian besar set. Atau tempel jadwalnya sebagai teks.",
  "checked_of": "dari {total} dicentang",
  "select_all": "Pilih semua",
  "select_none": "Tidak ada",
  "shown": "{n} dari {total} baris ditampilkan",
  "to_confirm": "Perlu konfirmasi: {n}",
  "to_confirm_title": "Hasil yang belum pasti menunggu konfirmasimu – klik untuk hanya menampilkannya",
  "find": "Cari set yang belum ada ({n})",
  "find_again": "Cari lagi ({n})",
  "find_title": "Mencari set bercentang tanpa hasil, satu per satu dan berjeda – menampilkan perkiraan dulu",
  "find_again_title": "Semua set sudah pernah dicari – cari lagi yang belum punya hasil",
  "find_none": "Tidak ada yang dicari – setiap set bercentang sudah punya hasil",
  "find_running": "Pencarian sedang berjalan",
  "queue": "Unduh yang dicentang ({n})",
  "queue_title": "Tambahkan semua set bercentang yang terkonfirmasi ke antrean unduhan",
  "queue_none": "Tidak ada yang diunduh – tidak ada set bercentang dengan hasil terkonfirmasi yang belum diunduh",
  "job_pending": "Menunggu",
  "job_running": "Mencari …",
  "job_paused": "Dijeda",
  "job_hits": "Ditemukan: {n}",
  "job_cancel": "Hentikan",
  "job_resume": "Lanjutkan",
  "imp_running": "Membaca playlist …",
  "imp_entries": "Entri: {n}",
  "imp_hint": "daftar datar, halaman demi halaman",
  "imp_busy": "Sebuah playlist sedang dibaca",
  "imp_added": "baru: {n}",
  "imp_merged": "digabung: {n}",
  "imp_matched": "ditemukan di pustaka: {n}",
  "imp_unchecked": "tanpa centang (terlalu pendek / aftermovie): {n}",
  "imp_invalid": "tidak valid: {n}",
  "pl_title": "Impor playlist penyelenggara",
  "pl_text": "Playlist liveset resmi penyelenggara adalah sumber termurah: satu daftar datar, tidak ada yang diunduh. Setiap entri menjadi baris terkonfirmasi; DJ, panggung, dan jenis set diambil dari judul.",
  "pl_url": "Tautan playlist",
  "pl_hint": "Playlist YouTube atau set SoundCloud. Entri yang terlalu pendek, aftermovie, dan trailer ditambahkan tanpa centang. Baris dari jadwal mendapat video yang cocok.",
  "pl_ok": "Impor",
  "pl_err_empty": "Tempel tautan sebuah playlist.",
  "toast_pl_started": "Membaca playlist – berjalan di latar belakang",
  "toast_pl_done": "Playlist dibaca –",
  "toast_pl_cancelled": "Impor playlist dihentikan –",
  "tt_title": "Tempel jadwal – {name} (Beta)",
  "tt_text": "Tempel jadwal sebagai teks atau CSV. Judul bagian menentukan hari dan panggung, setiap baris lain adalah satu set. Tidak ada yang disimpan sebelum kamu mengimpor.",
  "tt_input": "Jadwal",
  "tt_preview": "Pratinjau",
  "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
  "tt_empty": "Set yang dikenali muncul di sini.",
  "tt_nothing": "Belum ada set yang dikenali.",
  "tt_sum": "Set: {n}",
  "tt_days": "Hari: {n}",
  "tt_stages": "Panggung: {n}",
  "tt_skipped": "Baris yang tidak dipahami: {n}",
  "tt_more": "… dan {n} lagi",
  "tt_ok": "Impor ({n})",
  "tt_edit_hint": "Perbaiki atau hapus set di sini sebelum impor. Mengubah teks di kiri akan membacanya ulang.",
  "toast_tt": "Jadwal diimpor –",
  "files_text": "Jadwal yang dikelola di repositori HCLoader dan dikirim bersama pembaruan. Mengimpor satu jadwal membuat daftar periksa edisinya.",
  "files_empty_title": "Belum ada jadwal bawaan",
  "files_empty": "Hanya jadwal yang terbukti benar yang disertakan – versi ini belum membawa satu pun. Tempel saja jadwalnya sebagai teks.",
  "files_how_title": "Sumbangkan jadwal",
  "files_how": "Satu berkas JSON per edisi berisi set (artis, panggung, hari, mulai, selesai) dan tautan ke jadwal resmi sebagai sumber. Kirim sebagai issue atau pull request di GitHub; README di samping berkas menjelaskan formatnya.",
  "files_meta": "Set: {n} · diperbarui {date}",
  "files_source": "sumber resmi",
  "files_import": "Impor",
  "files_broken": "Berkas tidak valid: {error}",
  "files_unknown": "Seri tidak dikenal atau disembunyikan di sini",
  "est_title": "Cari set yang belum ada – {name}",
  "est_text": "Mencari setiap set bercentang tanpa hasil, satu per satu: <b>DJ + festival + tahun</b> sebagai pencarian datar melalui pembatas. Tidak ada yang diunduh.",
  "est_requests": "pencarian",
  "est_left": "tersisa jam ini",
  "est_again": "Semua set sudah pernah dicari – kini yang belum punya hasil dicari lagi.",
  "est_offline": "Baru saja dicocokkan gratis dengan pustakamu: {n}.",
  "est_resume": "Melanjutkan pencarian yang terputus.",
  "est_wait": "Batas pencarian jam ini sudah habis – pencarian pertama dimulai {t}.",
  "est_backoff": "Backoff aktif sampai {t} – pencarian tidak bisa dimulai sebelum itu.",
  "est_pace": "Paling banyak {n} pencarian per jam, tersebar merata (kira-kira satu tiap {min} mnt). Hasil yang belum pasti menunggu konfirmasimu. Backoff, menutup aplikasi, atau galat hanya menyela pencarian – pencarian berlanjut otomatis.",
  "est_ok": "Mulai pencarian",
  "est_ok_resume": "Lanjutkan pencarian",
  "toast_find_started": "Mencari set “{name}” yang belum ada – berjalan di latar belakang",
  "toast_find_done": "Pencarian selesai – ditemukan {n} dari {total}",
  "toast_find_cancelled": "Pencarian dihentikan – “Cari set yang belum ada” melanjutkannya",
  "toast_offline": "Dicocokkan dengan pustakamu: {n} – tidak perlu mencari",
  "toast_confirmed": "“{name}” dikonfirmasi",
  "toast_rejected": "Hasil untuk “{name}” dibuang",
  "toast_ignored": "“{name}” diabaikan",
  "toast_unignored": "“{name}” dikumpulkan lagi",
  "toast_row_added": "“{name}” ditambahkan",
  "toast_row_added_hit": "“{name}” ditambahkan – ditemukan di pustaka",
  "toast_row_saved": "“{name}” disimpan",
  "toast_row_retag": "“{name}” disimpan – tag berkas sedang diperbarui",
  "toast_row_deleted": "Baris “{name}” dihapus",
  "q_none": "Tidak ada yang ditambahkan ke antrean",
  "q_unconfirmed": "belum dikonfirmasi: {n}",
  "q_missing": "tanpa hasil: {n}",
  "q_other": "tidak bisa diunduh: {n}",
  "q_retag": "tag diperbarui: {n}"
 },
 "tracks": {
  "nav": "Lagu",
  "open_title": "Set mana yang memutar sebuah lagu? Cari di tracklist pustaka",
  "title": "Lagu",
  "sub": "Set mana yang memutar lagu ini?",
  "back": "Kembali ke pustaka",
  "search": "Artis atau judul, mis. Dragonborn",
  "n_tracks": {
   "other": "{n} lagu"
  },
  "n_sets": {
   "other": "{n} set"
  },
  "status": "{tracks} di {sets}",
  "status_last": "Dibaca:",
  "scan": "Baca tracklist",
  "scan_title": "Baca tracklist semua set (offline: chapter, deskripsi, file CUE)",
  "rescan": "Baca ulang semua",
  "rescan_title": "Baca ulang daftar lagu semua set",
  "scan_new": "Baca yang baru",
  "scan_new_title": "Hanya baca set yang baru atau berubah sejak proses terakhir",
  "running": "Membaca tracklist … {done} / {total}",
  "engine_like": "Pencarian sederhana: SQLite ini tidak punya indeks teks lengkap",
  "top_title": "Lagu paling sering diputar",
  "top_sub": "di paling banyak set",
  "top_sets": {
   "other": "{n} set"
  },
  "top_find": "Tampilkan set dengan lagu ini",
  "top_empty": "Belum ada lagu yang muncul di lebih dari satu set.",
  "results": {
   "other": "{n} set dengan “{q}”"
  },
  "truncated": "{n} pertama – persempit pencarian",
  "more_hits": {
   "other": "+ {n} hasil lagi"
  },
  "no_results_title": "Tidak ada set yang memutar “{q}”",
  "no_results_text": "Coba sebagian nama artis atau judul. Hanya set dengan tracklist (chapter, deskripsi, file CUE) yang ditemukan.",
  "empty_title": "Belum ada tracklist",
  "empty_text": "HCLoader membaca tracklist dari chapter, deskripsi, dan file CUE set Anda – offline, tanpa bertanya ke YouTube.",
  "empty_none_title": "Tidak ada set Anda yang punya tracklist",
  "empty_none_text": "Tracklist berasal dari chapter, deskripsi bertanda waktu, dan file CUE. Set tanpa itu tidak bisa dicari.",
  "library_empty": "Unduh beberapa set dulu – tracklist-nya akan muncul di sini.",
  "jump": "Putar dari {time}",
  "jump_external": "Dibuka di pemutar bawaan – lompat ke {time} di sana",
  "no_time": "Tidak ada tanda waktu di tracklist",
  "tracklist": "Tracklist",
  "tracklist_title": "Tampilkan seluruh tracklist set ini",
  "panel_source": "Sumber: {source}",
  "source_chapters": "chapter",
  "source_description": "deskripsi",
  "source_id3": "chapter ID3",
  "source_cue": "file CUE",
  "source_none": "tidak ada",
  "panel_empty": "Set ini tidak punya tracklist",
  "panel_empty_hint": "Tidak ditemukan chapter, deskripsi dengan tracklist, maupun file CUE.",
  "close": "Tutup",
  "id_track": "Lagu belum rilis atau tak dikenal (ID)",
  "play_set": "Putar set dari awal",
  "toast_done": "Tracklist dibaca: {sets}, {tracks}",
  "toast_cancelled": "Membaca tracklist dibatalkan"
 }
});
