import { useEffect } from 'react';
import { injectScript } from '@/utils/scriptInjector';
import { Layout } from 'lucide-react';
import { IframeContainer } from './IframeContainer';

interface IframeViewerProps {
  url: string;
  isLoading: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

export const IframeViewer = ({ url, isLoading, iframeRef }: IframeViewerProps) => {
  useEffect(() => {
    if (!url || !iframeRef.current) return;
    const injectedUrl = injectScript(url);
    iframeRef.current.src = injectedUrl;
  }, [url, iframeRef]);

  if (!url) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-muted/5">
        <div className="rounded-lg p-8 bg-background/80 backdrop-blur shadow-sm">
          <Layout className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Welcome to Arten</h3>
          <p className="text-sm text-muted-foreground max-w-[300px]">
            Enter a URL in the input field above to start analyzing and testing your web application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <IframeContainer>
      <iframe
        ref={iframeRef}
        className="w-full h-full border-none"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      )}
    </IframeContainer>
  );
};
