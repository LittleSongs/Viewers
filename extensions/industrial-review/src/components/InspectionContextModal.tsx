import React from 'react';
import { FooterAction } from '@ohif/ui-next';
import type { InspectionContext } from '../utils/buildInspectionContext';

type InspectionContextModalProps = {
  context?: InspectionContext | null;
  hide?: () => void;
};

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border-secondary-dark bg-primary-dark/60 grid grid-cols-[148px_minmax(0,1fr)] gap-3 rounded-md border px-4 py-3 text-sm">
      <div className="text-primary-light font-semibold">{label}</div>
      <div className="text-common-light break-all">{value || 'N/A'}</div>
    </div>
  );
}

export default function InspectionContextModal({ context, hide }: InspectionContextModalProps) {
  if (!context) {
    return (
      <div className="text-foreground flex min-h-[200px] flex-col gap-4 text-sm">
        <div className="border-secondary-dark bg-primary-dark/60 rounded-md border px-4 py-5">
          No industrial inspection context is available for the active viewport.
        </div>
        <FooterAction>
          <FooterAction.Right>
            <FooterAction.Secondary onClick={hide}>Close</FooterAction.Secondary>
          </FooterAction.Right>
        </FooterAction>
      </div>
    );
  }

  return (
    <div className="text-foreground flex w-full min-w-[540px] max-w-[760px] flex-col gap-4 text-sm">
      <div className="grid gap-3">
        <DetailRow label="工件编号" value={context.workpieceId} />
        <DetailRow label="批次号" value={context.batchNo} />
        <DetailRow label="检测方法" value={context.inspectionMethod} />
        <DetailRow label="设备信息" value={context.equipment} />
        <DetailRow label="采集时间" value={context.acquisitionTime} />
        <DetailRow label="序列描述" value={context.seriesDescription} />
        <DetailRow label="SOP Instance UID" value={context.sopInstanceUID} />
      </div>

      <div className="border-secondary-dark bg-primary-dark/40 text-muted-foreground rounded-md border border-dashed px-4 py-3 text-xs">
        Raw Tags Available
      </div>

      <FooterAction>
        <FooterAction.Right>
          <FooterAction.Secondary onClick={hide}>Close</FooterAction.Secondary>
        </FooterAction.Right>
      </FooterAction>
    </div>
  );
}
