import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Bell, Settings as SettingsIcon, CreditCard, Activity, LogOut, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO';
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we just returned from a mock checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && params.get('mock') === 'true') {
      alert('Mock Checkout Successful! You are now a PRO user.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('portal') === 'true' && params.get('mock') === 'true') {
      alert('Mock Customer Portal! (In production this would open Stripe)');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === 'success') {
          setUser(data.data.user);
          setFormData({ 
            name: data.data.user.name || '', 
            email: data.data.user.email || '' 
          });
        }
      } catch (err) {
        console.error('Failed to fetch user', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUser(data.data.user);
        alert('Profile updated successfully!');
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (err) {
      alert('Network error saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = user?.plan === 'PRO' ? '/api/billing/portal-session' : '/api/billing/checkout-session';
      
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      if (data.status === 'success' && data.data.url) {
        window.location.href = data.data.url;
      } else {
        alert(data.message || 'Failed to connect to billing provider.');
      }
    } catch (err) {
      alert('Network error while connecting to billing.');
    } finally {
      setBillingLoading(false);
    }
  };

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
            <Link to="/reminders" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
              <Bell className="h-4 w-4" />
              Reminders
            </Link>
            <Link to="/settings" className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all">
              <SettingsIcon className="h-4 w-4" />
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
          <h1 className="text-lg font-semibold">Settings</h1>
        </header>

        <div className="p-6 max-w-4xl">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Manage your account identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 flex h-10 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <div className="mt-1 text-sm font-medium">
                      {user?.email}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                    <div className="mt-1 text-sm font-mono text-muted-foreground">{user?.id}</div>
                  </div>
                  <div className="pt-2">
                    <Button onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Manage your billing and plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div>
                      <div className="font-semibold text-lg">
                        {user?.plan === 'PRO' ? 'Renewal Radar Pro' : 'Free Plan'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user?.plan === 'PRO' 
                          ? 'You have unlimited access to all features.' 
                          : 'You are limited to tracking 5 active contracts.'}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
                      {user?.plan}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleManageBilling} disabled={billingLoading} className={user?.plan === 'FREE' ? 'w-full sm:w-auto' : 'w-full sm:w-auto'} variant={user?.plan === 'FREE' ? 'default' : 'outline'}>
                      {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {user?.plan === 'PRO' ? 'Manage Billing in Stripe' : 'Upgrade to Pro'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
