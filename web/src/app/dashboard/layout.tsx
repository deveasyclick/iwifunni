import Header from "./layout/header/Header";
import Sidebar from "./layout/sidebar/Sidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  if (!cookieStore.get("access_token")?.value) {
    redirect("/auth/login");
  }
  if (cookieStore.get("needs_onboarding")?.value === "true") {
    redirect("/auth/onboarding");
  }

  return (
    <div className="flex w-full min-h-screen">
      <div className="page-wrapper flex w-full">
        {/* Header/sidebar */}
        <div className="xl:block hidden">
          <Sidebar />
        </div>
        <div className="body-wrapper w-full bg-background">
          {/* Top Header  */}
          <Header />
          {/* Body Content  */}
          <div className={`container mx-auto px-6 py-30`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
