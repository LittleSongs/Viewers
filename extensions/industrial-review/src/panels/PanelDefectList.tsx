import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import useNdtRelations from '../hooks/useNdtRelations';
import useNdtViewerContext from '../hooks/useNdtViewerContext';
import { saveEvaluation } from '../api/ndtClient';
import { buildEvaluationPayload } from '../utils/serializeNdtAnnotation';
import {
  CONCLUSION_OPTIONS,
  DEFECT_LEVEL_OPTIONS,
  DEFECT_STATUS_OPTIONS,
  DEFECT_TYPE_OPTIONS,
  type DefectListItem,
  type NdtCurrentImageInfo,
  type NdtEvaluationForm,
  type NdtEvaluationRecord,
  type NdtRelatedObject,
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

function DefectRow({ item, onJump }: { item: DefectListItem; onJump: (uid: string) => void }) {
  const { commandsManager } = useSystem();

  const onDelete = event => {
    event.stopPropagation();
    commandsManager.runCommand('removeDefect', { uid: item.uid });
  };

  return (
    <div
      className={[
        'border-border bg-background hover:bg-accent/40 mb-3 w-full rounded-md border p-3 transition-colors',
        item.isSelected ? 'ring-primary bg-accent/30 ring-1' : '',
      ].join(' ')}
      onClick={() => onJump(item.uid)}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onJump(item.uid);
        }
      }}
    >
      <div className="mb-3 flex w-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-foreground flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span>{item.defectId}</span>
            <ToolTypeBadge toolName={item.toolName} />
          </div>
          <div className="text-muted-foreground mt-1 break-words text-xs">位置 {item.location}</div>
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

      <div className="grid w-full grid-cols-2 gap-3">
        <div>
          <div className="text-muted-foreground mb-1 text-xs">类型</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5 text-xs">
            {item.type || '-'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1 text-xs">结论</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5 text-xs">
            {item.status || '-'}
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground mb-1">面积</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5">{item.area}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">缺陷等级</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5">
            {item.measurement.defectLevel || '-'}
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground mb-1">编号</div>
          <div className="text-foreground rounded bg-black/10 px-2 py-1.5">{item.defectId}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-muted-foreground mb-1 text-xs">备注</div>
        <div className="border-input bg-background text-foreground min-h-8 rounded border px-2 py-1.5 text-sm">
          {item.note || '-'}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  const displayValue = value === undefined || value === null || value === '' ? '-' : value;

  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="text-foreground truncate text-xs">{displayValue}</div>
    </div>
  );
}

function CurrentImageCard({ currentImage }: { currentImage: NdtCurrentImageInfo }) {
  return (
    <div className="border-border bg-background rounded-md border p-3">
      <div className="grid grid-cols-2 gap-3">
        <InfoRow
          label="Modality"
          value={currentImage.modality}
        />
        <InfoRow
          label="Instance"
          value={currentImage.instanceNumber}
        />
      </div>
      <div className="mt-3 space-y-2">
        <InfoRow
          label="SeriesDescription"
          value={currentImage.seriesDescription}
        />
        <InfoRow
          label="StudyInstanceUID"
          value={currentImage.studyInstanceUID}
        />
        <InfoRow
          label="SeriesInstanceUID"
          value={currentImage.seriesInstanceUID}
        />
        <InfoRow
          label="SOPInstanceUID"
          value={currentImage.sopInstanceUID}
        />
        <InfoRow
          label="完整性"
          value={currentImage.integrityStatus}
        />
      </div>
    </div>
  );
}

function getRelationValue(item, ...keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }

  return undefined;
}

function RelatedObjectRow({ item }: { item: NdtRelatedObject }) {
  const title =
    getRelationValue(item, 'fileName', 'file_name', 'relatedType', 'related_type') || '未命名对象';
  const sop = getRelationValue(
    item,
    'sopInstanceUID',
    'sop_instance_uid',
    'source_sop_instance_uid'
  );
  const createdAt = getRelationValue(item, 'createTime', 'create_time');

  return (
    <div className="border-border bg-background rounded border px-2 py-2">
      <div className="text-foreground truncate text-xs font-medium">{String(title)}</div>
      <div className="text-muted-foreground mt-1 truncate text-[11px]">{String(sop || '-')}</div>
      {createdAt ? (
        <div className="text-muted-foreground mt-1 text-[11px]">{String(createdAt)}</div>
      ) : null}
    </div>
  );
}

