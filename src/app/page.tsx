'use client';

import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <Sidebar />
      <ChatArea />
      <SettingsModal />
    </div>
  );
}
