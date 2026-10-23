import { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Bell, Settings, CreditCard, Activity, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Contract {
  id: string;
  vendorName: string;
  cost: number;
  currency: string;
  renewalDate: string;
  cancellationNoticeDays: number;
  status: string;
  reminderEnabled: boolean;
}

export default function Reminders() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/contracts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === 'success') {
          setContracts(data.data.contracts);
        }
      } catch (err) {
        console.error('Failed to fetch contracts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  // Filter and calculate reminder dates
  const activeReminders = contracts
    .filter(c => c.status === 'ACTIVE' && c.reminderEnabled)
    .map(c => {
      const renewalDate = new Date(c.renewalDate);
      const reminderDate = new Date(c.renewalDate);
      reminderDate.setDate(renewalDate.getDate() - c.cancellationNoticeDays);
      
      const today = new Date();
      const daysUntilReminder = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      return {
        ...c,
        reminderDate,
        daysUntilReminder
      };
    })
    .sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime());

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className="h-6 w-6 text-primary" />
            <span className="">Renewal Radar</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto py-4 flex flex-col justify-between">
          <nav className="grid items-start px-4 text-sm font-medium">
            <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
              <CreditCard className="h-4 w-4" />
              Contracts
            </Link>
            <Link to="/reminders" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all">
              <Bell className="h-4 w-4" />
              Reminders
            </Link>
            <Link to="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
          
          <div className="px-4 pb-4 mt-auto">
             <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col sm:pl-64">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
          <h1 className="text-lg font-semibold">Upcoming Reminders</h1>
        </header>

        <div className="p-6">
          <Card>
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Loading reminders...</div>
            ) : activeReminders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">You're all caught up!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  No upcoming renewals require your attention right now.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium">Vendor</th>
                      <th className="px-6 py-3 font-medium">Renewal Date</th>
                      <th className="px-6 py-3 font-medium">Notice Required</th>
                      <th className="px-6 py-3 font-medium">Reminder Trigger Date</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReminders.map((r) => {
                      const isUrgent = r.daysUntilReminder <= 7 && r.daysUntilReminder >= 0;
                      const isOverdue = r.daysUntilReminder < 0;

                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            {r.vendorName}
                            {isUrgent && <AlertCircle className="h-4 w-4 text-orange-500" title="Action required soon" />}
                            {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" title="Action overdue" />}
                          </td>
                          <td className="px-6 py-4">{new Date(r.renewalDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{r.cancellationNoticeDays} days</td>
                          <td className="px-6 py-4 font-medium">{r.reminderDate.toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            {isOverdue ? (
                              <span className="text-destructive font-medium">Decision Past Due</span>
                            ) : isUrgent ? (
                              <span className="text-orange-500 font-medium">Due in {r.daysUntilReminder} days</span>
                            ) : (
                              <span className="text-muted-foreground">in {r.daysUntilReminder} days</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
