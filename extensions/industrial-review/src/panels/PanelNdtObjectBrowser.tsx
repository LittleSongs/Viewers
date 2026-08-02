import React, { useCallback } from 'react';
import { useSystem } from '@ohif/core';
import { PanelSection, ScrollArea } from '@ohif/ui-next';
import useNdtObjectTree from '../hooks/useNdtObjectTree';
import useNdtViewerContext from '../hooks/useNdtViewerContext';
import type { NdtDicomObject, NdtPositionNode, NdtWorkpieceNode } from '../types';
import {
  getNdtObjectAvailability,
  navigateToNdtObject,
  ROLE_LABELS,
} from '../utils/ndtObjectTree';

function ObjectRow({
  object,
  displaySets,
  currentSopInstanceUid,
  onSelect,
}: {
  object: NdtDicomObject;
  displaySets: any[];
  currentSopInstanceUid?: string;
  onSelect: (object: NdtDicomObject) => void;
}) {
  const availability = getNdtObjectAvailability(object, displaySets);
  return (
    <button
      type="button"
      disabled={!availability.enabled}
      title={availability.enabled ? undefined : availability.reason}
      onClick={() => onSelect(object)}
      className={[
        'border-border mb-1 flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs',
        object.sopInstanceUid === currentSopInstanceUid
          ? 'border-primary bg-primary/15 text-primary'
          : 'bg-background text-foreground hover:bg-accent/50',
        availability.enabled ? '' : 'cursor-not-allowed opacity-45',
      ].join(' ')}
    >
      <span className="bg-muted text-muted-foreground min-w-20 rounded px-1.5 py-0.5 text-[10px]">
        {ROLE_LABELS[object.objectType]}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {object.objectName || object.sopInstanceUid || `对象 ${object.id}`}
      </span>
    </button>
  );
}

function PositionGroup({
  position,
  ...props
}: {
  position: NdtPositionNode;
  displaySets: any[];
  currentSopInstanceUid?: string;
  onSelect: (object: NdtDicomObject) => void;
}) {
  return (
    <PanelSection defaultOpen={true}>
      <PanelSection.Header className="bg-popover px-2">
        <div className="text-xs font-semibold">
          {position.positionCode} · {position.positionName}
        </div>
      </PanelSection.Header>
      <PanelSection.Content className="px-2 py-2">
        {position.objects.length ? (
          position.objects.map(object => (
            <ObjectRow
              key={String(object.id)}
              object={object}
              {...props}
            />
          ))
        ) : (
          <div className="text-muted-foreground text-xs">该部位暂无对象</div>
        )}
      </PanelSection.Content>
    </PanelSection>
  );
}

function WorkpieceGroup({
  workpiece,
  ...props
}: {
  workpiece: NdtWorkpieceNode;
  displaySets: any[];
  currentSopInstanceUid?: string;
  onSelect: (object: NdtDicomObject) => void;
}) {
  return (
    <div className="mb-3">
      <div className="bg-muted text-foreground flex items-center justify-between px-2 py-2 text-xs font-semibold">
        <span>{workpiece.workpieceName}</span>
        <span className="text-muted-foreground text-[10px]">{workpiece.status}</span>
      </div>
      {workpiece.positions.map(position => (
        <PositionGroup
          key={String(position.id)}
          position={position}
          {...props}
        />
      ))}
    </div>
  );
}

export default function PanelNdtObjectBrowser() {
  const { servicesManager, commandsManager } = useSystem();
  const {
    displaySetService,
    viewportGridService,
    cornerstoneViewportService,
    uiNotificationService,
  } = servicesManager.services as AppTypes.Services;
  const { runtimeConfig, currentImage } = useNdtViewerContext();
  const { tree, isLoading, error } = useNdtObjectTree(runtimeConfig, displaySetService);
  const displaySets = displaySetService.getActiveDisplaySets?.() || [];

  const onSelect = useCallback(
    async (object: NdtDicomObject) => {
      const result = await navigateToNdtObject({
        object,
        displaySets: displaySetService.getActiveDisplaySets?.() || [],
        viewportId: viewportGridService.getActiveViewportId?.(),
        viewportGridService,
        cornerstoneViewportService,
        commandsManager,
      });
      if (!result.ok) {
        uiNotificationService?.show?.({
          title: '无法打开对象',
          message: result.reason,
          type: 'warning',
        });
      }
    },
    [
      commandsManager,
      cornerstoneViewportService,
      displaySetService,
      uiNotificationService,
      viewportGridService,
    ]
  );

  if (!runtimeConfig.taskId || !runtimeConfig.studyId) {
    return <div className="text-muted-foreground p-3 text-xs">URL 中缺少 taskId 或 studyId。</div>;
  }

  return (
    <ScrollArea className="h-full w-full">
      {isLoading ? <div className="text-muted-foreground p-3 text-xs">正在加载对象树…</div> : null}
      {error ? <div className="text-destructive p-3 text-xs">{error}</div> : null}
      {!isLoading && !error && !tree.workpieces.length ? (
        <div className="text-muted-foreground p-3 text-xs">当前任务暂无工件或DICOM对象。</div>
      ) : null}
      {tree.workpieces.map(workpiece => (
        <WorkpieceGroup
          key={String(workpiece.id)}
          workpiece={workpiece}
          displaySets={displaySets}
          currentSopInstanceUid={currentImage.srSopInstanceUID || currentImage.sopInstanceUID}
          onSelect={onSelect}
        />
      ))}
    </ScrollArea>
  );
}
