import { useState, useEffect } from "react";
import axios from "axios";
import { Lock, LogOut, Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, Users, Mail, Gamepad2, MessageSquare, Trophy, RefreshCw, UserPlus, Video, Youtube, Play, Settings, Reply, Heart, Image, FileText, ExternalLink, X, Layout, Twitter, MessageCircleMore, Rss, Download, Wand2, Package, Rocket, Activity, Bell, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import NeplitControl from "@/components/admin/NeplitControl";
import Acceleration from "@/components/admin/Acceleration";
import MonitorPanel from "@/components/admin/MonitorPanel";
import DeployPanel from "@/components/admin/DeployPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Login
const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/admin/login`, { password });
      onLogin();
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Invalid password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4" data-testid="admin-login">
      <div className="w-full max-w-md bg-[#09090B] p-8 rounded-md border border-white/10">
        <div className="text-center mb-8">
          <Lock className="w-12 h-12 text-[#C8102E] mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-white uppercase">Admin Access</h1>
          <p className="text-white/60 mt-2">Enter admin password to continue</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black border-white/20 text-white mb-4"
            data-testid="admin-password-input"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary"
            data-testid="admin-login-btn"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <a href="/" className="text-white/40 text-sm hover:text-[#C8102E] mt-6 block text-center">
          ← Back to site
        </a>
      </div>
    </div>
  );
};

// Game Form Modal
const GameFormModal = ({ game, open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    year: '',
    cover_image: '',
    hook_text: '',
    cover_athletes: '',
    description: '',
    youtube_embed: '',
    order: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (game) {
      setFormData({
        title: game.title || '',
        year: game.year || '',
        cover_image: game.cover_image || '',
        hook_text: game.hook_text || '',
        cover_athletes: game.cover_athletes || '',
        description: game.description || '',
        youtube_embed: game.youtube_embed || '',
        order: game.order || 0,
        is_active: game.is_active !== false
      });
    } else {
      setFormData({
        title: '',
        year: '',
        cover_image: '',
        hook_text: '',
        cover_athletes: '',
        description: '',
        youtube_embed: '',
        order: 0,
        is_active: true
      });
    }
  }, [game, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.year) {
      toast.error("Title and year are required");
      return;
    }

    setLoading(true);
    try {
      if (game) {
        await axios.put(`${API}/games/${game.id}`, formData);
        toast.success("Game updated!");
      } else {
        await axios.post(`${API}/games`, formData);
        toast.success("Game created!");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error("Failed to save game");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#09090B] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="game-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold text-white uppercase">
            {game ? 'Edit Game' : 'Add New Game'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Title *</label>
              <Input
                placeholder="NBA 2K27"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-black border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Year *</label>
              <Input
                placeholder="2026"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="bg-black border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Cover Image URL</label>
            <Input
              placeholder="https://example.com/cover.jpg"
              value={formData.cover_image}
              onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              className="bg-black border-white/20 text-white"
            />
            {formData.cover_image && (
              <img src={formData.cover_image} alt="Preview" className="mt-2 w-32 h-auto rounded" />
            )}
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Hook Text (short tagline)</label>
            <Input
              placeholder="The newest era continues"
              value={formData.hook_text}
              onChange={(e) => setFormData({ ...formData, hook_text: e.target.value })}
              className="bg-black border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Cover Athletes</label>
            <Input
              placeholder="Player Name + Special Edition"
              value={formData.cover_athletes}
              onChange={(e) => setFormData({ ...formData, cover_athletes: e.target.value })}
              className="bg-black border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Description</label>
            <Textarea
              placeholder="Full description of the game and its features..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-black border-white/20 text-white min-h-[120px]"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Main YouTube Embed URL (optional)</label>
            <Input
              placeholder="https://www.youtube.com/embed/..."
              value={formData.youtube_embed}
              onChange={(e) => setFormData({ ...formData, youtube_embed: e.target.value })}
              className="bg-black border-white/20 text-white"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Display Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="bg-black border-white/20 text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 accent-[#C8102E]"
              />
              <label className="text-white/70">Active (visible on site)</label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : (game ? 'Update Game' : 'Create Game')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Games Management
const GamesManagement = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editGame, setEditGame] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API}/games/all`);
      setGames(response.data);
    } catch (error) {
      toast.error("Failed to fetch games");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDelete = async (gameId) => {
    try {
      await axios.delete(`${API}/games/${gameId}`);
      toast.success("Game deleted!");
      fetchGames();
    } catch (error) {
      toast.error("Failed to delete game");
    }
    setDeleteConfirm(null);
  };

  const toggleActive = async (game) => {
    try {
      await axios.put(`${API}/games/${game.id}`, { is_active: !game.is_active });
      toast.success(game.is_active ? "Game hidden" : "Game activated");
      fetchGames();
    } catch (error) {
      toast.error("Failed to update game");
    }
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="games-management">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-2xl font-bold text-white uppercase">Manage Games ({games.length})</h2>
        <Button onClick={() => { setEditGame(null); setShowForm(true); }} className="btn-primary">
          <Plus size={18} className="mr-2" /> Add Game
        </Button>
      </div>

      <div className="space-y-4">
        {games.length === 0 ? (
          <p className="text-white/50 text-center py-8">No games yet. Add your first game!</p>
        ) : (
          games.map((game) => (
            <div key={game.id} className={`bg-black p-4 rounded-md border ${game.is_active ? 'border-white/10' : 'border-white/5 opacity-60'} flex items-center gap-4`}>
              <img src={game.cover_image} alt={game.title} className="w-16 h-20 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-lg font-bold text-white">{game.title}</h3>
                <p className="text-white/60 text-sm">{game.year} • Order: {game.order}</p>
                <p className="text-[#C8102E] text-sm truncate">{game.hook_text}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => toggleActive(game)} className="text-white/60 hover:text-white">
                  {game.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setEditGame(game); setShowForm(true); }} className="text-white/60 hover:text-white">
                  <Pencil size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(game)} className="text-white/60 hover:text-[#C8102E]">
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <GameFormModal
        game={editGame}
        open={showForm}
        onClose={() => { setShowForm(false); setEditGame(null); }}
        onSave={fetchGames}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#09090B] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Game?</DialogTitle>
          </DialogHeader>
          <p className="text-white/70">Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button onClick={() => handleDelete(deleteConfirm?.id)} className="bg-[#C8102E] hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Clips Management - NEW!
const ClipsManagement = () => {
  const [games, setGames] = useState([]);
  const [clips, setClips] = useState([]);
  const [selectedGame, setSelectedGame] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClip, setEditClip] = useState(null);
  const [formData, setFormData] = useState({
    game_id: '',
    title: '',
    platform: 'youtube',
    embed_url: '',
    description: '',
    order: 0
  });

  const fetchData = async () => {
    try {
      const [gamesRes, clipsRes] = await Promise.all([
        axios.get(`${API}/games/all`),
        axios.get(`${API}/clips`)
      ]);
      setGames(gamesRes.data);
      setClips(clipsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClips = selectedGame === 'all' 
    ? clips 
    : clips.filter(c => c.game_id === selectedGame);

  const getGameTitle = (gameId) => {
    const game = games.find(g => g.id === gameId);
    return game ? game.title : 'Unknown Game';
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'youtube': return <Youtube size={16} className="text-red-500" />;
      case 'tiktok': return <Play size={16} className="text-pink-500" />;
      default: return <Video size={16} className="text-white/60" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.game_id || !formData.title || !formData.embed_url) {
      toast.error("Game, title, and embed URL are required");
      return;
    }

    try {
      if (editClip) {
        await axios.put(`${API}/clips/${editClip.id}`, formData);
        toast.success("Clip updated!");
      } else {
        await axios.post(`${API}/clips`, formData);
        toast.success("Clip added!");
      }
      setShowForm(false);
      setEditClip(null);
      setFormData({ game_id: '', title: '', platform: 'youtube', embed_url: '', description: '', order: 0 });
      fetchData();
    } catch (error) {
      toast.error("Failed to save clip");
    }
  };

  const handleEdit = (clip) => {
    setEditClip(clip);
    setFormData({
      game_id: clip.game_id,
      title: clip.title,
      platform: clip.platform,
      embed_url: clip.embed_url,
      description: clip.description || '',
      order: clip.order || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (clipId) => {
    if (!window.confirm("Delete this clip?")) return;
    try {
      await axios.delete(`${API}/clips/${clipId}`);
      toast.success("Clip deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete clip");
    }
  };

  const openAddForm = () => {
    setEditClip(null);
    setFormData({ 
      game_id: selectedGame !== 'all' ? selectedGame : '', 
      title: '', 
      platform: 'youtube', 
      embed_url: '', 
      description: '', 
      order: 0 
    });
    setShowForm(true);
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="clips-management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Media & Clips ({clips.length})</h2>
          <p className="text-white/60 text-sm">Add YouTube, TikTok, Instagram clips for each game</p>
        </div>
        <Button onClick={openAddForm} className="btn-primary">
          <Plus size={18} className="mr-2" /> Add Clip
        </Button>
      </div>

      {/* Filter by Game */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-white/70">Filter by game:</span>
        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger className="w-[200px] bg-black border-white/20 text-white">
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent className="bg-[#09090B] border-white/10">
            <SelectItem value="all" className="text-white hover:bg-white/10">All Games</SelectItem>
            {games.map(game => (
              <SelectItem key={game.id} value={game.id} className="text-white hover:bg-white/10">
                {game.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* How to get embed URLs */}
      <div className="bg-[#09090B] p-4 rounded-md border border-white/10 mb-6">
        <h3 className="font-heading text-lg font-bold text-white uppercase mb-2">How to Add Clips</h3>
        <div className="text-white/70 text-sm space-y-2">
          <p><strong className="text-[#C8102E]">YouTube:</strong> Go to video → Share → Embed → Copy the URL from src="..."</p>
          <p className="text-white/50 text-xs">Example: https://www.youtube.com/embed/VIDEO_ID</p>
          <p><strong className="text-[#C8102E]">TikTok:</strong> Go to video → Share → Embed → Copy the video URL</p>
          <p className="text-white/50 text-xs">Example: https://www.tiktok.com/embed/v2/VIDEO_ID</p>
          <p><strong className="text-[#C8102E]">Instagram:</strong> Go to post → ⋯ → Embed → Copy URL</p>
          <p><strong className="text-[#C8102E]">Twitter/X:</strong> Use the tweet URL directly</p>
        </div>
      </div>

      {/* Clips List */}
      {filteredClips.length === 0 ? (
        <p className="text-white/50 text-center py-8">No clips yet. Add your first clip!</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClips.map(clip => (
            <div key={clip.id} className="bg-black p-4 rounded-md border border-white/10">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(clip.platform)}
                  <span className="text-white/60 text-xs uppercase">{clip.platform}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(clip)} className="h-6 w-6 text-white/60 hover:text-white">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(clip.id)} className="h-6 w-6 text-white/60 hover:text-[#C8102E]">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <h4 className="font-bold text-white mb-1">{clip.title}</h4>
              <p className="text-[#C8102E] text-xs mb-2">{getGameTitle(clip.game_id)}</p>
              {clip.description && (
                <p className="text-white/60 text-sm mb-2 line-clamp-2">{clip.description}</p>
              )}
              <div className="aspect-video bg-[#09090B] rounded overflow-hidden">
                <iframe
                  src={clip.embed_url}
                  title={clip.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Clip Modal */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditClip(null); }}>
        <DialogContent className="bg-[#09090B] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold text-white uppercase">
              {editClip ? 'Edit Clip' : 'Add New Clip'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Game *</label>
              <Select value={formData.game_id} onValueChange={(v) => setFormData({...formData, game_id: v})}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent className="bg-[#09090B] border-white/10">
                  {games.map(game => (
                    <SelectItem key={game.id} value={game.id} className="text-white hover:bg-white/10">
                      {game.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Platform *</label>
              <Select value={formData.platform} onValueChange={(v) => setFormData({...formData, platform: v})}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#09090B] border-white/10">
                  <SelectItem value="youtube" className="text-white hover:bg-white/10">YouTube</SelectItem>
                  <SelectItem value="tiktok" className="text-white hover:bg-white/10">TikTok</SelectItem>
                  <SelectItem value="instagram" className="text-white hover:bg-white/10">Instagram</SelectItem>
                  <SelectItem value="twitter" className="text-white hover:bg-white/10">Twitter/X</SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-white/10">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Title *</label>
              <Input
                placeholder="Epic dunk compilation"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-black border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Embed URL *</label>
              <Input
                placeholder="https://www.youtube.com/embed/..."
                value={formData.embed_url}
                onChange={(e) => setFormData({...formData, embed_url: e.target.value})}
                className="bg-black border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Description (optional)</label>
              <Textarea
                placeholder="What's in this clip..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-black border-white/20 text-white min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Display Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                className="bg-black border-white/20 text-white w-24"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary">
                {editClip ? 'Update Clip' : 'Add Clip'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Comments Management
const CommentsManagement = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment and all its replies?")) return;
    try {
      await axios.delete(`${API}/comments/${commentId}`);
      toast.success("Comment deleted!");
      fetchComments();
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleAdminReply = async (parentId) => {
    if (!replyContent.trim()) {
      toast.error("Please enter a reply");
      return;
    }
    try {
      await axios.post(`${API}/comments`, {
        author_name: "Legacy Vault Team",
        content: replyContent,
        parent_id: parentId,
        is_admin: true
      });
      toast.success("Admin reply posted!");
      setReplyTo(null);
      setReplyContent('');
      fetchComments();
    } catch (error) {
      toast.error("Failed to post reply");
    }
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div data-testid="comments-management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Manage Comments ({totalComments})</h2>
          <p className="text-white/60 text-sm">Reply to comments as Admin with the reply button</p>
        </div>
        <Button onClick={fetchComments} variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <RefreshCw size={18} className="mr-2" /> Refresh
        </Button>
      </div>

      {comments.length === 0 ? (
        <p className="text-white/50 text-center py-8">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-black p-4 rounded-md border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white">{comment.author_name}</span>
                    {comment.is_admin && (
                      <span className="bg-[#C8102E] text-white text-xs px-2 py-0.5 rounded font-bold">ADMIN</span>
                    )}
                    <span className="text-white/40 text-sm">{new Date(comment.created_at).toLocaleString()}</span>
                    {comment.likes > 0 && (
                      <span className="flex items-center gap-1 text-[#C8102E] text-sm">
                        <Heart size={14} className="fill-[#C8102E]" /> {comment.likes}
                      </span>
                    )}
                  </div>
                  <p className="text-white/80">{comment.content}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-white/60 hover:text-[#C8102E]" title="Reply as Admin">
                    <Reply size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(comment.id)} className="text-white/60 hover:text-[#C8102E]">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>

              {/* Admin Reply Form */}
              {replyTo === comment.id && (
                <div className="mt-3 p-3 bg-[#09090B] rounded border border-[#C8102E]/30">
                  <p className="text-[#C8102E] text-sm font-bold mb-2">Reply as Admin:</p>
                  <Textarea
                    placeholder="Write your admin response..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="bg-black border-white/20 text-white mb-2 min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => setReplyTo(null)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      Cancel
                    </Button>
                    <Button onClick={() => handleAdminReply(comment.id)} className="btn-primary">
                      Post Admin Reply
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 ml-6 space-y-2 border-l-2 border-[#C8102E]/30 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{reply.author_name}</span>
                          {reply.is_admin && (
                            <span className="bg-[#C8102E] text-white text-xs px-1.5 py-0.5 rounded font-bold text-[10px]">ADMIN</span>
                          )}
                          <span className="text-white/40 text-xs">{new Date(reply.created_at).toLocaleString()}</span>
                          {reply.likes > 0 && (
                            <span className="flex items-center gap-1 text-[#C8102E] text-xs">
                              <Heart size={12} className="fill-[#C8102E]" /> {reply.likes}
                            </span>
                          )}
                        </div>
                        <p className="text-white/70 text-sm">{reply.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(reply.id)} className="text-white/60 hover:text-[#C8102E] h-6 w-6">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Subscriptions Management
const SubscriptionsManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions`);
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleDelete = async (subId) => {
    if (!window.confirm("Delete this subscription?")) return;
    try {
      await axios.delete(`${API}/subscriptions/${subId}`);
      toast.success("Subscription deleted!");
      fetchSubs();
    } catch (error) {
      toast.error("Failed to delete subscription");
    }
  };

  const exportEmails = () => {
    const emails = subscriptions.map(s => s.email).join('\n');
    const blob = new Blob([emails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'legacy-vault-subscribers.txt';
    a.click();
    toast.success("Emails exported!");
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="subscriptions-management">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-2xl font-bold text-white uppercase">Email Subscribers ({subscriptions.length})</h2>
        <Button onClick={exportEmails} className="btn-primary" disabled={subscriptions.length === 0}>
          Export Emails
        </Button>
      </div>
      
      {subscriptions.length === 0 ? (
        <p className="text-white/50 text-center py-8">No subscribers yet.</p>
      ) : (
        <div className="bg-black rounded-md border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#09090B]">
              <tr>
                <th className="text-left text-white/70 font-medium p-3">Email</th>
                <th className="text-left text-white/70 font-medium p-3">Date</th>
                <th className="text-right text-white/70 font-medium p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-t border-white/5">
                  <td className="text-white p-3">{sub.email}</td>
                  <td className="text-white/60 p-3">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                  <td className="text-right p-3">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)} className="text-white/60 hover:text-[#C8102E]">
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Petition Management
const PetitionManagement = () => {
  const [signatures, setSignatures] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulkCount, setBulkCount] = useState(100);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSig, setNewSig] = useState({ name: '', location: '' });

  const fetchData = async () => {
    try {
      const [sigsRes, countRes] = await Promise.all([
        axios.get(`${API}/petition/signatures`),
        axios.get(`${API}/petition/count`)
      ]);
      setSignatures(sigsRes.data);
      setCount(countRes.data.count);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (sigId) => {
    if (!window.confirm("Delete this signature?")) return;
    try {
      await axios.delete(`${API}/petition/${sigId}`);
      toast.success("Signature deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete signature");
    }
  };

  const handleAddBulk = async () => {
    try {
      await axios.post(`${API}/petition/add-bulk?count=${bulkCount}`);
      toast.success(`Added ${bulkCount} signatures!`);
      fetchData();
    } catch (error) {
      toast.error("Failed to add signatures");
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!newSig.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await axios.post(`${API}/petition/sign`, { name: newSig.name, location: newSig.location || null });
      toast.success("Signature added!");
      setNewSig({ name: '', location: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to add signature");
    }
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="petition-management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Petition Signatures</h2>
          <p className="text-[#C8102E] font-heading text-3xl font-black">{count.toLocaleString()}+ supporters</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <UserPlus size={18} className="mr-2" /> Add Single
          </Button>
        </div>
      </div>

      <div className="bg-[#09090B] p-4 rounded-md border border-[#C8102E]/30 mb-6">
        <h3 className="font-heading text-lg font-bold text-white uppercase mb-3">Boost Social Proof</h3>
        <p className="text-white/60 text-sm mb-4">Add signatures to boost the counter</p>
        <div className="flex gap-3 items-center">
          <Input
            type="number"
            value={bulkCount}
            onChange={(e) => setBulkCount(parseInt(e.target.value) || 0)}
            className="bg-black border-white/20 text-white w-32"
            min={1}
            max={10000}
          />
          <Button onClick={handleAddBulk} className="btn-primary">
            Add {bulkCount} Signatures
          </Button>
        </div>
      </div>

      <h3 className="font-heading text-lg font-bold text-white uppercase mb-3">Recent Signatures (showing last 50)</h3>
      {signatures.length === 0 ? (
        <p className="text-white/50 text-center py-8">No signatures yet.</p>
      ) : (
        <div className="bg-black rounded-md border border-white/10 overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-[#09090B] sticky top-0">
              <tr>
                <th className="text-left text-white/70 font-medium p-3">Name</th>
                <th className="text-left text-white/70 font-medium p-3">Location</th>
                <th className="text-left text-white/70 font-medium p-3">Date</th>
                <th className="text-right text-white/70 font-medium p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {signatures.slice(0, 50).map((sig) => (
                <tr key={sig.id} className="border-t border-white/5">
                  <td className="text-white p-3">{sig.name}</td>
                  <td className="text-white/60 p-3">{sig.location || '-'}</td>
                  <td className="text-white/60 p-3">{new Date(sig.signed_at).toLocaleDateString()}</td>
                  <td className="text-right p-3">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sig.id)} className="text-white/60 hover:text-[#C8102E]">
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="bg-[#09090B] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Signature</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSingle} className="space-y-4 mt-4">
            <div>
              <label className="text-white/70 text-sm mb-1 block">Name *</label>
              <Input
                placeholder="John Doe"
                value={newSig.name}
                onChange={(e) => setNewSig({ ...newSig, name: e.target.value })}
                className="bg-black border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Location (optional)</label>
              <Input
                placeholder="New York"
                value={newSig.location}
                onChange={(e) => setNewSig({ ...newSig, location: e.target.value })}
                className="bg-black border-white/20 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary">
                Add Signature
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Site Content Management
const ContentManagement = () => {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const contentFields = [
    { key: 'hero_headline', label: 'Hero Headline', type: 'text', placeholder: 'The NBA 2K Legacy Vault' },
    { key: 'hero_subheadline', label: 'Hero Subheadline', type: 'text', placeholder: '2K15 • 2K16 • 2K17 • 2K20 — All in one place.' },
    { key: 'hero_tagline', label: 'Hero Tagline', type: 'text', placeholder: 'Persistent online. No resets. Ever.' },
    { key: 'vault_headline', label: 'Vault Section Headline', type: 'text', placeholder: 'One Vault. Four Eras. Infinite Play.' },
    { key: 'vault_subheadline', label: 'Vault Section Subheadline', type: 'text', placeholder: 'The revolutionary concept...' },
    { key: 'vault_description', label: 'Vault Concept Description', type: 'textarea', placeholder: 'The NBA 2K Legacy Vault is...' },
    { key: 'vault_features', label: 'Vault Features (separate with |)', type: 'textarea', placeholder: 'Feature 1|Feature 2|Feature 3' },
    { key: 'google_doc_url', label: 'Google Doc / Full Concept Link', type: 'text', placeholder: 'https://docs.google.com/document/d/...' },
    { key: 'google_doc_label', label: 'Google Doc Button Text', type: 'text', placeholder: 'Read the Full Concept Document' },
  ];

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API}/content`);
      setContent(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Seed defaults first
    axios.post(`${API}/content/seed`).catch(() => {});
    fetchContent();
  }, []);

  const handleSave = async (key, value) => {
    setSaving(true);
    try {
      await axios.post(`${API}/content`, { key, value });
      toast.success(`${key.replace(/_/g, ' ')} updated!`);
      setContent(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="content-management">
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-white uppercase">Edit Site Content</h2>
        <p className="text-white/60 text-sm">Customize all the text on your site including your Google Doc link</p>
      </div>

      <div className="space-y-6">
        {contentFields.map((field) => (
          <div key={field.key} className="bg-black p-4 rounded-md border border-white/10">
            <label className="text-[#C8102E] font-heading font-bold uppercase text-sm mb-2 block">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <Textarea
                value={content[field.key] || ''}
                onChange={(e) => setContent(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="bg-[#09090B] border-white/20 text-white min-h-[120px] mb-3"
              />
            ) : (
              <Input
                value={content[field.key] || ''}
                onChange={(e) => setContent(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="bg-[#09090B] border-white/20 text-white mb-3"
              />
            )}
            <Button 
              onClick={() => handleSave(field.key, content[field.key])} 
              disabled={saving}
              className="btn-primary text-sm"
            >
              Save {field.label}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Proof of Demand Management
const ProofManagement = () => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProof, setEditProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    description: '',
    source: '',
    order: 0
  });

  const fetchProofs = async () => {
    try {
      const response = await axios.get(`${API}/proof`);
      setProofs(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProofs();
  }, []);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, and WebP images are allowed");
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Construct full URL
      const imageUrl = `${BACKEND_URL}${response.data.url}`;
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  // Handle clipboard paste
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          setUploading(true);
          try {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64Data = event.target.result;
              const response = await axios.post(`${API}/upload/base64`, {
                data: base64Data,
                filename: 'pasted_image.png'
              });
              const imageUrl = `${BACKEND_URL}${response.data.url}`;
              setFormData(prev => ({ ...prev, image_url: imageUrl }));
              toast.success("Screenshot pasted!");
              setUploading(false);
            };
            reader.readAsDataURL(file);
          } catch (error) {
            toast.error("Failed to paste image");
            setUploading(false);
          }
        }
        break;
      }
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url || !formData.title) {
      toast.error("Image and title are required");
      return;
    }

    try {
      if (editProof) {
        await axios.put(`${API}/proof/${editProof.id}`, formData);
        toast.success("Proof updated!");
      } else {
        await axios.post(`${API}/proof`, formData);
        toast.success("Proof added!");
      }
      setShowForm(false);
      setEditProof(null);
      setFormData({ image_url: '', title: '', description: '', source: '', order: 0 });
      fetchProofs();
    } catch (error) {
      toast.error("Failed to save proof");
    }
  };

  const handleEdit = (proof) => {
    setEditProof(proof);
    setFormData({
      image_url: proof.image_url,
      title: proof.title,
      description: proof.description || '',
      source: proof.source || '',
      order: proof.order || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (proofId) => {
    if (!window.confirm("Delete this proof?")) return;
    try {
      await axios.delete(`${API}/proof/${proofId}`);
      toast.success("Proof deleted!");
      fetchProofs();
    } catch (error) {
      toast.error("Failed to delete proof");
    }
  };

  const openAddForm = () => {
    setEditProof(null);
    setFormData({ image_url: '', title: '', description: '', source: '', order: 0 });
    setShowForm(true);
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="proof-management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Proof of Demand ({proofs.length})</h2>
          <p className="text-white/60 text-sm">Upload screenshots showing community demand - tweets, Reddit posts, YouTube comments, etc.</p>
        </div>
        <Button onClick={openAddForm} className="btn-primary" data-testid="add-proof-btn">
          <Plus size={18} className="mr-2" /> Add Proof
        </Button>
      </div>

      {/* Proofs Grid */}
      {proofs.length === 0 ? (
        <p className="text-white/50 text-center py-8">No proof added yet. Add screenshots showing demand!</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proofs.map((proof) => (
            <div key={proof.id} className="bg-black rounded-md border border-white/10 overflow-hidden" data-testid={`proof-item-${proof.id}`}>
              <img 
                src={proof.image_url} 
                alt={proof.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white">{proof.title}</h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(proof)} className="h-6 w-6 text-white/60 hover:text-white">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(proof.id)} className="h-6 w-6 text-white/60 hover:text-[#C8102E]">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                {proof.description && (
                  <p className="text-white/60 text-sm mb-2">{proof.description}</p>
                )}
                {proof.source && (
                  <p className="text-[#C8102E] text-xs">Source: {proof.source}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Proof Modal */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditProof(null); }}>
        <DialogContent className="bg-[#09090B] border-white/10 max-w-lg" data-testid="proof-form-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold text-white uppercase">
              {editProof ? 'Edit Proof' : 'Add Proof of Demand'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4" onPaste={handlePaste}>
            {/* Image Upload Area */}
            <div>
              <label className="text-white/70 text-sm mb-2 block">Upload Image *</label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                  dragActive ? 'border-[#C8102E] bg-[#C8102E]/10' : 'border-white/20 hover:border-white/40'
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="spinner"></div>
                    <p className="text-white/60 text-sm">Uploading...</p>
                  </div>
                ) : formData.image_url ? (
                  <div className="relative">
                    <img src={formData.image_url} alt="Preview" className="max-h-48 mx-auto rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Image size={40} className="text-white/40" />
                    <div>
                      <p className="text-white/80 font-medium">Drag & drop an image here</p>
                      <p className="text-white/50 text-sm">or click to browse, or <span className="text-[#C8102E]">paste a screenshot (Ctrl+V)</span></p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      data-testid="file-input"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Title *</label>
              <Input
                placeholder="Tweet from @NBA2K asking for legacy servers"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-black border-white/20 text-white"
                data-testid="proof-title-input"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Description (optional)</label>
              <Textarea
                placeholder="10K likes showing massive demand..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-black border-white/20 text-white min-h-[80px]"
                data-testid="proof-description-input"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Source (optional)</label>
              <Input
                placeholder="Twitter, Reddit, YouTube, etc."
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                className="bg-black border-white/20 text-white"
                data-testid="proof-source-input"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Display Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                className="bg-black border-white/20 text-white w-24"
                data-testid="proof-order-input"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={uploading} data-testid="submit-proof-btn">
                {editProof ? 'Update Proof' : 'Add Proof'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Mockups Management (Vault Section Cards)
const MockupsManagement = () => {
  const [mockups, setMockups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMockup, setEditMockup] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media_type: 'image',
    image_url: '',
    video_embed_url: '',
    order: 0
  });

  const fetchMockups = async () => {
    try {
      const response = await axios.get(`${API}/mockups`);
      setMockups(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Seed defaults first
    axios.post(`${API}/mockups/seed`).catch(() => {});
    fetchMockups();
  }, []);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, and WebP images are allowed");
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = `${BACKEND_URL}${response.data.url}`;
      setFormData(prev => ({ ...prev, image_url: imageUrl, media_type: 'image' }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    }
    setUploading(false);
  };

  // Handle clipboard paste
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          setUploading(true);
          try {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64Data = event.target.result;
              const response = await axios.post(`${API}/upload/base64`, {
                data: base64Data,
                filename: 'pasted_image.png'
              });
              const imageUrl = `${BACKEND_URL}${response.data.url}`;
              setFormData(prev => ({ ...prev, image_url: imageUrl, media_type: 'image' }));
              toast.success("Screenshot pasted!");
              setUploading(false);
            };
            reader.readAsDataURL(file);
          } catch (error) {
            toast.error("Failed to paste image");
            setUploading(false);
          }
        }
        break;
      }
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Title and description are required");
      return;
    }
    if (formData.media_type === 'video' && !formData.video_embed_url) {
      toast.error("Video embed URL is required for video type");
      return;
    }

    try {
      if (editMockup) {
        await axios.put(`${API}/mockups/${editMockup.id}`, formData);
        toast.success("Mockup updated!");
      } else {
        await axios.post(`${API}/mockups`, formData);
        toast.success("Mockup added!");
      }
      setShowForm(false);
      setEditMockup(null);
      setFormData({ title: '', description: '', media_type: 'image', image_url: '', video_embed_url: '', order: 0 });
      fetchMockups();
    } catch (error) {
      toast.error("Failed to save mockup");
    }
  };

  const handleEdit = (mockup) => {
    setEditMockup(mockup);
    setFormData({
      title: mockup.title,
      description: mockup.description,
      media_type: mockup.media_type || 'image',
      image_url: mockup.image_url || '',
      video_embed_url: mockup.video_embed_url || '',
      order: mockup.order || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (mockupId) => {
    if (!window.confirm("Delete this mockup?")) return;
    try {
      await axios.delete(`${API}/mockups/${mockupId}`);
      toast.success("Mockup deleted!");
      fetchMockups();
    } catch (error) {
      toast.error("Failed to delete mockup");
    }
  };

  const openAddForm = () => {
    setEditMockup(null);
    setFormData({ title: '', description: '', media_type: 'image', image_url: '', video_embed_url: '', order: 0 });
    setShowForm(true);
  };

  if (loading) {
    return <div className="spinner mx-auto mt-8"></div>;
  }

  return (
    <div data-testid="mockups-management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Vault Mockups ({mockups.length})</h2>
          <p className="text-white/60 text-sm">Manage the concept cards in the Vault section - add images or video embeds</p>
        </div>
        <Button onClick={openAddForm} className="btn-primary" data-testid="add-mockup-btn">
          <Plus size={18} className="mr-2" /> Add Mockup
        </Button>
      </div>

      {/* Mockups Grid */}
      {mockups.length === 0 ? (
        <p className="text-white/50 text-center py-8">No mockups yet. Add concept cards to showcase in the Vault section!</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockups.map((mockup) => (
            <div key={mockup.id} className="bg-black rounded-md border border-white/10 overflow-hidden" data-testid={`mockup-item-${mockup.id}`}>
              <div className="aspect-video bg-[#09090B] flex items-center justify-center overflow-hidden">
                {mockup.media_type === 'video' && mockup.video_embed_url ? (
                  <iframe
                    src={mockup.video_embed_url}
                    title={mockup.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : mockup.image_url ? (
                  <img src={mockup.image_url} alt={mockup.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Layout size={40} className="text-[#C8102E] mx-auto mb-2" />
                    <p className="text-white/60 text-sm">{mockup.title}</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-white">{mockup.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded ${mockup.media_type === 'video' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {mockup.media_type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(mockup)} className="h-6 w-6 text-white/60 hover:text-white">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mockup.id)} className="h-6 w-6 text-white/60 hover:text-[#C8102E]">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <p className="text-white/60 text-sm">{mockup.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Mockup Modal */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditMockup(null); }}>
        <DialogContent className="bg-[#09090B] border-white/10 max-w-lg" data-testid="mockup-form-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold text-white uppercase">
              {editMockup ? 'Edit Mockup' : 'Add Vault Mockup'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4" onPaste={handlePaste}>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Title *</label>
              <Input
                placeholder="Vault Menu, ENTERING 2K16..."
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-black border-white/20 text-white"
                data-testid="mockup-title-input"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Description *</label>
              <Textarea
                placeholder="Description shown below the mockup..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-black border-white/20 text-white min-h-[80px]"
                data-testid="mockup-description-input"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-1 block">Media Type</label>
              <Select value={formData.media_type} onValueChange={(v) => setFormData({...formData, media_type: v})}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#09090B] border-white/10">
                  <SelectItem value="image" className="text-white hover:bg-white/10">Image</SelectItem>
                  <SelectItem value="video" className="text-white hover:bg-white/10">Video Embed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.media_type === 'image' ? (
              <div>
                <label className="text-white/70 text-sm mb-2 block">Upload Image</label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                    dragActive ? 'border-[#C8102E] bg-[#C8102E]/10' : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="spinner"></div>
                      <p className="text-white/60 text-sm">Uploading...</p>
                    </div>
                  ) : formData.image_url ? (
                    <div className="relative">
                      <img src={formData.image_url} alt="Preview" className="max-h-32 mx-auto rounded" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white h-6 w-6"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Image size={32} className="text-white/40" />
                      <p className="text-white/80 text-sm">Drag & drop, click, or <span className="text-[#C8102E]">paste (Ctrl+V)</span></p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-white/70 text-sm mb-1 block">Video Embed URL *</label>
                <Input
                  placeholder="https://www.youtube.com/embed/..."
                  value={formData.video_embed_url}
                  onChange={(e) => setFormData({...formData, video_embed_url: e.target.value})}
                  className="bg-black border-white/20 text-white"
                  data-testid="mockup-video-input"
                />
                <p className="text-white/50 text-xs mt-1">YouTube: Share → Embed → Copy URL from src="..."</p>
                {formData.video_embed_url && (
                  <div className="mt-2 aspect-video">
                    <iframe
                      src={formData.video_embed_url}
                      title="Preview"
                      className="w-full h-full rounded"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-white/70 text-sm mb-1 block">Display Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                className="bg-black border-white/20 text-white w-24"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={uploading} data-testid="submit-mockup-btn">
                {editMockup ? 'Update Mockup' : 'Add Mockup'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Admin Page
const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('acceleration');

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('adminLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('adminLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // Global monitor pulse — surfaces unread alerts as a bell badge across all tabs
  const MonitorBell = () => {
    const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0, total_open: 0 });
    useEffect(() => {
      let cancelled = false;
      const tick = async () => {
        try {
          const r = await axios.get(`${API}/admin/acceleration/monitor/status?password=A@070610`);
          if (!cancelled) setCounts(r.data?.open_counts || counts);
        } catch { /* ignore */ }
      };
      tick();
      const id = setInterval(tick, 15000);
      return () => { cancelled = true; clearInterval(id); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const total = counts.total_open || 0;
    const tone = counts.critical > 0 ? "text-red-400" : counts.warning > 0 ? "text-amber-400" : "text-green-400";
    return (
      <button
        onClick={() => setActiveTab('monitor')}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 transition"
        data-testid="monitor-bell"
        title="Open Website Monitor"
      >
        <Bell size={18} className={tone} />
        <span className="text-white/60 text-xs uppercase tracking-wider">Monitor</span>
        {total > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            counts.critical > 0 ? "bg-red-500 text-white" :
            counts.warning > 0 ? "bg-amber-500 text-black" :
            "bg-blue-500 text-white"
          }`}>{total > 99 ? "99+" : total}</span>
        )}
      </button>
    );
  };

  const tabs = [
    { id: 'acceleration', label: 'Acceleration', icon: Rocket },
    { id: 'deploy', label: 'Deploy', icon: Cloud },
    { id: 'monitor', label: 'Monitor', icon: Activity },
    { id: 'neplit', label: 'Neplit', icon: Package },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'clips', label: 'Clips', icon: Video },
    { id: 'mockups', label: 'Mockups', icon: Layout },
    { id: 'proof', label: 'Proof', icon: Image },
    { id: 'community', label: 'Community Wall', icon: Twitter },
    { id: 'socialfeed', label: 'Live Feed', icon: Rss },
    { id: 'submissions', label: 'Submissions', icon: UserPlus },
    { id: 'content', label: 'Content', icon: Settings },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'subscribers', label: 'Emails', icon: Mail },
    { id: 'petition', label: 'Petition', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-black" data-testid="admin-dashboard">
      <header className="bg-[#09090B] border-b border-white/10 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-white/60 hover:text-white flex items-center gap-2">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to Site</span>
            </a>
            <div className="w-px h-6 bg-white/10"></div>
            <h1 className="font-heading text-xl font-bold text-white uppercase">Full Admin Control</h1>
          </div>
          <div className="flex items-center gap-2">
            <MonitorBell />
            <Button variant="ghost" onClick={handleLogout} className="text-white/60 hover:text-white">
              <LogOut size={18} className="mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#C8102E] text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'acceleration' && <Acceleration />}
        {activeTab === 'deploy' && <DeployPanel />}
        {activeTab === 'monitor' && <MonitorPanel />}
        {activeTab === 'games' && <GamesManagement />}
        {activeTab === 'clips' && <ClipsManagement />}
        {activeTab === 'mockups' && <MockupsManagement />}
        {activeTab === 'proof' && <ProofManagement />}
        {activeTab === 'community' && <CommunityPostsManagement />}
        {activeTab === 'socialfeed' && <SocialFeedManagement />}
        {activeTab === 'submissions' && <CreatorSubmissionsManagement />}
        {activeTab === 'content' && <ContentManagement />}
        {activeTab === 'comments' && <CommentsManagement />}
        {activeTab === 'subscribers' && <SubscriptionsManagement />}
        {activeTab === 'petition' && <PetitionManagement />}
        {activeTab === 'neplit' && <NeplitControl />}
      </div>
    </div>
  );
};

// Community Posts Management (The Community Speaks Wall)
const CommunityPostsManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [formData, setFormData] = useState({
    platform: 'twitter',
    author_name: '',
    author_handle: '',
    author_avatar: '',
    follower_count: '',
    content: '',
    post_url: '',
    order: 0
  });

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/community-posts`);
      setPosts(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editPost) {
        await axios.put(`${API}/community-posts/${editPost.id}`, formData);
        toast.success("Post updated!");
      } else {
        await axios.post(`${API}/community-posts`, formData);
        toast.success("Post added!");
      }
      setShowForm(false);
      setEditPost(null);
      setFormData({ platform: 'twitter', author_name: '', author_handle: '', author_avatar: '', follower_count: '', content: '', post_url: '', order: 0 });
      fetchPosts();
    } catch (error) {
      toast.error("Failed to save post");
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await axios.delete(`${API}/community-posts/${postId}`);
      toast.success("Post deleted!");
      fetchPosts();
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const handleEdit = (post) => {
    setEditPost(post);
    setFormData({
      platform: post.platform,
      author_name: post.author_name,
      author_handle: post.author_handle,
      author_avatar: post.author_avatar || '',
      follower_count: post.follower_count || '',
      content: post.content,
      post_url: post.post_url || '',
      order: post.order || 0
    });
    setShowForm(true);
  };

  if (loading) return <div className="spinner mx-auto mt-8"></div>;

  return (
    <div data-testid="community-posts-management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Community Wall ({posts.length})</h2>
          <p className="text-white/60 text-sm">Add tweets, Reddit posts, and YouTube comments to showcase demand</p>
        </div>
        <Button onClick={() => { setEditPost(null); setShowForm(true); }} className="btn-primary">
          <Plus size={18} className="mr-2" /> Add Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <p className="text-white/50 text-center py-8">No community posts yet. Add some social proof!</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-[#09090B] p-4 rounded-md border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{post.author_name}</span>
                  <span className="text-[#C8102E] text-xs">@{post.author_handle}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} className="h-6 w-6 text-white/60 hover:text-white">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="h-6 w-6 text-white/60 hover:text-[#C8102E]">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <p className="text-white/80 text-sm mb-2">{post.content}</p>
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <span className="capitalize">{post.platform}</span>
                {post.follower_count && <span>• {post.follower_count} followers</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="bg-[#09090B] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold text-white uppercase">
              {editPost ? 'Edit Community Post' : 'Add Community Post'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({...formData, platform: e.target.value})}
                  className="w-full bg-black border border-white/20 text-white rounded-md px-3 py-2"
                >
                  <option value="twitter">Twitter/X</option>
                  <option value="reddit">Reddit</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">Follower Count</label>
                <Input value={formData.follower_count} onChange={(e) => setFormData({...formData, follower_count: e.target.value})} placeholder="e.g. 50K" className="bg-black border-white/20 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Author Name *</label>
                <Input value={formData.author_name} onChange={(e) => setFormData({...formData, author_name: e.target.value})} placeholder="John Doe" className="bg-black border-white/20 text-white" required />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">Author Handle *</label>
                <Input value={formData.author_handle} onChange={(e) => setFormData({...formData, author_handle: e.target.value})} placeholder="johndoe" className="bg-black border-white/20 text-white" required />
              </div>
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Avatar URL (optional)</label>
              <Input value={formData.author_avatar} onChange={(e) => setFormData({...formData, author_avatar: e.target.value})} placeholder="https://..." className="bg-black border-white/20 text-white" />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Content *</label>
              <Textarea value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="What they said..." className="bg-black border-white/20 text-white min-h-[100px]" required />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Original Post URL (optional)</label>
              <Input value={formData.post_url} onChange={(e) => setFormData({...formData, post_url: e.target.value})} placeholder="https://twitter.com/..." className="bg-black border-white/20 text-white" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white hover:bg-white/10">Cancel</Button>
              <Button type="submit" className="btn-primary">{editPost ? 'Update' : 'Add'} Post</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Social Feed Management
const SocialFeedManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'twitter',
    author: '',
    content: '',
    url: ''
  });

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/social-feed`);
      setItems(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/social-feed`, formData);
      toast.success("Feed item added!");
      setShowForm(false);
      setFormData({ platform: 'twitter', author: '', content: '', url: '' });
      fetchItems();
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await axios.delete(`${API}/social-feed/${itemId}`);
      toast.success("Item deleted!");
      fetchItems();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  if (loading) return <div className="spinner mx-auto mt-8"></div>;

  return (
    <div data-testid="social-feed-management">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white uppercase">Live Feed ({items.length})</h2>
          <p className="text-white/60 text-sm">Add real-time social posts to the live feed ticker</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} className="mr-2" /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-white/50 text-center py-8">No feed items yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-[#09090B] p-4 rounded-md border border-white/10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#C8102E] text-xs uppercase">{item.platform}</span>
                  <span className="text-white font-bold text-sm">{item.author}</span>
                </div>
                <p className="text-white/80 text-sm">{item.content}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-6 w-6 text-white/60 hover:text-[#C8102E]">
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="bg-[#09090B] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold text-white uppercase">Add Feed Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({...formData, platform: e.target.value})}
                  className="w-full bg-black border border-white/20 text-white rounded-md px-3 py-2"
                >
                  <option value="twitter">Twitter/X</option>
                  <option value="reddit">Reddit</option>
                  <option value="discord">Discord</option>
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">Author</label>
                <Input value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})} placeholder="@username" className="bg-black border-white/20 text-white" required />
              </div>
            </div>
            <div>
              <label className="text-white/70 text-sm mb-1 block">Content</label>
              <Textarea value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="What they said..." className="bg-black border-white/20 text-white min-h-[80px]" required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white hover:bg-white/10">Cancel</Button>
              <Button type="submit" className="btn-primary">Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Creator Submissions Management
const CreatorSubmissionsManagement = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    try {
      const res = await axios.get(`${API}/creator-submissions`);
      setSubmissions(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/creator-submissions/${id}?status=${status}`);
      toast.success(`Submission ${status}!`);
      fetchSubmissions();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="spinner mx-auto mt-8"></div>;

  const pending = submissions.filter(s => s.status === 'pending');
  const approved = submissions.filter(s => s.status === 'approved');
  const rejected = submissions.filter(s => s.status === 'rejected');

  return (
    <div data-testid="creator-submissions-management">
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-white uppercase">Creator Submissions</h2>
        <p className="text-white/60 text-sm">Review content submissions from creators</p>
      </div>

      <div className="flex gap-4 mb-6">
        <span className="text-white/60">Pending: <span className="text-yellow-500 font-bold">{pending.length}</span></span>
        <span className="text-white/60">Approved: <span className="text-green-500 font-bold">{approved.length}</span></span>
        <span className="text-white/60">Rejected: <span className="text-red-500 font-bold">{rejected.length}</span></span>
      </div>

      {submissions.length === 0 ? (
        <p className="text-white/50 text-center py-8">No submissions yet.</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className={`bg-[#09090B] p-4 rounded-md border ${sub.status === 'pending' ? 'border-yellow-500/50' : sub.status === 'approved' ? 'border-green-500/50' : 'border-red-500/50'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-white font-bold">{sub.name}</span>
                  <span className="text-white/50 text-sm ml-2">({sub.platform})</span>
                  {sub.follower_count && <span className="text-[#C8102E] text-sm ml-2">{sub.follower_count} followers</span>}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${sub.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : sub.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {sub.status}
                </span>
              </div>
              <p className="text-white/80 text-sm mb-2">{sub.description}</p>
              <div className="flex gap-2 text-xs mb-3">
                <a href={sub.profile_url} target="_blank" rel="noopener noreferrer" className="text-[#C8102E] hover:underline">Profile</a>
                <a href={sub.content_url} target="_blank" rel="noopener noreferrer" className="text-[#C8102E] hover:underline">Content</a>
              </div>
              {sub.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(sub.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white text-xs">Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(sub.id, 'rejected')} className="border-red-500 text-red-500 hover:bg-red-500/10 text-xs">Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
