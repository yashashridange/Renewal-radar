import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, Bell, Settings, CreditCard, Clock, Activity, LogOut } from 'lucide-react';
import AddContractModal from '../components/AddContractModal';

import { Link } from 'react-router-dom';

interface Contract {
  id: string;
  vendorName: string;
  cost: number;
  currency: string;
  billingFrequency: string;
  renewalDate: string;
  status: string;
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/auth';
  };

  // Metrics Calculation
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
  
  const totalMonthlySpend = activeContracts.reduce((acc, c) => {
    if (c.billingFrequency === 'MONTHLY') return acc + c.cost;
    if (c.billingFrequency === 'YEARLY') return acc + c.cost / 12;
    if (c.billingFrequency === 'QUARTERLY') return acc + c.cost / 3;
    return acc;
  }, 0);

  const totalAnnualSpend = activeContracts.reduce((acc, c) => {
    if (c.billingFrequency === 'MONTHLY') return acc + c.cost * 12;
    if (c.billingFrequency === 'YEARLY') return acc + c.cost;
    if (c.billingFrequency === 'QUARTERLY') return acc + c.cost * 4;
    return acc;
  }, 0);

  // Spend at risk (renewing within 90 days)
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  const atRiskContracts = activeContracts.filter((c) => new Date(c.renewalDate) <= ninetyDaysFromNow);
  const spendAtRisk = atRiskContracts.reduce((acc, c) => acc + c.cost, 0);

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
            <Link to="/" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all">
              <CreditCard className="h-4 w-4" />
              Contracts
            </Link>
            <Link to="/reminders" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
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
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          </div>
        </header>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Monthly Spend</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalMonthlySpend.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">across {activeContracts.length} active contracts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Annual Spend</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalAnnualSpend.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Spend at Risk (90 Days)</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">${spendAtRisk.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{atRiskContracts.length} contract(s) renewing soon</p>
              </CardContent>
            </Card>
          </div>

          {/* Contracts List */}
          <h2 className="text-xl font-bold mb-4">Upcoming Renewals</h2>
          <Card>
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Loading contracts...</div>
            ) : contracts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">No contracts added yet</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-6">
                  Keep track of your SaaS subscriptions and vendor contracts.
                </p>
                <Button onClick={() => setIsModalOpen(true)}>Add Your First Contract</Button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium">Vendor</th>
                      <th className="px-6 py-3 font-medium">Cost</th>
                      <th className="px-6 py-3 font-medium">Frequency</th>
                      <th className="px-6 py-3 font-medium">Renewal Date</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium">{c.vendorName}</td>
                        <td className="px-6 py-4">{new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency }).format(c.cost)}</td>
                        <td className="px-6 py-4">{c.billingFrequency}</td>
                        <td className="px-6 py-4">{new Date(c.renewalDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Modals */}
      <AddContractModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => fetchContracts()} 
      />
    </div>
  );
}
