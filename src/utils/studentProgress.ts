type ProgressSubmission = {
  assignmentId: string;
  fileUrl?: string;
};

/** A unit progresses only after its uploaded file has been saved successfully. */
export const hasSuccessfulSubmission = (
  submissions: ProgressSubmission[],
  assignmentId?: string
): boolean => Boolean(
  assignmentId && submissions.some(submission => {
    const fileUrl = submission.fileUrl;
    return submission.assignmentId === assignmentId &&
      Boolean(fileUrl) &&
      !fileUrl?.includes('/dummy.pdf');
  })
);
