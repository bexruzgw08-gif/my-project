import { Component, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, ErrorState, PageLoader } from '../ui/index.jsx';

/** Keeps header/footer usable if a page throws while rendering. Resets on navigation. */
class PageErrorBoundaryBase extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    const { t, children } = this.props;
    if (!this.state.error) return children;
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <ErrorState message={t('common.errorGeneric')} onRetry={() => this.setState({ error: null })} />
        <Button to="/" variant="outline" className="mt-4">
          {t('common.goHome')}
        </Button>
      </div>
    );
  }
}
const PageErrorBoundary = withTranslation()(PageErrorBoundaryBase);
import Header from './Header.jsx';
import Footer from './Footer.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <PageErrorBoundary resetKey={pathname}>
          <Outlet />
        </PageErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

/** Redirects to /login (remembering where the user wanted to go) when not authenticated. */
export function ProtectedRoute({ children }) {
  const { isAuthed, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, reason: 'login' }} />;
  return children;
}
