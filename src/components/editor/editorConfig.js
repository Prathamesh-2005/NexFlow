import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Highlight from "@tiptap/extension-highlight";
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import MentionList from './MentionList';

const lowlight = createLowlight(common);

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const CursorPluginKey = new PluginKey('customCursors');
export const CustomCursors = Extension.create({
  name: 'customCursors',

  addOptions() {
    return {
      cursors: {},
      onCursorUpdate: () => {},
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: CursorPluginKey,
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          
          apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            
            const decorations = [];
            
            // Get fresh cursors from extension options
            const cursors = extension.options.cursors || {};
            
            console.log('🎨 Rendering cursors:', Object.keys(cursors).length, cursors);
            
            Object.entries(cursors).forEach(([userId, cursor]) => {
              if (cursor && cursor.position >= 0 && cursor.position <= tr.doc.content.size) {
                const decoration = Decoration.widget(cursor.position, () => {
                  const wrapper = document.createElement('span');
                  wrapper.className = 'collaboration-cursor__caret';
                  wrapper.style.cssText = `
                    border-left: 2px solid ${cursor.color};
                    margin-left: -1px;
                    height: 1.2em;
                    position: relative;
                    display: inline-block;
                  `;

                  const label = document.createElement('span');
                  label.className = 'collaboration-cursor__label';
                  label.style.cssText = `
                    background-color: ${cursor.color};
                    color: white;
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 11px;
                    font-weight: 600;
                    position: absolute;
                    top: -1.6em;
                    left: 0;
                    white-space: nowrap;
                    z-index: 10;
                    pointer-events: none;
                  `;
                  label.textContent = cursor.name || 'Unknown';

                  wrapper.appendChild(label);
                  return wrapper;
                });

                decorations.push(decoration);
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        
        view() {
          let lastPosition = -1;
          
          return {
            update: (view) => {
              const { from } = view.state.selection;
              
              // Only broadcast if position actually changed
              if (from !== lastPosition) {
                lastPosition = from;
                // Get fresh onCursorUpdate from extension options
                const onCursorUpdate = extension.options.onCursorUpdate;
                if (onCursorUpdate && typeof onCursorUpdate === 'function') {
                  onCursorUpdate(from);
                }
              }
            },
          };
        },
      }),
    ];
  },
});

export function getEditorExtensions(yDoc, mentionUsers = [], cursorOptions = {}) {
  const extensions = [
    StarterKit.configure({
      history: false,
      codeBlock: false,
    }),
    Underline,
    Link.configure({ 
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
      },
    }),
    Image.configure({ 
      inline: true, 
      allowBase64: true,
      HTMLAttributes: {
        class: 'rounded-lg max-w-full h-auto my-2',
      },
    }),
    Table.configure({ 
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4',
      },
    }),
    TableRow.configure({
      HTMLAttributes: {
        class: 'border border-gray-300',
      },
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'border border-gray-300 bg-gray-100 font-bold px-4 py-2',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-gray-300 px-4 py-2',
      },
    }),
    Highlight.configure({ 
      multicolor: true,
      HTMLAttributes: {
        class: 'bg-yellow-200 rounded px-1',
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: {
        class: 'bg-gray-900 text-gray-100 rounded-md p-4 my-4 overflow-x-auto',
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return 'Heading';
        }
        return 'Start writing... Type @ to mention, / for commands';
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: 'list-none pl-0 my-4',
      },
    }),
    TaskItem.configure({ 
      nested: true,
      HTMLAttributes: {
        class: 'flex items-start my-2',
      },
    }),
    Mention.configure({
      HTMLAttributes: { 
        class: 'mention bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium',
      },
      suggestion: {
        items: ({ query }) => {
          return mentionUsers
            .filter(user => 
              user.label?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 10);
        },
        render: () => {
          let component;
          let popup;

          return {
            onStart: (props) => {
              component = new ReactRenderer(MentionList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }

              return component.ref?.onKeyDown(props);
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    }),

    // Add custom cursors extension
    CustomCursors.configure(cursorOptions),
  ];

  // Add Y.js Collaboration if yDoc exists
  if (yDoc) {
    extensions.push(
      Collaboration.configure({
        document: yDoc,
      })
    );
  }

  return extensions;
}

export const editorProps = {
  attributes: {
    class: 'prose prose-slate max-w-none focus:outline-none px-8 py-6 min-h-[500px]',
  },
};