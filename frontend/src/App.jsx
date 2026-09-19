import { useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import PwaStatus from "./components/PwaStatus";
import InstallPromptController from "./components/InstallPromptController";
import MarketConnectionNotifier from "./components/MarketConnectionNotifier";

function InstallPromptGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <InstallPromptController />;
}

export default function App() {
  return (
    <>
      <PwaStatus />
      <MarketConnectionNotifier />
      <InstallPromptGate />
      <AppRoutes />
    </>
  );
}
