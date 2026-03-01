import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-purple-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VideoFunnel AI
          </span>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
              Login
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            Turn Keywords into <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Viral Video Funnels
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The only hands-off system that generates VSLs, Shorts, and Landing Pages from a single keyword.
            Zero editing required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold text-lg transition shadow-lg shadow-purple-500/25">
              Start Automating Now
            </Link>
            <Link href="#how-it-works" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold text-lg transition border border-white/10">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="how-it-works" className="py-20 bg-zinc-900/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "AI VSL Generator", desc: "Turns text into high-converting Video Sales Letters with stock footage." },
              { title: "Viral Shorts Engine", desc: "Auto-creates 9:16 vertical videos for YouTube Shorts & Reels." },
              { title: "WhatsApp CRM", desc: "Round-robin lead distribution to your sales agents automatically." }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-black border border-white/10 hover:border-purple-500/50 transition duration-300">
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
