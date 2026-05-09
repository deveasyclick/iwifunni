import UserProfile from "./UserProfile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "user-profile",
};

const Notes = () => {
  return <UserProfile />;
};

export default Notes;
