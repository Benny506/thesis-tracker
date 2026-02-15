import { supabase } from "../../../lib/supabase";

export async function createComment({
    chapterId,
    userId,
    selection,
    editor,
    body,
}) {
    const { from, to } = selection;

    const doc = editor.state.doc;
    const fullText = doc.textBetween(1, doc.content.size, '\n');
    const selectedText = doc.textBetween(from, to, '\n');

    const prefix = fullText.slice(Math.max(0, from - 100), from);
    const suffix = fullText.slice(to, to + 100);

    const { data, error } = await supabase
        .from('chapter_comments_context')
        .insert({
            chapter_id: chapterId,
            author_id: userId,
            body,
            exact_match: selectedText,
            prefix,
            suffix,
            pos_start: from,
            pos_end: to,
        })
        .select('*')
        .single();

    if (error) {
        console.log('[commentContext] createComment error', error);
        return null
    };

    return data;
}
