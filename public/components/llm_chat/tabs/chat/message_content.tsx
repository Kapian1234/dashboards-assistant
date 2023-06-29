/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiMarkdownFormat,
  EuiText,
  EuiToolTip,
  getDefaultOuiMarkdownParsingPlugins,
} from '@elastic/eui';
import moment from 'moment';
import React, { useContext, useEffect, useState } from 'react';
import { DashboardContainerInput } from '../../../../../../../src/plugins/dashboard/public';
import { toMountPoint } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { IMessage } from '../../../../../common/types/observability_saved_object_attributes';
import { uiSettingsService } from '../../../../../common/utils';
import { ChatContext, CoreServicesContext } from '../../chat_header_button';
import { FeedbackModal } from '../../components/feedback_modal';
import { PPLVisualization } from '../../components/ppl_visualization';
import { LangchainTracesFlyoutBody } from './langchain_traces_flyout_body';

interface MessageContentProps {
  message: IMessage;
  previousInput?: IMessage;
}

export const MessageContent: React.FC<MessageContentProps> = React.memo((props) => {
  const coreServicesContext = useContext(CoreServicesContext)!;
  const chatContext = useContext(ChatContext)!;
  const [visInput, setVisInput] = useState<DashboardContainerInput>();

  useEffect(() => {
    if (props.message.contentType === 'visualization') {
      setVisInput(JSON.parse(props.message.content));
    }
  }, [props.message]);

  let content: React.ReactNode;

  switch (props.message.contentType) {
    case 'text':
      content = <EuiText style={{ whiteSpace: 'pre-line' }}>{props.message.content}</EuiText>;
      break;

    case 'error':
      content = (
        <EuiText color="danger" style={{ whiteSpace: 'pre-line' }}>
          {props.message.content}
        </EuiText>
      );
      break;

    case 'markdown':
      // TODO remove after https://github.com/opensearch-project/oui/pull/801
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsingPlugins = getDefaultOuiMarkdownParsingPlugins() as Array<[any, any]>; // Array<unified.PluginTuple<any[], unified.Settings>>
      const emojiPlugin = parsingPlugins.find(([, settings]) => settings.emoticon)?.at(1);
      if (emojiPlugin) emojiPlugin.emoticon = false;
      content = (
        <EuiMarkdownFormat parsingPluginList={parsingPlugins}>
          {props.message.content}
        </EuiMarkdownFormat>
      );
      break;

    case 'visualization':
      const dateFormat = uiSettingsService.get('dateFormat');
      let from = moment(visInput?.timeRange?.from).format(dateFormat);
      let to = moment(visInput?.timeRange?.to).format(dateFormat);
      from = from === 'Invalid date' ? visInput?.timeRange.from : from;
      to = to === 'Invalid date' ? visInput?.timeRange.to : to;
      content = (
        <>
          <EuiText size="s">{`${from} - ${to}`}</EuiText>
          <div className="llm-chat-visualizations">
            <coreServicesContext.DashboardContainerByValueRenderer
              input={JSON.parse(props.message.content)}
              onInputUpdated={setVisInput}
            />
          </div>
        </>
      );
      break;

    case 'ppl_visualization':
      content = (
        <div className="llm-chat-visualizations">
          <PPLVisualization query={props.message.content} />
        </div>
      );
      break;

    default:
      return null;
  }

  const footers: React.ReactNode[] = [];
  if (props.message.type === 'output') {
    const sessionId = props.message.sessionId;
    if (sessionId !== undefined) {
      footers.push(
        <EuiLink
          onClick={() => {
            chatContext.setFlyoutComponent(
              <LangchainTracesFlyoutBody
                closeFlyout={() => chatContext.setFlyoutComponent(null)}
                sessionId={sessionId}
              />
            );
          }}
        >
          <EuiText size="s">
            How was this generated? <EuiIcon type="iInCircle" />
          </EuiText>
        </EuiLink>
      );
    }

    footers.push(
      <EuiToolTip content="Feedback">
        <EuiButtonIcon
          aria-label="feedback-icon"
          iconType="faceHappy"
          onClick={() => {
            const modal = coreServicesContext.core.overlays.openModal(
              toMountPoint(
                <FeedbackModal
                  input={props.previousInput?.content}
                  output={props.message.content}
                  metadata={{
                    type: 'chat',
                    chatId: chatContext.chatId,
                    sessionId,
                    error: props.message.contentType === 'error',
                  }}
                  onClose={() => modal.close()}
                />
              )
            );
          }}
        />
      </EuiToolTip>
    );
  }

  return (
    <>
      {content}
      {!!footers.length && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
            {footers.map((footer, i) => (
              <EuiFlexItem key={i} grow={false}>
                {footer}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
});
