import React, { Suspense, useCallback, useState } from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Page,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { NotificationBell } from './NotificationBell';
import { useZfsData } from '../contexts/ZfsDataContext';

const Dashboard = React.lazy(() => import('./dashboard/Dashboard'));
const PoolsPage = React.lazy(() => import('./pools/PoolsPage'));
const FileSystemsPage = React.lazy(() => import('./file-systems/FileSystemsPage'));

type TabKey = 'dashboard' | 'pools' | 'filesystems';

export function ZfsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const { canDestructive } = useZfsData();
  const [adminWarningDismissed, setAdminWarningDismissed] = useState(false);

  // Show warning immediately when user lacks admin access — don't wait for data
  const showAdminWarning = !canDestructive && !adminWarningDismissed;

  const handleTabSelect = useCallback(
    (_event: React.MouseEvent<HTMLElement>, eventKey: string | number) => {
      setActiveTab(eventKey as TabKey);
    },
    [],
  );

  return (
    <Page>
      <PageSection variant="default" padding={{ default: 'noPadding' }}>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem grow={{ default: 'grow' }}>
            <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
              <Tab
                eventKey="dashboard"
                title={<TabTitleText>Dashboard</TabTitleText>}
              />
              <Tab
                eventKey="pools"
                title={<TabTitleText>Pools</TabTitleText>}
              />
              <Tab
                eventKey="filesystems"
                title={<TabTitleText>File Systems</TabTitleText>}
              />
            </Tabs>
          </FlexItem>
          <FlexItem>
            <NotificationBell />
          </FlexItem>
        </Flex>
      </PageSection>

      {showAdminWarning && (
        <PageSection padding={{ default: 'noPadding' }}>
          <Alert
            variant="warning"
            title="Administrative access required"
            actionClose={<AlertActionCloseButton onClose={() => setAdminWarningDismissed(true)} />}
            isInline
          >
            This plugin requires administrative access to manage ZFS. Enable
            &quot;Administrative access&quot; in the Cockpit top bar, or log in as
            root, to view and manage pools.
          </Alert>
        </PageSection>
      )}

      <PageSection isFilled>
        <Card isFullHeight>
          <CardBody>
            <Suspense fallback={<Spinner aria-label="Loading tab content" />}>
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'pools' && <PoolsPage />}
              {activeTab === 'filesystems' && <FileSystemsPage />}
            </Suspense>
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
}
