import { metaData } from '@cornerstonejs/core';
import { adaptersSR } from '@cornerstonejs/adapters';
import dcmjs from 'dcmjs';
import getFilteredCornerstoneToolState from '@ohif/extension-cornerstone-dicom-sr/src/utils/getFilteredCornerstoneToolState';

const { MeasurementReport } = adaptersSR.Cornerstone3D;

type DicomSrOptions = {
  SeriesDescription?: string;
  SeriesNumber?: number;
  InstanceNumber?: number;
  SeriesDate?: string;
  SeriesTime?: string;
};

export default function createDicomSrBlob(
  measurementData,
  additionalFindingTypes: string[],
  options: DicomSrOptions = {}
): Blob {
  const filteredToolState = getFilteredCornerstoneToolState(
    measurementData,
    additionalFindingTypes
  );
  const report = MeasurementReport.generateReport(filteredToolState, metaData, options);
  const { dataset } = report;

  if (typeof dataset.SpecificCharacterSet === 'undefined') {
    dataset.SpecificCharacterSet = 'ISO_IR 192';
  }

  const { ContentSequence } = dataset;
  if (!ContentSequence?.[4]?.ContentSequence?.length || !dataset.SOPClassUID) {
    throw new Error('当前缺陷标注无法生成有效的 DICOM SR');
  }

  return dcmjs.data.datasetToBlob(dataset);
}
