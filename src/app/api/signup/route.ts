import { NextRequest } from "next/server";
import { createUser, findUserByEmail } from "@/app/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = (body?.email || "").toString();
  const name = (body?.name || "").toString();
  const password = (body?.password || "").toString();

  if (!email || !password || !name) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  if (findUserByEmail(email)) {
    return Response.json({ error: "User already exists" }, { status: 409 });
  }
  const user = createUser({ email, name, password });
  return Response.json({ id: user.id, email: user.email, name: user.name });
}
