import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";

// Styles for the layout
const layoutStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh", // Takes at least the full screen height
};

const mainStyle: React.CSSProperties = {
  flex: 1, // This makes the main content take all available space
  padding: "2rem",
};

export const Layout: React.FC = () => {
  return (
    <div style={layoutStyle}>
      <Header />
      <main style={mainStyle}>
        {/* This 'Outlet' is where react-router will render 
            our pages (HomePage, AdminDashboard, etc.) */}
        <Outlet />
      </main>
    </div>
  );
};
