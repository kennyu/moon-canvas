import { Room } from "@/app/Room";
import { StorageTldraw } from "@/components/StorageTldraw";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const bypass = process.env.TEST_BYPASS_AUTH === '1';
  const session = await getServerSession(authOptions);
  if (!session && !bypass) {
    redirect("/auth");
  }
  return (
    <Room>
      <StorageTldraw />
    </Room>
  );
}