function RelatedObjectGroup({
  title,
  items,
}: {
  title: string;
  items: NdtRelatedObject[] | NdtEvaluationRecord[];
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-2 text-xs">{`${title} (${items.length})`}</div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <RelatedObjectRow
              key={String(getRelationValue(item, 'id') || index)}
              item={item}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
          暂无数据
        </div>
      )}
    </div>
  );
}

function EvaluationRecordRow({ item }: { item: NdtEvaluationRecord }) {
  const defectType = getRelationValue(item, 'defectType', 'defect_type');
  const defectLevel = getRelationValue(item, 'defectLevel', 'defect_level');
  const conclusion = getRelationValue(item, 'conclusion');
  const evaluateTime = getRelationValue(item, 'evaluateTime', 'evaluate_time');

  return (
    <div className="border-border bg-background rounded border px-2 py-2">
      <div className="text-foreground truncate text-xs font-medium">
        {[defectType, defectLevel, conclusion].filter(Boolean).join(' / ') || '评定记录'}
      </div>
      {evaluateTime ? (
        <div className="text-muted-foreground mt-1 text-[11px]">{String(evaluateTime)}</div>
      ) : null}
    </div>
  );
}

function EvaluationRecordGroup({ items }: { items: NdtEvaluationRecord[] }) {
  return (
    <div>
      <div className="text-muted-foreground mb-2 text-xs">{`历史评定 (${items.length})`}</div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <EvaluationRecordRow
              key={String(getRelationValue(item, 'id') || index)}
              item={item}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
          暂无评定
        </div>
      )}
    </div>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
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
  );
}

