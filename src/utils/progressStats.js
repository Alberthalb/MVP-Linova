export const defaultSummaryStats = { days: 0, lessons: 0, activities: 0 };

export const mapProgressSnapshot = (snapshot) => {
  if (!snapshot || !snapshot.size) {
    return defaultSummaryStats;
  }
  const uniqueDays = new Set();
  let lessonsWatched = 0;
  let activitiesCount = 0;
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const timestamp = data?.updatedAt;
    if (data?.watched) {
      lessonsWatched += 1;
    }
    const hasQuizResult =
      Number.isFinite(data?.score) ||
      data?.completed === true ||
      Number.isFinite(data?.totalQuestions) ||
      (data?.answers && Object.keys(data.answers || {}).length > 0);
    if (hasQuizResult) {
      activitiesCount += 1;
    }
    if (timestamp?.toDate) {
      const dayKey = timestamp.toDate().toISOString().slice(0, 10);
      uniqueDays.add(dayKey);
    }
  });
  return {
    days: uniqueDays.size || 1,
    lessons: lessonsWatched,
    activities: activitiesCount,
  };
};
