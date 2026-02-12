import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-bold text-primary text-lg">AtEase</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your trusted hotel booking platform. Secure payments and best price guarantee.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary hover:underline">Home</Link></li>
              <li><Link to="/rooms" className="hover:text-primary hover:underline">Search Rooms</Link></li>
              <li><Link to="/bookings" className="hover:text-primary hover:underline">My Bookings</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><a href="mailto:support@atease.com" className="hover:text-primary hover:underline">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary hover:underline">FAQ</a></li>
              <li><a href="#" className="hover:text-primary hover:underline">Cancellation Policy</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Secure Payment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We use encrypted payment processing. Your data is safe with us.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AtEase. All rights reserved.</span>
          <Link to="/admin/login" className="hover:text-primary hover:underline">Admin? Sign in here</Link>
        </div>
      </div>
    </footer>
  );
}
