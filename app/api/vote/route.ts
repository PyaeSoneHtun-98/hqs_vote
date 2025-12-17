import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { sessionId, contestantId } = await request.json();

  if (!sessionId || !contestantId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const { data: existingVote } = await supabaseAdmin
    .from("votes")
    .select("id")
    .eq("session_id", sessionId)
    .single();

  if (existingVote) {
    return NextResponse.json({ error: "Already voted" }, { status: 400 });
  }

  const { error: voteError } = await supabaseAdmin
    .from("votes")
    .insert({ session_id: sessionId, contestant_id: contestantId });

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin.rpc("increment_vote", {
    contestant_id: contestantId,
  });

  if (updateError) {
    await supabaseAdmin
      .from("contestants")
      .update({ vote_count: supabaseAdmin.rpc("increment_vote_count") })
      .eq("id", contestantId);
  }

  return NextResponse.json({ success: true });
}
