import Sidebar from './Sidebar';
import Header from './Header';
import MainContent from './MainContent';

export default function DesktopApp() {
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header />
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <MainContent />
        </div>
      </div>
    </div>
  );
}
