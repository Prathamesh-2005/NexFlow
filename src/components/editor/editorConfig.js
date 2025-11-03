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
import TextAlign from "@tiptap/extension-text-align";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import MentionList from './MentionList';
import { supabase } from '../../config/supabaseClient';

const lowlight = createLowlight(common);

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// Image upload handler with enhanced logging
export const uploadImage = async (file, toast) => {
  console.log('🖼️ Starting image upload:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      const error = 'File must be an image';
      console.error('❌ Upload failed:', error);
      throw new Error(error);
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      const error = 'Image must be less than 5MB';
      console.error('❌ Upload failed:', error);
      throw new Error(error);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('📤 Uploading to Supabase:', filePath);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('page-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('page-images')
      .getPublicUrl(filePath);

    console.log('🔗 Public URL generated:', publicUrl);

    if (toast) {
      toast.success('Image uploaded successfully');
    }

    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    if (toast) {
      toast.error(`Failed to upload image: ${error.message}`);
    }
    throw error;
  }
};

// Custom Image extension with enhanced upload support and logging
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) {
            return {};
          }
          return { src: attributes.src };
        },
      },
      alt: {
        default: null,
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => {
          if (!attributes.alt) {
            return {};
          }
          return { alt: attributes.alt };
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {};
          }
          return { title: attributes.title };
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return { height: attributes.height };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImage: (options) => ({ commands, state }) => {
        console.log('🎨 Inserting image into editor:', options);
        
        const { selection } = state;
        const position = selection.$head ? selection.$head.pos : 0;
        
        console.log('📍 Insert position:', position);
        
        const result = commands.insertContent({
          type: this.name,
          attrs: options,
        });
        
        console.log('✅ Image insertion result:', result);
        return result;
      },
      uploadAndInsertImage: (file, toast) => async ({ editor }) => {
        console.log('🚀 Starting uploadAndInsertImage command');
        
        try {
          // Show loading toast
          if (toast) {
            toast.info('Uploading image...');
          }

          // Upload image first
          const url = await uploadImage(file, toast);

          console.log('🎯 Image uploaded, URL:', url);

          // Insert image using setImage command (without focus)
          // We'll handle focus separately in the toolbar
          const success = editor.commands.setImage({ 
            src: url,
            alt: file.name,
          });

          console.log('📝 Image insertion command success:', success);

          if (success) {
            console.log('✅ Image inserted successfully into editor');
            
            // Verify the image is in the document
            setTimeout(() => {
              const html = editor.getHTML();
              const hasImage = html.includes('<img');
              const imgMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*>/);
              console.log('📄 Editor HTML verification:', {
                hasImage,
                imageUrl: imgMatch ? imgMatch[1] : 'NO IMAGE FOUND',
                fullHTML: html,
                htmlLength: html.length
              });
              
              // Check if image is actually in the DOM
              const editorImages = document.querySelectorAll('.ProseMirror img');
              console.log('🖼️ Images in DOM:', editorImages.length, Array.from(editorImages).map(img => img.src));
            }, 100);
          } else {
            console.error('❌ Image insertion command returned false');
          }

          return success;
        } catch (error) {
          console.error('❌ Upload and insert failed:', error);
          if (toast) {
            toast.error(`Failed to upload image: ${error.message}`);
          }
          return false;
        }
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageDrop'),
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              console.log('📦 Drop event detected');
              
              const hasFiles = event.dataTransfer?.files?.length;

              if (!hasFiles) {
                console.log('⏭️ No files in drop event');
                return false;
              }

              const images = Array.from(event.dataTransfer.files).filter(file =>
                file.type.startsWith('image/')
              );

              console.log('🖼️ Images found in drop:', images.length);

              if (images.length === 0) {
                return false;
              }

              event.preventDefault();

              const { schema } = view.state;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });

              console.log('📍 Drop coordinates:', coordinates);

              images.forEach(async (image, index) => {
                try {
                  console.log(`📤 Processing dropped image ${index + 1}/${images.length}`);
                  const url = await uploadImage(image);
                  
                  console.log('✅ Upload complete, inserting at position:', coordinates.pos);
                  
                  const node = schema.nodes.image.create({ 
                    src: url,
                    alt: image.name,
                  });
                  
                  const transaction = view.state.tr.insert(coordinates.pos, node);
                  view.dispatch(transaction);
                  
                  console.log('✅ Image node inserted via drop');
                } catch (error) {
                  console.error('❌ Failed to upload dropped image:', error);
                }
              });

              return true;
            },
            paste: (view, event) => {
              console.log('📋 Paste event detected');
              
              const hasFiles = event.clipboardData?.files?.length;

              if (!hasFiles) {
                console.log('⏭️ No files in paste event');
                return false;
              }

              const images = Array.from(event.clipboardData.files).filter(file =>
                file.type.startsWith('image/')
              );

              console.log('🖼️ Images found in paste:', images.length);

              if (images.length === 0) {
                return false;
              }

              event.preventDefault();

              images.forEach(async (image, index) => {
                try {
                  console.log(`📤 Processing pasted image ${index + 1}/${images.length}`);
                  const url = await uploadImage(image);
                  
                  console.log('✅ Upload complete, inserting via paste');
                  
                  const node = view.state.schema.nodes.image.create({ 
                    src: url,
                    alt: `pasted-image-${Date.now()}`,
                  });
                  
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                  
                  console.log('✅ Image node inserted via paste');
                } catch (error) {
                  console.error('❌ Failed to upload pasted image:', error);
                }
              });

              return true;
            },
          },
        },
      }),
    ];
  },
});

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
      horizontalRule: false,
    }),
    Underline,
    Link.configure({ 
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
      },
    }),
    CustomImage.configure({ 
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'rounded-lg max-w-full h-auto my-2 cursor-pointer block',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    HorizontalRule.configure({
      HTMLAttributes: {
        class: 'my-4 border-gray-300',
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