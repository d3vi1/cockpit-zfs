import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  ModalVariant,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  Switch,
  Alert,
  Gallery,
  GalleryItem,
  Card,
  CardBody,
  Flex,
  FlexItem,
  Icon,
  Content,
  Checkbox,
} from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import type { VDevDisk } from '@45drives/houston-common-lib';
import { useZfsData } from '../../contexts/ZfsDataContext';
import { attachDisk } from '../../hooks/useDiskOperations';
import { convertSizeToBytes } from '../../utils/formatters';
import { getDiskIDName, truncateName } from '../../utils/helpers';

type DiskIdentifier = 'sd_path' | 'phy_path' | 'vdev_path';

interface AttachDiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolName: string;
  vdevName: string;
  vdevDisks: VDevDisk[];
}

export const AttachDiskModal: React.FC<AttachDiskModalProps> = ({
  isOpen,
  onClose,
  poolName,
  vdevName,
  vdevDisks,
}) => {
  const { disks, importablePools, refreshAll } = useZfsData();

  const [diskIdentifier, setDiskIdentifier] = useState<DiskIdentifier>('vdev_path');
  const [selectedDisk, setSelectedDisk] = useState('');
  const [forceAttach, setForceAttach] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [sizeFeedback, setSizeFeedback] = useState('');
  const [belongsFeedback, setBelongsFeedback] = useState('');

  const availableDisks = useMemo<VDevDisk[]>(
    () => disks.filter((d) => d.guid === ''),
    [disks],
  );

  const toggleDiskSelection = useCallback(
    (diskName: string) => {
      setSelectedDisk((prev) => (prev === diskName ? '' : diskName));
      setSizeFeedback('');
      setBelongsFeedback('');
    },
    [],
  );

  const diskSizeMatch = useCallback((): boolean => {
    setSizeFeedback('');

    if (!selectedDisk) {
      setSizeFeedback('At least one disk is required.');
      return false;
    }

    const newDiskData = disks.find((d) => d.name === selectedDisk);
    if (!newDiskData) return false;

    const newCapacity = convertSizeToBytes(newDiskData.capacity ?? '0');

    for (const oldDisk of vdevDisks) {
      const currentCapacity = convertSizeToBytes(oldDisk.capacity ?? '0');
      if (newCapacity < currentCapacity) {
        setSizeFeedback(
          'Cannot Attach. Please select a disk that has capacity greater than or equal to current disks.',
        );
        return false;
      }
    }

    return true;
  }, [disks, selectedDisk, vdevDisks]);

  const diskBelongsToImportablePool = useCallback((): boolean => {
    setBelongsFeedback('');

    if (forceAttach) return false;

    const selectedNewDisk = disks.find((d) => d.name === selectedDisk);
    if (!selectedNewDisk) return false;

    for (const pool of importablePools) {
      for (const vdev of pool.vdevs) {
        for (const disk of vdev.disks) {
          if (selectedNewDisk.name === disk.name) {
            setBelongsFeedback(
              `This disk was used in exported pool '${pool.name}'. Use Force Add to override and use disk in new Vdev.`,
            );
            return true;
          }
        }
      }
    }

    return false;
  }, [disks, forceAttach, importablePools, selectedDisk]);

  const resolveDiskNames = useCallback((): {
    existingDiskName: string;
    newDiskName: string;
  } => {
    const PHY_PREFIX = '/dev/disk/by-path/';
    const SD_PREFIX = '/dev/';

    const oldDisk = vdevDisks[vdevDisks.length - 1];
    const newDisk = disks.find((d) => d.name === selectedDisk);

    let existingDiskName = oldDisk?.name ?? '';
    let newDiskName = selectedDisk;

    if (newDisk && oldDisk) {
      switch (diskIdentifier) {
        case 'vdev_path':
          newDiskName = selectedDisk;
          existingDiskName = oldDisk.name ?? '';
          break;
        case 'phy_path':
          newDiskName = (newDisk.phy_path ?? '').replace(PHY_PREFIX, '');
          existingDiskName = (oldDisk.path ?? '').replace(PHY_PREFIX, '');
          break;
        case 'sd_path':
          newDiskName = (newDisk.sd_path ?? '').replace(SD_PREFIX, '');
          existingDiskName = (oldDisk.path ?? '').replace(SD_PREFIX, '');
          break;
      }
    }

    return { existingDiskName, newDiskName };
  }, [diskIdentifier, disks, selectedDisk, vdevDisks]);

  const handleAttach = useCallback(async () => {
    if (!diskSizeMatch()) return;
    if (diskBelongsToImportablePool() && !forceAttach) return;

    const { existingDiskName, newDiskName } = resolveDiskNames();

    setAttaching(true);
    try {
      const output: any = await attachDisk({
        poolName,
        existingDiskName,
        newDiskName,
        forceAttach,
      });

      if (output == null || output.error) {
        const errorMessage = output?.error || 'Unknown error';
        setSizeFeedback(`Error attaching disk: ${errorMessage}`);
      } else {
        await refreshAll();
        onClose();
      }
    } catch (error) {
      console.error('Attach disk error:', error);
    } finally {
      setAttaching(false);
    }
  }, [
    diskBelongsToImportablePool,
    diskSizeMatch,
    forceAttach,
    onClose,
    poolName,
    refreshAll,
    resolveDiskNames,
  ]);

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Attach Disk"
    >
      <ModalHeader title="Attach Disk" />
      <ModalBody>
        <Form>
          <FormGroup label="Disk Identifier" fieldId="attach-disk-identifier">
            <FormSelect
              id="attach-disk-identifier"
              value={diskIdentifier}
              onChange={(_event, val) => setDiskIdentifier(val as DiskIdentifier)}
            >
              <FormSelectOption value="sd_path" label="Block Device" />
              <FormSelectOption value="phy_path" label="Hardware Path" />
              <FormSelectOption value="vdev_path" label="Device Alias" />
            </FormSelect>
          </FormGroup>

          <FormGroup label="Select Disk" fieldId="attach-available-disks">
            {availableDisks.length === 0 ? (
              <Content component="p">No Disks Available</Content>
            ) : (
              <Gallery hasGutter minWidths={{ default: '160px' }}>
                {availableDisks.map((disk, idx) => {
                  const isSelected = selectedDisk === disk.name;
                  const displayName = truncateName(
                    getDiskIDName(disks, diskIdentifier, disk.name ?? ''),
                    8,
                  );

                  return (
                    <GalleryItem key={disk.name ?? idx}>
                      <Card
                        isSelectable
                        isSelected={isSelected}
                        onClick={() => toggleDiskSelection(disk.name ?? '')}
                        isCompact
                      >
                        <CardBody>
                          <Flex
                            justifyContent={{ default: 'justifyContentSpaceBetween' }}
                            alignItems={{ default: 'alignItemsCenter' }}
                          >
                            <FlexItem>
                              <Checkbox
                                id={`attach-disk-${idx}`}
                                isChecked={isSelected}
                                onChange={() => toggleDiskSelection(disk.name ?? '')}
                                label=""
                              />
                            </FlexItem>
                            <FlexItem>
                              {disk.hasPartitions && (
                                <Icon status="warning">
                                  <ExclamationCircleIcon title="Disk already has partitions. Proceed with caution." />
                                </Icon>
                              )}
                              {disk.errors && disk.errors.length > 0 && (
                                <Icon status="danger">
                                  <ExclamationTriangleIcon title="This disk belongs to an exported pool. Force Add to override." />
                                </Icon>
                              )}
                            </FlexItem>
                          </Flex>
                          <Content component="h3">{displayName}</Content>
                          <Content component="small">{disk.type}</Content>
                          <br />
                          <Content component="small">Capacity: {disk.capacity}</Content>
                        </CardBody>
                      </Card>
                    </GalleryItem>
                  );
                })}
              </Gallery>
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Flex direction={{ default: 'column' }} style={{ width: '100%' }}>
          {sizeFeedback && (
            <FlexItem>
              <Alert variant="danger" isInline isPlain title={sizeFeedback} />
            </FlexItem>
          )}
          {belongsFeedback && (
            <FlexItem>
              <Alert variant="danger" isInline isPlain title={belongsFeedback} />
            </FlexItem>
          )}
          <FlexItem>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem>
                  <Button variant="danger" onClick={onClose}>
                    Close
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Switch
                    id="attach-force-switch"
                    label="Forcefully Attach Disk"
                    isChecked={forceAttach}
                    onChange={(_event, checked) => setForceAttach(checked)}
                  />
                </FlexItem>
              </Flex>
              <FlexItem>
                <Button
                  variant="primary"
                  onClick={handleAttach}
                  isLoading={attaching}
                  isDisabled={attaching}
                >
                  {attaching ? 'Attaching...' : 'Attach Disk'}
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

export default AttachDiskModal;
