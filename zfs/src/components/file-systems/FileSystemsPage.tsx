/**
 * FileSystemsPage -- main page component for the File Systems tab.
 * Default export, lazy-loaded by ZfsPage.
 *
 * Uses PF PageSection + Toolbar for the top bar and delegates the table
 * rendering to FileSystemTable.
 */

import React, { useCallback, useState } from 'react';
import {
	PageSection,
	Toolbar,
	ToolbarContent,
	ToolbarItem,
	Button,
	Spinner,
	Bullseye,
	EmptyState,
	EmptyStateBody,
} from '@patternfly/react-core';
import { SyncAltIcon, CubesIcon } from '@patternfly/react-icons';

import { useZfsData } from '../../contexts/ZfsDataContext';
import { FileSystemTable } from './FileSystemTable';

export function FileSystemsPage() {
	const {
		datasets,
		pools,
		snapshots,
		fileSystemsLoaded,
		canDestructive,
		refreshAll,
		isRefreshing,
	} = useZfsData();

	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refreshAll();
		} finally {
			setRefreshing(false);
		}
	}, [refreshAll]);

	// Filter to only FILESYSTEM type datasets
	const fileSystems = datasets.filter(ds => ds.type === 'FILESYSTEM');

	const loading = !fileSystemsLoaded || isRefreshing || refreshing;

	return (
		<PageSection>
			<Toolbar>
				<ToolbarContent>
					<ToolbarItem>
						<Button
							variant="primary"
							isDisabled={!canDestructive}
						>
							Create File System
						</Button>
					</ToolbarItem>
					<ToolbarItem align={{ default: 'alignEnd' }}>
						<Button
							variant="plain"
							aria-label="Refresh file systems"
							onClick={handleRefresh}
							isDisabled={loading}
							icon={loading ? <Spinner size="md" /> : <SyncAltIcon />}
						/>
					</ToolbarItem>
				</ToolbarContent>
			</Toolbar>

			{loading && fileSystems.length === 0 ? (
				<Bullseye>
					<Spinner size="xl" aria-label="Loading file systems" />
				</Bullseye>
			) : fileSystems.length === 0 ? (
				<Bullseye>
					<EmptyState titleText="No File Systems Found" headingLevel="h2" icon={CubesIcon}>
						<EmptyStateBody>
							Create a pool first, then file systems will appear here.
						</EmptyStateBody>
					</EmptyState>
				</Bullseye>
			) : (
				<FileSystemTable
					datasets={datasets}
					pools={pools}
					snapshots={snapshots}
					canDestructive={canDestructive}
					onRefresh={handleRefresh}
				/>
			)}
		</PageSection>
	);
}

export default FileSystemsPage;
