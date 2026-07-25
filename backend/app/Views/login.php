<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Tirta Barokah API Hub</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS v3 CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #0b0f19;
            overflow: hidden;
        }

        /* Glassmorphic card styling */
        .glass-panel {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .glass-input {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-input:focus {
            background: rgba(255, 255, 255, 0.07);
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
            outline: none;
        }

        /* Decorative glowing blobs in the background */
        .glow-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(120px);
            opacity: 0.18;
            z-index: 0;
            animation: float-blob 12s infinite alternate ease-in-out;
        }

        .blob-1 {
            background: #2563eb;
            width: 450px;
            height: 450px;
            top: -10%;
            left: -10%;
            animation-duration: 15s;
        }

        .blob-2 {
            background: #0d9488;
            width: 500px;
            height: 500px;
            bottom: -15%;
            right: -5%;
            animation-duration: 18s;
        }

        .blob-3 {
            background: #4f46e5;
            width: 350px;
            height: 350px;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation-duration: 12s;
            opacity: 0.1;
        }

        @keyframes float-blob {
            0% {
                transform: translate(0, 0) scale(1) rotate(0deg);
            }
            50% {
                transform: translate(30px, -40px) scale(1.1) rotate(180deg);
            }
            100% {
                transform: translate(-20px, 20px) scale(0.9) rotate(360deg);
            }
        }

        /* Slide up animations */
        .animate-slide-up {
            animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center relative p-4">

    <!-- Glowing background elements -->
    <div class="glow-blob blob-1"></div>
    <div class="glow-blob blob-2"></div>
    <div class="glow-blob blob-3"></div>

    <!-- Login card container -->
    <div class="w-full max-w-md z-10 animate-slide-up">
        
        <!-- Logo / Brand Title -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-2xl mb-4">
                <span class="text-3xl filter drop-shadow-[0_0_12px_rgba(37,99,235,0.4)]">🏊‍♂️</span>
            </div>
            <h1 class="text-2xl font-extrabold tracking-tight text-white font-sans">
                TIRTA BAROKAH
            </h1>
            <p class="text-xs text-slate-400 mt-1 font-medium uppercase tracking-widest">
                Developer API Hub & Docs
            </p>
        </div>

        <!-- Glass card -->
        <div class="glass-panel rounded-3xl p-8 border border-slate-800">
            
            <h2 class="text-lg font-bold text-white mb-2">Login Administrator</h2>
            <p class="text-xs text-slate-400 mb-6">Silakan masuk menggunakan akun pengembang untuk mengakses spesifikasi dokumentasi API.</p>

            <!-- Error message if exists -->
            <?php if (session()->getFlashdata('error')): ?>
                <div class="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <span>⚠️</span>
                    <span><?= session()->getFlashdata('error') ?></span>
                </div>
            <?php endif; ?>

            <!-- Login Form -->
            <form action="<?= base_url('login') ?>" method="POST" class="space-y-5">
                <?= csrf_field() ?>
                
                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-405 uppercase tracking-widest block">Username</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none text-xs">👤</span>
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="Ketik username Anda"
                            class="w-full glass-input pl-9.5 pr-4 py-3 rounded-xl text-sm placeholder:text-slate-550"
                            required
                        >
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-405 uppercase tracking-widest block">Password</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none text-xs">🔒</span>
                        <input 
                            type="password" 
                            name="password" 
                            placeholder="••••••••"
                            class="w-full glass-input pl-9.5 pr-4 py-3 rounded-xl text-sm placeholder:text-slate-550"
                            required
                        >
                    </div>
                </div>

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    class="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
                >
                    <span>Masuk ke Dashboard API</span>
                    <span>→</span>
                </button>
            </form>
        </div>

    </div>

</body>
</html>
