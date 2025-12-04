// apps/web/app/components/email-html-preview.tsx
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { httpPost } from '~/lib/http';

interface EmailHtmlPreviewProps {
  editor: any; // TipTap editor instance
  previewText?: string;
  className?: string;
}

interface PreviewEmailResponse {
  html: string;
}

export function EmailHtmlPreview({
  editor,
  previewText = '',
  className = '',
}: EmailHtmlPreviewProps) {
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mutation to generate HTML preview
  const { mutateAsync: generateHtml } = useMutation({
    mutationFn: async () => {
      if (!editor) {
        throw new Error('No editor instance');
      }

      const json = editor.getJSON();
      const response = await httpPost<PreviewEmailResponse>(
        '/api/v1/emails/preview',
        {
          content: JSON.stringify(json),
          previewText,
        }
      );

      return response.html;
    },
    onSuccess: (html) => {
      setHtmlContent(html);
    },
    onError: (error) => {
      console.error('Error generating HTML preview:', error);
      toast.error('Failed to generate HTML preview');
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Update the useEffect cleanup in email-html-preview.tsx
  useEffect(() => {
    if (!editor) return;

    const updatePreview = async () => {
      setIsLoading(true);
      try {
        await generateHtml();
      } catch (error) {
        console.error('Error updating preview:', error);
      }
    };

    // Initial update
    updatePreview();

    // Set up the update listener
    editor.on('update', updatePreview);

    // Cleanup function - just call the returned function directly
    return () => {
      editor.off('update', updatePreview);
    };
  }, [editor, previewText, generateHtml]);

  if (isLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${className}`}>
        <div className="text-gray-500">Generating preview...</div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-auto ${className}`}>
      <h3 className="mb-2 text-lg font-medium">HTML Output</h3>
      <div className="relative h-[calc(100%-2rem)]">
        <pre className="h-full overflow-auto rounded bg-gray-50 p-4 text-sm">
          <code className="whitespace-pre-wrap break-words">{htmlContent}</code>
        </pre>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(htmlContent);
              toast.success('HTML copied to clipboard!');
            } catch (error) {
              console.error('Failed to copy HTML:', error);
              toast.error('Failed to copy HTML');
            }
          }}
          className="absolute right-2 top-2 rounded bg-white/80 px-2 py-1 text-xs text-gray-600 hover:bg-white"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
