/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiLoadingContent } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { SignalsUtilityBar } from './signals_utility_bar';
import { StatefulEventsViewer } from '../../../../components/events_viewer';
import * as i18n from './translations';
import {
  getSignalsActions,
  requiredFieldsForActions,
  signalsClosedFilters,
  signalsDefaultModel,
  signalsOpenFilters,
} from './default_config';
import { timelineActions, timelineSelectors } from '../../../../store/timeline';
import { timelineDefaults, TimelineModel } from '../../../../store/timeline/model';
import {
  FILTER_CLOSED,
  FILTER_OPEN,
  SignalFilterOption,
  SignalsTableFilterGroup,
} from './signals_filter_group';
import { useKibana } from '../../../../lib/kibana';
import { defaultHeaders } from '../../../../components/timeline/body/column_headers/default_headers';
import { ColumnHeader } from '../../../../components/timeline/body/column_headers/column_header';
import { esFilters, esQuery } from '../../../../../../../../../src/plugins/data/common/es_query';
import { TimelineNonEcsData } from '../../../../graphql/types';
import { inputsSelectors, SerializedFilterQuery, State } from '../../../../store';
import { sendSignalsToTimelineAction, updateSignalStatusAction } from './actions';
import {
  CreateTimelineProps,
  SendSignalsToTimeline,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateSignalsStatus,
  UpdateSignalsStatusProps,
} from './types';
import { inputsActions } from '../../../../store/inputs';
import { combineQueries } from '../../../../components/timeline/helpers';
import { useFetchIndexPatterns } from '../../../../containers/detection_engine/rules/fetch_index_patterns';
import { InputsRange } from '../../../../store/inputs/model';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';

import { HeaderSection } from '../../../../components/header_section';

const SIGNALS_PAGE_TIMELINE_ID = 'signals-page';

