import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Menu, X, Home, Gamepad2, Lock, Users, Share2, Trophy, ChevronDown, Heart, FileText, ExternalLink, Twitter, MessageCircle, Send, Bot, Youtube, Video, CheckCircle2, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SHARE_URL = "https://docs.google.com/document/d/1DEb_W0fxCGWaGN97KcVkVqD1JmZEOUrl5DpCCaayHe0/edit?tab=t.0#heading=h.4a00a8jkgs1z";
const SHARE_TEXT = "This Legacy Vault concept would change NBA 2K forever 🔥";

// Default content fallbacks
const DEFAULT_CONTENT = {
  vault_headline: "One Vault. Four Eras. Infinite Play.",
  vault_subheadline: "The revolutionary concept that changes everything.",
  vault_description: `The NBA 2K Legacy Vault is a revolutionary 'game-within-a-game' mode. Launch full, untouched versions of 2K15, 2K16, 2K17, and 2K20 directly inside modern NBA 2K — powered by secure containers on persistent online servers.

No more sunsets. No player-base split. No cheating.

Friends list works across every era. Park, Pro-Am, Rec, MyTEAM, MyCAREER — all alive forever.

Monetization? Simple subscription or one-time DLC to unlock the Vault. Cosmetic packs per era. High-margin nostalgia revenue that prints money while keeping the community together.`,
  vault_features: "Eternal online for every classic|Unified progression & friends|Cheat-proof containers|Recurring revenue stream for 2K|OG retention + new players discovering history",
  hero_headline: "The NBA 2K Legacy Vault",
  hero_subheadline: "2K15 • 2K16 • 2K17 • 2K20 — All in one place.",
  hero_tagline: "Persistent online. No resets. Ever."
};

// Header Component
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-white/10" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2" data-testid="logo">
            <div className="relative">
              <span className="font-heading text-2xl font-black text-white">2K</span>
              <div className="absolute -top-1 -right-2 w-3 h-3 rounded-full bg-[#C8102E]"></div>
            </div>
            <span className="font-heading text-xl font-bold text-white hover:text-[#C8102E] transition-colors cursor-pointer red-glow">
              Legacy Vault
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('hero')} className="text-white hover:text-[#C8102E] transition-colors font-medium" data-testid="nav-home">Home</button>
            <button onClick={() => scrollTo('games')} className="text-white hover:text-[#C8102E] transition-colors font-medium" data-testid="nav-games">The Games</button>
            <button onClick={() => scrollTo('vault')} className="text-white hover:text-[#C8102E] transition-colors font-medium" data-testid="nav-vault">The Vault</button>
            <button onClick={() => scrollTo('community')} className="text-white hover:text-[#C8102E] transition-colors font-medium" data-testid="nav-community">Community</button>
            
            {/* Connectivity Indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isOnline 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`} data-testid="connectivity-indicator">
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden lg:inline">{isOnline ? 'LIVE' : 'VAULT'}</span>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/10" data-testid="mobile-menu">
          <nav className="flex flex-col p-4 gap-4">
            <button onClick={() => scrollTo('hero')} className="text-white hover:text-[#C8102E] transition-colors font-medium text-left py-2">Home</button>
            <button onClick={() => scrollTo('games')} className="text-white hover:text-[#C8102E] transition-colors font-medium text-left py-2">The Games</button>
            <button onClick={() => scrollTo('vault')} className="text-white hover:text-[#C8102E] transition-colors font-medium text-left py-2">The Vault</button>
            <button onClick={() => scrollTo('community')} className="text-white hover:text-[#C8102E] transition-colors font-medium text-left py-2">Community</button>
            
            {/* Mobile Connectivity */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
              isOnline 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isOnline ? 'LIVE SYNC' : 'VAULT MODE'}</span>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

// Hero Section
const HeroSection = ({ content }) => {
  const headline = content.hero_headline || DEFAULT_CONTENT.hero_headline;
  const subheadline = content.hero_subheadline || DEFAULT_CONTENT.hero_subheadline;
  const tagline = content.hero_tagline || DEFAULT_CONTENT.hero_tagline;

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const shareOnX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`, '_blank');
  };

  const shareOnReddit = () => {
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(SHARE_URL)}&title=${encodeURIComponent(SHARE_TEXT)}`, '_blank');
  };

  const shareOnTikTok = () => {
    navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
    toast.success("Link copied! Share it on TikTok");
  };

  return (
    <section id="hero" className="hero-section court-pattern pt-20" data-testid="hero-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Vault Door */}
        <div className="vault-door vault-pulse mx-auto mb-8 animate-fade-in-up" data-testid="vault-door">
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-12 h-12 text-[#C8102E]" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-black text-white uppercase tracking-tight mb-4 animate-fade-in-up animation-delay-100" data-testid="hero-headline">
          <span className="underline-red">{headline}</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-2 animate-fade-in-up animation-delay-200 font-heading" data-testid="hero-subheadline">
          {subheadline.split('•').map((part, i) => (
            <span key={i}>
              {i > 0 && ' • '}
              <span className={part.includes('2K') ? 'text-[#C8102E]' : ''}>{part.trim()}</span>
            </span>
          ))}
        </p>
        <p className="text-base sm:text-lg text-white/80 mb-8 animate-fade-in-up animation-delay-200">
          {tagline.includes('Ever.') ? (
            <>{tagline.replace('Ever.', '')}<span className="text-[#C8102E] font-bold">Ever.</span></>
          ) : tagline}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in-up animation-delay-300">
          <Button 
            onClick={() => scrollTo('games')} 
            className="btn-primary text-base sm:text-lg px-8 py-6"
            data-testid="explore-games-btn"
          >
            Explore the Games
          </Button>
          <Button 
            onClick={() => scrollTo('vault')} 
            variant="outline"
            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black text-base sm:text-lg px-8 py-6 uppercase tracking-widest font-bold"
            data-testid="see-vision-btn"
          >
            See the Vision
          </Button>
        </div>

        {/* Share Row */}
        <div className="flex justify-center gap-4 animate-fade-in-up animation-delay-400" data-testid="share-row">
          <button onClick={shareOnX} className="share-btn" data-testid="share-x">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </button>
          <button onClick={shareOnReddit} className="share-btn" data-testid="share-reddit">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
          </button>
          <button onClick={shareOnTikTok} className="share-btn" data-testid="share-tiktok">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/50" />
        </div>
      </div>
    </section>
  );
};

