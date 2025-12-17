export interface Contestant {
  id: string;
  name: string;
  image_url: string;
  vote_count: number;
  created_at: string;
}

export interface Vote {
  id: string;
  session_id: string;
  contestant_id: string;
  voted_at: string;
}

export interface Settings {
  id: number;
  voting_start: string | null;
  voting_end: string | null;
  updated_at: string;
}
