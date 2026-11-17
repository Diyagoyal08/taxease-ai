"use client";

import Sidebar from "./Sidebar";

export default function Shell({ children }) {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <div className="shell">
        <Sidebar />
        <main className="main" id="main">
          {children}
        </main>
      </div>
    </>
  );
}