// Game Card Component
const GameCard = ({ game, onClick }) => {
  return (
    <div 
      className="game-card bg-[#09090B] rounded-md overflow-hidden cursor-pointer group"
      onClick={onClick}
      data-testid={`game-card-${game.year}`}
    >
      <div className="aspect-[3/4] overflow-hidden">
        <img 
          src={game.cover_image} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="font-heading text-xl font-bold text-white uppercase">{game.title}</h3>
        <p className="text-white/60 text-sm mb-2">{game.year}</p>
        <p className="text-[#C8102E] text-sm font-medium">{game.hook_text}</p>
      </div>
    </div>
  );
};

// Games Section
const GamesSection = ({ games }) => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [clips, setClips] = useState([]);
  const [loadingClips, setLoadingClips] = useState(false);

  const fetchClips = async (gameId) => {
    setLoadingClips(true);
    try {
      const response = await axios.get(`${API}/clips/game/${gameId}`);
      setClips(response.data);
    } catch (error) {
      console.error('Error fetching clips:', error);
      setClips([]);
    }
    setLoadingClips(false);
  };

  const handleOpenGame = (game) => {
    setSelectedGame(game);
    fetchClips(game.id);
  };

  return (
    <section id="games" className="py-20 court-pattern" data-testid="games-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase text-center mb-4">
          <span className="underline-red">The Games</span>
        </h2>
        <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
          Four legendary eras of NBA 2K basketball. Each one a masterpiece. All preserved forever.
        </p>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onClick={() => handleOpenGame(game)} />
          ))}
        </div>
      </div>

      {/* Game Detail Modal */}
      <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
        <DialogContent className="bg-[#09090B] border-white/10 max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="game-modal">
          {selectedGame && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-3xl font-black text-white uppercase">
                  {selectedGame.title} <span className="text-[#C8102E]">({selectedGame.year})</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div>
                  <img 
                    src={selectedGame.cover_image} 
                    alt={selectedGame.title}
                    className="w-full rounded-md"
                  />
                </div>
                <div>
                  <h4 className="text-[#C8102E] font-heading text-lg font-bold uppercase mb-2">Cover</h4>
                  <p className="text-white/80 mb-4">{selectedGame.cover_athletes}</p>
                  
                  <h4 className="text-[#C8102E] font-heading text-lg font-bold uppercase mb-2">The Legacy</h4>
                  <p className="text-white/80 leading-relaxed">{selectedGame.description}</p>
                </div>
              </div>

              {/* Main YouTube Embed */}
              {selectedGame.youtube_embed && (
                <div className="mt-6">
                  <h4 className="text-[#C8102E] font-heading text-lg font-bold uppercase mb-4">Featured Gameplay</h4>
                  <div className="aspect-video">
                    <iframe
                      src={selectedGame.youtube_embed}
                      title={`${selectedGame.title} Gameplay`}
                      className="w-full h-full rounded-md"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Additional Clips */}
              {loadingClips ? (
                <div className="mt-6 text-center">
                  <div className="spinner mx-auto"></div>
                </div>
              ) : clips.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-[#C8102E] font-heading text-lg font-bold uppercase mb-4">
                    More Clips & Content ({clips.length})
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {clips.map((clip) => (
                      <div key={clip.id} className="bg-black p-3 rounded-md border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs uppercase px-2 py-0.5 rounded ${
                            clip.platform === 'youtube' ? 'bg-red-500/20 text-red-400' :
                            clip.platform === 'tiktok' ? 'bg-pink-500/20 text-pink-400' :
                            clip.platform === 'instagram' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-white/10 text-white/60'
                          }`}>
                            {clip.platform}
                          </span>
                        </div>
                        <h5 className="text-white font-medium text-sm mb-2">{clip.title}</h5>
                        {clip.description && (
                          <p className="text-white/60 text-xs mb-2">{clip.description}</p>
                        )}
                        <div className="aspect-video">
                          <iframe
                            src={clip.embed_url}
                            title={clip.title}
                            className="w-full h-full rounded"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

// Vault Section
const VaultSection = ({ content, games, proofs, mockups }) => {
  const headline = content.vault_headline || DEFAULT_CONTENT.vault_headline;
  const subheadline = content.vault_subheadline || DEFAULT_CONTENT.vault_subheadline;
  const description = content.vault_description || DEFAULT_CONTENT.vault_description;
  const features = (content.vault_features || DEFAULT_CONTENT.vault_features).split('|');
  const googleDocUrl = content.google_doc_url || DEFAULT_CONTENT.google_doc_url;
  const googleDocLabel = content.google_doc_label || DEFAULT_CONTENT.google_doc_label;

  // Default fallback mockups if none in database
  const defaultMockups = [
    { id: 'default-1', title: 'Vault Menu', description: 'Vault menu showing all four game icons in modern 2K', media_type: 'placeholder', type: 'vault-menu' },
    { id: 'default-2', title: 'ENTERING 2K16...', description: 'Loading screen transitioning into classic era', media_type: 'placeholder', type: 'loading' },
    { id: 'default-3', title: 'Unified Friends', description: 'Unified friends list across all eras', media_type: 'placeholder', type: 'friends' }
  ];

  const displayMockups = mockups && mockups.length > 0 ? mockups : defaultMockups;

  return (
    <section id="vault" className="py-20 bg-[#09090B]" data-testid="vault-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase text-center mb-4">
          <span className="underline-red">{headline}</span>
        </h2>
        <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
          {subheadline}
        </p>

        {/* Multi-Cover Banner */}
        {games.length > 0 && (
          <div className="mb-12 overflow-hidden">
            <div className="flex justify-center gap-2 sm:gap-4">
              {games.slice(0, 5).map((game, index) => (
                <div 
                  key={game.id} 
                  className="relative group"
                  style={{ transform: `rotate(${(index - 2) * 3}deg)` }}
                >
                  <img 
                    src={game.cover_image} 
                    alt={game.title}
                    className="w-20 sm:w-28 md:w-36 h-auto rounded-md border-2 border-white/20 group-hover:border-[#C8102E] transition-all shadow-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs font-heading text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {game.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Doc Link Button */}
        {googleDocUrl && (
          <div className="text-center mb-8">
            <a 
              href={googleDocUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#C8102E] hover:bg-[#9e0c24] text-white font-bold py-3 px-6 rounded-md transition-all"
              data-testid="google-doc-link"
            >
              <FileText size={20} />
              {googleDocLabel}
              <ExternalLink size={16} />
            </a>
          </div>
        )}

        {/* Concept Description */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-black p-6 sm:p-8 rounded-md border border-white/10">
            {description.split('\n\n').map((para, index) => (
              <p key={index} className="text-white/90 text-base sm:text-lg leading-relaxed mb-4 last:mb-0">
                {para.includes('No more sunsets') ? (
                  <><span className="text-[#C8102E] font-bold">No more sunsets.</span> {para.replace('No more sunsets. ', '')}</>
                ) : para.includes('Monetization?') ? (
                  <><span className="text-[#C8102E]">Monetization?</span> {para.replace('Monetization? ', '')}</>
                ) : para}
              </p>
            ))}
          </div>
        </div>

        {/* How It Works - Technical Sections */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* How Licensing Gets Solved */}
          <div className="bg-black p-6 rounded-md border border-white/10" data-testid="licensing-section">
            <h3 className="font-heading text-lg font-bold text-white uppercase mb-4">
              <span className="text-[#C8102E]">How Licensing</span> Gets Solved
            </h3>
            <p className="text-white/70 text-sm mb-4">
              No rebuilding games from scratch. Expired music, jerseys, and player likenesses are handled through modular asset layers inside each container. Swap out what's expired. Keep everything else exactly as it was.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Expired music replaced with production libraries or custom soundtracks
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Jersey and court art updated as standalone asset packs
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Player likenesses handled through neutral overlays or community rosters
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Zero changes to core gameplay code
              </li>
            </ul>
          </div>

          {/* How It Scales Without Breaking */}
          <div className="bg-black p-6 rounded-md border border-white/10" data-testid="scaling-section">
            <h3 className="font-heading text-lg font-bold text-white uppercase mb-4">
              <span className="text-[#C8102E]">How It Scales</span> Without Breaking
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Kubernetes orchestration means the Vault grows with demand automatically.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Build once, run anywhere — every session is identical
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Elastic scaling activates automatically during Throwback events
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Each title runs in its own isolated container
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                Server cost per session stays minimal through shared infrastructure
              </li>
            </ul>
          </div>

          {/* The Pilot Test */}
          <div className="bg-black p-6 rounded-md border border-[#C8102E]/50" data-testid="pilot-section">
            <h3 className="font-heading text-lg font-bold text-white uppercase mb-4">
              <span className="text-[#C8102E]">The Pilot Test</span> That Proves Everything
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Before full rollout — one 48-hour NBA 2K16 Throwback Weekend. Budget under $750K.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                <span><strong className="text-white">Target:</strong> 15-20% DAU uplift vs baseline</span>
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                <span><strong className="text-white">Metrics:</strong> Session length, VC crossover, Day 2 return rate</span>
              </li>
              <li className="flex items-start gap-2 text-white/80 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E] mt-1.5 flex-shrink-0"></span>
                <span><strong className="text-white">If it hits</strong> — full Legacy Vault gets greenlit.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Proof of Demand Gallery */}
        {proofs && proofs.length > 0 && (
          <div className="mb-12">
            <h3 className="font-heading text-2xl font-bold text-white uppercase text-center mb-6">
              <span className="text-[#C8102E]">Proof</span> of Demand
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proofs.map((proof) => (
                <div key={proof.id} className="bg-black rounded-md border border-white/10 overflow-hidden group" data-testid={`proof-card-${proof.id}`}>
                  <img 
                    src={proof.image_url} 
                    alt={proof.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-sm">{proof.title}</h4>
                        {proof.description && (
                          <p className="text-white/60 text-xs mt-1">{proof.description}</p>
                        )}
                        {proof.source && (
                          <p className="text-[#C8102E] text-xs mt-1">Source: {proof.source}</p>
                        )}
                      </div>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`The community wants NBA 2K Legacy Servers back! ${proof.title} - Check out the proof: ${SHARE_URL} @NBA2K #NBA2K #LegacyVault #BringBack2K`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white p-2 rounded-md transition-colors"
                        title="Share this proof on X/Twitter"
                        data-testid={`share-proof-${proof.id}`}
                      >
                        <Twitter size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Mockup Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {displayMockups.map((mockup, index) => (
            <div key={mockup.id} className="bg-black p-6 rounded-md border border-white/10 text-center" data-testid={`mockup-${index + 1}`}>
              <div className="w-full aspect-video bg-[#09090B] rounded-md flex items-center justify-center mb-4 border border-[#C8102E]/30 overflow-hidden">
                {mockup.media_type === 'video' && mockup.video_embed_url ? (
                  <iframe
                    src={mockup.video_embed_url}
                    title={mockup.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : mockup.image_url && mockup.image_url.length > 0 ? (
                  <img src={mockup.image_url} alt={mockup.title} className="w-full h-full object-cover" />
                ) : mockup.type === 'vault-menu' ? (
                  <div className="text-center">
                    <Trophy className="w-12 h-12 text-[#C8102E] mx-auto mb-2" />
                    <p className="font-heading text-white uppercase text-sm">Vault Menu</p>
                    <div className="flex justify-center gap-2 mt-2">
                      {['15', '16', '17', '20'].map(year => (
                        <div key={year} className="w-10 h-10 border border-white/30 rounded flex items-center justify-center text-white text-xs font-bold">
                          {year}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : mockup.type === 'loading' ? (
                  <div className="text-center">
                    <div className="spinner mx-auto mb-3"></div>
                    <p className="font-heading text-white uppercase">Entering <span className="text-[#C8102E]">2K16</span>...</p>
                  </div>
                ) : mockup.type === 'friends' ? (
                  <div className="grid grid-cols-2 gap-2 p-4 w-full">
                    <div className="bg-black/50 p-2 rounded border border-white/20">
                      <p className="text-[#C8102E] text-xs font-heading uppercase">2K15 Park</p>
                      <div className="flex gap-1 mt-1">
                        <div className="w-4 h-4 rounded-full bg-white/30"></div>
                        <div className="w-4 h-4 rounded-full bg-white/30"></div>
                      </div>
                    </div>
                    <div className="bg-black/50 p-2 rounded border border-white/20">
                      <p className="text-white text-xs font-heading uppercase">Friends</p>
                      <div className="flex gap-1 mt-1">
                        <div className="w-4 h-4 rounded-full bg-[#C8102E]/50"></div>
                        <div className="w-4 h-4 rounded-full bg-[#C8102E]/50"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Trophy className="w-12 h-12 text-[#C8102E] mx-auto mb-2" />
                    <p className="font-heading text-white uppercase text-sm">{mockup.title}</p>
                  </div>
                )}
              </div>
              <p className="text-white/70 text-sm">{mockup.description}</p>
            </div>
          ))}
        </div>

        {/* Features List */}
        <div className="max-w-2xl mx-auto mb-12">
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-white/90">
                <span className="w-2 h-2 rounded-full bg-[#C8102E] flex-shrink-0"></span>
                {feature.trim()}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
              toast.success("Link copied! Share it everywhere!");
            }}
            className="btn-primary text-lg px-10 py-6"
            data-testid="share-cta-btn"
          >
            <Share2 className="w-5 h-5 mr-2" />
            This is the future. Share it with 2K.
          </Button>
        </div>
      </div>
    </section>
  );
};

// Comments Component
const CommentsSection = () => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ author_name: '', content: '' });
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.author_name.trim() || !newComment.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/comments`, newComment);
      setNewComment({ author_name: '', content: '' });
      fetchComments();
      toast.success("Comment posted!");
    } catch (error) {
      toast.error("Failed to post comment");
    }
    setLoading(false);
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyContent.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/comments`, {
        author_name: newComment.author_name || "Anonymous",
        content: replyContent,
        parent_id: parentId
      });
      setReplyTo(null);
      setReplyContent('');
      fetchComments();
      toast.success("Reply posted!");
    } catch (error) {
      toast.error("Failed to post reply");
    }
    setLoading(false);
  };

  const handleLike = async (commentId) => {
    try {
      const response = await axios.post(`${API}/comments/${commentId}/like`);
      // Update local state
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, likes: response.data.likes };
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, likes: response.data.likes } : r) };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto" data-testid="comments-section">
      <h3 className="font-heading text-2xl font-bold text-white uppercase mb-6">Join the Discussion</h3>
      
      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-8 bg-black p-4 rounded-md border border-white/10">
        <Input
          type="text"
          placeholder="Your name"
          value={newComment.author_name}
          onChange={(e) => setNewComment({ ...newComment, author_name: e.target.value })}
          className="bg-black border-white/20 text-white mb-3"
          data-testid="comment-name-input"
        />
        <Textarea
          placeholder="Share your thoughts on the Legacy Vault concept..."
          value={newComment.content}
          onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
          className="bg-black border-white/20 text-white mb-3 min-h-[100px]"
          data-testid="comment-content-input"
        />
        <Button 
          type="submit" 
          disabled={loading}
          className="btn-primary"
          data-testid="submit-comment-btn"
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-white/50 text-center py-8">Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item rounded-md" data-testid={`comment-${comment.id}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{comment.author_name}</span>
                  {comment.is_admin && (
                    <span className="bg-[#C8102E] text-white text-xs px-2 py-0.5 rounded font-bold">ADMIN</span>
                  )}
                </div>
                <span className="text-white/40 text-sm">{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-white/80 mb-3">{comment.content}</p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleLike(comment.id)}
                  className="flex items-center gap-1 text-white/60 hover:text-[#C8102E] transition-colors"
                  data-testid={`like-btn-${comment.id}`}
                >
                  <Heart size={16} className={comment.likes > 0 ? 'fill-[#C8102E] text-[#C8102E]' : ''} />
                  <span className="text-sm">{comment.likes || 0}</span>
                </button>
                <button 
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-[#C8102E] text-sm hover:underline"
                  data-testid={`reply-btn-${comment.id}`}
                >
                  Reply
                </button>
              </div>

              {/* Reply Form */}
              {replyTo === comment.id && (
                <div className="mt-3 pl-4 border-l-2 border-[#C8102E]">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="bg-black border-white/20 text-white mb-2 min-h-[80px]"
                    data-testid="reply-input"
                  />
                  <Button 
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={loading}
                    className="btn-primary text-sm py-2"
                    data-testid="submit-reply-btn"
                  >
                    {loading ? 'Posting...' : 'Post Reply'}
                  </Button>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="reply-item" data-testid={`reply-${reply.id}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{reply.author_name}</span>
                          {reply.is_admin && (
                            <span className="bg-[#C8102E] text-white text-xs px-1.5 py-0.5 rounded font-bold text-[10px]">ADMIN</span>
                          )}
                        </div>
                        <span className="text-white/40 text-xs">{new Date(reply.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-white/70 text-sm">{reply.content}</p>
                      <button 
                        onClick={() => handleLike(reply.id)}
                        className="flex items-center gap-1 text-white/60 hover:text-[#C8102E] transition-colors mt-1"
                      >
                        <Heart size={14} className={reply.likes > 0 ? 'fill-[#C8102E] text-[#C8102E]' : ''} />
                        <span className="text-xs">{reply.likes || 0}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Email Signup Component
const EmailSignup = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/subscribe`, { email });
      setEmail('');
      toast.success("You're in! We'll notify you when this goes to 2K.");
    } catch (error) {
      if (error.response?.data?.detail === "Email already subscribed") {
        toast.error("This email is already subscribed!");
      } else {
        toast.error("Failed to subscribe. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto text-center" data-testid="email-signup">
      <h3 className="font-heading text-2xl font-bold text-white uppercase mb-4">Join the Movement</h3>
      <p className="text-white/70 mb-6">Get notified when we push this to 2K</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-black border-white/20 text-white flex-1"
          data-testid="email-input"
        />
        <Button 
          type="submit"
          disabled={loading}
          className="btn-primary whitespace-nowrap"
          data-testid="subscribe-btn"
        >
          {loading ? 'Subscribing...' : 'Notify Me'}
        </Button>
      </form>
    </div>
  );
};

// Petition Counter Component
const PetitionCounter = () => {
  const [count, setCount] = useState(0);
  const [showSign, setShowSign] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentSigners, setRecentSigners] = useState([]);

  const fetchCount = async () => {
    try {
      const response = await axios.get(`${API}/petition/count`);
      setCount(response.data.count);
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const fetchRecentSigners = async () => {
    try {
      const response = await axios.get(`${API}/petition/signatures`);
      setRecentSigners(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching signers:', error);
    }
  };

  useEffect(() => {
    fetchCount();
    fetchRecentSigners();
  }, []);

  const handleSign = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/petition/sign`, { name, location: location || null });
      setName('');
      setLocation('');
      setShowSign(false);
      fetchCount();
      fetchRecentSigners();
      toast.success("Your signature has been added! Thank you for your support!");
    } catch (error) {
      toast.error("Failed to sign petition");
    }
    setLoading(false);
  };

  return (
    <div className="bg-black p-6 sm:p-8 rounded-md border border-[#C8102E] text-center" data-testid="petition-counter">
      <div className="mb-4">
        <Trophy className="w-12 h-12 text-[#C8102E] mx-auto mb-2" />
        <h3 className="font-heading text-2xl sm:text-3xl font-black text-white uppercase">Community Support</h3>
      </div>
      
      <div className="mb-6">
        <div className="font-heading text-5xl sm:text-6xl font-black text-[#C8102E] mb-2" data-testid="petition-count">
          {count.toLocaleString()}+
        </div>
        <p className="text-white/70">fans want the Legacy Vault</p>
      </div>

      {!showSign ? (
        <Button 
          onClick={() => setShowSign(true)}
          className="btn-primary text-lg px-8 py-4"
          data-testid="sign-petition-btn"
        >
          Add Your Name
        </Button>
      ) : (
        <form onSubmit={handleSign} className="space-y-3 max-w-sm mx-auto">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-black border-white/20 text-white"
            data-testid="petition-name-input"
          />
          <Input
            type="text"
            placeholder="City/Country (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-black border-white/20 text-white"
            data-testid="petition-location-input"
          />
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setShowSign(false)}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
              data-testid="submit-signature-btn"
            >
              {loading ? 'Signing...' : 'Sign Now'}
            </Button>
          </div>
        </form>
      )}

      {recentSigners.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/50 text-sm mb-2">Recent supporters:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {recentSigners.map((signer) => (
              <span key={signer.id} className="text-white/70 text-sm">
                {signer.name}{signer.location ? ` (${signer.location})` : ''} •
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Community Section
const CommunitySection = () => {
  return (
    <section id="community" className="py-20 court-pattern" data-testid="community-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase text-center mb-4">
          <span className="underline-red">Community</span>
        </h2>
        <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
          Join the conversation. Help make this vision a reality.
        </p>

        {/* Petition Counter - Featured */}
        <div className="max-w-2xl mx-auto mb-12">
          <PetitionCounter />
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <CommentsSection />
          <div>
            <EmailSignup />
            
            {/* Share CTA */}
            <div className="mt-12 p-6 bg-black rounded-md border border-[#C8102E]/30 text-center">
              <Share2 className="w-10 h-10 text-[#C8102E] mx-auto mb-4" />
              <h4 className="font-heading text-xl font-bold text-white uppercase mb-3">Share the Concept</h4>
              <p className="text-white/70 mb-4 text-sm">Help us get this in front of 2K. Every share counts.</p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`, '_blank')}
                  className="share-btn"
                  data-testid="community-share-x"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <button 
                  onClick={() => window.open(`https://reddit.com/submit?url=${encodeURIComponent(SHARE_URL)}&title=${encodeURIComponent(SHARE_TEXT)}`, '_blank')}
                  className="share-btn"
                  data-testid="community-share-reddit"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                </button>
                <button 
                  onClick={() => window.open('https://discord.com', '_blank')}
                  className="share-btn"
                  data-testid="community-share-discord"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="py-8 bg-black border-t border-white/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-white/40 text-sm">
          Fan-Made Concept • Not Affiliated with 2K Sports or Take-Two Interactive
        </p>
        {/* Admin link - hidden but accessible at /admin */}
        <a href="/admin" className="text-white/10 text-[10px] hover:text-white/30 mt-4 inline-block opacity-50" data-testid="admin-link">
          •
        </a>
      </div>
    </footer>
  );
};

// Mobile Bottom Nav
const MobileBottomNav = () => {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="mobile-nav md:hidden py-2 px-4" data-testid="mobile-bottom-nav">
      <div className="flex justify-around items-center">
        <button onClick={() => scrollTo('hero')} className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-[#C8102E]" data-testid="mobile-nav-home">
          <Home size={20} />
          <span className="text-xs">Home</span>
        </button>
        <button onClick={() => scrollTo('games')} className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-[#C8102E]" data-testid="mobile-nav-games">
          <Gamepad2 size={20} />
          <span className="text-xs">Games</span>
        </button>
        <button onClick={() => scrollTo('vault')} className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-[#C8102E]" data-testid="mobile-nav-vault">
          <Lock size={20} />
          <span className="text-xs">Vault</span>
        </button>
        <button onClick={() => scrollTo('community')} className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-[#C8102E]" data-testid="mobile-nav-community">
          <Users size={20} />
          <span className="text-xs">Community</span>
        </button>
      </div>
    </nav>
  );
};

// ============ VAULT AI CHATBOT ============
const VaultChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm Vault AI — your guide to the NBA 2K Legacy Vault. Ask me anything, drop a link, or share a concern and I'll give you a clear, informed response. What do you need help with?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Strip markdown formatting (asterisks, bold, etc.)
  const stripMarkdown = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')       // *italic* -> italic
      .replace(/__([^_]+)__/g, '$1')       // __bold__ -> bold
      .replace(/_([^_]+)_/g, '$1')         // _italic_ -> italic
      .replace(/`([^`]+)`/g, '$1')         // `code` -> code
      .replace(/#{1,6}\s?/g, '')           // # headers -> remove
      .replace(/>\s?/g, '')                // > quotes -> remove
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // [link](url) -> link
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || cooldown > 0) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: userMessage,
        session_id: sessionId
      });
      
      setSessionId(response.data.session_id);
      // Strip markdown from response
      const cleanResponse = stripMarkdown(response.data.response);
      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
      // Start 30 second cooldown
      setCooldown(30);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My bad — hit a technical foul there. Try asking again!" }]);
    }
    setLoading(false);
  };

  const quickQuestions = [
    "What is the Legacy Vault?",
    "What can you help me with?",
    "How does licensing work?",
    "Tell me about the pilot test"
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 md:bottom-6 right-4 z-50 bg-[#C8102E] hover:bg-[#9e0c24] text-white p-4 rounded-full shadow-lg transition-all ${isOpen ? 'scale-0' : 'scale-100'}`}
        data-testid="chat-bubble"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[calc(100%-2rem)] sm:w-96 h-[500px] bg-[#09090B] rounded-lg border border-[#C8102E]/50 shadow-2xl flex flex-col overflow-hidden" data-testid="chat-window">
          {/* Header */}
          <div className="bg-[#C8102E] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <Bot size={20} className="text-[#C8102E]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-white uppercase">Vault AI</h3>
                <p className="text-white/70 text-xs">Your Legacy Vault Guide</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-[#C8102E] text-white' 
                    : 'bg-black border border-white/10 text-white/90'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-black border border-white/10 p-3 rounded-lg">
                  <Loader2 className="w-5 h-5 text-[#C8102E] animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 2 && cooldown === 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="text-xs bg-black border border-white/20 text-white/70 px-3 py-1 rounded-full hover:border-[#C8102E] hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input with Cooldown */}
          <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
            {cooldown > 0 ? (
              <div className="text-center">
                <div className="bg-black border border-white/20 rounded-lg p-3">
                  <p className="text-white/60 text-sm mb-1">Next message available in</p>
                  <p className="text-[#C8102E] font-heading text-2xl font-bold">{cooldown}s</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything or share a link..."
                  className="flex-1 bg-black border-white/20 text-white text-sm"
                  disabled={loading}
                />
                <Button type="submit" className="bg-[#C8102E] hover:bg-[#9e0c24]" disabled={loading}>
                  <Send size={18} />
                </Button>
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
};

// ============ ERA VOTING POLL ============
const EraVotingPoll = () => {
  const [votes, setVotes] = useState({});
  const [total, setTotal] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const games = [
    { id: '2k15', name: '2K15', year: '2014', color: '#FFD700' },
    { id: '2k16', name: '2K16', year: '2015', color: '#C8102E' },
    { id: '2k17', name: '2K17', year: '2016', color: '#1E90FF' },
    { id: '2k20', name: '2K20', year: '2019', color: '#9400D3' }
  ];

  useEffect(() => {
    fetchVotes();
    // Check if already voted
    const voted = localStorage.getItem('vault_voted');
    if (voted) setHasVoted(true);
  }, []);

  const fetchVotes = async () => {
    try {
      const res = await axios.get(`${API}/votes`);
      setVotes(res.data.votes);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const castVote = async (gameId) => {
    if (hasVoted) return;
    
    setSelectedGame(gameId);
    try {
      await axios.post(`${API}/votes`, { game_id: gameId });
      localStorage.setItem('vault_voted', gameId);
      setHasVoted(true);
      fetchVotes();
      toast.success("Vote recorded! Thanks for making your voice heard.");
    } catch (error) {
      toast.error("Couldn't record vote. Try again!");
    }
  };

  const getPercentage = (gameId) => {
    if (total === 0) return 0;
    return Math.round((votes[gameId] || 0) / total * 100);
  };

  return (
    <div className="bg-black p-6 rounded-lg border border-white/10" data-testid="era-voting-poll">
      <h3 className="font-heading text-xl font-bold text-white uppercase mb-2 text-center">
        <span className="text-[#C8102E]">Which Era</span> Do You Want Back Most?
      </h3>
      <p className="text-white/60 text-sm text-center mb-6">
        {total.toLocaleString()} votes cast • {hasVoted ? "You voted!" : "Cast your vote below"}
      </p>

      <div className="space-y-3">
        {games.map((game) => {
          const percentage = getPercentage(game.id);
          const voteCount = votes[game.id] || 0;
          
          return (
            <button
              key={game.id}
              onClick={() => castVote(game.id)}
              disabled={hasVoted}
              className={`w-full relative overflow-hidden rounded-md border transition-all ${
                hasVoted 
                  ? 'border-white/20 cursor-default' 
                  : 'border-white/20 hover:border-[#C8102E] cursor-pointer'
              }`}
            >
              {/* Progress bar background */}
              <div 
                className="absolute inset-0 opacity-30 transition-all duration-500"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: game.color
                }}
              />
              
              {/* Content */}
              <div className="relative p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-heading font-bold text-white uppercase">{game.name}</span>
                  <span className="text-white/50 text-sm">({game.year})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-sm">{voteCount.toLocaleString()} votes</span>
                  <span className="font-bold text-white">{percentage}%</span>
                  {localStorage.getItem('vault_voted') === game.id && (
                    <CheckCircle2 size={18} className="text-[#C8102E]" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============ CREATOR SUBMISSION FORM ============
const CreatorSubmissionForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    platform: 'youtube',
    profile_url: '',
    content_url: '',
    description: '',
    follower_count: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/creator-submissions`, formData);
      setSubmitted(true);
      toast.success("Submission received! We'll review it soon.");
    } catch (error) {
      toast.error("Couldn't submit. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="bg-black p-6 rounded-lg border border-[#C8102E]/50 text-center">
        <CheckCircle2 className="w-12 h-12 text-[#C8102E] mx-auto mb-3" />
        <h3 className="font-heading text-xl font-bold text-white uppercase mb-2">Submission Received!</h3>
        <p className="text-white/70">We'll review your content and feature it if it fits the movement.</p>
      </div>
    );
  }

  return (
    <div className="bg-black p-6 rounded-lg border border-white/10" data-testid="creator-submission-form">
      <h3 className="font-heading text-xl font-bold text-white uppercase mb-2 text-center">
        <span className="text-[#C8102E]">Submit</span> Your Content
      </h3>
      <p className="text-white/60 text-sm text-center mb-6">
        Are you a creator who made Legacy Vault content? Submit it to be featured!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-white/70 text-sm mb-1 block">Your Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Creator name"
              className="bg-[#09090B] border-white/20 text-white"
              required
            />
          </div>
          <div>
            <label className="text-white/70 text-sm mb-1 block">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({...formData, platform: e.target.value})}
              className="w-full bg-[#09090B] border border-white/20 text-white rounded-md px-3 py-2"
            >
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="twitter">Twitter/X</option>
              <option value="instagram">Instagram</option>
              <option value="twitch">Twitch</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-white/70 text-sm mb-1 block">Your Profile URL</label>
          <Input
            value={formData.profile_url}
            onChange={(e) => setFormData({...formData, profile_url: e.target.value})}
            placeholder="https://youtube.com/@yourchannel"
            className="bg-[#09090B] border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="text-white/70 text-sm mb-1 block">Content URL</label>
          <Input
            value={formData.content_url}
            onChange={(e) => setFormData({...formData, content_url: e.target.value})}
            placeholder="Link to your video/post about Legacy Vault"
            className="bg-[#09090B] border-white/20 text-white"
            required
          />
        </div>

        <div>
          <label className="text-white/70 text-sm mb-1 block">Follower Count (optional)</label>
          <Input
            value={formData.follower_count}
            onChange={(e) => setFormData({...formData, follower_count: e.target.value})}
            placeholder="e.g. 50K"
            className="bg-[#09090B] border-white/20 text-white"
          />
        </div>

        <div>
          <label className="text-white/70 text-sm mb-1 block">Brief Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="What's your content about?"
            className="bg-[#09090B] border-white/20 text-white min-h-[80px]"
            required
          />
        </div>

        <Button type="submit" className="w-full btn-primary">
          Submit for Review
        </Button>
      </form>
    </div>
  );
};

// ============ COMMUNITY SPEAKS WALL ============
const CommunitySpeaksWall = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get(`${API}/community-posts`);
        setPosts(res.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchPosts();
  }, []);

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'twitter': return <Twitter size={16} className="text-[#1DA1F2]" />;
      case 'youtube': return <Youtube size={16} className="text-[#FF0000]" />;
      case 'reddit': return <span className="text-[#FF4500] font-bold text-sm">R</span>;
      case 'tiktok': return <Video size={16} className="text-white" />;
      default: return <MessageCircle size={16} />;
    }
  };

  if (posts.length === 0) return null;

  return (
    <div className="py-12" data-testid="community-speaks-wall">
      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white uppercase text-center mb-2">
        <span className="text-[#C8102E]">The Community</span> Speaks
      </h2>
      <p className="text-white/60 text-center mb-8">Real voices demanding the Legacy Vault</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-black p-5 rounded-lg border border-white/10 hover:border-[#C8102E]/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              {post.author_avatar ? (
                <img src={post.author_avatar} alt={post.author_name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#C8102E]/20 flex items-center justify-center text-white font-bold">
                  {post.author_name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{post.author_name}</span>
                  {getPlatformIcon(post.platform)}
                </div>
                <div className="flex items-center gap-2 text-white/50 text-xs">
                  <span>@{post.author_handle}</span>
                  {post.follower_count && <span>• {post.follower_count} followers</span>}
                </div>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">{post.content}</p>
            {post.post_url && (
              <a 
                href={post.post_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#C8102E] text-xs mt-3 hover:underline"
              >
                View original <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ INTERACTIVE VAULT DEMO ============
const InteractiveVaultDemo = () => {
  const [screen, setScreen] = useState('menu'); // menu, selecting, loading, ingame
  const [selectedGame, setSelectedGame] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const games = [
    { id: '2k15', name: '2K15', year: '2014', color: '#FFD700' },
    { id: '2k16', name: '2K16', year: '2015', color: '#C8102E' },
    { id: '2k17', name: '2K17', year: '2016', color: '#1E90FF' },
    { id: '2k20', name: '2K20', year: '2019', color: '#9400D3' }
  ];

  const selectGame = (game) => {
    setSelectedGame(game);
    setScreen('loading');
    setLoadingProgress(0);
    
    // Simulate loading
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setScreen('ingame'), 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const resetDemo = () => {
    setScreen('menu');
    setSelectedGame(null);
    setLoadingProgress(0);
  };

  return (
    <div className="bg-black rounded-lg border border-[#C8102E]/50 overflow-hidden" data-testid="interactive-vault-demo">
      {/* Demo Header */}
      <div className="bg-[#C8102E] px-4 py-2 flex items-center justify-between">
        <span className="font-heading text-white text-sm uppercase">Interactive Demo</span>
        {screen !== 'menu' && (
          <button onClick={resetDemo} className="text-white/80 hover:text-white text-xs">
            ← Back to Menu
          </button>
        )}
      </div>

      {/* Demo Screen */}
      <div className="aspect-video bg-gradient-to-b from-[#1a1a1a] to-black flex items-center justify-center relative overflow-hidden">
        
        {/* Main Menu Screen */}
        {screen === 'menu' && (
          <div className="text-center p-8 animate-fade-in">
            <h3 className="font-heading text-2xl sm:text-3xl text-white uppercase mb-2">
              <span className="text-[#C8102E]">Legacy</span> Vault
            </h3>
            <p className="text-white/60 text-sm mb-8">Select an era to enter</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => selectGame(game)}
                  className="group relative bg-black/50 border-2 border-white/20 rounded-lg p-4 hover:border-[#C8102E] transition-all hover:scale-105"
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity rounded-lg"
                    style={{ backgroundColor: game.color }}
                  />
                  <span className="font-heading text-white text-lg uppercase block">{game.name}</span>
                  <span className="text-white/50 text-xs">{game.year}</span>
                </button>
              ))}
            </div>
            
            <p className="text-white/40 text-xs mt-8">Click any era to see the experience</p>
          </div>
        )}

        {/* Loading Screen */}
        {screen === 'loading' && selectedGame && (
          <div className="text-center p-8 animate-fade-in">
            <div className="mb-6">
              <div className="spinner mx-auto mb-4"></div>
              <h3 className="font-heading text-xl sm:text-2xl text-white uppercase">
                Entering <span style={{ color: selectedGame.color }}>{selectedGame.name}</span>...
              </h3>
            </div>
            
            <div className="w-64 mx-auto">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#C8102E] transition-all duration-200 rounded-full"
                  style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                />
              </div>
              <p className="text-white/50 text-xs mt-2">{Math.min(Math.round(loadingProgress), 100)}%</p>
            </div>
            
            <p className="text-white/40 text-xs mt-6">Loading classic containers...</p>
          </div>
        )}

        {/* In-Game Screen */}
        {screen === 'ingame' && selectedGame && (
          <div className="w-full h-full flex flex-col animate-fade-in">
            {/* Fake 2K UI Header */}
            <div 
              className="px-4 py-2 flex items-center justify-between"
              style={{ backgroundColor: selectedGame.color + '40' }}
            >
              <span className="font-heading text-white text-sm uppercase">
                NBA {selectedGame.name} • Legacy Vault
              </span>
              <span className="text-white/70 text-xs">MyPLAYER: VaultFan2K</span>
            </div>
            
            {/* Fake Main Menu */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
                {['MyCAREER', 'MyPARK', 'MyTEAM', 'Play Now', 'Pro-Am', 'The Rec'].map((mode, idx) => (
                  <div 
                    key={mode}
                    className="bg-black/50 border border-white/20 rounded p-3 text-center hover:border-white/50 cursor-pointer transition-all"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <span className="text-white text-sm font-medium">{mode}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Bottom Bar */}
            <div className="bg-black/80 px-4 py-3 text-center">
              <p className="text-[#C8102E] text-sm font-heading uppercase">
                🏀 Welcome back to {selectedGame.year}. Servers live forever.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-[#09090B] px-4 py-3 text-center border-t border-white/10">
        <p className="text-white/50 text-xs">
          This is a concept demo showing what the Legacy Vault menu could look like inside NBA 2K
        </p>
      </div>
    </div>
  );
};

// ============ LIVE SOCIAL FEED ============
const LiveSocialFeed = () => {
  const [feedItems, setFeedItems] = useState([]);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await axios.get(`${API}/social-feed`);
        setFeedItems(res.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchFeed();
    
    // Poll for new items every 30 seconds
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPlatformStyle = (platform) => {
    switch (platform) {
      case 'twitter': return { icon: <Twitter size={14} />, color: '#1DA1F2' };
      case 'reddit': return { icon: <span className="font-bold text-xs">R</span>, color: '#FF4500' };
      case 'discord': return { icon: <span className="font-bold text-xs">D</span>, color: '#5865F2' };
      default: return { icon: <MessageCircle size={14} />, color: '#C8102E' };
    }
  };

  if (feedItems.length === 0) return null;

  return (
    <div className="bg-black rounded-lg border border-white/10 overflow-hidden" data-testid="live-social-feed">
      <div className="bg-[#C8102E] px-4 py-2 flex items-center justify-between">
        <span className="font-heading text-white text-sm uppercase">Live Feed</span>
        <span className="flex items-center gap-1 text-white/80 text-xs">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Live
        </span>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {feedItems.map((item, idx) => {
          const style = getPlatformStyle(item.platform);
          return (
            <div 
              key={item.id || idx} 
              className="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: style.color + '20', color: style.color }}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{item.author}</span>
                    <span className="text-white/40 text-xs">{item.platform}</span>
                  </div>
                  <p className="text-white/80 text-sm">{item.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Landing Page
const LandingPage = () => {
  const [games, setGames] = useState([]);
  const [content, setContent] = useState({});
  const [proofs, setProofs] = useState([]);
  const [mockups, setMockups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, contentRes, proofsRes, mockupsRes] = await Promise.all([
          axios.get(`${API}/games`),
          axios.get(`${API}/content`),
          axios.get(`${API}/proof`),
          axios.get(`${API}/mockups`)
        ]);
        setGames(gamesRes.data);
        setContent(contentRes.data);
        setProofs(proofsRes.data);
        setMockups(mockupsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoading(false);
    };
    
    // Seed content and mockups on first load
    axios.post(`${API}/content/seed`).catch(() => {});
    axios.post(`${API}/mockups/seed`).catch(() => {});
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-16 md:pb-0">
      <Header />
      <HeroSection content={content} />
      <GamesSection games={games} />
      <VaultSection content={content} games={games} proofs={proofs} mockups={mockups} />
      
      {/* NEW: Interactive Demo & Voting Section */}
      <section className="py-16 bg-[#09090B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white uppercase text-center mb-4">
            <span className="text-[#C8102E]">Experience</span> The Vision
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            See exactly what the Legacy Vault could look like — and vote for your favorite era.
          </p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <InteractiveVaultDemo />
            <div className="space-y-6">
              <EraVotingPoll />
              <LiveSocialFeed />
            </div>
          </div>
        </div>
      </section>
      
      {/* NEW: Community Speaks Wall */}
      <section className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CommunitySpeaksWall />
        </div>
      </section>
      
      {/* NEW: Creator Submission Section */}
      <section className="py-16 bg-[#09090B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto">
            <CreatorSubmissionForm />
          </div>
        </div>
      </section>
      
      <CommunitySection />
      <Footer />
      <MobileBottomNav />
      
      {/* Vault AI Chatbot - Always visible */}
      <VaultChatbot />
    </div>
  );
};

export default LandingPage;
