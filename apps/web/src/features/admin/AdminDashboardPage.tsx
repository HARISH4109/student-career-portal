import {
  Activity,
  Bot,
  Building2,
  FileText,
  Shield,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { AcademicConfigTab } from './components/AcademicConfigTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { FailedAIJobsTab } from './components/FailedAIJobsTab';
import { SystemHealthTab } from './components/SystemHealthTab';
import { UserManagementTab } from './components/UserManagementTab';

type AdminTab = 'users' | 'academic' | 'audit' | 'ai-jobs' | 'health';

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'users', label: 'User Directory & RBAC', icon: <Users className="h-4 w-4" /> },
  { id: 'academic', label: 'Academic Taxonomy', icon: <Building2 className="h-4 w-4" /> },
  { id: 'audit', label: 'Security Audit Logs', icon: <FileText className="h-4 w-4" /> },
  { id: 'ai-jobs', label: 'Failed AI Jobs', icon: <Bot className="h-4 w-4" /> },
  { id: 'health', label: 'System Diagnostics', icon: <Activity className="h-4 w-4" /> },
];

export function AdminDashboardPage(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize active tab from URL hash if valid
  const getTabFromHash = (): AdminTab => {
    const hash = location.hash.replace('#', '') as AdminTab;
    if (['users', 'academic', 'audit', 'ai-jobs', 'health'].includes(hash)) {
      return hash;
    }
    return 'users';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getTabFromHash);

  useEffect(() => {
    const currentHashTab = getTabFromHash();
    if (currentHashTab !== activeTab) {
      setActiveTab(currentHashTab);
    }
  }, [location.hash]);

  const handleTabChange = (tabId: AdminTab): void => {
    setActiveTab(tabId);
    void navigate({ hash: tabId }, { replace: true });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Institutional Administration & Governance
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Institutional controls, role privileges, academic taxonomy, security audit trails, and system health.
          </p>
        </div>
      </div>

      {/* Unified Tab Navigation Bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { handleTabChange(tab.id); }}
                className={`flex whitespace-nowrap items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'users' && <UserManagementTab />}
        {activeTab === 'academic' && <AcademicConfigTab />}
        {activeTab === 'audit' && <AuditLogsTab />}
        {activeTab === 'ai-jobs' && <FailedAIJobsTab />}
        {activeTab === 'health' && <SystemHealthTab />}
      </div>
    </div>
  );
}

export default AdminDashboardPage;

