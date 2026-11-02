import { useEffect, useState } from 'react';
import { DATA_SAVER_EVENT, isDataSaverEnabled, setDataSaverEnabled } from '../lib/dataSaver';

export function useDataSaver() {
  const [enabled, setEnabled] = useState(isDataSaverEnabled);

  useEffect(() => {
    const onChange = (event) => setEnabled(Boolean(event.detail));
    window.addEventListener(DATA_SAVER_EVENT, onChange);
    return () => window.removeEventListener(DATA_SAVER_EVENT, onChange);
  }, []);

  return [enabled, setDataSaverEnabled];
}
