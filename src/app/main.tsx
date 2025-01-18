"use client";

import React, { useRef, useState, useEffect } from 'react';
import { core } from "@tauri-apps/api";
import { Wifi } from 'lucide-react';

const App = () => {
  const [deviceConnected, setDeviceConnected] = useState(false);

  const ws = useRef<WebSocket | null>(null);

  const isProcessing = useRef(false);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target) {
      target.classList.add("scale-95", "shadow-active");
      setTimeout(() => {
        target.classList.remove("scale-95", "shadow-active");
      }, 100); // Adjust delay as needed
    }
  };

  ////

  //////
  const channels = 8;
  const [connect, setConnect] = useState(false);



  useEffect(() => {
    if (!connect) return;

    const webSocket = new WebSocket("ws://oric.local:81");
    ws.current = webSocket;

    webSocket.onopen = () => {
      console.log("WebSocket connection established.");
      const channelConfig = [];
      channelConfig.push(
        { command: "reset", parameters: [] },
        { command: "sdatac", parameters: [] },
        { command: "wreg", parameters: [0x01, 0b10010011] },
        { command: "wreg", parameters: [0x02, 0xC0] },
        { command: "wreg", parameters: [0x03, 0xEC] },
        { command: "wreg", parameters: [0x15, 0b00100000] },
        { command: "wreg", parameters: [0x05, 0x60] },
        { command: "wreg", parameters: [0x06, 0x60] },
        { command: "wreg", parameters: [0x07, 0x60] },
        { command: "wreg", parameters: [0x08, 0x60] },
        { command: "wreg", parameters: [0x09, 0x60] },
        { command: "wreg", parameters: [0x0A, 0x60] },
        { command: "wreg", parameters: [0x0B, 0x60] },
        { command: "wreg", parameters: [0x0C, 0x60] },
        { command: "status", parameters: [] },
        { command: "rdatac", parameters: [] }
      );

      channelConfig.forEach((cmd) => webSocket.send(JSON.stringify(cmd)));
      console.log(channelConfig);
    };

    webSocket.onmessage = (event) => {
      isProcessing.current = true;
      setDeviceConnected(true);
      const data = event.data;

      if (typeof data === "string") {
        console.warn("Unexpected string data received:", data);
        return;
      }

      if (data instanceof Blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const buffer = Buffer.from(reader.result as ArrayBuffer);
          const blockSize = 32;
          for (let blockLocation = 0; blockLocation < buffer.length; blockLocation += blockSize) {
            const block = buffer.slice(blockLocation, blockLocation + blockSize);
            const channelData: number[] = [];
            for (let channel = 0; channel < 8; channel++) {
              const offset = 8 + channel * 3;
              const sample = block.readIntBE(offset, 3);
              channelData.push(sample);
            }
            // Start sending data continuously at intervals
         
            core.invoke('start_streaming', { channelData: channelData })
              .then((response) => {
                console.log('Data sent to backend successfully:', response);
              })
              .catch((error) => {
                console.error('Error sending data to backend:', error);
              });            
            // console.log(channelData);

          }
        };
        reader.readAsArrayBuffer(data);
      } else {
        console.error("Unexpected data format received:", data);
      }
    };

    webSocket.onclose = () => {
      setConnect(false);
      console.log("WebSocket connection closed.");
    };

    return () => {
      webSocket.close();
    };
  }, [connect, channels,]);


  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200">
      <div
        onClick={() => {  setConnect(true); }
        }
        onMouseDown={handleMouseDown}

        className={`
          flex items-center justify-center w-28 h-28 rounded-full cursor-pointer bg-gray-200 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] 
          transition-all duration-600 relative ${isProcessing.current ? 'animate-[rotateShadow_1.5s_linear_infinite]' : ''}
        `}
        style={{ pointerEvents: isProcessing.current ? 'none' : 'auto' }}
      >
        <Wifi
          size={40}
          className={`transition-colors duration-300 ${deviceConnected ? 'text-green-500' : 'text-gray-500'
            }`}
        />
      </div>
    </div>
  );
};

export default App;
