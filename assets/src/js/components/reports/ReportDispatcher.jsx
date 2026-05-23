import React, { useEffect, useState } from 'react';
import ReportModal from './ReportModal';

export default function ReportDispatcher() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    const onOpen = (e) => setReport(e.detail);
    window.addEventListener('openReportModal', onOpen);
    return () => window.removeEventListener('openReportModal', onOpen);
  }, []);

  return (
    <ReportModal
      isOpen={!!report}
      onClose={() => setReport(null)}
      targetType={report?.targetType}
      targetId={report?.targetId}
      targetLabel={report?.targetLabel}
    />
  );
}