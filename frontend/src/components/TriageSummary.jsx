import { useAuth } from "../AuthContext";
import TriageSummaryStoreManager from "./TriageSummaryStoreManager";
import TriageSummaryDevOps from "./TriageSummaryDevOps";

export default function TriageSummary({ result }) {
  const { user } = useAuth();

  if (user?.role === 'StoreManager') {
    return <TriageSummaryStoreManager result={result} />;
  }

  return <TriageSummaryDevOps result={result} />;
}
