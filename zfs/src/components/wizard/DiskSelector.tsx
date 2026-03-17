/**
 * DiskSelector -- Multi-select disk list for VDev configuration.
 *
 * Displays available (usable) disks with checkboxes.  Shows disk name,
 * capacity, type, and model.  Highlights selected disks and flags those with
 * partitions or belonging to exportable pools.
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React from 'react';
import {
	DataList,
	DataListItem,
	DataListItemRow,
	DataListCheck,
	DataListItemCells,
	DataListCell,
	Content,
	ContentVariants,
	Icon,
	Flex,
	FlexItem,
} from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import type { VDevDisk } from '@45drives/houston-common-lib';
import { getDiskIDName, truncateName } from '../../utils/helpers';

export interface DiskSelectorProps {
	/** All known disks from ZfsDataContext. */
	allDisks: VDevDisk[];
	/** Disks available for this particular VDev (already filtered). */
	availableDisks: VDevDisk[];
	/** Currently selected disk names for this VDev. */
	selectedDisks: string[];
	/** Callback when the selection changes. */
	onSelectionChange: (selected: string[]) => void;
	/** Disk identifier mode used for display (sd_path, phy_path, vdev_path). */
	diskIdentifier: string;
}

export const DiskSelector: React.FC<DiskSelectorProps> = ({
	allDisks,
	availableDisks,
	selectedDisks,
	onSelectionChange,
	diskIdentifier,
}) => {
	const toggleDisk = (diskName: string) => {
		if (selectedDisks.includes(diskName)) {
			onSelectionChange(selectedDisks.filter((d) => d !== diskName));
		} else {
			onSelectionChange([...selectedDisks, diskName]);
		}
	};

	if (availableDisks.length === 0) {
		return (
			<Content component={ContentVariants.p}>No disks available</Content>
		);
	}

	return (
		<DataList aria-label="Select disks" isCompact>
			{availableDisks.map((disk) => {
				const isSelected = selectedDisks.includes(disk.name!);
				const hasPartitions = !!(disk as any).hasPartitions;
				const hasErrors =
					Array.isArray((disk as any).errors) && (disk as any).errors.length > 0;
				const displayName = getDiskIDName(allDisks, diskIdentifier, disk.name!);

				return (
					<DataListItem
						key={disk.name}
						aria-labelledby={`disk-${disk.name}`}
						isExpanded={false}
					>
						<DataListItemRow>
							<DataListCheck
								aria-labelledby={`disk-${disk.name}`}
								name={`disk-${disk.name}`}
								isChecked={isSelected}
								onChange={() => toggleDisk(disk.name!)}
							/>
							<DataListItemCells
								dataListCells={[
									<DataListCell key="name" width={2}>
										<Flex
											spaceItems={{ default: 'spaceItemsSm' }}
											alignItems={{ default: 'alignItemsCenter' }}
										>
											<FlexItem>
												<Content
													component={ContentVariants.p}
													id={`disk-${disk.name}`}
												>
													<strong>
														{truncateName(displayName || disk.name!, 24)}
													</strong>
												</Content>
											</FlexItem>
											{hasPartitions && (
												<FlexItem>
													<Icon status="warning">
														<ExclamationCircleIcon />
													</Icon>
												</FlexItem>
											)}
											{hasErrors && (
												<FlexItem>
													<Icon status="danger">
														<ExclamationTriangleIcon />
													</Icon>
												</FlexItem>
											)}
										</Flex>
									</DataListCell>,
									<DataListCell key="type" width={1}>
										<Content component={ContentVariants.p}>
											{(disk as any).type ?? 'Unknown'}
										</Content>
									</DataListCell>,
									<DataListCell key="capacity" width={1}>
										<Content component={ContentVariants.p}>
											{(disk as any).capacity ?? 'N/A'}
										</Content>
									</DataListCell>,
									<DataListCell key="model" width={2}>
										<Content component={ContentVariants.p}>
											{(disk as any).model ?? ''}
										</Content>
									</DataListCell>,
								]}
							/>
						</DataListItemRow>
					</DataListItem>
				);
			})}
		</DataList>
	);
};

export default DiskSelector;
