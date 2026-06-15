import React from 'react';
import type { Block } from '../../types';
import { TextBlock } from './blocks/TextBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { BulletBlock } from './blocks/BulletBlock';
import { NumberedBlock } from './blocks/NumberedBlock';
import { TodoBlock } from './blocks/TodoBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { PageBlock } from './blocks/PageBlock';
import { TableBlock } from './blocks/TableBlock';
import { ColumnsBlock } from './blocks/ColumnsBlock';
import { useEditorStore } from '../../store/editorStore';

interface Props {
  block: Block;
  numberedIndex?: number;
}

export function BlockRenderer({ block, numberedIndex = 1 }: Props) {
  switch (block.type) {
    case 'text':     return <TextBlock block={block} />;
    case 'h1':
    case 'h2':
    case 'h3':       return <HeadingBlock block={block} />;
    case 'bullet':   return <BulletBlock block={block} />;
    case 'numbered': return <NumberedBlock block={block} index={numberedIndex} />;
    case 'todo':     return <TodoBlock block={block} />;
    case 'code':     return <CodeBlock block={block} />;
    case 'quote':    return <QuoteBlock block={block} />;
    case 'divider':  return <DividerBlock block={block} />;
    case 'callout':  return <CalloutBlock block={block} />;
    case 'image':    return <ImageBlock block={block} />;
    case 'page':     return <PageBlock block={block} />;
    case 'table':    return <TableBlock block={block} />;
    case 'columns2': return <ColumnsBlock block={block} count={2} />;
    case 'columns3': return <ColumnsBlock block={block} count={3} />;
    default:         return <TextBlock block={block} />;
  }
}
