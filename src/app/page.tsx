import { Room } from "@/app/Room";
import { StorageTldraw } from "@/components/StorageTldraw";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth");
  }
  return (
    <Room>
      <StorageTldraw />
    </Room>
  );
}


