interface iIncomingFileCallbacks {
  onFileValidate?: (file: File) => string | null | undefined;
  onFileReject?: (file: File, message: string) => unknown;
}

interface iIncomingFileRules {
  acceptTypes: string[] | null;
  maxSize?: number;
}

interface iIncomingFileValidationOptions extends iIncomingFileCallbacks, iIncomingFileRules {
  maxFiles?: number;
  currentFileCount: number;
}

interface iIncomingFileValidationResult {
  acceptedFiles: File[];
  isInvalidInput: boolean;
}

function isAcceptedType(file: File, acceptTypes: string[]) {
  const fileExtension = `.${file.name.split('.').pop()}`;

  return acceptTypes.some(
    (type) =>
      type === file.type ||
      type === fileExtension ||
      (type.includes('/*') && file.type.startsWith(type.replace('/*', '/'))),
  );
}

function findRuleRejectionMessage(file: File, { acceptTypes, maxSize }: iIncomingFileRules) {
  if (acceptTypes && !isAcceptedType(file, acceptTypes)) {
    return 'File type not accepted';
  }

  if (maxSize && file.size > maxSize) {
    return 'File too large';
  }

  return null;
}

function resolveRejectionMessage(file: File, { onFileValidate }: iIncomingFileCallbacks, rules: iIncomingFileRules) {
  const validationMessage = onFileValidate?.(file);
  if (validationMessage) {
    return validationMessage;
  }

  return findRuleRejectionMessage(file, rules);
}

function rejectFilesOverCapacity(
  rejectedFiles: File[],
  maxFiles: number,
  { onFileValidate, onFileReject }: iIncomingFileCallbacks,
) {
  for (const file of rejectedFiles) {
    let rejectionMessage = `Maximum ${maxFiles} files allowed`;

    if (onFileValidate) {
      const validationMessage = onFileValidate(file);
      if (validationMessage) {
        rejectionMessage = validationMessage;
      }
    }

    onFileReject?.(file, rejectionMessage);
  }
}

export function validateIncomingFiles(
  originalFiles: File[],
  { maxFiles, currentFileCount, acceptTypes, maxSize, onFileValidate, onFileReject }: iIncomingFileValidationOptions,
): iIncomingFileValidationResult {
  let filesToProcess = [...originalFiles];
  let isInvalidInput = false;

  if (maxFiles) {
    const remainingSlotCount = Math.max(0, maxFiles - currentFileCount);

    if (remainingSlotCount < filesToProcess.length) {
      isInvalidInput = true;
      rejectFilesOverCapacity(filesToProcess.slice(remainingSlotCount), maxFiles, { onFileValidate, onFileReject });
      filesToProcess = filesToProcess.slice(0, remainingSlotCount);
    }
  }

  const acceptedFiles: File[] = [];

  for (const file of filesToProcess) {
    const rejectionMessage = resolveRejectionMessage(file, { onFileValidate }, { acceptTypes, maxSize });

    if (rejectionMessage) {
      onFileReject?.(file, rejectionMessage);
      isInvalidInput = true;
    } else {
      acceptedFiles.push(file);
    }
  }

  return { acceptedFiles, isInvalidInput };
}
