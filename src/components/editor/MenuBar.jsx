import { useRef, useState } from "react";
import { Button, ButtonGroup, Offcanvas, Spinner } from "react-bootstrap";
import { FaBold, FaHeading, FaItalic, FaListOl, FaListUl, FaQuoteRight, FaRedo, FaUndo, FaImage } from "react-icons/fa";

const MenuBar = ({ editor, addImage, onImageUpload }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [showTools, setShowTools] = useState(false);
    // No-op: image controls are provided via drag handle in the node view

    if (!editor) {
        return null;
    }

    const handleImageClick = () => {
        if (onImageUpload) {
            fileInputRef.current?.click();
        } else {
            addImage();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            setUploading(true);
            try {
                const url = await onImageUpload(file);
                if (url) {
                    editor.chain().focus().setImage({ src: url, width: '50%' }).run();
                }
            } catch (error) {
                console.error("Image upload failed", error);
                alert("Image upload failed: " + error.message);
            } finally {
                setUploading(false);
            }
        }
        e.target.value = null;
    };

    const Controls = () => (
        <>
            <ButtonGroup size="sm" className="mb-2 me-2">
                <Button variant={editor.isActive('bold') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                    <FaBold />
                </Button>
                <Button variant={editor.isActive('italic') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                    <FaItalic />
                </Button>
            </ButtonGroup>
            <ButtonGroup size="sm" className="mb-2 me-2">
                <Button variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                    <FaHeading size={12} />2
                </Button>
                <Button variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                    <FaHeading size={10} />3
                </Button>
            </ButtonGroup>
            <ButtonGroup size="sm" className="mb-2 me-2">
                <Button variant={editor.isActive('bulletList') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
                    <FaListUl />
                </Button>
                <Button variant={editor.isActive('orderedList') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
                    <FaListOl />
                </Button>
            </ButtonGroup>
            <ButtonGroup size="sm" className="mb-2 me-2">
                <Button variant={editor.isActive('blockquote') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
                    <FaQuoteRight />
                </Button>
            </ButtonGroup>
            <Button variant="outline-secondary" size="sm" onClick={handleImageClick} title="Add Image" disabled={uploading} className="mb-2 me-2">
                {uploading ? <Spinner size="sm" animation="border" /> : <FaImage />}
            </Button>
            {/* Drag handle used for image resizing; no toolbar buttons */}
            <ButtonGroup size="sm" className="mb-2 ms-md-auto">
                <Button variant="light" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                    <FaUndo />
                </Button>
                <Button variant="light" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                    <FaRedo />
                </Button>
            </ButtonGroup>
        </>
    );

    return (
        <>
            <div className="editor-toolbar d-none d-md-flex border-bottom p-2 bg-light flex-wrap gap-2 sticky-top align-items-center">
                <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                <Controls />
            </div>
            <div className="editor-toolbar d-flex d-md-none border-bottom p-2 bg-light sticky-top align-items-center gap-2">
                <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                <ButtonGroup size="sm">
                    <Button variant={editor.isActive('bold') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                        <FaBold />
                    </Button>
                    <Button variant={editor.isActive('italic') ? 'secondary' : 'outline-secondary'} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                        <FaItalic />
                    </Button>
                </ButtonGroup>
                <div className="ms-auto">
                    <Button size="sm" variant="outline-secondary" onClick={() => setShowTools(true)}>Tools</Button>
                </div>
            </div>
            <Offcanvas show={showTools} onHide={() => setShowTools(false)} placement="bottom" style={{ zIndex: 2001 }}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Editor Tools</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Controls />
                    <div className="d-grid mt-2">
                        <Button variant="primary" onClick={() => setShowTools(false)}>Done</Button>
                    </div>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    );
};



export default MenuBar