interface ReduxProps {
  globalQuery: Query;
  globalFilters: esFilters.Filter[];
  deletedEventIds: string[];
  isSelectAllChecked: boolean;
  loadingEventIds: string[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
}

interface DispatchProps {
  createTimeline: ActionCreator<{
    dateRange?: {
      start: number;
      end: number;
    };
    filters?: esFilters.Filter[];
    id: string;
    kqlQuery?: {
      filterQuery: SerializedFilterQuery | null;
    };
    columns: ColumnHeader[];
    show?: boolean;
  }>;
  clearEventsDeleted?: ActionCreator<{ id: string }>;
  clearEventsLoading?: ActionCreator<{ id: string }>;
  clearSelected?: ActionCreator<{ id: string }>;
  removeTimelineLinkTo: ActionCreator<{}>;
  setEventsDeleted?: ActionCreator<{
    id: string;
    eventIds: string[];
    isDeleted: boolean;
  }>;
  setEventsLoading?: ActionCreator<{
    id: string;
    eventIds: string[];
    isLoading: boolean;
  }>;
}

interface OwnProps {
  canUserCRUD: boolean;
  defaultFilters?: esFilters.Filter[];
  hasIndexWrite: boolean;
  from: number;
  loading: boolean;
  signalsIndex: string;
  to: number;
}

type SignalsTableComponentProps = OwnProps & ReduxProps & DispatchProps;

export const SignalsTableComponent = React.memo<SignalsTableComponentProps>(
  ({
    canUserCRUD,
    createTimeline,
    clearEventsDeleted,
    clearEventsLoading,
    clearSelected,
    defaultFilters = [],
    from,
    globalFilters,
    globalQuery,
    hasIndexWrite,
    isSelectAllChecked,
    loading,
    loadingEventIds,
    removeTimelineLinkTo,
    selectedEventIds,
    setEventsDeleted,
    setEventsLoading,
    signalsIndex,
    to,
  }) => {
    const [selectAll, setSelectAll] = useState(false);

    const [showClearSelectionAction, setShowClearSelectionAction] = useState(false);
    const [filterGroup, setFilterGroup] = useState<SignalFilterOption>(FILTER_OPEN);
    const [{ browserFields, indexPatterns }] = useFetchIndexPatterns([signalsIndex]);
    const kibana = useKibana();

    const getGlobalQuery = useCallback(() => {
      if (browserFields != null && indexPatterns != null) {
        return combineQueries({
          config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dataProviders: [],
          indexPattern: indexPatterns,
          browserFields,
          filters: globalFilters,
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
          start: from,
          end: to,
          isEventViewer: true,
        });
      }
      return null;
    }, [browserFields, globalFilters, globalQuery, indexPatterns, to, from]);

    // Callback for creating a new timeline -- utilized by row/batch actions
    const createTimelineCallback = useCallback(
      ({ id, kqlQuery, filters, dateRange }: CreateTimelineProps) => {
        removeTimelineLinkTo({});
        createTimeline({ id, columns: defaultHeaders, show: true, filters, dateRange, kqlQuery });
      },
      [createTimeline, removeTimelineLinkTo]
    );

    const setEventsLoadingCallback = useCallback(
      ({ eventIds, isLoading }: SetEventsLoadingProps) => {
        setEventsLoading!({ id: SIGNALS_PAGE_TIMELINE_ID, eventIds, isLoading });
      },
      [setEventsLoading, SIGNALS_PAGE_TIMELINE_ID]
    );

    const setEventsDeletedCallback = useCallback(
      ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
        setEventsDeleted!({ id: SIGNALS_PAGE_TIMELINE_ID, eventIds, isDeleted });
      },
      [setEventsDeleted, SIGNALS_PAGE_TIMELINE_ID]
    );

    // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
    useEffect(() => {
      if (!isSelectAllChecked) {
        setShowClearSelectionAction(false);
      } else {
        setSelectAll(false);
      }
    }, [isSelectAllChecked]);

    // Callback for when open/closed filter changes
    const onFilterGroupChangedCallback = useCallback(
      (newFilterGroup: SignalFilterOption) => {
        clearEventsLoading!({ id: SIGNALS_PAGE_TIMELINE_ID });
        clearEventsDeleted!({ id: SIGNALS_PAGE_TIMELINE_ID });
        clearSelected!({ id: SIGNALS_PAGE_TIMELINE_ID });
        setFilterGroup(newFilterGroup);
      },
      [setFilterGroup]
    );

    // Callback for clearing entire selection from utility bar
    const clearSelectionCallback = useCallback(() => {
      clearSelected!({ id: SIGNALS_PAGE_TIMELINE_ID });
      setSelectAll(false);
      setShowClearSelectionAction(false);
    }, [clearSelected, setShowClearSelectionAction]);

    // Callback for selecting all events on all pages from utility bar
    // Dispatches to stateful_body's selectAll via TimelineTypeContext props
    // as scope of response data required to actually set selectedEvents
    const selectAllCallback = useCallback(() => {
      setSelectAll(true);
      setShowClearSelectionAction(true);
    }, [setShowClearSelectionAction]);

    const updateSignalsStatusCallback: UpdateSignalsStatus = useCallback(
      async ({ signalIds, status }: UpdateSignalsStatusProps) => {
        await updateSignalStatusAction({
          query: showClearSelectionAction ? getGlobalQuery()?.filterQuery : undefined,
          signalIds: Object.keys(selectedEventIds),
          status,
          setEventsDeleted: setEventsDeletedCallback,
          setEventsLoading: setEventsLoadingCallback,
        });
      },
      [
        getGlobalQuery,
        selectedEventIds,
        setEventsDeletedCallback,
        setEventsLoadingCallback,
        showClearSelectionAction,
      ]
    );
    const sendSignalsToTimelineCallback: SendSignalsToTimeline = useCallback(async () => {
      await sendSignalsToTimelineAction({
        createTimeline: createTimelineCallback,
        data: Object.values(selectedEventIds),
      });
    }, [selectedEventIds, setEventsDeletedCallback, setEventsLoadingCallback]);

    // Callback for creating the SignalUtilityBar which receives totalCount from EventsViewer component
    const utilityBarCallback = useCallback(
      (totalCount: number) => {
        return (
          <SignalsUtilityBar
            canUserCRUD={canUserCRUD}
            areEventsLoading={loadingEventIds.length > 0}
            clearSelection={clearSelectionCallback}
            hasIndexWrite={hasIndexWrite}
            isFilteredToOpen={filterGroup === FILTER_OPEN}
            selectAll={selectAllCallback}
            selectedEventIds={selectedEventIds}
            sendSignalsToTimeline={sendSignalsToTimelineCallback}
            showClearSelection={showClearSelectionAction}
            totalCount={totalCount}
            updateSignalsStatus={updateSignalsStatusCallback}
          />
        );
      },
      [
        canUserCRUD,
        hasIndexWrite,
        clearSelectionCallback,
        filterGroup,
        loadingEventIds.length,
        selectAllCallback,
        selectedEventIds,
        showClearSelectionAction,
      ]
    );

    // Send to Timeline / Update Signal Status Actions for each table row
    const additionalActions = useMemo(
      () =>
        getSignalsActions({
          canUserCRUD,
          hasIndexWrite,
          createTimeline: createTimelineCallback,
          setEventsLoading: setEventsLoadingCallback,
          setEventsDeleted: setEventsDeletedCallback,
          status: filterGroup === FILTER_OPEN ? FILTER_CLOSED : FILTER_OPEN,
        }),
      [canUserCRUD, createTimelineCallback, filterGroup]
    );

    const defaultIndices = useMemo(() => [signalsIndex], [signalsIndex]);
    const defaultFiltersMemo = useMemo(
      () => [
        ...defaultFilters,
        ...(filterGroup === FILTER_OPEN ? signalsOpenFilters : signalsClosedFilters),
      ],
      [defaultFilters, filterGroup]
    );

    const timelineTypeContext = useMemo(
      () => ({
        documentType: i18n.SIGNALS_DOCUMENT_TYPE,
        footerText: i18n.TOTAL_COUNT_OF_SIGNALS,
        loadingText: i18n.LOADING_SIGNALS,
        queryFields: requiredFieldsForActions,
        timelineActions: additionalActions,
        title: i18n.SIGNALS_TABLE_TITLE,
        selectAll: canUserCRUD ? selectAll : false,
      }),
      [additionalActions, canUserCRUD, selectAll]
    );

    if (loading || isEmpty(signalsIndex)) {
      return (
        <EuiPanel>
          <HeaderSection title={i18n.SIGNALS_TABLE_TITLE} />
          <EuiLoadingContent />
        </EuiPanel>
      );
    }

    return (
      <StatefulEventsViewer
        defaultIndices={defaultIndices}
        pageFilters={defaultFiltersMemo}
        defaultModel={signalsDefaultModel}
        end={to}
        headerFilterGroup={
          <SignalsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />
        }
        id={SIGNALS_PAGE_TIMELINE_ID}
        start={from}
        timelineTypeContext={timelineTypeContext}
        utilityBar={utilityBarCallback}
      />
    );
  }
);

SignalsTableComponent.displayName = 'SignalsTableComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State) => {
    const timeline: TimelineModel =
      getTimeline(state, SIGNALS_PAGE_TIMELINE_ID) ?? timelineDefaults;
    const { deletedEventIds, isSelectAllChecked, loadingEventIds, selectedEventIds } = timeline;

    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      globalQuery: query,
      globalFilters: filters,
      deletedEventIds,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

export const SignalsTable = connect(makeMapStateToProps, {
  removeTimelineLinkTo: inputsActions.removeTimelineLinkTo,
  clearSelected: timelineActions.clearSelected,
  setEventsLoading: timelineActions.setEventsLoading,
  clearEventsLoading: timelineActions.clearEventsLoading,
  setEventsDeleted: timelineActions.setEventsDeleted,
  clearEventsDeleted: timelineActions.clearEventsDeleted,
  createTimeline: timelineActions.createTimeline,
})(SignalsTableComponent);
