import { ReactNode } from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { DesktopLayout } from './DesktopLayout';
import { TabletLayout } from './TabletLayout';
import { MobileLayout } from './MobileLayout';

interface ResponsiveLayoutProps {
  header?: ReactNode;
  video: ReactNode;
  controls: ReactNode;
  chat: ReactNode;
  voice: ReactNode;
  participants?: ReactNode;
  tabContent?: ReactNode; // For mobile/tablet - combines chat and voice in tabs
}

/**
 * Responsive Layout Component
 * Automatically switches between Desktop, Tablet, and Mobile layouts based on screen size
 */
export function ResponsiveLayout({
  header,
  video,
  controls,
  chat,
  voice,
  participants,
  tabContent,
}: ResponsiveLayoutProps) {
  const { isDesktop, isTablet } = useBreakpoint();

  // Desktop layout (≥1024px)
  if (isDesktop) {
    return (
      <DesktopLayout
        header={header}
        video={video}
        controls={controls}
        chat={chat}
        voice={voice}
        participants={participants}
      />
    );
  }

  // Tablet layout (768px - 1023px)
  if (isTablet) {
    return (
      <TabletLayout
        header={header}
        video={video}
        controls={controls}
        tabContent={tabContent || <div>{chat}</div>}
      />
    );
  }

  // Mobile layout (<768px)
  return (
    <MobileLayout
      header={header}
      video={video}
      controls={controls}
      tabContent={tabContent || <div>{chat}</div>}
    />
  );
}
