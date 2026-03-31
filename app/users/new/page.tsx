export const dynamic = "force-dynamic"; // This disables SSG and ISR

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Form from "next/form";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function NewUser() {
  async function createUser(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    await prisma.user.create({
      data: { name, email, password: "" }, // password will be added by NextAuth
    });

    redirect("/");
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New user</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create user
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form action={createUser} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <Input id="name" name="name" placeholder="Enter user name..." />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" name="email" type="email" required placeholder="Enter user email..." />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/">Cancel</Link>
              </Button>
              <Button type="submit">Create user</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
