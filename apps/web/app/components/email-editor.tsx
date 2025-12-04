'use client'; // If using Next.js, otherwise remove this line

import type { FocusPosition, Editor as TiptapEditor } from '@tiptap/core';
import { Loader2Icon } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { cn } from '~/lib/classname';
import type { Database } from '~/types/database';

const Editor = lazy(() =>
  import('@maily-to/core').then((module) => ({
    default: module.Editor,
  }))
);

type EmailEditorProps = {
  defaultContent: Database['public']['Tables']['mails']['Row']['content'];
  setEditor: (editor: TiptapEditor | null) => void;
  autofocus?: FocusPosition;
};

export function EmailEditor({
  defaultContent,
  setEditor,
  autofocus,
}: EmailEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true on component mount
  useEffect(() => {
    setIsMounted(true);
    return () => {
      // Cleanup editor reference on unmount
      setEditor(null);
      setIsMounted(false);
    };
  }, [setEditor]);

  // Don't render anything on the server
  if (!isMounted) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <Loader2Icon className="h-8 w-8 animate-spin stroke-[2.5] text-gray-500" />
      </div>
    );
  }

  const handleEditorCreate = (editor: TiptapEditor) => {
    setIsLoading(false);
    setEditor(editor);
  };

  const handleEditorUpdate = (editor: TiptapEditor) => {
    setEditor(editor);
  };

  return (
    <>
      {isLoading && (
        <div className="flex w-full items-center justify-center py-10">
          <Loader2Icon className="h-8 w-8 animate-spin stroke-[2.5] text-gray-500" />
        </div>
      )}

      <div className={cn('w-full', isLoading && 'hidden')}>
        <Suspense fallback={<div>Loading editor...</div>}>
          <Editor
            config={{
              hasMenuBar: false,
              wrapClassName: 'editor-wrap',
              bodyClassName: '!mt-0 !border-0 !p-0',
              contentClassName:
                'editor-content mx-auto max-w-[calc(600px+80px)]! px-10! pb-10!',
              toolbarClassName: 'flex-wrap !items-start',
              spellCheck: false,
              autofocus,
              immediatelyRender: false,
            }}
            contentJson={
              defaultContent ? JSON.parse(defaultContent as string) : null
            }
            onCreate={handleEditorCreate}
            onUpdate={handleEditorUpdate}
          />
        </Suspense>
      </div>
    </>
  );
}
