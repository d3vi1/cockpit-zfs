import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Flex,
  FlexItem,
  Icon,
  Content,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import type { VDevDisk } from '@45drives/houston-common-lib';
import type { DiskStats } from '../../types';

interface DiskCardProps {
  disk: VDevDisk;
  /** Optional disk stats with error counts (from poolDiskStats). */
  stats?: DiskStats;
}

export const DiskCard: React.FC<DiskCardProps> = ({ disk, stats }) => {
  return (
    <Card isCompact>
      <CardHeader>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          style={{ width: '100%' }}
        >
          <FlexItem>
            <Content component="h4" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {disk.name}
            </Content>
          </FlexItem>
          <FlexItem>
            <Icon status="success">
              <CheckCircleIcon />
            </Icon>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <DescriptionList isHorizontal isCompact>
          {disk.type && (
            <DescriptionListGroup>
              <DescriptionListTerm>Type</DescriptionListTerm>
              <DescriptionListDescription>{disk.type}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          <DescriptionListGroup>
            <DescriptionListTerm>Health</DescriptionListTerm>
            <DescriptionListDescription>{disk.health ?? 'N/A'}</DescriptionListDescription>
          </DescriptionListGroup>
          {disk.temp && (
            <DescriptionListGroup>
              <DescriptionListTerm>Temperature</DescriptionListTerm>
              <DescriptionListDescription>{disk.temp}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {disk.serial && (
            <DescriptionListGroup>
              <DescriptionListTerm>Serial</DescriptionListTerm>
              <DescriptionListDescription>{disk.serial}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {disk.model && (
            <DescriptionListGroup>
              <DescriptionListTerm>Model</DescriptionListTerm>
              <DescriptionListDescription>{disk.model}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {disk.path && (
            <DescriptionListGroup>
              <DescriptionListTerm>Path</DescriptionListTerm>
              <DescriptionListDescription>{disk.path}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {stats && (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Read Errors</DescriptionListTerm>
                <DescriptionListDescription>
                  {stats.stats.read_errors}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Write Errors</DescriptionListTerm>
                <DescriptionListDescription>
                  {stats.stats.write_errors}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Checksum Errors</DescriptionListTerm>
                <DescriptionListDescription>
                  {stats.stats.checksum_errors}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          )}
        </DescriptionList>
      </CardBody>
      <CardFooter>
        <Content component="p">
          <strong>Total: {disk.capacity ?? 'N/A'}</strong>
        </Content>
      </CardFooter>
    </Card>
  );
};

export default DiskCard;
