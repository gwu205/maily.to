import { z } from 'zod';
import { serializeZodError } from '~/lib/errors';
import { json } from '~/lib/response';
import { createSupabaseServerClient } from '~/lib/supabase/server';
import type { Route } from './+types/api.v1.templates._index';

export async function action(args: Route.ActionArgs) {
  const { request } = args;
  if (!['POST'].includes(request.method)) {
    return { status: 405, message: 'Method Not Allowed', errors: [] };
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(
      {
        status: 401,
        message: 'Unauthorized',
        errors: ['Unauthorized'],
      },
      { status: 401 }
    );
  }

  const body = await request.json();
  const schema = z.object({
    title: z.string().trim().min(3),
    previewText: z.string().trim().optional(),
    content: z.string(),
    titleEn: z.string().trim().optional(),
    titleJa: z.string().trim().optional(),
    previewTextEn: z.string().trim().optional(),
    previewTextJa: z.string().trim().optional(),
    contentEn: z.string().optional(),
    contentJa: z.string().optional(),
  });

  const { data, error } = schema.safeParse(body);
  if (error) {
    return serializeZodError(error);
  }

  const { title, previewText, content } = data;
  const { error: insertError, data: insertData } = await supabase
    .from('mails')
    .insert({
      title,
      title_en: data.titleEn || title,
      title_ja: data.titleJa || title,
      preview_text: data.previewText,
      preview_text_en: data.previewTextEn || data.previewText,
      preview_text_ja: data.previewTextJa || data.previewText,
      content,
      content_en: data.contentEn || content,
      content_ja: data.contentJa || content,
    })
    .select()
    .single();
  if (insertError) {
    return json(
      { errors: [], message: 'Failed to insert template', status: 500 },
      { status: 500 }
    );
  }

  return { template: insertData };
}
