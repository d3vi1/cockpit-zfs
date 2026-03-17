/**
 * ReviewStep -- Final wizard step: summary of all configuration before creation.
 *
 * Shows a PF DescriptionList with the pool config, VDev details, and
 * (optionally) the file system config.  Displays creation progress with
 * a spinner when the pool is being created.
 *
 * PF React only -- zero CSS classes, zero Tailwind.
 */

import React from 'react';
import {
	DescriptionList,
	DescriptionListGroup,
	DescriptionListTerm,
	DescriptionListDescription,
	ExpandableSection,
	Card,
	CardBody,
	CardTitle,
	Spinner,
	Alert,
	Content,
	ContentVariants,
	Flex,
	FlexItem,
	Icon,
} from '@patternfly/react-core';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import type { VDevDisk } from '@45drives/houston-common-lib';
import type { PoolConfig } from './PoolConfigStep';
import type { FileSystemConfig } from './FileSystemStep';
import {
	upperCaseWord,
	getValue,
	getDiskIDName,
	getFullDiskInfo,
	checkInheritance,
	isBoolOnOff,
} from '../../utils/helpers';
import { convertBytesToSize, convertSizeToBytes } from '../../utils/formatters';

// ── Progress status ─────────────────────────────
export type CreationStatus =
	| 'idle'
	| 'creating-pool'
	| 'pool-created'
	| 'creating-filesystem'
	| 'filesystem-created'
	| 'error';

