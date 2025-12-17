import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const { password, action } = await request.json();
    if (action === "verify") {
      if (password === process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  }

  const formData = await request.formData();
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const file = formData.get("file") as File;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!name || !file) {
    return NextResponse.json({ error: "Name and file required" }, { status: 400 });
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("contestant-photos")
    .upload(fileName, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("contestant-photos")
    .getPublicUrl(fileName);

  const { error: dbError } = await supabaseAdmin
    .from("contestants")
    .insert({ name, image_url: publicUrl });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { id, imageUrl, password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileName = imageUrl.split("/").pop();
  await supabaseAdmin.storage.from("contestant-photos").remove([fileName]);
  await supabaseAdmin.from("votes").delete().eq("contestant_id", id);
  await supabaseAdmin.from("contestants").delete().eq("id", id);

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { id, name, password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id || !name) {
    return NextResponse.json({ error: "ID and name required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("contestants")
    .update({ name })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
