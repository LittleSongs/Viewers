import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import useNdtEvaluationHistory from '../hooks/useNdtEvaluationHistory';
import useNdtViewerContext from '../hooks/useNdtViewerContext';
import { batchSubmitEvaluationWithSr, getEvaluationsBySr } from '../api/ndtClient';
import createDicomSrBlob from '../utils/createDicomSrBlob';
import { buildBatchEvaluationPayloads } from '../utils/serializeNdtAnnotation';
import {
  CONCLUSION_OPTIONS,
  DEFECT_LEVEL_OPTIONS,
  DEFECT_TOOL_NAMES,
  DEFECT_TYPE_OPTIONS,
  type DefectListItem,
  type NdtCurrentImageInfo,
  type NdtEvaluationForm,
  type NdtEvaluationRecord,
  type NdtEvaluationHistoryResponse,
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
          label="SR SOPInstanceUID"
          value={currentImage.srSopInstanceUID}
        />
        <InfoRow
          label="SR SeriesDescription"
          value={currentImage.srSeriesDescription}
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

export function EvaluationHistory({ history }: { history: NdtEvaluationHistoryResponse }) {
  if (!history.parts.length) {
    return (
      <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
        暂无评定历史
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.parts.map(part => (
        <div key={String(part.id || part.partNo)}>
          <div className="text-muted-foreground mb-2 text-xs">
            {`${part.partNo || '检测部位'} · ${part.partName || part.sourceSopInstanceUid || ''}`}
          </div>
          <div className="space-y-2">
            {part.evaluations.length ? (
              part.evaluations.map((record, index) => (
                <div
                  key={String(getRelationValue(record, 'id') || index)}
                  className="border-border bg-background rounded border px-2 py-2"
                >
                  <div className="text-foreground text-xs font-medium">
                    {[
                      getRelationValue(record, 'defectType', 'defect_type'),
                      getRelationValue(record, 'defectLevel', 'defect_level'),
                      getRelationValue(record, 'conclusion'),
                    ]
                      .filter(Boolean)
                      .join(' / ') || '评定记录'}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px]">
                    {[
                      getRelationValue(record, 'evaluatorUserName', 'evaluator_user_name') ||
                        '未知评定人',
                      getRelationValue(record, 'evaluateTime', 'evaluate_time'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
                该检测部位暂无评定
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function parseAnnotationJson(record: NdtEvaluationRecord) {
  const value = getRelationValue(record, 'annotationJson', 'annotation_json');
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getAnnotationMeasurementUid(record: NdtEvaluationRecord) {
  return parseAnnotationJson(record)?.measurement?.uid;
}

function getAnnotationRemark(record: NdtEvaluationRecord) {
  return (
    getRelationValue(record, 'remark') ||
    parseAnnotationJson(record)?.evaluation?.remark ||
    parseAnnotationJson(record)?.measurement?.defectNote
  );
}

function getEvaluationNumber(record: NdtEvaluationRecord) {
  const id = Number(getRelationValue(record, 'id'));
  return Number.isFinite(id) ? id : Number.MAX_SAFE_INTEGER;
}

function orderEvaluationsForMeasurements(records: NdtEvaluationRecord[]) {
  return [...records].sort((left, right) => getEvaluationNumber(left) - getEvaluationNumber(right));
}

function buildMeasurementUpdates(record: NdtEvaluationRecord) {
  const updates: Record<string, string> = {};
  const defectType = getRelationValue(record, 'defectType', 'defect_type');
  const defectLevel = getRelationValue(record, 'defectLevel', 'defect_level');
  const conclusion = getRelationValue(record, 'conclusion');
  const remark = getAnnotationRemark(record);

  if (defectType) {
    updates.defectType = String(defectType);
  }
  if (defectLevel) {
    updates.defectLevel = String(defectLevel);
  }
  if (conclusion) {
    updates.defectStatus = String(conclusion);
  }
  if (remark) {
    updates.defectNote = String(remark);
  }

  return updates;
}

function hasMeasurementUpdates(item: DefectListItem, updates: Record<string, string>) {
  return Object.entries(updates).some(([key, value]) => item.measurement?.[key] !== value);
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
  const historySopInstanceUID = currentImage.srSopInstanceUID || currentImage.sopInstanceUID;
  const {
    history,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useNdtEvaluationHistory(runtimeConfig, historySopInstanceUID);
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
  const [selectedSrSopInstanceUID, setSelectedSrSopInstanceUID] = useState<string | null>(null);
  const [srEvaluations, setSrEvaluations] = useState<NdtEvaluationRecord[]>([]);
  const [, setIsLoadingSrEvaluations] = useState(false);
  const appliedSrEvaluationKeyRef = useRef('');

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
    items.length > 0 &&
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

  const loadSrEvaluations = useCallback(
    async (srSopInstanceUID: string, options: { notifyOnError?: boolean } = {}) => {
      if (!runtimeConfig.taskId || !srSopInstanceUID) {
        return;
      }

      setSelectedSrSopInstanceUID(srSopInstanceUID);
      setIsLoadingSrEvaluations(true);
      try {
        const records = await getEvaluationsBySr(
          {
            taskId: runtimeConfig.taskId,
            srSopInstanceUID,
          },
          runtimeConfig
        );
        setSrEvaluations(records);
      } catch (err) {
        setSrEvaluations([]);
        if (options.notifyOnError !== false) {
          uiNotificationService?.show?.({
            title: 'SR评定加载失败',
            message: err?.message || '无法加载该 SR 对应的缺陷评定列表。',
            type: 'error',
          });
        }
      } finally {
        setIsLoadingSrEvaluations(false);
      }
    },
    [runtimeConfig, uiNotificationService]
  );

  useEffect(() => {
    if (!runtimeConfig.taskId || !currentImage.srSopInstanceUID) {
      return;
    }

    loadSrEvaluations(currentImage.srSopInstanceUID, { notifyOnError: false });
  }, [currentImage.srSopInstanceUID, loadSrEvaluations, runtimeConfig.taskId]);

  useEffect(() => {
    if (!items.length || !srEvaluations.length || !selectedSrSopInstanceUID) {
      return;
    }

    const orderedEvaluations = orderEvaluationsForMeasurements(srEvaluations);
    const applyKey = [
      selectedSrSopInstanceUID,
      orderedEvaluations.map(record => getRelationValue(record, 'id')).join(','),
      items.map(item => item.uid).join(','),
    ].join('|');

    if (appliedSrEvaluationKeyRef.current === applyKey) {
      return;
    }
    appliedSrEvaluationKeyRef.current = applyKey;

    orderedEvaluations.forEach((record, index) => {
      const annotationMeasurementUid = getAnnotationMeasurementUid(record);
      const targetItem =
        (annotationMeasurementUid
          ? items.find(item => item.measurement.uid === annotationMeasurementUid)
          : undefined) || items[index];

      if (!targetItem) {
        return;
      }

      const updates = buildMeasurementUpdates(record);
      if (!Object.keys(updates).length || !hasMeasurementUpdates(targetItem, updates)) {
        return;
      }

      commandsManager.runCommand('updateDefectMeasurement', {
        uid: targetItem.uid,
        updates,
      });
    });
  }, [commandsManager, items, selectedSrSopInstanceUID, srEvaluations]);

  const onSaveEvaluation = async () => {
    if (!canSave || !runtimeConfig.taskId) {
      return;
    }

    setIsSaving(true);
    try {
      const measurements = items.map(item => item.measurement);
      const evaluations = buildBatchEvaluationPayloads({
        taskId: runtimeConfig.taskId,
        currentImage,
        measurements,
      });
      const srFile = createDicomSrBlob(measurements, [...DEFECT_TOOL_NAMES], {
        SeriesDescription: 'NDT Defect Structured Report',
      });

      await batchSubmitEvaluationWithSr(
        {
          taskId: runtimeConfig.taskId,
          studyInstanceUID: currentImage.studyInstanceUID,
          seriesInstanceUID: currentImage.seriesInstanceUID,
          sopInstanceUID: currentImage.sopInstanceUID,
          evaluations,
          srFile,
        },
        runtimeConfig
      );
      uiNotificationService?.show?.({
        title: '评定已保存',
        message: '缺陷评定结果和 DICOM SR 已提交到 RuoYi。',
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
          <span>评定历史</span>
        </PanelSection.Header>
        <PanelSection.Content className="px-2 py-2">
          {isLoadingHistory ? (
            <div className="text-muted-foreground rounded border border-dashed px-2 py-3 text-xs">
              正在加载评定历史…
            </div>
          ) : null}
          {historyError ? (
            <div className="text-destructive rounded border border-dashed px-2 py-3 text-xs">
              {historyError}
            </div>
          ) : null}
          {!isLoadingHistory && !historyError ? <EvaluationHistory history={history} /> : null}
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
                  ? `当前编辑对象：${selectedItem.defectId}${selectedUid ? `（已选中 ${selectedUid}）` : ''}；保存时会提交全部 ${items.length} 个缺陷并生成一个 SR。`
                  : '暂无缺陷标注，不能提交评定或生成 SR。'}
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
                {isSaving ? '保存中...' : '保存全部缺陷并生成SR'}
              </Button>
            </div>
          </ScrollArea>
        </PanelSection.Content>
      </PanelSection>
    </div>
  );
}
