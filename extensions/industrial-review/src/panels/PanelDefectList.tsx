import React from 'react';
import { useSystem } from '@ohif/core';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
  Input,
  PanelSection,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ohif/ui-next';
import useDefectMeasurements from '../hooks/useDefectMeasurements';
import {
  DEFECT_STATUS_OPTIONS,
  DEFECT_TYPE_OPTIONS,
  type DefectListItem,
} from '../types';

function ToolTypeBadge({ toolName }: { toolName: DefectListItem['toolName'] }) {
  const toolNameLabelMap = {
    RectangleROI: '矩形',
    PlanarFreehandROI: '多边形',
    Probe: '点',
  } as const;

  return (
    <span className="bg-accent text-accent-foreground rounded px-2 py-0.5 text-[11px] font-medium">
      {toolNameLabelMap[toolName]}
    </span>
  );
}

function DefectRow({ item }) {
  const { commandsManager } = useSystem();

  const onJump = () => {
    commandsManager.runCommand('jumpToDefect', { uid: item.uid });
  };

  const onDelete = event => {
    event.stopPropagation();
    commandsManager.runCommand('removeDefect', { uid: item.uid });
  };

  const onFieldChange = (field, value) => {
    commandsManager.runCommand('updateDefectMeasurement', {
      uid: item.uid,
      updates: {
        [field]: value,
      },
    });
  };

  return (
    <div
      className={[
        'border-border bg-background hover:bg-accent/40 mb-3 rounded-md border p-3 transition-colors',
        item.isSelected ? 'ring-primary bg-accent/30 ring-1' : '',
      ].join(' ')}
      onClick={onJump}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onJump();
        }
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <span>{item.defectId}</span>
            <ToolTypeBadge toolName={item.toolName} />
          </div>
          <div className="text-muted-foreground mt-1 text-xs">位置 {item.location}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={event => event.stopPropagation()}
            >
              <Icons.More className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete}>
              <Icons.Delete className="text-foreground" />
              <span className="pl-2">删除缺陷</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-3" onClick={event => event.stopPropagation()}>
        <div>
          <div className="text-muted-foreground mb-1 text-xs">类型</div>
          <Select
            value={item.type}
            onValueChange={value => onFieldChange('defectType', value)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              {DEFECT_TYPE_OPTIONS.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-xs">状态</div>
          <Select
            value={item.status}
            onValueChange={value => onFieldChange('defectStatus', value)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              {DEFECT_STATUS_OPTIONS.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground mb-1">面积</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5">{item.area}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">编号</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5">{item.defectId}</div>
        </div>
      </div>

      <div
        className="mt-3"
        onClick={event => event.stopPropagation()}
      >
        <div className="text-muted-foreground mb-1 text-xs">备注</div>
        <Input
          value={item.note}
          placeholder="填写备注"
          className="h-8 text-sm"
          onChange={event => onFieldChange('defectNote', event.target.value)}
        />
      </div>
    </div>
  );
}

export default function PanelDefectList() {
  const items = useDefectMeasurements();

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>{`缺陷清单 (${items.length})`}</span>
        </PanelSection.Header>
        <PanelSection.Content className="p-0">
          <ScrollArea className="h-[calc(100vh-180px)] px-2 py-2">
            {items.length ? (
              items.map(item => (
                <DefectRow
                  key={item.uid}
                  item={item}
                />
              ))
            ) : (
              <div className="text-muted-foreground px-2 py-4 text-sm">
                暂无缺陷标注。点击顶部“缺陷标注”后选择矩形、多边形或点工具开始标注。
              </div>
            )}
          </ScrollArea>
        </PanelSection.Content>
      </PanelSection>
    </div>
  );
}
