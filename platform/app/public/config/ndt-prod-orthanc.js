/** @type {AppTypes.Config} */
window.config = {
  routerBasename: null,
  showStudyList: true,

  // 保持你当前项目里已经接好的扩展和 modes
  extensions: [
    // 按你项目当前实际内容填写
  ],
  modes: [
    // 保持你当前 Industrial Viewer mode
  ],

  defaultDataSourceName: 'orthancProxy',

  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'orthancProxy',
      configuration: {
        friendlyName: 'Orthanc Server',
        name: 'Orthanc',
        wadoUriRoot: '/pacs/wado',
        qidoRoot: '/pacs/dicom-web',
        wadoRoot: '/pacs/dicom-web',
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        dicomUploadEnabled: false,
        omitQuotationForMultipartRequest: true,
      },
    },
  ],

  httpErrorHandler: error => {
    console.warn(`HTTP Error Handler (status: ${error.status})`, error);
  },
};
