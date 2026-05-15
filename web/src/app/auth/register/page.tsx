import { Register } from "@/app/components/auth/Register";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const cookieStore = await cookies();
  if (cookieStore.get("access_token")?.value) {
    redirect("/dashboard");
  }

  return <Register />;
};

export default page;
