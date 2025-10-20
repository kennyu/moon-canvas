import { Liveblocks } from "@liveblocks/node";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/app/auth";
import { pickColor } from "@/lib/userColor";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guestId")?.value;
  const guestName = cookieStore.get("guestName")?.value;

  const user = session?.user
    ? {
        id: (session.user.email || session.user.name || "user") as string,
        name: (session.user.name || "User") as string,
        avatar: session.user.image || undefined,
      }
    : guestId && guestName
    ? { id: `guest:${guestId}` as string, name: guestName as string }
    : { id: `guest:${crypto.randomUUID()}`, name: "Guest" };

  const color = pickColor(user.id);
  const lbSession = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.name,
      color,
      avatar: user.avatar ?? "",
    },
  });
  lbSession.allow(`liveblocks:examples:*`, lbSession.FULL_ACCESS);
  const { body, status } = await lbSession.authorize();
  return new Response(body, { status });
}


