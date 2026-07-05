import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import JobsPage from "./components/JobsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
