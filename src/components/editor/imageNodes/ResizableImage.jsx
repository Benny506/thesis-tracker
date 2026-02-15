import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';

const ResizableImageView = (props) => {
  const { node, selected, getPos } = props;
  const wrapperRef = React.useRef(null);
  const imgRef = React.useRef(null);
  const onClickImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = typeof getPos === 'function' ? getPos() : null;
    const detail = {
      pos,
      src: node.attrs.src,
      width: node.attrs.width || '',
      height: node.attrs.height || '',
    };
    document.dispatchEvent(new CustomEvent('rte-open-image-settings', { detail }));
  };
  return (
    <span
      ref={wrapperRef}
      className={`rte-image-wrap ${selected ? 'is-selected' : ''}`}
      contentEditable={false}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        onClick={onClickImage}
        style={{
          width: node.attrs.width || 'auto',
          height: node.attrs.height || 'auto',
          maxWidth: '100%',
          display: 'block',
        }}
      />
    </span>
  );
};


const ResizableImage = Image.extend({
  addAttributes() {
    const parent = this.parent?.() || {};
    return {
      ...parent,
      width: {
        default: null,
        parseHTML: element => element.style?.width || null,
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { style: `width:${attributes.width};` };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.style?.height || null,
        renderHTML: attributes => {
          if (!attributes.height) return {};
          const existing = attributes.width ? `width:${attributes.width}; ` : '';
          return { style: `${existing}height:${attributes.height};` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});


export default ResizableImage