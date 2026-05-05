import React, { useState, createContext, useContext } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

const MenuContext = createContext(() => {});
export const useMenuOpen = () => useContext(MenuContext);

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <MenuContext.Provider value={() => setSidebarOpen(true)}>
      <div className="admin-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="admin-main">{children}</main>
      </div>
    </MenuContext.Provider>
  );
}
