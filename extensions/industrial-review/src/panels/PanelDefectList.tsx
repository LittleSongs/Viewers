import React, { useEffect, useMemo, useState } from 'react';
import { useSystem } from '@ohif/core';
import {
  Button,
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
import useNdtObjectTree from '../hooks/useNdtObjectTree';
import useNdtViewerContext from '../hooks/useNdtViewerContext';
import {
  createDefect,
  createEvaluation,
  listDefects,
  listEvaluations,
  submitEvaluationWithSr,
  updateDefect,
  updateEvaluation,
} from '../api/ndtClient';
import createDicomSrBlob from '../utils/createDicomSrBlob';
import {
  buildDefectEvaluationPayload,
  buildDefectPayload,
  buildFormFromMeasurement,
} from '../utils/serializeNdtAnnotation';
import {
  CONCLUSION_OPTIONS,
  DEFECT_LEVEL_OPTIONS,
  DEFECT_TOOL_NAMES,
  DEFECT_TYPE_OPTIONS,
  type DefectListItem,
  type NdtDefectRecord,
  type NdtEvaluationForm,
  type NdtEvaluationRecord,
} from '../types';

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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function MeasurementRow({
  item,
  active,
  onSelect,
}: {
  item: DefectListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'border-border mb-2 w-full rounded border px-2 py-2 text-left text-xs',
        active ? 'border-primary bg-primary/10' : 'bg-background',
      ].join(' ')}
    >
      <div className="font-medium">{item.defectId} · {item.toolName}</div>
      <div className="text-muted-foreground mt-1">{item.location} · {item.area}</div>
    </button>
  );
}

