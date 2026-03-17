import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Switch,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import type { SmtpEmailConfig } from '../../types';
import { RecipientList } from './RecipientList';

interface SmtpConfigFormProps {
  config: SmtpEmailConfig;
  onChange: (updated: SmtpEmailConfig) => void;
  recipients: string[];
  onRecipientsChange: (recipients: string[]) => void;
  validationAttempted: boolean;
}

export const SmtpConfigForm: React.FC<SmtpConfigFormProps> = ({
  config,
  onChange,
  recipients,
  onRecipientsChange,
  validationAttempted,
}) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailInvalid = validationAttempted && (!config.email || !emailRegex.test(config.email));
  const serverInvalid = validationAttempted && !config.smtpServer;
  const portInvalid = validationAttempted && !config.smtpPort;
  const usernameInvalid = validationAttempted && !config.username;
  const passwordInvalid = validationAttempted && !config.password;

  const update = (field: keyof SmtpEmailConfig, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <Form>
      <FormGroup label="Email Address" isRequired fieldId="smtp-email">
        <TextInput
          id="smtp-email"
          type="email"
          value={config.email}
          onChange={(_event, val) => update('email', val)}
          placeholder="your-email@example.com"
          validated={emailInvalid ? 'error' : 'default'}
        />
        {emailInvalid && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">
                {!config.email ? 'Email Address is required.' : 'Invalid email format.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label="Receivers Email" fieldId="smtp-receivers">
        <RecipientList recipients={recipients} onChange={onRecipientsChange} />
      </FormGroup>

      <FormGroup label="SMTP Server" isRequired fieldId="smtp-server">
        <TextInput
          id="smtp-server"
          type="text"
          value={config.smtpServer}
          onChange={(_event, val) => update('smtpServer', val)}
          placeholder="smtp.example.com"
          validated={serverInvalid ? 'error' : 'default'}
        />
        {serverInvalid && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">SMTP Server is required.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label="SMTP Port" isRequired fieldId="smtp-port">
        <TextInput
          id="smtp-port"
          type="number"
          value={String(config.smtpPort)}
          onChange={(_event, val) => update('smtpPort', parseInt(val, 10) || 0)}
          placeholder="587"
          validated={portInvalid ? 'error' : 'default'}
        />
        {portInvalid && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">SMTP Port is required.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label="Username" isRequired fieldId="smtp-username">
        <TextInput
          id="smtp-username"
          type="text"
          value={config.username}
          onChange={(_event, val) => update('username', val)}
          placeholder="your-email@example.com"
          validated={usernameInvalid ? 'error' : 'default'}
        />
        {usernameInvalid && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">Username is required.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label="Password" isRequired fieldId="smtp-password">
        <TextInput
          id="smtp-password"
          type="password"
          value={config.password}
          onChange={(_event, val) => update('password', val)}
          validated={passwordInvalid ? 'error' : 'default'}
        />
        {passwordInvalid && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">Password is required.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label="Enable TLS" fieldId="smtp-tls">
        <Switch
          id="smtp-tls"
          label={config.tls ? "TLS enabled" : "TLS disabled"}
          isChecked={config.tls}
          onChange={(_event, checked) => update('tls', checked)}
        />
      </FormGroup>
    </Form>
  );
};

export default SmtpConfigForm;
