type ProgressSubmission = {
  assignmentId: string;
  fileUrl?: string;
  status?: string;
};

/** A unit progresses only after its uploaded file has been saved successfully. */
export const hasSuccessfulSubmission = (
  submissions: ProgressSubmission[],
  assignmentId?: string
): boolean => Boolean(
  assignmentId && submissions.some(submission => {
    const fileUrl = submission.fileUrl;
    return submission.assignmentId === assignmentId &&
      submission.status !== 'REVISION_REQUIRED' &&
      Boolean(fileUrl) &&
      !fileUrl?.includes('/dummy.pdf');
  })
);
