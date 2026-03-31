import SetupInstructions from "./setup-instructions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <div className="min-h-[calc(100svh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Welcome</CardTitle>
          <p className="text-sm text-muted-foreground">
            It looks like your database isn&apos;t set up yet. Follow the instructions below to get started.
          </p>
        </CardHeader>
        <CardContent>
          <SetupInstructions />
        </CardContent>
      </Card>
    </div>
  );
}
