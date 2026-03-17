import React, { useState, useCallback } from 'react';
import {
  LabelGroup,
  Label,
  TextInput,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';

interface RecipientListProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RecipientList: React.FC<RecipientListProps> = ({
  recipients,
  onChange,
}) => {
  const [inputValue, setInputValue] = useState('');

  const addRecipient = useCallback(() => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setInputValue('');
      return;
    }
    if (!recipients.includes(trimmed)) {
      onChange([...recipients, trimmed]);
    }
    setInputValue('');
  }, [inputValue, onChange, recipients]);

  const removeRecipient = useCallback(
    (email: string) => {
      onChange(recipients.filter((r) => r !== email));
    },
    [onChange, recipients],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (['Enter', 'Tab', ' ', ','].includes(event.key)) {
        event.preventDefault();
        addRecipient();
      }
    },
    [addRecipient],
  );

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      {recipients.length > 0 && (
        <FlexItem>
          <LabelGroup categoryName="Recipients" numLabels={10}>
            {recipients.map((email) => (
              <Label key={email} onClose={() => removeRecipient(email)}>
                {email}
              </Label>
            ))}
          </LabelGroup>
        </FlexItem>
      )}
      <FlexItem>
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <TextInput
              type="email"
              aria-label="Add recipient email"
              placeholder="Enter email and press Enter"
              value={inputValue}
              onChange={(_event, val) => setInputValue(val)}
              onKeyDown={handleKeyDown}
              onBlur={addRecipient}
            />
          </FlexItem>
          <FlexItem>
            <Button variant="secondary" onClick={addRecipient}>
              Add
            </Button>
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );
};

export default RecipientList;
