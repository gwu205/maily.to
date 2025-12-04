import { z } from 'zod';
import { serializeZodError } from '~/lib/errors';
import { json } from '~/lib/response';
import { createSupabaseServerClient } from '~/lib/supabase/server';
import type { Route } from './+types/api.v1.templates.$templateId';

export async function action(args: Route.ActionArgs) {
  const { request, params } = args;
  if (!['POST', 'DELETE'].includes(request.method)) {
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
      {
        status: 401,
      }
    );
  }

  const paramsSchema = z.object({
    templateId: z.string(),
  });
  const { data: paramsData, error: paramsError } =
    paramsSchema.safeParse(params);
  if (paramsError) {
    return serializeZodError(paramsError);
  }

  const { templateId } = paramsData;

  if (request.method === 'POST') {
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

    const { data: template } = await supabase
      .from('mails')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (!template) {
      return json(
        { errors: [], message: 'Template not found', status: 404 },
        { status: 404 }
      );
    }

    const { title, previewText, content } = data;
    const { error: updateError } = await supabase
      .from('mails')
      .update({
        ...(title && { title }),
        ...(data.titleEn !== undefined && { title_en: data.titleEn }),
        ...(data.titleJa !== undefined && { title_ja: data.titleJa }),
        ...(previewText !== undefined && { preview_text: previewText }),
        ...(data.previewTextEn !== undefined && {
          preview_text_en: data.previewTextEn,
        }),
        ...(data.previewTextJa !== undefined && {
          preview_text_ja: data.previewTextJa,
        }),
        ...(content && { content }),
        ...(data.contentEn !== undefined && { content_en: data.contentEn }),
        ...(data.contentJa !== undefined && { content_ja: data.contentJa }),
      })
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (updateError) {
      return json(
        { errors: [], message: 'Failed to update template', status: 500 },
        { status: 500 }
      );
    }

    return { status: 'ok' };
  } else if (request.method === 'DELETE') {
    const { error } = await supabase
      .from('mails')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) {
      return json(
        { errors: [], message: 'Failed to delete template', status: 500 },
        { status: 500 }
      );
    }

    return { status: 'ok' };
  }
}
