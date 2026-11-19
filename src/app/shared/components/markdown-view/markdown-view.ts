import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MdBlock } from '../../../core/models/markdown.model';
import { parseMarkdown } from '../../../core/utils/markdown';

// Muestra texto con formato Markdown (respuestas de la IA). Solo plantillas de Angular: sin innerHTML.
@Component({
  selector: 'app-markdown-view',
  imports: [NgTemplateOutlet],
  templateUrl: './markdown-view.html',
  styleUrl: './markdown-view.css'
})
export class MarkdownView {

  readonly text = input('');

  readonly blocks = computed<MdBlock[]>(() => parseMarkdown(this.text()));
}
