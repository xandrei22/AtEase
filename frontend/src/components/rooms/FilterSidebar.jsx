import { useState } from 'react';
import { ROOM_TYPES, AMENITY_OPTIONS } from '../../data/mockRooms';

export default function FilterSidebar({ filters, onFiltersChange }) {
  const [priceMinInput, setPriceMinInput] = useState(String(filters.priceMin ?? 50));
  const [priceMaxInput, setPriceMaxInput] = useState(String(filters.priceMax ?? 500));
  const [roomTypes, setRoomTypes] = useState(filters.roomTypes ?? []);
  const [amenities, setAmenities] = useState(filters.amenities ?? []);
  const [minRating, setMinRating] = useState(filters.minRating ?? 0);
  const [guestsInput, setGuestsInput] = useState(filters.guests == null ? '' : String(filters.guests));

  const toggleRoomType = (type) => {
    const next = roomTypes.includes(type) ? roomTypes.filter((t) => t !== type) : [...roomTypes, type];
    setRoomTypes(next);
    onFiltersChange({ ...filters, roomTypes: next });
  };

  const toggleAmenity = (a) => {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    setAmenities(next);
    onFiltersChange({ ...filters, amenities: next });
  };

  const applyPrice = () => {
    const min = priceMinInput === '' ? undefined : Number(priceMinInput);
    const max = priceMaxInput === '' ? undefined : Number(priceMaxInput);
    onFiltersChange({
      ...filters,
      priceMin: min ?? 0,
      priceMax: max ?? 500,
    });
  };

  const applyRating = (r) => {
    const val = minRating === r ? 0 : r;
    setMinRating(val);
    onFiltersChange({ ...filters, minRating: val });
  };

  const applyGuests = () => {
    const trimmed = guestsInput.trim();
    const val = trimmed === '' ? null : Math.max(1, parseInt(trimmed, 10) || null);
    setGuestsInput(trimmed === '' ? '' : String(val ?? ''));
    onFiltersChange({ ...filters, guests: val });
  };

  return (
    <aside className="w-full rounded-xl border border-border bg-background p-4 md:w-64">
      <h3 className="font-bold text-foreground mb-4">Filters</h3>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Price per night</p>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="price-min" className="text-xs text-muted-foreground">Min</label>
              <input
                id="price-min"
                type="number"
                min={0}
                placeholder="Min"
                value={priceMinInput}
                onChange={(e) => setPriceMinInput(e.target.value)}
                className="w-24 rounded border border-border pl-2 pr-8 py-1 text-sm"
              />
            </div>
            <span className="self-end pb-2 text-muted-foreground">–</span>
            <div className="flex flex-col gap-0.5">
              <label htmlFor="price-max" className="text-xs text-muted-foreground">Max</label>
              <input
                id="price-max"
                type="number"
                min={0}
                placeholder="Max"
                value={priceMaxInput}
                onChange={(e) => setPriceMaxInput(e.target.value)}
                className="w-24 rounded border border-border pl-2 pr-8 py-1 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyPrice}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Apply
          </button>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Room type</p>
          <div className="space-y-1">
            {ROOM_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={roomTypes.includes(type)}
                  onChange={() => toggleRoomType(type)}
                  className="rounded border-border"
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Amenities</p>
          <div className="space-y-1">
            {AMENITY_OPTIONS.slice(0, 6).map((a) => (
              <label key={a} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={amenities.includes(a)}
                  onChange={() => toggleAmenity(a)}
                  className="rounded border-border"
                />
                <span className="text-sm">{a}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Rating</p>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => applyRating(r)}
                title={`${r}+ stars`}
                className="p-0.5 text-2xl leading-none transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                aria-label={`Minimum ${r} star${r === 1 ? '' : 's'}`}
              >
                <span className={minRating >= r ? 'text-amber-400' : 'text-muted-foreground/40'}>
                  ★
                </span>
              </button>
            ))}
          </div>
          {minRating > 0 && (
            <button
              type="button"
              onClick={() => applyRating(minRating)}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear rating
            </button>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Guests (min)</p>
          <div className="flex items-center gap-2">
            <input
              id="filter-guests"
              type="number"
              min={1}
              placeholder="Any"
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              onBlur={applyGuests}
              onKeyDown={(e) => e.key === 'Enter' && applyGuests()}
              className="w-24 rounded border border-border pl-2 pr-8 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={applyGuests}
              className="text-sm font-medium text-primary hover:underline"
            >
              Apply
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Rooms that fit at least this many guests</p>
        </div>
      </div>
    </aside>
  );
}
