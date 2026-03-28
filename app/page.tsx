export const dynamic = "force-dynamic"; // This disables SSG and ISR

import { redirect } from "next/navigation";

export default async function Home() {
  redirect("/houses")
}
