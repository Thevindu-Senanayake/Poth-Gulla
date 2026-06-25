import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DesktopApp() {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <Header />
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
