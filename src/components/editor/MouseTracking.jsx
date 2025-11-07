import React, { useMemo } from 'react';

export default function MouseTrackingOverlay({ mousePositions = {}, editorRef }) {
  // Filter out stale positions and own cursor
  const activeMousePositions = useMemo(() => {
    if (!mousePositions || typeof mousePositions !== 'object') {
      return {};
    }

    const now = Date.now();
    const filtered = {};
    
    Object.entries(mousePositions).forEach(([userId, pos]) => {
      // Only show if position is recent (within last 3 seconds)
      if (pos && pos.timestamp && (now - pos.timestamp) < 3000) {
        filtered[userId] = pos;
      }
    });
    
    return filtered;
  }, [mousePositions]);

  if (!editorRef?.current || Object.keys(activeMousePositions).length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Object.entries(activeMousePositions).map(([userId, pos]) => (
        <MouseCursor
          key={userId}
          userId={userId}
          position={pos}
        />
      ))}
    </div>
  );
}

function MouseCursor({ userId, position }) {
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-2px, -2px)',
        transition: 'all 0.15s ease-out',
        pointerEvents: 'none',
      }}
    >
      {/* Mouse pointer SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        <path
          d="M5.65376 12.3673L8.43628 19.2819C8.59725 19.6928 9.15877 19.6928 9.31974 19.2819L12.1023 12.3673L19.0169 9.58476C19.4278 9.42379 19.4278 8.86227 19.0169 8.7013L12.1023 5.91878L9.31974 -1.00354C9.15877 -1.41451 8.59725 -1.41451 8.43628 -1.00354L5.65376 5.91878L-1.26856 8.7013C-1.67953 8.86227 -1.67953 9.42379 -1.26856 9.58476L5.65376 12.3673Z"
          fill={position.color || '#3B82F6'}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* User name label */}
      {position.name && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: '0',
            backgroundColor: position.color || '#3B82F6',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {position.name}
        </div>
      )}
    </div>
  );
}