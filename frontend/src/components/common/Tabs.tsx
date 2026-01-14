import { ReactNode, useState } from 'react';
import clsx from 'clsx';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  onChange?: (tabId: string) => void;
}

/**
 * Reusable Tabs component with glass styling
 */
export function Tabs({ tabs, defaultTab, className, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Tab Headers */}
      <div className="flex-shrink-0 flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              'flex-1 px-4 py-3 font-medium transition-all duration-200',
              'flex items-center justify-center gap-2',
              'hover:bg-white/5',
              activeTab === tab.id
                ? 'text-accent-cyan border-b-2 border-accent-cyan bg-white/5'
                : 'text-gray-400 border-b-2 border-transparent'
            )}
          >
            {tab.icon && <span className="text-lg">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTabContent}
      </div>
    </div>
  );
}
