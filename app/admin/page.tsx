"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Contestant, Settings } from "@/lib/types";
import {
  Upload,
  Trash2,
  RefreshCw,
  Lock,
  Plus,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Users,
  Trophy,
  TrendingUp,
  BarChart3,
  Percent,
  Pencil,
  Check,
  Clock,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [, setSettings] = useState<Settings | null>(null);
  const [votingStart, setVotingStart] = useState("");
  const [votingEnd, setVotingEnd] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("admin_auth");
    const savedPassword = sessionStorage.getItem("admin_password");
    if (savedAuth === "true" && savedPassword) {
      setAuthenticated(true);
      setPassword(savedPassword);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchContestants();
      fetchSettings();
    }
  }, [authenticated]);

  const fetchSettings = async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      if (data.voting_start) {
        setVotingStart(new Date(data.voting_start).toISOString().slice(0, 16));
      }
      if (data.voting_end) {
        setVotingEnd(new Date(data.voting_end).toISOString().slice(0, 16));
      }
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voting_start: votingStart ? new Date(votingStart).toISOString() : null,
        voting_end: votingEnd ? new Date(votingEnd).toISOString() : null,
        password,
      }),
    });
    if (res.ok) {
      fetchSettings();
      alert("Settings saved!");
    } else {
      alert("Failed to save settings");
    }
    setSavingSettings(false);
  };

  const getVotingStatus = () => {
    if (!votingStart || !votingEnd) return "Not scheduled";
    const now = new Date().getTime();
    const start = new Date(votingStart).getTime();
    const end = new Date(votingEnd).getTime();
    if (now < start) return "Scheduled";
    if (now >= start && now < end) return "Active";
    return "Ended";
  };

  const handleLogin = async () => {
    const res = await fetch("/api/contestants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "verify" }),
    });
    if (res.ok) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      sessionStorage.setItem("admin_password", password);
    } else {
      alert("Invalid password");
    }
  };

  const fetchContestants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contestants")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setContestants(data);
    setLoading(false);
  };

  const processFile = (selected: File) => {
    if (selected.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }
    if (!selected.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const addContestant = async () => {
    if (!name || !file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("password", password);

      const res = await fetch("/api/contestants", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setName("");
        setFile(null);
        setPreview(null);
        fetchContestants();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add contestant");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to add contestant");
    }
    setUploading(false);
  };

  const deleteContestant = async (id: string, imageUrl: string) => {
    if (!confirm("Delete this contestant?")) return;

    const res = await fetch("/api/contestants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, imageUrl, password }),
    });

    if (res.ok) fetchContestants();
    else alert("Failed to delete");
  };

  const resetVotes = async () => {
    if (!confirm("Reset all votes to zero?")) return;

    const res = await fetch("/api/reset-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) fetchContestants();
    else alert("Failed to reset votes");
  };

  const startEdit = (contestant: Contestant) => {
    setEditingId(contestant.id);
    setEditName(contestant.name);
    setEditFile(null);
    setEditPreview(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditFile(null);
    setEditPreview(null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      setEditFile(selected);
      setEditPreview(URL.createObjectURL(selected));
    }
  };

  const saveEdit = async (id: string, oldImageUrl: string) => {
    if (!editName.trim()) return;

    try {
      if (editFile) {
        const formData = new FormData();
        formData.append("id", id);
        formData.append("name", editName);
        formData.append("file", editFile);
        formData.append("oldImageUrl", oldImageUrl);
        formData.append("password", password);

        const res = await fetch("/api/contestants/update", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          fetchContestants();
          cancelEdit();
        } else {
          alert("Failed to update");
        }
      } else {
        const res = await fetch("/api/contestants", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name: editName, password }),
        });

        if (res.ok) {
          fetchContestants();
          cancelEdit();
        } else {
          alert("Failed to update");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update");
    }
  };

  const totalVotes = contestants.reduce((sum, c) => sum + c.vote_count, 0);
  const maxVotes = Math.max(...contestants.map((c) => c.vote_count), 0);
  const leaders = contestants.filter((c) => c.vote_count === maxVotes && maxVotes > 0);
  const avgVotes = contestants.length > 0 ? (totalVotes / contestants.length).toFixed(1) : "0";
  const sortedByVotes = [...contestants].sort((a, b) => b.vote_count - a.vote_count);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Admin Access
          </h1>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Login
          </button>
          <Link
            href="/"
            className="block text-center mt-4 text-gray-500 hover:text-green-600"
          >
            ← Back to voting
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <div className="flex items-center gap-2 text-green-600">
            <Users size={20} />
            <span className="font-medium">{totalVotes} votes</span>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-green-500" />
            Voting Schedule
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={votingStart}
                onChange={(e) => setVotingStart(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                value={votingEnd}
                onChange={(e) => setVotingEnd(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                Status:{" "}
                <span
                  className={`font-medium ${
                    getVotingStatus() === "Active"
                      ? "text-green-600"
                      : getVotingStatus() === "Ended"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {getVotingStatus()}
                </span>
              </span>
            </div>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold px-6 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              {savingSettings ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Save Schedule
            </button>
          </div>
        </div>

        {contestants.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-green-500" />
              Statistics Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <Users className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{totalVotes}</p>
                <p className="text-sm text-gray-600">Total Votes</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{avgVotes}</p>
                <p className="text-sm text-gray-600">Avg per Person</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{maxVotes}</p>
                <p className="text-sm text-gray-600">Highest Votes</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <Percent className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{leaders.length}</p>
                <p className="text-sm text-gray-600">In the Lead</p>
              </div>
            </div>

            {leaders.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" />
                  Current Leader{leaders.length > 1 ? "s" : ""}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {leaders.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                      <img src={l.image_url} alt={l.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-medium text-gray-800">{l.name}</span>
                      <span className="text-yellow-600 font-bold">{l.vote_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedByVotes.length > 0 && totalVotes > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Vote Distribution</h3>
                <div className="space-y-2">
                  {sortedByVotes.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-6">{i + 1}.</span>
                      <img src={c.image_url} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm font-medium text-gray-700 w-24 truncate">{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-green-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${totalVotes > 0 ? (c.vote_count / totalVotes) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">
                        {c.vote_count} ({totalVotes > 0 ? ((c.vote_count / totalVotes) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={20} className="text-green-500" />
            Add Contestant
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Contestant name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <label
                className="block"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) processFile(droppedFile);
                }}
              >
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-400"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload
                    className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "text-green-500" : "text-gray-400"}`}
                  />
                  <p className={`text-sm ${isDragging ? "text-green-600" : "text-gray-500"}`}>
                    {isDragging
                      ? "Drop image here"
                      : file
                      ? file.name
                      : "Drag & drop or click to upload (max 5MB)"}
                  </p>
                </div>
              </label>
            </div>
            <div className="flex flex-col">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-xl mb-4 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <button
                onClick={addContestant}
                disabled={!name || !file || uploading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Plus size={20} />
                )}
                {uploading ? "Uploading..." : "Add Contestant"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Contestants ({contestants.length})
            </h2>
            <button
              onClick={resetVotes}
              className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm"
            >
              <RefreshCw size={16} />
              Reset All Votes
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          ) : contestants.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No contestants added yet
            </p>
          ) : (
            <div className="grid gap-4">
              {contestants.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 bg-gray-50 rounded-xl transition-all ${
                    editingId === c.id ? "ring-2 ring-green-500" : ""
                  }`}
                >
                  {editingId === c.id ? (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="relative">
                          <img
                            src={editPreview || c.image_url}
                            alt={c.name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditFileChange}
                              className="hidden"
                            />
                            <Upload className="w-6 h-6 text-white" />
                          </label>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Contestant name"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                            autoFocus
                          />
                          <p className="text-sm text-gray-500">
                            Click on image to change photo
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(c.id, c.image_url)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Check size={16} />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{c.name}</h3>
                        <p className="text-sm text-gray-500">{c.vote_count} votes</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-blue-400 hover:text-blue-600 p-2"
                        >
                          <Pencil size={20} />
                        </button>
                        <button
                          onClick={() => deleteContestant(c.id, c.image_url)}
                          className="text-red-400 hover:text-red-600 p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
