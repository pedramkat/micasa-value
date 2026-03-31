export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Form from "next/form";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function EditUserPage({ params }: { params: { id?: string } }) {
  const id = typeof params?.id === "string" ? params.id : "";
  if (!id) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,
      telephone: true,
      address: true,
      role: true,
    },
  });

  if (!user) notFound();

  async function updateUser(formData: FormData) {
    "use server";

    const name = formData.get("name");
    const surname = formData.get("surname");
    const telephone = formData.get("telephone");
    const address = formData.get("address");

    await prisma.user.update({
      where: { id },
      data: {
        name: typeof name === "string" ? name.trim() || null : null,
        surname: typeof surname === "string" ? surname.trim() || null : null,
        telephone: typeof telephone === "string" ? telephone.trim() || null : null,
        address: typeof address === "string" ? address.trim() || null : null,
      },
    });

    redirect("/users");
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/users" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Users
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Edit</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Edit user
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form action={updateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={user.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Surname</Label>
              <Input id="surname" name="surname" defaultValue={user.surname ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <Input id="telephone" name="telephone" defaultValue={user.telephone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={user.address ?? ""} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/users">Cancel</Link>
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
