import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ModalVariant,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tabs,
  Tab,
  TabTitleText,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextInput,
  Button,
  Alert,
  Checkbox,
  Flex,
  FlexItem,
  Content,
} from '@patternfly/react-core';
import type { SmtpEmailConfig, AuthEmailConfig, WarningConfig } from '../../types';
import { SmtpConfigForm } from './SmtpConfigForm';
import { OAuthConfigForm } from './OAuthConfigForm';
import { RecipientList } from './RecipientList';

const cockpit: any = (globalThis as any).cockpit;

interface EmailSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SMTP: SmtpEmailConfig = {
  email: '',
  smtpServer: '',
  smtpPort: 587,
  username: '',
  password: '',
  recieversEmail: [],
  tls: true,
  authMethod: 'smtp',
  oauthAccessToken: '',
  tokenExpiry: '',
};

const DEFAULT_AUTH: AuthEmailConfig = {
  email: '',
  recieversEmail: [],
  authMethod: 'oauth2',
  oauthAccessToken: '',
  tokenExpiry: '',
  oauthRefreshToken: '',
};

const DEFAULT_WARNING: WarningConfig = {
  scrubFinish: 'info',
  clearPoolErrors: 'info',
  snapshotCreation: 'info',
  snapshotFailure: 'warning',
  stateChange: 'critical',
  poolImport: 'info',
  storageThreshold: 'warning',
  replicationTaskSuccess: 'info',
  replicationTaskFailure: 'warning',
};

const WARNING_EVENTS: Record<keyof WarningConfig, string> = {
  scrubFinish: 'Scrub Finish',
  clearPoolErrors: 'Clear Pool Errors',
  snapshotCreation: 'Snapshot Creation',
  snapshotFailure: 'Snapshot Failure',
  stateChange: 'State Change - Degraded/Faulted',
  poolImport: 'Pool Import',
  storageThreshold: 'Storage Threshold',
  replicationTaskSuccess: 'Replication Success',
  replicationTaskFailure: 'Replication Failure',
};

