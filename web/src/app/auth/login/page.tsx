import { Login } from "@/app/components/auth/Login";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const cookieStore = await cookies();
  if (cookieStore.get("access_token")?.value) {
    redirect("/dashboard");
  }

  return <Login />;
};

export default page;
