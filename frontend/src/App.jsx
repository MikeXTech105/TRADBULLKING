import AppRoutes from "./routes/AppRoutes";
import PwaStatus from "./components/PwaStatus";
export default function App() {
  return (
    <>
      <PwaStatus />
      <AppRoutes />
    </>
  );
}
