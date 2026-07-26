import React, { useCallback } from 'react';
import { useSystem } from '@ohif/core';
import { PanelSection, ScrollArea } from '@ohif/ui-next';
import useNdtObjectTree from '../hooks/useNdtObjectTree';
import useNdtViewerContext from '../hooks/useNdtViewerContext';
import type { NdtObjectTreeItem, NdtObjectTreePart } from '../types';
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
  object: NdtObjectTreeItem;
  displaySets: any[];
  currentSopInstanceUid?: string;
  onSelect: (object: NdtObjectTreeItem) => void;
}) {
  const availability = getNdtObjectAvailability(object, displaySets);
  const isCurrent = object.sopInstanceUid === currentSopInstanceUid;
  const reason = availability.enabled ? undefined : availability.reason;
  return (
    <button
      type="button"
      disabled={!availability.enabled}
      title={reason}
      onClick={() => onSelect(object)}
      className={[
        'border-border mb-1 flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs',
        isCurrent
          ? 'border-primary bg-primary/15 text-primary'
          : 'bg-background text-foreground hover:bg-accent/50',
        availability.enabled ? '' : 'cursor-not-allowed opacity-45',
      ].join(' ')}
    >
      <span className="bg-muted text-muted-foreground min-w-16 rounded px-1.5 py-0.5 text-[10px]">
        {ROLE_LABELS[object.objectType]}
      </span>
      <span className="min-w-0 flex-1 truncate">{object.label}</span>
      {object.instanceNumber !== undefined ? (
        <span className="text-muted-foreground">#{object.instanceNumber}</span>
      ) : null}
    </button>
  );
}

function PartGroup({
  part,
  ...props
}: {
  part: NdtObjectTreePart;
  displaySets: any[];
  currentSopInstanceUid?: string;
  onSelect: (object: NdtObjectTreeItem) => void;
}) {
  return (
    <PanelSection defaultOpen={true}>
      <PanelSection.Header className="bg-popover px-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{part.partNo || '检测部位'}</div>
          {part.partName && part.partName !== part.partNo ? (
            <div className="text-muted-foreground truncate text-[10px]">{part.partName}</div>
          ) : null}
        </div>
      </PanelSection.Header>
      <PanelSection.Content className="px-2 py-2">
        {part.objects.map(object => (
          <ObjectRow
            key={`${part.id}-${object.id}-${object.sopInstanceUid}`}
            object={object}
            {...props}
          />
        ))}
      </PanelSection.Content>
    </PanelSection>
  );
}

export default function PanelNdtObjectBrowser() {
  const { servicesManager, commandsManager } = useSystem();
  const {
    displaySetService,
    viewportGridService,
    cornerstoneViewportService,
    uiNotificationService,
  } =
    servicesManager.services as AppTypes.Services;
  const { runtimeConfig, currentImage } = useNdtViewerContext();
  const { tree, isLoading, error } = useNdtObjectTree(runtimeConfig, displaySetService);
  const displaySets = displaySetService.getActiveDisplaySets?.() || [];

  const onSelect = useCallback(
    async (object: NdtObjectTreeItem) => {
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

  if (!runtimeConfig.taskId) {
    return <div className="text-muted-foreground p-3 text-xs">URL 中缺少 taskId，无法加载对象树。</div>;
  }

  return (
    <ScrollArea className="h-full w-full">
      {isLoading ? <div className="text-muted-foreground p-3 text-xs">正在加载检测部位…</div> : null}
      {error ? <div className="text-destructive p-3 text-xs">{error}</div> : null}
      {!isLoading && !error && !tree.parts.length && !tree.unassignedObjects.length ? (
        <div className="text-muted-foreground p-3 text-xs">当前任务暂无可显示的 DICOM 对象。</div>
      ) : null}
      {tree.parts.map(part => (
        <PartGroup
          key={String(part.id || part.partNo)}
          part={part}
          displaySets={displaySets}
          currentSopInstanceUid={currentImage.srSopInstanceUID || currentImage.sopInstanceUID}
          onSelect={onSelect}
        />
      ))}
      {tree.unassignedObjects.length ? (
        <PanelSection defaultOpen={true}>
          <PanelSection.Header className="bg-popover px-2">未关联对象</PanelSection.Header>
          <PanelSection.Content className="px-2 py-2">
            {tree.unassignedObjects.map(object => (
              <ObjectRow
                key={`unassigned-${object.id}-${object.sopInstanceUid}`}
                object={object}
                displaySets={displaySets}
                currentSopInstanceUid={currentImage.srSopInstanceUID || currentImage.sopInstanceUID}
                onSelect={onSelect}
              />
            ))}
          </PanelSection.Content>
        </PanelSection>
      ) : null}
    </ScrollArea>
  );
}
