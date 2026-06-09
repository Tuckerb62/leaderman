export function buildFeedPreviewActivityPatch({
  itemKey,
  subjectIds = [],
  topicIds = [],
  domain,
  existingActivity = {},
  now = new Date().toISOString(),
}) {
  return {
    itemKey,
    subjectIds,
    topicIds,
    domain,
    previewCount: (existingActivity.previewCount || 0) + 1,
    lastPreviewedAt: now,
    updatedAt: now,
  };
}
