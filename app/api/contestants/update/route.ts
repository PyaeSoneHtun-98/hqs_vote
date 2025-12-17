import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const file = formData.get("file") as File;
  const oldImageUrl = formData.get("oldImageUrl") as string;
  const password = formData.get("password") as string;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id || !name) {
    return NextResponse.json({ error: "ID and name required" }, { status: 400 });
  }

  let newImageUrl = oldImageUrl;

  if (file) {
    // Delete old image
    const oldFileName = oldImageUrl.split("/").pop();
    if (oldFileName) {
      await supabaseAdmin.storage.from("contestant-photos").remove([oldFileName]);
    }

    // Upload new image
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

    newImageUrl = publicUrl;
  }

  const { error } = await supabaseAdmin
    .from("contestants")
    .update({ name, image_url: newImageUrl })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
