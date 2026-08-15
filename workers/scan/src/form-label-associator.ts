import { ExtractedJsxElement, ExtractedLocatorElement } from '@qa-automater/types';
import { LocatorExtractor } from './locator-extractor';

export class FormLabelAssociator {
  private locatorExtractor: LocatorExtractor;

  constructor() {
    this.locatorExtractor = new LocatorExtractor();
  }

  /**
   * Associates <label htmlFor="id"> elements with target input/select/textarea elements
   * and computes scored locator candidates including getByLabel.
   */
  public pairLabelsWithInputs(
    elements: ExtractedJsxElement[],
  ): Array<ExtractedJsxElement & { locators: ExtractedLocatorElement }> {
    const idToLabelMap = new Map<string, string>();

    // Step 1: Discover all <label htmlFor="targetId"> text contents
    elements.forEach((elem) => {
      if (elem.tag_name.toLowerCase() === 'label' && elem.html_for && elem.text_content) {
        idToLabelMap.set(elem.html_for, elem.text_content);
      }
    });

    // Step 2: Associate matched labels with inputs/textareas/selects and generate locator candidates
    return elements.map((elem) => {
      const isFormControl = ['input', 'textarea', 'select'].includes(elem.tag_name.toLowerCase());

      let pairedLabelText = elem.label_text;
      if (isFormControl && elem.id && idToLabelMap.has(elem.id)) {
        pairedLabelText = idToLabelMap.get(elem.id);
      }

      const updatedElement: ExtractedJsxElement = {
        ...elem,
        label_text: pairedLabelText,
      };

      const locators = this.locatorExtractor.extractCandidates(updatedElement);

      return {
        ...updatedElement,
        locators,
      };
    });
  }
}
