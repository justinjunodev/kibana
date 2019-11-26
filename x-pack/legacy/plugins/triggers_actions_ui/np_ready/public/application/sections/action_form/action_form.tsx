/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useReducer, useEffect } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFieldText,
  EuiFlyoutBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createAction, updateAction } from '../../lib/api';
import { SectionError, ErrableFormRow } from '../../components/page_error';
import { useAppDependencies } from '../..';
import { actionReducer } from './action_reducer';
import { ActionsContext } from '../../context/actions_context';
import { Action, IErrorObject } from '../../../types';

interface Props {
  initialAction: Action;
  actionTypeName: string;
  setFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ActionForm = ({ initialAction, actionTypeName, setFlyoutVisibility }: Props) => {
  const {
    core: { http },
    plugins: { toastNotifications },
    actionTypeRegistry,
  } = useAppDependencies();

  const { loadActions } = useContext(ActionsContext);

  // hooks
  const [{ action }, dispatch] = useReducer(actionReducer, { action: initialAction });

  const setActionProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setActionConfigProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setConfigProperty' }, payload: { key, value } });
  };

  const setActionSecretsProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setSecretsProperty' }, payload: { key, value } });
  };

  useEffect(() => {
    setServerError(null);
  }, []);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  function validateBaseProperties(actionObject: Action) {
    const validationResult = { errors: {} };
    const errors = {
      description: new Array<string>(),
    };
    validationResult.errors = errors;
    if (!actionObject.description) {
      errors.description.push(
        i18n.translate('xpack.triggersActionsUI.sections.actionAdd.error.requiredNameText', {
          defaultMessage: 'Description is required.',
        })
      );
    }
    return validationResult;
  }

  const actionTypeRegisterd = actionTypeRegistry.get(initialAction.actionTypeId);
  if (actionTypeRegisterd === null) return null;
  const FieldsComponent = actionTypeRegisterd.actionFields;
  const errors = {
    ...actionTypeRegisterd.validate(action).errors,
    ...validateBaseProperties(action).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  async function onActionSave(): Promise<any> {
    try {
      let newAction;
      if (action.id === undefined) {
        newAction = await createAction({ http, action });
        toastNotifications.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.actionAdd.saveSuccessNotificationText', {
            defaultMessage: "Created '{actionName}'",
            values: {
              actionName: newAction.description,
            },
          })
        );
      } else {
        newAction = await updateAction({ http, action, id: action.id });
        toastNotifications.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.actionAdd.saveSuccessNotificationText', {
            defaultMessage: "Updated '{actionName}'",
            values: {
              actionName: newAction.description,
            },
          })
        );
      }

      return newAction;
    } catch (error) {
      return {
        error,
      };
    }
  }

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiForm>
          {serverError && (
            <Fragment>
              <SectionError
                title={
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionAdd.saveActionErrorTitle"
                    defaultMessage="Error saving action"
                  />
                }
                error={serverError}
              />
              <EuiSpacer />
            </Fragment>
          )}
          <ErrableFormRow
            id="actionDescription"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionAdd.actionDescritionLabel"
                defaultMessage="Description"
              />
            }
            errorKey="description"
            isShowingErrors={hasErrors && action.description !== undefined}
            errors={errors}
          >
            <EuiFieldText
              fullWidth
              name="description"
              data-test-subj="descriptionInput"
              value={action.description || ''}
              onChange={e => {
                setActionProperty('description', e.target.value);
              }}
              onBlur={() => {
                if (!action.description) {
                  setActionProperty('description', '');
                }
              }}
            />
          </ErrableFormRow>
          <EuiSpacer size="s" />
          {FieldsComponent !== null ? (
            <FieldsComponent
              action={action}
              errors={errors}
              editActionConfig={setActionConfigProperty}
              editActionSecrets={setActionSecretsProperty}
              hasErrors={hasErrors}
            >
              {initialAction.actionTypeId === null ? (
                <Fragment>
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.actionAdd.actions.actionConfigurationWarningTitleText',
                      {
                        defaultMessage: 'Account may not be configured',
                      }
                    )}
                    color="warning"
                    iconType="help"
                  >
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.actionAdd.actions.actionConfigurationWarningDescriptionText"
                          defaultMessage="To create this action, you must configure at least one {accountType} account. {docLink}"
                          values={{
                            accountType: actionTypeName,
                            docLink: (
                              <EuiLink target="_blank">
                                <FormattedMessage
                                  id="xpack.triggersActionsUI.sections.actionAdd.actions.actionConfigurationWarningHelpLinkText"
                                  defaultMessage="Learn more."
                                />
                              </EuiLink>
                            ),
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiCallOut>
                  <EuiSpacer />
                </Fragment>
              ) : null}
            </FieldsComponent>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setFlyoutVisibility(false)}>
              {i18n.translate('xpack.triggersActionsUI.sections.actionAdd.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveActionButton"
              type="submit"
              iconType="check"
              isDisabled={hasErrors}
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedAction = await onActionSave();
                setIsSaving(false);
                if (savedAction && savedAction.error) {
                  return setServerError(savedAction.error);
                }
                setFlyoutVisibility(false);
                loadActions();
              }}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionAdd.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};