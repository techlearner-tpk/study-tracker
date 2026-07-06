import { SignUp } from "@clerk/nextjs";

type SearchParams = Record<string, string | string[] | undefined>;

function isKidInvite(searchParams: SearchParams) {
  const redirectUrl = searchParams.redirect_url;
  if (typeof redirectUrl !== "string") return false;
  return redirectUrl.includes("/kid");
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const kidInvite = isKidInvite(resolvedSearchParams);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        forceRedirectUrl={kidInvite ? "/kid" : "/"}
        fallbackRedirectUrl={kidInvite ? "/kid" : "/"}
        signInUrl="/sign-in"
      />
    </div>
  );
}
