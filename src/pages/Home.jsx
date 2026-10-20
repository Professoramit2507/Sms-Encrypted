import { Link } from 'react-router-dom';
import { Lock, Shield, Smartphone, EyeOff, KeyRound, Server, Sparkles, CheckCheck, Key } from 'lucide-react';
import Navbar from '../components/common/Navbar.jsx';

const FEATURES = [
  {
    icon: Lock,
    title: 'Client-Side Encryption',
    body: 'Messages are converted to ciphertext inside your browser using AES-GCM-256 before leaving your device.',
  },
  {
    icon: KeyRound,
    title: 'Unique Receiver Keys',
    body: 'Every receiver has a unique keypair. The symmetric session key is wrapped specifically for the receiver using RSA-OAEP.',
  },
  {
    icon: EyeOff,
    title: 'Zero Plaintext Exposure',
    body: 'No passwords or private keys are ever sent in URLs, headers, or query params. Keys stay sealed in IndexedDB.',
  },
  {
    icon: Server,
    title: 'Centralized API Layer',
    body: 'Clean separation between cryptographic processing and network transport for effortless production backend integration.',
  },
  {
    icon: Smartphone,
    title: 'WhatsApp-Style Interface',
    body: 'Natural two-way chat bubble alignments with sent/delivered status checkmarks, responsive across phones and desktops.',
  },
  {
    icon: Shield,
    title: 'Verifiable Key Fingerprints',
    body: 'Inspect public key fingerprints and rotate unique keys anytime with instant client-side key regeneration.',
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 dark:bg-obsidian-950 dark:text-slate-100 overflow-x-hidden">
      {/* ব্যাকগ্রাউন্ড অ্যাম্পলিফায়ার */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px] dark:bg-teal-500/8" />
        <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-500/6" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* হিরো সেকশন */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-50/80 px-3.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Next-Gen End-to-End Cryptography</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white leading-[1.15]">
              Private Messaging,{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300">
                Guaranteed
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Secure SMS encrypts messages in your browser using AES-GCM and wraps them with the receiver&apos;s unique RSA key.
              Ciphertext in transit, plaintext only on authorized devices.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary py-3 px-6 text-sm shadow-glow">
                Start Chatting Free
              </Link>
              <Link to="/login" className="btn-secondary py-3 px-6 text-sm">
                Sign In Demo
              </Link>
            </div>

            {/* ট্রাস্ট ব্যাজেস */}
            <div className="mt-10 flex items-center gap-6 border-t border-slate-200/80 pt-6 dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                No Key Leakage
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                IndexedDB Keystore
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                RSA-OAEP-2048
              </span>
            </div>
          </div>

          {/* ইন্টারঅ্যাক্টিভ প্রিভিউ কার্ড */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500/30 to-emerald-500/30 blur-xl opacity-70" />
            <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-obsidian-900/90">
              {/* চ্যাট প্রিভিউ হেডার */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-xs font-bold text-teal-800 dark:text-teal-200 border border-teal-500/20">
                    AJ
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Alice Johnson (Receiver)</p>
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      online · End-to-end encrypted
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-teal-300/80 bg-teal-50 px-2.5 py-1 text-[10px] font-mono font-medium text-teal-800 dark:border-teal-700/60 dark:bg-teal-950/70 dark:text-teal-300">
                  <Key className="h-3 w-3" />
                  <span>RCV-KEY-A92B…</span>
                </div>
              </div>

              {/* চ্যাট প্রিভিউ বডি */}
              <div className="my-6 space-y-3.5">
                {/* রিসিভারের মেসেজ (বাম পাশে) */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-slate-100 px-4 py-2.5 text-xs text-slate-800 dark:bg-[#202c33] dark:text-slate-100 shadow-sm">
                    <p>Hi! Can you send me the confidential project notes?</p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                      <Lock className="h-2.5 w-2.5" />
                      <span>12:28 PM</span>
                    </div>
                  </div>
                </div>

                {/* সেন্ডারের মেসেজ (ডান পাশে - হোয়াটসঅ্যাপ স্টাইল) */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#d9fdd3] px-4 py-2.5 text-xs text-[#111b21] dark:bg-[#005c4b] dark:text-emerald-50 shadow-sm border border-[#baf0b0]/50 dark:border-none">
                    <p>Sent! Encrypted with your unique key (RCV-KEY-A92B). Only you can decrypt it locally.</p>
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] text-slate-600 dark:text-emerald-200">
                      <Lock className="h-2.5 w-2.5" />
                      <span>12:30 PM</span>
                      <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* চ্যাট প্রিভিউ ফুটার */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-white/5 dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  Zero-Knowledge Ciphertext Storage
                </span>
                <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400">AES-GCM-256</span>
              </div>
            </div>
          </div>
        </section>

        {/* ফিচারস গ্রিড */}
        <section className="border-t border-slate-200/80 bg-white/70 py-20 dark:border-white/10 dark:bg-obsidian-900/60 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Architecture</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Engineered for provable message privacy
              </h2>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article key={title} className="card-hover group">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-white/5 dark:text-teal-400 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white dark:group-hover:bg-teal-500 dark:group-hover:text-obsidian-950 transition-all duration-200 shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ফুটার */}
        <footer className="border-t border-slate-200/80 py-8 text-center text-xs text-slate-400 dark:border-white/10">
          <p>Secure SMS · End-to-End Cryptography with Unique Receiver Keys · Designed for Privacy</p>
        </footer>
      </div>
    </div>
  );
}
