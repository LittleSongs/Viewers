import { useMemo } from 'react';
import { useMeasurements } from '@ohif/extension-cornerstone';
import type { DefectMeasurement } from '../types';
import { isDefectMeasurement, toDefectListItems } from '../utils/defectMeasurements';

export default function useDefectMeasurements() {
  const measurements = useMeasurements() as DefectMeasurement[];

  return useMemo(() => {
    const defectMeasurements = measurements.filter(isDefectMeasurement);
    return toDefectListItems(defectMeasurements);
  }, [measurements]);
}
