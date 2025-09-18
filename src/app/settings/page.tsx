import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import to prevent SSR for client components
const SettingsPage = dynamic(() => import('./SettingsPage').then(mod => mod.SettingsPage), {
  ssr: false
});

const Page = () => {
  return (
    <div className="h-full w-full flex flex-row">
      {/* Main settings area - full width */}
      <div className="w-full h-full overflow-auto">
        <SettingsPage />
      </div>
    </div>
  );
};

export default Page;
