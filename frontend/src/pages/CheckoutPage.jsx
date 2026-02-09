import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';

function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.ceil((b - a) / (24 * 60 * 60 * 1000)));
}

function luhnCheck(value) {
  const digits = value.replace(/\D/g, '');
  let sum = 0;
  let even = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (even) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    even = !even;
  }
  return sum % 10 === 0;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {
    selectedRoom,
    checkoutDates,
    setSelectedRoom,
    addBooking,
    setLastConfirmation,
    userProfile,
    setUserProfile,
  } = useBooking();

  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    fullName: userProfile.name || '',
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    specialRequests: '',
    street: userProfile.address?.street || '',
    city: userProfile.address?.city || '',
    state: userProfile.address?.state || '',
    postalCode: userProfile.address?.postalCode || '',
    country: userProfile.address?.country || '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    saveCard: false,
    agreePolicy: false,
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});

  const room = selectedRoom;
  const { checkIn, checkOut, guests } = checkoutDates;
  const nights = getNights(checkIn, checkOut);
  const subtotal = room ? room.pricePerNight * nights : 0;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax;

  if (!room) {
    navigate('/rooms');
    return null;
  }

  const validate = () => {
    const e = {};
    if (!form.fullName?.trim()) e.fullName = 'Required';
    if (!form.email?.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone?.trim()) e.phone = 'Required';
    if (!form.cardName?.trim()) e.cardName = 'Required';
    const digits = (form.cardNumber || '').replace(/\D/g, '');
    if (digits.length < 13) e.cardNumber = 'Invalid card number';
    else if (!luhnCheck(form.cardNumber)) e.cardNumber = 'Invalid card number';
    if (!/^\d{2}\/\d{2}$/.test(form.cardExpiry)) e.cardExpiry = 'Use MM/YY';
    if (!/^\d{3,4}$/.test(form.cardCvv)) e.cardCvv = 'Invalid CVV';
    if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlaceBooking = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setUserProfile({
      name: form.fullName,
      email: form.email,
      phone: form.phone,
      address: {
        street: form.street,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
      },
    });
    try {
      const booking = await addBooking({
        room,
        checkIn,
        checkOut,
        nights,
        guests,
        subtotal,
        tax,
        total,
        guestName: form.fullName,
        email: form.email,
        phone: form.phone,
        specialRequests: form.specialRequests,
      });
      setLastConfirmation(booking);
      setSelectedRoom(null);
      navigate('/confirmation');
    } catch (err) {
      setSubmitError(err?.message || 'Booking failed. Please try again.');
    }
  };

  const inputClass = (field) =>
    `w-full rounded-lg border px-4 py-2.5 ${errors[field] ? 'border-red-500' : 'border-border'} focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-foreground mb-8">Checkout</h1>
      {submitError && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {submitError}
        </div>
      )}
      <form onSubmit={handlePlaceBooking} className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Guest information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Full name *</label>
                <input
                  className={inputClass('fullName')}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  className={inputClass('email')}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  type="tel"
                  className={inputClass('phone')}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Special requests</label>
                <textarea
                  className={inputClass('specialRequests')}
                  rows={3}
                  value={form.specialRequests}
                  onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                  placeholder="Early check-in, late checkout, etc."
                />
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Billing address</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <input className={inputClass('street')} value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Street address" />
              </div>
              <div>
                <input className={inputClass('city')} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" />
              </div>
              <div>
                <input className={inputClass('state')} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" />
              </div>
              <div>
                <input className={inputClass('postalCode')} value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="Postal code" />
              </div>
              <div>
                <input className={inputClass('country')} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="Country" />
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Payment</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cardholder name *</label>
                <input className={inputClass('cardName')} value={form.cardName} onChange={(e) => setForm((f) => ({ ...f, cardName: e.target.value }))} placeholder="Name on card" />
                {errors.cardName && <p className="mt-1 text-sm text-red-500">{errors.cardName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Card number *</label>
                <input
                  className={inputClass('cardNumber')}
                  value={form.cardNumber}
                  onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
                {errors.cardNumber && <p className="mt-1 text-sm text-red-500">{errors.cardNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry (MM/YY) *</label>
                  <input
                    className={inputClass('cardExpiry')}
                    value={form.cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                      setForm((f) => ({ ...f, cardExpiry: v }));
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  {errors.cardExpiry && <p className="mt-1 text-sm text-red-500">{errors.cardExpiry}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CVV *</label>
                  <input
                    type="password"
                    className={inputClass('cardCvv')}
                    value={form.cardCvv}
                    onChange={(e) => setForm((f) => ({ ...f, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="123"
                    maxLength={4}
                  />
                  {errors.cardCvv && <p className="mt-1 text-sm text-red-500">{errors.cardCvv}</p>}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.saveCard} onChange={(e) => setForm((f) => ({ ...f, saveCard: e.target.checked }))} />
                <span className="text-sm">Save card for future bookings</span>
              </label>
            </div>
          </section>
          <section className="rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground mb-2">Cancellation policy: Free cancellation up to 48 hours before check-in.</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.agreePolicy} onChange={(e) => setForm((f) => ({ ...f, agreePolicy: e.target.checked }))} />
              <span className="text-sm">I agree to the cancellation policy</span>
            </label>
            <label className="mt-4 flex items-center gap-2">
              <input type="checkbox" checked={form.agreeTerms} onChange={(e) => setForm((f) => ({ ...f, agreeTerms: e.target.checked }))} />
              <span className="text-sm">I agree to the terms of service *</span>
            </label>
            {errors.agreeTerms && <p className="mt-1 text-sm text-red-500">{errors.agreeTerms}</p>}
          </section>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Booking summary</h2>
            <div className="flex gap-4">
              <img src={room.image} alt="" className="h-20 w-24 rounded-lg object-cover" />
              <div>
                <p className="font-semibold text-foreground">{room.name}</p>
                <p className="text-sm text-muted-foreground">{room.hotelName}</p>
                <p className="text-sm text-muted-foreground">{checkIn} – {checkOut}</p>
                <p className="text-sm text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''} • {guests} guest{guests !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1 border-t border-border pt-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₱{subtotal}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxes & fees</span><span>₱{tax}</span></div>
              <div className="flex justify-between font-bold pt-2"><span>Total</span><span>₱{total}</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-secondary/20 px-2 py-1 text-secondary">Secure Payment</span>
              <span className="rounded bg-secondary/20 px-2 py-1 text-secondary">Free Cancellation</span>
              <span className="rounded bg-secondary/20 px-2 py-1 text-secondary">Best Price</span>
            </div>
            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90"
            >
              Place Booking
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
