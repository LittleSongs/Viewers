export type InspectionContext = {
  workpieceId: string;
  batchNo: string;
  inspectionMethod: string;
  equipment: string;
  acquisitionTime: string;
  seriesDescription: string;
  sopInstanceUID: string;
  raw: unknown;
};

const EMPTY_VALUE = 'N/A';

function firstDefined(...values: unknown[]): string {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return EMPTY_VALUE;
}

function joinDefined(values: unknown[], separator = ' · '): string {
  const normalized = values
    .filter(value => value !== undefined && value !== null)
    .map(value => String(value).trim())
    .filter(Boolean);

  return normalized.length ? normalized.join(separator) : EMPTY_VALUE;
}

function formatDicomDateTime(studyDate?: unknown, studyTime?: unknown): string {
  const normalizedDate = studyDate ? String(studyDate).trim() : '';
  const normalizedTime = studyTime ? String(studyTime).trim() : '';

  if (!normalizedDate && !normalizedTime) {
    return EMPTY_VALUE;
  }

  const formattedDate =
    normalizedDate.length === 8
      ? `${normalizedDate.slice(0, 4)}-${normalizedDate.slice(4, 6)}-${normalizedDate.slice(6, 8)}`
      : normalizedDate;

  const digitsOnlyTime = normalizedTime.replace(/[^\d]/g, '');
  const formattedTime = digitsOnlyTime
    ? [digitsOnlyTime.slice(0, 2), digitsOnlyTime.slice(2, 4), digitsOnlyTime.slice(4, 6)]
        .filter(Boolean)
        .join(':')
    : normalizedTime;

  return [formattedDate, formattedTime].filter(Boolean).join(' ') || EMPTY_VALUE;
}

export default function buildInspectionContext(
  displaySet?: Record<string, any>,
  instance?: Record<string, any>
): InspectionContext {
  const source = instance || displaySet || {};

  return {
    workpieceId: firstDefined(
      source.PatientID,
      source.ContainerIdentifier,
      source.SpecimenIdentifier,
      source.StudyID,
      displaySet?.StudyInstanceUID
    ),
    batchNo: firstDefined(source.AccessionNumber, source.StudyID),
    inspectionMethod: firstDefined(source.Modality, displaySet?.Modality),
    equipment: joinDefined([
      source.Manufacturer,
      source.ManufacturerModelName,
      source.StationName,
    ]),
    acquisitionTime: formatDicomDateTime(source.StudyDate, source.StudyTime),
    seriesDescription: firstDefined(source.SeriesDescription, displaySet?.SeriesDescription),
    sopInstanceUID: firstDefined(source.SOPInstanceUID),
    raw: source,
  };
}
