import { Link } from 'react-router-dom';
import SearchForm from '../components/home/SearchForm';

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-visible bg-muted/30 py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h1 className="text-4xl font-bold text-foreground md:text-5xl">
            Find Your Perfect Stay
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Compare prices, read reviews, and book rooms with secure payment and free cancellation on many properties.
          </p>
          <div className="relative z-10 mt-8 flex justify-center overflow-visible">
            <SearchForm />
          </div>
        </div>
      </section>
      <section className="relative z-0 mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why Book With Us</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-bold text-foreground text-lg">Secure Payment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment information is encrypted. We never store your full card details.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="text-3xl mb-2">✓</div>
            <h3 className="font-bold text-foreground text-lg">Best Price Guarantee</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Found a lower price? We'll match it. Plus free cancellation on most rooms.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="text-3xl mb-2">📞</div>
            <h3 className="font-bold text-foreground text-lg">24/7 Support</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Need help? Our support team is available around the clock for your peace of mind.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-primary/10 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h2 className="text-2xl font-bold text-foreground">Ready to Explore?</h2>
          <p className="mt-2 text-muted-foreground">Browse all available rooms and find your next getaway.</p>
          <Link
            to="/rooms"
            className="mt-6 inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-white hover:bg-primary/90"
          >
            Browse All Rooms
          </Link>
        </div>
      </section>
    </div>
  );
}
