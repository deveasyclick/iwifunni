import { VerifyEmail } from "@/app/components/auth/VerifyEmail";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const cookieStore = await cookies();
  if (cookieStore.get("access_token")?.value) {
    if (cookieStore.get("needs_onboarding")?.value === "true") {
      redirect("/auth/onboarding");
    }
    redirect("/dashboard");
  }

  return <VerifyEmail />;
};

export default page;