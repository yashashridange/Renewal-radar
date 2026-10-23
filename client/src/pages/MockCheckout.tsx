import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

export default function MockCheckout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect back to settings after 3 seconds
    const timer = setTimeout(() => {
      navigate('/settings?success=true&mock=true');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Mock Stripe Checkout</CardTitle>
          <CardDescription>
            You are using dummy Stripe keys, so we skipped the real checkout page!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            We are processing your test upgrade in the background. You will automatically be redirected back to the app in a few seconds...
          </p>
          <div className="flex items-center gap-2 text-primary font-medium">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Simulating Payment...</span>
          </div>
          
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/settings?success=true&mock=true')}>
            Skip and Return Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
