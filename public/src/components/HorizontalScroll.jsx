import { useRef } from 'react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

export default function HorizontalScroll({ title, children, viewAllLink }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-4 desktop:px-0">
        <h2 className="text-lg desktop:text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {viewAllLink && (
            <a
              href={viewAllLink}
              className="text-xs text-accent-yellow hover:text-accent-gold font-medium"
            >
              View All
            </a>
          )}
          <button
            onClick={() => scroll('left')}
            className="hidden desktop:flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <BsChevronLeft className="text-sm" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="hidden desktop:flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <BsChevronRight className="text-sm" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 desktop:px-0 pb-2 hide-scrollbar"
      >
        {children}
      </div>
    </section>
  );
}
