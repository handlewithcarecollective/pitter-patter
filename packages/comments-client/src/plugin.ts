import { PluginKey, Plugin, EditorState } from "prosemirror-state";
import { DecorationSet, Decoration, EditorView } from "prosemirror-view";
import { MarkType, type Node } from "prosemirror-model";
import { toggleMark } from "prosemirror-commands";

export interface CommentsState {
  newThreadVisible: boolean;
  activeThreadId: string | null;
}

export const commentsKey = new PluginKey<CommentsState>("@pitter-patter/presence-client/presence");

function threadRanges(commentMark: MarkType, doc: Node, threadId: string) {
  const mark = commentMark.create({ threadId });
  const ranges: { from: number; to: number }[] = [];

  doc.descendants((node, pos) => {
    if (mark.isInSet(node.marks)) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
    }
    return true;
  });

  return ranges;
}

export const commentPluginKey = new PluginKey<CommentsState>();

export function createCommentThreadMark(commentMarkType: MarkType, threadId: string) {
  return toggleMark(
    commentMarkType,
    { threadId },
    {
      enterInlineAtoms: true,
      includeWhitespace: true,
      removeWhenPresent: false,
    },
  );
}

export function removeCommentThreadMarks(commentMarkType: MarkType, threadId: string) {
  return function removeCommentThreadMarksCommand(
    state: EditorState,
    dispatch?: EditorView["dispatch"],
  ) {
    dispatch?.(
      state.tr.removeMark(0, state.doc.content.size, commentMarkType.create({ threadId })),
    );

    return true;
  };
}

export function comments({ commentMarkType }: { commentMarkType: MarkType }) {
  return new Plugin<CommentsState>({
    key: commentPluginKey,
    state: {
      init() {
        return {
          newThreadVisible: false,
          activeThreadId: null,
        };
      },
      apply(tr, value, _oldState, state) {
        const meta = tr.getMeta(commentPluginKey) as boolean | undefined;
        if (meta !== undefined) {
          return {
            ...value,
            newThreadVisible: meta,
          };
        }

        const comments =
          state.selection.$from
            .marksAcross(state.selection.$to)
            ?.filter((mark) => mark.type === state.schema.marks["comment"]) ?? [];

        const allRanges = comments.reduce<Record<string, { from: number; to: number }[]>>(
          (acc, comment) => ({
            ...acc,
            [comment.attrs["threadId"]]: threadRanges(
              commentMarkType,
              state.doc,
              comment.attrs["threadId"],
            ),
          }),
          {},
        );

        const selectedRanges = Object.fromEntries(
          Object.entries(allRanges).map(([threadId, ranges]) => [
            threadId,
            ranges.find(
              (range) => range.from <= state.selection.from && range.to >= state.selection.to,
            )!,
          ]),
        );

        const smallestRange =
          Object.entries(selectedRanges).length > 0
            ? Object.entries(selectedRanges).reduce((acc, entry) => {
                const accSize = acc[1].to - acc[1].from;
                const size = entry[1].to - entry[1].from;
                return size < accSize ? entry : acc;
              })
            : null;

        return {
          ...value,
          activeThreadId: smallestRange?.[0] ?? null,
        };
      },
    },
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];

        const { newThreadVisible, activeThreadId } = commentPluginKey.getState(state)!;

        if (newThreadVisible) {
          decorations.push(
            Decoration.inline(state.selection.from, state.selection.to, {
              "data-new-comment-thread": "",
            }),
          );
        }

        if (activeThreadId) {
          const comments =
            state.selection.$from
              .marksAcross(state.selection.$to)
              ?.filter((mark) => mark.type === state.schema.marks["comment"]) ?? [];

          const allRanges = comments.reduce<Record<string, { from: number; to: number }[]>>(
            (acc, comment) => ({
              ...acc,
              [comment.attrs["threadId"]]: threadRanges(
                commentMarkType,
                state.doc,
                comment.attrs["threadId"],
              ),
            }),
            {},
          );

          const ranges = allRanges[activeThreadId] ?? [];

          for (const range of ranges) {
            decorations.push(
              Decoration.inline(range.from, range.to, {
                "data-active-comment-thread": "",
              }),
            );
          }
        }

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

export function showNewThread(editorState: EditorState) {
  const pluginState = commentPluginKey.getState(editorState);
  return pluginState?.newThreadVisible ?? false;
}

export function getActiveThreadId(editorState: EditorState) {
  const pluginState = commentPluginKey.getState(editorState);
  return pluginState?.activeThreadId ?? null;
}
