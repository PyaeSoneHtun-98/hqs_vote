"use client";

import { Trophy, Vote } from "lucide-react";
import { Contestant } from "@/lib/types";

interface VotingCardProps {
  contestant: Contestant;
  isSelected: boolean;
  isWinner: boolean;
  hasVoted: boolean;
  onSelect: (id: string) => void;
}

export default function VotingCard({
  contestant,
  isSelected,
  isWinner,
  hasVoted,
  onSelect,
}: VotingCardProps) {
  return (
    <div
      onClick={() => !hasVoted && onSelect(contestant.id)}
      className={`relative bg-white rounded-2xl overflow-hidden cursor-pointer card-hover ${
        isSelected ? "selected-card" : "border border-gray-100"
      } ${hasVoted ? "cursor-default" : ""}`}
    >
      {isWinner && (
        <div className="absolute top-3 right-3 z-10 winner-badge">
          <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Trophy size={16} />
            <span className="text-sm font-bold">Winner</span>
          </div>
        </div>
      )}

      <div className="relative h-72 overflow-hidden">
        <img
          src={contestant.image_url}
          alt={contestant.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {isSelected && !hasVoted && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <Vote size={48} className="text-white drop-shadow-lg" />
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">
          {contestant.name}
        </h3>
        <div className="flex justify-center">
          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            {contestant.vote_count} {contestant.vote_count === 1 ? "vote" : "votes"}
          </span>
        </div>
      </div>
    </div>
  );
}
