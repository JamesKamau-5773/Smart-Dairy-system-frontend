import { Link } from 'react-router-dom';
import AlertBanner from './AlertBanner';
import { accessCopy } from '../../i18n/access';

/** Shown in place of a page the user's access doesn't include, instead of a silent redirect. */
export default function NoPageAccess({ allowedPath }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-8">
      <AlertBanner type="warning" title={accessCopy.noAccessTitle} message={accessCopy.noAccessMessage} />
      {allowedPath && (
        <Link to={allowedPath} className="btn-command inline-flex">{accessCopy.goToAllowed}</Link>
      )}
    </div>
  );
}
