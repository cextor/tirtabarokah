<!DOCTYPE html>
<html lang="id" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dokumentasi API - Tirta Barokah</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;650&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS v3 CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
                        mono: ['Fira Code', 'Courier New', 'monospace'],
                    }
                }
            }
        }
    </script>
    
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #090d16;
            color: #e2e8f0;
        }

        /* Customize scrollbars */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #475569;
        }

        /* Sidebar active item styling */
        .sidebar-active {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border-left: 2px solid #3b82f6;
        }

        /* Custom glow effects */
        .glow-overlay {
            position: absolute;
            width: 150px;
            height: 150px;
            background: #3b82f6;
            filter: blur(100px);
            opacity: 0.1;
            pointer-events: none;
        }
    </style>
</head>
<body class="flex flex-col min-h-screen">

    <!-- Header Section -->
    <header class="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <span class="text-xl">🏊‍♂️</span>
            </div>
            <div>
                <h1 class="text-sm font-black text-white tracking-wider font-sans">TIRTA BAROKAH</h1>
                <p class="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-semibold uppercase tracking-widest">
                    Developer Portal v1.0
                </p>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Masuk sebagai: <strong class="text-white"><?= session()->get('admin_name') ?></strong></span>
            </div>
            <a 
                href="<?= base_url('logout') ?>" 
                class="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-xl text-xs border border-rose-900/50 transition duration-200 cursor-pointer flex items-center gap-1.5"
            >
                🚪 Keluar
            </a>
        </div>
    </header>

    <!-- Main Workspace Area -->
    <div class="flex-1 flex overflow-hidden">
        
        <!-- Left Column: Sidebar Navigation & Search -->
        <aside class="w-80 bg-[#0c1322] border-r border-slate-800/80 flex flex-col hidden lg:flex shrink-0">
            
            <!-- Search bar -->
            <div class="p-4 border-b border-slate-800/60">
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">🔍</span>
                    <input 
                        type="text" 
                        id="apiSearch"
                        placeholder="Cari endpoint..."
                        class="w-full bg-[#111c30] border border-slate-850 pl-8.5 pr-3 py-2 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                </div>
            </div>

            <!-- Scrollable navigation links -->
            <nav class="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h3 class="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 mb-2">Ikhtisar</h3>
                    <ul class="space-y-1">
                        <li>
                            <a href="#overview" class="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                📌 Pengenalan & Base URL
                            </a>
                        </li>
                        <li>
                            <a href="#auth-headers" class="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                🔑 Kunci Klien & Keamanan
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 mb-2">Auth API</h3>
                    <ul class="space-y-1" id="nav-auth">
                        <li>
                            <a href="#auth-login" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/auth/login</span>
                            </a>
                        </li>
                        <li>
                            <a href="#auth-logout" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/auth/logout</span>
                            </a>
                        </li>
                        <li>
                            <a href="#auth-parent-login" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/auth/parent-login</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 mb-2">Pelatih (Coaches)</h3>
                    <ul class="space-y-1" id="nav-coaches">
                        <li>
                            <a href="#coaches-get" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase">GET</span>
                                <span class="truncate">/coaches</span>
                            </a>
                        </li>
                        <li>
                            <a href="#coaches-add" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/coaches/add</span>
                            </a>
                        </li>
                        <li>
                            <a href="#coaches-update" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/coaches/update</span>
                            </a>
                        </li>
                        <li>
                            <a href="#coaches-delete" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 uppercase">DEL</span>
                                <span class="truncate">/coaches/delete/{id}</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 mb-2">Siswa (Members)</h3>
                    <ul class="space-y-1" id="nav-members">
                        <li>
                            <a href="#members-get" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase">GET</span>
                                <span class="truncate">/members</span>
                            </a>
                        </li>
                        <li>
                            <a href="#members-register" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/members/register</span>
                            </a>
                        </li>
                        <li>
                            <a href="#members-verify" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/members/verify-payment</span>
                            </a>
                        </li>
                        <li>
                            <a href="#members-update" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span class="truncate">/members/update</span>
                            </a>
                        </li>
                        <li>
                            <a href="#members-delete" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 uppercase">DEL</span>
                                <span class="truncate">/members/delete/{id}</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 mb-2">Lainnya (Settings & Levels)</h3>
                    <ul class="space-y-1" id="nav-other">
                        <li>
                            <a href="#events-get" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase">GET</span>
                                <span>/events</span>
                            </a>
                        </li>
                        <li>
                            <a href="#progress-add" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span>/progress/add</span>
                            </a>
                        </li>
                        <li>
                            <a href="#reschedule-request" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase">POST</span>
                                <span>/reschedule/request</span>
                            </a>
                        </li>
                        <li>
                            <a href="#settings-get" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase">GET</span>
                                <span>/settings</span>
                            </a>
                        </li>
                        <li>
                            <a href="#levels-get" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-350 hover:bg-slate-800/45 hover:text-white transition duration-150">
                                <span class="px-1 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase">GET</span>
                                <span>/levels</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        </aside>

        <!-- Right Side: Double Columns (Endpoint Details & Terminals) -->
        <main class="flex-1 flex flex-col md:flex-row overflow-y-auto relative">
            <div class="glow-overlay" style="top: 10%; left: 5%;"></div>
            <div class="glow-overlay" style="bottom: 10%; right: 5%;"></div>

            <!-- Center Column: API Details -->
            <section class="flex-1 p-6 lg:p-8 space-y-16 max-w-4xl border-r border-slate-800/45">
                
                <!-- Section: Overview -->
                <div id="overview" class="api-section space-y-4">
                    <h2 class="text-2xl font-black text-white tracking-tight">Dokumentasi API Tirta Barokah</h2>
                    <p class="text-sm text-slate-400 leading-relaxed">
                        Portal ini menjelaskan API pengembang (API spec) untuk mengontrol manajemen pendaftaran dan penjadwalan private renang di Tirta Barokah. Semua komunikasi dilakukan menggunakan format data **JSON**.
                    </p>
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider">Base URL</h4>
                        <div class="flex items-center gap-3">
                            <code class="px-3 py-1.5 bg-[#111c30] text-blue-400 border border-blue-500/15 rounded-xl font-mono text-xs select-all">
                                http://127.0.0.1:8081/
                            </code>
                            <span class="text-xs text-slate-400 font-medium">Port Development Server</span>
                        </div>
                    </div>
                </div>

                <!-- Section: Authentication -->
                <div id="auth-headers" class="api-section space-y-4">
                    <h2 class="text-xl font-extrabold text-white tracking-tight">Kunci Klien & Keamanan</h2>
                    <p class="text-xs text-slate-400 leading-relaxed">
                        Seluruh rute API di bawah `/api/*` dilindungi oleh filter otentikasi. Anda wajib menyertakan header pengenal klien global berikut di setiap request:
                    </p>

                    <div class="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40">
                        <table class="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr class="bg-slate-900 border-b border-slate-800 text-slate-450 uppercase font-bold tracking-wider">
                                    <th class="p-3.5">Header</th>
                                    <th class="p-3.5">Value</th>
                                    <th class="p-3.5">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-850 text-slate-300">
                                <tr>
                                    <td class="p-3.5 font-mono font-bold text-slate-200">X-Client-Key</td>
                                    <td class="p-3.5 font-mono text-blue-400">TirtaBarokahClientSecret2026</td>
                                    <td class="p-3.5">Kunci rahasia identitas aplikasi frontend (Wajib).</td>
                                </tr>
                                <tr>
                                    <td class="p-3.5 font-mono font-bold text-slate-200">Authorization</td>
                                    <td class="p-3.5 font-mono text-amber-500">Bearer &lt;token&gt;</td>
                                    <td class="p-3.5">Token sesi login pengguna untuk rute yang dilindungi (Opsional / Tergantung Rute).</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <hr class="border-slate-800/60">

                <!-- Auth API Endpoints -->
                <div class="space-y-12">
                    <h3 class="text-lg font-extrabold text-white tracking-tight border-l-4 border-indigo-500 pl-3">Rute Auth</h3>

                    <!-- Login -->
                    <div id="auth-login" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/auth/login</code>
                        </div>
                        <p class="text-xs text-slate-400">Digunakan untuk login Administrator dan Pelatih ke dalam portal masing-masing.</p>
                        
                        <h4 class="text-xs font-bold text-slate-350 uppercase tracking-widest">Request Body (JSON)</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center text-xs p-3 bg-slate-900/60 rounded-xl border border-slate-850">
                                <div><strong class="font-mono text-slate-200">username</strong> <span class="text-slate-500 italic">(string)</span></div>
                                <span class="text-[10px] bg-red-950/20 text-red-400 px-2 py-0.5 rounded-md font-bold uppercase border border-red-900/30">Required</span>
                            </div>
                            <div class="flex justify-between items-center text-xs p-3 bg-slate-900/60 rounded-xl border border-slate-850">
                                <div><strong class="font-mono text-slate-200">password</strong> <span class="text-slate-500 italic">(string)</span></div>
                                <span class="text-[10px] bg-red-950/20 text-red-400 px-2 py-0.5 rounded-md font-bold uppercase border border-red-900/30">Required</span>
                            </div>
                            <div class="flex justify-between items-center text-xs p-3 bg-slate-900/60 rounded-xl border border-slate-850">
                                <div><strong class="font-mono text-slate-200">role</strong> <span class="text-slate-500 italic">(string: "admin" | "coach")</span></div>
                                <span class="text-[10px] bg-red-950/20 text-red-400 px-2 py-0.5 rounded-md font-bold uppercase border border-red-900/30">Required</span>
                            </div>
                        </div>
                    </div>

                    <!-- Logout -->
                    <div id="auth-logout" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/auth/logout</code>
                        </div>
                        <p class="text-xs text-slate-400">Menghapus token akses sesi yang sedang aktif dari database.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Auth Required**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Parent Login -->
                    <div id="auth-parent-login" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/auth/parent-login</code>
                        </div>
                        <p class="text-xs text-slate-400">Autentikasi orang tua siswa menggunakan nomor WhatsApp untuk melihat progres latihan anak.</p>
                        <h4 class="text-xs font-bold text-slate-350 uppercase tracking-widest">Request Body (JSON)</h4>
                        <div class="flex justify-between items-center text-xs p-3 bg-slate-900/60 rounded-xl border border-slate-850">
                            <div><strong class="font-mono text-slate-200">whatsapp</strong> <span class="text-slate-500 italic">(string)</span></div>
                            <span class="text-[10px] bg-red-950/20 text-red-400 px-2 py-0.5 rounded-md font-bold uppercase border border-red-900/30">Required</span>
                        </div>
                    </div>
                </div>

                <hr class="border-slate-800/60">

                <!-- Coaches API -->
                <div class="space-y-12">
                    <h3 class="text-lg font-extrabold text-white tracking-tight border-l-4 border-emerald-500 pl-3">Rute Pelatih</h3>

                    <!-- Get Coaches -->
                    <div id="coaches-get" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs tracking-wider uppercase">GET</span>
                            <code class="text-sm font-bold font-mono text-white">/api/coaches</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengambil daftar semua pelatih aktif beserta detail harga paket dan alokasi jadwal mingguan mereka.</p>
                    </div>

                    <!-- Add Coach -->
                    <div id="coaches-add" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/coaches/add</code>
                        </div>
                        <p class="text-xs text-slate-400">Menambahkan pelatih baru ke dalam database.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Update Coach -->
                    <div id="coaches-update" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/coaches/update</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengupdate data profil, kuota siswa, paket harga, atau status aktif pelatih.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Delete Coach -->
                    <div id="coaches-delete" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-xs tracking-wider uppercase">DELETE</span>
                            <code class="text-sm font-bold font-mono text-white">/api/coaches/delete/{id}</code>
                        </div>
                        <p class="text-xs text-slate-400">Menghapus pelatih berdasarkan ID tertentu.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>
                </div>

                <hr class="border-slate-800/60">

                <!-- Members API -->
                <div class="space-y-12">
                    <h3 class="text-lg font-extrabold text-white tracking-tight border-l-4 border-emerald-500 pl-3">Rute Siswa</h3>

                    <!-- Get Members -->
                    <div id="members-get" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs tracking-wider uppercase">GET</span>
                            <code class="text-sm font-bold font-mono text-white">/api/members</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengambil seluruh data murid renang beserta progres, riwayat presensi, transaksi pembayaran, dan pengajuan reschedule.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin & Coach Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Register Member -->
                    <div id="members-register" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/members/register</code>
                        </div>
                        <p class="text-xs text-slate-400">Melakukan pendaftaran murid baru dari portal publik oleh orang tua.</p>
                    </div>

                    <!-- Verify Payment -->
                    <div id="members-verify" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/members/verify-payment</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengubah status pembayaran murid menjadi 'Pembayaran Berhasil' dan mengaktifkan kelasnya.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Update Member -->
                    <div id="members-update" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/members/update</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengedit informasi data murid, alokasi kelas, kuota sesi tersisa, atau status keaktifan kelas.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Delete Member -->
                    <div id="members-delete" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 text-xs tracking-wider uppercase">DELETE</span>
                            <code class="text-sm font-bold font-mono text-white">/api/members/delete/{id}</code>
                        </div>
                        <p class="text-xs text-slate-400">Menghapus data murid beserta riwayat pembayarannya berdasarkan ID.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Admin Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>
                </div>

                <hr class="border-slate-800/60">

                <!-- Other Endpoints -->
                <div class="space-y-12">
                    <h3 class="text-lg font-extrabold text-white tracking-tight border-l-4 border-emerald-500 pl-3">Jadwal & Pengaturan</h3>

                    <!-- Events -->
                    <div id="events-get" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs tracking-wider uppercase">GET</span>
                            <code class="text-sm font-bold font-mono text-white">/api/events</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengambil daftar pengumuman kegiatan akademik akademi air Tirta Barokah.</p>
                    </div>

                    <!-- Progress Add -->
                    <div id="progress-add" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/progress/add</code>
                        </div>
                        <p class="text-xs text-slate-400">Digunakan oleh pelatih untuk melakukan presensi murid dan menambahkan catatan evaluasi mingguan.</p>
                        <div class="p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-300 text-xs">
                            🔑 **Coach Only**: Membutuhkan header `Authorization: Bearer <token>`
                        </div>
                    </div>

                    <!-- Reschedule -->
                    <div id="reschedule-request" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs tracking-wider uppercase">POST</span>
                            <code class="text-sm font-bold font-mono text-white">/api/reschedule/request</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengajukan pemindahan jadwal murid ke hari/jam yang berbeda (langsung disetujui dalam sandbox).</p>
                    </div>

                    <!-- Settings -->
                    <div id="settings-get" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs tracking-wider uppercase">GET</span>
                            <code class="text-sm font-bold font-mono text-white">/api/settings</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengambil data konfigurasi dasar situs seperti kontak WA, alamat, dan deskripsi.</p>
                    </div>

                    <!-- Levels -->
                    <div id="levels-get" class="api-section space-y-4">
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs tracking-wider uppercase">GET</span>
                            <code class="text-sm font-bold font-mono text-white">/api/levels</code>
                        </div>
                        <p class="text-xs text-slate-400">Mengambil detail silabus / kurikulum tingkat kecakapan berenang yang diajarkan.</p>
                    </div>
                </div>

            </section>

            <!-- Right Column: Code Playground & Output Terminals -->
            <section class="w-full md:w-96 lg:w-[480px] bg-[#0c1322] border-l border-slate-800/80 p-6 flex flex-col gap-6 select-none shrink-0 sticky top-16 md:h-[calc(100vh-4.5rem)] overflow-y-auto">
                
                <!-- Terminal block -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                            <span>💻</span> Request Sample
                        </h4>
                        
                        <!-- Tab switcher -->
                        <div class="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
                            <button 
                                onclick="switchTab('curl')" 
                                id="tab-curl"
                                class="px-2.5 py-1 text-[10px] font-bold rounded-md transition-all text-blue-400 bg-slate-800"
                            >
                                cURL
                            </button>
                            <button 
                                onclick="switchTab('js')" 
                                id="tab-js"
                                class="px-2.5 py-1 text-[10px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-300"
                            >
                                JS Fetch
                            </button>
                        </div>
                    </div>

                    <!-- Code block -->
                    <div class="bg-slate-950 rounded-2xl border border-slate-850 p-4 relative font-mono text-[11px] leading-relaxed group">
                        
                        <!-- Copy button -->
                        <button 
                            onclick="copyCode()" 
                            class="absolute top-3 right-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white p-2 rounded-lg transition-all active:scale-95 cursor-pointer"
                            title="Copy to Clipboard"
                        >
                            <span id="copy-icon">📋</span>
                            <span id="copy-tooltip" class="absolute hidden -bottom-8 right-0 bg-slate-900 text-[9px] px-2 py-1 rounded-md border border-slate-800 text-emerald-400 font-sans font-bold whitespace-nowrap">Tersalin!</span>
                        </button>

                        <pre id="code-terminal" class="overflow-x-auto text-emerald-400 select-all pr-8 py-1">curl -X GET "http://127.0.0.1:8081/api/coaches" \
  -H "Accept: application/json" \
  -H "X-Client-Key: TirtaBarokahClientSecret2026"</pre>
                    </div>
                </div>

                <!-- Mock Response JSON block -->
                <div class="space-y-3">
                    <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <span>📥</span> Expected Response (200 OK)
                    </h4>
                    
                    <div class="bg-slate-950 rounded-2xl border border-slate-850 p-4 font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto">
                        <pre id="response-terminal" class="text-blue-400 whitespace-pre overflow-x-auto">[
  {
    "id": "coach-rian",
    "name": "Coach Rian",
    "photo": "/images/coach_rian.png",
    "experience": "Mantan Atlet Renang Daerah...",
    "referralCode": "COACH-RIAN",
    "referralBonus": 150000,
    "maxQuota": 6,
    "currentQuota": 2,
    "status": "Tersedia",
    "isActive": true
  }
]</pre>
                    </div>
                </div>

                <!-- Information info panel -->
                <div class="p-4 bg-blue-950/20 border border-blue-900/30 rounded-2xl text-xs text-blue-300 leading-normal flex items-start gap-2.5">
                    <span class="text-lg">💡</span>
                    <div>
                        <p class="font-bold mb-1">Sandbox Environment</p>
                        <p class="text-slate-400 text-[11px]">Anda dapat memodifikasi data ini langsung dari aplikasi frontend React di port `3000`. Perubahan akan secara langsung dicerminkan di database lokal Anda.</p>
                    </div>
                </div>

            </section>

        </main>

    </div>

    <!-- Page Logic -->
    <script>
        // Storage of endpoint sample code and mock responses
        const endpointSnippets = {
            overview: {
                curl: `curl -X GET "http://127.0.0.1:8081/" \\
  -H "Accept: text/html"`,
                js: `fetch("http://127.0.0.1:8081/")
  .then(response => response.text())
  .then(html => console.log(html));`,
                response: `<!-- Halaman Login HTML -->`
            },
            auth_headers: {
                curl: `curl -X GET "http://127.0.0.1:8081/api/coaches" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026"`,
                js: `fetch("http://127.0.0.1:8081/api/coaches", {
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  }
})
.then(res => res.json())
.then(data => console.log(data));`,
                response: `[
  { "id": "coach-rian", ... }
]`
            },
            auth_login: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  },
  body: JSON.stringify({
    username: "admin",
    password: "admin123",
    role: "admin"
  })
})
.then(res => res.json())
.then(data => console.log(data));`,
                response: `{
  "status": "success",
  "token": "a1f9e2d3b4...",
  "user": {
    "id": "admin-1",
    "username": "admin",
    "name": "Super Admin",
    "role": "admin"
  }
}`
            },
            auth_logout: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/auth/logout" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <auth_token>"`,
                js: `fetch("http://127.0.0.1:8081/api/auth/logout", {
  method: "POST",
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer " + localStorage.getItem("auth_token")
  }
})
.then(res => res.json());`,
                response: `{
  "status": "success",
  "message": "Berhasil keluar."
}`
            },
            auth_parent_login: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/auth/parent-login" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -d '{
    "whatsapp": "08123456789"
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/auth/parent-login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  },
  body: JSON.stringify({
    whatsapp: "08123456789"
  })
})
.then(res => res.json());`,
                response: `{
  "status": "success",
  "members": [
    {
      "id": "TB-834920",
      "student": { "fullName": "Budi Santoso", ... },
      "sessionsLeft": 10
    }
  ]
}`
            },
            coaches_get: {
                curl: `curl -X GET "http://127.0.0.1:8081/api/coaches" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026"`,
                js: `fetch("http://127.0.0.1:8081/api/coaches", {
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  }
})
.then(res => res.json());`,
                response: `[
  {
    "id": "coach-rian",
    "name": "Coach Rian",
    "experience": "Mantan Atlet...",
    "referralCode": "COACH-RIAN",
    "packages": [...],
    "schedule": [...]
  }
]`
            },
            coaches_add: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/coaches/add" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <admin_token>" \\
  -d '{
    "name": "Coach Toni",
    "experience": "Sertifikat Pelatih Muda",
    "maxQuota": 6
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/coaches/add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <admin_token>"
  },
  body: JSON.stringify({
    name: "Coach Toni",
    experience: "Sertifikat Pelatih Muda",
    maxQuota: 6
  })
})
.then(res => res.json());`,
                response: `{
  "status": "success",
  "id": "coach-coach-toni-491"
}`
            },
            coaches_update: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/coaches/update" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <admin_token>" \\
  -d '{
    "id": "coach-rian",
    "name": "Coach Rian",
    "maxQuota": 8,
    "isActive": true
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/coaches/update", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <admin_token>"
  },
  body: JSON.stringify({
    id: "coach-rian",
    name: "Coach Rian",
    maxQuota: 8,
    isActive: true
  })
})
.then(res => res.json());`,
                response: `{
  "status": "success"
}`
            },
            coaches_delete: {
                curl: `curl -X DELETE "http://127.0.0.1:8081/api/coaches/delete/coach-rian" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <admin_token>"`,
                js: `fetch("http://127.0.0.1:8081/api/coaches/delete/coach-rian", {
  method: "DELETE",
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <admin_token>"
  }
})
.then(res => res.json());`,
                response: `{
  "status": "success"
}`
            },
            members_get: {
                curl: `curl -X GET "http://127.0.0.1:8081/api/members" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <auth_token>"`,
                js: `fetch("http://127.0.0.1:8081/api/members", {
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <auth_token>"
  }
})
.then(res => res.json());`,
                response: `[
  {
    "id": "TB-104928",
    "parent": { "fatherMotherName": "Anto", "whatsapp": "0812..." },
    "student": { "fullName": "Budi", "age": 10, ... },
    "status": "Aktif",
    "sessionsLeft": 8
  }
]`
            },
            members_register: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/members/register" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -d '{
    "parent": {
      "fatherMotherName": "Agus Santoso",
      "whatsapp": "0852734499"
    },
    "student": {
      "fullName": "Clara Santoso",
      "gender": "Perempuan",
      "dob": "2015-08-12",
      "age": 11,
      "hasSwumBefore": true
    },
    "coachId": "coach-rian",
    "packageId": "rian-p8",
    "scheduleFrequency": "1x Seminggu",
    "scheduleDay": "Senin",
    "scheduleTime": "08.00",
    "coachType": "Pelatih Utama",
    "sessionsLeft": 8,
    "sessionsTotal": 8,
    "payment": {
      "amount": 450000,
      "method": "Transfer Bank Mandiri"
    }
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/members/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  },
  body: JSON.stringify({ /* Pendaftaran payload */ })
})
.then(res => res.json());`,
                response: `{
  "status": "success",
  "id": "TB-384920"
}`
            },
            members_verify: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/members/verify-payment" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <admin_token>" \\
  -d '{
    "id": "TB-384920"
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/members/verify-payment", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <admin_token>"
  },
  body: JSON.stringify({ id: "TB-384920" })
})
.then(res => res.json());`,
                response: `{
  "status": "success"
}`
            },
            members_update: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/members/update" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <admin_token>" \\
  -d '{
    "id": "TB-384920",
    "status": "Aktif",
    "sessionsLeft": 12
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/members/update", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <admin_token>"
  },
  body: JSON.stringify({ id: "TB-384920", status: "Aktif", sessionsLeft: 12 })
})
.then(res => res.json());`,
                response: `{
  "status": "success"
}`
            },
            members_delete: {
                curl: `curl -X DELETE "http://127.0.0.1:8081/api/members/delete/TB-384920" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <admin_token>"`,
                js: `fetch("http://127.0.0.1:8081/api/members/delete/TB-384920", {
  method: "DELETE",
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <admin_token>"
  }
})
.then(res => res.json());`,
                response: `{
  "status": "success"
}`
            },
            events_get: {
                curl: `curl -X GET "http://127.0.0.1:8081/api/events" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026"`,
                js: `fetch("http://127.0.0.1:8081/api/events", {
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  }
})
.then(res => res.json());`,
                response: `[
  {
    "id": "event-1234",
    "title": "Fun Swimming Gala 2026",
    "category": "Perlombaan",
    "date": "2026-08-20"
  }
]`
            },
            progress_add: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/progress/add" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -H "Authorization: Bearer <coach_token>" \\
  -d '{
    "memberId": "TB-104928",
    "attendance": "Hadir",
    "note": "Gerakan meluncur sudah stabil, koordinasi tangan membaik.",
    "date": "2026-07-19"
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/progress/add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026",
    "Authorization": "Bearer <coach_token>"
  },
  body: JSON.stringify({
    memberId: "TB-104928",
    attendance: "Hadir",
    note: "Gerakan meluncur sudah stabil..."
  })
})
.then(res => res.json());`,
                response: `{
  "status": "success",
  "sessionsLeft": 7
}`
            },
            reschedule_request: {
                curl: `curl -X POST "http://127.0.0.1:8081/api/reschedule/request" \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026" \\
  -d '{
    "memberId": "TB-104928",
    "requestedDay": "Selasa",
    "requestedTime": "16.00",
    "reason": "Acara keluarga mendadak"
  }'`,
                js: `fetch("http://127.0.0.1:8081/api/reschedule/request", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  },
  body: JSON.stringify({
    memberId: "TB-104928",
    requestedDay: "Selasa",
    requestedTime: "16.00",
    reason: "Acara keluarga"
  })
})
.then(res => res.json());`,
                response: `{
  "status": "success"
}`
            },
            settings_get: {
                curl: `curl -X GET "http://127.0.0.1:8081/api/settings" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026"`,
                js: `fetch("http://127.0.0.1:8081/api/settings", {
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  }
})
.then(res => res.json());`,
                response: `{
  "status": "success",
  "settings": {
    "whatsapp_admin": "62853772291",
    "pool_address": "Palembang Sports Center",
    "company_name": "Tirta Barokah Academy"
  }
}`
            },
            levels_get: {
                curl: `curl -X GET "http://127.0.0.1:8081/api/levels" \\
  -H "X-Client-Key: TirtaBarokahClientSecret2026"`,
                js: `fetch("http://127.0.0.1:8081/api/levels", {
  headers: {
    "X-Client-Key": "TirtaBarokahClientSecret2026"
  }
})
.then(res => res.json());`,
                response: `[
  {
    "id": 1,
    "level_number": 1,
    "name": "Water Familiarization",
    "target_learning": "Keberanian dasar air & meluncur",
    "materials": "Napas gelembung, meluncur tanpa ban",
    "graduation_target": "Meluncur 5 meter secara mandiri"
  }
]`
            }
        };

        let currentActiveTab = 'curl'; // 'curl' or 'js'
        let currentSelectedSectionId = 'coaches_get'; // default snippet selection

        // Listen for user scroll or click to load correct code snippet dynamically
        document.addEventListener('DOMContentLoaded', () => {
            const apiSections = document.querySelectorAll('.api-section');
            const navLinks = document.querySelectorAll('aside nav a');

            // Scrollspy implementation
            const observerOptions = {
                root: null,
                rootMargin: '0px 0px -60% 0px',
                threshold: 0
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        
                        // Map id (e.g. coaches-get) to key (e.g. coaches_get)
                        const key = id.replace(/-/g, '_');
                        if (endpointSnippets[key]) {
                            currentSelectedSectionId = key;
                            updateTerminal();
                        }

                        // Update active link in sidebar
                        navLinks.forEach(link => {
                            if (link.getAttribute('href') === '#' + id) {
                                link.classList.add('sidebar-active');
                            } else {
                                link.classList.remove('sidebar-active');
                            }
                        });
                    }
                });
            }, observerOptions);

            apiSections.forEach(section => observer.observe(section));

            // Sidebar search filtering
            const searchInput = document.getElementById('apiSearch');
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                
                // Filter main sections
                apiSections.forEach(sec => {
                    const text = sec.textContent.toLowerCase();
                    const id = sec.id.toLowerCase();
                    if (text.includes(term) || id.includes(term)) {
                        sec.style.display = 'block';
                    } else {
                        sec.style.display = 'none';
                    }
                });

                // Filter sidebar links
                const navGroups = document.querySelectorAll('aside nav > div');
                navGroups.forEach(group => {
                    const links = group.querySelectorAll('ul li');
                    let groupHasMatches = false;
                    
                    links.forEach(li => {
                        const linkText = li.textContent.toLowerCase();
                        if (linkText.includes(term)) {
                            li.style.display = 'block';
                            groupHasMatches = true;
                        } else {
                            li.style.display = 'none';
                        }
                    });

                    // Hide header category if no matching sub-links
                    const header = group.querySelector('h3');
                    if (header) {
                        if (groupHasMatches || term === '') {
                            header.style.display = 'block';
                            group.style.display = 'block';
                        } else {
                            header.style.display = 'none';
                            group.style.display = 'none';
                        }
                    }
                });
            });
        });

        // Switch between Curl and JS tab inside request block
        function switchTab(tab) {
            currentActiveTab = tab;
            const btnCurl = document.getElementById('tab-curl');
            const btnJs = document.getElementById('tab-js');

            if (tab === 'curl') {
                btnCurl.classList.add('bg-slate-800', 'text-blue-400');
                btnCurl.classList.remove('text-slate-500');
                btnJs.classList.remove('bg-slate-800', 'text-blue-400');
                btnJs.classList.add('text-slate-500');
            } else {
                btnJs.classList.add('bg-slate-800', 'text-blue-400');
                btnJs.classList.remove('text-slate-500');
                btnCurl.classList.remove('bg-slate-800', 'text-blue-400');
                btnCurl.classList.add('text-slate-500');
            }

            updateTerminal();
        }

        // Update the visual contents in code block terminals
        function updateTerminal() {
            const codeTerminal = document.getElementById('code-terminal');
            const responseTerminal = document.getElementById('response-terminal');

            if (endpointSnippets[currentSelectedSectionId]) {
                const spec = endpointSnippets[currentSelectedSectionId];
                codeTerminal.textContent = currentActiveTab === 'curl' ? spec.curl : spec.js;
                responseTerminal.textContent = spec.response;
            }
        }

        // Copy text helper
        function copyCode() {
            const codeText = document.getElementById('code-terminal').textContent;
            navigator.clipboard.writeText(codeText).then(() => {
                const tooltip = document.getElementById('copy-tooltip');
                const copyIcon = document.getElementById('copy-icon');
                
                copyIcon.textContent = '✅';
                tooltip.classList.remove('hidden');
                
                setTimeout(() => {
                    copyIcon.textContent = '📋';
                    tooltip.classList.add('hidden');
                }, 1800);
            });
        }
    </script>

</body>
</html>