export const EmailSetupModal: React.FC<EmailSetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'email-settings' | 'warning-levels'>('email-settings');
  const [smtpMethod, setSmtpMethod] = useState<'smtp' | 'oauth2'>('oauth2');
  const [smtpConfig, setSmtpConfig] = useState<SmtpEmailConfig>({ ...DEFAULT_SMTP });
  const [authConfig, setAuthConfig] = useState<AuthEmailConfig>({ ...DEFAULT_AUTH });
  const [warningConfig, setWarningConfig] = useState<WarningConfig>({ ...DEFAULT_WARNING });
  const [recipients, setRecipients] = useState<string[]>([]);
  const [authDetailsExist, setAuthDetailsExist] = useState(false);
  const [sendInfo, setSendInfo] = useState(false);
  const [sendWarning, setSendWarning] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [savingSMTP, setSavingSMTP] = useState(false);
  const [savingWarningLevels, setSavingWarningLevels] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isEmailValid = useMemo(() => {
    const senderEmail = smtpMethod === 'smtp' ? smtpConfig.email : authConfig.email;
    return (
      emailRegex.test(senderEmail) &&
      recipients.length > 0 &&
      recipients.every((e) => emailRegex.test(e))
    );
  }, [smtpMethod, smtpConfig.email, authConfig.email, recipients]);

  const emailValidationError = useMemo(() => {
    const senderEmail = smtpMethod === 'smtp' ? smtpConfig.email : authConfig.email;
    if (!emailRegex.test(senderEmail)) return 'Please enter a valid sender email.';
    if (recipients.length === 0) return 'Please enter at least one recipient email address.';
    const invalid = recipients.filter((e) => !emailRegex.test(e));
    if (invalid.length > 0) return `Invalid recipient email(s): ${invalid.join(', ')}`;
    return '';
  }, [smtpMethod, smtpConfig.email, authConfig.email, recipients]);

  const isFormValid = useCallback((): boolean => {
    setValidationAttempted(true);

    const receiversValid =
      recipients.length > 0 && recipients.every((e) => emailRegex.test(e));

    if (smtpMethod === 'smtp') {
      return (
        smtpConfig.email.trim() !== '' &&
        emailRegex.test(smtpConfig.email) &&
        receiversValid &&
        smtpConfig.smtpServer.trim() !== '' &&
        smtpConfig.smtpPort > 0 &&
        smtpConfig.username.trim() !== '' &&
        smtpConfig.password.trim() !== ''
      );
    }

    return (
      authConfig.email.trim() !== '' &&
      emailRegex.test(authConfig.email) &&
      receiversValid
    );
  }, [smtpMethod, smtpConfig, authConfig, recipients]);

  // Fetch SMTP details on mount
  useEffect(() => {
    (async () => {
      try {
        const dbus = cockpit.dbus('org._45drives.Houston');
        const response = await dbus.call(
          '/org/_45drives/Houston',
          'org._45drives.Houston',
          'FetchMsmtpDetails',
          [],
        );

        const data = JSON.parse(response);
        if (data.error) {
          console.error('Error fetching SMTP details:', data.error);
          return;
        }

        if (data.authMethod === 'on') {
          setSmtpMethod('smtp');
          setSmtpConfig({
            email: data.email ?? '',
            smtpServer: data.smtpServer ?? '',
            smtpPort: data.smtpPort ?? 587,
            username: data.username ?? '',
            password: data.password ?? '',
            recieversEmail: [],
            tls: data.tls ?? true,
            authMethod: data.auth ?? 'smtp',
            oauthAccessToken: '',
            tokenExpiry: '',
          });
        } else {
          setSmtpMethod('oauth2');
          setAuthConfig({
            email: data.email ?? '',
            recieversEmail: [],
            authMethod: data.auth || 'oauth2',
            oauthAccessToken: '',
            tokenExpiry: '',
            oauthRefreshToken: data.oauthRefreshToken ?? '',
          });
          if (data.email) setAuthDetailsExist(true);
        }

        // Parse recipients
        const parsed = Array.isArray(data.recieversEmail)
          ? data.recieversEmail
          : typeof data.recieversEmail === 'string' && data.recieversEmail.trim() !== ''
          ? data.recieversEmail.split(',').map((e: string) => e.trim()).filter(Boolean)
          : [];
        setRecipients(parsed);

        setSendInfo(data.sendInfo !== 0);
        setSendWarning(data.sendWarning !== 0);
      } catch (error) {
        console.error('Error fetching SMTP details:', error);
      }
    })();
  }, []);

  // Fetch warning levels on mount
  useEffect(() => {
    (async () => {
      try {
        const dbus = cockpit.dbus('org._45drives.Houston');
        const response = await dbus.call(
          '/org/_45drives/Houston',
          'org._45drives.Houston',
          'fetchWarningLevels',
          [],
        );

        const data = JSON.parse(response);
        setWarningConfig({
          scrubFinish: data.scrubFinish || 'info',
          clearPoolErrors: data.clearPoolErrors || 'info',
          snapshotCreation: data.snapshotCreation || 'info',
          snapshotFailure: data.snapshotFailure || 'warning',
          stateChange: data.stateChange || 'critical',
          storageThreshold: data.storageThreshold || 'warning',
          poolImport: data.poolImport || 'info',
          replicationTaskSuccess: data.replicationTaskSuccess || 'info',
          replicationTaskFailure: data.replicationTaskFailure || 'warning',
        });
      } catch (error) {
        console.error('Error fetching warning levels:', error);
      }
    })();
  }, []);

  const updateWarningField = useCallback((key: keyof WarningConfig, value: string) => {
    setWarningConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveWarningConfig = useCallback(async () => {
    setSavingWarningLevels(true);
    setErrorMessage('');
    try {
      const dbus = cockpit.dbus('org._45drives.Houston');
      await dbus.call(
        '/org/_45drives/Houston',
        'org._45drives.Houston',
        'UpdateWarningLevels',
        [JSON.stringify(warningConfig)],
      );
      onClose();
    } catch (error: any) {
      console.error('Error updating warning levels:', error);
      setErrorMessage('Failed to update warning levels: ' + (error.message || error));
    } finally {
      setSavingWarningLevels(false);
    }
  }, [onClose, warningConfig]);

  const updateSMTPConfig = useCallback(async () => {
    if (!isFormValid() || !isEmailValid) {
      if (!isEmailValid) {
        setErrorMessage(emailValidationError || 'Email validation failed.');
      } else {
        setErrorMessage('Please fill in all fields.');
      }
      return;
    }

    setSavingSMTP(true);
    setErrorMessage('');
    try {
      const dbus = cockpit.dbus('org._45drives.Houston');

      let payload: Record<string, any>;
      if (smtpMethod === 'smtp') {
        payload = {
          email: smtpConfig.email,
          smtpServer: smtpConfig.smtpServer,
          smtpPort: smtpConfig.smtpPort,
          username: smtpConfig.username,
          password: smtpConfig.password,
          recieversEmail: recipients.join(','),
          tls: smtpConfig.tls,
          sendInfo: sendInfo,
          sendWarning: sendWarning,
          sendCritical: true,
          authMethod: 'smtp',
        };
      } else {
        payload = {
          email: authConfig.email,
          sendInfo: sendInfo,
          sendWarning: sendWarning,
          recieversEmail: recipients.join(','),
          sendCritical: true,
          authMethod: 'oauth2',
          oauthAccessToken: authConfig.oauthAccessToken,
          oauthRefreshToken: authConfig.oauthRefreshToken,
        };
      }

      await dbus.call(
        '/org/_45drives/Houston',
        'org._45drives.Houston',
        'UpdateSMTPConfig',
        [JSON.stringify(payload)],
      );
      onClose();
    } catch (error: any) {
      console.error('Error updating SMTP settings:', error);
      setErrorMessage('Failed to update SMTP settings: ' + (error.message || error));
    } finally {
      setSavingSMTP(false);
    }
  }, [
    authConfig,
    isEmailValid,
    isFormValid,
    emailValidationError,
    onClose,
    recipients,
    sendInfo,
    sendWarning,
    smtpConfig,
    smtpMethod,
  ]);

  const testEmail = useCallback(async () => {
    if (!isEmailValid) {
      setErrorMessage(emailValidationError || 'Email validation failed.');
      return;
    }
    if (!isFormValid()) {
      setErrorMessage(
        smtpMethod === 'smtp'
          ? 'Please fill in all required SMTP fields before sending a test email.'
          : 'Please sign in with your Gmail account before sending a test email.',
      );
      return;
    }

    setSendingTestEmail(true);
    setErrorMessage('');
    try {
      const dbus = cockpit.dbus('org._45drives.Houston');

      let config: Record<string, any>;
      if (smtpMethod === 'smtp') {
        config = {
          email: smtpConfig.email,
          smtpServer: smtpConfig.smtpServer,
          smtpPort: smtpConfig.smtpPort,
          username: smtpConfig.username,
          password: smtpConfig.password,
          tls: smtpConfig.tls,
          recieversEmail: recipients.join(','),
          authMethod: 'plain',
        };
      } else {
        config = {
          email: authConfig.email,
          oauthAccessToken: authConfig.oauthAccessToken,
          tokenExpiry: authConfig.tokenExpiry,
          oauthRefreshToken: authConfig.oauthRefreshToken,
          authMethod: 'oauth2',
          recieversEmail: recipients.join(','),
        };
      }

      const response = await dbus.call(
        '/org/_45drives/Houston',
        'org._45drives.Houston',
        'SendTestEmail',
        [JSON.stringify(config)],
      );

      const parsed = JSON.parse(response);
      if (parsed.success) {
        setErrorMessage('');
      } else {
        setErrorMessage(parsed.message ?? 'Test email failed.');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      setErrorMessage('Failed to send test email: ' + (error.message || error));
    } finally {
      setSendingTestEmail(false);
    }
  }, [authConfig, isEmailValid, isFormValid, emailValidationError, recipients, smtpConfig, smtpMethod]);

  const resetMsmtpData = useCallback(async () => {
    try {
      const dbus = cockpit.dbus('org._45drives.Houston');
      await dbus.call(
        '/org/_45drives/Houston',
        'org._45drives.Houston',
        'resetMsmtpData',
      );

      if (smtpMethod === 'smtp') {
        setSmtpConfig({ ...DEFAULT_SMTP });
      } else {
        setAuthConfig({ ...DEFAULT_AUTH });
        setAuthDetailsExist(false);
      }
      setRecipients([]);
    } catch (error) {
      console.error('Error resetting SMTP data:', error);
    }
  }, [smtpMethod]);

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Email Notification Settings"
    >
      <ModalHeader title="Email Notification Settings" />
      <ModalBody>
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, key) => setActiveTab(key as 'email-settings' | 'warning-levels')}
        >
          <Tab eventKey="email-settings" title={<TabTitleText>Email Settings</TabTitleText>}>
            <Form style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
              <FormGroup label="Select Email Provider" fieldId="email-provider">
                <FormSelect
                  id="email-provider"
                  value={smtpMethod}
                  onChange={(_event, val) => setSmtpMethod(val as 'smtp' | 'oauth2')}
                >
                  <FormSelectOption value="smtp" label="SMTP" />
                  <FormSelectOption value="oauth2" label="Google (OAuth)" />
                </FormSelect>
              </FormGroup>
            </Form>

            {smtpMethod === 'smtp' ? (
              <SmtpConfigForm
                config={smtpConfig}
                onChange={setSmtpConfig}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                validationAttempted={validationAttempted}
              />
            ) : (
              <OAuthConfigForm
                config={authConfig}
                onChange={setAuthConfig}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                authDetailsExist={authDetailsExist}
                onAuthDetailsExistChange={setAuthDetailsExist}
              />
            )}

            <Form style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
              <FormGroup label="Alert Levels" fieldId="alert-levels">
                <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem>
                    <Checkbox
                      id="send-info"
                      label="Info"
                      isChecked={sendInfo}
                      onChange={(_event, checked) => setSendInfo(checked)}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Checkbox
                      id="send-warning"
                      label="Warning"
                      isChecked={sendWarning}
                      onChange={(_event, checked) => setSendWarning(checked)}
                    />
                  </FlexItem>
                  <FlexItem>
                    <Checkbox
                      id="send-critical"
                      label="Critical"
                      isChecked
                      isDisabled
                    />
                  </FlexItem>
                </Flex>
              </FormGroup>
            </Form>

            {errorMessage && (
              <Alert variant="danger" isInline title={errorMessage} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }} />
            )}

            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              style={{ marginTop: 'var(--pf-t--global--spacer--xl)', paddingTop: 'var(--pf-t--global--spacer--md)' }}
            >
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    variant="secondary"
                    onClick={testEmail}
                    isLoading={sendingTestEmail}
                    isDisabled={sendingTestEmail}
                  >
                    {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    onClick={resetMsmtpData}
                    isDisabled={!authConfig.email && !smtpConfig.email}
                  >
                    Reset Data
                  </Button>
                </FlexItem>
              </Flex>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="primary"
                    onClick={updateSMTPConfig}
                    isLoading={savingSMTP}
                    isDisabled={savingSMTP}
                  >
                    {savingSMTP ? 'Saving...' : 'Save'}
                  </Button>
                </FlexItem>
              </Flex>
            </Flex>
          </Tab>

          <Tab eventKey="warning-levels" title={<TabTitleText>Alert Levels</TabTitleText>}>
            <Content component="h2" style={{ paddingTop: 'var(--pf-t--global--spacer--md)', paddingBottom: 'var(--pf-t--global--spacer--sm)' }}>
              Set Warning Levels
            </Content>

            <Form>
              {(Object.entries(WARNING_EVENTS) as [keyof WarningConfig, string][]).map(
                ([key, label]) => {
                  if (key === 'stateChange') return null;
                  return (
                    <FormGroup key={key} label={label} fieldId={`warning-${key}`}>
                      <FormSelect
                        id={`warning-${key}`}
                        value={warningConfig[key]}
                        onChange={(_event, val) => updateWarningField(key, val)}
                      >
                        <FormSelectOption value="info" label="Info" />
                        <FormSelectOption value="warning" label="Warning" />
                        <FormSelectOption value="critical" label="Critical" />
                      </FormSelect>
                    </FormGroup>
                  );
                },
              )}

              <FormGroup
                label="State Change - Degraded/Faulted"
                fieldId="warning-stateChange"
              >
                <TextInput
                  id="warning-stateChange"
                  value="Critical"
                  isDisabled
                />
              </FormGroup>
            </Form>

            {errorMessage && (
              <Alert variant="danger" isInline title={errorMessage} style={{ marginTop: 'var(--pf-t--global--spacer--md)' }} />
            )}

            <Flex
              justifyContent={{ default: 'justifyContentFlexEnd' }}
              spaceItems={{ default: 'spaceItemsSm' }}
              style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}
            >
              <FlexItem>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  onClick={saveWarningConfig}
                  isLoading={savingWarningLevels}
                  isDisabled={savingWarningLevels}
                >
                  {savingWarningLevels ? 'Saving...' : 'Save'}
                </Button>
              </FlexItem>
            </Flex>
          </Tab>
        </Tabs>
      </ModalBody>
    </Modal>
  );
};

export default EmailSetupModal;