interface ReviewStepProps {
	poolConfig: PoolConfig;
	fsConfig: FileSystemConfig;
	allDisks: VDevDisk[];
	creationStatus: CreationStatus;
	errorMessage?: string;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
	poolConfig,
	fsConfig,
	allDisks,
	creationStatus,
	errorMessage,
}) => {
	const [advancedOpen, setAdvancedOpen] = React.useState(false);
	const [vdevsOpen, setVdevsOpen] = React.useState(false);
	const [fsSettingsOpen, setFsSettingsOpen] = React.useState(false);

	const isCreating = creationStatus !== 'idle' && creationStatus !== 'error';

	// Build a pool-options-like object for checkInheritance
	const poolOptionsForInheritance = {
		compression: poolConfig.compression,
		dedup: poolConfig.dedup,
		recordsize: Number(poolConfig.recordsize),
	};

	// ── Progress overlay ─────────────────────────
	if (isCreating) {
		return (
			<Flex
				direction={{ default: 'column' }}
				alignItems={{ default: 'alignItemsCenter' }}
				spaceItems={{ default: 'spaceItemsLg' }}
			>
				{/* Pool status */}
				{creationStatus === 'creating-pool' && (
					<FlexItem>
						<Flex
							alignItems={{ default: 'alignItemsCenter' }}
							spaceItems={{ default: 'spaceItemsSm' }}
						>
							<FlexItem>
								<Content component={ContentVariants.h3}>Creating Pool...</Content>
							</FlexItem>
							<FlexItem>
								<Spinner size="lg" />
							</FlexItem>
						</Flex>
					</FlexItem>
				)}
				{(creationStatus === 'pool-created' ||
					creationStatus === 'creating-filesystem' ||
					creationStatus === 'filesystem-created') && (
					<FlexItem>
						<Flex
							alignItems={{ default: 'alignItemsCenter' }}
							spaceItems={{ default: 'spaceItemsSm' }}
						>
							<FlexItem>
								<Content component={ContentVariants.h3}>Pool Created!</Content>
							</FlexItem>
							<FlexItem>
								<Icon status="success">
									<CheckCircleIcon />
								</Icon>
							</FlexItem>
						</Flex>
					</FlexItem>
				)}

				{/* File system status */}
				{fsConfig.createFileSystem && (
					<>
						{creationStatus === 'creating-pool' && (
							<FlexItem>
								<Flex
									alignItems={{ default: 'alignItemsCenter' }}
									spaceItems={{ default: 'spaceItemsSm' }}
								>
									<FlexItem>
										<Content component={ContentVariants.h3}>
											Waiting for Pool...
										</Content>
									</FlexItem>
									<FlexItem>
										<Spinner size="lg" />
									</FlexItem>
								</Flex>
							</FlexItem>
						)}
						{creationStatus === 'creating-filesystem' && (
							<FlexItem>
								<Flex
									alignItems={{ default: 'alignItemsCenter' }}
									spaceItems={{ default: 'spaceItemsSm' }}
								>
									<FlexItem>
										<Content component={ContentVariants.h3}>
											Creating File System...
										</Content>
									</FlexItem>
									<FlexItem>
										<Spinner size="lg" />
									</FlexItem>
								</Flex>
							</FlexItem>
						)}
						{creationStatus === 'filesystem-created' && (
							<FlexItem>
								<Flex
									alignItems={{ default: 'alignItemsCenter' }}
									spaceItems={{ default: 'spaceItemsSm' }}
								>
									<FlexItem>
										<Content component={ContentVariants.h3}>
											File System Created!
										</Content>
									</FlexItem>
									<FlexItem>
										<Icon status="success">
											<CheckCircleIcon />
										</Icon>
									</FlexItem>
								</Flex>
							</FlexItem>
						)}
					</>
				)}
			</Flex>
		);
	}

	// ── Review summary ───────────────────────────
	return (
		<>
			<Content component={ContentVariants.h2}>Review Configuration</Content>

			{errorMessage && (
				<Alert variant="danger" isInline title="Error">
					{errorMessage}
				</Alert>
			)}

			{/* Pool configuration */}
			<Card isCompact>
				<CardTitle>Pool: {poolConfig.name}</CardTitle>
				<CardBody>
					<DescriptionList isHorizontal isCompact>
						<DescriptionListGroup>
							<DescriptionListTerm>Compression</DescriptionListTerm>
							<DescriptionListDescription>
								{poolConfig.compression.toUpperCase()}
							</DescriptionListDescription>
						</DescriptionListGroup>
						<DescriptionListGroup>
							<DescriptionListTerm>Sector Size</DescriptionListTerm>
							<DescriptionListDescription>
								{getValue('sector', poolConfig.sectorsize) ?? 'None'}
							</DescriptionListDescription>
						</DescriptionListGroup>
						<DescriptionListGroup>
							<DescriptionListTerm>Record Size</DescriptionListTerm>
							<DescriptionListDescription>
								{getValue('record', poolConfig.recordsize) ?? convertBytesToSize(Number(poolConfig.recordsize))}
							</DescriptionListDescription>
						</DescriptionListGroup>

						{/* Advanced settings (collapsible) */}
						<DescriptionListGroup>
							<DescriptionListTerm>
								<ExpandableSection
									toggleText={advancedOpen ? 'Hide Advanced' : 'Advanced Settings'}
									isExpanded={advancedOpen}
									onToggle={(_e, expanded) => setAdvancedOpen(expanded)}
									isIndented
								>
									<DescriptionList isHorizontal isCompact>
										<DescriptionListGroup>
											<DescriptionListTerm>Refreservation</DescriptionListTerm>
											<DescriptionListDescription>
												{poolConfig.refreservationPercent}%
											</DescriptionListDescription>
										</DescriptionListGroup>
										<DescriptionListGroup>
											<DescriptionListTerm>Deduplication</DescriptionListTerm>
											<DescriptionListDescription>
												{upperCaseWord(poolConfig.dedup)}
											</DescriptionListDescription>
										</DescriptionListGroup>
										<DescriptionListGroup>
											<DescriptionListTerm>Auto-Expand</DescriptionListTerm>
											<DescriptionListDescription>
												{upperCaseWord(poolConfig.autoexpand)}
											</DescriptionListDescription>
										</DescriptionListGroup>
										<DescriptionListGroup>
											<DescriptionListTerm>Auto-Replace</DescriptionListTerm>
											<DescriptionListDescription>
												{upperCaseWord(poolConfig.autoreplace)}
											</DescriptionListDescription>
										</DescriptionListGroup>
										<DescriptionListGroup>
											<DescriptionListTerm>Auto-TRIM</DescriptionListTerm>
											<DescriptionListDescription>
												{upperCaseWord(poolConfig.autotrim)}
											</DescriptionListDescription>
										</DescriptionListGroup>
									</DescriptionList>
								</ExpandableSection>
							</DescriptionListTerm>
							<DescriptionListDescription>{" "}</DescriptionListDescription>
						</DescriptionListGroup>
					</DescriptionList>

					{/* VDevs (collapsible) */}
					<ExpandableSection
						toggleText={
							vdevsOpen
								? 'Hide Virtual Devices'
								: `Virtual Devices (${poolConfig.vdevs.length})`
						}
						isExpanded={vdevsOpen}
						onToggle={(_e, expanded) => setVdevsOpen(expanded)}
					>
						{poolConfig.vdevs.map((vdev, idx) => (
							<Card key={idx} isCompact isPlain>
								<CardTitle>
									VDev {idx + 1} &mdash; {upperCaseWord(vdev.type)}
									{vdev.isMirror ? ' (Mirror)' : ''}
								</CardTitle>
								<CardBody>
									<DescriptionList isHorizontal isCompact>
										<DescriptionListGroup>
											<DescriptionListTerm>Disks</DescriptionListTerm>
											<DescriptionListDescription>
												{vdev.selectedDisks.length === 0
													? 'None'
													: vdev.selectedDisks.map((diskName) => {
															const display =
																getDiskIDName(
																	allDisks,
																	vdev.diskIdentifier,
																	diskName,
																) || diskName;
															const info = getFullDiskInfo(allDisks, diskName);
															const capacity = (info as any)?.capacity ?? '';
															return (
																<Content
																	key={diskName}
																	component={ContentVariants.p}
																>
																	<strong>{display}</strong>
																	{capacity ? ` (${capacity})` : ''}
																</Content>
															);
													  })}
											</DescriptionListDescription>
										</DescriptionListGroup>
									</DescriptionList>
								</CardBody>
							</Card>
						))}
					</ExpandableSection>
				</CardBody>
			</Card>

			{/* File system configuration */}
			{fsConfig.createFileSystem && (
				<Card isCompact>
					<CardTitle>File System: {fsConfig.name}</CardTitle>
					<CardBody>
						<DescriptionList isHorizontal isCompact>
							<DescriptionListGroup>
								<DescriptionListTerm>Quota</DescriptionListTerm>
								<DescriptionListDescription>
									{fsConfig.quotaRaw === 0
										? 'None'
										: convertBytesToSize(
												convertSizeToBytes(
													`${fsConfig.quotaRaw}${fsConfig.quotaUnit}`,
												),
										  )}
								</DescriptionListDescription>
							</DescriptionListGroup>
							<DescriptionListGroup>
								<DescriptionListTerm>Read Only</DescriptionListTerm>
								<DescriptionListDescription>
									{upperCaseWord(isBoolOnOff(fsConfig.isReadOnly))}
								</DescriptionListDescription>
							</DescriptionListGroup>
							{fsConfig.encryption.enabled && (
								<DescriptionListGroup>
									<DescriptionListTerm>Encryption</DescriptionListTerm>
									<DescriptionListDescription>
										{fsConfig.encryption.cipher.toUpperCase()}
									</DescriptionListDescription>
								</DescriptionListGroup>
							)}

							{/* FS Settings (collapsible) */}
							<DescriptionListGroup>
								<DescriptionListTerm>
									<ExpandableSection
										toggleText={
											fsSettingsOpen
												? 'Hide Settings'
												: `Settings${fsConfig.inherit ? ' (Inherited)' : ''}`
										}
										isExpanded={fsSettingsOpen}
										onToggle={(_e, expanded) => setFsSettingsOpen(expanded)}
										isIndented
									>
										{fsConfig.inherit ? (
											<DescriptionList isHorizontal isCompact>
												<DescriptionListGroup>
													<DescriptionListTerm>Compression</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited ({poolConfig.compression.toUpperCase()})
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Deduplication</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited ({upperCaseWord(poolConfig.dedup)})
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Record Size</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited (
														{getValue('record', poolConfig.recordsize) ??
															convertBytesToSize(Number(poolConfig.recordsize))}
														)
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Access Time</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited (On)
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Case Sensitivity</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited (Sensitive)
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>DNode Size</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited (Legacy)
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Extended Attributes</DescriptionListTerm>
													<DescriptionListDescription>
														Inherited (System Attribute)
													</DescriptionListDescription>
												</DescriptionListGroup>
											</DescriptionList>
										) : (
											<DescriptionList isHorizontal isCompact>
												<DescriptionListGroup>
													<DescriptionListTerm>Compression</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'compression',
															fsConfig.compression,
															poolOptionsForInheritance as any,
														) ?? upperCaseWord(fsConfig.compression)}
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Deduplication</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'dedup',
															fsConfig.deduplication,
															poolOptionsForInheritance as any,
														) ?? upperCaseWord(fsConfig.deduplication)}
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Record Size</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'record',
															fsConfig.recordSize,
															poolOptionsForInheritance as any,
														) ?? fsConfig.recordSize}
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Access Time</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'atime',
															fsConfig.accessTime,
															poolOptionsForInheritance as any,
														) ?? upperCaseWord(fsConfig.accessTime)}
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Case Sensitivity</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'case',
															fsConfig.caseSensitivity,
															poolOptionsForInheritance as any,
														) ?? upperCaseWord(fsConfig.caseSensitivity)}
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>DNode Size</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'dnode',
															fsConfig.dNodeSize,
															poolOptionsForInheritance as any,
														) ?? fsConfig.dNodeSize}
													</DescriptionListDescription>
												</DescriptionListGroup>
												<DescriptionListGroup>
													<DescriptionListTerm>Extended Attributes</DescriptionListTerm>
													<DescriptionListDescription>
														{checkInheritance(
															'xattr',
															fsConfig.extendedAttributes,
															poolOptionsForInheritance as any,
														) ?? upperCaseWord(fsConfig.extendedAttributes)}
													</DescriptionListDescription>
												</DescriptionListGroup>
											</DescriptionList>
										)}
									</ExpandableSection>
								</DescriptionListTerm>
								<DescriptionListDescription>{" "}</DescriptionListDescription>
							</DescriptionListGroup>
						</DescriptionList>
					</CardBody>
				</Card>
			)}
		</>
	);
};

export default ReviewStep;
