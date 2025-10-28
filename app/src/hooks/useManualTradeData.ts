import ManualTradeDataContext from "@/contexts/ManualTradeDataContext";
import { useContext } from "react";

const useManualTradeData = () => {
  const ctx = useContext(ManualTradeDataContext);
  if (!ctx) throw new Error("useManualTradeData must be used within ManualTradeDataProvider");
  return ctx;
};

export default useManualTradeData;