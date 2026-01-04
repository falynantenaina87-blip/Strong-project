import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Explorer } from './components/Explorer';
import { CRM } from './components/CRM';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'crm'>('explore');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'explore' ? <Explorer /> : <CRM />}
    </Layout>
  );
};

export default App;