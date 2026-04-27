/** Loosely typed Lexical tree from Payload (serialised editor state). */
export type LexicalNode = Record<string, unknown> & {
	type?: string;
	children?: LexicalNode[];
};

export type LexicalEditorState = {
	root: {
		children: LexicalNode[];
	};
};
