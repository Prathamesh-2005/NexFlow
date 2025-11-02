import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const MentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.label });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-h-64 overflow-y-auto z-50">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
              index === selectedIndex
                ? 'bg-blue-100 text-blue-900'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {item.avatar ? (
              <img 
                src={item.avatar} 
                alt={item.label}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: item.color || '#4ECDC4' }}
              >
                {item.label[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-medium">{item.label}</span>
          </button>
        ))
      ) : (
        <div className="text-gray-500 text-sm px-3 py-2">No users found</div>
      )}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;