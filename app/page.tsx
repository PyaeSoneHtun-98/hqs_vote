"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Contestant, Settings } from "@/lib/types";
import {
  Sparkles,
  Users,
  CheckCircle,
  Loader2,
  Trophy,
  TrendingUp,
  Clock,
  PartyPopper,
  X,
  Vote,
  ZoomIn,
  BarChart3,
  Percent,
} from "lucide-react";

type VotingStatus = "before" | "active" | "ended";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Home() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [votingStatus, setVotingStatus] = useState<VotingStatus>("before");
  const [countdown, setCountdown] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [modalImage, setModalImage] = useState<Contestant | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let storedSession = localStorage.getItem("voter_session_id");
    if (!storedSession) {
      storedSession = generateUUID();
      localStorage.setItem("voter_session_id", storedSession);
    }
    setSessionId(storedSession);
    checkIfVoted(storedSession);
    fetchContestants();
    fetchSettings();
    setupRealtime();
  }, []);

  useEffect(() => {
    if (!settings) return;
    const interval = setInterval(() => updateVotingStatus(), 1000);
    updateVotingStatus();
    return () => clearInterval(interval);
  }, [settings]);

  useEffect(() => {
    if (votingStatus === "ended" && !showCelebration) {
      setShowCelebration(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [votingStatus, showCelebration]);

  const updateVotingStatus = () => {
    if (!settings?.voting_start || !settings?.voting_end) {
      setVotingStatus("before");
      setCountdown("Voting schedule not set");
      return;
    }
    const now = new Date().getTime();
    const start = new Date(settings.voting_start).getTime();
    const end = new Date(settings.voting_end).getTime();
    if (now < start) {
      setVotingStatus("before");
      setCountdown(formatCountdown(start - now));
    } else if (now >= start && now < end) {
      setVotingStatus("active");
      setCountdown(formatCountdown(end - now));
    } else {
      setVotingStatus("ended");
      setCountdown("Voting has ended");
    }
  };

  const formatCountdown = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const checkIfVoted = async (session: string) => {
    const { data } = await supabase.from("votes").select("id").eq("session_id", session).single();
    if (data) setHasVoted(true);
  };

  const fetchContestants = async () => {
    const { data } = await supabase.from("contestants").select("*").order("vote_count", { ascending: false });
    if (data) setContestants(data);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("realtime-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "contestants" }, () => fetchContestants())
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => fetchSettings())
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const submitVote = async () => {
    if (!selectedId || hasVoted || votingStatus !== "active") return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, contestantId: selectedId }),
      });
      if (res.ok) {
        setHasVoted(true);
        localStorage.setItem("voter_session_id", sessionId);
      }
    } catch (error) {
      console.error("Vote failed:", error);
    }
    setSubmitting(false);
  };

  const totalVotes = contestants.reduce((sum, c) => sum + c.vote_count, 0);
  const maxVotes = Math.max(...contestants.map((c) => c.vote_count), 0);
  const winners = contestants.filter((c) => c.vote_count === maxVotes && maxVotes > 0);
  const sortedContestants = [...contestants].sort((a, b) => b.vote_count - a.vote_count);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-100 to-green-200">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-100 via-emerald-100 to-green-200 py-8 px-4">
      <audio ref={audioRef} src="/celebration.mp3" />

      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-green-400 transition-colors"
            >
              <X size={32} />
            </button>
            <img
              src={modalImage.image_url}
              alt={modalImage.name}
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl">
              <h3 className="text-2xl font-bold text-white">{modalImage.name}</h3>
              <p className="text-green-400 font-medium">{modalImage.vote_count} votes</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Desktop Header */}
        <header className="hidden sm:flex relative items-center justify-between mb-4 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm">
          <img src="/hqslogo.png" alt="HQS Logo" className="h-10 w-auto" />
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent whitespace-nowrap">
              Vote For Best Dressed
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {votingStatus === "before" && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-sm">
                <Clock size={16} />
                <span className="font-semibold">{countdown}</span>
              </div>
            )}
            {votingStatus === "active" && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm">
                <Clock size={16} className="animate-pulse" />
                <span className="font-semibold">{countdown}</span>
              </div>
            )}
            {votingStatus === "ended" && (
              <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
                <Trophy size={16} className="text-yellow-500" />
                <span className="font-semibold">Ended</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm">
              <Users size={16} />
              <span className="font-semibold">{totalVotes}</span>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sm:hidden mb-3 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <img src="/hqslogo.png" alt="HQS Logo" className="h-8 w-auto" />
            <h1 className="text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Best Dressed
            </h1>
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
              <Users size={12} />
              <span className="font-semibold">{totalVotes}</span>
            </div>
          </div>
          <div className="flex justify-center">
            {votingStatus === "before" && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs">
                <Clock size={12} />
                <span className="font-semibold">Starts in {countdown}</span>
              </div>
            )}
            {votingStatus === "active" && (
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs">
                <Clock size={12} className="animate-pulse" />
                <span className="font-semibold">{countdown} left</span>
              </div>
            )}
            {votingStatus === "ended" && (
              <div className="flex items-center gap-1.5 text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-xs">
                <Trophy size={12} className="text-yellow-500" />
                <span className="font-semibold">Voting Ended</span>
              </div>
            )}
          </div>
        </header>

        {votingStatus === "ended" && winners.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 border-2 border-yellow-300 rounded-3xl p-8 mb-8 text-center relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10">
              {[...Array(20)].map((_, i) => (
                <PartyPopper
                  key={i}
                  className="absolute text-yellow-500"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                  size={24}
                />
              ))}
            </div>
            <div className="relative z-10">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-4xl font-bold text-gray-800 mb-2">🎉 Congratulations! 🎉</h2>
              <p className="text-xl text-gray-600 mb-6">
                {winners.length === 1 ? "The winner is..." : "The winners are..."}
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className="bg-white rounded-2xl p-5 shadow-xl cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setModalImage(winner)}
                  >
                    <img
                      src={winner.image_url}
                      alt={winner.name}
                      className="w-40 h-40 object-cover rounded-xl mx-auto mb-4"
                    />
                    <h3 className="text-2xl font-bold text-gray-800">{winner.name}</h3>
                    <p className="text-green-600 font-semibold text-lg">{winner.vote_count} votes</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasVoted && votingStatus === "active" && (
          <div className="bg-green-100/80 backdrop-blur-sm border border-green-200 rounded-xl px-4 py-2 mb-4 flex items-center justify-center gap-2 text-sm">
            <CheckCircle className="text-green-600" size={16} />
            <span className="text-green-700 font-medium">Vote submitted! Live rankings below.</span>
          </div>
        )}

        {contestants.length === 0 ? (
          <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-3xl">
            <p className="text-gray-500 text-lg">No contestants yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 mb-8">
              {sortedContestants.map((contestant, index) => {
                const isSelected = selectedId === contestant.id;
                const isWinner = contestant.vote_count === maxVotes && maxVotes > 0 && votingStatus === "ended";
                const canVote = !hasVoted && votingStatus === "active";
                const percentage = totalVotes > 0 ? (contestant.vote_count / totalVotes) * 100 : 0;

                return (
                  <div
                    key={contestant.id}
                    onClick={() => canVote && setSelectedId(contestant.id)}
                    className={`relative bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                      canVote ? "cursor-pointer hover:shadow-xl hover:scale-[1.02]" : ""
                    } ${isSelected ? "ring-4 ring-green-500 shadow-green-200" : ""} ${
                      isWinner ? "ring-4 ring-yellow-400 shadow-yellow-200" : ""
                    }`}
                  >
                    {/* Rank Badge */}
                    <div
                      className={`absolute top-1 left-1 z-10 w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                        index === 0
                          ? "bg-yellow-400 text-yellow-900"
                          : index === 1
                          ? "bg-gray-300 text-gray-700"
                          : index === 2
                          ? "bg-amber-600 text-white"
                          : "bg-white/90 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Winner Badge */}
                    {isWinner && (
                      <div className="absolute top-1 right-1 z-10">
                        <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-md" />
                      </div>
                    )}

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-10 bg-green-500 text-white p-1 rounded-full">
                        <Vote size={12} />
                      </div>
                    )}

                    {/* Image */}
                    <div className="relative aspect-square">
                      <img
                        src={contestant.image_url}
                        alt={contestant.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Zoom button */}
                      {!isSelected && !isWinner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalImage(contestant);
                          }}
                          className="absolute top-1 right-1 z-10 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                        >
                          <ZoomIn size={12} />
                        </button>
                      )}
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                      
                      {/* Info overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-1.5 pointer-events-none">
                        <h3 className="text-white font-semibold text-[10px] sm:text-xs leading-tight line-clamp-2 mb-0.5">{contestant.name}</h3>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-white/30 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-green-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-white/90 text-[10px] sm:text-xs font-medium">{contestant.vote_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {votingStatus === "active" && !hasVoted && (
              <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40">
                <button
                  onClick={submitVote}
                  disabled={!selectedId || submitting}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg transition-all shadow-2xl hover:shadow-xl flex items-center justify-center gap-2 sm:gap-3"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  {submitting ? "Submitting..." : selectedId ? "Submit Vote" : "Select a contestant"}
                </button>
              </div>
            )}
          </>
        )}

        {contestants.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 mt-6 mb-24">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BarChart3 className="text-green-500" size={18} />
              Statistics Overview
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-2 sm:p-4 text-center">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-green-500 mx-auto mb-1" />
                <p className="text-lg sm:text-2xl font-bold text-green-600">{totalVotes}</p>
                <p className="text-xs sm:text-sm text-gray-600">Votes</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-2 sm:p-4 text-center">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-lg sm:text-2xl font-bold text-blue-600">
                  {contestants.length > 0 ? (totalVotes / contestants.length).toFixed(1) : "0"}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Avg</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-2 sm:p-4 text-center">
                <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">{maxVotes}</p>
                <p className="text-xs sm:text-sm text-gray-600">Top</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-2 sm:p-4 text-center">
                <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500 mx-auto mb-1" />
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{winners.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Lead</p>
              </div>
            </div>

            {winners.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-3 sm:p-4 mb-4">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-500" />
                  Leader{winners.length > 1 ? "s" : ""}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {winners.map((l) => (
                    <div key={l.id} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 shadow-sm">
                      <img src={l.image_url} alt={l.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-medium text-gray-800 text-sm">{l.name}</span>
                      <span className="text-yellow-600 font-bold text-sm">{l.vote_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedContestants.length > 0 && totalVotes > 0 && (
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Vote Distribution</h3>
                <div className="space-y-1">
                  {sortedContestants.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-1 sm:gap-2">
                      <span className="text-[10px] sm:text-xs text-gray-500 w-4 sm:w-5 flex-shrink-0">{i + 1}.</span>
                      <img src={c.image_url} alt={c.name} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover flex-shrink-0" />
                      <span className="text-[10px] sm:text-sm font-medium text-gray-700 w-[70px] sm:w-40 truncate flex-shrink-0">{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 sm:h-3 overflow-hidden min-w-8">
                        <div
                          className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${totalVotes > 0 ? (c.vote_count / totalVotes) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-sm text-gray-600 w-12 sm:w-16 text-right flex-shrink-0">
                        {c.vote_count} ({((c.vote_count / totalVotes) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
