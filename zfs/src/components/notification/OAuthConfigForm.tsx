import React, { useCallback, useState } from 'react';
import {
  Form,
  FormGroup,
  Button,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import type { AuthEmailConfig } from '../../types';
import { RecipientList } from './RecipientList';

const cockpit: any = (globalThis as any).cockpit;

interface OAuthConfigFormProps {
  config: AuthEmailConfig;
  onChange: (updated: AuthEmailConfig) => void;
  recipients: string[];
  onRecipientsChange: (recipients: string[]) => void;
  authDetailsExist: boolean;
  onAuthDetailsExistChange: (exists: boolean) => void;
}

export const OAuthConfigForm: React.FC<OAuthConfigFormProps> = ({
  config,
  onChange,
  recipients,
  onRecipientsChange,
  authDetailsExist,
  onAuthDetailsExistChange,
}) => {
  const [authenticating, setAuthenticating] = useState(false);

  const handleOAuth = useCallback(async () => {
    setAuthenticating(true);
    try {
      const providerAuthUrl = 'https://email-auth.45d.io/auth/gmail';
      const authWindow = window.open(providerAuthUrl, '_blank', 'width=500,height=900');

      if (!authWindow) {
        throw new Error('Failed to open Gmail authentication window. Please check your popup settings.');
      }

      const handleAuthMessage = async (event: MessageEvent) => {
        try {
          if (event.origin !== 'https://email-auth.45d.io') return;

          const {
            accessToken: tokenValue,
            refreshToken: refreshValue,
            expiry,
            userEmail: emailFromOAuth,
          } = event.data;

          if (tokenValue && refreshValue && emailFromOAuth) {
            const updated: AuthEmailConfig = {
              ...config,
              email: emailFromOAuth,
              oauthRefreshToken: refreshValue,
              oauthAccessToken: tokenValue,
              tokenExpiry: expiry ?? '',
              authMethod: 'oauth2',
              recieversEmail: [...recipients],
            };

            onChange(updated);
            onAuthDetailsExistChange(true);

            // Persist via D-Bus
            try {
              const dbus = cockpit.dbus('org._45drives.Houston');
              await dbus.call(
                '/org/_45drives/Houston',
                'org._45drives.Houston',
                'UpdateSMTPConfig',
                [JSON.stringify(updated)],
              );
            } catch (dbusErr) {
              console.error('Error saving OAuth config via D-Bus:', dbusErr);
            }

            window.removeEventListener('message', handleAuthMessage);
          } else {
            throw new Error('Gmail authentication failed. Missing token or email.');
          }
        } catch (error) {
          console.error('Error during Gmail authentication:', error);
        }
      };

      window.addEventListener('message', handleAuthMessage);
    } catch (error) {
      console.error('Error initializing Gmail OAuth:', error);
    } finally {
      setAuthenticating(false);
    }
  }, [config, onChange, onAuthDetailsExistChange, recipients]);

  return (
    <Form>
      <FormGroup fieldId="oauth-connect">
        <Content component="p">
          OAuth setup requires authentication via your email provider.
        </Content>

        <Flex
          justifyContent={{ default: 'justifyContentCenter' }}
          spaceItems={{ default: 'spaceItemsMd' }}
          direction={{ default: 'column' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          {authDetailsExist && config.email ? (
            <>
              <FlexItem>
                <Button variant="primary" isDisabled>
                  Connected as {config.email}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="danger"
                  onClick={handleOAuth}
                  isLoading={authenticating}
                  isDisabled={authenticating}
                >
                  Reconnect with Google with different account
                </Button>
              </FlexItem>
            </>
          ) : (
            <FlexItem>
              <Button
                variant="danger"
                onClick={handleOAuth}
                isLoading={authenticating}
                isDisabled={authenticating}
              >
                Connect with Google
              </Button>
            </FlexItem>
          )}

          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <a
                  href="https://email-auth.45d.io/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </FlexItem>
              <FlexItem>
                <a
                  href="https://email-auth.45d.io/tos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </FormGroup>

      <FormGroup label="Receivers Email" fieldId="oauth-receivers">
        <RecipientList recipients={recipients} onChange={onRecipientsChange} />
      </FormGroup>
    </Form>
  );
};

export default OAuthConfigForm;
