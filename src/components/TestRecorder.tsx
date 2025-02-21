import React, { useState } from 'react';
import { RecordedEvent, TestFlow } from '../types/flow';

export const TestRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState<RecordedEvent[]>([]);

  const startRecording = () => {
    window.__arten.startRecording((event) => {
      setEvents(prev => [...prev, event]);
    });
    setIsRecording(true);
  };

  const stopRecording = () => {
    window.__arten.stopRecording();
    setIsRecording(false);
  };

  const convertToFlow = (): TestFlow => {
    return {
      id: crypto.randomUUID(),
      name: `Recorded Flow ${new Date().toLocaleString()}`,
      description: 'Automatically generated from recorded events',
      nodes: events.map((event, index) => ({
        id: `node-${index}`,
        type: 'action',
        position: { x: 100, y: index * 100 },
        data: {
          label: `${event.type} ${event.path}`,
          action: {
            type: event.type as any,
            selector: event.path,
            value: event.value
          }
        }
      })),
      edges: events.slice(1).map((_, index) => ({
        id: `edge-${index}`,
        source: `node-${index}`,
        target: `node-${index + 1}`
      }))
    };
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
}; 