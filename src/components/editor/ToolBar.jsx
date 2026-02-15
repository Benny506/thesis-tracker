export default function Toolbar({ editor, onImageUpload }) {
    if (!editor) return null

    return (
        <div className="editor-toolbar">
            <button onClick={() => editor.chain().focus().toggleBold().run()}>
                Bold
            </button>

            <button onClick={() => editor.chain().focus().toggleItalic().run()}>
                Italic
            </button>

            <button onClick={() => editor.chain().focus().toggleBulletList().run()}>
                Bullet
            </button>
        </div>
    )
}
