import { lazy } from "react";
import { MobileHeader } from "./Parts";

const Profile = lazy(() => import("../pages/user/Profile"));

export default function MobileAccounts() {
  return (
    <div className="m-screen-body m-accounts">
      <MobileHeader title="Accounts" />
      <div className="m-accounts-content">
        <Profile />
      </div>
    </div>
  );
}
