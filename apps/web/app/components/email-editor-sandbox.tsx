import { useMutation, useQuery } from '@tanstack/react-query';
import type { Editor, FocusPosition } from '@tiptap/core';
import {
  AsteriskIcon,
  FileCogIcon,
  Loader2Icon,
  SaveIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router';
import { toast } from 'sonner';
import { cn } from '~/lib/classname';
import defaultEmailJSON from '~/lib/default-editor-json.json';
import { FetchError, httpPost } from '~/lib/http';
import type { Database } from '~/types/database';
import {
  ApiKeyConfigDialog,
  apiKeyQueryOptions,
} from './api-key-config-dialog';
import { CopyEmailHtml } from './copy-email-html';
import { DeleteEmailDialog } from './delete-email-dialog';
import { EmailEditor } from './email-editor';
import { EmailHtmlPreview } from './email-html-preview';
import { LanguageSwitcher, type Language } from './language-switcher';
import { PreviewEmailDialog } from './preview-email-dialog';
import { PreviewTextInfo } from './preview-text-info';
import { Input } from './ui/input';
import { Label } from './ui/label';

type UpdateTemplateData = {
  title: string;
  previewText: string;
  content: string;
  titleEn?: string;
  titleJa?: string;
  previewTextEn?: string;
  previewTextJa?: string;
  contentEn?: string;
  contentJa?: string;
};

type SaveTemplateResponse = {
  template: Database['public']['Tables']['mails']['Row'];
};

type EmailEditorSandboxProps = {
  template?: Database['public']['Tables']['mails']['Row'];
  showSaveButton?: boolean;
  autofocus?: FocusPosition;
};

export function EmailEditorSandbox(props: EmailEditorSandboxProps) {
  const { template, showSaveButton = true, autofocus } = props;

  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { data: apiKeyConfig } = useQuery(apiKeyQueryOptions());
  const [generatedHtml, setGeneratedHtml] = useState('');

  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  // English content
  const [subjectEn, setSubjectEn] = useState(
    template?.title_en || template?.title || ''
  );
  const [previewTextEn, setPreviewTextEn] = useState(
    template?.preview_text_en || template?.preview_text || ''
  );
  // Initialize content states
  const [contentEn, setContentEn] = useState(
    template?.content_en ||
      template?.content ||
      JSON.stringify(defaultEmailJSON)
  );
  const [contentJa, setContentJa] = useState(
    template?.content_ja || JSON.stringify(defaultEmailJSON)
  );

  // Japanese content
  const [subjectJa, setSubjectJa] = useState(template?.title_ja || '');
  const [previewTextJa, setPreviewTextJa] = useState(
    template?.preview_text_ja || ''
  );

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [showReplyTo, setShowReplyTo] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Current displayed values based on language
  const subject = currentLanguage === 'en' ? subjectEn : subjectJa;
  const setSubject = currentLanguage === 'en' ? setSubjectEn : setSubjectJa;
  const previewText = currentLanguage === 'en' ? previewTextEn : previewTextJa;
  const setPreviewText =
    currentLanguage === 'en' ? setPreviewTextEn : setPreviewTextJa;
  const currentContent = currentLanguage === 'en' ? contentEn : contentJa;

  // Save editor content before switching languages
  const handleLanguageChange = (newLanguage: Language) => {
    // Save current editor content before switching
    if (editor) {
      const json = JSON.stringify(editor.getJSON());
      if (currentLanguage === 'en') {
        setContentEn(json);
      } else {
        setContentJa(json);
      }
    }

    // Switch to the new language
    setCurrentLanguage(newLanguage);

    // Force remount with new content
    setEditorKey((prev) => prev + 1);
  };

  // Update content state when editor changes
  // Update the content setting logic in the useEffect
  useEffect(() => {
    if (!editor) return;

    const setEditorContent = () => {
      try {
        const content = currentLanguage === 'en' ? contentEn : contentJa;

        // Ensure content is a string before parsing
        if (typeof content !== 'string') {
          console.error('Content is not a string:', content);
          return;
        }

        // Skip if content is empty
        if (!content.trim()) {
          console.log('Empty content, skipping update');
          return;
        }

        const parsedContent = JSON.parse(content);

        // Only set content if it's different to prevent unnecessary updates
        const currentContent = editor.getJSON();
        if (JSON.stringify(currentContent) !== JSON.stringify(parsedContent)) {
          editor.commands.setContent(parsedContent);
        }
      } catch (error) {
        console.error('Error setting editor content:', error);
        // Fallback to default content if parsing fails
        if (error instanceof SyntaxError) {
          console.log('Falling back to default content');
          editor.commands.setContent(defaultEmailJSON);
        }
      }
    };

    // Set initial content
    setEditorContent();

    const handleUpdate = () => {
      const json = editor.getJSON();
      if (currentLanguage === 'en') {
        setContentEn(JSON.stringify(json));
      } else {
        setContentJa(JSON.stringify(json));
      }
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, currentLanguage, contentEn, contentJa]);

  useEffect(() => {
    if (!editor) return;

    const generateHtml = () => {
      try {
        const html = editor.getHTML();
        setGeneratedHtml(html);
      } catch (error) {
        console.error('Error generating HTML:', error);
      }
    };

    // Generate initial HTML
    generateHtml();

    // Update HTML on content changes
    editor.on('update', generateHtml);
    return () => {
      editor.off('update', generateHtml);
    };
  }, [editor]);

  const { mutateAsync: updateTemplate, isPending: isUpdateTemplatePending } =
    useMutation({
      mutationFn: async (data: UpdateTemplateData) => {
        // Get current editor content
        const currentJson = editor
          ? JSON.stringify(editor.getJSON())
          : currentContent;

        // Prepare the update data
        const updateData: any = {
          ...data,
          title: subject,
          titleEn: subjectEn,
          titleJa: subjectJa,
          previewTextEn,
          previewTextJa,
        };

        // Only update the content for the current language
        if (currentLanguage === 'en') {
          updateData.content = currentJson;
          updateData.contentEn = currentJson;
        } else {
          updateData.contentJa = currentJson;
          // Keep the default content as English
          updateData.content = contentEn || currentJson;
        }

        return httpPost(`/api/v1/templates/${template?.id}`, updateData);
      },
      onSettled: () => {
        revalidator.revalidate();
      },
    });

  const { mutateAsync: saveTemplate, isPending: isSaveTemplatePending } =
    useMutation({
      mutationFn: async (data: UpdateTemplateData) => {
        // Get current editor content
        const currentJson = editor
          ? JSON.stringify(editor.getJSON())
          : currentContent;

        // Prepare the save data
        const saveData: any = {
          ...data,
          title: subject,
          titleEn: subjectEn,
          titleJa: subjectJa,
          previewTextEn,
          previewTextJa,
        };

        // Set content based on current language
        if (currentLanguage === 'en') {
          saveData.content = currentJson;
          saveData.contentEn = currentJson;
          saveData.contentJa = contentJa || JSON.stringify(defaultEmailJSON);
        } else {
          saveData.content = contentEn || JSON.stringify(defaultEmailJSON);
          saveData.contentEn = contentEn || JSON.stringify(defaultEmailJSON);
          saveData.contentJa = currentJson;
        }

        return httpPost<SaveTemplateResponse>(`/api/v1/templates`, saveData);
      },
      onSuccess: (data) => {
        navigate(`/templates/${data.template.id}`);
      },
    });

  const { mutateAsync: sendTestEmail, isPending: isSendTestEmailPending } =
    useMutation({
      mutationFn: async () => {
        const json = editor?.getJSON();
        if (!json) {
          throw new FetchError(400, 'Editor content is empty');
        }

        return httpPost(`/api/v1/emails/send`, {
          subject,
          previewText,
          from,
          to,
          replyTo,
          content: JSON.stringify(json),
        });
      },
    });

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-1/2 overflow-y-auto p-4">
        <div className="max-w-[calc(600px+80px)]! mx-auto mb-8 flex items-center justify-between gap-1.5 px-10 pt-5">
          <LanguageSwitcher
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
          <div className="flex items-center gap-1.5">
            <ApiKeyConfigDialog
              apiKey={apiKeyConfig?.apiKey}
              provider={apiKeyConfig?.provider}
            />
            <PreviewEmailDialog
              subject={subject}
              previewText={previewText}
              editor={editor}
            />
            <CopyEmailHtml previewText={previewText} editor={editor} />
            <button
              className="flex items-center rounded-md bg-white px-2 py-1 text-sm text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={isSendTestEmailPending}
              onClick={() => {
                toast.promise(sendTestEmail(), {
                  loading: 'Sending Test Email...',
                  success: 'Test Email has been sent',
                  error: (err) => err?.message || 'Failed to send test email',
                });
              }}
            >
              {isSendTestEmailPending ? (
                <Loader2Icon className="mr-1 inline-block size-4 animate-spin" />
              ) : (
                <AsteriskIcon className="mr-1 inline-block size-4" />
              )}
              Send Email
            </button>
          </div>

          {!template?.id && showSaveButton && (
            <button
              className={cn(
                'flex min-h-[28px] cursor-pointer items-center justify-center rounded-md bg-black px-2 py-1 text-sm text-white disabled:cursor-not-allowed max-lg:w-7'
              )}
              disabled={isSaveTemplatePending}
              onClick={() => {
                const json = editor?.getJSON();

                const trimmedSubject = subject.trim();
                const trimmedPreviewText = previewText.trim();
                if (!trimmedSubject || !json) {
                  toast.error('Subject, Preview Text and Content are required');
                  return;
                }

                if (trimmedSubject.length < 3) {
                  toast.error('Subject must be at least 3 characters');
                  return;
                }

                toast.promise(
                  saveTemplate({
                    title: trimmedSubject,
                    previewText: trimmedPreviewText,
                    content: JSON.stringify(json),
                  }),
                  {
                    loading: 'Saving Template...',
                    success: 'Template has been saved',
                    error: (err) => err?.message || 'Failed to save email',
                  }
                );
              }}
            >
              {isSaveTemplatePending ? (
                <Loader2Icon className="inline-block size-4 shrink-0 animate-spin lg:mr-1" />
              ) : (
                <SaveIcon className="inline-block size-4 shrink-0 lg:mr-1" />
              )}
              <span className="hidden lg:inline-block">Save</span>
            </button>
          )}

          {template?.id && (
            <div className="flex items-center gap-1.5">
              <DeleteEmailDialog templateId={template.id} />
              <button
                className={cn(
                  'flex min-h-[28px] cursor-pointer items-center justify-center rounded-md bg-black px-2 py-1 text-sm text-white disabled:cursor-not-allowed max-lg:w-7'
                )}
                disabled={isUpdateTemplatePending}
                onClick={() => {
                  const json = editor?.getJSON();

                  const trimmedSubject = subject.trim();
                  const trimmedPreviewText = previewText.trim();
                  if (!trimmedSubject || !json) {
                    toast.error(
                      'Subject, Preview Text and Content are required'
                    );
                    return;
                  }

                  if (trimmedSubject.length < 3) {
                    toast.error('Subject must be at least 3 characters');
                    return;
                  }

                  toast.promise(
                    updateTemplate({
                      title: trimmedSubject,
                      previewText: trimmedPreviewText,
                      content: JSON.stringify(json),
                    }),
                    {
                      loading: 'Updating Template...',
                      success: 'Template has been updated',
                      error: (err) => err?.message || 'Failed to update email',
                    }
                  );
                }}
              >
                {isUpdateTemplatePending ? (
                  <Loader2Icon className="inline-block size-4 shrink-0 animate-spin lg:mr-1" />
                ) : (
                  <FileCogIcon className="inline-block size-4 shrink-0 lg:mr-1" />
                )}
                <span className="hidden lg:inline-block">Update</span>
              </button>
            </div>
          )}
        </div>

        <div className="max-w-[calc(600px+80px)]! mx-auto px-10">
          <Label className="flex items-center font-normal">
            <span className="w-20 shrink-0 font-normal text-gray-600 after:ml-0.5 after:text-red-400 after:content-['*']">
              Subject
            </span>
            <Input
              className="h-auto rounded-none border-none py-2.5 font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Email Subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Label>
          <div className="flex items-center gap-1.5">
            <Label className="flex grow items-center font-normal">
              <span className="w-20 shrink-0 font-normal text-gray-600">
                From
              </span>
              <Input
                className="h-auto rounded-none border-none py-2.5 font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Arik Chakma <hello@maily.to>"
                type="text"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </Label>

            {!showReplyTo && (
              <button
                className="inline-block h-full shrink-0 bg-transparent px-1 text-sm text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                type="button"
                onClick={() => {
                  setShowReplyTo(true);
                }}
              >
                Reply-To
              </button>
            )}
          </div>

          {showReplyTo && (
            <Label className="flex items-center font-normal">
              <span className="w-20 shrink-0 font-normal text-gray-600">
                Reply-To
              </span>
              <div className="align-content-stretch flex grow items-center">
                <Input
                  className="h-auto rounded-none border-none py-2.5 font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="noreply@maily.to"
                  type="text"
                  value={replyTo}
                  onChange={(event) => setReplyTo(event.target.value)}
                />
                <button
                  className="flex h-10 shrink-0 items-center bg-transparent px-1 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => {
                    setReplyTo('');
                    setShowReplyTo(false);
                  }}
                >
                  <XIcon className="inline-block size-4" />
                </button>
              </div>
            </Label>
          )}

          <Label className="flex items-center font-normal">
            <span className="w-20 shrink-0 font-normal text-gray-600">To</span>
            <Input
              className="h-auto rounded-none border-none py-2.5 font-normal focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Email Recipient(s)"
              type="text"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Label>

          <div className="relative my-6">
            <Input
              className="h-auto rounded-none border-x-0 border-gray-300 px-0 py-2.5 pr-5 text-base focus-visible:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Preview Text"
              type="text"
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
            />
            <span className="absolute right-0 top-0 flex h-full items-center">
              <PreviewTextInfo />
            </span>
          </div>
        </div>

        <div className="max-w-[calc(600px+80px)]! mx-auto px-10"></div>
        <EmailEditor
          key={editorKey}
          defaultContent={template?.content || JSON.stringify(defaultEmailJSON)}
          setEditor={setEditor}
          autofocus={autofocus}
        />
      </div>
      <div className="w-1/2 border-l border-gray-200 p-4">
        <EmailHtmlPreview
          editor={editor}
          previewText={previewText}
          className="h-full"
        />
      </div>
    </div>
  );
}