export default function PanelDefectList() {
  const items = useDefectMeasurements();
  const { servicesManager, commandsManager } = useSystem();
  const { uiNotificationService } = servicesManager.services as AppTypes.Services;
  const { runtimeConfig, currentImage } = useNdtViewerContext();
  const { relations, isLoading, error } = useNdtRelations(runtimeConfig, currentImage);
  const selectedItem = useMemo(
    () => items.find(item => item.isSelected) || items[0] || null,
    [items]
  );
  const [selectedUid, setSelectedUid] = useState<string | null>(selectedItem?.uid ?? null);
  const [form, setForm] = useState<NdtEvaluationForm>({
    defectType: DEFECT_TYPE_OPTIONS[0],
    defectLevel: DEFECT_LEVEL_OPTIONS[0],
    conclusion: CONCLUSION_OPTIONS[0],
    remark: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedItem?.uid) {
      setSelectedUid(null);
      return;
    }

    setSelectedUid(selectedItem.uid);
    setForm({
      defectType: selectedItem.type || DEFECT_TYPE_OPTIONS[0],
      defectLevel: (selectedItem.measurement.defectLevel as string) || DEFECT_LEVEL_OPTIONS[0],
      conclusion: selectedItem.measurement.defectStatus || CONCLUSION_OPTIONS[0],
      remark: selectedItem.note || '',
    });
  }, [selectedItem?.uid, selectedItem?.type, selectedItem?.note, selectedItem?.measurement]);

  const canSave =
    !!runtimeConfig.taskId &&
    runtimeConfig.canEvaluate &&
    !!currentImage.studyInstanceUID &&
    !!currentImage.seriesInstanceUID &&
    !!currentImage.sopInstanceUID;

  const updateForm = (field: keyof NdtEvaluationForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));

    if (selectedItem?.measurement) {
      const updates: Record<string, string> = {};
      if (field === 'remark') updates.defectNote = value;
      if (field === 'defectType') updates.defectType = value;
      if (field === 'defectLevel') updates.defectLevel = value;
      if (field === 'conclusion') updates.defectStatus = value;

      commandsManager.runCommand('updateDefectMeasurement', {
        uid: selectedItem.uid,
        updates,
      });
    }
  };

  const handleSelectDefect = (uid: string) => {
    const nextSelected = items.find(item => item.uid === uid);
    if (!nextSelected) {
      return;
    }

    setSelectedUid(uid);
    commandsManager.runCommand('jumpToDefect', { uid });
  };

  const updateDraftNote = (uid: string, value: string) => {
    setForm(prev => ({
      ...prev,
      remark: value,
    }));

    if (selectedItem?.uid !== uid) {
      setSelectedUid(uid);
    }

    commandsManager.runCommand('updateDefectMeasurement', {
      uid,
      updates: {
        defectNote: value,
      },
    });
  };

  const onSaveEvaluation = async () => {
    if (!canSave || !runtimeConfig.taskId) {
      return;
    }

    setIsSaving(true);
    try {
      await saveEvaluation(
        buildEvaluationPayload({
          taskId: runtimeConfig.taskId,
          currentImage,
          measurement: selectedItem?.measurement,
          form,
        }),
        runtimeConfig
      );
      uiNotificationService?.show?.({
        title: '评定已保存',
        message: '缺陷评定结果已提交到 RuoYi。',
        type: 'success',
      });
    } catch (err) {
      uiNotificationService?.show?.({
        title: '评定保存失败',
        message: err?.message || 'RuoYi 接口暂不可用。',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>当前图像</span>
        </PanelSection.Header>
        <PanelSection.Content className="px-2 py-2">
          <CurrentImageCard currentImage={currentImage} />
          {!runtimeConfig.taskId ? (
            <div className="text-muted-foreground mt-2 rounded border border-dashed px-2 py-2 text-xs">
              当前 URL 未提供 taskId，只允许查看，不能保存评定。
            </div>
          ) : null}
        </PanelSection.Content>
      </PanelSection>

      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>相关对象</span>
        </PanelSection.Header>
        <PanelSection.Content className="px-2 py-2">
          {isLoading ? (
            <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
              正在加载当前图像相关对象...
            </div>
          ) : null}
          {error ? (
            <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
              {error}
            </div>
          ) : null}
          <div className="space-y-4">
            <RelatedObjectGroup
              title="处理图像"
              items={relations.processedImages}
            />
            <RelatedObjectGroup
              title="截图"
              items={relations.snapshots}
            />
            <RelatedObjectGroup
              title="SR报告"
              items={relations.srReports}
            />
            <EvaluationRecordGroup items={relations.evaluations} />
          </div>
        </PanelSection.Content>
      </PanelSection>

      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>{`缺陷清单 (${items.length})`}</span>
        </PanelSection.Header>
        <PanelSection.Content className="flex min-h-0 flex-1 p-0">
          <ScrollArea className="h-[34vh] w-full">
            <div className="w-full px-2 py-2">
              <div className="w-full space-y-3">
                {items.length ? (
                  items.map(item => (
                    <DefectRow
                      key={item.uid}
                      item={item}
                      onJump={handleSelectDefect}
                    />
                  ))
                ) : (
                  <div className="text-muted-foreground px-2 py-4 text-sm">
                    暂无缺陷标注。点击顶部“缺陷标注”后选择矩形、多边形或点工具开始标注。
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </PanelSection.Content>
      </PanelSection>

      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-popover">
          <span>缺陷评定</span>
        </PanelSection.Header>
        <PanelSection.Content className="px-2 py-2">
          <ScrollArea className="h-[44vh] pr-2">
            <div className="space-y-3">
              <div className="text-muted-foreground rounded border border-dashed px-2 py-2 text-xs">
                {selectedItem
                  ? `当前提交对象：${selectedItem.defectId}${selectedUid ? `（已选中 ${selectedUid}）` : ''}`
                  : '未选择缺陷标注，将只保存当前图像上下文。'}
              </div>

              <FormSelect
                label="缺陷类型"
                value={form.defectType}
                options={DEFECT_TYPE_OPTIONS}
                onChange={value => updateForm('defectType', value)}
              />
              <FormSelect
                label="缺陷等级"
                value={form.defectLevel}
                options={DEFECT_LEVEL_OPTIONS}
                onChange={value => updateForm('defectLevel', value)}
              />
              <FormSelect
                label="结论"
                value={form.conclusion}
                options={CONCLUSION_OPTIONS}
                onChange={value => updateForm('conclusion', value)}
              />

              <div>
                <div className="text-muted-foreground mb-1 text-xs">备注</div>
                <textarea
                  value={form.remark || ''}
                  placeholder="填写备注"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground min-h-[72px] w-full resize-none rounded border px-2 py-2 text-sm outline-none"
                  onChange={event => updateForm('remark', event.target.value)}
                />
              </div>

              {!runtimeConfig.canEvaluate ? (
                <div className="text-muted-foreground rounded border border-dashed px-2 py-2 text-xs">
                  当前 URL 未授予 canEvaluate=true，保存评定已禁用。
                </div>
              ) : null}

              <Button
                className="w-full"
                disabled={!canSave || isSaving}
                onClick={onSaveEvaluation}
              >
                {isSaving ? '保存中...' : '保存评定结果'}
              </Button>
            </div>
          </ScrollArea>
        </PanelSection.Content>
      </PanelSection>
    </div>
  );
}
