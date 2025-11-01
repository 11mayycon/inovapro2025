import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import loja1 from '@/assets/loja-1.jpg';
import loja2 from '@/assets/loja-2.jpg';
import loja3 from '@/assets/loja-3.jpg';
import loja4 from '@/assets/loja-4.jpg';
import loja5 from '@/assets/loja-5.jpg';

const images = [loja1, loja2, loja3, loja4, loja5];

export function BackgroundSlider() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false })
  ]);

  return (
    <div className="fixed inset-0 -z-20">
      <div className="embla overflow-hidden h-full" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {images.map((image, index) => (
            <div
              key={index}
              className="embla__slide flex-[0_0_100%] min-w-0 relative"
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${image})`,
                }}
              />
              {/* Overlay escuro */}
              <div className="absolute inset-0 bg-black/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