export function SavedHistory({
  defects,
  evaluations,
}: {
  defects: NdtDefectRecord[];
  evaluations: Record<string, NdtEvaluationRecord[]>;
}) {
  if (!defects.length) {
    return <div className="text-muted-foreground text-xs">当前原始图暂无已保存缺陷。</div>;
  }
  return (
    <div className="space-y-2">
      {defects.map(defect => (
        <div key={String(defect.id)} className="border-border rounded border px-2 py-2 text-xs">
          <div className="font-medium">{defect.defectNo} · {defect.defectType || '未分类'}</div>
          {(evaluations[String(defect.id)] || []).map(evaluation => (
            <div key={String(evaluation.id)} className="text-muted-foreground mt-1">
              {evaluation.level || '-'} / {evaluation.conclusion || '-'} / {evaluation.status}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PanelDefectList() {
  const items = useDefectMeasurements();
  const { servicesManager, commandsManager } = useSystem();
  const { displaySetService, uiNotificationService } =
    servicesManager.services as AppTypes.Services;
  const { runtimeConfig, currentImage } = useNdtViewerContext();
  const { tree } = useNdtObjectTree(runtimeConfig, displaySetService);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const selectedItem = useMemo(
    () => items.find(item => item.uid === selectedUid) || items.find(item => item.isSelected) || items[0],
    [items, selectedUid]
  );
  const [form, setForm] = useState<NdtEvaluationForm>({
    defectType: DEFECT_TYPE_OPTIONS[0],
    defectLevel: DEFECT_LEVEL_OPTIONS[0],
    conclusion: CONCLUSION_OPTIONS[0],
    remark: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedDefects, setSavedDefects] = useState<NdtDefectRecord[]>([]);
  const [savedEvaluations, setSavedEvaluations] = useState<Record<string, NdtEvaluationRecord[]>>({});

  const originalObject = useMemo(
    () =>
      tree.workpieces
        .flatMap(workpiece => workpiece.positions)
        .flatMap(position => position.objects)
        .find(
          object =>
            object.objectType === 'ORIGINAL_IMAGE' &&
            object.sopInstanceUid === currentImage.sopInstanceUID
        ),
    [currentImage.sopInstanceUID, tree]
  );

  useEffect(() => {
    if (!selectedItem) return;
    setSelectedUid(selectedItem.uid);
    setForm(buildFormFromMeasurement(selectedItem.measurement));
  }, [selectedItem?.uid]);

  useEffect(() => {
    if (!originalObject) {
      setSavedDefects([]);
      setSavedEvaluations({});
      return;
    }
    let cancelled = false;
    listDefects(originalObject.id, runtimeConfig)
      .then(async defects => {
        const pairs = await Promise.all(
          defects.map(async defect => [String(defect.id), await listEvaluations(defect.id, runtimeConfig)] as const)
        );
        if (!cancelled) {
          setSavedDefects(defects);
          setSavedEvaluations(Object.fromEntries(pairs));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSavedDefects([]);
          setSavedEvaluations({});
        }
      });
    return () => { cancelled = true; };
  }, [originalObject?.id, runtimeConfig]);

  const notify = (title: string, message: string, type: 'success' | 'warning' | 'error') =>
    uiNotificationService?.show?.({ title, message, type });

  const updateForm = (field: keyof NdtEvaluationForm, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    if (!selectedItem) return;
    const updates: Record<string, string> = {};
    if (field === 'defectType') updates.defectType = value;
    if (field === 'defectLevel') updates.defectLevel = value;
    if (field === 'conclusion') updates.defectStatus = value;
    if (field === 'remark') updates.defectNote = value;
    commandsManager.runCommand('updateDefectMeasurement', { uid: selectedItem.uid, updates });
  };

  const save = async (withSr: boolean) => {
    if (!selectedItem || !originalObject || !runtimeConfig.canEvaluate) return;
    setIsSaving(true);
    try {
      const defectPayload = buildDefectPayload({
        originalObjectId: originalObject.id,
        defectNo: `D-${selectedItem.uid}`.slice(0, 64),
        measurement: selectedItem.measurement,
        form,
      });
      const existingDefect = savedDefects.find(
        value => value.defectNo === defectPayload.defectNo
      );
      const existingDraft = existingDefect
        ? (savedEvaluations[String(existingDefect.id)] || []).find(
            value => value.status === 'DRAFT'
          )
        : undefined;
      let defect = existingDefect;
      if (!defect) {
        defect = await createDefect(defectPayload, runtimeConfig);
      } else if (existingDraft) {
        await updateDefect({ ...defectPayload, id: defect.id }, runtimeConfig);
      }

      const evaluationPayload = buildDefectEvaluationPayload(defect.id, form);
      let evaluation = existingDraft;
      if (evaluation) {
        await updateEvaluation(
          { ...evaluationPayload, id: evaluation.id },
          runtimeConfig
        );
      } else {
        evaluation = await createEvaluation(evaluationPayload, runtimeConfig);
      }
      if (withSr) {
        const srFile = createDicomSrBlob(
          [selectedItem.measurement],
          [...DEFECT_TOOL_NAMES],
          { SeriesDescription: 'NDT Defect Structured Report' }
        );
        await submitEvaluationWithSr(evaluation.id, originalObject.id, srFile, runtimeConfig);
      }
      notify('保存成功', withSr ? '缺陷、评定和SR已保存并提交。' : '缺陷和评定草稿已保存。', 'success');
      const defects = await listDefects(originalObject.id, runtimeConfig);
      setSavedDefects(defects);
      const pairs = await Promise.all(
        defects.map(async value => [String(value.id), await listEvaluations(value.id, runtimeConfig)] as const)
      );
      setSavedEvaluations(Object.fromEntries(pairs));
    } catch (error) {
      notify(
        '保存失败',
        error instanceof Error ? error.message : '无法保存缺陷评定',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PanelSection defaultOpen={true}>
        <PanelSection.Header>当前图像</PanelSection.Header>
        <PanelSection.Content className="space-y-1 px-3 py-2 text-xs">
          <div className="truncate">SOP: {currentImage.sopInstanceUID || '-'}</div>
          <div>业务对象ID: {originalObject?.id || '未在任务对象树中找到'}</div>
        </PanelSection.Content>
      </PanelSection>
      <ScrollArea className="min-h-0 flex-1">
        <PanelSection defaultOpen={true}>
          <PanelSection.Header>OHIF缺陷标注</PanelSection.Header>
          <PanelSection.Content className="px-3 py-2">
            {items.map(item => (
              <MeasurementRow
                key={item.uid}
                item={item}
                active={item.uid === selectedItem?.uid}
                onSelect={() => setSelectedUid(item.uid)}
              />
            ))}
            {!items.length ? <div className="text-muted-foreground text-xs">请先使用ROI工具标注缺陷。</div> : null}
          </PanelSection.Content>
        </PanelSection>
        <PanelSection defaultOpen={true}>
          <PanelSection.Header>缺陷与评定</PanelSection.Header>
          <PanelSection.Content className="space-y-3 px-3 py-3">
            <FormSelect label="缺陷类型" value={String(form.defectType)} options={DEFECT_TYPE_OPTIONS} onChange={v => updateForm('defectType', v)} />
            <FormSelect label="评定等级" value={String(form.defectLevel)} options={DEFECT_LEVEL_OPTIONS} onChange={v => updateForm('defectLevel', v)} />
            <FormSelect label="结论" value={String(form.conclusion)} options={CONCLUSION_OPTIONS} onChange={v => updateForm('conclusion', v)} />
            <div>
              <div className="text-muted-foreground mb-1 text-xs">说明</div>
              <Input value={form.remark} onChange={event => updateForm('remark', event.target.value)} />
            </div>
            {!runtimeConfig.canEvaluate ? <div className="text-muted-foreground text-xs">当前任务没有评定权限。</div> : null}
            <Button className="w-full" disabled={!selectedItem || !originalObject || !runtimeConfig.canEvaluate || isSaving} onClick={() => save(false)}>
              保存缺陷与评定草稿
            </Button>
            <Button className="w-full" disabled={!selectedItem || !originalObject || !runtimeConfig.canEvaluate || isSaving} onClick={() => save(true)}>
              保存并提交DICOM SR
            </Button>
          </PanelSection.Content>
        </PanelSection>
        <PanelSection defaultOpen={true}>
          <PanelSection.Header>已保存记录</PanelSection.Header>
          <PanelSection.Content className="px-3 py-3">
            <SavedHistory defects={savedDefects} evaluations={savedEvaluations} />
          </PanelSection.Content>
        </PanelSection>
      </ScrollArea>
    </div>
  );
}
