import { Suspense } from "react";
import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  start: "Couldn't start Google sign-in. Check the Supabase Google provider settings.",
  auth: "Sign-in didn't complete. Please try again.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to Reel Log</CardTitle>
          <CardDescription>
            Track what you&apos;ve watched, build a watchlist, and share reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense fallback={<GoogleSignInButton />}>
            <SignIn searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function SignIn({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = first(params.next);
  const error = ERRORS[first(params.error) ?? ""];

  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <GoogleSignInButton next={next} />
    </>
  );
}
