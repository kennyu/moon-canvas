<!-- 978ba159-6b64-4913-9bd1-ce6fb54a92a8 958c98fc-43d3-46d3-87ac-6ceae5415c95 -->
# NextAuth + Liveblocks presence (GitHub, Google, Guest)

## What we'll do

- Add NextAuth with GitHub and Google providers and optional guest mode.
- Wrap the app with SessionProvider and keep LiveblocksProvider.
- Update `/api/liveblocks-auth` to use NextAuth session or guest cookies for `userInfo` (name/color/avatar).
- Add a lightweight auth bar to sign in/out and set a guest display name; PresencePanel will automatically show names via `me.info`.

## Files to add/update

- Add `src/app/api/auth/[...nextauth]/route.ts` (NextAuth config with GitHub, Google)
- Add `src/app/auth.ts` exporting `authOptions` (shared by API routes)
- Update `src/app/Providers.tsx` to include `SessionProvider`
- Update `src/app/api/liveblocks-auth/route.ts` to use NextAuth session or guest cookie (this route authorizes Liveblocks)
- Add `src/components/AuthBar.tsx` with Sign in/out and Guest name input
- Optional: Add `src/lib/userColor.ts` to pick a deterministic color by id
- Wire `AuthBar` into `src/app/layout.tsx` (top-right) so users can sign in or pick guest name

## Liveblocks auth route (explicit)

- Replace the current random-user logic in `src/app/api/liveblocks-auth/route.ts` with session/guest logic:
```ts
import { Liveblocks } from "@liveblocks/node";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth";
import { cookies } from "next/headers";
import { pickColor } from "@/lib/userColor";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const cookieStore = cookies();
  const guestId = cookieStore.get("guestId")?.value;
  const guestName = cookieStore.get("guestName")?.value;

  const user = session?.user
    ? {
        id: (session.user.email || session.user.name || "user") as string,
        name: session.user.name || "User",
        avatar: session.user.image || undefined,
      }
    : guestId && guestName
    ? { id: `guest:${guestId}`, name: guestName }
    : { id: `guest:${crypto.randomUUID()}`, name: "Guest" };

  const color = pickColor(user.id);
  const lbSession = liveblocks.prepareSession(user.id, {
    userInfo: { name: user.name, avatar: user.avatar, color },
  });
  lbSession.allow("liveblocks:examples:*", lbSession.FULL_ACCESS);
  const { body, status } = await lbSession.authorize();
  return new Response(body, { status });
}
```


## Essential snippets (concise)

- NextAuth route (providers only):
```ts
// src/app/api/auth/[...nextauth]/route.ts
export const authOptions = { providers: [
  GitHubProvider({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! }),
  GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
] } satisfies NextAuthOptions;
```

- Wrap with SessionProvider:
```tsx
// src/app/Providers.tsx
return (
  <SessionProvider>
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth" throttle={16}>
      {children}
    </LiveblocksProvider>
  </SessionProvider>
);
```

- Liveblocks auth reads session or guest cookie:
```ts
// src/app/api/liveblocks-auth/route.ts
const session = await getServerSession(authOptions);
const user = session?.user
  ? { id: session.user.email ?? session.user.name!, name: session.user.name!, avatar: session.user.image }
  : readOrCreateGuestFromCookie(request); // returns { id, name }
const color = pickColor(user.id);
const sessionLb = liveblocks.prepareSession(user.id, { userInfo: { name: user.name, color, avatar: user.avatar } });
```

- Guest UI sets cookie and refreshes:
```tsx
// src/components/AuthBar.tsx
<button onClick={() => signIn("github")}>GitHub</button>
<button onClick={() => signIn("google")}>Google</button>
<form onSubmit={setGuestCookieAndReload}>
  <input name="guestName" placeholder="Display name" />
  <button type="submit">Continue as guest</button>
</form>
{session && <button onClick={() => signOut()}>Sign out</button>}
```


## Env vars (you set them)

- NEXTAUTH_URL, NEXTAUTH_SECRET
- GITHUB_ID, GITHUB_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- LIVEBLOCKS_SECRET_KEY

## Behavior

- Signed-in users: Presence shows `session.user.name` and avatar color.
- Guests: Presence shows chosen guest name and generated color. Stable guest id via cookie.
- `StorageTldraw` keeps working; it already reads `me.info` for name/color.

### To-dos

- [ ] Install next-auth and required peer deps
- [ ] Add NextAuth route with GitHub and Google providers
- [ ] Wrap app with SessionProvider in Providers.tsx
- [ ] Use NextAuth session or guest cookie to set userInfo
- [ ] Create AuthBar with GitHub/Google sign-in and guest name form
- [ ] Render AuthBar in layout.tsx (fixed top-right)
- [ ] Add deterministic user color helper by id