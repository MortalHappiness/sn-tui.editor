import React from 'react';
import clsx from 'clsx';
import EditorKit, { EditorKitDelegate } from '@standardnotes/editor-kit';
import { AppDataField } from '@standardnotes/models';
import '@toast-ui/editor/dist/toastui-editor.css';
import TuiEditor, { Viewer as TuiViewer } from '@toast-ui/editor';

// Color Syntax plugin
import 'tui-color-picker/dist/tui-color-picker.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';

// Table Merge Cell plugin
import '@toast-ui/editor-plugin-table-merged-cell/dist/toastui-editor-plugin-table-merged-cell.css';
import tableMergedCell from '@toast-ui/editor-plugin-table-merged-cell';

// Code Syntax Highlight plugin
import 'prismjs/themes/prism.css';
import '@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css';
const codeSyntaxHighlight = require('@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js');

export interface EditorInterface {
  isLocked: boolean;
}

const initialState = {
  isLocked: false,
};

let keyMap = new Map();

const commonOptions = {
  usageStatistics: false,
  height: '100%',
  plugins: [colorSyntax, codeSyntaxHighlight, tableMergedCell],
};

export default class Editor extends React.Component<{}, EditorInterface> {
  private editorKit?: EditorKit;
  private editorEl = React.createRef<HTMLDivElement>();
  private viewerEl = React.createRef<HTMLDivElement>();
  private tuiEditor?: TuiEditor;
  private tuiViewer?: TuiViewer;
  private origEditorRawText = '';

  constructor(props: EditorInterface) {
    super(props);
    this.state = initialState;
  }

  componentDidMount() {
    this.configureEditorKit();
  }

  configureEditorKit = () => {
    const delegate: EditorKitDelegate = {
      /** This loads every time a different note is loaded */
      setEditorRawText: (text: string) => {
        this.origEditorRawText = text;
        const isLocked = this.editorKit?.getItemAppDataValue(
          AppDataField.Locked
        );
        this.setState({ isLocked });
        this.setUpTuiEditor(text);
      },
      clearUndoHistory: () => {},
      handleRequestForContentHeight: () => undefined,
      onNoteLockToggle: (isLocked) => {
        const text = isLocked
          ? this.tuiEditor!.getMarkdown()
          : this.origEditorRawText;
        this.setUpTuiEditor(text);
        this.setState({ isLocked });
      },
    };

    this.editorKit = new EditorKit(delegate, {
      mode: 'markdown',
    });
  };

  setUpTuiEditor = (text: string) => {
    if (this.state.isLocked) {
      this.initTuiViewer(text);
    } else {
      this.initTuiEditor(text);
    }
  };

  initTuiEditor = (text: string) => {
    if (!this.tuiEditor) {
      const isMobile = window.matchMedia('(max-width: 650px)').matches;
      this.tuiEditor = new TuiEditor({
        el: this.editorEl.current!,
        initialEditType: isMobile ? 'wysiwyg' : 'markdown',
        previewStyle: isMobile ? 'tab' : 'vertical',
        initialValue: text,
        ...commonOptions,
      });
      this.tuiEditor.on('change', () => {
        const text = this.tuiEditor?.getMarkdown() || '';
        this.tuiViewer?.setMarkdown(text);
        this.saveNote(text);
      });
    }
  };

  initTuiViewer = (text: string) => {
    if (!this.tuiViewer) {
      this.tuiViewer = TuiEditor.factory({
        el: this.viewerEl.current!,
        viewer: true,
        initialValue: text,
        ...commonOptions,
      });
    }
  };

  saveNote = (text: string) => {
    /**
     * This will work in an SN context, but breaks the standalone editor,
     * so we need to catch the error
     */
    try {
      this.editorKit?.onEditorValueChanged(text);
    } catch (error) {
      console.log('Error saving note:', error);
    }
  };

  onBlur = (e: React.FocusEvent) => {};

  onFocus = (e: React.FocusEvent) => {};

  onKeyDown = (e: React.KeyboardEvent | KeyboardEvent) => {
    keyMap.set(e.key, true);
    // Do nothing if 'Control' and 's' are pressed
    if (keyMap.get('Control') && keyMap.get('s')) {
      e.preventDefault();
    }
  };

  onKeyUp = (e: React.KeyboardEvent | KeyboardEvent) => {
    keyMap.delete(e.key);
  };

  render() {
    const { isLocked } = this.state;
    return (
      <div className="container">
        <div ref={this.editorEl} className={clsx(isLocked && 'hidden')} />
        <div className={clsx('viewer', !isLocked && 'hidden')}>
          <div ref={this.viewerEl} />
        </div>
      </div>
    );
  }
}
