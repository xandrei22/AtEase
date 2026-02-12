import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { formatDateDisplay } from '../utils/format';
import PasswordInput from '../components/PasswordInput';

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
    paymentMethod: 'card',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    saveCard: false,
    agreePolicy: false,
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [mockPaymentOpen, setMockPaymentOpen] = useState(false);
  const [mockPaymentSubmitting, setMockPaymentSubmitting] = useState(false);
  const [mockMobileNumber, setMockMobileNumber] = useState('');
  const [mockPaymentError, setMockPaymentError] = useState('');
  const submitErrorRef = useRef(null);

  const room = selectedRoom;
  const { checkIn, checkOut, guests } = checkoutDates;
  const nights = getNights(checkIn, checkOut);
  const subtotal = room ? room.pricePerNight * nights : 0;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax;

  if (!room) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground mb-4">No room selected. Redirecting to rooms...</p>
          <button onClick={() => navigate('/rooms')} className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">
            Go to Rooms
          </button>
        </div>
      </div>
    );
  }
  if (!checkIn || !checkOut) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-12 text-center">
          <p className="text-amber-800 mb-2 font-medium">Check-in and check-out dates are required.</p>
          <p className="text-amber-700 mb-4 text-sm">Please select your dates on the room page.</p>
          <button onClick={() => navigate(`/rooms/${room.id}`)} className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">
            Go Back to Room
          </button>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!form.fullName?.trim()) e.fullName = 'Required';
    if (!form.email?.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone?.trim()) e.phone = 'Required';
    else if ((form.phone || '').replace(/\D/g, '').length !== 11) e.phone = 'Phone number must be exactly 11 digits';
    if (form.paymentMethod === 'card') {
      if (!form.cardName?.trim()) e.cardName = 'Required';
      const digits = (form.cardNumber || '').replace(/\D/g, '');
      if (digits.length < 13) e.cardNumber = 'Invalid card number';
      else if (!luhnCheck(form.cardNumber)) e.cardNumber = 'Invalid card number';
      if (!/^\d{2}\/\d{2}$/.test(form.cardExpiry)) e.cardExpiry = 'Use MM/YY';
      if (!/^\d{3,4}$/.test(form.cardCvv)) e.cardCvv = 'Invalid CVV';
    }
    if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const downpayment = Math.round(total * 0.5);
  const balanceDue = total - downpayment;

  const bookingPayload = () => ({
    room,
    checkIn,
    checkOut,
    nights,
    guests,
    subtotal,
    tax,
    total,
    downpayment,
    payment_method: form.paymentMethod,
    guestName: form.fullName,
    email: form.email,
    phone: form.phone,
    specialRequests: form.specialRequests,
  });

  const handlePlaceBooking = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) {
      setSubmitError('Please fill in all required fields (guest name, email, phone) and agree to the terms, then click Place Booking again.');
      setTimeout(() => submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      return;
    }
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
    if (form.paymentMethod === 'gcash' || form.paymentMethod === 'paymaya') {
      setMockPaymentError('');
      setMockMobileNumber('');
      setMockPaymentOpen(true);
      return;
    }
    try {
      const booking = await addBooking(bookingPayload());
      setLastConfirmation(booking);
      setSelectedRoom(null);
      navigate('/confirmation');
    } catch (err) {
      setSubmitError(err?.message || 'Booking failed. Please try again.');
    }
  };

  const handleMockPaymentConfirm = async () => {
    const mobile = (mockMobileNumber || '').trim().replace(/\D/g, '');
    if (mobile.length !== 11) {
      setMockPaymentError('Enter a valid mobile number (11 digits).');
      return;
    }
    setMockPaymentError('');
    setMockPaymentSubmitting(true);
    try {
      const booking = await addBooking(bookingPayload());
      setLastConfirmation(booking);
      setSelectedRoom(null);
      setMockPaymentOpen(false);
      setMockMobileNumber('');
      navigate('/confirmation');
    } catch (err) {
      const msg = err?.message || '';
      setMockPaymentError(
        msg.includes('Missing room or dates')
          ? 'Check-in and check-out dates are missing. Close this popup, go back to the room page, and choose your dates before booking.'
          : msg || 'Booking failed. Please try again.'
      );
    } finally {
      setMockPaymentSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full rounded-lg border px-4 py-2.5 ${errors[field] ? 'border-red-500' : 'border-border'} focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold text-foreground mb-8">Checkout</h1>
      {submitError && (
        <div ref={submitErrorRef} className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
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
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                  placeholder="e.g. 09171234567"
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
            <p className="text-sm text-muted-foreground mb-3">Choose how you want to pay.</p>
            <p className="text-sm text-amber-800 mb-3 rounded-lg bg-amber-50 px-3 py-2 border border-amber-200">
              <strong>50% downpayment required.</strong> The remaining balance is due at check-in.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { id: 'gcash', label: 'GCash', desc: 'Pay with GCash' },
                { id: 'paymaya', label: 'PayMaya', desc: 'Pay with PayMaya' },
                { id: 'card', label: 'Card', desc: 'Credit or debit card' },
              ].map(({ id, label, desc }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col rounded-xl border-2 px-4 py-3 transition-colors ${
                    form.paymentMethod === id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/20 text-foreground hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={id}
                    checked={form.paymentMethod === id}
                    onChange={() => setForm((f) => ({ ...f, paymentMethod: id }))}
                    className="sr-only"
                  />
                  <span className="font-semibold">{label}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{desc}</span>
                </label>
              ))}
            </div>
            {(form.paymentMethod === 'gcash' || form.paymentMethod === 'paymaya') && (
              <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                <span className="font-medium">Next step:</span> Click <strong>Place Booking</strong> at the bottom of the page. A payment popup will open where you can enter your mobile number and confirm.
              </p>
            )}
            {form.paymentMethod === 'card' && (
              <div className="grid gap-4 pt-2">
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
                    <PasswordInput
                      className={inputClass('cardCvv') + ' w-full'}
                      value={form.cardCvv}
                      onChange={(e) => setForm((f) => ({ ...f, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="123"
                      maxLength={4}
                      aria-label="Card CVV"
                    />
                    {errors.cardCvv && <p className="mt-1 text-sm text-red-500">{errors.cardCvv}</p>}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.saveCard} onChange={(e) => setForm((f) => ({ ...f, saveCard: e.target.checked }))} />
                  <span className="text-sm">Save card for future bookings</span>
                </label>
              </div>
            )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Booking summary</h2>
              <button
                type="button"
                onClick={() => navigate(`/rooms/${room.id}`, { state: { checkIn, checkOut, guests } })}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Edit
              </button>
            </div>
            <div className="flex gap-4">
              <img src={room.image} alt="" className="h-20 w-24 rounded-lg object-cover" />
              <div>
                <p className="font-semibold text-foreground">{room.name}</p>
                <p className="text-sm text-muted-foreground">{room.hotelName}</p>
                <p className="text-sm text-muted-foreground">{formatDateDisplay(checkIn)} – {formatDateDisplay(checkOut)}</p>
                <p className="text-sm text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''} • {guests} guest{guests !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1 border-t border-border pt-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₱{subtotal}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxes & fees</span><span>₱{tax}</span></div>
              <div className="flex justify-between font-bold pt-2"><span>Total</span><span>₱{total}</span></div>
              <div className="flex justify-between text-sm pt-1 border-t border-border mt-1"><span className="text-muted-foreground">Downpayment (50%)</span><span className="font-medium">₱{downpayment}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Balance due at check-in</span><span>₱{balanceDue}</span></div>
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

      {mockPaymentOpen && (form.paymentMethod === 'gcash' || form.paymentMethod === 'paymaya') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${form.paymentMethod === 'gcash' ? 'bg-[#2b2b2b]' : 'bg-[#0050a0]'}`}>
                <span className="text-lg font-bold text-white">
                  {form.paymentMethod === 'gcash' ? 'G' : 'P'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Pay with {form.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}
                </h3>
                <p className="text-sm text-muted-foreground">Mock payment — for demo only</p>
              </div>
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">Amount due</p>
            <p className="mb-4 text-2xl font-bold text-foreground">₱{total}</p>
            <div className="mb-4">
              <label htmlFor="mock-mobile" className="block text-sm font-medium text-foreground mb-1">
                Registered mobile number
              </label>
              <input
                id="mock-mobile"
                type="tel"
                value={mockMobileNumber}
                onChange={(e) => setMockMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="e.g. 09171234567"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {mockPaymentError && <p className="mt-1 text-sm text-red-500">{mockPaymentError}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMockPaymentOpen(false); setMockPaymentError(''); }}
                className="flex-1 rounded-lg border border-border py-2.5 font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMockPaymentConfirm}
                disabled={mockPaymentSubmitting}
                className={`flex-1 rounded-lg py-2.5 font-semibold text-white disabled:opacity-50 ${form.paymentMethod === 'gcash' ? 'bg-[#2b2b2b] hover:bg-[#3d3d3d]' : 'bg-[#0050a0] hover:bg-[#0066cc]'}`}
              >
                {mockPaymentSubmitting ? 'Processing…' : 'Confirm payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
