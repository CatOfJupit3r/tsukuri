import { em } from 'enumwaii';

export const FILE_UPLOAD_ROOT_NAME = 'FileUpload';
export const FILE_UPLOAD_DROPZONE_NAME = 'FileUploadDropzone';
export const FILE_UPLOAD_TRIGGER_NAME = 'FileUploadTrigger';

const fileUploadStatusesEnumwaii = em(['IDLE', 'UPLOADING', 'ERROR', 'SUCCESS']);

export const FILE_UPLOAD_STATUSES = fileUploadStatusesEnumwaii.enum;
export type FileUploadStatus = (typeof fileUploadStatusesEnumwaii)['~type'];

const fileUploadStoreActionTypesEnumwaii = em([
  'ADD_FILES',
  'SET_FILES',
  'SET_PROGRESS',
  'SET_SUCCESS',
  'SET_ERROR',
  'REMOVE_FILE',
  'SET_DRAG_OVER',
  'SET_INVALID',
  'CLEAR',
]);

export const FILE_UPLOAD_STORE_ACTION_TYPES = fileUploadStoreActionTypesEnumwaii.enum;
export const FILE_UPLOAD_STORE_ACTION_TYPE_CASES = fileUploadStoreActionTypesEnumwaii.cases;
