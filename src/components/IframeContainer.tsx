import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface IframeContainerProps {
  children: React.ReactNode;
}

export const IframeContainer = ({ children }: IframeContainerProps) => {
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 25));
  };

  const handleResetZoom = () => {
    setZoom(100);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: containerRef.current.scrollWidth / 2 - containerRef.current.clientWidth / 2,
        top: containerRef.current.scrollHeight / 2 - containerRef.current.clientHeight / 2,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-end gap-2 p-2 border-b">
        <div className="text-sm text-muted-foreground mr-2">{zoom}%</div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 25}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleResetZoom}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 200}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-accent/5"
      >
        <div 
          className="min-h-full flex items-center justify-center p-4"
          style={{
            minWidth: `${1024 * (zoom / 100)}px`,
            minHeight: `${768 * (zoom / 100)}px`
          }}
        >
          <div 
            className="relative bg-white shadow-lg rounded-lg overflow-hidden"
            style={{
              width: '1024px',
              height: '768px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}; 