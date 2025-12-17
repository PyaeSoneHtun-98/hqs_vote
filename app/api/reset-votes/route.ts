import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await supabaseAdmin.from("votes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseAdmin.from("contestants").update({ vote_count: 0 }).neq("id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({ success: true });
}
