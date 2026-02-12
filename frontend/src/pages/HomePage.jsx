import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SearchForm from '../components/home/SearchForm';

import ah1 from '../assets/ah1.png';
import ah2 from '../assets/ah2.png';
import ah3 from '../assets/ah3.png';

const CAROUSEL_IMAGES = [ah1, ah2, ah3];
const CAROUSEL_INTERVAL = 5000;

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden py-12 md:py-20">
        {/* Carousel background */}
        <div className="absolute inset-0">
          {CAROUSEL_IMAGES.map((src, i) => (
            <div
              key={i}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out ${
                i === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${src})` }}
              aria-hidden={i !== activeIndex}
            />
          ))}
          <div className="absolute inset-0 bg-black/50" aria-hidden />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 text-center md:px-6">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg md:text-5xl">
            Find Your Perfect Stay
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90 drop-shadow">
            Compare prices, read reviews, and book rooms with secure payment and free cancellation on many properties.
          </p>
          <div className="relative z-10 mt-8 flex justify-center overflow-visible">
            <SearchForm />
          </div>

          {/* Carousel dots */}
          <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Carousel">
            {CAROUSEL_IMAGES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i === activeIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="relative z-0 mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why Book With Us</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="flex justify-center text-3xl mb-2">🔒</div>
            <h3 className="font-bold text-foreground flex justify-center text-lg">Secure Payment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment information is encrypted. We never store your full card details.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="flex justify-center text-3xl mb-2">✓</div>
            <h3 className="font-bold text-foreground flex justify-center text-lg">Best Price Guarantee</h3>   
            <p className="mt-2 text-sm text-muted-foreground">
              Found a lower price? We'll match it. Plus free cancellation on most rooms.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="flex justify-center text-3xl mb-2">📞</div>
            <h3 className="font-bold text-foreground flex justify-center text-lg">24/7 Support</h3>
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
