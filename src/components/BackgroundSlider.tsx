import supermercadoBg from '@/assets/supermercado-bg.jpg';

export function BackgroundSlider() {
  return (
    <div className="fixed inset-0 -z-20">
      <div className="h-full w-full">
        <div className="h-full w-full relative">
          <img
            src={supermercadoBg}
            alt="PDV-INOVAPRO"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>
      </div>
    </div>
  );
}
